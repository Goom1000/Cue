# Phase 64: PDF Export - Research

**Researched:** 2026-02-08
**Domain:** PDF generation with jsPDF -- native text rendering with embedded base64 images
**Confidence:** HIGH

## Summary

Phase 64 implements `exportScriptPdf()` to complement the existing `exportScriptPptx()` from Phase 62. The core decision -- deferred from earlier planning -- is now resolved: **use jsPDF native text rendering (not html2canvas rasterization)** for the script-mode PDF. This decision is strongly supported by three factors: (1) the success criteria explicitly require "crisp and readable vector text, not blurry rasterized screenshots," (2) the existing `exportService.ts` already proves this pattern works with 280 lines of mature page-break handling, bullet formatting, and header rendering, and (3) the `ColleagueTransformationResult` data structure from Phase 61 contains plain text strings (`expandedBullets[]`), not React components, making programmatic text layout the natural fit.

The implementation is straightforward: create a new `exportScriptPdf()` function that mirrors the layout of `exportScriptPptx()` -- white background, title at top, small image thumbnail, expanded talking-point bullets below -- using jsPDF primitives (`doc.text()`, `doc.addImage()`, `doc.splitTextToSize()`). The function consumes the same `ColleagueTransformationResult` that `exportScriptPptx()` already uses, requiring zero changes to the AI transformation pipeline. The only UI changes needed are enabling the disabled PDF button in ShareModal and wiring the download handler.

**Primary recommendation:** Build `exportScriptPdf()` using jsPDF native text rendering with `addImage()` for slide thumbnails. Follow the proven layout patterns from `exportService.ts` (page-break handling) and the data flow from `pptxService.ts` (consuming `ColleagueTransformationResult`). Wire into the existing ShareModal PDF button.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | ^4.0.0 | Native vector text PDF generation | Already installed, proven in exportService.ts for worksheets |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| html2canvas | ^1.4.1 | NOT used for Phase 64 | Only for Working Wall rasterized exports (ExportModal.tsx) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF native text | html2canvas rasterization | Rasterization produces blurry, non-selectable text -- fails PDF-02 requirement. Only appropriate for visual-fidelity exports like Working Wall posters. |
| jsPDF native text | pdf-lib | Would add a new dependency for no benefit. jsPDF already handles everything needed. |
| jsPDF native text | React-PDF (@react-pdf/renderer) | Would require a separate React rendering pipeline. Overkill when data is plain strings. |

**Installation:**
```bash
# Nothing to install. jsPDF ^4.0.0 already in package.json.
```

## Architecture Patterns

### Recommended Project Structure
```
services/
  exportService.ts      # Existing worksheet PDF generation (reference pattern)
  pptxService.ts        # Existing PPTX exports (exportScriptPptx -- data flow reference)
  pdfService.ts         # NEW: exportScriptPdf() function
components/
  ShareModal.tsx        # Wire PDF download handler (enable disabled button)
```

### Pattern 1: Native Text PDF with Embedded Images
**What:** Use jsPDF `doc.text()` for all textual content and `doc.addImage()` for slide thumbnails, laying out content programmatically with exact coordinates in mm.
**When to use:** When the source data is strings (not DOM elements) and text quality matters.
**Example:**
```typescript
// Source: exportService.ts (lines 61-280) + jsPDF addImage docs
import { jsPDF } from 'jspdf';

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

// Add slide thumbnail image
if (imageSource) {
  doc.addImage(imageSource, 'PNG', x, y, width, height);
}

// Add text with automatic wrapping
doc.setFontSize(11);
doc.setFont('helvetica', 'normal');
const lines = doc.splitTextToSize(bulletText, contentWidth);
for (const line of lines) {
  if (y + 6 > pageBottom) {
    doc.addPage();
    y = marginTop;
  }
  doc.text(line, marginLeft, y);
  y += 6;
}
```

### Pattern 2: Page-Break Handling (from exportService.ts)
**What:** Before rendering any element, check if remaining space on current page is sufficient. If not, add a new page and reset Y position.
**When to use:** Always, for every element in the PDF.
**Example:**
```typescript
// Source: exportService.ts lines 70-76
const checkPageBreak = (requiredHeight: number): number => {
  if (y + requiredHeight > pageBottom) {
    doc.addPage();
    return marginTop;
  }
  return y;
};
```

