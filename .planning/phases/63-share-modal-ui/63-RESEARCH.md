# Phase 63: Share Modal UI - Research

**Researched:** 2026-02-08
**Domain:** React modal UI, async AI orchestration, file download triggering, state machine UX
**Confidence:** HIGH

## Summary

Phase 63 creates the `ShareModal` component that orchestrates the entire "share with colleague" workflow: the teacher clicks a button, the modal opens, AI transforms their teleprompter scripts into expanded talking-point bullets (using Phase 61's `transformForColleague` service), the teacher previews the transformed slides, selects an export format (PPTX or PDF), and downloads the file. This is the user-facing integration layer that ties together all prior phases (61: AI transformation, 62: PPTX export).

The codebase has well-established patterns for every aspect of this feature: purpose-specific modals (`ExportModal.tsx`, `CondensationPreview.tsx`, `ClassBankSaveModal.tsx`), AI-orchestrated modal workflows (`ExportModal` AI Poster mode with progress tracking), file download via `pptx.writeFile()` and `URL.createObjectURL()`, and toast notifications via the existing `useToast` hook. The architecture document (`ARCHITECTURE-share-with-colleague.md`) already prescribed a separate `ShareModal.tsx` component (not bolted onto `ExportModal`), passing `provider` as a prop from App.tsx, and keeping transformed data ephemeral in modal-local state.

The primary technical challenge is progress tracking: the current `transformForColleague` method on `AIProviderInterface` does not accept a progress callback, but it processes slides in chunks (20 slides per chunk). To display "Transforming slides X of Y...", the method signature needs an optional `onProgress` callback parameter added to the interface and both provider implementations. For most decks (under 20 slides), there is only one chunk, so progress will show as a simple spinner with total slide count. For larger decks, per-chunk progress updates will drive the "X of Y" display. A secondary challenge is that PDF export (Phase 64) is not yet implemented -- the modal must handle the PDF format option gracefully (either disabled with a "coming soon" indicator, or deferred entirely until Phase 64 is complete).

**Primary recommendation:** Create `components/ShareModal.tsx` as a self-contained modal with a 4-phase state machine (idle -> transforming -> preview -> exporting). Auto-trigger transformation on mount. Add an optional `onProgress` callback to `transformForColleague` in both providers. Wire the modal into App.tsx with a "Share with colleague" button in the editor toolbar next to the existing "Export PPTX" button.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | Component framework, state management | App framework; all modals use React functional components with hooks |
| TypeScript | 5.x | Type safety | All source files are `.tsx`; types in `types.ts` |
| Tailwind CSS | Existing | Styling | All components use Tailwind utility classes with dark mode support |
| `AIProviderInterface.transformForColleague()` | Phase 61 | AI transformation of slides | Already implemented in both `ClaudeProvider` and `GeminiProvider` |
| `exportScriptPptx()` | Phase 62 | PPTX file generation | Already implemented in `pptxService.ts`, takes `slides`, `transformationResult`, `title` |
| `useToast` hook | Existing | Toast notifications | `components/Toast.tsx` exports `useToast`, `ToastContainer` with `success`, `error`, `warning`, `info` variants |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `SlideContentRenderer` | Existing | Slide preview thumbnails | Preview grid in the modal (feed it adapted slide data with expanded bullets) |
| `filterTransformableSlides` | Phase 61 | Pre-count transformable slides | Calculate total slide count for progress display before starting transformation |
| `chunkSlides` | Phase 61 | Chunk size reference | Imported from `transformationPrompts.ts` to understand progress granularity |
| PptxGenJS | 3.12.0 (CDN) | PPTX generation | Used internally by `exportScriptPptx` -- no direct use in modal |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `ShareModal.tsx` | Adding mode to `ExportModal.tsx` | ExportModal serves Working Wall (PDF posters). Share serves colleagues (PPTX/PDF). Different audience, format, workflow. Combining creates confusing 3-mode modal. Separate is cleaner. |
| Auto-trigger transform on mount | Manual "Transform" button | User intent is clear from clicking "Share". Extra click is friction. ExportModal's AI Poster mode also auto-triggers after mode selection. |
| `provider` prop from App.tsx | `getApiKey()` from localStorage inside modal | Provider is already instantiated in App.tsx. Passing it down follows ResourceHub pattern and avoids duplicating localStorage access. |

**Installation:**
```bash
# No new packages needed. All dependencies already present.
```

## Architecture Patterns

### Recommended Project Structure
```
components/
  ShareModal.tsx          # NEW: Modal UI with transform, preview, export workflow
services/
  pptxService.ts          # EXISTING: exportScriptPptx() from Phase 62
  aiProvider.ts           # MODIFY: add onProgress callback to transformForColleague signature
  providers/
    claudeProvider.ts     # MODIFY: pass onProgress through chunk loop
    geminiProvider.ts     # MODIFY: pass onProgress through chunk loop
App.tsx                   # MODIFY: add "Share" button, showShareModal state, render ShareModal
```

### Pattern 1: Modal State Machine
**What:** The ShareModal follows a 4-phase state machine that drives all UI rendering:

```
idle -> transforming -> preview -> exporting
  |         |              |           |
  |         v              |           v
  |     (error) ---------> |       (error)
  |                        |           |
  +---- (user closes) ----+---- (download complete -> close)
```

**When to use:** This is the standard pattern for modals with async operations (see ExportModal AI Poster mode).
**Example:**
```typescript
// Source: Pattern derived from ExportModal.tsx (lines 56-67, 103-133)
type ShareModalPhase = 'transforming' | 'preview' | 'exporting' | 'error';

interface ShareModalState {
  phase: ShareModalPhase;
  transformResult: ColleagueTransformationResult | null;
  progress: { current: number; total: number } | null;
  errorMessage: string | null;
}
```

### Pattern 2: Auto-Trigger on Mount
**What:** Start the AI transformation immediately when the modal opens, without requiring user action.
**When to use:** When user intent is unambiguous (clicking "Share" means "transform my deck").
**Example:**
```typescript
// Source: Pattern from ExportModal.tsx AI Poster auto-trigger
useEffect(() => {
  startTransformation();
}, []); // Run once on mount
```

### Pattern 3: Existing Modal Chrome Pattern
**What:** All modals follow the same visual structure: fixed overlay with dark backdrop, centered card, rounded corners, header with icon + title + close button, scrollable body, footer with action buttons.
**When to use:** Every modal in the app.
**Reference files:** `ExportModal.tsx` (lines 351-627), `ClassBankSaveModal.tsx`, `CondensationPreview.tsx`, `RecoveryModal.tsx`.
**Key CSS classes:**
```
Overlay: "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
Card:    "bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
Header:  Icon (12x12 rounded-2xl bg) + title (text-xl font-bold font-fredoka) + close button
Footer:  Primary action button (indigo-600 dark:amber-500) + Cancel button
```

### Pattern 4: Provider Prop from App.tsx
**What:** The modal receives the `AIProviderInterface` instance as a prop, not reading settings/API key directly.
**When to use:** All components that need AI access. Avoids duplicating localStorage reads.
**Example:**
```typescript
// Source: App.tsx line 277-280, pattern from ResourceHub
interface ShareModalProps {
  slides: Slide[];
  lessonTitle: string;
  deckVerbosity: VerbosityLevel;
  gradeLevel: string;
  provider: AIProviderInterface;
  onClose: () => void;
  addToast: (message: string, duration?: number, type?: 'info' | 'success' | 'error' | 'warning') => void;
}
```

### Anti-Patterns to Avoid
- **Mutating original slides:** Never modify `slides[]` from App.tsx state. Keep all transformed data in modal-local state. The transformation is ephemeral.
- **Bolting onto ExportModal:** ExportModal is for Working Wall (classroom posters). Share is for colleagues (different audience, format, workflow). Separate modals.
- **Per-slide AI calls:** `transformForColleague` already handles batching internally. Do not call it per-slide.
- **Blocking close during preview:** Allow the user to close the modal at any point during preview. Only prevent close during the PPTX generation/download phase (like ExportModal does during PDF generation).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI transformation | Custom API calls in modal | `provider.transformForColleague(slides, deckVerbosity, gradeLevel)` | Already handles chunking, context coherence, both providers, error wrapping |
| PPTX generation | Direct PptxGenJS calls | `exportScriptPptx(slides, transformResult, title)` from `pptxService.ts` | Phase 62 already built the layout with 16pt bullets, thumbnails, title positioning |
| Toast notifications | Custom error displays | `addToast(message, duration, variant)` | Existing toast system with success/error/warning/info variants and auto-dismiss |
| File download | Custom download logic | `pptx.writeFile()` (PPTX) or `URL.createObjectURL()` + `<a>` click (PDF) | Proven download patterns already in pptxService.ts and exportService.ts |
| Slide preview rendering | Custom thumbnail renderer | `SlideContentRenderer` from `SlideRenderers.tsx` | Already handles all 8+ layout types with images, just pass adapted data |
| Progress tracking | Polling or intervals | `onProgress` callback in chunk loop of `transformForColleague` | Direct, synchronous progress updates per chunk |

**Key insight:** This phase is purely UI orchestration and integration. Every functional building block already exists (Phase 61 service, Phase 62 export, toast system, modal patterns, slide renderers). The new code is the ShareModal component itself plus minor wiring in App.tsx and the `onProgress` callback addition.

## Common Pitfalls

### Pitfall 1: Progress Lies (Fake Progress)
**What goes wrong:** Showing "Transforming slide 3 of 12..." when in reality the API call processes all 12 slides in one batch and you have no sub-slide progress.
**Why it happens:** `transformForColleague` processes slides in chunks of 20. For a 12-slide deck, there is exactly one chunk and one API call. You cannot show per-slide progress -- only per-chunk progress.
**How to avoid:** Show honest progress: for single-chunk decks (under 20 slides), show "Transforming 12 slides..." with a spinner (no "X of Y" counter). For multi-chunk decks, show "Processing batch X of Y..." per chunk. Alternatively, add an onProgress callback that fires per-chunk to show "Transforming slides 1-20 of 35..." style messages.
**Warning signs:** The "X of Y" counter increments all at once or jumps from 0 to final value.

### Pitfall 2: Missing Provider Guard
**What goes wrong:** User clicks "Share" but has no API key configured, triggering an unhandled error in the AI transformation call.
**Why it happens:** The "Share" button may be visible even when `provider` is null (no API key). The ExportModal AI Poster mode checks for API key explicitly before calling AI.
**How to avoid:** Either: (a) disable the "Share" button when `provider` is null (like other AI buttons), or (b) check for provider in the modal and show an error state with guidance to configure API key in Settings.
**Warning signs:** Cryptic error toast instead of helpful "configure API key" message.

### Pitfall 3: Empty Deck Edge Case
**What goes wrong:** User clicks Share on a deck where all slides lack teleprompter content (speaker notes). The transformation returns `{ slides: [], skippedCount: N }` and the preview shows nothing.
**Why it happens:** `filterTransformableSlides` filters out slides with no text. A deck of only pasted-image slides with no AI-generated notes would produce zero transformable slides.
**How to avoid:** After transformation completes, check if `transformResult.slides.length === 0`. If so, show a helpful message: "No slides have teleprompter scripts to transform. Generate speaker notes first." with a close button (no export options).
**Warning signs:** Empty preview grid with enabled export buttons.

### Pitfall 4: PDF Format Option Before Phase 64
**What goes wrong:** Showing a PDF download button that doesn't work because Phase 64 (PDF Export) hasn't been implemented yet.
**Why it happens:** Requirement UI-02 says "choosing between PPTX and PDF export formats" but Phase 64 is still pending.
**How to avoid:** Two options: (a) Show PDF option as disabled with "Coming soon" label, or (b) only show PPTX for now and add PDF when Phase 64 ships. Option (a) is better UX -- it communicates the intent without blocking the feature.
**Warning signs:** Clickable PDF button that does nothing or errors.

### Pitfall 5: Modal Z-Index Collision
**What goes wrong:** Share modal appears behind other overlays (toast notifications, settings modal, etc.)
**Why it happens:** Multiple fixed-position overlays compete for z-index.
**How to avoid:** Use `z-50` (same as ExportModal and other modals). Toast container also uses `z-50` but is positioned at bottom-right and doesn't overlap modal center. Only one modal should be open at a time -- the "Share" button opens ShareModal and should prevent opening other modals simultaneously.
**Warning signs:** Modal content not interactive, clicks falling through to elements behind.

### Pitfall 6: Closing During Transformation
**What goes wrong:** User closes modal while AI transformation is in progress. The transformation promise resolves after modal unmounts, trying to set state on an unmounted component.
**Why it happens:** React useEffect cleanup doesn't cancel in-flight fetch requests automatically.
**How to avoid:** Use an AbortController or a `mountedRef` pattern. Set `mountedRef.current = false` in the useEffect cleanup, and check before setting state after the transformation completes. Or use the simpler approach: disable the close button during transformation (like ExportModal does during PDF generation).
**Warning signs:** React "can't perform state update on unmounted component" warning in console.

## Code Examples

Verified patterns from the existing codebase:

### ShareModal Props and State Shape
```typescript
// Source: Derived from ExportModal.tsx props pattern and App.tsx provider pattern
import { Slide } from '../types';
import { AIProviderInterface, ColleagueTransformationResult, VerbosityLevel } from '../services/aiProvider';

interface ShareModalProps {
  slides: Slide[];
  lessonTitle: string;
  deckVerbosity: VerbosityLevel;
  gradeLevel: string;
  provider: AIProviderInterface;
  onClose: () => void;
  addToast: (message: string, duration?: number, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

type SharePhase = 'transforming' | 'preview' | 'exporting' | 'error';
type ExportFormat = 'pptx' | 'pdf';
```

### Auto-Trigger Transformation on Mount
```typescript
// Source: Pattern from ExportModal.tsx lines 103-133 (AI Poster auto-generate)
useEffect(() => {
  let cancelled = false;

  const runTransformation = async () => {
    try {
      const result = await provider.transformForColleague(
        slides,
        deckVerbosity,
        gradeLevel,
        (progress) => {
          if (!cancelled) setProgress(progress);
        }
      );

      if (!cancelled) {
        if (result.slides.length === 0) {
          setPhase('error');
          setErrorMessage('No slides have teleprompter scripts to transform.');
        } else {
          setTransformResult(result);
          setPhase('preview');
        }
      }
    } catch (error) {
      if (!cancelled) {
        setPhase('error');
        const message = error instanceof AIProviderError
          ? error.userMessage
          : 'Transformation failed. Please try again.';
        setErrorMessage(message);
        addToast(message, 5000, 'error');
      }
    }
  };

  runTransformation();
  return () => { cancelled = true; };
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

### Adding onProgress to transformForColleague Interface
```typescript
// Source: services/aiProvider.ts line 394-398 (MODIFY)
// Add optional progress callback parameter
transformForColleague(
  slides: Slide[],
  deckVerbosity: VerbosityLevel,
  gradeLevel: string,
  onProgress?: (progress: { current: number; total: number }) => void
): Promise<ColleagueTransformationResult>;
```

### Provider Implementation with Progress (Claude Example)
```typescript
// Source: services/providers/claudeProvider.ts lines 2242-2317 (MODIFY chunk loop)
async transformForColleague(
  slides: Slide[],
  deckVerbosity: VerbosityLevel,
  gradeLevel: string,
  onProgress?: (progress: { current: number; total: number }) => void
): Promise<ColleagueTransformationResult> {
  // ... existing filter + chunk setup ...
  const totalSlides = transformable.length;

  for (let i = 0; i < chunks.length; i++) {
    // Report progress at start of each chunk
    const processedSoFar = chunks.slice(0, i).reduce((sum, c) => sum + c.length, 0);
    onProgress?.({ current: processedSoFar, total: totalSlides });

    // ... existing API call logic ...
  }

  // Final progress
  onProgress?.({ current: totalSlides, total: totalSlides });
  return { slides: allTransformed, skippedCount };
}
```

### Triggering PPTX Download
```typescript
// Source: services/pptxService.ts lines 90-175 (exportScriptPptx already exists)
import { exportScriptPptx } from '../services/pptxService';

const handleExport = () => {
  setPhase('exporting');
  try {
    exportScriptPptx(slides, transformResult!, lessonTitle);
    addToast('Script version exported successfully!', 3000, 'success');
    onClose();
  } catch (error) {
    addToast('Export failed. Please try again.', 5000, 'error');
    setPhase('preview'); // Return to preview on failure
  }
};
```

### App.tsx Integration
```typescript
// Source: App.tsx line 359 (near showExportModal state)
const [showShareModal, setShowShareModal] = useState(false);

// Source: App.tsx line 2052 (editor toolbar, next to Export PPTX button)
<Button variant="secondary" className="!py-1.5 !px-4 text-sm"
  onClick={() => setShowShareModal(true)}
  disabled={!provider || slides.length === 0}>
  Share with colleague
</Button>

// Source: App.tsx line 2875 (modal rendering, near ExportModal)
{showShareModal && provider && (
  <ShareModal
    slides={slides}
    lessonTitle={lessonTitle}
    deckVerbosity={deckVerbosity}
    gradeLevel="Year 6 (10-11 years old)"
    provider={provider}
    onClose={() => setShowShareModal(false)}
    addToast={addToast}
  />
)}
```

### Preview Grid with SlideContentRenderer
```typescript
// Source: ExportModal.tsx lines 478-516 (thumbnail grid pattern)
// Adapt TransformedSlide data into Slide-compatible objects for SlideContentRenderer
const previewSlides = transformResult.slides.map((ts) => {
  const original = slides[ts.slideIndex];
  return {
    ...original,
    content: ts.expandedBullets.map(b => b.replace(/\*\*/g, '')), // Strip markdown bold
  };
});

// Render preview grid
<div className="grid grid-cols-2 gap-4">
  {previewSlides.map((slide, idx) => (
    <div key={idx} className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="w-full h-full overflow-hidden" style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }}>
        <SlideContentRenderer slide={slide} visibleBullets={slide.content.length} />
      </div>
      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
        {transformResult.slides[idx].slideIndex + 1}
      </div>
    </div>
  ))}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bolt share onto ExportModal | Separate ShareModal.tsx | Architecture decision (ARCHITECTURE-share-with-colleague.md) | Clean separation of concerns, purpose-specific modals |
