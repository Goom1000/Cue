/**
 * Gap slide insertion utility for the generation pipeline.
 * Pure functions that handle position-aware batch insertion of gap slides
 * into an existing deck, and position adjustment for remaining gaps.
 *
 * No side effects -- all functions return new arrays without mutating inputs.
 *
 * Source: Phase 67 Plan 01
 */

import { Slide } from '../types';
import { IdentifiedGap } from '../services/aiProvider';

/**
 * Insert gap slides into an existing deck at their suggested positions.
 *
 * Gap slides are sorted by suggestedPosition ascending, then inserted
 * sequentially with a cumulative offset to account for earlier insertions
 * shifting subsequent positions.
 *
 * @param existingSlides - Current deck slides (not mutated)
 * @param gapSlides - Gap slides with their suggested insertion positions
 * @returns New array with gap slides inserted at correct positions
 */
export function insertGapSlides(
  existingSlides: Slide[],
  gapSlides: Array<{ slide: Slide; suggestedPosition: number }>
): Slide[] {
  if (gapSlides.length === 0) {
    return [...existingSlides];
  }

  // Sort by suggestedPosition ascending for sequential insertion
  const sorted = [...gapSlides].sort(
    (a, b) => a.suggestedPosition - b.suggestedPosition
  );

  const result = [...existingSlides];
  let cumulativeOffset = 0;

  for (const { slide, suggestedPosition } of sorted) {
    const insertAt = Math.min(
      suggestedPosition + cumulativeOffset,
      result.length
    );
    result.splice(insertAt, 0, slide);
    cumulativeOffset++;
  }

  return result;
}

/**
 * Adjust remaining gap positions after batch insertion.
 *
 * When gap slides are inserted into a deck, the positions of remaining
 * (unfilled) gaps need to shift to account for the new slides.
 * For each remaining gap, count how many insertions occurred at or before
 * its original suggested position and increment accordingly.
 *
 * @param gaps - Remaining gaps whose positions need adjustment (not mutated)
 * @param insertedPositions - Original suggestedPosition values of successfully inserted gap slides
 * @returns New array of gaps with adjusted suggestedPosition values
 */
export function adjustGapPositions(
  gaps: IdentifiedGap[],
  insertedPositions: number[]
): IdentifiedGap[] {
  if (gaps.length === 0 || insertedPositions.length === 0) {
    return gaps.map(g => ({ ...g }));
  }

  // Sort inserted positions ascending for consistent counting
  const sorted = [...insertedPositions].sort((a, b) => a - b);

  return gaps.map(gap => {
    let adjustment = 0;
    for (const pos of sorted) {
      if (pos <= gap.suggestedPosition + adjustment) {
        adjustment++;
      } else {
        break;
      }
    }
    return {
      ...gap,
      suggestedPosition: gap.suggestedPosition + adjustment,
    };
  });
}
