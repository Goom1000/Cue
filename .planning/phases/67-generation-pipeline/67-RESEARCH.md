# Phase 67: Generation Pipeline - Research

**Researched:** 2026-02-14
**Domain:** Multi-pass AI orchestration, pipeline state management, graceful degradation, AbortController cancellation
**Confidence:** HIGH

## Summary

Phase 67 transforms the existing single-pass generation flow (`handleGenerate` in `App.tsx`) into a three-pass pipeline: (1) generate slides, (2) analyze coverage against the lesson plan, (3) auto-fill critical and recommended gaps. The codebase already has **every AI capability** needed -- `generateLessonSlides`, `analyzeGaps`, and `generateSlideFromGap` all exist and work on both providers. The task is purely orchestration: sequencing these existing calls, managing intermediate state, providing multi-stage progress feedback, handling cancellation via `AbortController`, and gracefully degrading if Pass 2 or Pass 3 fails.

The current `handleGenerate` function (App.tsx lines 543-630) runs a single `generateLessonSlides` call, optionally followed by per-slide teleprompter regeneration. The existing gap analysis (App.tsx lines 857-1038) is triggered manually via a separate PDF upload in the editor. Phase 67 fuses these two flows into one automatic pipeline triggered by the same "Generate" button. The lesson plan text and images that are already available at generation time (`lessonText`, `pageImages`) are the same data the gap analysis needs -- no additional upload is required.

Key architectural insight: the pipeline service should be a standalone module (not inline in App.tsx) that accepts the AI provider, generation inputs, and callbacks, and returns results. This follows the pattern established by `documentEnhancementService.ts` which orchestrates multi-step AI operations with progress callbacks and AbortSignal support. The existing `handleAddSlideFromGap` logic for position-aware insertion and position adjustment of remaining gaps should be extracted into a utility function reusable by both the pipeline and the manual gap panel.

**Primary recommendation:** Create a `services/generationPipeline.ts` service module that orchestrates the three-pass flow. Extend the `generationProgress` state to support pipeline stages. Keep App.tsx as the caller that wires provider + inputs + callbacks, just like the enhancement flow. Use AbortController for cancellation. On Pass 2/3 failure, return Pass 1 slides with a warning.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/genai` | ^1.30.0 | Gemini structured output for gap analysis | Already in project; powers `analyzeGaps` and `generateSlideFromGap` |
| Claude API (fetch) | anthropic-version 2023-06-01 | Claude structured output for gap analysis | Already in project; direct fetch with CORS header |
| AbortController | Browser API | Pipeline cancellation (PIPE-07) | Native browser API; already used in enhancement flow |
| React 19 | ^19.2.0 | UI state management, progress display | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Toast system (`useToast`) | built-in | Warnings when Pass 2/3 fails (PIPE-04) | Graceful degradation notifications |
| `AIProviderError` + `withRetry` | built-in | Error handling with exponential backoff | Wrapping each pass's AI calls |
| Phase Detection (`phaseDetector.ts`) | built-in | Assign lesson phases to gap-generated slides | Post-processing gap slides same as initial generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate pipeline service | Inline in handleGenerate | Service module is testable, separation follows enhancement pattern, keeps App.tsx from growing further |
| Sequential gap filling (one at a time) | Parallel gap filling (Promise.all) | Sequential is safer (position adjustments depend on prior insertions), parallel risks position corruption with race conditions |
| AbortController per-pass | Single AbortController for whole pipeline | Single controller is simpler and sufficient -- aborting means "stop the entire pipeline, keep what you have" |
| Extending existing `generationProgress` state type | New pipeline-specific state | Extending is simpler -- just widen the phase union type |

**Installation:** No new packages needed. All dependencies already present.

## Architecture Patterns

### Recommended Project Structure
```
services/
  generationPipeline.ts       # (NEW) Three-pass pipeline orchestrator
  prompts/
    gapAnalysisPrompts.ts     # (EXISTS) Gap analysis prompts and schemas
  providers/
    geminiProvider.ts          # (EXISTS) analyzeGaps, generateSlideFromGap
    claudeProvider.ts          # (EXISTS) analyzeGaps, generateSlideFromGap
  aiProvider.ts               # (EXISTS) Types: GapAnalysisResult, IdentifiedGap
