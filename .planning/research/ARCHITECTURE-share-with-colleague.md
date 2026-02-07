# Architecture Patterns: Script Mode (Share with Colleague) Export

**Domain:** AI-powered presentation export transformation
**Researched:** 2026-02-08
**Confidence:** HIGH -- based on direct codebase analysis of all relevant integration points

## Executive Summary

The "Share with Colleague" feature transforms teleprompter scripts (stored in `speakerNotes`) into expanded bullet points, then exports the transformed slides as PPTX or PDF with images. This is architecturally a **transform-then-export pipeline** -- similar to the existing AI Poster flow in `ExportModal.tsx`, but simpler because it transforms text data rather than generating entirely new layouts.

The recommended architecture creates **temporary "script version" slides in memory** during the modal lifecycle, adds a **new dedicated AI method** (not reusing `regenerateTeleprompter`), and reuses the existing `SlideContentRenderer` for preview. This keeps the feature self-contained and avoids warping the teleprompter regeneration pathway.

---

## Recommended Architecture

### High-Level Data Flow

```
User clicks "Share with Colleague"
    |
    v
ShareModal opens (new component)
    |-- receives: slides[], lessonTitle, provider
    |-- state: scriptSlides[] (transformed copies)
    |-- state: transformationStatus (idle | transforming | ready | error)
    |
    v
AI Transformation (batch, all slides in one call)
    |-- Call provider.transformSlidesForSharing(slides, lessonTopic)
    |-- Output: ScriptSlide[] with expanded bullets per slide
    |-- Images copied by reference from originals
    |
    v
Preview (scrollable grid of transformed slides)
    |-- Reuse SlideContentRenderer with scriptSlides (via adapter)
    |-- Show side-by-side: original title + new expanded content
    |
    v
Export (user clicks "Download PPTX" or "Download PDF")
    |-- PPTX: call exportToPowerPoint(adaptedSlides, title, { scriptMode: true })
    |-- PDF: html2canvas capture of rendered SlideContentRenderer
    |
    v
Modal closes, scriptSlides discarded (never persisted)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `ShareModal.tsx` (NEW) | Modal UI, orchestrates transform + preview + export | App.tsx (receives slides, provider, addToast), scriptTransformService (AI calls), pptxService (export) |
| `scriptTransformService.ts` (NEW) | AI prompt construction, response parsing, ScriptSlide construction | AIProvider (via new method), types.ts (Slide, ScriptSlide) |
| `pptxService.ts` (MODIFIED) | Accept `ExportOptions` param for font size and speaker notes toggle | PptxGenJS (CDN) |
| `SlideContentRenderer` (REUSED, NO CHANGES) | Renders slide preview in modal thumbnails | SlideRenderers.tsx |
| `App.tsx` (MODIFIED) | Adds "Share" button to editor toolbar, state for modal, renders ShareModal | ShareModal.tsx |

### Why This Shape

1. **Temporary slides in memory (not on-the-fly during export):** The user needs to preview what the colleague will see before exporting. On-the-fly transformation during export would skip preview entirely, which is bad UX for a sharing feature. The AI Poster flow already establishes this pattern: generate -> preview -> export.

2. **New component, not bolted onto ExportModal:** ExportModal is specifically for Working Wall (PDF posters from selected slides). The Share feature has fundamentally different intent (all slides, PPTX output, AI text transformation). Combining them would create a confusing modal with three unrelated modes. A separate `ShareModal.tsx` follows the existing pattern of purpose-specific modals (ClassBankSaveModal, RecoveryModal, CondensationPreview, etc.).

3. **New service file, not inline in modal:** The transformation logic (prompt construction, response parsing, slide cloning) is complex enough to warrant its own file. This matches the pattern of `posterService.ts` being separate from `ExportModal.tsx`.

---

## The AI Method Question: New Method vs Reuse

### Recommendation: Add `transformSlidesForSharing()` to AIProviderInterface

**Do NOT reuse `regenerateTeleprompter()`** for these reasons:

| Dimension | `regenerateTeleprompter()` | Share transformation |
|-----------|--------------------------|---------------------|
| **Input** | Single slide | All slides (batch) |
| **Output** | `string` (speaker notes with `pointing_right` delimiters) | `string[]` per slide (visual bullets) |
| **Prompt intent** | Teacher narration tied to progressive disclosure | Standalone educational content a reader can understand without a presenter |
| **Context** | Prev/next slide only | Full deck context for coherence |
| **Audience** | The presenting teacher | A colleague reading slides alone |

Adding a `mode` flag to `regenerateTeleprompter` would create a bifurcated method with fundamentally different I/O contracts. A clean new method is simpler.

### Interface Addition

```typescript
// Add to AIProviderInterface in services/aiProvider.ts:

