# Phase 62: PPTX Export - Research

**Researched:** 2026-02-08
**Domain:** PPTX generation with PptxGenJS, script-mode slide layout, base64 image embedding
**Confidence:** HIGH

## Summary

Phase 62 exports the AI-transformed talking-point bullets (from Phase 61's `transformForColleague` service) as a downloadable PowerPoint file. The transformation data is already available as `TransformedSlide[]` with `expandedBullets: string[]` per slide. The PPTX generation uses PptxGenJS 3.12.0 already loaded via CDN (`window.PptxGenJS`), with an existing `pptxService.ts` that exports the standard deck. This phase creates a parallel "script version" export that uses a dedicated layout optimized for expanded text.

The core challenge is layout: the existing PPTX export uses fontSize 24 with a 45% text width (split layout with image), which will overflow badly with expanded talking-point bullets that are 3-5x longer than the original brief content bullets. The solution is a dedicated script-mode layout with reduced font size (16-18pt), full-width text area, and the slide image repositioned as a smaller reference thumbnail in the top-right corner.

Key decisions: (1) keep the image as a small thumbnail rather than a full-size companion -- the expanded text is the primary content; (2) use PptxGenJS `fit: 'shrink'` as a safety net for slides with unusually long bullets; (3) place the original slide title prominently for topic orientation; (4) filename follows the pattern `{deckTitle} - Script Version.pptx`.

**Primary recommendation:** Create a new `exportScriptPptx` function in `pptxService.ts` that takes `slides: Slide[]`, `transformedSlides: TransformedSlide[]`, and `title: string`. Use a dedicated layout with 16pt body text, image thumbnail (2.5x1.9 inches, top-right), title at top, and expanded bullets below. Use `fit: 'shrink'` to prevent overflow on edge cases.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PptxGenJS | 3.12.0 (CDN) | PPTX file generation | Already loaded via `index.html` as `window.PptxGenJS`. Working pattern in existing `pptxService.ts` |
| TransformedSlide (Phase 61) | N/A | Source data for expanded bullets | `ColleagueTransformationResult.slides` provides per-slide `expandedBullets: string[]` with `slideIndex` for mapping |
| Slide (types.ts) | N/A | Source data for images and titles | `slide.imageUrl` (base64), `slide.title`, `slide.originalPastedImage` for image source |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Blob + URL.createObjectURL | Native | File download trigger | Fallback if `pptx.writeFile()` fails (unlikely) |
| React state | 19.2.0 | Loading state during export | Show progress/spinner in caller component |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PptxGenJS (CDN) | pptxgenjs (npm) | Would create duplicate. CDN version already loaded and working. Migration out of scope. |
| PptxGenJS addText API | html2canvas rasterization | Rasterization produces blurry text at reading distance. Native text is vector, crisp, and searchable in PowerPoint. |
| Single export function | New service file | Extending `pptxService.ts` keeps PPTX concerns in one place. A new file would scatter related logic. |

**Installation:**
```bash
# No new installations required. PptxGenJS 3.12.0 already loaded via CDN in index.html.
```

## Architecture Patterns

### Recommended Project Structure
```
services/
  pptxService.ts          # MODIFY: add exportScriptPptx() alongside existing exportToPowerPoint()
components/
  (caller component)      # Phase 63 will add the UI - this phase just creates the export function
```

### Pattern 1: Script-Mode PPTX Layout
**What:** A dedicated slide layout optimized for expanded talking-point bullets with a reference image thumbnail.
**When to use:** Every slide in the script-mode export.
**Layout specification:**

```
+------------------------------------------+
|  Title (18pt bold, top-left)    [Image]  |
|                                 2.5x1.9" |
+------------------------------------------+
|                                          |
|  * Expanded bullet 1 (16pt)             |
|    Two to four sentences of context...   |
|                                          |
|  * Expanded bullet 2 (16pt)             |
|    Two to four sentences of context...   |
|                                          |
|  * Expanded bullet 3 (16pt)             |
|    ...                                   |
|                                          |
+------------------------------------------+
| (Speaker notes: original speakerNotes)   |
+------------------------------------------+
```

**Dimensions (16:9, inches):**
- Slide: 10" x 5.63" (LAYOUT_16x9)
- Title: x=0.5, y=0.3, w=6.5, h=0.6, fontSize=18, bold
- Image: x=7.2, y=0.3, w=2.5, h=1.9, sizing=contain
- Bullets: x=0.5, y=1.3, w=9.0 (no image) or w=6.5 (with image visible), h=4.0, fontSize=16

**Example:**
```typescript
// Source: Adapted from existing pptxService.ts patterns + PptxGenJS docs
function addScriptSlide(
  pptx: any,
  slide: Slide,
  transformed: TransformedSlide
): void {
  const pptSlide = pptx.addSlide();

  // Light background for readability
  pptSlide.background = { color: 'FFFFFF' };

  // Title
  pptSlide.addText(transformed.originalTitle, {
    x: 0.5,
    y: 0.3,
    w: 6.5,
    h: 0.6,
    fontSize: 18,
    fontFace: 'Arial',
    color: '1e293b',
    bold: true,
    valign: 'top',
  });

  // Image thumbnail (if available)
  const hasImage = !!slide.imageUrl;
  if (hasImage) {
    pptSlide.addImage({
      data: slide.imageUrl,
      x: 7.2,
      y: 0.3,
      w: 2.5,
      h: 1.9,
      sizing: { type: 'contain', w: 2.5, h: 1.9 },
    });
  }

  // Expanded talking-point bullets
  const bulletTextRuns = transformed.expandedBullets.map(bullet => ({
    text: bullet,
    options: { breakLine: true },
  }));

  pptSlide.addText(bulletTextRuns, {
    x: 0.5,
    y: 1.3,
    w: hasImage ? 6.5 : 9.0,
    h: 4.0,
    fontSize: 16,
    fontFace: 'Arial',
    color: '334155',
    bullet: true,
    paraSpaceBefore: 6,
    lineSpacingMultiple: 1.15,
    valign: 'top',
    fit: 'shrink', // Safety net: shrink text if it overflows
  });

  // Original speaker notes as reference
  if (slide.speakerNotes) {
    pptSlide.addNotes(
      'Original teleprompter script:\n\n' + slide.speakerNotes
    );
  }
}
```

### Pattern 2: Slide Mapping (TransformedSlide to Slide)
**What:** Map transformed slides back to their original Slide objects using `slideIndex`.
**When to use:** Every export operation -- need both the original slide (for image, title) and the transformed data (for expanded bullets).
**Example:**
```typescript
// Source: TransformedSlide.slideIndex maps to slides array
function exportScriptPptx(
  slides: Slide[],
  transformedSlides: TransformedSlide[],
  title: string
): void {
  if (!window.PptxGenJS) {
    alert('PowerPoint generator library not loaded.');
    return;
  }

  const pptx = new window.PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = `${title} - Script Version`;

  for (const transformed of transformedSlides) {
    const originalSlide = slides[transformed.slideIndex];
    if (!originalSlide) continue; // Safety check

    addScriptSlide(pptx, originalSlide, transformed);
  }

  // Filename: "{deck title} - Script Version.pptx"
  const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '').trim() || 'Lesson';
  pptx.writeFile({ fileName: `${sanitizedTitle} - Script Version.pptx` });
}
```

### Pattern 3: File Download via PptxGenJS
**What:** PptxGenJS's `writeFile()` handles the download trigger natively.
**When to use:** Always -- this is the standard PptxGenJS download method.
**Example:**
```typescript
// Source: Existing pptxService.ts line 81
pptx.writeFile({ fileName: `${title || 'Lesson'}.pptx` });
// Returns a Promise<string> that resolves to the filename
```

### Pattern 4: Handling Slides Without Images
**What:** Some slides may not have `imageUrl` (e.g., no AI image generation happened). Expand text width to use full slide.
**When to use:** When `!slide.imageUrl`.
**Example:**
```typescript
// Text width adjusts based on image presence
const textWidth = hasImage ? 6.5 : 9.0;
```

### Pattern 5: Handling Pasted Slides
**What:** Pasted slides have `originalPastedImage` (full data URL of the original pasted image). Use this for the thumbnail since it's the "real" slide content.
**When to use:** When `slide.originalPastedImage` exists.
**Example:**
```typescript
const imageSource = slide.originalPastedImage || slide.imageUrl;
if (imageSource) {
  pptSlide.addImage({
    data: imageSource,
    x: 7.2, y: 0.3, w: 2.5, h: 1.9,
    sizing: { type: 'contain', w: 2.5, h: 1.9 },
  });
}
```

### Anti-Patterns to Avoid
- **Reusing the existing pptxService layout for script mode:** The existing layout uses fontSize 24 with 45% width -- expanded bullets will overflow immediately. Must use dedicated script-mode layout.
- **Omitting `fit: 'shrink'`:** Without this, slides with 6-7 long bullets will clip text at the bottom of the text box.
- **Putting expanded bullets in speaker notes:** The whole point is that bullets are ON-SLIDE for the colleague to read while presenting. Speaker notes are supplementary.
- **Mutating original Slide objects:** The export must use `TransformedSlide` data for bullets but never modify the in-app slide state.
- **Using the content array instead of expandedBullets:** `slide.content` has the original brief bullets. `transformed.expandedBullets` has the expanded talking points. Use the transformed data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PPTX file format | Manual XML/ZIP construction | PptxGenJS `writeFile()` | OOXML format is complex (XML inside ZIP). PptxGenJS handles all of it. |
| Image embedding | Manual base64 to binary conversion | PptxGenJS `addImage({ data: ... })` | PptxGenJS accepts data URLs directly, handles encoding internally. |
| Text overflow handling | Manual text measurement + splitting | PptxGenJS `fit: 'shrink'` | PowerPoint natively shrinks text on overflow when this XML flag is set. |
| File download | Manual Blob + anchor click | PptxGenJS `writeFile()` | Handles download trigger cross-browser. |
| Bullet formatting | Manual numbered list construction | PptxGenJS `bullet: true` + `breakLine: true` | Built-in bullet rendering with proper PowerPoint XML. |
| Filename sanitization | Complex regex | Simple character stripping of `<>:"/\|?*` | PowerPoint-illegal characters are a short known set. |

**Key insight:** PptxGenJS handles all the OOXML complexity. The work is choosing the right layout parameters (position, size, font) and wiring the data correctly.

## Common Pitfalls

### Pitfall 1: Text Overflow on Content-Dense Slides
**What goes wrong:** Expanded bullets overflow the text box, text gets clipped at the bottom.
**Why it happens:** Each expanded bullet is 2-4 sentences. With 5-7 bullets per slide at fontSize 16, the total can easily exceed 4 inches of vertical space.
**How to avoid:** Use `fit: 'shrink'` on the text box (PptxGenJS v3.12.0 supports this). This tells PowerPoint to shrink font size on overflow. Additionally, keep fontSize at 16 (not larger), use paraSpaceBefore: 6 (not more), and set h: 4.0 to maximize vertical space.
**Warning signs:** Bullets are cut off when opening the exported file in PowerPoint. Text area height is less than 3.5 inches.

### Pitfall 2: Image Aspect Ratio Distortion
**What goes wrong:** Slide images appear stretched or squashed in the PPTX.
**Why it happens:** PptxGenJS v3.14.0 has a documented bug (#1351) forcing base64 images to 16:9. The app uses v3.12.0 which may not have this bug, but the `sizing: { type: 'contain' }` option is essential.
**How to avoid:** Always use `sizing: { type: 'contain', w: 2.5, h: 1.9 }` which preserves aspect ratio and fits within bounds. Test with square, portrait, and landscape images.
**Warning signs:** Images look distorted in the exported PPTX. Testing only with 16:9 images that mask the issue.

### Pitfall 3: Missing Image Handling
**What goes wrong:** Slides without `imageUrl` cause errors or leave blank space in the PPTX.
**Why it happens:** Not all slides have generated images. The `imageUrl` field is optional.
**How to avoid:** Check `!!slide.imageUrl` before calling `addImage()`. When no image exists, expand text width to use full slide width (9.0 inches instead of 6.5).
**Warning signs:** Error during PPTX generation, or blank white rectangle in the top-right of the slide.

### Pitfall 4: TransformedSlide Count Mismatch
**What goes wrong:** Some slides in the original deck have no corresponding `TransformedSlide` because they were skipped (no teleprompter content).
**Why it happens:** Phase 61 skips slides with no teleprompter text. The `transformedSlides` array may be shorter than `slides` array.
**How to avoid:** Always use `transformed.slideIndex` to look up the original slide. Iterate over `transformedSlides`, not `slides`. The skipped slides should simply not appear in the export.
**Warning signs:** Index-out-of-bounds errors. Export contains blank slides. Wrong images matched to wrong bullets.

### Pitfall 5: Speaker Notes Redundancy
**What goes wrong:** The colleague sees the expanded bullets on-slide AND similar content in the PowerPoint notes pane, creating confusion about which to follow.
**Why it happens:** The existing `pptxService.ts` exports `slide.speakerNotes` to the notes pane. If the script export does the same, there's redundant content.
**How to avoid:** In the script-mode export, prefix the notes pane content with "Original teleprompter script:" to clearly distinguish it from the on-slide bullets. Alternatively, use the notes pane for supplementary info only.
**Warning signs:** Notes pane content is nearly identical to on-slide bullets.

### Pitfall 6: Filename with Illegal Characters
**What goes wrong:** `writeFile()` fails or produces a file that can't be opened.
**Why it happens:** The deck title may contain characters illegal in filenames on Windows: `< > : " / \ | ? *`.
**How to avoid:** Strip illegal characters from the title before passing to `writeFile()`. The sanitization is simple: `.replace(/[<>:"/\\|?*]/g, '').trim()`.
**Warning signs:** Export fails with a vague error on Windows. File downloads but can't be opened.

### Pitfall 7: PptxGenJS Not Loaded
**What goes wrong:** `window.PptxGenJS` is undefined, export fails silently.
**Why it happens:** CDN script tag may fail to load (network issues, CDN downtime).
**How to avoid:** Check `window.PptxGenJS` at the start of the export function. Show a user-facing error message if the library isn't loaded.
**Warning signs:** Export button does nothing. Console error about `PptxGenJS` being undefined.

## Code Examples

### Complete exportScriptPptx Function
```typescript
// Source: Adapted from pptxService.ts patterns + PptxGenJS API docs
import { Slide } from '../types';
import { TransformedSlide, ColleagueTransformationResult } from './aiProvider';

export const exportScriptPptx = (
  slides: Slide[],
  transformationResult: ColleagueTransformationResult,
  title: string
): void => {
  if (!window.PptxGenJS) {
    alert('PowerPoint generator library not loaded.');
    return;
  }

  const pptx = new window.PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = `${title} - Script Version`;

  for (const transformed of transformationResult.slides) {
    const originalSlide = slides[transformed.slideIndex];
    if (!originalSlide) continue;

    const pptSlide = pptx.addSlide();
    pptSlide.background = { color: 'FFFFFF' };

    // Determine image source (pasted original takes priority)
    const imageSource = originalSlide.originalPastedImage || originalSlide.imageUrl;
    const hasImage = !!imageSource;

    // Title
    pptSlide.addText(transformed.originalTitle, {
      x: 0.5,
      y: 0.3,
      w: hasImage ? 6.5 : 9.0,
      h: 0.6,
      fontSize: 18,
      fontFace: 'Arial',
      color: '1e293b',
      bold: true,
      valign: 'top',
    });

    // Image thumbnail
    if (hasImage) {
      pptSlide.addImage({
        data: imageSource,
        x: 7.2,
        y: 0.3,
        w: 2.5,
        h: 1.9,
        sizing: { type: 'contain', w: 2.5, h: 1.9 },
      });
    }

    // Expanded talking-point bullets
    const bulletTextRuns = transformed.expandedBullets.map(bullet => ({
      text: bullet,
      options: { breakLine: true },
    }));

    pptSlide.addText(bulletTextRuns, {
      x: 0.5,
      y: 1.3,
      w: hasImage ? 6.5 : 9.0,
      h: 4.0,
      fontSize: 16,
      fontFace: 'Arial',
      color: '334155',
      bullet: true,
      paraSpaceBefore: 6,
      lineSpacingMultiple: 1.15,
      valign: 'top',
      fit: 'shrink',
    });

    // Original speaker notes as reference
    if (originalSlide.speakerNotes) {
      pptSlide.addNotes(
        'Original teleprompter script:\n\n' + originalSlide.speakerNotes
      );
    }
  }

  // Filename: "{deck title} - Script Version.pptx"
  const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '').trim() || 'Lesson';
  pptx.writeFile({ fileName: `${sanitizedTitle} - Script Version.pptx` });
};
```

### Calling From UI (Future Phase 63 Reference)
```typescript
// How Phase 63 will call this function
import { exportScriptPptx } from '../services/pptxService';

const handleExportPptx = async () => {
  if (!transformationResult) return;
  exportScriptPptx(slides, transformationResult, lessonTitle);
};
```

### TransformedSlide Data Shape (from Phase 61)
```typescript
// Source: services/aiProvider.ts lines 14-24
interface TransformedSlide {
  slideIndex: number;        // 0-indexed into original slides array
  originalTitle: string;     // Slide title for display
  expandedBullets: string[]; // 3-7 talking-point bullets, each 2-4 sentences
  slideType: string;         // 'standard' | 'elaborate' | 'work-together' | etc.
}

interface ColleagueTransformationResult {
  slides: TransformedSlide[];
  skippedCount: number;      // Slides with no teleprompter content
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `autoFit: true/false` | `fit: 'none' \| 'shrink' \| 'resize'` | PptxGenJS 3.x | Three-way control over text overflow behavior |
| `shrinkText` (deprecated) | `fit: 'shrink'` | PptxGenJS 3.3.0 | Use `fit` instead of `shrinkText` |
| Manual bullet formatting | `bullet: true` + text array | PptxGenJS 3.x | Native bullet rendering with proper PowerPoint XML |
| npm install pptxgenjs | CDN script tag | Project decision | Cue loads PptxGenJS via CDN -- do not add npm version |

**Deprecated/outdated:**
- **`shrinkText`:** Deprecated in PptxGenJS 3.3.0. Use `fit: 'shrink'` instead.
- **`autoFit: true`:** Still works but `fit: 'resize'` is the modern equivalent.
- **html2canvas for PPTX text:** Never appropriate -- PPTX supports vector text natively via PptxGenJS.

## Open Questions

1. **Bold formatting in bullets**
   - What we know: Phase 61 CONTEXT.md says Claude can bold key terms. The `expandedBullets` strings may contain `**bold**` markdown formatting.
   - What's unclear: Whether PptxGenJS text runs should parse markdown bold into separate text run objects with `bold: true`.
   - Recommendation: For Phase 62, treat `expandedBullets` as plain text. If bold terms exist as `**term**`, strip the `**` markers. Implementing markdown-to-PptxGenJS text-run parsing adds complexity with low payoff. If desired later, it's a small enhancement.

2. **Slide type indicators**
   - What we know: `TransformedSlide.slideType` distinguishes standard, work-together, class-challenge, etc.
   - What's unclear: Whether the PPTX should visually indicate slide type (e.g., a "[Group Activity]" badge).
   - Recommendation: Do not add visual slide type indicators in Phase 62. The expanded bullets from Phase 61 already include `[Activity: ...]` and `[Discussion point: ...]` cues in the text itself. Adding a visual badge is a Phase 63 (UI) concern, not an export concern.

3. **Text area height for content-dense slides**
   - What we know: Layout gives h=4.0 inches for bullets. With 7 bullets at 3 lines each at 16pt, that's about 21 lines = ~5.25 inches needed (at ~0.25" per line with spacing).
   - What's unclear: Whether `fit: 'shrink'` reduces to a readable minimum size.
   - Recommendation: PowerPoint's shrink-to-fit typically stops at around 8pt (unreadable). Test with a worst-case slide (7 long bullets) and if the result is unreadable, consider reducing default fontSize to 14 or reducing paraSpaceBefore. The h=4.0 with 16pt handles most realistic cases (5 bullets * 2 lines = 10 lines = ~2.5 inches).

4. **Large file sizes with many images**
   - What we know: Each base64 image is 200KB-1MB. A 20-slide deck produces 4-20MB PPTX.
   - What's unclear: Whether this is a problem for teachers sharing via email.
   - Recommendation: Accept current file sizes for Phase 62. Image compression optimization is a future enhancement. PptxGenJS JPEG embedding (`data:image/jpeg;base64,...`) is inherently smaller than PNG.

## Sources

### Primary (HIGH confidence)
- **Codebase: `services/pptxService.ts`** -- Existing PPTX export function, PptxGenJS usage patterns, image embedding, speaker notes
- **Codebase: `services/aiProvider.ts`** -- TransformedSlide and ColleagueTransformationResult interfaces (lines 14-24, 394-398)
- **Codebase: `types.ts`** -- Slide interface with imageUrl, originalPastedImage, title, speakerNotes, layout, slideType
- **Codebase: `index.html`** -- PptxGenJS 3.12.0 loaded via CDN script tag (line 27)
- **Codebase: `App.tsx`** -- lessonTitle state (line 312), existing exportToPowerPoint call (line 2052)
- **Phase 61 VERIFICATION.md** -- Confirmed Phase 61 complete, TransformedSlide type verified, both providers implemented

### Secondary (MEDIUM confidence)
- [PptxGenJS Text API Docs](https://gitbrent.github.io/PptxGenJS/docs/api-text.html) -- `fit`, `fontSize`, `bullet`, `breakLine`, `paraSpaceBefore`, `valign`, `fontFace` options
- [PptxGenJS Images API Docs](https://gitbrent.github.io/PptxGenJS/docs/api-images/) -- `addImage({ data, sizing: { type: 'contain' } })` pattern
- [PptxGenJS TypeScript definitions](https://github.com/gitbrent/PptxGenJS/blob/master/types/index.d.ts) -- Full TextPropsOptions interface confirming `fit: 'shrink'` support
- [PptxGenJS autoFit Issue #330](https://github.com/gitbrent/PptxGenJS/issues/330) -- Confirmed `fit: 'shrink'` is the "Shrink text on overflow" equivalent
- [PptxGenJS Image Bug #1351](https://github.com/gitbrent/PptxGenJS/issues/1351) -- Base64 image 16:9 forcing bug in v3.14.0 (Cue uses v3.12.0)

### Tertiary (LOW confidence)
- Prior research: `.planning/research/STACK-v4.1-script-mode-export.md` -- Confirmed zero new dependencies needed, PptxGenJS sufficient
- Prior research: `.planning/research/PITFALLS-script-mode-export.md` -- Comprehensive pitfall analysis for script-mode export domain

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- PptxGenJS already in codebase, TransformedSlide type already defined, no new deps
- Architecture: HIGH -- Follows existing pptxService.ts patterns exactly. Layout dimensions derived from PPTX standard 16:9 format.
- Pitfalls: HIGH -- Pitfalls sourced from prior research document, codebase analysis, and PptxGenJS GitHub issues

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days -- PptxGenJS 3.12.0 is pinned, patterns stable)
