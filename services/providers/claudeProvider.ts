import { AIProviderInterface, AIProviderError, AIErrorCode, USER_ERROR_MESSAGES, GenerationInput, GenerationMode, GameQuestionRequest } from '../aiProvider';
import { Slide, LessonResource } from '../../types';
import { QuizQuestion, QuestionWithAnswer } from '../geminiService';

// Shared teleprompter rules used across all generation modes
const TELEPROMPTER_RULES = `
STRICT SPEAKER NOTE RULES (TELEPROMPTER LOGIC):
The app uses a "Progressive Disclosure" system.
1. The visual bullet point appears.
2. The Student reads the bullet.
3. The Teacher (Teleprompter) adds insight.

Therefore:
- **NEVER** repeat the text that is on the slide in the speaker notes.
- **NEVER** re-summarize a point that was just made in the previous bullet.
- Each note must **ADD VALUE**: provide a concrete example, an analogy, or a "Why this matters" explanation.
- Ensure a continuous narrative flow. Note 2 must naturally follow Note 1.

FORMATTING:
The speaker notes must use "pointing_right" as a delimiter.
- Segment 0 (Intro): Set the scene before bullet 1 appears.
- Segment 1 (for Bullet 1): Elaborate on Bullet 1.
- Segment 2 (for Bullet 2): Elaborate on Bullet 2 (Do not repeat Segment 1).
- The number of "pointing_right" segments MUST be exactly (Number of Bullets + 1).
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

/**
 * Get the appropriate system prompt based on generation mode.
 */
function getSystemPromptForMode(mode: GenerationMode): string {
  switch (mode) {
    case 'fresh':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform a formal lesson plan into a teaching slideshow.

CRITICAL: You will be provided with text content from the document.
- Preserve the pedagogical structure: 'Hook', 'I Do', 'We Do', 'You Do'.
- **MANDATORY**: You MUST include distinct slides for **'Success Criteria'** and **'Differentiation'** (Support, Extension, Intervention) found in the document.
  - Success Criteria should be a clear checklist.
  - Differentiation should explain how to adapt for different levels (e.g., C Grade, B Grade, A Grade).

${TELEPROMPTER_RULES}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages, 'full-image' for hooks, and 'grid' for Success Criteria/Differentiation.

${JSON_OUTPUT_FORMAT}
`;

    case 'refine':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform an existing presentation into clean, less text-dense Cue-style slides.

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

${TELEPROMPTER_RULES}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages, 'full-image' for hooks.

${JSON_OUTPUT_FORMAT}
`;

    case 'blend':
      return `
You are an elite Primary Education Consultant.
Your goal is to create slides that combine lesson content with an existing presentation.

BLEND MODE RULES:
- Analyze BOTH the lesson plan AND existing presentation provided.
- Determine content overlap between sources.
- If the lesson contains topics NOT in the presentation, add new slides for those topics.
- Standardize ALL output to Cue style (do not try to match original presentation aesthetic).
- When lesson says X but presentation says Y, note the discrepancy in speakerNotes: "[Note: Sources differ on...]"
- Output stands alone - no references to source documents.
- Synthesize both sources into a cohesive teaching narrative for the teleprompter scripts.

${TELEPROMPTER_RULES}

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
        model: 'claude-sonnet-4-20250514',
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
 * ClaudeProvider implements the full AIProviderInterface using Anthropic's Claude API.
 * All text generation methods make real API calls; image methods return undefined
 * since Claude API does not support image generation.
 */
export class ClaudeProvider implements AIProviderInterface {
  constructor(private apiKey: string) {}

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

    const systemPrompt = getSystemPromptForMode(input.mode);

    // Build message content based on mode
    const contentParts: ClaudeContentBlock[] = [];

    // Add text prompt based on mode
    if (input.mode === 'fresh') {
      contentParts.push({
        type: 'text',
        text: `Transform this formal lesson plan into a sequence of teaching slides:\n\n${input.lessonText}`
      });
    } else if (input.mode === 'refine') {
      contentParts.push({
        type: 'text',
        text: `Transform this existing presentation into clean, less text-dense Cue-style slides:\n\n${input.presentationText || ''}`
      });
    } else { // blend
      contentParts.push({
        type: 'text',
        text: `Combine this lesson plan:\n\n${input.lessonText}\n\n---\n\nWith this existing presentation:\n\n${input.presentationText || ''}\n\nCreate enhanced Cue-style slides that incorporate content from both sources.`
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
- Segment 0 (Intro): Set the scene before bullet 1 appears.
- Each subsequent segment elaborates on the corresponding bullet.
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

  async generateGameQuestions(request: GameQuestionRequest): Promise<QuizQuestion[]> {
    // TODO: Implement in Phase 22-03 (Claude game question generation)
    throw new AIProviderError(
      'Game question generation not yet implemented for Claude',
      'UNKNOWN_ERROR'
    );
  }
}