| Per-slide AI calls | Batched transformation (transformForColleague) | Phase 61 | Single call for coherence, chunking at 20 slides for large decks |
| Parameterized exportToPowerPoint | Separate exportScriptPptx function | Phase 62 decision (62-01-PLAN.md) | Different layout concerns warrant separate function |
| `ScriptSlide` intermediate type | Direct `TransformedSlide` from Phase 61 | Phase 62 simplified approach | No need for intermediate type -- use TransformedSlide directly with Slide[] for image lookup |

**Deprecated/outdated:**
- The architecture doc suggested `ScriptSlide` type and `toRenderableSlide()` adapter. Phase 62 eliminated the need by using `TransformedSlide` directly. The preview can adapt inline.
- The architecture doc suggested `PptxExportOptions` param on `exportToPowerPoint`. Phase 62 created a separate `exportScriptPptx` function instead.

## Open Questions

1. **PDF Export Availability**
   - What we know: Phase 64 (PDF Export) is not yet implemented. Requirement UI-02 specifies "choosing between PPTX and PDF."
   - What's unclear: Should the PDF option be visible-but-disabled or hidden entirely?
   - Recommendation: Show PDF option as disabled with "Coming soon" label. This communicates the planned capability without blocking PPTX export. Phase 64 will enable it.