utils/
  gapSlideInsertion.ts        # (NEW) Position-aware gap slide insertion logic
App.tsx                        # (MODIFY) Replace handleGenerate with pipeline call
components/
  GapAnalysisPanel.tsx         # (EXISTS) Shows nice-to-have gaps (PIPE-05)
```

### Pattern 1: Pipeline Service Module
**What:** A standalone async function that orchestrates multi-step AI operations with progress callbacks, AbortSignal support, and partial-result preservation.
**When to use:** When chaining multiple AI calls where later steps depend on earlier results.
**Example (following `documentEnhancementService.ts` pattern):**
```typescript
// services/generationPipeline.ts

export type PipelineStage = 'generating' | 'checking-coverage' | 'filling-gaps';

export interface PipelineProgress {
  stage: PipelineStage;
  stageIndex: number;      // 0, 1, or 2
  totalStages: number;     // 3
  detail?: string;         // "Filling gap 2 of 4"
  subProgress?: number;    // 0-100 within current stage
}

export interface PipelineResult {
  slides: Slide[];
  coveragePercentage: number | null;    // null if Pass 2 failed
  remainingGaps: IdentifiedGap[];       // nice-to-have gaps for panel
  warnings: string[];                   // degradation messages
  wasPartial: boolean;                  // true if Pass 2 or 3 failed
}

export async function runGenerationPipeline(
  provider: AIProviderInterface,
  input: GenerationInput,
  lessonPlanText: string,
  lessonPlanImages: string[],
  options: {
    deckVerbosity: VerbosityLevel;
    gradeLevel: string;
    signal?: AbortSignal;
    onProgress?: (progress: PipelineProgress) => void;
  }
): Promise<PipelineResult> {
  const warnings: string[] = [];

  // --- Pass 1: Generate slides ---
  options.onProgress?.({ stage: 'generating', stageIndex: 0, totalStages: 3 });

  const slides = await provider.generateLessonSlides(input);

  // Check cancellation between passes
  if (options.signal?.aborted) {
    return { slides, coveragePercentage: null, remainingGaps: [], warnings: [], wasPartial: true };
  }

  // --- Pass 2: Analyze coverage ---
  options.onProgress?.({ stage: 'checking-coverage', stageIndex: 1, totalStages: 3 });

  let gapResult: GapAnalysisResult;
  try {
    gapResult = await withRetry(() =>
      provider.analyzeGaps(slides, lessonPlanText, lessonPlanImages, options.gradeLevel)
    );
  } catch (err) {
    warnings.push('Coverage analysis failed. You can run gap analysis manually later.');
    return { slides, coveragePercentage: null, remainingGaps: [], warnings, wasPartial: true };
  }

  // ... Pass 3: Fill gaps ...
}
```

### Pattern 2: Position-Aware Gap Insertion
**What:** A pure function that inserts multiple gap slides at their suggested positions in a single pass, adjusting positions as insertions shift indices.
**When to use:** When merging multiple gap slides into an existing deck without corrupting order (PIPE-06).
**Critical insight:** The existing `handleAddSlideFromGap` inserts one at a time and adjusts remaining gap positions. For batch insertion in the pipeline, we need to sort gaps by position (descending) and insert from bottom-to-top so earlier insertions don't shift later positions. Alternatively, sort ascending and track a cumulative offset.
```typescript
// utils/gapSlideInsertion.ts

