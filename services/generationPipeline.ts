/**
 * Three-pass generation pipeline orchestrator.
 *
 * Sequences the AI generation flow:
 *   Pass 1: Generate slides from lesson plan input
 *   Pass 2: Analyze coverage gaps between deck and lesson plan (fresh/blend only)
 *   Pass 3: Auto-fill critical/recommended gaps (capped at 5)
 *
 * Features:
 * - Progress callbacks for UI stage indicators
 * - AbortSignal cancellation between passes and between individual gap generations
 * - Graceful degradation: Pass 2/3 failures return Pass 1 slides with warnings
 * - Mode gating: refine mode skips gap analysis entirely
 * - Phase detection re-run on merged deck
 *
 * Follows the documentEnhancementService.ts pattern for multi-step AI
 * orchestration with progress callbacks and AbortSignal support.
 *
 * Source: Phase 67 Plan 01
 */

import { Slide } from '../types';
import {
  AIProviderInterface,
  GenerationInput,
  IdentifiedGap,
  GapAnalysisResult,
  VerbosityLevel,
  withRetry,
} from './aiProvider';
import { insertGapSlides, adjustGapPositions } from '../utils/gapSlideInsertion';
import { detectPhasesInText, assignPhasesToSlides } from './phaseDetection/phaseDetector';
import { parseScriptedLessonPlan } from './scriptedParser/scriptedParser';
import { mapBlocksToSlides } from './scriptedParser/scriptedMapper';

// =============================================================================
// Types
// =============================================================================

export type PipelineStage = 'generating' | 'checking-coverage' | 'filling-gaps';

export interface PipelineProgress {
  stage: PipelineStage;
  stageIndex: number;      // 0, 1, or 2
  totalStages: number;     // 3
  detail?: string;         // e.g., "Filling gap 2 of 4"
  subProgress?: number;    // 0-100 within current stage
}

export interface PipelineResult {
  slides: Slide[];
  coveragePercentage: number | null;    // null if Pass 2 failed or mode is refine
  remainingGaps: IdentifiedGap[];       // nice-to-have + failed gaps for GapAnalysisPanel
  warnings: string[];                   // degradation messages for toast display
  wasPartial: boolean;                  // true if Pass 2 or 3 failed or cancelled
}