### Pattern 3: Consuming ColleagueTransformationResult
**What:** The PDF export function takes the same inputs as `exportScriptPptx()` -- the original slides array, the transformation result, and the lesson title. It iterates `transformationResult.slides`, looks up original slides by `slideIndex`, and renders each as a PDF page.
**When to use:** This is the only pattern. The AI transformation (Phase 61) is already complete and produces `ColleagueTransformationResult`.
**Example:**
```typescript
// Source: pptxService.ts lines 90-174 (exportScriptPptx pattern)
export function exportScriptPdf(
  slides: Slide[],
  transformationResult: ColleagueTransformationResult,
  title: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  transformationResult.slides.forEach((transformed, pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    const originalSlide = slides[transformed.slideIndex];
    if (!originalSlide) return;

    const imageSource = originalSlide.originalPastedImage || originalSlide.imageUrl;
    // ... render title, image, bullets
  });

  doc.save(`${sanitizedTitle} - Script Version.pdf`);
}
```

### Pattern 4: Bold Key Terms via Inline Font Switching
**What:** The expanded bullets contain `**bold markers**` for key terms (per Phase 61 decision). jsPDF does not support inline markdown. Must parse `**` delimiters and switch between `doc.setFont('helvetica', 'bold')` and `doc.setFont('helvetica', 'normal')` while tracking x-position with `doc.getStringUnitWidth()`.
**When to use:** When rendering each bullet line.
**Complexity note:** This is the most complex part of the PDF export. The existing `exportService.ts` strips bold markers entirely. For script mode, preserving bold improves readability significantly. However, if implementation complexity becomes a concern, stripping `**` markers (like `pptxService.ts` line 145 does) is an acceptable fallback.
**Example:**
```typescript
// Source: jsPDF issue #819, CodePen example by AndreKelling
function renderBoldText(doc: jsPDF, text: string, x: number, y: number) {
  const parts = text.split(/(\*\*.*?\*\*)/);
  let currentX = x;

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      const cleanText = part.slice(2, -2);
      doc.setFont('helvetica', 'bold');
      doc.text(cleanText, currentX, y);
      currentX += doc.getStringUnitWidth(cleanText) * doc.getFontSize() / doc.internal.scaleFactor;
      doc.setFont('helvetica', 'normal');
    } else {
      doc.text(part, currentX, y);
      currentX += doc.getStringUnitWidth(part) * doc.getFontSize() / doc.internal.scaleFactor;
    }
  }
}
```

### Anti-Patterns to Avoid
- **Using html2canvas for script-mode PDF:** Produces blurry text, fails PDF-02. The success criteria explicitly require vector text rendering.
- **Rendering React components to capture:** The data is plain strings (`expandedBullets[]`), not React components. Building a hidden React render pipeline adds complexity for no benefit.
- **Mutating original slides:** The `ColleagueTransformationResult` is already separate from the slide state. Never modify `slides[]` during export.
- **Creating a single monolithic function:** Follow the existing exportService.ts pattern -- extract rendering helpers (renderTitle, renderImage, renderBullets, renderCueMarker) for maintainability.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text wrapping for long bullets | Custom word-wrap algorithm | `doc.splitTextToSize(text, maxWidth)` | jsPDF handles font metrics, word boundaries, and Unicode correctly |
| Page dimensions and margins | Hardcoded pixel values | `PDF_CONFIG` object from exportService.ts | Already battle-tested, includes A4 dimensions and binding margins |
| Image format detection | Regex-based format sniffing | jsPDF auto-detection via `addImage(dataUrl, ...)` | jsPDF parses the data URL prefix to determine format automatically |
| File download trigger | Manual blob URL creation | `doc.save(filename)` | jsPDF handles blob creation and download link injection |

**Key insight:** The existing `exportService.ts` solved all the hard PDF layout problems (page breaks, text wrapping, margin handling, multi-element rendering). The script PDF needs to reuse these patterns, not reinvent them.