export function insertGapSlides(
  existingSlides: Slide[],
  gapSlides: Array<{ slide: Slide; suggestedPosition: number }>
): Slide[] {
  // Sort by position ascending
  const sorted = [...gapSlides].sort((a, b) => a.suggestedPosition - b.suggestedPosition);

  const result = [...existingSlides];
  let offset = 0;

  for (const { slide, suggestedPosition } of sorted) {
    const insertIndex = Math.min(suggestedPosition + offset, result.length);
    result.splice(insertIndex, 0, slide);
    offset++;
  }

  return result;
}
```

### Pattern 3: Extending Generation Progress State
**What:** Widen the existing `generationProgress` state type to support pipeline stages alongside the existing teleprompter regeneration progress.
**Current state shape:**
```typescript
// Current (App.tsx line 318)
const [generationProgress, setGenerationProgress] = useState<{
  phase: 'slides' | 'teleprompter';
  current: number;
  total: number;
} | null>(null);
```
**Extended shape:**
```typescript
// Extended for pipeline
const [generationProgress, setGenerationProgress] = useState<{
  phase: 'slides' | 'teleprompter' | 'checking-coverage' | 'filling-gaps';
  current: number;
  total: number;
  stageLabel?: string;  // Human-readable label for UI
} | null>(null);
```

### Pattern 4: AbortController Cancellation
**What:** Create an AbortController before starting the pipeline, pass its signal to the service, and abort on user cancel. Follows the exact pattern from `documentEnhancementService.ts`.
**When to use:** PIPE-07 cancellation requirement.
```typescript
// In handleGenerate:
const controllerRef = useRef<AbortController | null>(null);

// On generate click:
controllerRef.current = new AbortController();
const result = await runGenerationPipeline(provider, input, lessonText, rawImages, {
  signal: controllerRef.current.signal,
  onProgress: (p) => setGenerationProgress(mapPipelineProgress(p)),
  // ...
});