2. **Progress Granularity for Small Decks**
   - What we know: Most teacher decks are 8-15 slides, processed in a single chunk. Per-chunk progress only fires once (start) for single-chunk decks.
   - What's unclear: Whether "Transforming 12 slides..." with a spinner is sufficient, or if teachers expect a per-slide counter.
   - Recommendation: Show "Transforming slides..." with total count and a spinner. Do not fake per-slide progress. For multi-chunk decks (20+ slides), show "Processing batch X of Y..." This is honest and still communicates activity.

3. **Auto-Close After Export**
   - What we know: ExportModal closes after PDF generation (`onClose()` on line 307). Standard PPTX export via `exportToPowerPoint` does not involve a modal.
   - What's unclear: Should ShareModal close immediately after download starts, or stay open for potential re-export?
   - Recommendation: Close after successful export (matches ExportModal pattern). Show success toast. If teacher wants another format, they click Share again.

## Sources

### Primary (HIGH confidence)
- `components/ExportModal.tsx` -- Modal structure, progress tracking, AI poster workflow pattern, thumbnail preview grid, PDF generation with html2canvas
- `components/Toast.tsx` -- `useToast` hook interface, `ToastVariant` type, `addToast` signature
- `components/CondensationPreview.tsx` -- Transform-then-preview modal pattern
- `components/ClassBankSaveModal.tsx` -- Simple modal pattern (escape key, overlay, dark mode)
- `services/pptxService.ts` -- `exportScriptPptx()` function signature and implementation (Phase 62)
- `services/aiProvider.ts` -- `AIProviderInterface.transformForColleague()` signature, `ColleagueTransformationResult` type, `TransformedSlide` type
- `services/providers/claudeProvider.ts` lines 2242-2327 -- `transformForColleague` implementation with chunk loop
- `services/providers/geminiProvider.ts` lines 891-962 -- `transformForColleague` implementation with chunk loop
- `services/prompts/transformationPrompts.ts` lines 144-198 -- `filterTransformableSlides`, `chunkSlides`, `buildChunkSummary`
- `App.tsx` lines 277-280 -- Provider instantiation pattern
- `App.tsx` lines 355-359 -- Modal state pattern (showExportModal)
- `App.tsx` lines 2042-2056 -- Editor toolbar button layout
- `App.tsx` lines 2875-2883 -- Modal rendering location
- `.planning/research/ARCHITECTURE-share-with-colleague.md` -- Architecture decisions for ShareModal

### Secondary (MEDIUM confidence)
- `.planning/research/STACK-v4.1-script-mode-export.md` -- Original stack research confirming zero new dependencies
- `.planning/phases/61-ai-transformation-service/61-RESEARCH.md` -- Transformation service research context
- `.planning/phases/62-pptx-export/62-RESEARCH.md` -- PPTX export research context

### Tertiary (LOW confidence)
- None -- all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all libraries already in codebase, verified by direct code inspection
- Architecture: HIGH -- modal patterns well-established in codebase with 5+ examples, architecture doc prescribes exact approach
- Pitfalls: HIGH -- identified from concrete codebase analysis (e.g., transformForColleague lacks progress callback, provider null check patterns visible in other features)
- Code examples: HIGH -- all examples derived from actual codebase patterns with line number references

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable -- no dependency changes expected, purely internal UI work)