## Common Pitfalls

### Pitfall 1: Bold Marker Width Miscalculation
**What goes wrong:** When rendering inline bold text, `splitTextToSize()` calculates widths using the CURRENT font (normal), but bold text is wider. Lines that fit in normal weight overflow when bold segments are rendered.
**Why it happens:** `splitTextToSize()` does not account for font changes mid-line.
**How to avoid:** Two options: (A) Strip `**` markers before `splitTextToSize()`, render entire line, then manually bold specific words within the already-wrapped lines. (B) Accept slight imprecision -- at 11pt font size, the bold/normal width difference is ~5%, rarely causing visible overflow.
**Warning signs:** Bullet text extending past the right margin for lines containing bold terms.

### Pitfall 2: Base64 Image Sizing Without Aspect Ratio Preservation
**What goes wrong:** `doc.addImage()` stretches the image to fill the specified width and height, distorting non-16:9 images (especially pasted slide images with arbitrary aspect ratios).
**Why it happens:** jsPDF's `addImage()` does not have a `sizing: "contain"` option like PptxGenJS. It uses the exact w/h you provide.
**How to avoid:** Load the base64 image into an `Image()` element to read `naturalWidth`/`naturalHeight`, then calculate proportional dimensions that fit within the allocated space while preserving aspect ratio.
**Warning signs:** Distorted thumbnails, especially for pasted slides that may be portrait-oriented or non-standard dimensions.

### Pitfall 3: Large Base64 Images Causing PDF File Size Explosion
**What goes wrong:** Each slide image as a full-resolution PNG base64 string can be 200KB-1MB. A 20-slide deck produces a 10-20MB PDF.
**Why it happens:** jsPDF embeds the full-resolution image data. No automatic compression.
**How to avoid:** Before embedding, resize images to a maximum width suitable for the thumbnail size (e.g., 400px for a 50mm thumbnail) and re-encode as JPEG at 80% quality using a canvas element.
**Warning signs:** Exported PDFs larger than 5MB for typical decks.

### Pitfall 4: Cue Markers Not Visually Distinguished
**What goes wrong:** The expanded bullets contain cue markers like `[Discussion point]`, `[Activity]`, `[Question]`, `[Answer]` from Phase 61. If rendered as plain text, they blend into the bullet content and colleagues miss interaction cues.
**Why it happens:** jsPDF renders all text identically unless explicitly styled differently.
**How to avoid:** Parse cue markers and render them with visual distinction -- italic font, indented, or with a colored left border (like exportService.ts does for questions at lines 129-148).
**Warning signs:** Cue markers appearing as ordinary bullet text with no visual hierarchy.

### Pitfall 5: Page Break Splitting a Slide's Content Across Pages
**What goes wrong:** A slide with many expanded bullets starts near the bottom of a page. Title and image are on page 1, but bullets continue on page 2 without any context about which slide they belong to.
**Why it happens:** The page-break check happens per-line, not per-slide. If a slide has 10 bullets and only 3 fit on the current page, the remaining 7 appear on the next page without a title reference.
**How to avoid:** When a page break occurs mid-slide, add a continuation header at the top of the new page: "Slide N (continued)" or reprint the slide title in a smaller font.
**Warning signs:** Orphaned bullet points on a new page with no slide context.

## Code Examples

Verified patterns from the existing codebase and official sources:

### PDF Configuration (reuse from exportService.ts)
```typescript
// Source: exportService.ts lines 27-36
export const PDF_CONFIG = {
  pageWidth: 210,      // A4 width in mm
  pageHeight: 297,     // A4 height in mm
  marginLeft: 25,      // Extra for binding/hole-punching
  marginRight: 15,
  marginTop: 20,
  marginBottom: 20,
  get contentWidth() { return this.pageWidth - this.marginLeft - this.marginRight; },
  get pageBottom() { return this.pageHeight - this.marginBottom; }
};
```

