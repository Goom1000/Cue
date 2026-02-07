# Technology Stack: Script Mode (Share with Colleague) Export

**Project:** Cue v4.1 - Script Mode Export
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

Script Mode export requires **zero new library dependencies**. The existing stack -- PptxGenJS 3.12.0 (CDN), jsPDF 4.0.0, html2canvas 1.4.1, and the Gemini/Claude AI provider abstraction -- already handles every capability needed: base64 image embedding in PPTX, image placement in PDF, slide rasterization for preview, and text transformation via AI. The work is entirely service-layer code: a new `scriptTransformService.ts` for AI text expansion, and new export functions in/alongside `pptxService.ts` and `exportService.ts`.

---

## Recommended Stack (No New Dependencies)

### Existing Libraries -- Confirmed Sufficient

| Technology | Version | Already In | Purpose for Script Mode | Confidence |
|------------|---------|-----------|-------------------------|------------|
| PptxGenJS | 3.12.0 | CDN (`index.html`) | PPTX export with embedded base64 images + expanded text bullets | HIGH |
| jsPDF | 4.0.0 | npm (`package.json`) | PDF export with `addImage()` for base64 slide images + text layout | HIGH |
| html2canvas | 1.4.1 | npm (`package.json`) | Rasterize React slide components for PDF pages (existing pattern in `ExportModal.tsx`) | HIGH |
| Gemini/Claude providers | Current | `services/providers/` | AI text transformation (teleprompter script to talking-point bullets) | HIGH |

### What NOT to Add

| Library | Why You Might Consider It | Why NOT |
|---------|--------------------------|---------|
| `pptxgenjs` (npm) | Install as npm dep instead of CDN | Would create duplicate -- CDN version already loaded via `window.PptxGenJS`. Migration is unrelated scope. |
| `pdf-lib` | Alternative PDF generation | jsPDF 4.0.0 already handles image embedding, text layout, and landscape orientation. Switching gains nothing. |
| `puppeteer` / `playwright` | Server-side rendering for higher fidelity | Client-side SPA. No server. html2canvas already proven for this codebase. |
| `docx` (npm) | Word document export | Out of scope. PPTX + PDF are the specified formats. |
| `html2pdf.js` (CDN) | Already loaded in `index.html` | Not used by any app code. The app uses jsPDF + html2canvas directly for more control. Do not adopt. |

---

## Capability Verification

### PptxGenJS: Image Embedding in PPTX (HIGH confidence)

**Verified via official docs:** PptxGenJS `addImage()` accepts `data` property with base64-encoded image strings. This is the exact format Cue stores images in (`slide.imageUrl` = `data:image/png;base64,...`).

**Current usage in `pptxService.ts`** (line 34, 65):
```typescript
pptSlide.addImage({
  data: slide.imageUrl,  // Already base64 data URL
  x: 5.2, y: 1.8, w: 4.5, h: 3.5,
  sizing: { type: "contain", w: 4.5, h: 3.5 }
});
```

**For script mode**, the same pattern works. The only change is layout adjustment -- more text space for expanded bullets, image positioned accordingly. Supported sizing modes: `contain` (preserve ratio, fit within bounds), `cover` (fill area, crop edges), `crop` (specific region).

**Important detail:** PptxGenJS requires the base64 string WITHOUT the `data:image/...;base64,` prefix when using the `data` property. Current code passes the full data URL. This works because PptxGenJS internally handles both formats. No change needed.