interface PipelineOptions {
  lessonPlanText: string;
  lessonPlanImages: string[];
  deckVerbosity: VerbosityLevel;
  gradeLevel: string;
  signal?: AbortSignal;
  onProgress?: (progress: PipelineProgress) => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum number of gaps to auto-fill in Pass 3 to keep pipeline duration reasonable */
const MAX_AUTO_FILL_GAPS = 8;

/** Delay between gap generations to avoid rate limiting (ms) */
const GAP_GENERATION_DELAY_MS = 500;

// =============================================================================
// Main Pipeline
// =============================================================================

/**
 * Run the three-pass generation pipeline.
 *
 * Pass 1 failure throws (no slides to fall back to).
 * Pass 2/3 failures degrade gracefully, returning Pass 1 slides with warnings.
 *
 * @param provider - AI provider instance (Gemini or Claude)
 * @param input - Generation input (lesson text, images, mode, verbosity)
 * @param options - Pipeline options (lesson plan text/images, signal, progress callback)
 * @returns PipelineResult with slides, coverage info, remaining gaps, and warnings
 */
export async function runGenerationPipeline(
  provider: AIProviderInterface,
  input: GenerationInput,
  options: PipelineOptions
): Promise<PipelineResult> {
  const {
    lessonPlanText,
    lessonPlanImages,
    deckVerbosity,
    gradeLevel,
    signal,
    onProgress,
  } = options;

  const warnings: string[] = [];

  // =========================================================================
  // Scripted mode: bypass all AI passes, map directly from parsed blocks
  // =========================================================================
  if (input.mode === 'scripted') {
    onProgress?.({
      stage: 'generating',
      stageIndex: 0,
      totalStages: 1,
    });

    const parseResult = parseScriptedLessonPlan(lessonPlanText);
    // Flatten all days' blocks (day selection is Phase 72)
    const allBlocks = parseResult.days.flatMap(day => day.blocks);
    const slides = mapBlocksToSlides(allBlocks);

    return {
      slides,
      coveragePercentage: null,
      remainingGaps: [],
      warnings: parseResult.warnings,
      wasPartial: false,
    };
  }

  // =========================================================================
  // Pass 1: Generate slides
  // =========================================================================
  onProgress?.({
    stage: 'generating',
    stageIndex: 0,
    totalStages: 3,
  });

  // Pass 1 throws on failure -- no slides to fall back to
  let slides = await provider.generateLessonSlides(input, undefined, signal);

  // If non-standard verbosity, regenerate teleprompter scripts per slide
  if (deckVerbosity !== 'standard') {
    for (let i = 0; i < slides.length; i++) {
      // Check cancellation before each verbosity regeneration
      if (signal?.aborted) break;

      const slide = slides[i];
      const prevSlide = i > 0 ? slides[i - 1] : undefined;
      const nextSlide = i < slides.length - 1 ? slides[i + 1] : undefined;

      onProgress?.({
        stage: 'generating',
        stageIndex: 0,
        totalStages: 3,
        detail: `Adjusting verbosity for slide ${i + 1} of ${slides.length}`,
        subProgress: Math.round(((i + 1) / slides.length) * 100),
      });

      try {
        const newNotes = await provider.regenerateTeleprompter(
          slide,
          deckVerbosity,
          prevSlide,
          nextSlide
        );
        slides[i] = { ...slide, speakerNotes: newNotes };
      } catch {
        // Silently keep original speakerNotes on per-slide failure
      }
    }
  }

  // Check cancellation after Pass 1
  if (signal?.aborted) {
    return {
      slides,
      coveragePercentage: null,
      remainingGaps: [],
      warnings,
      wasPartial: true,
    };
  }

  // =========================================================================
  // Mode gate: skip gap analysis for refine mode
  // =========================================================================
  const canAnalyzeGaps = input.mode === 'fresh' || input.mode === 'blend';

  if (!canAnalyzeGaps) {
    return {
      slides,
      coveragePercentage: null,
      remainingGaps: [],
      warnings,
      wasPartial: false,
    };
  }

  // =========================================================================
  // Pass 2: Analyze coverage
  // =========================================================================
  onProgress?.({
    stage: 'checking-coverage',
    stageIndex: 1,
    totalStages: 3,
  });

  let gapResult: GapAnalysisResult;

  try {
    // Strip data URL prefix from images for the API call
    const rawImages = lessonPlanImages.map(img =>
      img.replace(/^data:image\/[a-z]+;base64,/, '')
    );

    gapResult = await withRetry(() =>
      provider.analyzeGaps(slides, lessonPlanText, rawImages, gradeLevel)
    );
  } catch {
    // Pass 2 failure: degrade gracefully
    warnings.push(
      'Coverage analysis encountered an issue. Your slides are ready -- you can run gap analysis manually later.'
    );
    return {
      slides,
      coveragePercentage: null,
      remainingGaps: [],
      warnings,
      wasPartial: true,
    };
  }

  // Separate gaps by severity
  const criticalAndRecommended = gapResult.gaps.filter(
    g => g.severity === 'critical' || g.severity === 'recommended'
  );
  const niceToHave = gapResult.gaps.filter(
    g => g.severity === 'nice-to-have'
  );

  // If no critical/recommended gaps, return early with coverage info
  if (criticalAndRecommended.length === 0) {
    return {
      slides,
      coveragePercentage: gapResult.coveragePercentage,
      remainingGaps: niceToHave,
      warnings,
      wasPartial: false,
    };
  }

  // Check cancellation after Pass 2
  if (signal?.aborted) {
    return {
      slides,
      coveragePercentage: gapResult.coveragePercentage,
      remainingGaps: gapResult.gaps,
      warnings,
      wasPartial: true,
    };
  }

  // =========================================================================
  // Pass 3: Fill gaps
  // =========================================================================
  onProgress?.({
    stage: 'filling-gaps',
    stageIndex: 2,
    totalStages: 3,
  });

  // Cap auto-fill at MAX_AUTO_FILL_GAPS to keep pipeline duration reasonable
  const gapsToFill = criticalAndRecommended.slice(0, MAX_AUTO_FILL_GAPS);
  const overflowGaps = criticalAndRecommended.slice(MAX_AUTO_FILL_GAPS);

  const generatedGapSlides: Array<{ slide: Slide; suggestedPosition: number }> = [];
  const failedGaps: IdentifiedGap[] = [];
  const lessonTopic = slides[0]?.title || 'Lesson';

  for (let i = 0; i < gapsToFill.length; i++) {
    // Check cancellation before each gap generation
    if (signal?.aborted) {
      // Push remaining unfilled gaps to overflow
      const remainingUnfilled = gapsToFill.slice(i);
      overflowGaps.push(...remainingUnfilled);
      break;
    }

    const gap = gapsToFill[i];

    onProgress?.({
      stage: 'filling-gaps',
      stageIndex: 2,
      totalStages: 3,
      detail: `Filling gap ${i + 1} of ${gapsToFill.length}`,
      subProgress: Math.round(((i + 1) / gapsToFill.length) * 100),
    });

    try {
      const slide = await provider.generateSlideFromGap(
        gap,
        slides,
        lessonTopic,
        deckVerbosity
      );
      generatedGapSlides.push({
        slide,
        suggestedPosition: gap.suggestedPosition,
      });
    } catch {
      failedGaps.push(gap);
      warnings.push(`Could not auto-fill gap: ${gap.topic}`);
    }

    // Delay between gap generations to avoid rate limiting
    if (i < gapsToFill.length - 1) {
      await new Promise(r => setTimeout(r, GAP_GENERATION_DELAY_MS));
    }
  }

  // =========================================================================
  // Merge
  // =========================================================================
  const mergedSlides = insertGapSlides(slides, generatedGapSlides);

  // Calculate inserted positions for gap position adjustment
  const insertedPositions = generatedGapSlides.map(g => g.suggestedPosition);

  // Adjust remaining gap positions to account for inserted slides
  const allRemainingGaps = [...niceToHave, ...failedGaps, ...overflowGaps];
  const adjustedRemainingGaps = adjustGapPositions(allRemainingGaps, insertedPositions);

  // =========================================================================
  // Post-merge: re-run phase detection on merged deck
  // =========================================================================
  const phaseResult = detectPhasesInText(lessonPlanText);
  const slidesWithPhases = assignPhasesToSlides(mergedSlides, phaseResult);

  // Determine if pipeline was partial (any gaps failed or were skipped)
  const wasPartial =
    failedGaps.length > 0 ||
    overflowGaps.length > 0 ||
    (signal?.aborted ?? false);

  return {
    slides: slidesWithPhases,
    coveragePercentage: gapResult.coveragePercentage,
    remainingGaps: adjustedRemainingGaps,
    warnings,
    wasPartial,
  };
}
