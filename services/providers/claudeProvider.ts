import { AIProviderInterface, AIProviderError, AIErrorCode, USER_ERROR_MESSAGES, GenerationInput, GenerationMode, GameQuestionRequest, BLOOM_DIFFICULTY_MAP, shuffleQuestionOptions, VerbosityLevel, ChatContext, CondensationResult, GapAnalysisResult, IdentifiedGap, ColleagueTransformationResult } from '../aiProvider';
import { Slide, LessonResource, PosterLayout, DocumentAnalysis, EnhancementResult, EnhancementOptions } from '../../types';
import { QuizQuestion, QuestionWithAnswer } from '../geminiService';
import { getStudentFriendlyRules } from '../prompts/studentFriendlyRules';
import { DOCUMENT_ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '../documentAnalysis/analysisPrompts';
import { ENHANCEMENT_SYSTEM_PROMPT, buildEnhancementUserPrompt } from '../documentEnhancement/enhancementPrompts';
import { SLIDE_ANALYSIS_SYSTEM_PROMPT, buildSlideAnalysisPrompt, SLIDE_CREATION_TOOL, IMAGE_CAPTION_PROMPT, IMAGE_CAPTION_TOOL, ImageCaptionResult } from '../slideAnalysis/slideAnalysisPrompts';
import { detectPreservableContent, detectTeachableMoments } from '../contentPreservation/detector';
import { PreservableContent, ConfidenceLevel, TeachableMoment } from '../contentPreservation/types';
import { getPreservationRules, getTeleprompterPreservationRules } from '../prompts/contentPreservationRules';
import { getTeachableMomentRules, getVisualScaffoldingRules } from '../prompts/teachableMomentRules';
import { buildDeckContextForCohesion } from '../prompts/cohesionPrompts';
import { CONDENSATION_SYSTEM_PROMPT, buildCondensationUserPrompt, buildCondensationContext, CONDENSATION_TOOL } from '../prompts/condensationPrompts';
import { GAP_ANALYSIS_SYSTEM_PROMPT, buildGapAnalysisUserPrompt, buildGapAnalysisContext, GAP_ANALYSIS_TOOL, buildGapSlideGenerationPrompt, GAP_SLIDE_TOOL } from '../prompts/gapAnalysisPrompts';

// Shared teleprompter rules used across all generation modes
const TELEPROMPTER_RULES = `
STRICT SPEAKER NOTE RULES (TELEPROMPTER LOGIC):
The app uses a "Progressive Disclosure" system.
1. The visual bullet point appears on screen.
2. The Student reads that bullet aloud.
3. The Teacher (Teleprompter) explains THAT SAME bullet - why it matters, an example, or deeper context.

CRITICAL TIMING:
- Each segment explains the bullet that was JUST revealed (past tense).
- Do NOT preview or introduce the NEXT bullet. Only discuss what the student just read.
- Segment 1 explains Bullet 1 AFTER it appears. Segment 2 explains Bullet 2 AFTER it appears. And so on.

Therefore:
- **NEVER** repeat the text that is on the slide in the speaker notes.
- **NEVER** mention content from upcoming bullets - only discuss the current bullet.
- Each note must **ADD VALUE**: provide a concrete example, an analogy, or a "Why this matters" explanation for what was just shown.
- Ensure a continuous narrative flow. Note 2 must naturally follow Note 1.

FORMATTING:
The speaker notes must use "pointing_right" as a delimiter.
- Segment 0 (Intro): Set the scene before any bullets appear.
- Segment 1: Student just read Bullet 1. Explain Bullet 1's significance. Do NOT mention Bullet 2.
- Segment 2: Student just read Bullet 2. Explain Bullet 2's significance. Do NOT mention Bullet 3.
- The number of "pointing_right" segments MUST be exactly (Number of Bullets + 1).
`.replace(/pointing_right/g, '\u{1F449}');

const TELEPROMPTER_RULES_CONCISE = `
CONCISE SPEAKER NOTES (BULLET-POINT STYLE):
The teacher wants MINIMAL guidance - just key prompts to jog memory.

CRITICAL TIMING:
- Each segment explains the bullet that was JUST revealed (past tense).
- Do NOT preview upcoming bullets. Only discuss what the student just read.

RULES:
- Output 2-3 short phrases per segment (not full sentences)
- Use comma-separated points, not prose
- Focus on: key term, quick example, one action for the CURRENT bullet only
- NO transitions, NO elaborate explanations, NO previews of next bullet

FORMATTING:
Use "pointing_right" as delimiter. Segments = Bullets + 1.
- Segment 0: One-liner setup (5-8 words)
- Segment N: 2-3 comma-separated prompts about Bullet N (not Bullet N+1)

EXAMPLE OUTPUT:
"Quick review of fractions pointing_right denominator = parts total, numerator = parts we have pointing_right example: 3/4 pizza, draw on board pointing_right check: ask which is bigger, 1/2 or 1/4"
`.replace(/pointing_right/g, '\u{1F449}');

const TELEPROMPTER_RULES_DETAILED = `
DETAILED SPEAKER NOTES (SCRIPT STYLE):
The teacher wants a FULL SCRIPT they can read verbatim for confident delivery.

CRITICAL TIMING:
- Each segment explains the bullet that was JUST revealed (past tense).
- Do NOT preview or introduce upcoming bullets. Only discuss what the student just read.
- Segment 1 is spoken AFTER Bullet 1 appears. Segment 2 is spoken AFTER Bullet 2 appears.

RULES:
- Write complete sentences in conversational tone
- Include transition phrases: "Now let's look at...", "As you can see...", "So what does this mean?"
- Add prompts for student interaction: "[PAUSE for questions]", "[Wait for responses]"
- Include teacher actions: "[Point to diagram]", "[Write on board]"
- Each segment should be 3-5 sentences explaining the CURRENT bullet only

FORMATTING:
Use "pointing_right" as delimiter. Segments = Bullets + 1.
- Segment 0: Full introduction with hook and preview of the slide topic
- Segment N: Complete teaching script explaining Bullet N (not Bullet N+1)

EXAMPLE OUTPUT:
"Alright everyone, today we're going to explore something really interesting - fractions! [PAUSE] Has anyone ever shared a pizza with friends? That's exactly what fractions help us understand. pointing_right So when we look at this first point, the denominator - that's the number on the bottom - tells us how many equal parts we've divided something into. Think of it like cutting a cake into slices. If we cut it into 4 pieces, our denominator is 4. [Point to example on board] Does that make sense so far? pointing_right ..."
`.replace(/pointing_right/g, '\u{1F449}');

// JSON output format instructions shared across all modes
const JSON_OUTPUT_FORMAT = `
IMPORTANT: Return your response as a valid JSON array. Do not include any text before or after the JSON.

Each slide object must have these properties:
- title (string)
- content (array of strings - bullet points)
- speakerNotes (string - formatted with pointing_right)
- imagePrompt (string)
- layout (one of: 'split', 'full-image', 'center-text', 'flowchart', 'grid', 'tile-overlap')
- theme (one of: 'default', 'purple', 'blue', 'green', 'warm')
`.replace(/pointing_right/g, '\u{1F449}');

// Poster generation system prompt for AI Working Wall export
const POSTER_GENERATION_SYSTEM_PROMPT = `
You are an expert educational poster designer for Year 6 (10-11 year old) classrooms.

Your task: Transform presentation slide content into educational wall posters optimized for:
- Readability from 10 feet distance
- Student reference during independent work
- Visual clarity with strong hierarchy

CONTENT TRANSFORMATION RULES:
1. DENSITY: 5-8 key points maximum (posters are reference aids, not textbooks)
2. VOCABULARY: Year 6 reading level - explain technical terms simply, use concrete examples
3. ENRICHMENT: Add relevant examples, analogies, or clarifications beyond the slide content
4. TITLES: Create clear, engaging titles (don't copy slide title verbatim)
5. NARRATIVE: Use surrounding slides to understand topic progression

LAYOUT DECISION RULES:
1. TYPOGRAPHY FORMAT: Choose based on content type
   - Bullets: For lists, steps, features
   - Paragraphs: For explanations, definitions, context
   - Mixed: For posters with intro paragraph + detail points
2. COLOR SCHEME: Subject-appropriate colors
   - Science: Greens, teals (nature/discovery)
   - Math: Blues, purples (logic/precision)
   - Language: Warm tones (creativity/expression)
   - History: Earth tones (heritage/time)
   - Mixed/unclear: Neutral blues or school brand colors
3. VISUAL HIERARCHY: Ensure title dominates, sections are distinct, content is scannable

CONTEXT USAGE:
- Previous slides show what students already learned
- Next slides show where the lesson is heading
- Use this to judge what needs emphasis, what can be brief

OUTPUT REQUIREMENTS:
- You MUST return valid JSON matching the provided schema
- All content must be appropriate for Year 6 students
- Color values must be valid hex codes (e.g., "#2563eb")
- Typography sizes: "large" (36-48pt equiv), "xl" (48-64pt), "2xl" (64-72pt)
`;

// JSON schema for structured poster output
const POSTER_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Clear, engaging poster title' },
    subtitle: { type: 'string', description: 'Optional hook or context' },
    sections: {
      type: 'array',
      description: '5-8 key content sections',
      minItems: 5,
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          content: { type: 'string', description: 'Transformed, age-appropriate content' },
          format: {
            type: 'string',
            enum: ['bullet', 'paragraph', 'callout']
          },
          emphasis: { type: 'boolean' }
        },
        required: ['content', 'format']
      }
    },
    colorScheme: {
      type: 'object',
      properties: {
        primary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        secondary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        background: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        text: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' }
      },
      required: ['primary', 'secondary', 'background', 'text']
    },
    typography: {
      type: 'object',
      properties: {
        titleSize: { type: 'string', enum: ['large', 'xl', '2xl'] },
        bodyFormat: { type: 'string', enum: ['bullets', 'paragraphs', 'mixed'] }
      },
      required: ['titleSize', 'bodyFormat']
    }
  },
  required: ['title', 'sections', 'colorScheme', 'typography']
};