// On cancel click:
controllerRef.current?.abort();
```

### Anti-Patterns to Avoid
- **Modifying provider methods:** Do NOT change `analyzeGaps` or `generateSlideFromGap` signatures. The pipeline orchestrates existing methods; the AI layer stays unchanged.
- **Parallel gap generation:** Do NOT use `Promise.all` for generating gap slides. Sequential generation preserves position integrity and avoids rate limiting.
- **Inlining pipeline logic in App.tsx:** The `handleGenerate` function is already 90 lines. Adding 3-pass logic inline would make it unmaintainable. Extract to a service.
- **Removing manual gap analysis:** The existing manual gap analysis flow (PDF upload in editor, GapAnalysisPanel) must continue to work independently. The pipeline is an enhancement, not a replacement.
- **Generating gap slides before checking abort signal:** Always check `signal.aborted` between passes and between individual gap slide generations.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gap analysis AI call | Custom prompt + parsing | `provider.analyzeGaps()` | Already implemented and tested in both Gemini and Claude providers |
| Gap slide generation | Custom slide creation | `provider.generateSlideFromGap()` | Handles prompt building, schema enforcement, and fallback |
| Error handling + retry | Custom retry logic | `withRetry()` from `aiProvider.ts` | Already handles transient errors, exponential backoff, error classification |
| Position adjustment after insertion | Manual index math | Extract from existing `handleAddSlideFromGap` | Already battle-tested logic for adjusting gap positions after insertion |
| Phase detection on generated slides | Custom phase labeling | `assignPhasesToSlides()` from `phaseDetector.ts` | Already applied post-generation in `generateLessonSlides` |
| Progress UI for loading screen | Custom component | Extend existing PROCESSING_TEXT screen | Already has spinner, progress bar, and stage description |
| Toast notifications | Custom notification system | `addToast()` from `useToast` | Already used throughout the app for success/warning/error messages |

**Key insight:** Phase 67 is an orchestration task, not an AI task. Every AI capability already exists. The value is in sequencing, error handling, and UX feedback.

## Common Pitfalls

### Pitfall 1: Gap Position Corruption on Batch Insertion
**What goes wrong:** Inserting gap slides one at a time without adjusting subsequent positions causes slides to land in wrong spots or overwrite each other.
**Why it happens:** Each insertion shifts all subsequent indices by +1. The existing `handleAddSlideFromGap` handles this for single insertions but the pipeline needs batch insertion.
**How to avoid:** Use the descending-position insertion approach (insert from bottom to top), or track cumulative offset when inserting ascending. Create a pure utility function and unit test it with multiple insertions.
**Warning signs:** Gap slides appearing at wrong positions, duplicate slide IDs, slides at end of deck that should be in the middle.

### Pitfall 2: Lesson Plan Text Not Available at Generation Time
**What goes wrong:** The pipeline needs `lessonText` and `pageImages` for gap analysis, but these might be empty or unavailable if the user uploaded a PPTX in refine mode.
**Why it happens:** Gap analysis requires a lesson plan to compare against. In `refine` mode, there's no lesson plan -- only a presentation.
**How to avoid:** Pipeline should only run the gap analysis passes (2 and 3) when `mode === 'fresh' || mode === 'blend'`. In `refine` mode, return after Pass 1 with no coverage data. This matches the existing `phaseDetection` mode guard.
**Warning signs:** "Cannot analyze gaps" errors, empty gap results in fresh mode, gap analysis running on refine-mode decks.

### Pitfall 3: Rate Limiting During Multi-Pass Pipeline
**What goes wrong:** Pass 1 (generate slides) + optional teleprompter regeneration can consume many API calls. Then Pass 2 (gap analysis) + Pass 3 (multiple gap slide generations) add more. Total could hit rate limits.
**Why it happens:** Gemini and Claude both have per-minute rate limits. The pipeline could make 15+ API calls in quick succession.
**How to avoid:** Use `withRetry` (which already handles 429 with exponential backoff) for Pass 2 and each gap generation in Pass 3. Add a small delay (500ms) between gap slide generations to be polite.
**Warning signs:** 429 errors, multiple retries, pipeline timing out.

### Pitfall 4: AbortSignal Not Checked Between Operations
**What goes wrong:** User clicks cancel but the pipeline continues for several more seconds because abort is only checked at the start of each pass, not between individual gap generations.
**Why it happens:** AbortSignal is a pull mechanism -- you must check `signal.aborted` explicitly.
**How to avoid:** Check `signal.aborted` at the start of each major operation: before Pass 2, before Pass 3, and before each individual gap slide generation.
**Warning signs:** Cancel button doesn't respond promptly, pipeline continues running after cancel.

### Pitfall 5: Loss of Phase Detection on Gap Slides
**What goes wrong:** Gap-generated slides don't get `lessonPhase` labels because phase detection only runs during initial generation.
**Why it happens:** `assignPhasesToSlides` is called inside `generateLessonSlides` but not after gap slides are inserted.
**How to avoid:** After merging gap slides into the deck, re-run `assignPhasesToSlides` on the full deck so gap slides get appropriate phase labels. The function already respects existing `lessonPhase` values (won't overwrite).
**Warning signs:** Gap slides missing phase badges in editor, phase distribution becoming unbalanced.

### Pitfall 6: Stale Gap Positions After Teleprompter Regeneration
**What goes wrong:** If teleprompter regeneration happens between Pass 1 and Pass 2, slide count doesn't change so gap positions stay valid. But if the user has a non-standard verbosity, the teleprompter regeneration loop adds time between passes.
**Why it happens:** The existing verbosity regeneration loop runs per-slide sequentially after initial generation.
**How to avoid:** Run teleprompter regeneration as part of Pass 1 (before gap analysis). Gap positions are based on slide content/titles, not speaker notes, so running gap analysis after teleprompter regen is fine.
**Warning signs:** Unnecessary extra time between stages if teleprompter regen runs separately.

## Code Examples

### Example 1: Pipeline Service Skeleton
```typescript
// services/generationPipeline.ts
import { AIProviderInterface, GapAnalysisResult, IdentifiedGap, withRetry } from './aiProvider';
import { GenerationInput } from './aiProvider';
import { Slide } from '../types';
import { VerbosityLevel } from './geminiService';
import { insertGapSlides } from '../utils/gapSlideInsertion';

export type PipelineStage = 'generating' | 'checking-coverage' | 'filling-gaps';

export interface PipelineProgress {
  stage: PipelineStage;
  stageIndex: number;
  totalStages: number;
  detail?: string;
  subProgress?: number;
}

export interface PipelineResult {
  slides: Slide[];
  coveragePercentage: number | null;
  gapResult: GapAnalysisResult | null;
  remainingGaps: IdentifiedGap[];
  warnings: string[];
  wasPartial: boolean;
}

