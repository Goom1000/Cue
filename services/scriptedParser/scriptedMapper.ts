/**
 * Slide mapper for scripted lesson plans.
 * Pure-function converter from ScriptedBlock[] (Phase 69 parser output)
 * to Cue Slide[] objects with correct field mapping, segment count
 * invariant enforcement, and slide boundary grouping.
 *
 * Follows the sequential accumulator pattern (mirrors the parser's
 * line-by-line state machine): walk blocks, accumulate onto current
 * slide, flush on boundary triggers.
 *
 * No AI, no side effects, no network calls -- pure function.
 * Never throws -- always returns a valid Slide[].
 *
 * Source: Phase 70 Plan 01, v6.0 REQUIREMENTS.md (MAP-01 through MAP-05)
 */

import { ScriptedBlock, SectionLabel } from './types';
import { Slide, LessonPhase } from '../../types';

// =============================================================================
// Constants
// =============================================================================

/** Pointing right emoji -- teleprompter splits on this in PresentationView.tsx:1265 */
const SEGMENT_DELIMITER = '\u{1F449}';

/** Map parser SectionLabel to Cue LessonPhase (MAP-04) */
const SECTION_TO_PHASE: Record<SectionLabel, LessonPhase> = {
  'Hook': 'hook',
  'I Do': 'i-do',
  'We Do': 'we-do',
  'You Do': 'you-do',
  'Plenary': 'plenary',
};

// =============================================================================
// Internal Types
// =============================================================================

interface PartialSlide {
  title: string;
  contentBullets: string[];
  /**
   * Positional Say segments: segmentGroups[i] holds the Say texts that appear
   * BEFORE contentBullets[i] (or after the last bullet for the trailing segment).
   *
   * segmentGroups[0] = Say blocks before any content bullet (intro)
   * segmentGroups[1] = Say blocks before contentBullets[0]
   * ...
   * segmentGroups[N] = Say blocks after last content bullet (trailing)
   *
   * Length is always contentBullets.length + 1 after building.
   */
  segmentGroups: string[][];
  hasQuestion: boolean;
  lessonPhase: LessonPhase | undefined;
  isWorkTogether: boolean;
}

// =============================================================================
// Core Function
// =============================================================================

/**
 * Convert ScriptedBlock[] into Slide[] with correct field mapping,
 * segment count invariant enforcement, and slide boundary grouping.
 *
 * @param blocks - Typed blocks from parseScriptedLessonPlan()
 * @returns Slide[] ready for presentation
 */