// JSON Schema for document analysis structured output
const DOCUMENT_ANALYSIS_JSON_SCHEMA = {
  name: 'document_analysis',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      documentType: {
        type: 'string',
        enum: ['worksheet', 'handout', 'quiz', 'activity', 'assessment', 'other']
      },
      documentTypeConfidence: {
        type: 'string',
        enum: ['high', 'medium', 'low']
      },
      alternativeTypes: {
        type: 'array',
        items: { type: 'string' }
      },
      title: { type: 'string' },
      pageCount: { type: 'integer' },
      hasAnswerKey: { type: 'boolean' },
      elements: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['header', 'subheader', 'paragraph', 'question', 'answer',
                     'instruction', 'table', 'diagram', 'image', 'list', 'blank-space']
            },
            content: { type: 'string' },
            position: { type: 'integer' },
            visualContent: { type: 'boolean' },
            children: { type: 'array', items: { type: 'string' } },
            tableData: {
              type: 'object',
              properties: {
                headers: { type: 'array', items: { type: 'string' } },
                rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } }
              },
              required: ['headers', 'rows'],
              additionalProperties: false
            }
          },
          required: ['type', 'content', 'position'],
          additionalProperties: false
        }
      },
      visualContentCount: { type: 'integer' }
    },
    required: ['documentType', 'documentTypeConfidence', 'title', 'pageCount', 'hasAnswerKey', 'elements', 'visualContentCount'],
    additionalProperties: false
  }
};

// Reusable schema for EnhancedElement in Claude tool schemas
const ENHANCED_ELEMENT_SCHEMA = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['header', 'subheader', 'paragraph', 'question', 'answer', 'instruction', 'table', 'diagram', 'image', 'list', 'blank-space']
    },
    originalContent: { type: 'string' },
    enhancedContent: { type: 'string' },
    position: { type: 'integer' },
    visualContent: { type: 'boolean' },
    slideReference: { type: 'string' },
    children: { type: 'array', items: { type: 'string' } },
    tableData: {
      type: 'object',
      properties: {
        headers: { type: 'array', items: { type: 'string' } },
        rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } }
      },
      additionalProperties: false
    }
  },
  required: ['type', 'originalContent', 'enhancedContent', 'position'],
  additionalProperties: false
};

// Reusable schema for DifferentiatedVersion in Claude tool schemas
const DIFFERENTIATED_VERSION_SCHEMA = (level: 'simple' | 'standard' | 'detailed') => ({
  type: 'object',
  properties: {
    level: { type: 'string', enum: [level] },
    title: { type: 'string' },
    alignedSlides: { type: 'array', items: { type: 'integer' } },
    slideAlignmentNote: { type: 'string' },
    elements: { type: 'array', items: ENHANCED_ELEMENT_SCHEMA }
  },
  required: ['level', 'title', 'alignedSlides', 'slideAlignmentNote', 'elements'],
  additionalProperties: false
});

// JSON Schema for EnhancementResult structured output (Claude tool_choice)
const ENHANCEMENT_RESULT_JSON_SCHEMA = {
  name: 'enhancement_result',
  schema: {
    type: 'object',
    properties: {
      slideMatches: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slideIndex: { type: 'integer' },
            slideTitle: { type: 'string' },
            relevanceScore: { type: 'string', enum: ['high', 'medium', 'low'] },
            reason: { type: 'string' }
          },
          required: ['slideIndex', 'slideTitle', 'relevanceScore', 'reason'],
          additionalProperties: false
        }
      },
      versions: {
        type: 'object',
        properties: {
          simple: DIFFERENTIATED_VERSION_SCHEMA('simple'),
          standard: DIFFERENTIATED_VERSION_SCHEMA('standard'),
          detailed: DIFFERENTIATED_VERSION_SCHEMA('detailed')
        },
        required: ['simple', 'standard', 'detailed'],
        additionalProperties: false
      },
      answerKeys: {
        type: 'object',
        properties: {
          structure: { type: 'string', enum: ['unified', 'per-level'] },
          keys: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                level: { type: 'string', enum: ['simple', 'standard', 'detailed'] },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      questionRef: { type: 'string' },
                      type: { type: 'string', enum: ['closed', 'open-ended'] },
                      answer: { type: 'string' },
                      rubric: {
                        type: 'object',
                        properties: {
                          criteria: { type: 'array', items: { type: 'string' } },
                          exemplar: { type: 'string' },
                          commonMistakes: { type: 'array', items: { type: 'string' } }
                        },
                        additionalProperties: false
                      }
                    },
                    required: ['questionRef', 'type'],
                    additionalProperties: false
                  }
                }
              },
              required: ['items'],
              additionalProperties: false
            }
          }
        },
        required: ['structure', 'keys'],
        additionalProperties: false
      }
    },
    required: ['slideMatches', 'versions', 'answerKeys'],
    additionalProperties: false
  }
};

// Default model constant
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/**
 * Get the appropriate teleprompter rules based on verbosity level.
 */
function getTeleprompterRulesForVerbosity(verbosity: VerbosityLevel = 'standard'): string {
  switch (verbosity) {
    case 'concise':
      return TELEPROMPTER_RULES_CONCISE;
    case 'detailed':
      return TELEPROMPTER_RULES_DETAILED;
    case 'standard':
    default:
      return TELEPROMPTER_RULES;
  }
}

/**
 * Get the source text for detection based on generation mode.
 * Fresh: lesson text only
 * Refine: presentation text only
 * Blend: lesson text (authoritative source per CONTEXT decision)
 */
function getDetectionSource(input: GenerationInput): string {
  switch (input.mode) {
    case 'fresh':
      return input.lessonText;
    case 'refine':
      return input.presentationText || '';
    case 'blend':
      return input.lessonText; // Lesson plan is authoritative
  }
}

/**
 * Get minimum confidence threshold based on mode.
 * Refine mode: only high-confidence (clear questions ending in ?, explicit activities)
 * Fresh/Blend: medium confidence (per CONTEXT decision)
 */
function getMinConfidenceForMode(mode: GenerationMode): ConfidenceLevel {
  return mode === 'refine' ? 'high' : 'medium';
}

/**
 * Get the appropriate system prompt based on generation mode.
 */