transformSlidesForSharing(
  slides: Slide[],
  lessonTopic: string
): Promise<ScriptSlide[]>;
```

### Why batch (all slides in one call) instead of per-slide

The AI needs full-deck context to produce coherent expanded content. A colleague reading slide 5 should see content that naturally follows what was established in slides 1-4. Per-slide calls (like teleprompter regen) lose this narrative thread.

A typical 10-15 slide deck produces ~6K input tokens and ~4K output tokens -- well within model context windows for both Claude and Gemini.

**Edge case:** Decks exceeding ~20 slides should be chunked into batches of 10 with 2-slide overlap for context continuity. Design this into the service but only activate when needed.

---

## Data Model: ScriptSlide Type

### Recommendation: New lightweight type with adapter

```typescript
// In types.ts:
export interface ScriptSlide {
  originalSlideId: string;
  title: string;            // Preserved from original
  content: string[];        // Expanded bullets from AI
  imageUrl?: string;        // Copied from original by reference
  layout?: Slide['layout']; // Copied from original (may be overridden for special types)
  backgroundColor?: string; // Copied from original
}
```

**Why a separate type instead of cloning full Slide objects:**
- Script slides are ephemeral and structurally simpler. They don't need `speakerNotes`, `verbosityCache`, `slideType`, `pairs`, `contributions`, `source`, `imagePrompt`, etc.
- A distinct type makes the intent clear and prevents accidental mutation of real slides.
- Dead fields on cloned Slides would be confusing to anyone reading the code.

**Compatibility with SlideContentRenderer:** The renderer expects a `Slide` prop. Create a thin adapter in the service:

```typescript
// In scriptTransformService.ts:
export function toRenderableSlide(scriptSlide: ScriptSlide): Slide {
  return {
    id: scriptSlide.originalSlideId,
    title: scriptSlide.title,
    content: scriptSlide.content,
    speakerNotes: '',
    imagePrompt: '',
    imageUrl: scriptSlide.imageUrl,
    layout: scriptSlide.layout,
    backgroundColor: scriptSlide.backgroundColor,
  };
}
```

---

## Handling Special Slide Types

| Slide Type | Script Mode Behavior | Rationale |
|-----------|---------------------|-----------|
| Standard (`split`/`center-text`) | Expand bullets from speaker notes. Keep image. | Natural fit -- more content, same layout. |
| `full-image` (with `originalPastedImage`) | Switch to `split` layout. Expanded content as bullets, image on right. | Pasted slides have no visible text. Colleague needs content. |
| `flowchart` | Keep flowchart layout. Expand each step's text slightly. | Steps are already visual; just add detail. |
| `grid` | Keep grid layout. Each cell gets slightly expanded text. | Grid structure communicates relationships. |
| `work-together` | Convert to `split` layout. Replace activity instructions with description of the activity. Omit student pairs. | Pairs are session-specific. Colleague needs the pedagogical intent. |
| `class-challenge` | Convert to `split` layout. Challenge prompt becomes title, activity description as bullets. | Contributions are session-specific. |
| `tile-overlap` | Convert to `split` layout. Tiles become regular bullets. | Tile-overlap is a presentation animation; doesn't work in static export. |

The AI prompt should include guidance for each slide type. For v1, normalizing all output to `split` or `center-text` is acceptable. Layout-aware transformation is a follow-up enhancement.

---

## PPTX Export Changes

### Current State

`pptxService.ts` `exportToPowerPoint()` renders `slide.content[]` as 24pt bulleted text and `slide.speakerNotes` as PowerPoint notes. It already works structurally for script slides.

### Required Change

Script-version slides have longer, more detailed bullets. The current 24pt font will overflow. Add an options parameter:

```typescript
// Modified signature in pptxService.ts:
export interface PptxExportOptions {
  bulletFontSize?: number;      // Default 24, script mode uses 16-18
  includeSpeakerNotes?: boolean; // Default true, script mode false
}