export async function runGenerationPipeline(
  provider: AIProviderInterface,
  input: GenerationInput,
  options: {
    lessonPlanText: string;
    lessonPlanImages: string[];
    deckVerbosity: VerbosityLevel;
    gradeLevel: string;
    autoRegenerateTeleprompter: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: PipelineProgress) => void;
  }
): Promise<PipelineResult> {
  const warnings: string[] = [];
  const canAnalyzeGaps = input.mode === 'fresh' || input.mode === 'blend';

  // ---- Pass 1: Generate slides ----
  options.onProgress?.({
    stage: 'generating', stageIndex: 0, totalStages: 3
  });

  let slides = await provider.generateLessonSlides(input);

  // Optional: teleprompter regeneration for non-standard verbosity
  if (options.autoRegenerateTeleprompter && options.deckVerbosity !== 'standard') {
    for (let i = 0; i < slides.length; i++) {
      if (options.signal?.aborted) break;
      options.onProgress?.({
        stage: 'generating', stageIndex: 0, totalStages: 3,
        detail: `Refining teleprompter ${i + 1}/${slides.length}`,
        subProgress: Math.round(((i + 1) / slides.length) * 100)
      });
      try {
        const notes = await provider.regenerateTeleprompter(
          slides[i], options.deckVerbosity,
          i > 0 ? slides[i - 1] : undefined,
          i < slides.length - 1 ? slides[i + 1] : undefined
        );
        slides[i] = { ...slides[i], speakerNotes: notes };
      } catch { /* keep original notes on failure */ }
    }
  }

  // Cancellation check
  if (options.signal?.aborted || !canAnalyzeGaps) {
    return {
      slides, coveragePercentage: null, gapResult: null,
      remainingGaps: [], warnings, wasPartial: !canAnalyzeGaps ? false : true
    };
  }

  // ---- Pass 2: Analyze coverage ----
  options.onProgress?.({
    stage: 'checking-coverage', stageIndex: 1, totalStages: 3
  });

  let gapResult: GapAnalysisResult;
  try {
    const rawImages = options.lessonPlanImages.map(img =>
      img.replace(/^data:image\/[a-z]+;base64,/, '')
    );
    gapResult = await withRetry(() =>
      provider.analyzeGaps(slides, options.lessonPlanText, rawImages, options.gradeLevel)
    );
  } catch (err) {
    warnings.push('Coverage analysis encountered an issue. Your slides are ready -- you can run gap analysis manually later.');
    return {
      slides, coveragePercentage: null, gapResult: null,
      remainingGaps: [], warnings, wasPartial: true
    };
  }

  // Separate gaps by severity
  const criticalAndRecommended = gapResult.gaps.filter(
    g => g.severity === 'critical' || g.severity === 'recommended'
  );
  const niceToHave = gapResult.gaps.filter(g => g.severity === 'nice-to-have');

  // If no gaps to fill, return early
  if (criticalAndRecommended.length === 0) {
    return {
      slides, coveragePercentage: gapResult.coveragePercentage,
      gapResult, remainingGaps: niceToHave, warnings, wasPartial: false
    };
  }

  // Cancellation check
  if (options.signal?.aborted) {
    return {
      slides, coveragePercentage: gapResult.coveragePercentage,
      gapResult, remainingGaps: gapResult.gaps, warnings, wasPartial: true
    };
  }

  // ---- Pass 3: Fill gaps ----
  options.onProgress?.({
    stage: 'filling-gaps', stageIndex: 2, totalStages: 3
  });

  const generatedGapSlides: Array<{ slide: Slide; suggestedPosition: number }> = [];
  const failedGaps: IdentifiedGap[] = [];

  for (let i = 0; i < criticalAndRecommended.length; i++) {
    if (options.signal?.aborted) break;

    const gap = criticalAndRecommended[i];
    options.onProgress?.({
      stage: 'filling-gaps', stageIndex: 2, totalStages: 3,
      detail: `Filling gap ${i + 1} of ${criticalAndRecommended.length}`,
      subProgress: Math.round(((i + 1) / criticalAndRecommended.length) * 100)
    });

    try {
      const slide = await provider.generateSlideFromGap(
        gap, slides, slides[0]?.title || 'Lesson', options.deckVerbosity
      );
      generatedGapSlides.push({ slide, suggestedPosition: gap.suggestedPosition });
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      failedGaps.push(gap);
      warnings.push(`Could not auto-fill gap: ${gap.topic}`);
    }
  }

  // Merge gap slides into deck
  const mergedSlides = insertGapSlides(slides, generatedGapSlides);

  // Remaining gaps = nice-to-have + any that failed
  const remainingGaps = [...niceToHave, ...failedGaps];

  return {
    slides: mergedSlides,
    coveragePercentage: gapResult.coveragePercentage,
    gapResult,
    remainingGaps,
    warnings,
    wasPartial: failedGaps.length > 0 || options.signal?.aborted === true
  };
}
```

### Example 2: Gap Slide Insertion Utility
```typescript
// utils/gapSlideInsertion.ts
import { Slide, LessonPhase } from '../types';

