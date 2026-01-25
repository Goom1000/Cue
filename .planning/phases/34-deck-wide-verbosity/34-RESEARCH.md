# Phase 34: Deck-wide Verbosity Toggle - Research

**Researched:** 2026-01-25
**Domain:** React async batch operations, confirmation dialogs, progress indicators, cancellation patterns
**Confidence:** HIGH

## Summary

Phase 34 implements a deck-wide verbosity toggle that replaces the per-slide selector in the teleprompter panel. When the user changes the deck verbosity level, all slides regenerate their teleprompter scripts at the new level. This requires confirmation before proceeding, progress tracking during regeneration, cancellation support with rollback, and error handling with retry capability.

The implementation builds directly on Phase 33's verbosity infrastructure:
1. The existing `VerbosityLevel` type and three-button selector UI can be reused
2. The existing `regenerateTeleprompter` function handles individual slide regeneration
3. The existing `verbosityCache` pattern handles per-slide caching
4. Batch regeneration is a new pattern requiring sequential async operations with state snapshots for rollback

**Primary recommendation:** Add deck-level `deckVerbosityLevel` state to PresentationView, replace the per-slide selector with a deck-wide selector. On level change (if different), show confirmation dialog with slide count. On confirm, snapshot current state, regenerate all slides sequentially with progress counter, cache results, and clear individual caches. Support cancellation via AbortController with full state rollback. Track failed slides for retry.

## Existing Architecture Analysis

### Current Per-Slide Verbosity Selector

**File:** `/components/PresentationView.tsx`
**Lines:** 1491-1532

The existing verbosity selector is per-slide:

```tsx
{/* Verbosity Selector */}
<div className="flex justify-center items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-800/30">
    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-2">Script Style</span>
    {(['concise', 'standard', 'detailed'] as const).map(level => (
        <button
            key={level}
            onClick={() => handleVerbosityChange(level)}
            disabled={isRegenerating || (!isAIAvailable && level !== 'standard')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                verbosityLevel === level
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
            } ${(isRegenerating || (!isAIAvailable && level !== 'standard')) && verbosityLevel !== level ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {level}
        </button>
    ))}
    // ... regenerate button ...
</div>
```

**Key observation:** This selector changes `verbosityLevel` state which applies only to the current slide view. Deck-wide behavior requires different state management.

### Current Verbosity State

**File:** `/components/PresentationView.tsx`
**Lines:** 143-146

```typescript
// Verbosity control for teleprompter scripts
const [verbosityLevel, setVerbosityLevel] = useState<VerbosityLevel>('standard');
const [isRegenerating, setIsRegenerating] = useState(false);
const [regeneratedScript, setRegeneratedScript] = useState<string | null>(null);
```

This state controls per-slide display. For deck-wide, we need:
1. `deckVerbosityLevel` - The current deck-wide setting
2. Replace per-slide `verbosityLevel` with deck-wide state
3. Add regeneration batch state (progress, cancelled, failed slides)

### Current regenerateTeleprompter Function

**File:** `/services/geminiService.ts`
**Lines:** 1098-1167

```typescript
export const regenerateTeleprompter = async (
    apiKey: string,
    slide: Slide,
    verbosity: VerbosityLevel,
    prevSlide?: Slide,
    nextSlide?: Slide
): Promise<string>
```

This function regenerates a single slide's teleprompter script. For batch regeneration, we call this sequentially for all slides, passing appropriate context.

### Current Slide Update Flow

**File:** `/App.tsx`
**Lines:** 381-400

```typescript
const handleUpdateSlide = useCallback((id: string, updates: Partial<Slide>) => {
    setSlides(prev => prev.map(s => {
      if (s.id !== id) return s;

      // Detect if content changed (invalidates verbosity cache)
      const contentChanged = updates.content !== undefined || updates.title !== undefined;

      // Special case: if only updating verbosityCache, preserve it
      const isOnlyCacheUpdate = Object.keys(updates).length === 1 && updates.verbosityCache !== undefined;

      return {
        ...s,
        ...updates,
        // Clear cache if content changed, unless this IS a cache update
        verbosityCache: contentChanged && !isOnlyCacheUpdate
          ? undefined
          : (updates.verbosityCache ?? s.verbosityCache),
      };
    }));
}, []);
```

