/**
 * Gap Analysis Prompts & Schemas (Phase 59)
 * System/user prompts and structured output schemas for AI-powered
 * deck-vs-lesson-plan comparison. Used by both Gemini (responseSchema) and
 * Claude (tool_choice) providers.
 */

import { Type } from '@google/genai';
import { Slide } from '../../types';
import { VerbosityLevel } from '../geminiService';
import { IdentifiedGap } from '../aiProvider';
import { buildDeckContextForCohesion } from './cohesionPrompts';

// ---------------------------------------------------------------------------
// 1. System Prompt
// ---------------------------------------------------------------------------

export const GAP_ANALYSIS_SYSTEM_PROMPT = `
You are an expert educational content analyst for Cue, a presentation app for primary school teachers (Year 6, ages 10-11, Australian curriculum).

YOUR TASK:
Compare an existing slide deck against a lesson plan to identify missing topics, concepts, and activities.

ANALYSIS RULES:
1. Focus on TOPIC-LEVEL gaps, not word-level differences
2. A "gap" is a concept, skill, activity, or objective in the lesson plan that has NO corresponding slide
3. If a deck slide partially covers a lesson plan topic, it is NOT a gap (mention partial coverage in the summary instead)
4. Maximum 10 gaps -- prioritize by educational importance
5. If the deck already covers the lesson plan well, return an empty gaps array with high coveragePercentage

SEVERITY CLASSIFICATION:
- "critical": Core learning objective or key concept that the lesson plan explicitly requires. Missing this would leave a major hole in the lesson.
- "recommended": Supporting concept, example, or activity that strengthens the lesson. The lesson still works without it but would be weaker.
- "nice-to-have": Enrichment activity, extension task, or supplementary detail. Useful but not essential.

SUGGESTED POSITION:
- For each gap, suggest where in the EXISTING deck it would fit best (0-indexed)
- Place it after the most related existing slide
- If no good fit, suggest the end of the deck (index = total slides)

SUGGESTED CONTENT:
- Provide a title and 3-5 bullet points for each gap
- Content should match the deck's existing tone and complexity level
- Do NOT generate speaker notes or image prompts in this phase
`.trim();

// ---------------------------------------------------------------------------
// 2. User Prompt Builder
// ---------------------------------------------------------------------------

export function buildGapAnalysisUserPrompt(gradeLevel: string): string {
  return `Compare the following slide deck against the provided lesson plan. Identify topics, concepts, or activities from the lesson plan that are NOT covered by any existing slide.

TARGET AUDIENCE: ${gradeLevel} students

INSTRUCTIONS:
1. Read the lesson plan carefully -- identify all key concepts, learning objectives, and activities
2. Read each slide in the deck -- note what topics are already covered
3. Identify gaps: lesson plan topics with NO corresponding slide coverage
4. Rank each gap by severity (critical / recommended / nice-to-have)
5. Suggest where each gap slide would fit best in the existing deck order
6. Suggest a title and 3-5 bullet points for each missing slide

Return a JSON object with summary, coveragePercentage, and an array of gaps.`;
}

// ---------------------------------------------------------------------------
// 3. Context Builder
// ---------------------------------------------------------------------------

const MAX_LESSON_PLAN_CHARS = 8000;

export function buildGapAnalysisContext(
  slides: Slide[],
  lessonPlanText: string
): string {
  const deckContext = buildDeckContextForCohesion(slides);
  const truncated = lessonPlanText.length > MAX_LESSON_PLAN_CHARS;
  const planText = truncated
    ? lessonPlanText.slice(0, MAX_LESSON_PLAN_CHARS)
    : lessonPlanText;
  const truncationNote = truncated
    ? '\n\n[Lesson plan truncated -- showing first 8000 characters]'
    : '';

  return `=== EXISTING SLIDE DECK ===

${deckContext}

=== LESSON PLAN ===

${planText}${truncationNote}`;
}

// ---------------------------------------------------------------------------
// 4. Gemini Response Schema (uses @google/genai Type)
// ---------------------------------------------------------------------------

export const GAP_ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Overall coverage assessment (1-2 sentences)',
    },
    coveragePercentage: {
      type: Type.NUMBER,
      description: 'Estimated percentage of lesson plan covered (0-100)',
    },
    gaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique gap identifier (e.g., "gap-1")',
          },
          topic: {
            type: Type.STRING,
            description: 'Missing topic name (3-8 words)',
          },
          description: {
            type: Type.STRING,
            description: 'Why this is missing (1-2 sentences)',
          },
          severity: {
            type: Type.STRING,
            enum: ['critical', 'recommended', 'nice-to-have'],
          },
          suggestedTitle: {
            type: Type.STRING,
            description: 'Proposed slide title (max 10 words)',
          },
          suggestedContent: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-5 bullet points',
          },
          suggestedPosition: {
            type: Type.NUMBER,
            description: '0-indexed insertion position',
          },
          relatedLessonPlanExcerpt: {
            type: Type.STRING,
            description: 'Brief quote from lesson plan',
          },
        },
        required: [
          'id',
          'topic',
          'description',
          'severity',
          'suggestedTitle',
          'suggestedContent',
          'suggestedPosition',
          'relatedLessonPlanExcerpt',
        ],
      },
    },
  },
  required: ['summary', 'coveragePercentage', 'gaps'],
};

