/**
 * Phase Distribution Utility - Compute lesson phase balance across slides
 *
 * Pure function: takes slides array, returns counts, percentages, and missing phases.
 * Used by the sidebar balance indicator to show teachers which GRR phases are covered.
 */

import { LessonPhase, Slide } from '../types';

/** All GRR lesson phases in pedagogical order */
export const ALL_PHASES = ['hook', 'i-do', 'we-do', 'we-do-together', 'you-do', 'plenary'] as const;

/** Distribution result for a slide deck */
export interface PhaseDistribution {
  /** Number of slides assigned to each phase */
  counts: Record<LessonPhase, number>;
  /** Percentage of assigned slides in each phase (Math.round, 0-100) */
  percentages: Record<LessonPhase, number>;
  /** Total number of slides in the deck */
  total: number;
  /** Phases with zero slides assigned */
  missingPhases: LessonPhase[];
  /** Number of slides with no lessonPhase assigned */
  unassigned: number;
}

/**
 * Compute phase distribution across a slide deck.
 *
 * @param slides - Array of slides (may include slides without lessonPhase)
 * @returns Distribution with counts, percentages, missing phases, and unassigned count
 */
export function computePhaseDistribution(slides: Slide[]): PhaseDistribution {
  // Initialize counts to zero for all phases
  const counts = ALL_PHASES.reduce((acc, phase) => {
    acc[phase] = 0;
    return acc;
  }, {} as Record<LessonPhase, number>);

  let unassigned = 0;

  // Count slides per phase
  for (const slide of slides) {
    if (slide.lessonPhase) {
      counts[slide.lessonPhase]++;
    } else {
      unassigned++;
    }
  }

  const total = slides.length;
  const assigned = total - unassigned;

  // Calculate percentages relative to assigned slides (not total)
  // This way percentages show phase balance among labeled slides
  const percentages = ALL_PHASES.reduce((acc, phase) => {
    acc[phase] = assigned > 0 ? Math.round((counts[phase] / assigned) * 100) : 0;
    return acc;
  }, {} as Record<LessonPhase, number>);

  // Identify phases with zero coverage
  const missingPhases = ALL_PHASES.filter(phase => counts[phase] === 0) as LessonPhase[];

  return { counts, percentages, total, missingPhases, unassigned };
}