/**
 * Insert multiple gap slides at their suggested positions in a single pass.
 * Uses ascending sort with cumulative offset to maintain correct positions.
 *
 * @param existingSlides - Current deck slides
 * @param gapSlides - Array of generated slides with their target positions
 * @returns New array with gap slides inserted at correct positions
 */
export function insertGapSlides(
  existingSlides: Slide[],
  gapSlides: Array<{ slide: Slide; suggestedPosition: number }>
): Slide[] {
  if (gapSlides.length === 0) return [...existingSlides];

  // Sort by suggested position ascending
  const sorted = [...gapSlides].sort(
    (a, b) => a.suggestedPosition - b.suggestedPosition
  );

  const result = [...existingSlides];
  let offset = 0;

  for (const { slide, suggestedPosition } of sorted) {
    const insertIndex = Math.min(suggestedPosition + offset, result.length);
    result.splice(insertIndex, 0, slide);
    offset++;
  }

  return result;
}

/**
 * Adjust remaining gap positions after batch insertion.
 * Used when displaying remaining nice-to-have gaps in the panel.
 */
export function adjustGapPositions(
  gaps: Array<{ suggestedPosition: number; [key: string]: any }>,
  insertedPositions: number[]
): typeof gaps {
  // Sort inserted positions ascending for efficient processing
  const sorted = [...insertedPositions].sort((a, b) => a - b);

  return gaps.map(gap => {
    let adjustment = 0;
    for (const pos of sorted) {
      if (pos <= gap.suggestedPosition + adjustment) {
        adjustment++;
      }
    }
    return { ...gap, suggestedPosition: gap.suggestedPosition + adjustment };
  });
}
```

### Example 3: Extended Progress UI
```typescript
// In App.tsx PROCESSING_TEXT section -- extended for pipeline stages
{appState === AppState.PROCESSING_TEXT && (
  <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center px-6">
    {/* Spinner */}
    <div className="w-20 h-20 relative mb-8">
      <div className="absolute inset-0 border-4 border-indigo-600 dark:border-amber-500 border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
      <div className="absolute inset-4 border-4 border-amber-400 dark:border-indigo-400 border-b-transparent dark:border-b-transparent rounded-full animate-spin [animation-direction:reverse]" />
    </div>

    {/* Stage indicator */}
    <h2 className="text-3xl font-bold text-slate-800 dark:text-white font-fredoka">
      {generationProgress?.phase === 'checking-coverage' ? 'Checking Coverage' :
       generationProgress?.phase === 'filling-gaps' ? 'Filling Gaps' :
       'Deep Learning Architecture'}
    </h2>

    {/* Stage description */}
    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg max-w-md">
      {generationProgress?.stageLabel || 'Generating slides...'}
    </p>

    {/* Pipeline stage dots (Generating -> Checking -> Filling) */}
    <div className="flex items-center gap-3 mt-6">
      {['Generating', 'Checking Coverage', 'Filling Gaps'].map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full transition-colors ${
            (generationProgress?.stageIndex ?? 0) > i ? 'bg-green-500' :
            (generationProgress?.stageIndex ?? 0) === i ? 'bg-indigo-500 dark:bg-amber-500 animate-pulse' :
            'bg-slate-300 dark:bg-slate-600'
          }`} />
          <span className={`text-xs font-medium ${
            (generationProgress?.stageIndex ?? 0) === i
              ? 'text-slate-700 dark:text-slate-200'
              : 'text-slate-400 dark:text-slate-500'
          }`}>{label}</span>
          {i < 2 && <span className="text-slate-300 dark:text-slate-600">--</span>}
        </div>
      ))}
    </div>

    {/* Sub-progress bar */}
    {generationProgress?.subProgress != null && (
      <div className="mt-4 w-64">
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 dark:bg-amber-500 transition-all duration-300"
            style={{ width: `${generationProgress.subProgress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          {generationProgress.detail || `${generationProgress.subProgress}% complete`}
        </p>
      </div>
    )}

    {/* Cancel button */}
    <button
      onClick={handleCancelPipeline}
      className="mt-8 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      Cancel (keep current results)
    </button>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual gap analysis (separate PDF upload after generation) | Automatic gap analysis as part of generation pipeline | Phase 67 | Teacher no longer needs to manually trigger gap check |
| Single-pass generation | Three-pass pipeline (generate, check, fill) | Phase 67 | Near-complete decks with fewer manual interventions |
| No cancellation on generation | AbortController support | Phase 67 | Teachers can stop long-running pipelines |

**Unchanged approaches:**
- AI provider interface stays the same (no new methods)
- Gap analysis prompts and schemas stay the same
- `generateSlideFromGap` stays the same
- Manual gap analysis panel continues to work for nice-to-have gaps

## Open Questions

1. **Should teleprompter regeneration for non-standard verbosity run as part of Pass 1 or as a separate step?**
   - What we know: Currently it runs after `generateLessonSlides` in a per-slide loop. It's mode-independent.
   - What's unclear: Whether it should delay gap analysis (potentially 30-60s for 10+ slides) or run after the pipeline.
   - Recommendation: Run it as part of Pass 1 (before gap analysis). Gap analysis needs to see the final slides. Teleprompter content doesn't affect gap analysis (it compares titles/bullets, not speaker notes), but treating Pass 1 as "get final slides ready" makes the pipeline cleaner.

2. **How many gap slides should the pipeline auto-generate?**
   - What we know: Gap analysis returns up to 10 gaps. Critical + recommended could be 3-7 typically.
   - What's unclear: Whether generating 7 gap slides (7 additional AI calls) is too slow.
   - Recommendation: Auto-fill all critical and recommended gaps (typically 3-5). If there are more than 5 critical+recommended, limit to 5 and put the rest in the manual panel. This keeps the pipeline under ~60 seconds for gap filling.

3. **Should the pipeline show Pass 1 slides immediately and continue gap analysis in the background?**
   - What we know: PIPE-F01 (future requirement) explicitly defers "early preview" to a later version.
   - What's unclear: Whether the full pipeline duration is acceptable (potentially 2-3 minutes).
   - Recommendation: Follow the requirements -- keep it sequential. Show the progress stages clearly. The cancel button (PIPE-07) is the escape valve for impatient users.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:** Direct reading of App.tsx, aiProvider.ts, geminiProvider.ts, claudeProvider.ts, gapAnalysisPrompts.ts, documentEnhancementService.ts
- **REQUIREMENTS.md:** v5.0 requirements with PIPE-01 through PIPE-07
- **Phase 59 research:** Gap analysis architecture patterns and decisions

### Secondary (MEDIUM confidence)
- **Phase 66 research:** Resource processing patterns, supplementary resource persistence
- **AbortController usage:** Verified from existing `enhanceDocument` flow in both providers

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- follows established `documentEnhancementService.ts` pattern exactly
- Pipeline orchestration: HIGH -- all AI methods exist and are tested; this is pure sequencing
- Gap insertion logic: HIGH -- existing `handleAddSlideFromGap` proves the pattern; batch insertion is a straightforward extension
- Pitfalls: HIGH -- identified from direct codebase analysis and understanding of async patterns

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (stable domain; no external dependency changes expected)
