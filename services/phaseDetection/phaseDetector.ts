/**
 * Phase detection module for identifying lesson phases in text.
 * Pure functions that accept text input and return typed detection results.
 *
 * Detection strategy:
 * - detectPhasesInText: Scans text for GRR phase boundaries using regex patterns.
 *   Structural patterns (headings, bullets) = high confidence.
 *   Content patterns (body text) = medium confidence.
 *   Deduplicates overlapping detections.
 *
 * - assignPhasesToSlides: Maps detected phases to slide positions.
 *   When explicit phases detected: proportional position mapping.
 *   When no explicit phases and 5+ slides: positional heuristics.
 *   When no explicit phases and <5 slides: no assignment.
 *   Never overwrites existing lessonPhase. Never mutates input.
 *
 * Follows the same pure-function, deterministic pattern as
 * contentPreservation/detector.ts. No side effects, no AI calls.
 *
 * Source: Phase 65 Plan 01, v5.0 REQUIREMENTS.md (PHASE-01 through PHASE-07)
 */

import { LessonPhase, Slide } from '../../types';
import { PHASE_PATTERNS } from './phasePatterns';

// =============================================================================
// Types
// =============================================================================

/**
 * A single detected phase boundary in text.
 */
export interface DetectedPhase {
  phase: LessonPhase;
  startPosition: number;    // Character offset in text
  endPosition: number;      // End of the matched keyword
  matchedKeyword: string;   // The actual text that matched
  confidence: 'high' | 'medium';
}

/**
 * Result of phase detection on lesson plan text.
 */
export interface PhaseDetectionResult {
  phases: DetectedPhase[];
  hasExplicitPhases: boolean;  // True if any structural pattern matched
}

// =============================================================================
// Phase Detection
// =============================================================================

/**
 * Detect lesson phases in text by scanning for GRR phase boundary markers.
 *
 * Iterates PHASE_PATTERNS in order (we-do-together before we-do).
 * Structural patterns (line-start anchored) produce high confidence matches.
 * Content patterns (body text) produce medium confidence matches.
 * Deduplicates overlapping detections keeping the first match (higher priority
 * phases checked first due to array ordering).
 *
 * @param text - Raw lesson plan text
 * @returns PhaseDetectionResult with detected phases sorted by position
 */
export function detectPhasesInText(text: string): PhaseDetectionResult {
  if (!text || text.trim().length === 0) {
    return { phases: [], hasExplicitPhases: false };
  }

  const detectedPhases: DetectedPhase[] = [];
  let hasExplicitPhases = false;

  for (const patternDef of PHASE_PATTERNS) {
    // Check structural patterns first (high confidence)
    for (const regex of patternDef.structuralPatterns) {
      // Create a fresh regex for each scan to reset lastIndex
      const freshRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');

      let match: RegExpExecArray | null;
      while ((match = freshRegex.exec(text)) !== null) {
        const matchedText = match[0].trim();
        const startPos = match.index;
        const endPos = match.index + match[0].length;

        // Check for overlap with already-detected phases at this position
        if (!hasOverlap(detectedPhases, startPos, endPos)) {
          detectedPhases.push({
            phase: patternDef.phase,
            startPosition: startPos,
            endPosition: endPos,
            matchedKeyword: matchedText,
            confidence: 'high',
          });
          hasExplicitPhases = true;
        }
      }
    }

    // Check content patterns (medium confidence)
    // Skip content patterns if this phase was already detected structurally.
    // Content patterns are supplementary -- they add phase detections when
    // no structural heading was found, not duplicate existing ones.
    const alreadyDetectedStructurally = detectedPhases.some(
      d => d.phase === patternDef.phase && d.confidence === 'high'
    );
    if (!alreadyDetectedStructurally) {
      for (const regex of patternDef.contentPatterns) {
        const freshRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');

        let match: RegExpExecArray | null;
        while ((match = freshRegex.exec(text)) !== null) {
          const matchedText = match[0].trim();
          const startPos = match.index;
          const endPos = match.index + match[0].length;

          // Check for overlap with already-detected phases at this position
          if (!hasOverlap(detectedPhases, startPos, endPos)) {
            detectedPhases.push({
              phase: patternDef.phase,
              startPosition: startPos,
              endPosition: endPos,
              matchedKeyword: matchedText,
              confidence: 'medium',
            });
          }
        }
      }
    }
  }

  // Sort by position in text
  detectedPhases.sort((a, b) => a.startPosition - b.startPosition);

  return { phases: detectedPhases, hasExplicitPhases };
}

// =============================================================================
// Slide Assignment
// =============================================================================

