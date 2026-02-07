/**
 * Deck Serializer (Phase 58, retained for condensation and gap analysis)
 * Serializes slide deck into text context for AI consumption.
 */

import { Slide } from '../../types';

// ---------------------------------------------------------------------------
// Deck Serializer
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
