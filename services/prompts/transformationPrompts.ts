/**
 * Transformation Prompts & Schemas (Phase 61)
 * System/user prompts, context builder, verbosity resolver, slide filter,
 * chunking utility, and structured output schemas for AI-powered teleprompter-
 * to-colleague transformation. Used by both Gemini (responseSchema) and
 * Claude (tool_choice) providers.
 */

import { Type } from '@google/genai';
import { Slide } from '../../types';
import { VerbosityLevel } from '../aiProvider';
import { TransformedSlide } from '../aiProvider';

// ---------------------------------------------------------------------------
// Helper Type
// ---------------------------------------------------------------------------

export interface TransformableSlide {
  index: number;
  title: string;
  teleprompterText: string;  // Resolved from verbosity cache
  slideType: string;
  contentBullets: string[];  // Original slide bullets for reference
}

// ---------------------------------------------------------------------------
// 1. System Prompt
// ---------------------------------------------------------------------------

export const TRANSFORMATION_SYSTEM_PROMPT = `
You are transforming a teacher's teleprompter script into expanded talking-point bullets that a DIFFERENT teacher (a colleague) can read aloud to deliver the same lesson to students.

YOUR OUTPUT is what the colleague will read TO STUDENTS -- not notes about teaching.

CRITICAL DISTINCTION:
WRONG (teacher notes): "Explain to the class that fractions represent parts of a whole. Use the pizza analogy."
RIGHT (student delivery): "Today we're going to explore fractions -- what they are and why they matter. Imagine you've got a pizza in front of you, and you need to share it equally with your friends..."

BULLET FORMAT:
- Each bullet is 2-4 sentences of student-facing delivery text
- Bullet count is flexible per slide -- use as many as the content demands (some slides get 3, others get 7)
- Keep bullets flat -- do NOT use sub-bullets or nested lists
- **Bold** key terms that students should remember (e.g., "A **fraction** represents a part of a whole")
- Tone must be conversational and match how a teacher speaks TO students

INTERACTION CUES:
- Convert teaching activities into bracketed hints:
  - "[Discussion point: What might happen if we changed the denominator?]"
  - "[Activity: Work with your partner to find three equivalent fractions]"
- These signal interactive moments without prescribing exactly how to run them

CONTENT RULES:
- Preserve examples and analogies VERBATIM from the original script; rephrase surrounding context for clarity
- Do NOT repeat content across slides -- each slide's bullets should be self-contained but not redundant with adjacent slides
- Do NOT add explicit transition phrases between slides (no "Now let's move on to...")
- For thin-content slides (transitions, brief intros): keep brief with 1-2 bullets that signal intent

SPECIAL SLIDE TYPES:
- Answer-reveal slides: Combine question + answer with [Question] and [Answer] cue markers. First bullet states the question/problem, remaining bullets provide the answer/explanation.
- Work Together slides: Use [Activity: ...] format that makes the activity deliverable by a colleague who hasn't used the app. Convert activity description into actionable steps.
- Class Challenge slides: Make the challenge prompt deliverable with clear activity flow using [Activity: ...] format.
- Pasted-image slides with teleprompter content: Transform normally -- the image provides visual context the colleague will see on the slide.

INPUT FORMAT:
The input text may use emoji delimiters (pointing right hand \u{1F449}) for progressive disclosure segments. Treat the FULL concatenated text as the source material and ignore the delimiters.

ANTI-EXAMPLES (never produce these):
- "The teacher should explain..." -- you ARE the teacher speaking
- "Students need to understand..." -- speak directly to students
- "This slide covers..." -- just deliver the content
- "Discuss with the class..." -- use [Discussion point: ...] instead
`.trim();

// ---------------------------------------------------------------------------
// 2. User Prompt Builder
// ---------------------------------------------------------------------------

export function buildTransformationUserPrompt(gradeLevel: string): string {
  return `Transform the following teleprompter scripts into expanded talking-point bullets for colleague delivery.

TARGET AUDIENCE: ${gradeLevel} students -- adjust vocabulary and complexity accordingly.

OUTPUT FORMAT: JSON object with a "slides" array. Each item has:
- slideIndex (number): 0-indexed position from the input
- originalTitle (string): The slide title
- expandedBullets (string[]): Transformed talking-point bullets (flexible count per slide, 2-4 sentences each)
- slideType (string): The slide type label from the input

Produce bullets that a colleague can read aloud to deliver this lesson naturally. Each bullet should be self-contained enough that the colleague doesn't need to improvise.`;
}

// ---------------------------------------------------------------------------
// 3. Context Builder
// ---------------------------------------------------------------------------

const MAX_CONTEXT_SLIDES = 40;

export function buildTransformationContext(
  slides: TransformableSlide[]
): string {
  const slidesToInclude = slides.slice(0, MAX_CONTEXT_SLIDES);
  const truncated = slides.length > MAX_CONTEXT_SLIDES;

  const serialized = slidesToInclude
    .map((slide) => {
      const bulletsSummary = slide.contentBullets.length > 0
        ? slide.contentBullets.join(' | ')
        : '(no visible bullets)';

      return [
        `--- Slide ${slide.index + 1} [${slide.slideType}] ---`,
        `Title: ${slide.title}`,
        `Visible bullets: ${bulletsSummary}`,
        `Teleprompter script: ${slide.teleprompterText}`,
      ].join('\n');
    })
    .join('\n\n');

  if (truncated) {
    return `${serialized}\n\n[Showing first ${MAX_CONTEXT_SLIDES} of ${slides.length} slides -- remaining slides truncated]`;
  }

  return serialized;
}

