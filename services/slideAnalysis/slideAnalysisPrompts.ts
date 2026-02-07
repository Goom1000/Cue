/**
 * Slide Analysis Prompts & Schemas
 * System/user prompts and structured output schemas for AI-powered slide image analysis.
 * Used by both Gemini (responseSchema) and Claude (tool_choice) providers.
 */

import { Type } from '@google/genai';
import { VerbosityLevel } from '../geminiService';

// ---------------------------------------------------------------------------
// 1. System Prompt
// ---------------------------------------------------------------------------

export const SLIDE_ANALYSIS_SYSTEM_PROMPT = `
You are an expert at analyzing presentation slides and transforming them into effective teaching content for Cue, an educational presentation app for Year 6 students (ages 10-11).

YOUR TASK:
Extract text and visual content from a pasted PowerPoint slide image and restructure it into Cue's format.

TITLE RULES:
- Clear, concise title (10 words maximum)
- Capture the core concept of the slide
- Use student-friendly language appropriate for ages 10-11

CONTENT RULES:
- Create 3-5 bullet points with key concepts
- Simplify technical terms for Year 6 level
- Break long sentences into clear, digestible points
- Preserve key vocabulary and important concepts
- Each bullet should convey one distinct idea

LAYOUT SELECTION:
- 'split': Title + bullets with image on right (most common - use for standard content slides)
- 'full-image': When slide is primarily a diagram, chart, or visual with minimal extractable text
- 'center-text': For text-only slides, quotes, key definitions, or single important concepts
- 'two-column': For comparisons, before/after, pros/cons, or contrasting ideas

THEME SELECTION:
- 'default': General purpose, neutral
- 'purple': Creative subjects, art, music, design
- 'blue': Science, technology, factual topics
- 'green': Nature, geography, environment
- 'warm': History, social studies, storytelling

TELEPROMPTER NOTES (CRITICAL - FOLLOW EXACTLY):
Speaker notes use a "Progressive Disclosure" system with the pointer emoji as delimiter between segments.

Segment structure:
- Segment 0 (Intro): Set the scene BEFORE any bullet appears on screen. Give context, a hook, or a brief overview.
- Segment 1: Student just read Bullet 1 aloud. Explain Bullet 1's significance. Do NOT mention Bullet 2.
- Segment 2: Student just read Bullet 2 aloud. Explain Bullet 2's significance. Do NOT mention Bullet 3.
- And so on for each bullet.

Rules:
- Use \u{1F449} (pointing right hand emoji) as the delimiter between segments
- Number of segments = number of bullets + 1
- NEVER preview or introduce upcoming bullets - only discuss what was JUST revealed
- NEVER repeat the text that is on the slide in the speaker notes
- Each segment must ADD VALUE: provide a concrete example, an analogy, or a "why this matters" explanation
- Maintain a continuous narrative flow from segment to segment

IMAGE PROMPT:
- Generate a concise prompt for a supporting educational illustration
- Should complement the slide content visually
- Describe a simple, clear image suitable for 10-11 year olds

SPECIAL CASE - DIAGRAMS/CHARTS:
If the slide is primarily a diagram, chart, or visual with no extractable text:
- Return layout 'full-image'
- Set title to a descriptive name for the visual
- Set content to 1-2 bullets describing what the visual shows
- Use speaker notes to describe the visual in detail and explain its educational significance
- Set imagePrompt to describe the original visual for potential regeneration
`.trim();

// ---------------------------------------------------------------------------
// 2. User Prompt Builder
// ---------------------------------------------------------------------------

export function buildSlideAnalysisPrompt(verbosity: VerbosityLevel): string {
  const verbosityHints: Record<VerbosityLevel, string> = {
    concise: 'Keep speaker notes brief: 2-3 short phrases per segment, comma-separated prompts rather than full sentences.',
    standard: 'Use standard speaker notes depth: 1-2 sentences per segment with examples or analogies.',
    detailed: 'Provide detailed speaker notes: 3-5 sentences per segment with transitions, interaction prompts, and multiple examples.'
  };

  const verbosityHint = verbosityHints[verbosity];

  return `Analyze this pasted slide image and extract: 1) Title text, 2) Main content/bullet points, 3) Any diagrams/charts/visual elements (describe in speaker notes), 4) Appropriate layout for Cue. ${verbosityHint}. Return a structured slide object following the schema.`;
}

// ---------------------------------------------------------------------------
// 3. Gemini Response Schema (uses @google/genai Type)
// ---------------------------------------------------------------------------

