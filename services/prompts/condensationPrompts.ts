/**
 * Deck Condensation Prompts & Schemas (Phase 60)
 * System/user prompts and structured output schemas for AI-powered
 * lesson-plan-aware deck condensation. Used by both Gemini (responseSchema)
 * and Claude (tool_choice) providers.
 */

import { Type } from '@google/genai';
import { Slide } from '../../types';
import { buildDeckContextForCohesion } from './cohesionPrompts';

// ---------------------------------------------------------------------------
// 1. System Prompt
// ---------------------------------------------------------------------------

export const CONDENSATION_SYSTEM_PROMPT = `
You are an educational content analyst for Cue, a slide presentation app for primary teachers.

Compare a slide deck against a lesson plan. Decide which slides to KEEP, REMOVE, or MERGE.

OUTPUT RULES:
- Only include slides that change (remove or merge) in the actions array.
- Slides NOT in the actions array are kept automatically.
- "remove": slide is redundant or off-topic. Provide reason (max 8 words).
- "merge": this slide ABSORBS content from other slides. Provide mergeWithSlideIndices (0-indexed). Each absorbed slide must also appear as "remove".
- Do NOT include any content fields (no titles, bullets, or notes). Only slideIndex, action, reason, and mergeWithSlideIndices.
- NEVER remove [pasted-image] slides.
- Target: 8-12 slides total.
`.trim();

// ---------------------------------------------------------------------------
// 2. User Prompt Builder
// ---------------------------------------------------------------------------

export function buildCondensationUserPrompt(gradeLevel: string): string {
  return `Compare this deck against the lesson plan. Only include slides that need changes (edit/remove/merge) in the actions array. Omit kept slides entirely.

TARGET: ${gradeLevel} students. Keep responses concise.

Return JSON with summary (1 sentence), originalSlideCount, proposedSlideCount, essentialTopicsPreserved (max 5 items), and actions array (only changed slides).`;
}

// ---------------------------------------------------------------------------
// 3. Context Builder
// ---------------------------------------------------------------------------

const MAX_LESSON_PLAN_CHARS = 8000;

export function buildCondensationContext(
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

export const CONDENSATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Brief description of condensation changes (1-2 sentences)',
    },
    originalSlideCount: {
      type: Type.NUMBER,
      description: 'Number of slides before condensation',
    },
    proposedSlideCount: {
      type: Type.NUMBER,
      description: 'Number of slides after condensation',
    },
    essentialTopicsPreserved: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of essential lesson plan topics preserved in the condensed deck',
    },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slideIndex: {
            type: Type.NUMBER,
            description: '0-indexed slide position',
          },
          action: {
            type: Type.STRING,
            enum: ['remove', 'merge'],
          },
          reason: {
            type: Type.STRING,
            description: 'Brief reason (max 8 words)',
          },
          mergeWithSlideIndices: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: '0-indexed source slides to absorb (merge only)',
          },
        },
        required: ['slideIndex', 'action', 'reason'],
      },
    },
  },
  required: ['summary', 'originalSlideCount', 'proposedSlideCount', 'essentialTopicsPreserved', 'actions'],
};

// ---------------------------------------------------------------------------
// 5. Claude Tool Schema (JSON Schema format for tool_choice)
// ---------------------------------------------------------------------------

export const CONDENSATION_TOOL = {
  name: 'propose_condensation',
  description:
    'Propose per-slide actions to condense a deck using a lesson plan as guide',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: 'Brief description of condensation changes',
      },
      originalSlideCount: {
        type: 'number',
        description: 'Number of slides before condensation',
      },
      proposedSlideCount: {
        type: 'number',
        description: 'Number of slides after condensation',
      },
      essentialTopicsPreserved: {
        type: 'array',
        items: { type: 'string' },
        description: 'Essential lesson plan topics preserved',
      },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slideIndex: {
              type: 'number',
              description: '0-indexed slide position',
            },
            action: {
              type: 'string',
              enum: ['remove', 'merge'],
            },
            reason: {
              type: 'string',
              description: 'Brief reason (max 8 words)',
            },
            mergeWithSlideIndices: {
              type: 'array',
              items: { type: 'number' },
              description: '0-indexed source slides to absorb',
            },
          },
          required: ['slideIndex', 'action', 'reason'],
        },
      },
    },
    required: ['summary', 'originalSlideCount', 'proposedSlideCount', 'essentialTopicsPreserved', 'actions'],
  },
};