Source: [PptxGenJS Images API](https://gitbrent.github.io/PptxGenJS/docs/api-images/)

### jsPDF 4.0.0: Image Embedding in PDF (HIGH confidence)

**Verified:** jsPDF `addImage()` accepts base64-encoded data URLs, HTMLImageElements, or canvas elements. The method signature: `addImage(imageData, format, x, y, width, height, alias, compression, rotation)`.

**Current usage in `ExportModal.tsx`** (line 219, 296): Uses html2canvas to rasterize slides, then `pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight)`. This is the Working Wall export pattern.

**For script mode PDF**, two viable approaches:

1. **Rasterize approach** (like ExportModal): Render a React "script slide" component, capture with html2canvas, add as full-page image to PDF. Produces pixel-perfect fidelity. Existing proven pattern.

2. **Programmatic approach** (like exportService): Use jsPDF text/drawing primitives to lay out content directly. More control, smaller file sizes, but harder to match visual styling.

**Recommendation:** Use the **rasterize approach** for script mode PDF. It reuses the proven ExportModal pattern, guarantees visual consistency with the preview, and avoids duplicating layout logic between React components and jsPDF primitives.

Source: [jsPDF addImage docs](https://artskydj.github.io/jsPDF/docs/module-addImage.html)

### jsPDF 4.0.0 Breaking Change Note

v4.0.0 is a security-focused release restricting Node.js file system access. No changes to browser-side APIs. The addImage, text layout, and page management APIs are unchanged from v3.x. No migration needed.

Source: [jsPDF releases](https://github.com/parallax/jsPDF/releases)

---

## AI Text Transformation Strategy

### The Task

Transform teleprompter `speakerNotes` (teacher delivery script, formatted with emoji delimiters for progressive disclosure) into expanded talking-point bullets suitable for a colleague to read on-slide.

**Input:** `"Set the scene. [emoji] Explain why fractions matter -- 3/4 of a pizza example. [emoji] Connect to division..."`

**Output:** `["Fractions represent parts of a whole - use the pizza analogy (3/4 means 3 slices out of 4)", "Connect fractions to division: 3/4 is the same as 3 divided by 4", ...]`

### Recommended Approach: Single Batched Call (HIGH confidence)

**Use one AI call per deck, not per slide.** Send all slides' speakerNotes + content in a single prompt, get back all transformed bullets.

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Single call (all slides)** | 1 API call, shared context, consistent tone, fast | Larger prompt, risk of truncation on 30+ slide decks | **Recommended** |
| **Chunked batch (5-8 slides)** | Manageable token count, still efficient | Multiple calls, slightly inconsistent tone across chunks | Fallback for large decks |
| **Per-slide calls** | Simple implementation | N API calls, slow, expensive, no cross-slide context for consistency | Reject |

**Rationale:**
- A typical Cue deck is 8-15 slides. Each slide's speakerNotes is ~100-200 tokens. Total input for 15 slides: ~3,000-4,500 tokens including content bullets. This fits comfortably within any model's context window.
- Gemini 2.5 Flash has a 1M token context window. Claude Haiku/Sonnet have 200K+. A 15-slide deck is <1% of capacity.
- Single call ensures consistent transformation style (same tone, same bullet density) across all slides.
- Use the existing `AIProviderInterface` pattern: add a `transformForScriptMode(slides: Slide[]): Promise<ScriptSlide[]>` method to the interface, implement in both providers.

**Fallback:** For decks exceeding 25 slides, chunk into groups of 10 slides per call to avoid output truncation (LLMs can struggle generating very long structured outputs even when context window permits it).

### Integration with AI Provider Pattern

The existing `AIProviderInterface` in `services/aiProvider.ts` defines the contract. Add one new method:

```typescript
// In AIProviderInterface
transformForScriptMode(
  slides: Slide[],
  gradeLevel: string
): Promise<ScriptModeSlide[]>;
```

Where `ScriptModeSlide` is:
```typescript
interface ScriptModeSlide {
  slideIndex: number;
  expandedBullets: string[];  // Talking-point bullets derived from speakerNotes
  slideTitle: string;         // Possibly adjusted for standalone context
}
```

Implement in both `GeminiProvider` and `ClaudeProvider` following the existing pattern (Gemini uses `responseSchema` for structured output; Claude uses tool_use for structured output).

### Cost Estimate

For a 12-slide deck:
- Input: ~4,000 tokens (slide content + speaker notes + system prompt)
- Output: ~2,000 tokens (expanded bullets)
- Gemini 2.5 Flash: ~$0.001 per transformation
- Claude Haiku: ~$0.002 per transformation

Negligible cost. No optimization needed.

---

## Preview Rendering Strategy

### Recommendation: Reuse SlideContentRenderer with Overrides (HIGH confidence)

The existing `SlideContentRenderer` in `components/SlideRenderers.tsx` already renders slides with text + images in multiple layouts (split, full-image, center-text, etc.).

For script mode preview, create a **wrapper component** that feeds the `SlideContentRenderer` modified slide data:

```typescript
// ScriptSlidePreview.tsx - conceptual
const scriptSlide: Slide = {
  ...originalSlide,
  content: expandedBullets,  // Swapped from original content to AI-transformed bullets
  // imageUrl preserved as-is
  // layout preserved as-is
};
return <SlideContentRenderer slide={scriptSlide} visibleBullets={expandedBullets.length} />;
```

This avoids building a new rendering pipeline. The existing layouts handle text + image positioning. The only difference is the content array contains expanded talking points instead of terse bullet points.

**No new component library or rendering infrastructure needed.**

---

## Export File Generation Architecture

### PPTX Export Path

Extend or create alongside `pptxService.ts`:

```typescript
// scriptPptxService.ts or extend pptxService.ts
export function exportScriptPptx(
  slides: Slide[],
  scriptData: ScriptModeSlide[],
  title: string
): void {
  // Same PptxGenJS pattern as existing exportToPowerPoint
  // Use addText() for expanded bullets
  // Use addImage({ data: slide.imageUrl }) for images
  // Use addNotes() for original speakerNotes (as reference)
}
```

### PDF Export Path

Use the proven rasterize pattern from `ExportModal.tsx`:

1. Render each script-mode slide into a hidden DOM container using React
2. Capture with html2canvas
3. Add captured image to jsPDF page
4. Save as PDF

This is the same architecture as the Working Wall export. No new libraries needed.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| PPTX generation | PptxGenJS 3.12.0 (existing CDN) | `officegen`, `docxtemplater` | Already loaded, proven, working. Zero migration risk. |
| PDF generation | jsPDF 4.0.0 + html2canvas (existing) | `pdf-lib`, `react-pdf` | Already installed, proven pattern in ExportModal. pdf-lib adds nothing jsPDF doesn't do. |
| AI transformation | Single batched call via existing provider | Batch API (24hr async), per-slide calls | Batch API is overkill for 15-slide decks (~5K tokens). Per-slide is slow and expensive. |
| Preview rendering | SlideContentRenderer with swapped content | New custom renderer, iframe rendering | Reuse is simpler, maintains visual consistency with actual slides. |
| PDF approach | Rasterize (html2canvas) | Programmatic (jsPDF text primitives) | Rasterize guarantees visual fidelity with preview. Programmatic requires duplicating layout logic. |

---

## Installation

No new installations required. All dependencies already present:

```bash
# Nothing to install. Existing deps cover all needs:
# - PptxGenJS 3.12.0 via CDN in index.html
# - jsPDF 4.0.0 via npm (package.json)
# - html2canvas 1.4.1 via npm (package.json)
# - AI providers via existing services/providers/
```

---

## New Files to Create

| File | Purpose |
|------|---------|
| `services/scriptTransformService.ts` | AI text transformation logic + ScriptModeSlide type |
| `services/scriptExportService.ts` | PPTX and PDF generation for script mode |
| `components/ScriptModePreview.tsx` | Preview UI wrapping SlideContentRenderer with transformed content |

### Files to Modify

| File | Change |
|------|--------|
| `services/aiProvider.ts` | Add `transformForScriptMode()` to `AIProviderInterface` |
| `services/providers/geminiProvider.ts` | Implement `transformForScriptMode()` |
| `services/providers/claudeProvider.ts` | Implement `transformForScriptMode()` |
| `types.ts` | Add `ScriptModeSlide` interface |

---

## Sources

- [PptxGenJS Images API](https://gitbrent.github.io/PptxGenJS/docs/api-images/) -- verified image embedding with base64 `data` property, sizing modes (contain/cover/crop)
- [jsPDF addImage documentation](https://artskydj.github.io/jsPDF/docs/module-addImage.html) -- verified base64 image support, coordinate-based placement
- [jsPDF 4.0.0 release](https://github.com/parallax/jsPDF/releases) -- security-only release, no browser API changes
- [Gemini Batch API](https://ai.google.dev/gemini-api/docs/batch-api) -- confirmed single-prompt batching superior to async batch API for small workloads
- Codebase verification: `pptxService.ts`, `exportService.ts`, `ExportModal.tsx`, `aiProvider.ts`, `geminiService.ts`, `SlideRenderers.tsx`