// ---------------------------------------------------------------------------
// 5. Claude Tool Schema (JSON Schema format for tool_choice)
// ---------------------------------------------------------------------------

export const GAP_ANALYSIS_TOOL = {
  name: 'analyze_gaps',
  description:
    'Compare a slide deck against a lesson plan and identify missing topics',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: 'Overall coverage assessment',
      },
      coveragePercentage: {
        type: 'number',
        description: 'Estimated coverage percentage (0-100)',
      },
      gaps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique gap identifier' },
            topic: { type: 'string', description: 'Missing topic name' },
            description: {
              type: 'string',
              description: 'Why this is missing',
            },
            severity: {
              type: 'string',
              enum: ['critical', 'recommended', 'nice-to-have'],
            },
            suggestedTitle: {
              type: 'string',
              description: 'Proposed slide title',
            },
            suggestedContent: {
              type: 'array',
              items: { type: 'string' },
              description: '3-5 bullet points',
            },
            suggestedPosition: {
              type: 'number',
              description: '0-indexed insertion position',
            },
            relatedLessonPlanExcerpt: {
              type: 'string',
              description: 'Brief quote from lesson plan',
            },
          },
          required: [
            'id',
            'topic',
            'description',
            'severity',
            'suggestedTitle',
            'suggestedContent',
            'suggestedPosition',
            'relatedLessonPlanExcerpt',
          ],
        },
      },
    },
    required: ['summary', 'coveragePercentage', 'gaps'],
  },
};

// ---------------------------------------------------------------------------
// 6. Gap Slide Generation Prompt
// ---------------------------------------------------------------------------

export function buildGapSlideGenerationPrompt(
  gap: IdentifiedGap,
  gradeLevel: string,
  verbosity: VerbosityLevel
): string {
  const verbosityHints: Record<VerbosityLevel, string> = {
    concise:
      'CONCISE: 2-3 short phrases per segment, comma-separated prompts rather than full sentences.',
    standard:
      'STANDARD: 1-2 sentences per segment with examples or analogies.',
    detailed:
      'DETAILED: 3-5 sentences per segment with transitions, interaction prompts, and multiple examples.',
  };

  return `Generate a complete slide for the following gap identified in a lesson plan comparison.

GAP DETAILS:
- Topic: ${gap.topic}
- Description: ${gap.description}
- Suggested Title: ${gap.suggestedTitle}
- Suggested Content: ${gap.suggestedContent.join('; ')}
- Lesson Plan Excerpt: ${gap.relatedLessonPlanExcerpt}

TARGET AUDIENCE: ${gradeLevel} students
VERBOSITY: ${verbosity}
${verbosityHints[verbosity]}

TELEPROMPTER NOTES FORMAT (CRITICAL - FOLLOW EXACTLY):
Speaker notes use a "Progressive Disclosure" system with the \u{1F449} emoji as delimiter between segments.

Segment structure:
- Segment 0 (Intro): Set the scene BEFORE any bullet appears on screen. Give context, a hook, or a brief overview.
- Segment 1: Student just read Bullet 1 aloud. Explain Bullet 1's significance. Do NOT mention Bullet 2.
- Segment 2: Student just read Bullet 2 aloud. Explain Bullet 2's significance. Do NOT mention Bullet 3.
- And so on for each bullet.

Rules:
- Use \u{1F449} (pointing right hand emoji) as the delimiter between segments
- Segment count MUST equal number of bullets + 1
- NEVER preview or introduce upcoming bullets -- only discuss what was JUST revealed
- NEVER repeat the text that is on the slide in the speaker notes
- Each segment must ADD VALUE: provide a concrete example, an analogy, or a "why this matters" explanation
- Maintain a continuous narrative flow from segment to segment

Return a JSON object with:
- title: Slide title (max 10 words)
- content: Array of 3-5 bullet points
- speakerNotes: Teleprompter script with \u{1F449} delimiters (segment count = content.length + 1)
- imagePrompt: A prompt to generate an educational illustration for this slide
- layout: One of 'split', 'full-image', 'center-text' (suggest 'split' unless content is purely visual)`;
}

// ---------------------------------------------------------------------------
// 7. Gemini Slide Generation Schema
// ---------------------------------------------------------------------------

export const GAP_SLIDE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    content: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    speakerNotes: { type: Type.STRING },
    imagePrompt: { type: Type.STRING },
    layout: {
      type: Type.STRING,
      enum: ['split', 'full-image', 'center-text'],
    },
  },
  required: ['title', 'content', 'speakerNotes', 'imagePrompt', 'layout'],
};

// ---------------------------------------------------------------------------
// 8. Claude Slide Generation Tool
// ---------------------------------------------------------------------------

export const GAP_SLIDE_TOOL = {
  name: 'generate_gap_slide',
  description:
    'Generate a complete slide from an identified gap in the lesson plan',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Slide title' },
      content: {
        type: 'array',
        items: { type: 'string' },
        description: '3-5 bullet points',
      },
      speakerNotes: {
        type: 'string',
        description:
          'Teleprompter script with emoji delimiters (segment count = bullet count + 1)',
      },
      imagePrompt: {
        type: 'string',
        description: 'Prompt for educational illustration',
      },
      layout: {
        type: 'string',
        enum: ['split', 'full-image', 'center-text'],
        description: 'Slide layout type',
      },
    },
    required: ['title', 'content', 'speakerNotes', 'imagePrompt', 'layout'],
  },
};