export const SLIDE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Clear slide title, max 10 words'
    },
    content: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Array of 3-5 bullet points with key concepts'
    },
    speakerNotes: {
      type: Type.STRING,
      description: 'Teleprompter notes with \u{1F449} delimiters between segments. Number of segments = number of bullets + 1. Segment 0 is intro, each subsequent segment explains the corresponding bullet.'
    },
    imagePrompt: {
      type: Type.STRING,
      description: 'Concise prompt for generating a supporting educational illustration'
    },
    layout: {
      type: Type.STRING,
      enum: ['split', 'full-image', 'center-text', 'two-column'],
      description: 'Best layout for this content'
    },
    theme: {
      type: Type.STRING,
      enum: ['default', 'purple', 'blue', 'green', 'warm'],
      description: 'Color theme based on subject matter'
    }
  },
  required: ['title', 'content', 'speakerNotes', 'imagePrompt', 'layout', 'theme']
};

// ---------------------------------------------------------------------------
// 4. Claude Tool Schema (JSON Schema format for tool_choice)
// ---------------------------------------------------------------------------

export const SLIDE_CREATION_TOOL = {
  name: 'create_slide',
  description: 'Transform pasted slide content into Cue slide format',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Clear slide title, max 10 words'
      },
      content: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of 3-5 bullet points with key concepts'
      },
      speakerNotes: {
        type: 'string',
        description: 'Teleprompter notes with \u{1F449} delimiters between segments. Number of segments = number of bullets + 1. Segment 0 is intro, each subsequent segment explains the corresponding bullet.'
      },
      imagePrompt: {
        type: 'string',
        description: 'Concise prompt for generating a supporting educational illustration'
      },
      layout: {
        type: 'string',
        enum: ['split', 'full-image', 'center-text', 'two-column'],
        description: 'Best layout for this content'
      },
      theme: {
        type: 'string',
        enum: ['default', 'purple', 'blue', 'green', 'warm'],
        description: 'Color theme based on subject matter'
      }
    },
    required: ['title', 'content', 'speakerNotes', 'imagePrompt', 'layout', 'theme']
  }
};

// ---------------------------------------------------------------------------
// 5. Image Caption — Prompts, Schemas & Types (Phase 57)
// ---------------------------------------------------------------------------

/**
 * Result type for image caption analysis.
 * Lighter-weight than full slide analysis — just title, caption, and teaching notes.
 */
export interface ImageCaptionResult {
  title: string;
  caption: string;
  teachingNotes: string;
}

/**
 * System prompt for image captioning.
 * Unlike SLIDE_ANALYSIS_SYSTEM_PROMPT (which restructures PowerPoint slides),
 * this describes any image and generates teaching talking points.
 */
export const IMAGE_CAPTION_PROMPT = `You are an education assistant for Cue, a presentation tool for primary school teachers (Year 6, ages 10-11, Australian curriculum).

Analyze this image and provide:
1. A short, descriptive title (3-7 words) suitable as a slide title
2. A caption describing what the image shows (1-2 sentences)
3. Teaching talking points — what should the teacher say about this image? Include key concepts, vocabulary to highlight, and questions to ask students.

Format the talking points as a natural teleprompter script the teacher can read while presenting. Write in second person ("Tell the students...", "Point out...").`;

/**
 * Gemini responseSchema for image caption structured output.
 * Uses the same Type import from @google/genai as SLIDE_RESPONSE_SCHEMA.
 */
export const IMAGE_CAPTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Short descriptive title for the image (3-7 words)' },
    caption: { type: Type.STRING, description: 'What the image shows (1-2 sentences)' },
    teachingNotes: { type: Type.STRING, description: 'Teleprompter script with teaching talking points, vocabulary, and student questions' },
  },
  required: ['title', 'caption', 'teachingNotes'],
};

/**
 * Claude tool_choice schema for image caption structured output.
 * Same pattern as SLIDE_CREATION_TOOL but with simpler output fields.
 */
export const IMAGE_CAPTION_TOOL = {
  name: 'create_image_caption',
  description: 'Generate a title, caption, and teaching notes for an image',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Short descriptive title for the image (3-7 words)' },
      caption: { type: 'string', description: 'What the image shows (1-2 sentences)' },
      teachingNotes: { type: 'string', description: 'Teleprompter script with teaching talking points, vocabulary, and student questions' },
    },
    required: ['title', 'caption', 'teachingNotes'],
  },
};