/**
 * Assign lesson phases to slides based on detection results or positional heuristics.
 *
 * Three strategies:
 * 1. Explicit phases detected (hasExplicitPhases=true): Map detected phase
 *    boundaries to slide indices proportionally based on text position.
 * 2. No explicit phases, 5+ slides: Apply positional heuristics
 *    (first=hook, second=i-do, middle=we-do/we-do-together/you-do, last=plenary).
 * 3. No explicit phases, <5 slides: Return slides unchanged.
 *
 * Never overwrites existing lessonPhase values.
 * Returns NEW slide objects (spread operator), never mutates input.
 *
 * @param slides - Array of slides to assign phases to
 * @param detectedPhases - Result from detectPhasesInText
 * @returns New array of slides with lessonPhase assigned where appropriate
 */
export function assignPhasesToSlides(
  slides: Slide[],
  detectedPhases: PhaseDetectionResult
): Slide[] {
  if (slides.length === 0) {
    return [];
  }

  if (detectedPhases.hasExplicitPhases && detectedPhases.phases.length > 0) {
    return assignFromExplicitPhases(slides, detectedPhases.phases);
  }

  if (!detectedPhases.hasExplicitPhases && slides.length >= 5) {
    return assignFromPositionalHeuristics(slides);
  }

  // <5 slides and no explicit phases: return unchanged (new objects)
  return slides.map(slide => ({ ...slide }));
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Check if a character range overlaps with any existing detection.
 */
function hasOverlap(existing: DetectedPhase[], start: number, end: number): boolean {
  return existing.some(d =>
    start < d.endPosition && end > d.startPosition
  );
}

/**
 * Assign phases from explicit detected boundaries using proportional mapping.
 * Each slide gets the phase whose boundary it falls within, based on the
 * proportion of text position to slide count.
 */
function assignFromExplicitPhases(
  slides: Slide[],
  detectedPhases: DetectedPhase[]
): Slide[] {
  // Sort phases by position
  const sortedPhases = [...detectedPhases]
    .filter(p => p.confidence === 'high' || p.confidence === 'medium')
    .sort((a, b) => a.startPosition - b.startPosition);

  if (sortedPhases.length === 0) {
    return slides.map(slide => ({ ...slide }));
  }

  // Find the total text range (from first phase start to approximate end)
  const textStart = sortedPhases[0].startPosition;
  const textEnd = sortedPhases[sortedPhases.length - 1].endPosition;
  const textRange = Math.max(1, textEnd - textStart);

  return slides.map((slide, index) => {
    // Don't overwrite existing phases
    if (slide.lessonPhase) {
      return { ...slide };
    }

    // Map slide index to text position proportionally
    const slidePosition = textStart + (index / Math.max(1, slides.length - 1)) * textRange;

    // Find the phase whose boundary this slide falls within
    // Walk backwards through sorted phases to find the latest phase boundary
    // that starts before or at this slide's proportional position
    let assignedPhase: LessonPhase | undefined;
    for (let i = sortedPhases.length - 1; i >= 0; i--) {
      if (sortedPhases[i].startPosition <= slidePosition) {
        assignedPhase = sortedPhases[i].phase;
        break;
      }
    }

    // If no phase found (slide is before first phase), use first phase
    if (!assignedPhase && sortedPhases.length > 0) {
      assignedPhase = sortedPhases[0].phase;
    }

    return { ...slide, lessonPhase: assignedPhase };
  });
}

/**
 * Assign phases using positional heuristics (for decks with 5+ slides
 * and no explicit phase boundaries detected).
 *
 * Layout:
 * - First slide: hook
 * - Second slide: i-do
 * - Middle slides: distribute we-do, we-do-together, you-do proportionally
 * - Last slide: plenary
 */
function assignFromPositionalHeuristics(slides: Slide[]): Slide[] {
  const middlePhases: LessonPhase[] = ['we-do', 'we-do-together', 'you-do'];
  const totalSlides = slides.length;

  // Indices: 0 = hook, 1 = i-do, 2..n-2 = middle, n-1 = plenary
  const middleStart = 2;
  const middleEnd = totalSlides - 2; // inclusive
  const middleCount = middleEnd - middleStart + 1;

  return slides.map((slide, index) => {
    // Don't overwrite existing phases
    if (slide.lessonPhase) {
      return { ...slide };
    }

    let phase: LessonPhase;

    if (index === 0) {
      phase = 'hook';
    } else if (index === 1) {
      phase = 'i-do';
    } else if (index === totalSlides - 1) {
      phase = 'plenary';
    } else {
      // Middle slides: distribute we-do, we-do-together, you-do
      const middleIndex = index - middleStart;
      const phaseIndex = Math.min(
        Math.floor((middleIndex / middleCount) * middlePhases.length),
        middlePhases.length - 1
      );
      phase = middlePhases[phaseIndex];
    }

    return { ...slide, lessonPhase: phase };
  });
}