### jsPDF addImage with Base64 Data URL
```typescript
// Source: jsPDF addImage docs (https://artskydj.github.io/jsPDF/docs/module-addImage.html)
// jsPDF accepts full data URLs (data:image/png;base64,...) directly
const imageSource = originalSlide.originalPastedImage || originalSlide.imageUrl;
if (imageSource) {
  // addImage auto-detects format from data URL prefix
  doc.addImage(imageSource, marginLeft + contentWidth - thumbWidth, y, thumbWidth, thumbHeight);
}
```

### Aspect-Ratio-Safe Image Embedding
```typescript
// Must calculate proportional dimensions manually -- jsPDF has no "contain" mode
function getProportionalDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { w: number; h: number } {
  const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
  return { w: imgWidth * ratio, h: imgHeight * ratio };
}

// Usage: load image to get natural dimensions
function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
```

### ShareModal Download Handler Wiring
```typescript
// Source: ShareModal.tsx lines 104-122 (existing PPTX handler pattern)
// PDF handler follows the same pattern:
const handleDownload = () => {
  if (!transformResult) return;

  setPhase('exporting');

  setTimeout(() => {
    try {
      if (selectedFormat === 'pptx') {
        exportScriptPptx(slides, transformResult, lessonTitle);
      } else {
        exportScriptPdf(slides, transformResult, lessonTitle);
      }
      addToast(`Script version downloaded as ${selectedFormat.toUpperCase()}!`, 3000, 'success');
      onClose();
    } catch (error) {
      console.error('[ShareModal] Export failed:', error);
      addToast('Export failed. Please try again.', 5000, 'error');
      setPhase('preview');
    }
  }, 50);
};
```

### Rendering Slide Number Badge / Header
```typescript
// Source: exportService.ts lines 302-305 (level badge pattern)
// Slide number as context header for each page
doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.setTextColor(150);
doc.text(`Slide ${transformed.slideIndex + 1}`, marginLeft, marginTop);
doc.setTextColor(0);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas -> JPEG -> jsPDF (ExportModal) | jsPDF native text + addImage (exportService) | Already in codebase | Vector text, smaller files, searchable content |
| jsPDF v3.x | jsPDF v4.0.0 | 2025 | Security-only changes, no API differences for browser use |

**Deprecated/outdated:**
- `doc.setFontType()` -- replaced by `doc.setFont(fontName, fontStyle)` in jsPDF v2+. The codebase already uses the current API.

## PDF Layout Specification

### Recommended Page Layout (A4 Portrait)

```
+-----------------------------------------------------------+
| [margin-top: 20mm]                                        |
|                                                           |
| Slide 3                              +-----------+        |
| SLIDE TITLE HERE                     | thumbnail |        |
| (18pt bold)                          | 50x38mm   |        |
|                                      +-----------+        |
|                                                           |
| * Expanded bullet point one that may wrap across          |
|   multiple lines with **bold key terms** inline           |
|                                                           |
| * Another expanded bullet with teaching guidance          |
|                                                           |
| [Discussion point] A marker rendered in italic with       |
|   visual distinction from regular bullets                 |
|                                                           |
| * More bullet content continuing down the page            |
|                                                           |
|                                                           |
| [margin-bottom: 20mm]                                     |
+-----------------------------------------------------------+
```

### Layout Dimensions
| Element | Position | Size | Font |
|---------|----------|------|------|
| Slide number | top-left, (25mm, 20mm) | 10pt | Helvetica normal, gray |
| Title | below number, (25mm, 26mm) | 16pt | Helvetica bold, dark |
| Thumbnail | top-right, aligned with title | 50mm x 38mm max | n/a |
| Bullets start | below title + thumbnail, (25mm, ~68mm) | 11pt | Helvetica normal |
| Bullet indent | 5mm from marginLeft | | |
| Line spacing | 6mm per line | | |
| Bullet spacing | 4mm extra between bullets | | |
| Cue markers | 5mm indent, italic | 10pt | Helvetica italic, colored |

### Page Behavior
- **One slide per page** (unless slide has very few bullets -- group small slides together as a future enhancement, not Phase 64)
- **Page break mid-slide:** Add "Slide N (continued)" header at top of continuation page
- **No image:** Title gets full width (contentWidth = 170mm instead of ~115mm)
- **No speakerNotes on original slide:** Skip the slide (same as exportScriptPptx behavior)

## Integration Points

### Files to Create
| File | Purpose |
|------|---------|
| `services/pdfService.ts` | `exportScriptPdf()` function + rendering helpers |

### Files to Modify
| File | Change | Lines Affected |
|------|--------|----------------|
| `components/ShareModal.tsx` | Enable PDF button, add format-aware download handler, import exportScriptPdf | ~lines 104-122 (handleDownload), ~lines 255-259 (disabled PDF button) |

### Data Flow
```
ShareModal (user clicks Download with PDF selected)
  |
  v