This passes from App.tsx to PresentationView via `onUpdateSlide` prop. Batch updates can use this same mechanism.

### Props Interface

**File:** `/components/PresentationView.tsx`
**Lines:** 91-101

```typescript
interface PresentationViewProps {
  slides: Slide[];
  onExit: () => void;
  studentNames: string[];
  studentData: StudentWithGrade[];
  initialSlideIndex?: number;
  provider: AIProviderInterface | null;
  onError: (title: string, message: string) => void;
  onRequestAI: (featureName: string) => void;
  onUpdateSlide: (id: string, updates: Partial<Slide>) => void;
}
```

All necessary props already exist. Batch updates use `onUpdateSlide` repeatedly.

## Architecture Patterns

### Pattern 1: Deck-wide State Management

```typescript
// In PresentationView.tsx - replace per-slide verbosityLevel with deck-wide
const [deckVerbosity, setDeckVerbosity] = useState<VerbosityLevel>('standard');

// Batch regeneration state
interface BatchRegenerationState {
  isActive: boolean;
  totalSlides: number;
  completedSlides: number;
  currentSlideIndex: number;
  failedSlides: Set<string>;  // slide IDs that failed after retry
  abortController: AbortController | null;
  snapshot: Slide[] | null;   // pre-regeneration state for rollback
}

const [batchState, setBatchState] = useState<BatchRegenerationState>({
  isActive: false,
  totalSlides: 0,
  completedSlides: 0,
  currentSlideIndex: 0,
  failedSlides: new Set(),
  abortController: null,
  snapshot: null,
});
```

### Pattern 2: Confirmation Dialog

```typescript
// Confirmation dialog state
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
const [pendingVerbosity, setPendingVerbosity] = useState<VerbosityLevel | null>(null);

// Handler for verbosity button click
const handleDeckVerbosityClick = (newLevel: VerbosityLevel) => {
  // Same level = no-op
  if (newLevel === deckVerbosity) return;

  // Show confirmation
  setPendingVerbosity(newLevel);
  setShowConfirmDialog(true);
};

// Confirmation dialog JSX
{showConfirmDialog && pendingVerbosity && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-slate-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-slate-700">
      <h3 className="text-lg font-bold text-white mb-2">
        Change Teleprompter Style
      </h3>
      <p className="text-slate-300 mb-6">
        This will regenerate all {slides.length} slides at {pendingVerbosity} verbosity.
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => { setShowConfirmDialog(false); setPendingVerbosity(null); }}
          className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={() => handleConfirmRegeneration()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:opacity-90"
        >
          Regenerate
        </button>
      </div>
    </div>
  </div>
)}
```

### Pattern 3: Batch Regeneration with Progress