// ---------------------------------------------------------------------------
// 4. Verbosity Resolution
// ---------------------------------------------------------------------------

export function resolveTeleprompterText(
  slide: Slide,
  deckVerbosity: VerbosityLevel
): string {
  if (deckVerbosity === 'standard') {
    return slide.speakerNotes || '';
  }
  return slide.verbosityCache?.[deckVerbosity] || slide.speakerNotes || '';
}

// ---------------------------------------------------------------------------
// 5. Slide Filter
// ---------------------------------------------------------------------------

export function filterTransformableSlides(
  slides: Slide[],
  deckVerbosity: VerbosityLevel
): TransformableSlide[] {
  return slides
    .map((slide, index) => {
      const text = resolveTeleprompterText(slide, deckVerbosity);
      if (!text.trim()) return null;
      // Strip emoji delimiters, join segments into continuous text
      const cleanText = text.replace(/\u{1F449}/gu, ' ').replace(/\s+/g, ' ').trim();
      return {
        index,
        title: slide.title,
        teleprompterText: cleanText,
        slideType: slide.originalPastedImage ? 'pasted' : (slide.slideType || 'standard'),
        contentBullets: slide.content,
      };
    })
    .filter((s): s is TransformableSlide => s !== null);
}

// ---------------------------------------------------------------------------
// 6. Chunking Utility
// ---------------------------------------------------------------------------

export function chunkSlides(
  slides: TransformableSlide[],
  maxPerChunk: number = 20
): TransformableSlide[][] {
  const chunks: TransformableSlide[][] = [];
  for (let i = 0; i < slides.length; i += maxPerChunk) {
    chunks.push(slides.slice(i, i + maxPerChunk));
  }
  return chunks;
}

/**
 * Build a brief summary of prior chunk results for context injection in
 * subsequent chunk calls. Includes slide titles and first bullet to maintain
 * tone continuity and avoid content repetition across chunks.
 */
export function buildChunkSummary(priorResults: TransformedSlide[]): string {
  if (priorResults.length === 0) return '';

  const summary = priorResults
    .map((slide) => {
      const firstBullet = slide.expandedBullets[0] || '(no bullets)';
      // Truncate first bullet to 120 chars for brevity
      const preview = firstBullet.length > 120
        ? firstBullet.slice(0, 120) + '...'
        : firstBullet;
      return `- Slide ${slide.slideIndex + 1} "${slide.originalTitle}": ${preview}`;
    })
    .join('\n');

  return `PREVIOUS SLIDES ALREADY TRANSFORMED (maintain same tone, avoid repeating these points):\n${summary}`;
}

// ---------------------------------------------------------------------------
// 7. Gemini Response Schema (uses @google/genai Type)
// ---------------------------------------------------------------------------

export const TRANSFORMATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    slides: {
      type: Type.ARRAY,
      description: 'Array of transformed slides with expanded talking-point bullets',
      items: {
        type: Type.OBJECT,
        properties: {
          slideIndex: {
            type: Type.NUMBER,
            description: '0-indexed position in the original deck',
          },
          originalTitle: {
            type: Type.STRING,
            description: 'Slide title preserved from source',
          },
          expandedBullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Transformed talking-point bullets (2-4 sentences each)',
          },
          slideType: {
            type: Type.STRING,
            description: 'Slide type: standard, elaborate, work-together, class-challenge, or pasted',
          },
        },
        required: ['slideIndex', 'originalTitle', 'expandedBullets', 'slideType'],
      },
    },
  },
  required: ['slides'],
};

// ---------------------------------------------------------------------------
// 8. Claude Tool Schema (JSON Schema format for tool_choice)
// ---------------------------------------------------------------------------

export const TRANSFORMATION_TOOL = {
  name: 'transform_for_colleague',
  description:
    'Transform teleprompter scripts into expanded talking-point bullets for colleague delivery',
  input_schema: {
    type: 'object' as const,
    properties: {
      slides: {
        type: 'array',
        description: 'Array of transformed slides with expanded talking-point bullets',
        items: {
          type: 'object',
          properties: {
            slideIndex: {
              type: 'number',
              description: '0-indexed position in the original deck',
            },
            originalTitle: {
              type: 'string',
              description: 'Slide title preserved from source',
            },
            expandedBullets: {
              type: 'array',
              items: { type: 'string' },
              description: 'Transformed talking-point bullets (2-4 sentences each)',
            },
            slideType: {
              type: 'string',
              description: 'Slide type: standard, elaborate, work-together, class-challenge, or pasted',
            },
          },
          required: ['slideIndex', 'originalTitle', 'expandedBullets', 'slideType'],
        },
      },
    },
    required: ['slides'],
  },
};