function getSystemPromptForMode(
  mode: GenerationMode,
  verbosity: VerbosityLevel = 'standard',
  gradeLevel: string = 'Year 6 (10-11 years old)',
  preservableContent?: PreservableContent,
  teachableMoments?: TeachableMoment[],
  useVisualScaffolding: boolean = false
): string {
  const teleprompterRules = getTeleprompterRulesForVerbosity(verbosity);
  const studentFriendlyRules = getStudentFriendlyRules(gradeLevel);

  // Build preservation rules if content detected
  const minConfidence = getMinConfidenceForMode(mode);
  const preservationRules = preservableContent && preservableContent.all.length > 0
    ? getPreservationRules(preservableContent, minConfidence)
    : '';

  const teleprompterPreservationRules = preservableContent
    ? getTeleprompterPreservationRules(preservableContent)
    : '';

  // Build teachable moment rules:
  // - If text-based moments detected, use those
  // - If visual scaffolding mode (image-based PDF with no extractable text), use visual rules
  // - Otherwise, no scaffolding rules
  const teachableMomentRules = teachableMoments && teachableMoments.length > 0
    ? getTeachableMomentRules(teachableMoments)
    : useVisualScaffolding
    ? getVisualScaffoldingRules()
    : '';

  switch (mode) {
    case 'fresh':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform a formal lesson plan into a teaching slideshow.

${studentFriendlyRules}

${preservationRules}

CRITICAL: You will be provided with text content from the document.
- Preserve the pedagogical structure: 'Hook', 'I Do', 'We Do', 'You Do'.
- **MANDATORY**: You MUST include distinct slides for **'Success Criteria'** and **'Differentiation'** (Support, Extension, Intervention) found in the document.
  - Success Criteria should be a clear checklist.
  - Differentiation should explain how to adapt for different levels (e.g., C Grade, B Grade, A Grade).

${teleprompterRules}

${teleprompterPreservationRules}

${teachableMomentRules}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages, 'full-image' for hooks, and 'grid' for Success Criteria/Differentiation.

${JSON_OUTPUT_FORMAT}
`;

    case 'refine':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform an existing presentation into clean, less text-dense Cue-style slides.

${studentFriendlyRules}

${preservationRules}

CRITICAL RULE - CONTENT PRESERVATION:
**You MUST preserve ALL content from the original presentation.**
- Do NOT omit any slides, sections, activities, examples, or instructions.
- If the original has a "Daily Challenge" - include it.
- If the original has a "Worked Example" - include it.
- If something seems clunky or doesn't fit the Cue style, RESTRUCTURE it to fit - do NOT remove it.
- The teacher will decide what to remove later. Your job is to improve presentation, not edit content.

REFINE MODE RULES:
- Extract key concepts from the presentation provided.
- Create NEW Cue-style slides from scratch (do not preserve original formatting).
- You may split dense slides into multiple slides - but all original content must appear somewhere.
- You may reorder slides for better pedagogical flow.
- Note any images/diagrams that existed with "[Visual: description]" in the relevant bullet point so the teacher knows to re-add them.
- Output stands alone - no references to "original slide 3" or similar markers.
- Generate teleprompter scripts by inferring the teaching goals from the presentation content.

${teleprompterRules}

${teleprompterPreservationRules}

${teachableMomentRules}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages, 'full-image' for hooks.

${JSON_OUTPUT_FORMAT}
`;

    case 'blend':
      return `
You are an elite Primary Education Consultant.
Your goal is to create slides that combine lesson content with an existing presentation.

${studentFriendlyRules}

${preservationRules}

BLEND MODE RULES:
- Analyze BOTH the lesson plan AND existing presentation provided.
- Determine content overlap between sources.
- If the lesson contains topics NOT in the presentation, add new slides for those topics.
- Standardize ALL output to Cue style (do not try to match original presentation aesthetic).
- When lesson says X but presentation says Y, note the discrepancy in speakerNotes: "[Note: Sources differ on...]"
- Output stands alone - no references to source documents.
- Synthesize both sources into a cohesive teaching narrative for the teleprompter scripts.

${teleprompterRules}

${teleprompterPreservationRules}

${teachableMomentRules}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages, 'full-image' for hooks.

${JSON_OUTPUT_FORMAT}
`;
  }
}

// Claude message types for API requests
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

interface ClaudeContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: { type: 'base64'; media_type: string; data: string };
}

/**
 * Map HTTP status codes to AIErrorCode for consistent error handling.
 */
function mapHttpToErrorCode(status: number, body: any): AIErrorCode {
  if (status === 429) {
    const msg = (body?.error?.message || '').toLowerCase();
    if (msg.includes('quota') || msg.includes('billing') || msg.includes('insufficient')) {
      return 'QUOTA_EXCEEDED';
    }
    return 'RATE_LIMIT';
  }
  if (status === 401 || status === 403) return 'AUTH_ERROR';
  if (status === 400) {
    // Bad request - often means invalid model, malformed request, etc.
    // Log for debugging but return a more specific error
    console.error('Claude API 400 error:', body);
    return 'UNKNOWN_ERROR';
  }
  if (status >= 500 || status === 529) return 'SERVER_ERROR';
  return 'UNKNOWN_ERROR';
}

/**
 * Helper function to make calls to the Claude API.
 * Includes the required CORS header for browser use.
 */