```typescript
const handleConfirmRegeneration = async () => {
  if (!provider || !pendingVerbosity) return;

  setShowConfirmDialog(false);
  const newLevel = pendingVerbosity;
  setPendingVerbosity(null);

  // Create abort controller
  const abortController = new AbortController();

  // Snapshot current state for rollback
  const snapshot = slides.map(s => ({ ...s }));

  // Initialize batch state
  setBatchState({
    isActive: true,
    totalSlides: slides.length,
    completedSlides: 0,
    currentSlideIndex: 0,
    failedSlides: new Set(),
    abortController,
    snapshot,
  });

  // Clear all per-slide verbosity caches
  for (const slide of slides) {
    onUpdateSlide(slide.id, { verbosityCache: undefined });
  }

  // Regenerate each slide sequentially
  for (let i = 0; i < slides.length; i++) {
    // Check for cancellation
    if (abortController.signal.aborted) {
      // Rollback to snapshot
      for (const snappedSlide of snapshot) {
        onUpdateSlide(snappedSlide.id, {
          speakerNotes: snappedSlide.speakerNotes,
          verbosityCache: snappedSlide.verbosityCache,
        });
      }
      setBatchState(prev => ({ ...prev, isActive: false, snapshot: null }));
      return;
    }

    const slide = slides[i];
    const prevSlide = i > 0 ? slides[i - 1] : undefined;
    const nextSlide = i < slides.length - 1 ? slides[i + 1] : undefined;

    setBatchState(prev => ({
      ...prev,
      currentSlideIndex: i,
    }));

    let success = false;
    let retryCount = 0;
    const maxRetries = 1;  // Retry once per CONTEXT.md

    while (!success && retryCount <= maxRetries) {
      try {
        const newScript = await provider.regenerateTeleprompter(
          slide,
          newLevel,
          prevSlide,
          nextSlide
        );

        // Update slide based on verbosity level
        if (newLevel === 'standard') {
          onUpdateSlide(slide.id, {
            speakerNotes: newScript,
            verbosityCache: undefined,
          });
        } else {
          onUpdateSlide(slide.id, {
            verbosityCache: {
              [newLevel]: newScript,
            },
          });
        }

        success = true;
      } catch (error) {
        retryCount++;
        if (retryCount <= maxRetries) {
          await new Promise(r => setTimeout(r, 1000));  // Wait 1s before retry
        }
      }
    }

    // Update progress
    setBatchState(prev => ({
      ...prev,
      completedSlides: prev.completedSlides + 1,
      failedSlides: success ? prev.failedSlides : new Set([...prev.failedSlides, slide.id]),
    }));
  }

  // Complete
  setDeckVerbosity(newLevel);
  const finalFailedCount = batchState.failedSlides.size;

  setBatchState(prev => ({
    ...prev,
    isActive: false,
    snapshot: null,
  }));

  // If slides failed, offer retry option
  if (finalFailedCount > 0) {
    // Show retry dialog or toast
  }
};
```

### Pattern 4: Cancellation with Rollback

```typescript
const handleCancelRegeneration = () => {
  if (batchState.abortController) {
    batchState.abortController.abort();
  }
};

// Progress overlay with cancel button
{batchState.isActive && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-slate-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-slate-700 text-center">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <h3 className="text-lg font-bold text-white mb-2">
        Regenerating Slides
      </h3>
      <p className="text-slate-300 mb-4">
        Regenerating slide {batchState.currentSlideIndex + 1} of {batchState.totalSlides}...
      </p>
      <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all"
          style={{ width: `${(batchState.completedSlides / batchState.totalSlides) * 100}%` }}
        />
      </div>
      <button
        onClick={handleCancelRegeneration}
        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

### Pattern 5: Failed Slides Retry

```typescript
// After batch completes with failures
{batchState.failedSlides.size > 0 && !batchState.isActive && (
  <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 mb-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-amber-300 font-medium">
          {batchState.failedSlides.size} slide(s) failed to regenerate
        </p>
        <p className="text-amber-400/70 text-sm">
          These slides kept their original scripts
        </p>
      </div>
      <button
        onClick={() => handleRetryFailedSlides()}
        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500"
      >
        Retry Failed
      </button>
    </div>
  </div>
)}
```

### Anti-Patterns to Avoid

- **Don't use Promise.all for regeneration:** Sequential is required for context coherence (prev/next slide references)
- **Don't update all slides atomically at end:** Progress requires incremental updates
- **Don't allow selector interaction during regeneration:** Disable buttons to prevent double-trigger
- **Don't lose snapshot on error:** Keep snapshot until rollback complete or batch succeeds

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | Current | State management, useCallback | Already in use |
| TypeScript | Current | Type safety | Already in use |
| AbortController | Native | Cancellation signal | Browser standard |

### Supporting

No additional libraries needed. All patterns use:
- Native `AbortController` for cancellation
- React `useState` for state management
- Existing `provider.regenerateTeleprompter` for AI calls
- Existing `onUpdateSlide` for slide updates

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cancellation | Custom flag-based | `AbortController` | Standard, works with async/await |
| Confirmation dialog | New component | Inline JSX (existing patterns) | Consistency with app |
| Progress tracking | Complex observable | Simple counter state | Sufficient for sequential ops |
| Verbosity type | New definition | `VerbosityLevel` from aiProvider | Already exists |
| Regeneration function | Custom per-slide | `provider.regenerateTeleprompter` | Already tested and working |

## Common Pitfalls

### Pitfall 1: Using Promise.all for Batch Regeneration

**What goes wrong:** All slides regenerate in parallel, context (prev/next) becomes stale
**Why it happens:** Assuming parallel is faster
**How to avoid:** Use sequential `for...of` loop with await
**Warning signs:** Incoherent transitions between slides

### Pitfall 2: Not Preserving Snapshot for Rollback

**What goes wrong:** Cancellation leaves slides in partial state
**Why it happens:** Forgetting to deep-copy slides before mutation
**How to avoid:** Clone slides with `slides.map(s => ({ ...s }))` before starting
**Warning signs:** Cancel button doesn't restore original content

### Pitfall 3: Allowing Double-Trigger

**What goes wrong:** User clicks selector during regeneration, starts second batch
**Why it happens:** Not disabling selector buttons during active regeneration
**How to avoid:** Check `batchState.isActive` and disable buttons
**Warning signs:** Multiple overlays, confused state

### Pitfall 4: Not Clearing Per-Slide Caches

**What goes wrong:** Slides show stale cached content at old verbosity
**Why it happens:** Not clearing `verbosityCache` when deck verbosity changes
**How to avoid:** Clear all caches before regeneration starts
**Warning signs:** Inconsistent script styles across slides

### Pitfall 5: Missing Retry Logic

**What goes wrong:** Transient failures cause permanent missing scripts
**Why it happens:** Single-try approach to API calls
**How to avoid:** Retry once before marking as failed (per CONTEXT.md)
**Warning signs:** Random slides fail on good network

### Pitfall 6: No-op Check Missing

**What goes wrong:** Selecting same verbosity triggers full regeneration
**Why it happens:** Not comparing new vs current level
**How to avoid:** Early return if `newLevel === deckVerbosity`
**Warning signs:** Unnecessary API calls and loading state

## Code Examples

### Deck Verbosity State Setup

```typescript
// In PresentationView.tsx - replace verbosityLevel with deck-wide state
const [deckVerbosity, setDeckVerbosity] = useState<VerbosityLevel>('standard');

