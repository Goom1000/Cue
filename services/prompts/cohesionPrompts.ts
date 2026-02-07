/**
 * Deck Cohesion Prompts & Schemas (Phase 58)
 * System/user prompts and structured output schemas for AI-powered deck-wide
 * text harmonization. Used by both Gemini (responseSchema) and Claude (tool_choice)
 * providers.
 */

import { Type } from '@google/genai';
import { Slide } from '../../types';
import { VerbosityLevel } from '../geminiService';

// ---------------------------------------------------------------------------
// 1. System Prompt
// ---------------------------------------------------------------------------

export const COHESION_SYSTEM_PROMPT = `
You are an expert educational content editor for Cue, a presentation app for primary school teachers (Year 6, ages 10-11, Australian curriculum).

YOUR TASK:
Analyze an entire slide deck and propose changes to make it cohesive:
1. TONE: Ensure consistent language register across all slides (student-friendly, age-appropriate)
2. FLOW: Ensure logical progression -- each slide should build on the previous one
3. TERMINOLOGY: Standardize key vocabulary (if "fraction" is used in slide 2 but "fractional part" in slide 5, unify)
4. SPEAKER NOTES: Harmonize teleprompter scripts so the teacher's voice is consistent

RULES:
- Only propose changes for slides that NEED them. If a slide already fits, skip it.
- Preserve the educational content -- do NOT remove key concepts
- Maintain each slide's structure (same number of bullets)
- For slides marked as [pasted-image], ONLY modify speakerNotes (the content is hidden behind a full-screen image)
- Do NOT change layout, theme, or trigger image regeneration

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

{VERBOSITY_RULES}
`.trim();

// ---------------------------------------------------------------------------
// 2. User Prompt Builder
// ---------------------------------------------------------------------------

export function buildCohesionUserPrompt(
  verbosity: VerbosityLevel,
  gradeLevel: string
): string {
  const verbosityHints: Record<VerbosityLevel, string> = {
    concise:
      'Keep speaker notes brief: 2-3 short phrases per segment, comma-separated prompts rather than full sentences.',
    standard:
      'Use 1-2 sentences per segment with examples or analogies.',
    detailed:
      'Provide 3-5 sentences per segment with transitions, interaction prompts, and multiple examples.',
  };

  const verbosityRules = verbosityHints[verbosity];

  return `Analyze the following deck and propose changes to make it cohesive in tone and flow. The target audience is ${gradeLevel} students.

VERBOSITY: ${verbosity}
${verbosityRules}

IMPORTANT:
- Only propose changes for slides that need them.
- Maintain the same number of bullets per slide.
- For [pasted-image] slides, only change speakerNotes.
- Ensure teleprompter segment count = bullet count + 1 for every slide you change.

Return a JSON object with summary, toneDescription, and an array of changes.`;
}

// ---------------------------------------------------------------------------
// 3. Deck Serializer
// ---------------------------------------------------------------------------

const MAX_COHESION_SLIDES = 20;
const MAX_SPEAKER_NOTES_CHARS = 200;

export function buildDeckContextForCohesion(slides: Slide[]): string {
  const slidesToInclude = slides.slice(0, MAX_COHESION_SLIDES);
  const truncated = slides.length > MAX_COHESION_SLIDES;

  const serialized = slidesToInclude
    .map((slide, i) => {
      // Determine source label, marking pasted-image slides
      let sourceLabel: string;
      if (slide.originalPastedImage) {
        sourceLabel = 'pasted-image';
      } else if (slide.source?.type) {
        sourceLabel = slide.source.type;
      } else {
        sourceLabel = 'ai-generated';
      }

      const notesPreview =
        (slide.speakerNotes || '').length > MAX_SPEAKER_NOTES_CHARS
          ? slide.speakerNotes.slice(0, MAX_SPEAKER_NOTES_CHARS) + '...'
          : slide.speakerNotes || '';

      return [
        `--- Slide ${i + 1} [${sourceLabel}] ---`,
        `Title: ${slide.title}`,
        `Content: ${slide.content.join(' | ')}`,
        `Speaker Notes (first ${MAX_SPEAKER_NOTES_CHARS} chars): ${notesPreview}`,
        `Layout: ${slide.layout || 'split'}`,
        `Bullet count: ${slide.content.length}`,
      ].join('\n');
    })
    .join('\n\n');

  if (truncated) {
    return `${serialized}\n\n[Showing first ${MAX_COHESION_SLIDES} of ${slides.length} slides]`;
  }

  return serialized;
}

// ---------------------------------------------------------------------------
// 4. Gemini Response Schema (uses @google/genai Type)
// ---------------------------------------------------------------------------

export const COHESION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        'Brief description of what was harmonized across the deck',
    },
    toneDescription: {
      type: Type.STRING,
      description:
        'The unified tone applied (e.g., "warm and encouraging, suitable for Year 6")',
    },
    changes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slideIndex: {
            type: Type.NUMBER,
            description: '0-indexed slide position',
          },
          proposedTitle: {
            type: Type.STRING,
            description: 'New title (omit if unchanged)',
          },
          proposedContent: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              'New bullet points (omit if unchanged, MUST have same count as original)',
          },
          proposedSpeakerNotes: {
            type: Type.STRING,
            description:
              'New speaker notes with \u{1F449} delimiters (omit if unchanged)',
          },
          reason: {
            type: Type.STRING,
            description: 'Why this slide needs changes',
          },
        },
        required: ['slideIndex', 'reason'],
      },
    },
  },
  required: ['summary', 'toneDescription', 'changes'],
};

// ---------------------------------------------------------------------------
// 5. Claude Tool Schema (JSON Schema format for tool_choice)
// ---------------------------------------------------------------------------

export const COHESION_TOOL = {
  name: 'propose_cohesion_changes',
  description:
    'Propose changes to make a slide deck cohesive in tone and flow',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: 'Brief description of harmonization',
      },
      toneDescription: {
        type: 'string',
        description: 'The unified tone applied',
      },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slideIndex: {
              type: 'number',
              description: '0-indexed slide position',
            },
            proposedTitle: {
              type: 'string',
              description: 'New title (omit if unchanged)',
            },
            proposedContent: {
              type: 'array',
              items: { type: 'string' },
              description:
                'New bullet points (omit if unchanged, MUST have same count as original)',
            },
            proposedSpeakerNotes: {
              type: 'string',
              description:
                'New speaker notes with emoji delimiters (omit if unchanged)',
            },
            reason: {
              type: 'string',
              description: 'Why this slide needs changes',
            },
          },
          required: ['slideIndex', 'reason'],
        },
      },
    },
    required: ['summary', 'toneDescription', 'changes'],
  },
};