export const exportToPowerPoint = (
  slides: Slide[],
  title: string,
  options?: PptxExportOptions
) => { ... }
```

This avoids duplicating the function. The existing call site `exportToPowerPoint(slides, lessonTitle)` continues to work unchanged due to the optional parameter.

### PDF Export Path

For PDF output, reuse the ExportModal html2canvas pattern:
1. Render each script slide into an offscreen `SlideContentRenderer`
2. Capture with html2canvas at 2x scale
3. Add to jsPDF as landscape A4 page

This is identical to the Quick Export flow in ExportModal (lines 241-316). Optionally extract into a shared utility, but for v1 it's fine to duplicate the ~30 lines of capture logic in ShareModal.

---

## Integration Points in App.tsx

### Button Placement

Add "Share" button in the editor toolbar, adjacent to "Export PPTX" (around line 2052):

```tsx
<Button variant="secondary" className="!py-1.5 !px-4 text-sm"
  onClick={() => exportToPowerPoint(slides, lessonTitle)}>Export PPTX</Button>
<Button variant="secondary" className="!py-1.5 !px-4 text-sm"
  onClick={() => setShowShareModal(true)}>Share</Button>
```

### State Addition

```tsx
const [showShareModal, setShowShareModal] = useState(false);
```

### Modal Rendering (near other modals, ~line 2872):

```tsx
{showShareModal && (
  <ShareModal
    slides={slides}
    lessonTitle={lessonTitle}
    provider={provider}
    onClose={() => setShowShareModal(false)}
    addToast={addToast}
  />
)}
```

### Provider Access

Pass `provider` as prop (the `AIProviderInterface` instance already created in App.tsx). This follows the ResourceHub pattern where App.tsx passes the provider down. Avoids duplicating the localStorage API key access pattern used by ExportModal/posterService.

---

## Patterns to Follow

### Pattern 1: Modal-Orchestrated AI Pipeline
**What:** Modal component manages the lifecycle of an AI transformation: initiation -> progress -> preview -> export.
**Precedent:** ExportModal AI Poster mode, CondensationPreview.
**Key behavior:** Auto-trigger AI on mount (the user's intent is clear from clicking "Share"). Show progress spinner. Display preview when ready.

### Pattern 2: Service Layer for AI Logic
**What:** Extract AI prompt construction and response parsing into a dedicated service file.
**Precedent:** `posterService.ts` (called by ExportModal), `documentAnalysis/analysisPrompts.ts` (called by providers).
**Why:** Keeps modal focused on UI. Makes transformation logic testable independently.

### Pattern 3: Provider-Agnostic AI Calls
**What:** All AI calls go through `AIProviderInterface`. Both `GeminiProvider` and `ClaudeProvider` implement the same methods.
**Implication:** `transformSlidesForSharing()` must be implemented in both providers. Both implementations use the same prompt; only the API call mechanism differs.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mutating Real Slides
**What:** Modifying `slides[]` in App.tsx state during the share flow.
**Why bad:** Share transformation is ephemeral. If user cancels, undo is needed. If app crashes during transformation, real slides are corrupted.
**Instead:** Create script slides as new objects in modal-local state. Never touch App.tsx slides.

### Anti-Pattern 2: Adding Share to ExportModal
**What:** Adding a third mode to ExportModal alongside "Quick Export" and "AI Poster."
**Why bad:** ExportModal serves Working Wall (classroom display). Share serves colleagues (different audience, format, and workflow). Three modes = confusing UX.
**Instead:** Separate ShareModal.tsx following the one-modal-one-purpose pattern.

### Anti-Pattern 3: Per-Slide AI Calls
**What:** Calling the AI once per slide, like teleprompter regeneration does.
**Why bad for this feature:** The exported deck should read coherently as a standalone document. Per-slide calls lose narrative continuity.
**Instead:** Batch all slides into a single AI call for cross-slide coherence.

### Anti-Pattern 4: Reusing `regenerateTeleprompter` with a Flag
**What:** `regenerateTeleprompter(slide, verbosity, prev, next, { mode: 'share' })`
**Why bad:** Fundamentally different I/O contracts (string vs string[]), different prompt intent, different context needs. A flag creates an unmaintainable bifurcated method.
**Instead:** New dedicated method with clear name and types.

---

## Build Order (Dependency-Ordered)

### Phase 1: Core types and transformation service (no UI)
1. Define `ScriptSlide` interface in `types.ts`
2. Create `services/scriptTransformService.ts` with prompt construction + `toRenderableSlide()` adapter
3. Add `transformSlidesForSharing()` to `AIProviderInterface`
4. Implement in `ClaudeProvider`
5. Implement in `GeminiProvider`

### Phase 2: PPTX export enhancement
6. Add optional `PptxExportOptions` param to `exportToPowerPoint()` in `pptxService.ts`
7. Adjust bullet font size and speaker notes behavior when options provided

### Phase 3: ShareModal UI
8. Create `components/ShareModal.tsx`:
   - Auto-trigger transformation on mount
   - Progress indicator during AI call
   - Scrollable preview grid using `SlideContentRenderer` + adapter
   - "Download PPTX" button (primary)
   - "Download PDF" button (secondary, optional for v1)
9. Wire into App.tsx: button + state + modal render

### Phase 4: Polish and PDF (optional)
10. Add PDF export option to ShareModal
11. Handle edge cases: empty slides, slides with no speaker notes, very large decks

### Why this order:
- Phase 1 has zero UI risk. The service can be tested via console.
- Phase 2 is an isolated, backward-compatible change to existing code.
- Phase 3 brings it all together. If Phases 1 and 2 are solid, the modal is just wiring.
- Phase 4 is genuinely optional. PPTX is the primary share format for teachers.

---

## Scalability Considerations

| Concern | 5 slides | 15 slides | 30+ slides |
|---------|----------|-----------|------------|
| AI call tokens | ~2K input, ~2K output | ~6K input, ~4K output | Needs chunking (batches of 10) |
| Transform time | ~3s | ~8s | ~15s, progress bar needed |
| Memory (script slides) | Negligible | Negligible | ~10MB if images are large data URLs |
| PPTX file size | Same as original | Same as original | Same as original (images dominate file size) |

---

## File Summary

| File | Status | Changes |
|------|--------|---------|
| `types.ts` | MODIFIED | Add `ScriptSlide` interface |
| `services/aiProvider.ts` | MODIFIED | Add `transformSlidesForSharing()` to interface |
| `services/scriptTransformService.ts` | NEW | Prompt logic, response parsing, `toRenderableSlide()` adapter |
| `services/providers/claudeProvider.ts` | MODIFIED | Implement `transformSlidesForSharing()` |
| `services/providers/geminiProvider.ts` | MODIFIED | Implement `transformSlidesForSharing()` |
| `services/pptxService.ts` | MODIFIED | Add optional `PptxExportOptions` param |
| `components/ShareModal.tsx` | NEW | Modal UI with transform, preview, export |
| `App.tsx` | MODIFIED | Add "Share" button, `showShareModal` state, render ShareModal |

---

## Sources

All findings based on direct codebase analysis:

- `types.ts` (line 10-37) -- Slide type definition with all fields
- `services/aiProvider.ts` (line 272-387) -- AIProviderInterface with all 18 existing methods
- `services/providers/claudeProvider.ts` (line 1461-1505) -- `regenerateTeleprompter` implementation showing prompt pattern
- `services/pptxService.ts` (line 1-82) -- Full `exportToPowerPoint` implementation
- `services/exportService.ts` (line 1-597) -- PDF generation with jsPDF, zip bundling pattern
- `services/posterService.ts` (line 1-123) -- Batch AI generation pattern with progress callbacks
- `components/ExportModal.tsx` (line 1-631) -- Modal + html2canvas + SlideContentRenderer preview pattern
- `components/SlideRenderers.tsx` (line 498-515) -- `SlideContentRenderer` switch statement over all layouts
- `components/CondensationPreview.tsx` (line 1-46) -- Transform-then-preview modal pattern
- `App.tsx` (line 2040-2057) -- Editor toolbar button layout where Share button goes