export function mapBlocksToSlides(blocks: ScriptedBlock[]): Slide[] {
  const slides: Slide[] = [];
  let currentSlide: PartialSlide = createEmptyPartialSlide();
  let currentPhase: LessonPhase | undefined = undefined;
  let currentSectionTitle: string | null = null;
  /** Track how many slides have been created in the current section (for cont. titling) */
  let sectionSlideCount = 0;

  function flush(): void {
    const flushed = flushSlide(currentSlide, slides.length, currentSectionTitle, sectionSlideCount);
    if (flushed) {
      slides.push(flushed);
      sectionSlideCount++;
    }
    currentSlide = createEmptyPartialSlide();
    currentSlide.lessonPhase = currentPhase;
    if (currentSectionTitle) {
      currentSlide.title = currentSectionTitle;
    }
  }

  /** Append a Say text to the current positional segment group */
  function appendSay(text: string): void {
    // The current segment group index = number of content bullets so far
    // segmentGroups[0] = before any bullet, [1] = before bullet 0, etc.
    const groupIndex = currentSlide.contentBullets.length;
    // Ensure the segmentGroups array is large enough
    while (currentSlide.segmentGroups.length <= groupIndex) {
      currentSlide.segmentGroups.push([]);
    }
    currentSlide.segmentGroups[groupIndex].push(text);
  }

  /** Advance segment position after adding a content bullet */
  function advanceSegmentPosition(): void {
    const nextIndex = currentSlide.contentBullets.length;
    while (currentSlide.segmentGroups.length <= nextIndex) {
      currentSlide.segmentGroups.push([]);
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    switch (block.type) {
      case 'section-heading': {
        // Section headings always create a new slide boundary (MAP-03)
        flush();
        const label = block.content as SectionLabel;
        currentSectionTitle = block.content;
        currentPhase = SECTION_TO_PHASE[label];
        sectionSlideCount = 0;
        // Set up the new partial slide with the section info
        currentSlide.title = block.content;
        currentSlide.lessonPhase = currentPhase;
        break;
      }

      case 'say': {
        // Say: blocks accumulate into the current positional segment (MAP-01)
        // Implicit say blocks treated identically to explicit ones
        appendSay(block.content);
        break;
      }

      case 'write-on-board': {
        // Write on board: becomes a plain-text content[] bullet (MAP-01)
        currentSlide.contentBullets.push(block.content);
        advanceSegmentPosition();
        break;
      }

      case 'ask': {
        // Ask: becomes a content[] bullet with hasQuestionFlag (MAP-01)
        currentSlide.contentBullets.push(block.content);
        advanceSegmentPosition();
        currentSlide.hasQuestion = true;

        // Ask: triggers flush if there are more blocks after this one (MAP-03)
        // The question stays on the CURRENT slide before flush
        const hasMoreBlocks = i < blocks.length - 1;
        if (hasMoreBlocks) {
          flush();
        }
        break;
      }

      case 'activity': {
        if (isSubstantialActivity(block.content)) {
          // Substantial activity: flush current, build work-together slide, flush again (MAP-05)
          flush();
          const instructions = block.content.split('\n').filter(line => line.trim() !== '');
          currentSlide.contentBullets = instructions;
          // Full activity text goes into speakerNotes as the intro segment
          currentSlide.segmentGroups = [[block.content]];
          currentSlide.isWorkTogether = true;
          if (!currentSlide.title && currentSectionTitle) {
            currentSlide.title = currentSectionTitle;
          }
          if (!currentSlide.title) {
            currentSlide.title = instructions[0]?.substring(0, 60) || 'Activity';
          }
          flush();
        } else {
          // Short single-line activity: absorbed as content bullet (MAP-05)
          currentSlide.contentBullets.push(block.content);
          advanceSegmentPosition();
        }
        break;
      }
    }
  }

  // Flush remaining slide
  flush();

  return slides;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/** Create a fresh empty PartialSlide */
function createEmptyPartialSlide(): PartialSlide {
  return {
    title: '',
    contentBullets: [],
    segmentGroups: [[]],
    hasQuestion: false,
    lessonPhase: undefined,
    isWorkTogether: false,
  };
}

/**
 * Flush a partial slide into a full Slide object.
 * Returns null if the slide is empty (no content AND no say segments).
 * This prevents empty slides from consecutive section headings (Pitfall 5).
 */
function flushSlide(
  partial: PartialSlide,
  index: number,
  currentSectionTitle: string | null,
  sectionSlideCount: number,
): Slide | null {
  // Check if slide has any Say content in any segment group
  const hasSayContent = partial.segmentGroups.some(group => group.length > 0);

  // Skip empty slides (no content, no say segments)
  if (partial.contentBullets.length === 0 && !hasSayContent && !partial.isWorkTogether) {
    return null;
  }

  // Determine title
  let title = partial.title;
  if (!title && currentSectionTitle) {
    // Continuation slide in same section
    title = sectionSlideCount > 0 ? `${currentSectionTitle} (cont.)` : currentSectionTitle;
  }
  if (!title && partial.contentBullets.length > 0) {
    // No section context, derive from first bullet
    const firstBullet = partial.contentBullets[0];
    title = firstBullet.length > 60 ? firstBullet.substring(0, 57) + '...' : firstBullet;
  }
  if (!title) {
    title = 'Untitled';
  }

  const speakerNotes = buildSpeakerNotes(partial.segmentGroups, partial.contentBullets.length);

  const slide: Slide = {
    id: `scripted-${Date.now()}-${index}`,
    title,
    content: partial.contentBullets,
    speakerNotes,
    imagePrompt: '',
    layout: partial.isWorkTogether ? 'work-together' : 'split',
    hasQuestionFlag: partial.hasQuestion || undefined,
    lessonPhase: partial.lessonPhase,
    slideType: partial.isWorkTogether ? 'work-together' : undefined,
  };

  return slide;
}

/**
 * Build speakerNotes string from positional Say segment groups, aligned to content bullet count.
 *
 * Enforces the segment count invariant:
 * result.split(SEGMENT_DELIMITER).length === contentCount + 1
 *
 * The "say this, then show that" pattern uses positional tracking:
 * - segmentGroups[0] = Say blocks before any content bullet (intro)
 * - segmentGroups[i+1] = Say blocks after content[i] (before content[i+1] or trailing)
 *
 * Within each group, multiple Say blocks merge with \n\n paragraph breaks.
 *
 * Source: TELEPROMPTER_RULES (geminiService.ts:36)
 */
function buildSpeakerNotes(segmentGroups: string[][], contentCount: number): string {
  const requiredCount = contentCount + 1;

  // Build exactly requiredCount slots from the positional groups
  const slots: string[] = Array(requiredCount).fill('');

  for (let i = 0; i < requiredCount; i++) {
    const group = segmentGroups[i];
    if (group && group.length > 0) {
      // Multiple Say blocks in same position merge with paragraph breaks
      slots[i] = group.join('\n\n');
    }
  }

  const result = slots.join(SEGMENT_DELIMITER);

  // Post-assertion: verify the invariant holds
  const actualSegments = result.split(SEGMENT_DELIMITER).length;
  if (actualSegments !== requiredCount) {
    // This should never happen, but defensive programming
    throw new Error(
      `Segment count invariant violated: expected ${requiredCount}, got ${actualSegments}`
    );
  }

  return result;
}

/**
 * Determine if an Activity: block is substantial enough for its own work-together slide.
 *
 * Heuristic: multi-line activities (containing \n) are substantial.
 * Single-line activities without line breaks are absorbed as content bullets.
 *
 * Source: CONTEXT.md "Claude's Discretion" item
 */
function isSubstantialActivity(content: string): boolean {
  return content.includes('\n');
}