async function callClaude(
  apiKey: string,
  messages: ClaudeMessage[],
  systemPrompt: string,
  maxTokens: number = 4096
): Promise<string> {
  let response: Response;

  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',  // REQUIRED for browser
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    });
  } catch (fetchError) {
    // fetch() itself failed - network error, CORS preflight failure, etc.
    throw new AIProviderError(
      USER_ERROR_MESSAGES.NETWORK_ERROR,
      'NETWORK_ERROR',
      fetchError
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const code = mapHttpToErrorCode(response.status, errorBody);
    // Include API error message if available for better debugging
    const apiMessage = errorBody?.error?.message;
    const userMessage = apiMessage
      ? `${USER_ERROR_MESSAGES[code]} (${apiMessage})`
      : USER_ERROR_MESSAGES[code];
    console.error('Claude API error:', response.status, errorBody);
    throw new AIProviderError(userMessage, code, errorBody);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

/**
 * Extract JSON from Claude's response, handling markdown code blocks.
 */
function extractJSON<T>(text: string): T {
  // Claude sometimes wraps JSON in markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]?.trim() || text.trim();

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new AIProviderError(USER_ERROR_MESSAGES.PARSE_ERROR, 'PARSE_ERROR', e);
  }
}

/**
 * Get Millionaire progression rules based on question count.
 * Returns Bloom's taxonomy-based difficulty progression for the prompt.
 */
function getMillionaireProgressionRules(count: 3 | 5 | 10): string {
  if (count === 3) {
    return `
Question 1: EASY (Remember/Understand) - "What is...", "Name the..."
Question 2: MEDIUM (Apply/Analyze) - "How would...", "What would happen..."
Question 3: HARD (Evaluate/Create) - "Why does...", "What is the best..."`;
  }
  if (count === 5) {
    return `
Questions 1-2: EASY (Remember/Understand) - "What is...", "Name the..."
Questions 3-4: MEDIUM (Apply/Analyze) - "How would...", "What would happen..."
Question 5: HARD (Evaluate/Create) - "Why does...", "What is the best..."`;
  }
  return `
Questions 1-3: EASY (Remember/Understand) - "What is...", "Name the..."
Questions 4-6: MEDIUM (Apply/Analyze) - "How would...", "What would happen..."
Questions 7-10: HARD (Evaluate/Create) - "Why does...", "What is the best..."`;
}

/**
 * ClaudeProvider implements the full AIProviderInterface using Anthropic's Claude API.
 * All text generation methods make real API calls; image methods return undefined
 * since Claude API does not support image generation.
 */
export class ClaudeProvider implements AIProviderInterface {
  private model: string;

  constructor(private apiKey: string, selectedModel?: string) {
    this.model = selectedModel || DEFAULT_CLAUDE_MODEL;
    console.log(`[ClaudeProvider] Using model: ${this.model}`);
  }

  /**
   * Generate lesson slides from various input sources.
   * Accepts either the new GenerationInput object or the old (string, string[]) signature for backward compatibility.
   */
  async generateLessonSlides(
    inputOrText: GenerationInput | string,
    pageImages?: string[]
  ): Promise<Slide[]> {
    // Normalize to GenerationInput for backward compatibility
    const input: GenerationInput = typeof inputOrText === 'string'
      ? { lessonText: inputOrText, lessonImages: pageImages, mode: 'fresh' }
      : inputOrText;

    // Detect preservable content from source text based on mode
    const sourceText = getDetectionSource(input);
    const detectedContent = detectPreservableContent(sourceText);

    // Debug logging for development (can be removed later)
    if (detectedContent.all.length > 0) {
      console.log(`[ClaudeProvider] Detected ${detectedContent.questions.length} questions, ${detectedContent.activities.length} activities`);
    }

    // Detect teachable moments for delayed answer reveal
    const teachableMoments = detectTeachableMoments(sourceText);

    // Debug logging for teachable moments
    if (teachableMoments.length > 0) {
      console.log(`[ClaudeProvider] Detected ${teachableMoments.length} teachable moments`);
      teachableMoments.forEach(tm => {
        console.log(`  - ${tm.contentCategory}: ${tm.problem.text.substring(0, 50)}...`);
      });
    }

    // Determine if we should use visual scaffolding (image-based PDF with no extractable text)
    const hasMinimalText = sourceText.replace(/\s/g, '').length < 50;
    const hasImages = (input.lessonImages && input.lessonImages.length > 0) ||
                      (input.presentationImages && input.presentationImages.length > 0);
    const useVisualScaffolding = hasMinimalText && hasImages && teachableMoments.length === 0;

    if (useVisualScaffolding) {
      console.log('[ClaudeProvider] Using VISUAL SCAFFOLDING mode (image-based PDF detected)');
    }

    const systemPrompt = getSystemPromptForMode(input.mode, input.verbosity, input.gradeLevel, detectedContent, teachableMoments, useVisualScaffolding);

    // Verbosity instruction to reinforce system prompt
    const verbosityLevel = input.verbosity || 'standard';
    const verbosityInstruction = verbosityLevel === 'concise'
      ? '\n\nIMPORTANT: Generate CONCISE speaker notes - brief bullet-point prompts only, 2-3 short phrases per segment.'
      : verbosityLevel === 'detailed'
      ? '\n\nIMPORTANT: Generate DETAILED speaker notes - full scripts the teacher can read verbatim, 3-5 complete sentences per segment with transitions and interaction prompts.'
      : ''; // standard uses default rules

    // Build message content based on mode
    const contentParts: ClaudeContentBlock[] = [];

    // Add text prompt based on mode
    if (input.mode === 'fresh') {
      contentParts.push({
        type: 'text',
        text: `Transform this formal lesson plan into a sequence of teaching slides:${verbosityInstruction}\n\n${input.lessonText}`
      });
    } else if (input.mode === 'refine') {
      contentParts.push({
        type: 'text',
        text: `Transform this existing presentation into clean, less text-dense Cue-style slides:${verbosityInstruction}\n\n${input.presentationText || ''}`
      });
    } else { // blend
      contentParts.push({
        type: 'text',
        text: `Combine this lesson plan:\n\n${input.lessonText}\n\n---\n\nWith this existing presentation:\n\n${input.presentationText || ''}\n\nCreate enhanced Cue-style slides that incorporate content from both sources.${verbosityInstruction}`
      });
    }

    // Helper to add images to content parts
    const addImages = (images: string[] | undefined, limit: number = 10) => {
      if (images && images.length > 0) {
        // Limit images to avoid token limits (especially for blend mode)
        const limitedImages = images.slice(0, limit);
        limitedImages.forEach(base64 => {
          // Remove data URI prefix if present
          const data = base64.includes(',') ? base64.split(',')[1] : base64;
          contentParts.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data
            }
          });
        });
      }
    };

    // Add images based on mode
    if (input.mode === 'fresh') {
      // Fresh mode: only lesson images
      addImages(input.lessonImages);
    } else if (input.mode === 'refine') {
      // Refine mode: only presentation images
      addImages(input.presentationImages);
    } else {
      // Blend mode: both sources (limit each to 5 images to stay within token limits)
      addImages(input.lessonImages, 5);
      addImages(input.presentationImages, 5);
    }

    const messages: ClaudeMessage[] = [{ role: 'user', content: contentParts }];
    const response = await callClaude(this.apiKey, messages, systemPrompt, 8192);
    const data = extractJSON<any[]>(response);

    return data.map((item: any, index: number) => ({
      ...item,
      id: `slide-${Date.now()}-${index}`,
      isGeneratingImage: false
    }));
  }

  async generateSlideImage(imagePrompt: string, layout?: string): Promise<string | undefined> {
    // Claude API does NOT support image generation
    // Return undefined immediately - app will show placeholder or skip image
    return undefined;
  }

  async generateResourceImage(imagePrompt: string): Promise<string | undefined> {
    // Claude API does NOT support image generation
    // Return undefined immediately - app will show placeholder or skip image
    return undefined;
  }

  async generateQuickQuestion(
    slideTitle: string,
    slideContent: string[],
    difficulty: 'Grade C' | 'Grade B' | 'Grade A'
  ): Promise<string> {
    const systemPrompt = `
You are a teaching assistant helper for a Year 6 (10-11 year old) class.
Generate a single, short, oral question that the teacher can ask the class to check understanding of the current slide.

DIFFICULTY LEVELS:
- Grade C: Basic recall, simple observation, or "What is" questions. Easy confidence builder.
- Grade B: Understanding, explaining in own words, or "How" questions. Moderate challenge.
- Grade A: Critical thinking, prediction, synthesis, or "Why" questions. High challenge.

OUTPUT RULES:
- Output ONLY the question text as plain text.
- Keep it conversational.
- Do not include "Here is a question:" prefixes.
- Do not wrap in quotes or add any formatting.
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: `Topic: ${slideTitle}\nKey Points on Slide: ${slideContent.join('; ')}\n\nGenerate a ${difficulty} question.`
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 256);
    return response.trim() || 'Could not generate question.';
  }

  async reviseSlide(slide: Slide, instruction: string): Promise<Partial<Slide>> {
    const systemPrompt = `
You are an educational slide editor. You will receive the current slide content as JSON and an edit instruction.
Apply the requested changes and return ONLY the JSON with the updated fields.

IMPORTANT: Return your response as valid JSON containing only the fields that need to change.
Do not include any text before or after the JSON.
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: `Current Slide: ${JSON.stringify(slide)}\n\nEdit Instruction: "${instruction}"\n\nReturn ONLY JSON with the updated fields.`
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 2048);
    return extractJSON<Partial<Slide>>(response);
  }

  async generateContextualSlide(
    lessonTopic: string,
    userInstruction: string,
    prevSlide?: Slide,
    nextSlide?: Slide
  ): Promise<Slide> {
    const systemPrompt = `
You are an educational slide designer. Create a new slide for the topic: ${lessonTopic}.

Context:
- This slide comes AFTER: "${prevSlide?.title || 'Start of presentation'}"
- This slide comes BEFORE: "${nextSlide?.title || 'End of presentation'}"

Create a slide that fits naturally in this position.

SPEAKER NOTES RULES:
- Use "👉" as a delimiter between segments.
- Segment 0 (Intro): Set the scene before any bullets appear.
- Each subsequent segment explains the bullet that was JUST revealed (not the next one).
- Segment 1 explains Bullet 1 AFTER it appears. Segment 2 explains Bullet 2 AFTER it appears.
- Do NOT preview upcoming bullets - only discuss the current bullet.
- Number of "👉" segments = Number of Bullets + 1.
- NEVER repeat the slide text in the notes.

IMPORTANT: Return your response as valid JSON with these fields:
- title (string)
- content (array of strings - bullet points)
- speakerNotes (string - formatted with 👉)
- imagePrompt (string)
- layout (one of: 'split', 'full-image', 'flowchart', 'grid', 'tile-overlap')

Do not include any text before or after the JSON.
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: userInstruction
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 2048);
    const data = extractJSON<any>(response);

    return {
      ...data,
      id: `slide-ins-${Date.now()}`,
      isGeneratingImage: false
    };
  }

  async generateExemplarSlide(lessonTopic: string, prevSlide: Slide): Promise<Slide> {
    const systemPrompt = `
You are an educational designer creating "Worked Examples" for Year 6 (10-11yo).
Basis: Previous concept was "${prevSlide.title}". Content: ${prevSlide.content.join('; ')}.

TASK: Create a slide that shows this strategy in action.
1. Provide 3-4 bullet points showing a concrete example.
2. STRICT SPEAKER NOTES (TELEPROMPTER LOGIC):
   - You MUST provide exactly (Number of Bullets + 1) segments separated by "👉".
   - Segment 0: INTRO: Briefly introduce the example.
   - Segment 1: Explain the first step (do NOT repeat the bullet text).
   - Segment 2: Explain the next step (do NOT repeat the previous explanation).
   - Ensure the script progresses logically.

Do NOT miss the "👉" delimiter. Each reveal MUST have a corresponding script.

IMPORTANT: Return your response as valid JSON with these fields:
- title (string - should start with 'Exemplar:' or 'Worked Example:')
- content (array of strings - bullet points)
- speakerNotes (string - must follow the 👉 format)
- imagePrompt (string)
- layout (one of: 'split', 'full-image', 'flowchart', 'grid', 'tile-overlap')

Do not include any text before or after the JSON.
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: `Generate an Exemplar slide for the topic: ${lessonTopic}. Use 'split' or 'grid' layout.`
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 2048);
    const data = extractJSON<any>(response);

    return {
      ...data,
      id: `exemplar-${Date.now()}`,
      isGeneratingImage: false
    };
  }

  async generateElaborateSlide(lessonTopic: string, sourceSlide: Slide, allSlides: Slide[]): Promise<Slide> {
    const studentFriendlyRules = getStudentFriendlyRules('Year 6 (10-11 years old)');

    // Build full presentation context for coherence
    const presentationContext = allSlides
      .map((s, i) => `Slide ${i + 1}: "${s.title}" - ${s.content.slice(0, 2).join('; ')}`)
      .join('\n');

    const systemPrompt = `
You are an educational designer creating "Elaborate" slides for Year 6 (10-11 year olds).
Topic: ${lessonTopic}
You are expanding on: "${sourceSlide.title}"
Source content: ${sourceSlide.content.join('; ')}

${studentFriendlyRules}

PRESENTATION CONTEXT (maintain coherence, don't repeat earlier content):
${presentationContext}

TASK: Create a deeper-dive slide that helps students truly understand and apply this concept.

CONTENT REQUIREMENTS:
1. Title should reference the source (e.g., "More on [Topic]" or "[Topic]: Going Deeper")
2. ALWAYS include at least one analogy ("Think of it like...")
3. Focus on APPLICATION - show HOW to use the concept in practice
4. Match the tone of the source slide
5. Provide 3-5 content points mixing prose context with concrete examples
6. Format: Opening context point, then concrete examples/applications, then analogy

STRICT SPEAKER NOTES (TELEPROMPTER LOGIC):
- You MUST provide exactly (Number of content points + 1) segments separated by "👉"
- Segment 0: INTRO - set context for why we're going deeper
- Segment N: Explain the point (do NOT repeat the bullet text)
- Include pacing cues: "[Pause for effect]", "[Let this sink in]"

IMPORTANT: Return your response as valid JSON with these fields:
- title (string)
- content (array of strings)
- speakerNotes (string - must follow the 👉 format)
- imagePrompt (string)
- layout (one of: 'split', 'full-image', 'flowchart', 'grid', 'tile-overlap')

Do not include any text before or after the JSON.
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: `Generate an Elaborate slide for: "${sourceSlide.title}". Use 'split' or 'grid' layout.`
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 2048);
    const data = extractJSON<any>(response);

    return {
      ...data,
      id: `elaborate-${Date.now()}`,
      isGeneratingImage: false,
      slideType: 'elaborate'
    };
  }

  async generateWorkTogetherSlide(lessonTopic: string, sourceSlide: Slide, allSlides: Slide[]): Promise<Slide> {
    const studentFriendlyRules = getStudentFriendlyRules('Year 6 (10-11 years old)');

    // Build full presentation context for coherence
    const presentationContext = allSlides
      .map((s, i) => `Slide ${i + 1}: "${s.title}" - ${s.content.slice(0, 2).join('; ')}`)
      .join('\n');

    const systemPrompt = `
You are an educational designer creating "Work Together" collaborative activities for Year 6 (10-11 year olds).
Topic: ${lessonTopic}
Creating activity based on: "${sourceSlide.title}"
Source content: ${sourceSlide.content.join('; ')}

${studentFriendlyRules}

PRESENTATION CONTEXT (maintain coherence):
${presentationContext}

TASK: Create a quick, engaging collaborative activity (2-3 minutes) for student pairs.

ACTIVITY REQUIREMENTS:
1. Design for PAIRS (2 students) as the primary grouping
2. ALWAYS include a group-of-3 variant (e.g., "If you're in a group of 3, one person can be the recorder" or "take turns")
3. Use ONLY basic classroom resources: pen, paper, whiteboard, mini-whiteboard
4. Do NOT require: tablets, computers, scissors, glue, colored materials, internet
5. Activity should reinforce the source slide content
6. Keep instructions clear and actionable for 10-11 year olds
7. Include a clear outcome (e.g., "Be ready to share one thing you discovered")

CONTENT FORMAT:
- Provide 3-5 content points as numbered instructions or prose
- Include the group-of-3 variant inline with the instructions (not as a separate point)
- Title should indicate collaboration (e.g., "Partner Challenge: [Topic]" or "Work Together: [Topic]")

STRICT SPEAKER NOTES (TELEPROMPTER LOGIC):
- You MUST provide exactly (Number of content points + 1) segments separated by "👉"
- Segment 0: INTRO - how to launch the activity and get pairs started
- Segments 1-N: What to say/observe during each phase of the activity
- Final segment: How to wrap up and transition (share-out if applicable)
- Include pacing cues: "[Give them 30 seconds]", "[Walk around and check progress]"

IMPORTANT: Return your response as valid JSON with these fields:
- title (string - should indicate collaboration)
- content (array of strings - activity instructions)
- speakerNotes (string - must follow the 👉 format)
- imagePrompt (string)
- layout (must be 'work-together')

Do not include any text before or after the JSON.
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: `Generate a Work Together collaborative activity slide for: "${sourceSlide.title}". Use 'work-together' layout.`
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 2048);
    const data = extractJSON<any>(response);

    return {
      ...data,
      id: `work-together-${Date.now()}`,
      isGeneratingImage: false,
      slideType: 'work-together',
      layout: 'work-together'
    };
  }

  async generateClassChallengeSlide(lessonTopic: string, sourceSlide: Slide, allSlides: Slide[]): Promise<Slide> {
    const studentFriendlyRules = getStudentFriendlyRules('Year 6 (10-11 years old)');

    // Build full presentation context for coherence
    const presentationContext = allSlides
      .map((s, i) => `Slide ${i + 1}: "${s.title}" - ${s.content.slice(0, 2).join('; ')}`)
      .join('\n');

    const systemPrompt = `
You are an educational designer creating "Class Challenge" slides for Year 6 (10-11 year olds).
Topic: ${lessonTopic}
Creating challenge based on: "${sourceSlide.title}"
Source content: ${sourceSlide.content.join('; ')}

${studentFriendlyRules}

PRESENTATION CONTEXT (maintain coherence):
${presentationContext}

TASK: Create a Class Challenge slide for live student participation.
The teacher will type student contributions in real-time during the lesson.

CHALLENGE PROMPT REQUIREMENTS:
1. Write a SHORT, punchy challenge prompt/question (2-3 sentences max)
2. The prompt should check understanding of the source slide content
3. Make it open-ended to encourage multiple diverse responses
4. Phrase it to invite brainstorming (e.g., "What are all the ways...", "Name as many...", "What examples can you think of...")
5. Keep language simple and engaging for 10-11 year olds

SPEAKER NOTES (FACILITATION TIPS):
The teleprompter should help the teacher run the activity effectively:
- Segment 0: INTRO - How to launch the challenge, set expectations (e.g., "Hands up with ideas, I'll type them")
- Segment 1: DURING - What to say while collecting responses, prompts to encourage more ideas
- Segment 2: WRAP-UP - How to summarize, acknowledge contributions, transition

Use "👉" as delimiter between segments (exactly 3 segments).

CONTENT ARRAY:
Provide 1-2 brief instruction bullets for the slide (optional, can be empty if the prompt is self-explanatory).
These appear below the challenge prompt if provided.

TITLE:
Use "Class Challenge" or a variation like "Challenge Time" or "Quick Challenge".

IMPORTANT: Return your response as valid JSON with these fields:
- title (string - "Class Challenge" or similar)
- content (array of strings - 1-2 brief instructions, can be empty)
- speakerNotes (string - facilitation tips with 👉 format, exactly 3 segments)
- challengePrompt (string - the main challenge question, 2-3 sentences)
- imagePrompt (string)
- layout (must be 'class-challenge')

Do not include any text before or after the JSON.
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: `Generate a Class Challenge slide for: "${sourceSlide.title}". Use 'class-challenge' layout.`
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 2048);
    const data = extractJSON<any>(response);

    return {
      ...data,
      id: `class-challenge-${Date.now()}`,
      isGeneratingImage: false,
      slideType: 'class-challenge',
      layout: 'class-challenge',
      backgroundColor: '#ea580c',  // Orange-600 theme
      contributions: []  // Initialize empty contributions array
    };
  }

  async generateLessonResources(lessonText: string, slideContext: string): Promise<LessonResource[]> {
    const systemPrompt = `
You are an expert curriculum developer.
Your task is to analyze the provided Lesson Plan and the Slides created from it to identify 3-5 ESSENTIAL physical resources that a teacher would need to print.

LOOK FOR:
1. Referenced lists (e.g., "Animal list", "Vocabulary list").
2. Differentiated worksheets mentioned in the plan (e.g., "Grade C support sheet", "Extension task card").
3. Visual aids/infographics that were described but need to be printed (e.g., "Fact sheet").
4. Assessment checklists or rubrics.

TASK:
Generate the FULL CONTENT for these resources.
- **APPEARANCE**: Make it engaging for 10-11 year olds. Use Emojis in titles and section headers.
- **FORMATTING**: Use proper MARKDOWN.
  - Use tables for structured data.
  - Use [ ] for checkboxes.
  - Use _________________ for writing lines.
- **VISUALS**: Provide an 'imagePrompt' for a decorative header illustration (e.g., "Cartoon lizard holding a pencil").

IMPORTANT: Return your response as a valid JSON array. Do not include any text before or after the JSON.

Each resource object must have:
- title (string - include an emoji)
- type (one of: 'worksheet', 'handout', 'guide', 'list', 'quiz')
- targetAudience (one of: 'student', 'teacher', 'support', 'extension')
- content (string - full markdown content)
- imagePrompt (string - description for a kid-friendly header image)
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: `Original Lesson Plan Context:\n${lessonText.substring(0, 3000)}...\n\nSlides Generated:\n${slideContext.substring(0, 3000)}...\n\nGenerate a JSON array of resources.`
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 8192);
    const data = extractJSON<any[]>(response);

    return data.map((item: any, index: number) => ({
      ...item,
      id: `res-${Date.now()}-${index}`
    }));
  }

  async generateImpromptuQuiz(
    slides: Slide[],
    currentIndex: number,
    numQuestions: number = 4
  ): Promise<QuizQuestion[]> {
    // Gather context from slides up to current index
    const relevantSlides = slides.slice(0, currentIndex + 1);
    const contextText = relevantSlides
      .map((s, i) => `Slide ${i + 1} (${s.title}): ${s.content.join('; ')}`)
      .join('\n\n');

    const systemPrompt = `
You are a fun and energetic Game Show Host for a Year 6 classroom.
Generate a set of multiple-choice questions based strictly on the provided lesson content.

RULES:
1. Questions must be suitable for 10-11 year olds.
2. Create ${numQuestions} questions.
3. Each question must have exactly 4 options.
4. Provide the correct answer index (0, 1, 2, or 3).
5. Provide a short, encouraging explanation for the answer.

IMPORTANT: Return your response as a valid JSON array. Do not include any text before or after the JSON.

Each question object must have:
- question (string)
- options (array of exactly 4 strings)
- correctAnswerIndex (number 0-3)
- explanation (string)
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: `CONTEXT (What the students have learned so far):\n${contextText}\n\nGenerate the quiz now.`
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 4096);
    return extractJSON<QuizQuestion[]>(response);
  }

  async generateQuestionWithAnswer(
    slideTitle: string,
    slideContent: string[],
    difficulty: 'A' | 'B' | 'C' | 'D' | 'E'
  ): Promise<QuestionWithAnswer> {
    const systemPrompt = `
You are a teaching assistant helper for a Year 6 (10-11 year old) class.
Generate a single oral question with an expected answer that the teacher can use as a teleprompter guide.

BLOOM'S TAXONOMY DIFFICULTY MAPPING:
- Grade E (Recall): "What is...", "Name the...", "List the..." - Pure factual recall.
- Grade D (Comprehension): "Give an example of...", "Which one shows..." - Basic understanding.
- Grade C (Understanding): "Describe in your own words", "What does X mean?" - Deeper understanding.
- Grade B (Application): "How would you use...", "Explain how..." - Apply concepts.
- Grade A (Analysis/Synthesis): "Why does X affect Y?", "What would happen if..." - Critical thinking.

ANSWER FORMAT RULES:
- Write a sample answer a good student would give.
- Use **bold** around KEY POINTS the teacher should listen for.
- Length:
  - Grade E/D: 1-2 sentences
  - Grade C: 2-3 sentences
  - Grade B/A: 2-3 sentences with deeper reasoning
- Example: "The water cycle includes **evaporation**, **condensation**, and **precipitation**."

OUTPUT RULES:
- Question should be conversational and age-appropriate.
- Answer should be natural, not robotic.
- Bold the 2-4 most important key terms or concepts.

IMPORTANT: Return your response as valid JSON with these fields:
- question (string)
- answer (string - sample answer with **key points** bolded)

Do not include any text before or after the JSON.
`;

    const messages: ClaudeMessage[] = [{
      role: 'user',
      content: `Topic: ${slideTitle}\nKey Points on Slide: ${slideContent.join('; ')}\n\nGenerate a Grade ${difficulty} question with expected answer.`
    }];

    try {
      const response = await callClaude(this.apiKey, messages, systemPrompt, 512);
      return extractJSON<QuestionWithAnswer>(response);
    } catch (error) {
      // Fallback on error
      return {
        question: "Could not generate question",
        answer: "Please try again"
      };
    }
  }

  async generateGameQuestions(
    request: GameQuestionRequest
  ): Promise<QuizQuestion[]> {
    // Build system prompt based on game type
    let systemPrompt: string;

    if (request.gameType === 'millionaire') {
      systemPrompt = `You are a friendly quiz master creating "Who Wants to Be a Millionaire" style questions for Year 6 students (10-11 years old).

LANGUAGE FOR 10 YEAR OLDS (CRITICAL):
- Use simple, everyday words a child would know
- Keep sentences SHORT (under 15 words)
- Avoid technical jargon - if you must use a term, define it in the question
- Ask ONE clear thing per question
- Write like you're talking to a child: "What is..." not "Which of the following represents..."
- BAD: "What phenomenon causes precipitation to occur?"
- GOOD: "What causes rain to fall from clouds?"

PROGRESSIVE DIFFICULTY RULES (Bloom's Taxonomy):
${getMillionaireProgressionRules(request.questionCount as 3 | 5 | 10)}

DISTRACTOR RULES (CRITICAL):
- All 4 options must be similar in length and specificity
- Distractors must be plausible misconceptions a student might have
- Never include "All of the above" or "None of the above"
- Avoid using negatives in questions ("Which is NOT...")
- Keep each option to 1-5 words when possible

CONTENT CONSTRAINT (CRITICAL):
- Generate questions ONLY from the provided lesson content
- Do NOT use external knowledge beyond what is in the slides
- If content is thin, focus on what IS there rather than inventing new facts`;
    } else {
      const difficultyConfig = BLOOM_DIFFICULTY_MAP[request.difficulty];
      systemPrompt = `You are a friendly quiz master creating rapid-fire questions for "Beat the Chaser" style game for Year 6 students (10-11 years old).

LANGUAGE FOR 10 YEAR OLDS (CRITICAL):
- Use simple, everyday words a child would know
- Keep questions SHORT (under 12 words)
- Avoid technical jargon - if you must use a term, add a hint
- Write like you're talking to a child: "What is..." not "Which of the following..."
- BAD: "What literary device involves giving human qualities to non-human things?"
- GOOD: "What do we call it when we describe a tree as 'dancing' in the wind?"

DIFFICULTY: ${request.difficulty.toUpperCase()}
${difficultyConfig.description}
Question types: ${difficultyConfig.questionTypes}

ALL questions must be at ${request.difficulty} level. No progression - consistent difficulty throughout.

QUICK-FIRE RULES:
- Questions should be answerable in 3-5 seconds
- Single concept per question, no multi-part questions
- Avoid ambiguous wording
- Keep options to 1-4 words each

DISTRACTOR RULES:
- All 4 options must be plausible
- Distractors should reflect common misconceptions
- Similar length and specificity across all options

CONTENT CONSTRAINT (CRITICAL):
- Generate questions ONLY from the provided lesson content
- Do NOT use external knowledge beyond what is in the slides`;
    }

    // Build user prompt with slide context
    let userPrompt = `LESSON CONTENT (Generate questions from this material only):
Topic: ${request.slideContext.lessonTopic}

${request.slideContext.cumulativeContent}

Current slide focus: ${request.slideContext.currentSlideTitle}
Key points: ${request.slideContext.currentSlideContent.join('; ')}`;

    if (request.optionalHints) {
      userPrompt += `\n\nTEACHER HINTS: ${request.optionalHints}`;
    }

    userPrompt += `\n\nGenerate exactly ${request.questionCount} questions using the quiz_questions tool.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          tools: [{
            name: 'quiz_questions',
            description: 'Output quiz questions in structured format',
            input_schema: {
              type: 'object',
              properties: {
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question: { type: 'string' },
                      options: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 4,
                        maxItems: 4
                      },
                      correctAnswerIndex: { type: 'integer', minimum: 0, maximum: 3 },
                      explanation: { type: 'string' }
                    },
                    required: ['question', 'options', 'correctAnswerIndex', 'explanation']
                  }
                }
              },
              required: ['questions']
            }
          }],
          tool_choice: { type: 'tool', name: 'quiz_questions' }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AIProviderError(
          this.getErrorMessage(response.status, errorText),
          this.getErrorCode(response.status),
          errorText
        );
      }

      const data = await response.json();

      // Extract from tool_use response
      const toolUse = data.content?.find((block: any) => block.type === 'tool_use');
      if (toolUse?.input?.questions) {
        // Shuffle options so correct answer isn't always "A"
        return shuffleQuestionOptions(toolUse.input.questions);
      }

      // Fallback: try to extract from text if tool_use failed
      const textBlock = data.content?.find((block: any) => block.type === 'text');
      if (textBlock?.text) {
        try {
          const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const questions = JSON.parse(jsonMatch[0]);
            // Shuffle options so correct answer isn't always "A"
            return shuffleQuestionOptions(questions);
          }
        } catch {
          // Fall through to empty array
        }
      }

      return [];
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new AIProviderError(
        USER_ERROR_MESSAGES.NETWORK_ERROR,
        'NETWORK_ERROR',
        error
      );
    }
  }

  async regenerateTeleprompter(slide: Slide, verbosity: VerbosityLevel, prevSlide?: Slide, nextSlide?: Slide): Promise<string> {
    const rules = verbosity === 'concise'
        ? TELEPROMPTER_RULES_CONCISE
        : verbosity === 'detailed'
        ? TELEPROMPTER_RULES_DETAILED
        : TELEPROMPTER_RULES; // standard

    // Build context section for surrounding slides
    const contextLines: string[] = [];
    if (prevSlide) {
        contextLines.push(`- Previous slide: "${prevSlide.title}" covered: ${prevSlide.content.slice(0, 2).join('; ')}`);
    } else {
        contextLines.push('- This is the first slide in the presentation.');
    }
    if (nextSlide) {
        contextLines.push(`- Next slide: "${nextSlide.title}" will cover: ${nextSlide.content.slice(0, 2).join('; ')}`);
    } else {
        contextLines.push('- This is the last slide in the presentation.');
    }

    const contextSection = `
CONTEXT FOR COHERENT FLOW:
${contextLines.join('\n')}
Ensure your script transitions naturally from what came before and sets up what comes next.
`;

    const systemPrompt = `
You are regenerating teleprompter notes for an existing slide.
The slide has ${slide.content.length} bullet points.

${contextSection}

${rules}

CRITICAL: Output ONLY the speaker notes text as plain text. No JSON, no markdown code blocks, no explanations.
`;

    const messages: ClaudeMessage[] = [{
        role: 'user',
        content: `Slide Title: ${slide.title}\nSlide Content:\n${slide.content.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n\nGenerate speaker notes in ${verbosity} style.`
    }];

    const response = await callClaude(this.apiKey, messages, systemPrompt, 2048);
    return response.trim();
  }

  /**
   * Stream a chat response from Claude using SSE.
   * Parses text/event-stream manually since EventSource doesn't support POST.
   */
  async *streamChat(
    message: string,
    context: ChatContext
  ): AsyncGenerator<string, void, unknown> {
    const systemPrompt = `You are a helpful teaching assistant. The teacher is presenting a lesson to ${context.gradeLevel} students.

CURRENT LESSON CONTEXT:
- Topic: ${context.lessonTopic}
- Current Slide: ${context.currentSlideTitle}
- Slide Content: ${context.currentSlideContent.join('; ')}

INSTRUCTIONS:
- Give clear, helpful answers to the teacher's question
- Use language appropriate for ${context.gradeLevel} students
- Be concise but thorough
- If relevant, reference the lesson content
- Do NOT include markdown formatting (no **, no ##, no bullet points)
- Write in plain, conversational prose`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw this.createErrorFromResponse(response.status, errorText);
    }

    if (!response.body) {
      throw new AIProviderError(
        USER_ERROR_MESSAGES.NETWORK_ERROR,
        'NETWORK_ERROR'
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' &&
                  parsed.delta?.type === 'text_delta' &&
                  parsed.delta?.text) {
                yield parsed.delta.text;
              }
            } catch {
              // Skip non-JSON lines (like event: lines)
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async analyzeDocument(
    documentImages: string[],
    documentText: string,
    documentType: 'pdf' | 'image' | 'docx',
    filename: string,
    pageCount: number
  ): Promise<DocumentAnalysis> {
    // Build message content with text and images
    const content: any[] = [
      { type: 'text', text: buildAnalysisUserPrompt(filename, documentType, documentText, pageCount) }
    ];

    // Add images (limit to 10 to avoid token overflow)
    const limitedImages = documentImages.slice(0, 10);
    for (const img of limitedImages) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: img }
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content
        }],
        // Use tool_choice for structured output (Claude's approach)
        tools: [{
          name: 'document_analysis_result',
          description: 'Return the document analysis result',
          input_schema: DOCUMENT_ANALYSIS_JSON_SCHEMA.schema
        }],
        tool_choice: { type: 'tool', name: 'document_analysis_result' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIProviderError(
        this.getErrorMessage(response.status, errorText),
        this.getErrorCode(response.status),
        errorText
      );
    }

    const data = await response.json();

    // Extract tool use result
    const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
    if (!toolUse?.input) {
      throw new AIProviderError(
        USER_ERROR_MESSAGES.PARSE_ERROR,
        'PARSE_ERROR',
        'No tool result in response'
      );
    }

    return toolUse.input as DocumentAnalysis;
  }

  async analyzePastedSlide(
    imageBase64: string,
    verbosity: VerbosityLevel = 'standard'
  ): Promise<Slide> {
    const content: any[] = [
      { type: 'text', text: buildSlideAnalysisPrompt(verbosity) },
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: imageBase64 }
      }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: SLIDE_ANALYSIS_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content
        }],
        tools: [SLIDE_CREATION_TOOL],
        tool_choice: { type: 'tool', name: 'create_slide' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIProviderError(
        this.getErrorMessage(response.status, errorText),
        this.getErrorCode(response.status),
        errorText
      );
    }

    const data = await response.json();

    // Extract tool use result
    const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
    if (!toolUse?.input) {
      throw new AIProviderError(
        USER_ERROR_MESSAGES.PARSE_ERROR,
        'PARSE_ERROR',
        'No tool result in slide analysis response'
      );
    }

    const result = toolUse.input;

    return {
      id: '',
      title: result.title || 'Untitled Slide',
      content: result.content || [],
      speakerNotes: result.speakerNotes || '',
      imagePrompt: result.imagePrompt || '',
      layout: result.layout || 'split',
      theme: result.theme || 'default',
      isGeneratingImage: false
    };
  }

  async analyzeImage(imageBase64: string): Promise<ImageCaptionResult> {
    try {
      const content: any[] = [
        { type: 'text', text: 'Analyze this image and generate a title, caption, and teaching talking points.' },
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 }
        }
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          system: IMAGE_CAPTION_PROMPT,
          messages: [{
            role: 'user',
            content
          }],
          tools: [IMAGE_CAPTION_TOOL],
          tool_choice: { type: 'tool', name: 'create_image_caption' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AIProviderError(
          this.getErrorMessage(response.status, errorText),
          this.getErrorCode(response.status),
          errorText
        );
      }

      const data = await response.json();

      // Extract tool use result
      const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
      if (!toolUse?.input) {
        throw new AIProviderError(
          USER_ERROR_MESSAGES.PARSE_ERROR,
          'PARSE_ERROR',
          'No tool result in image caption response'
        );
      }

      const result = toolUse.input;

      return {
        title: result.title || 'Untitled Image',
        caption: result.caption || '',
        talkingPoints: Array.isArray(result.talkingPoints) ? result.talkingPoints : [],
      };
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      console.error('[ClaudeProvider] analyzeImage error:', error);
      throw new AIProviderError(
        USER_ERROR_MESSAGES.UNKNOWN_ERROR,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  async condenseDeck(
    slides: Slide[],
    lessonPlanText: string,
    lessonPlanImages: string[],
    gradeLevel: string
  ): Promise<CondensationResult> {
    try {
      const context = buildCondensationContext(slides, lessonPlanText);
      const userPrompt = buildCondensationUserPrompt(gradeLevel);

      // Build multimodal content array: text + optional page images
      const contentArray: any[] = [
        { type: 'text', text: userPrompt + '\n\n' + context }
      ];

      // Append up to 5 lesson plan page images for multimodal analysis
      if (lessonPlanImages.length > 0) {
        const limitedImages = lessonPlanImages.slice(0, 5);
        for (const img of limitedImages) {
          contentArray.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: img }
          });
        }
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 8192,
          system: CONDENSATION_SYSTEM_PROMPT,
          tools: [CONDENSATION_TOOL],
          tool_choice: { type: 'tool', name: 'propose_condensation' },
          messages: [{ role: 'user', content: contentArray }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new AIProviderError(
          USER_ERROR_MESSAGES[this.getErrorCode(response.status)],
          this.getErrorCode(response.status),
          errorText
        );
      }

      const data = await response.json();

      // Extract tool_use result
      const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
      const result = toolUse?.input;
      if (!result) {
        throw new AIProviderError(
          USER_ERROR_MESSAGES.PARSE_ERROR,
          'PARSE_ERROR',
          'No tool result in condensation response'
        );
      }

      // Build change map from AI response (only contains edit/remove/merge)
      const changeMap = new Map<number, any>();
      for (const action of (result.actions || [])) {
        if (slides[action.slideIndex]) {
          changeMap.set(action.slideIndex, action);
        }
      }

      // Build full actions array: implicit "keep" for slides not mentioned
      const actions = slides.map((_, i) => {
        const action = changeMap.get(i);
        if (!action) {
          return { slideIndex: i, action: 'keep' as const, reason: '' };
        }
        return {
          slideIndex: action.slideIndex,
          action: action.action || 'keep',
          reason: action.reason || '',
          mergeWithSlideIndices: action.mergeWithSlideIndices || undefined,
        };
      });

      return {
        actions,
        summary: result.summary || 'Condensation analysis complete',
        originalSlideCount: slides.length,
        proposedSlideCount: result.proposedSlideCount ?? slides.length,
        essentialTopicsPreserved: result.essentialTopicsPreserved || []
      };
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      console.error('[ClaudeProvider] condenseDeck error:', error);
      throw new AIProviderError(
        USER_ERROR_MESSAGES.UNKNOWN_ERROR,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  async analyzeGaps(
    slides: Slide[],
    lessonPlanText: string,
    lessonPlanImages: string[],
    gradeLevel: string
  ): Promise<GapAnalysisResult> {
    try {
      const context = buildGapAnalysisContext(slides, lessonPlanText);
      const userPrompt = buildGapAnalysisUserPrompt(gradeLevel);

      // Build multimodal content array: text + optional page images
      const contentArray: any[] = [
        { type: 'text', text: userPrompt + '\n\n' + context }
      ];

      // Append up to 5 lesson plan page images for multimodal analysis
      if (lessonPlanImages.length > 0) {
        const limitedImages = lessonPlanImages.slice(0, 5);
        for (const img of limitedImages) {
          contentArray.push({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: img }
          });
        }
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 8192,
          system: GAP_ANALYSIS_SYSTEM_PROMPT,
          tools: [GAP_ANALYSIS_TOOL],
          tool_choice: { type: 'tool', name: 'analyze_gaps' },
          messages: [{ role: 'user', content: contentArray }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new AIProviderError(
          USER_ERROR_MESSAGES[this.getErrorCode(response.status)],
          this.getErrorCode(response.status),
          errorText
        );
      }

      const data = await response.json();

      // Extract tool_use result
      const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
      const result = toolUse?.input;
      if (!result) {
        throw new AIProviderError(
          USER_ERROR_MESSAGES.PARSE_ERROR,
          'PARSE_ERROR',
          'No tool result in gap analysis response'
        );
      }

      return {
        gaps: result.gaps || [],
        summary: result.summary || 'Gap analysis complete',
        coveragePercentage: result.coveragePercentage ?? 0
      };
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      console.error('[ClaudeProvider] analyzeGaps error:', error);
      throw new AIProviderError(
        USER_ERROR_MESSAGES.UNKNOWN_ERROR,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  async generateSlideFromGap(
    gap: IdentifiedGap,
    slides: Slide[],
    lessonTopic: string,
    verbosity: VerbosityLevel
  ): Promise<Slide> {
    try {
      const prompt = buildGapSlideGenerationPrompt(gap, 'Year 6 (10-11 years old)', verbosity)
        + '\n\nEXISTING DECK CONTEXT:\n' + buildDeckContextForCohesion(slides)
        + '\n\nLESSON TOPIC: ' + lessonTopic;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          tools: [GAP_SLIDE_TOOL],
          tool_choice: { type: 'tool', name: 'generate_gap_slide' },
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new AIProviderError(
          USER_ERROR_MESSAGES[this.getErrorCode(response.status)],
          this.getErrorCode(response.status),
          errorText
        );
      }

      const data = await response.json();

      // Extract tool_use result
      const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
      const result = toolUse?.input;
      if (!result) {
        throw new AIProviderError(
          USER_ERROR_MESSAGES.PARSE_ERROR,
          'PARSE_ERROR',
          'No tool result in gap slide generation response'
        );
      }

      return {
        id: `gap-gen-${Date.now()}`,
        title: result.title || gap.suggestedTitle,
        content: result.content || gap.suggestedContent,
        speakerNotes: result.speakerNotes || '',
        imagePrompt: result.imagePrompt || `Educational illustration: ${gap.topic}`,
        layout: result.layout || 'split',
        source: { type: 'ai-generated' as const }
      };
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      console.error('[ClaudeProvider] generateSlideFromGap error:', error);
      throw new AIProviderError(
        USER_ERROR_MESSAGES.UNKNOWN_ERROR,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  /**
   * Generate a structured poster layout from slide context using structured outputs.
   * Uses Claude's structured outputs beta for guaranteed valid JSON.
   *
   * @param slideContext Formatted context string including target slide and surrounding slides
   * @param subject Optional subject hint for color scheme selection
   */
  async generatePosterLayout(
    slideContext: string,
    subject?: string
  ): Promise<PosterLayout> {
    const userPrompt = `
Transform the [TARGET] slide into an educational poster.

CONTEXT (surrounding slides for narrative understanding):
${slideContext}

PRESENTATION METADATA:
- Subject: ${subject || 'inferred from content'}
- Grade Level: Year 6 (10-11 years old)

POSTER REQUIREMENTS:
- Optimize for classroom wall display (A4 portrait)
- Ensure readability from 10 feet
- Include 5-8 key points
- Add examples or analogies where helpful
- Create an engaging, student-friendly title

Generate the poster layout now.
`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'structured-outputs-2025-11-13',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        output_format: {
          type: 'json_schema',
          json_schema: {
            name: 'poster_layout',
            strict: true,
            schema: POSTER_SCHEMA
          }
        },
        system: POSTER_GENERATION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const code = mapHttpToErrorCode(response.status, errorBody);
      throw new AIProviderError(USER_ERROR_MESSAGES[code], code, errorBody);
    }

    const data = await response.json();

    // Structured outputs guarantee valid JSON in content[0].text
    return JSON.parse(data.content[0].text);
  }

  /**
   * Enhance a document with differentiated versions and answer keys.
   * Generates three versions (simple/standard/detailed) aligned with lesson slides.
   */
  async enhanceDocument(
    documentAnalysis: DocumentAnalysis,
    slideContext: string,
    options: EnhancementOptions,
    signal?: AbortSignal
  ): Promise<EnhancementResult> {
    const userPrompt = buildEnhancementUserPrompt(documentAnalysis, slideContext, options);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 8192,  // Enhancement output is substantial
        system: ENHANCEMENT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        tools: [{
          name: 'enhancement_result',
          description: 'Return the enhancement result with differentiated versions',
          input_schema: ENHANCEMENT_RESULT_JSON_SCHEMA.schema
        }],
        tool_choice: { type: 'tool', name: 'enhancement_result' }
      }),
      signal  // Pass abort signal for cancellation
    });

    if (!response.ok) {
      throw this.createErrorFromResponse(response.status, await response.text());
    }

    const data = await response.json();
    const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
    if (!toolUse?.input) {
      throw new AIProviderError(USER_ERROR_MESSAGES.PARSE_ERROR, 'PARSE_ERROR', 'No tool result');
    }
    return toolUse.input as EnhancementResult;
  }

  /**
   * Create appropriate AIProviderError from HTTP status.
   */
  private createErrorFromResponse(status: number, errorText: string): AIProviderError {
    let code: AIErrorCode = 'UNKNOWN_ERROR';
    let message = USER_ERROR_MESSAGES.UNKNOWN_ERROR;

    if (status === 401 || status === 403) {
      code = 'AUTH_ERROR';
      message = USER_ERROR_MESSAGES.AUTH_ERROR;
    } else if (status === 429) {
      // Check if quota or rate limit
      if (errorText.includes('quota') || errorText.includes('limit')) {
        code = 'QUOTA_EXCEEDED';
        message = USER_ERROR_MESSAGES.QUOTA_EXCEEDED;
      } else {
        code = 'RATE_LIMIT';
        message = USER_ERROR_MESSAGES.RATE_LIMIT;
      }
    } else if (status >= 500) {
      code = 'SERVER_ERROR';
      message = USER_ERROR_MESSAGES.SERVER_ERROR;
    }

    return new AIProviderError(message, code, errorText);
  }

  /**
   * Helper to get user-friendly error message from HTTP status.
   */
  private getErrorMessage(status: number, body: string): string {
    const code = this.getErrorCode(status);
    try {
      const errorBody = JSON.parse(body);
      const apiMessage = errorBody?.error?.message;
      return apiMessage
        ? `${USER_ERROR_MESSAGES[code]} (${apiMessage})`
        : USER_ERROR_MESSAGES[code];
    } catch {
      return USER_ERROR_MESSAGES[code];
    }
  }

  /**
   * Helper to get error code from HTTP status.
   */
  // Transform teleprompter scripts into colleague-deliverable talking-point bullets (Phase 61)
  // Stub: Full implementation in Plan 61-02
  async transformForColleague(
    slides: Slide[],
    deckVerbosity: VerbosityLevel,
    gradeLevel: string
  ): Promise<ColleagueTransformationResult> {
    throw new AIProviderError(
      'Transformation not yet implemented for Claude provider',
      'UNKNOWN_ERROR'
    );
  }

  private getErrorCode(status: number): AIErrorCode {
    if (status === 429) return 'RATE_LIMIT';
    if (status === 401 || status === 403) return 'AUTH_ERROR';
    if (status >= 500 || status === 529) return 'SERVER_ERROR';
    return 'UNKNOWN_ERROR';
  }
}