exportScriptPdf(slides, transformResult, lessonTitle)
  |
  v
For each transformationResult.slides:
  1. Look up originalSlide by slideIndex
  2. Get image source (originalPastedImage || imageUrl)
  3. Render slide number + title
  4. Embed thumbnail image (with aspect ratio preservation)
  5. Render expanded bullets with bold formatting
  6. Handle page breaks with continuation headers
  |
  v
doc.save("Title - Script Version.pdf")
```

### Dependencies on Prior Phases
- **Phase 61 (AI Transformation):** Provides `ColleagueTransformationResult` with `TransformedSlide[]` containing `expandedBullets[]`, `originalTitle`, `slideIndex`
- **Phase 62 (PPTX Export):** Provides layout reference -- `exportScriptPptx()` in `pptxService.ts`
- **Phase 63 (Share Modal UI):** Provides the UI shell with format selection buttons and download flow

## Open Questions

1. **Bold marker rendering: full inline support or strip?**
   - What we know: jsPDF requires manual font switching per text segment for inline bold. The width calculations add ~30 lines of complexity.
   - What's unclear: Whether the visual benefit of bold key terms justifies the implementation complexity.
   - Recommendation: Implement inline bold support. The expansion bullets specifically use `**bold key terms**` (per Phase 61-01 decision) to aid readability. Stripping them degrades the output. If it proves too complex during implementation, fall back to stripping markers.

2. **Image compression before embedding?**
   - What we know: Full-resolution base64 PNGs inflate PDF size significantly.
   - What's unclear: Exact file sizes for typical Cue decks.
   - Recommendation: Implement canvas-based JPEG re-encoding at 80% quality and max 400px width for thumbnails. This is a ~10-line utility function. Include it in the initial implementation rather than deferring.

## Sources

### Primary (HIGH confidence)
- `services/exportService.ts` -- Proven jsPDF native text rendering with page breaks, bullets, headers (280 lines)
- `services/pptxService.ts` -- `exportScriptPptx()` data flow pattern for consuming `ColleagueTransformationResult`
- `services/aiProvider.ts` -- `ColleagueTransformationResult` and `TransformedSlide` type definitions
- `components/ShareModal.tsx` -- Current UI with disabled PDF button, download handler pattern
- [jsPDF addImage docs](https://artskydj.github.io/jsPDF/docs/module-addImage.html) -- base64 data URL support confirmed

### Secondary (MEDIUM confidence)
- [jsPDF issue #819](https://github.com/parallax/jsPDF/issues/819) -- Mixed bold/normal text workaround pattern
- [jsPDF split_text_to_size docs](https://artskydj.github.io/jsPDF/docs/module-split_text_to_size.html) -- Text wrapping API
- [jsPDF mixed bold CodePen](https://codepen.io/AndreKelling/pen/BaoLWao) -- Inline font switching reference implementation

### Tertiary (LOW confidence)
- None. All findings verified against codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - jsPDF ^4.0.0 already installed and proven in codebase
- Architecture: HIGH - directly mirrors existing exportService.ts + pptxService.ts patterns
- Pitfalls: HIGH - identified from codebase analysis and prior v4.1 pitfalls research
- Layout specification: MEDIUM - dimensions are derived from existing PDF_CONFIG and PPTX layout, but may need tuning during implementation
- Bold marker rendering: MEDIUM - pattern is documented but not yet proven in this codebase

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable domain, no fast-moving dependencies)