// Batch state
const [batchState, setBatchState] = useState<{
  isActive: boolean;
  totalSlides: number;
  completedSlides: number;
  currentSlideIndex: number;
  failedSlides: Set<string>;
  abortController: AbortController | null;
  snapshot: Slide[] | null;
}>({
  isActive: false,
  totalSlides: 0,
  completedSlides: 0,
  currentSlideIndex: 0,
  failedSlides: new Set(),
  abortController: null,
  snapshot: null,
});

// Confirmation dialog state
const [showVerbosityConfirm, setShowVerbosityConfirm] = useState(false);
const [pendingVerbosity, setPendingVerbosity] = useState<VerbosityLevel | null>(null);
```

### Modified Verbosity Selector (Deck-wide)

```tsx
{/* Verbosity Selector - Deck-wide */}
<div className="flex justify-center items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-800/30">
    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mr-2">Deck Style</span>
    {(['concise', 'standard', 'detailed'] as const).map(level => (
        <button
            key={level}
            onClick={() => {
              if (level === deckVerbosity) return;  // No-op for same level
              setPendingVerbosity(level);
              setShowVerbosityConfirm(true);
            }}
            disabled={batchState.isActive || (!isAIAvailable && level !== 'standard')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                deckVerbosity === level
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-700 text-slate-400 hover:text-white hover:bg-slate-600'
            } ${(batchState.isActive || (!isAIAvailable && level !== 'standard')) && deckVerbosity !== level ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {level}
        </button>
    ))}
</div>
```

### Confirmation Dialog

```tsx
{showVerbosityConfirm && pendingVerbosity && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
    <div className="bg-slate-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl border border-slate-700">
      <h3 className="text-lg font-bold text-white mb-2">
        Change Teleprompter Style
      </h3>
      <p className="text-slate-300 mb-6">
        This will regenerate all {slides.length} slides at <span className="font-bold text-indigo-400">{pendingVerbosity}</span> verbosity.
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => { setShowVerbosityConfirm(false); setPendingVerbosity(null); }}
          className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmDeckRegeneration}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors"
        >
          Regenerate
        </button>
      </div>
    </div>
  </div>
)}
```

### Progress Overlay with Cancel

```tsx
{batchState.isActive && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
    <div className="bg-slate-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-slate-700 text-center">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <h3 className="text-lg font-bold text-white mb-2">
        Regenerating Slides
      </h3>
      <p className="text-slate-300 mb-4">
        Regenerating slide {batchState.currentSlideIndex + 1} of {batchState.totalSlides}...
      </p>
      <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(batchState.completedSlides / batchState.totalSlides) * 100}%` }}
        />
      </div>
      <p className="text-slate-500 text-sm mb-4">
        {batchState.completedSlides} of {batchState.totalSlides} complete
      </p>
      <button
        onClick={() => batchState.abortController?.abort()}
        className="px-4 py-2 text-slate-400 hover:text-white transition-colors border border-slate-600 rounded-lg hover:border-slate-500"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

### Main Batch Regeneration Logic

```typescript
const handleConfirmDeckRegeneration = async () => {
  if (!provider || !pendingVerbosity) return;

  const newLevel = pendingVerbosity;
  setShowVerbosityConfirm(false);
  setPendingVerbosity(null);

  const abortController = new AbortController();
  const snapshot = slides.map(s => ({ ...s }));  // Deep-ish copy

  setBatchState({
    isActive: true,
    totalSlides: slides.length,
    completedSlides: 0,
    currentSlideIndex: 0,
    failedSlides: new Set(),
    abortController,
    snapshot,
  });

  // Clear all per-slide caches upfront
  for (const slide of slides) {
    onUpdateSlide(slide.id, { verbosityCache: undefined });
  }

  const failedIds = new Set<string>();

  for (let i = 0; i < slides.length; i++) {
    if (abortController.signal.aborted) {
      // Rollback
      for (const s of snapshot) {
        onUpdateSlide(s.id, {
          speakerNotes: s.speakerNotes,
          verbosityCache: s.verbosityCache,
        });
      }
      setBatchState(prev => ({ ...prev, isActive: false, snapshot: null }));
      return;
    }

    const slide = slides[i];
    setBatchState(prev => ({ ...prev, currentSlideIndex: i }));

    let success = false;
    for (let attempt = 0; attempt < 2 && !success; attempt++) {  // Max 2 attempts (1 retry)
      try {
        const prevSlide = i > 0 ? slides[i - 1] : undefined;
        const nextSlide = i < slides.length - 1 ? slides[i + 1] : undefined;

        const newScript = await provider.regenerateTeleprompter(
          slide,
          newLevel,
          prevSlide,
          nextSlide
        );

        if (newLevel === 'standard') {
          onUpdateSlide(slide.id, {
            speakerNotes: newScript,
            verbosityCache: undefined,
          });
        } else {
          onUpdateSlide(slide.id, {
            verbosityCache: { [newLevel]: newScript },
          });
        }

        success = true;
      } catch (err) {
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1000));  // Wait before retry
        }
      }
    }

    if (!success) {
      failedIds.add(slide.id);
    }

    setBatchState(prev => ({
      ...prev,
      completedSlides: prev.completedSlides + 1,
      failedSlides: failedIds,
    }));
  }

  setDeckVerbosity(newLevel);
  setBatchState(prev => ({
    ...prev,
    isActive: false,
    snapshot: null,
  }));
};
```

### Display Script Based on Deck Verbosity

```typescript
// Update currentScriptSegment to use deck verbosity
const currentScriptSegment = useMemo(() => {
    // For standard, use speakerNotes directly
    // For concise/detailed, use verbosityCache if available, else show placeholder
    const slide = slides[currentIndex];
    let rawScript: string;

    if (deckVerbosity === 'standard') {
      rawScript = slide.speakerNotes || "";
    } else {
      rawScript = slide.verbosityCache?.[deckVerbosity] || slide.speakerNotes || "";
    }

    // ... rest of parsing logic unchanged ...
}, [currentIndex, slides, deckVerbosity, /* ... other deps */]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-slide verbosity selection | Deck-wide verbosity toggle | Phase 34 (v3.4) | Consistent style across presentation |
| No batch regeneration | Full deck regeneration with progress | Phase 34 (v3.4) | All slides at same verbosity |
| No cancellation | AbortController with rollback | Phase 34 (v3.4) | User control over long operations |

**Deprecated/outdated:**
- Per-slide verbosity selector removed from teleprompter panel (replaced by deck-wide)
- Individual `verbosityLevel` state replaced by `deckVerbosity`

## Integration Points

### Files to Modify

1. **`/components/PresentationView.tsx`**
   - Replace `verbosityLevel` state with `deckVerbosity`
   - Add `batchState` for batch regeneration tracking
   - Add confirmation dialog state and JSX
   - Add progress overlay JSX
   - Add failed slides retry UI
   - Modify selector to be deck-wide with confirmation
   - Update `currentScriptSegment` to use deck verbosity
   - Remove per-slide verbosity change handler
   - Add batch regeneration handler

### Files NOT to Modify

- `/types.ts` - No type changes needed
- `/services/geminiService.ts` - Existing `regenerateTeleprompter` is sufficient
- `/services/aiProvider.ts` - Interface unchanged
- `/App.tsx` - `onUpdateSlide` already supports needed updates
- `/services/loadService.ts` - File format unchanged (verbosityCache still per-slide)
- `/services/saveService.ts` - Save format unchanged

### Requirement Mapping

| Requirement | Implementation |
|-------------|----------------|
| DECK-01 | Replace per-slide selector with deck-wide selector |
| DECK-02 | Show confirmation dialog with slide count before regeneration |
| DECK-03 | Sequential regeneration of all slides using `regenerateTeleprompter` |
| DECK-04 | Clear all `verbosityCache` fields before regeneration starts |
| DECK-05 | Progress overlay with "Regenerating slide X of Y" counter |

## Open Questions

None. All requirements are clear per CONTEXT.md:

1. **Selector behavior:** Deck-wide, replaces per-slide (DECK-01)
2. **Confirmation:** Shows slide count, neutral tone (DECK-02)
3. **Regeneration:** Sequential for context coherence (DECK-03)
4. **Cache clearing:** All caches cleared on deck change (DECK-04)
5. **Progress:** Per-slide counter with cancel support (DECK-05)
6. **Cancellation:** Full rollback to pre-regeneration state
7. **Error handling:** Retry once, then skip and track failures

## Sources

### Primary (HIGH confidence)
- `/components/PresentationView.tsx` - Direct code analysis of existing verbosity UI and state
- `/services/geminiService.ts` - Direct code analysis of `regenerateTeleprompter` function
- `/.planning/phases/34-deck-wide-verbosity/34-CONTEXT.md` - User decisions and requirements
- `/.planning/phases/33-upfront-verbosity-selection/33-RESEARCH.md` - Verbosity patterns established
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) - Cancellation API
- [AppSignal: Managing Async Operations with AbortController](https://blog.appsignal.com/2025/02/12/managing-asynchronous-operations-in-nodejs-with-abortcontroller.html) - Batch patterns

### Secondary (MEDIUM confidence)
- [Medium: Building Confirmation Dialog System](https://medium.com/@hrupanjan/building-a-flexible-confirmation-dialog-system-in-react-or-next-js-with-typescript-1e57965b523b) - Dialog patterns
- [React Aria: Destructive Dialog](https://react-spectrum.adobe.com/react-aria/examples/destructive-dialog.html) - Confirmation dialog accessibility

## Metadata

**Confidence breakdown:**
- Existing verbosity patterns: HIGH - Direct code analysis, v3.1/v3.3 established
- Batch regeneration: HIGH - Standard async/await patterns with existing function
- Cancellation/rollback: HIGH - AbortController is browser standard
- Progress UI: HIGH - Simple counter state pattern
- Error handling: HIGH - Retry pattern matches existing codebase

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (stable patterns, builds on v3.3)
