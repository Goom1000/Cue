# Phase 57: Image Paste - Research

**Researched:** 2026-02-07
**Domain:** Browser Clipboard/DragDrop APIs, Image Processing, Slide Layout System Extension
**Confidence:** HIGH

## Summary

Phase 57 adds direct image paste and drag-drop to create full-image slides. The existing codebase provides almost all the infrastructure needed: the `usePaste` hook already extracts `imageBlob` from clipboard events, `useDragDrop` handles window-level file drops, the `FullImageLayout` renderer already shows images edge-to-edge, and the `analyzePastedSlide()` AI pipeline can be adapted for caption generation.

The primary work is **routing and UX**: detecting image-only pastes (currently always create new slides), adding a prompt for "new slide vs replace", extending the drag-drop hook to accept image files (currently only `.cue` files), adding "Full Image" as a user-selectable layout in the tile selector dropdown, and creating a lighter-weight AI caption method.

**Key Insight:** Phase 56 already solved the hardest problem - pasted slide images display as full-image layout with AI content driving the teleprompter. Phase 57 is essentially widening the input funnel (any image, not just PowerPoint) and adding drag-drop + explicit Full Image layout selection.

**Primary recommendation:** Extend existing hooks and handlers rather than creating new ones. Modify `usePaste` to route image-only pastes to a new prompt flow. Extend `useDragDrop` to accept image MIME types. Add `analyzeImage()` to `AIProviderInterface` as a lighter-weight variant of `analyzePastedSlide()`. Add "Full Image" to the layout `<select>` in SlideCard (it already exists but only for AI-assigned layouts).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | ^19.2.0 | UI framework, state management | Already installed; useCallback/useState for paste/drop handlers |
| Native Clipboard API | Browser built-in | Image paste from clipboard | Already used in `usePaste.ts`; `clipboardData.items` provides image blobs |
| Native Drag and Drop API | Browser built-in | File drag-drop from OS | Already used in `useDragDrop.ts`; `dataTransfer.files` provides image files |
| Native Canvas API | Browser built-in | Image compression/resizing | Already used in `imageProcessor.ts` and PDF processing; `canvas.toDataURL()` for size reduction |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @google/genai | ^1.30.0 | Gemini vision for AI captions | Already installed; reuse vision API pattern from `analyzePastedSlide()` |
| Anthropic Claude API | Direct fetch | Claude vision for AI captions | Already integrated; same vision API pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Clipboard API | `navigator.clipboard.read()` (Async Clipboard API) | Async API requires permission dialog; native paste event already works and is proven in Phase 55 |
| Custom prompt modal | Toast with action buttons | Modal is heavier UX; toast with buttons fits existing design language and is less intrusive |
| New `analyzeImage()` method | Reuse `analyzePastedSlide()` directly | analyzePastedSlide prompts for slide text extraction; image caption needs different prompts (describe + teaching tips) |
| Canvas-based compression | Sharp/browser-image-compression library | Canvas API is already used throughout the codebase; no new dependency needed |

**Installation:**
```bash
# No new dependencies needed - all libraries already installed
```

## Architecture Patterns

### Existing Codebase Structure (Relevant Files)
```
hooks/
  usePaste.ts          # Window-level paste event handling (EXTEND)
  useDragDrop.ts       # Window-level drag-drop for .cue files (EXTEND)
components/
  SlideCard.tsx        # Slide editing with layout dropdown (EXTEND)
  SlideRenderers.tsx   # FullImageLayout already exists (MINOR EXTEND)
  PasteComparison.tsx  # AI notes display for pasted slides (REUSE)
  Toast.tsx            # Toast with action buttons (REUSE)
services/
  aiProvider.ts        # AIProviderInterface (ADD analyzeImage method)
  slideAnalysis/       # Prompts for slide analysis (ADD image caption prompts)
  providers/
    geminiProvider.ts  # Gemini implementation (ADD analyzeImage)
    claudeProvider.ts  # Claude implementation (ADD analyzeImage)
App.tsx                # handlePasteSlide, InsertPoint, layout selector (EXTEND)
types.ts               # Slide interface (MINOR: no changes needed)
```

### Pattern 1: Paste Routing with Action Prompt
**What:** When user pastes an image, show a toast asking "Add as new slide" or "Replace current slide's image"
**When to use:** Every image-only paste (no HTML)
**How it works:**
The `usePaste` hook already extracts `imageBlob` from clipboard. Currently, image-only pastes always create new slides. Phase 57 adds a routing step:

```typescript
// Source: Existing pattern in App.tsx handlePasteSlide + Toast.tsx action support
// Toast already supports action buttons via ToastAction interface

// Step 1: Read image blob as data URL (existing readBlobAsDataUrl helper)
const imageDataUrl = await readBlobAsDataUrl(result.imageBlob);

// Step 2: Show toast with two actions
// ToastAction already supports { label: string; onClick: () => void }
// Need to extend Toast to support TWO actions (currently supports one)
// Alternative: Use a small inline prompt component positioned near the toast area

addToast('Image pasted', 5000, 'info', {
  label: 'New Slide',
  onClick: () => createImageSlide(imageDataUrl)
});
// Problem: Toast only supports ONE action currently.
// Solution A: Extend Toast to support multiple actions
// Solution B: Use a mini-modal/popover instead of toast
// Solution C: Default to "new slide", toast offers "Replace instead?"
// Recommendation: Solution C — simplest, matches paste-first flow
```

**Codebase evidence:**
- `Toast.tsx` line 9-12: `ToastAction` interface with `label` and `onClick`
- `App.tsx` line 908-1077: `handlePasteSlide` callback with image handling
- `usePaste.ts` line 74-81: Image blob extraction from clipboard items

### Pattern 2: Drag-Drop Extension for Image Files
**What:** Extend `useDragDrop` to accept image files in addition to `.cue` files
**When to use:** When user drops image file from Finder/Explorer onto the app

```typescript
// Source: Existing useDragDrop.ts pattern
// Current: Only accepts .cue and .pipi files (line 39)
// Phase 57: Accept image files too

// Option A: Add image callback to useDragDrop
export function useDragDrop(
  onFile: (file: File) => void,
  enabled: boolean = true,
  onInvalidFile?: (file: File) => void,
  onImageFile?: (file: File) => void  // NEW
): void {
  // In handleDrop:
  const isImage = file.type.startsWith('image/');
  if (isImage && onImageFile) {
    onImageFile(file);
    return;
  }
  // ... existing .cue handling
}

// Option B: Separate hook (useImageDrop) — more modular but more code
// Recommendation: Option A — single drop handler avoids conflicts
```

**Codebase evidence:**
- `useDragDrop.ts` lines 32-44: Current drop handler checks `.cue`/`.pipi` extension
- `uploadService.ts` line 15-20: ACCEPTED_TYPES includes image MIME types
- App.tsx lines 1365-1371: useDragDrop call site with onFile and onInvalidFile callbacks

### Pattern 3: Full Image Layout in Tile Selector
**What:** Add "Full Image" as a selectable option in the layout dropdown
**When to use:** Any slide, not just pasted images — teachers can set any slide to Full Image

```typescript
// Source: SlideCard.tsx lines 87-98 — existing layout selector
<select
  value={slide.layout}
  onChange={(e) => onUpdate(slide.id, { layout: e.target.value as any })}
>
  <option value="split">Split Layout</option>
  <option value="full-image">Full Image</option>  {/* Already exists! */}
  <option value="flowchart">Flowchart</option>
  <option value="grid">Grid</option>
  <option value="tile-overlap">Tile Overlap</option>
</select>
// NOTE: "full-image" is ALREADY in the dropdown (line 94).
// But when selected on a slide with no image, it shows empty.
// Phase 57 needs: empty state (placeholder + file picker trigger)
```

**Key finding:** The layout dropdown already includes "Full Image" as an option. The `FullImageLayout` renderer in `SlideRenderers.tsx` already renders both pasted (original image, no text) and non-pasted (image with text overlay) variants. The main gap is the **empty state** when a slide has `layout: 'full-image'` but no `imageUrl`.

### Pattern 4: AI Image Caption (Lighter-Weight)
**What:** Generate descriptive caption + teaching talking points for a pasted image
**When to use:** After image paste/drop, optionally (teacher can skip)

```typescript
// Source: Existing analyzePastedSlide in providers (geminiProvider.ts line 389, claudeProvider.ts line 1663)
// analyzePastedSlide extracts title + bullets + speakerNotes + layout + theme
// Image caption is simpler: just description + teaching tips -> speakerNotes

// New method on AIProviderInterface:
analyzeImage(
  imageBase64: string,  // Raw base64, no data URL prefix
): Promise<{ caption: string; speakerNotes: string; title: string }>;

// Prompt is much shorter than analyzePastedSlide:
// "Describe this image and suggest teaching talking points for a Year 6 class."
// Returns: title (short), caption (1-2 sentences), speakerNotes (talking points)
```

**Codebase evidence:**
- `aiProvider.ts` line 302-306: `analyzePastedSlide` interface
- `slideAnalysis/slideAnalysisPrompts.ts`: Prompt templates for slide analysis
- `geminiProvider.ts` line 389-430: Gemini implementation with responseSchema
- `claudeProvider.ts` line 1663-1720: Claude implementation with tool_choice

### Pattern 5: Image Compression Before Storage
**What:** Compress large images before storing as data URLs in slide objects
**When to use:** When pasted/dropped image exceeds size threshold

```typescript
// Source: Existing pattern in imageProcessor.ts and documentAnalysisService.ts
// Canvas-based compression pattern already used throughout codebase

function compressImage(dataUrl: string, maxDimension: number = 1920, quality: number = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}
```

**Codebase evidence:**
- `imageProcessor.ts` lines 26-36: Canvas resize/compress for thumbnails (200px max, JPEG 0.7)
- `App.tsx` line 454: PDF pages compressed to JPEG 0.8
- `pdfProcessor.ts` line 65: Same pattern for PDF page images

### Anti-Patterns to Avoid
- **Storing uncompressed screenshots as data URLs:** A Retina screenshot can be 10MB+ as base64. Always compress before storing in Slide.imageUrl. The `.cue` file stores slides as JSON — bloated images make files huge.
- **Creating a new paste hook instead of extending the existing one:** `usePaste` already extracts imageBlob. Don't create a parallel hook that also listens for paste events.
- **Separate drag-drop handler that conflicts:** Two window-level drop handlers will both fire. Extend the existing one, don't add a second.
- **Making AI caption mandatory:** Caption generation should be optional/on-demand. Not all teachers want or need AI descriptions. The image should be usable immediately without waiting for AI.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image compression | Custom compression algorithm | Native Canvas API `toDataURL('image/jpeg', quality)` | Already proven in 5+ places in the codebase; handles all web-safe formats; no dependency needed |
| Image MIME type detection | Custom magic byte checking | `file.type` + extension fallback | Already implemented in `uploadService.ts` getFileType(); browsers provide MIME from clipboard |
| Paste event handling | New clipboard listener | Extend existing `usePaste` hook | Hook already extracts HTML, text, AND imageBlob; just needs routing logic |
| Drop event handling | New drag-drop listener | Extend existing `useDragDrop` hook | Adding a second window-level drop handler would cause conflicts |
| Full-image rendering | New layout component | Extend existing `FullImageLayout` | Already renders pasted images edge-to-edge; just needs empty state |

**Key insight:** Phase 55 and 56 built 90% of the infrastructure. Phase 57 is mostly routing, UX, and wiring — not new technical capabilities.

## Common Pitfalls

### Pitfall 1: Data URL Size Explosion
**What goes wrong:** Storing uncompressed Retina screenshots as base64 data URLs bloats Slide objects. A 2880x1800 screenshot is ~5MB as PNG, ~15MB as base64 data URL. With 20 image slides, the `.cue` file becomes 300MB.
**Why it happens:** `FileReader.readAsDataURL()` preserves original resolution.
**How to avoid:** Always run images through Canvas-based compression before storing. Cap at 1920px max dimension, JPEG 0.8 quality. This reduces a 5MB screenshot to ~200KB.
**Warning signs:** `.cue` files growing beyond 10MB; slow save/load; browser memory issues.

### Pitfall 2: Conflicting Window Event Listeners
**What goes wrong:** Adding a new `window.addEventListener('drop')` alongside the existing `useDragDrop` causes both handlers to fire, leading to duplicate processing or one consuming the event before the other.
**Why it happens:** Both `useDragDrop` (for .cue files) and a new image drop handler listen on the same window event.
**How to avoid:** Extend the existing `useDragDrop` hook with an `onImageFile` callback parameter. Single handler, branching logic.
**Warning signs:** Drop events fire twice; image files trigger .cue file error toast.

### Pitfall 3: SVG Security in Pasted Content
**What goes wrong:** SVGs can contain embedded scripts. Displaying a pasted SVG as `<img src={dataUrl}>` is safe (browsers sandbox SVG in img tags), but storing SVG data URLs and later using them in other contexts (innerHTML, etc.) could be a vector.
**Why it happens:** SVG is technically XML and can contain `<script>` tags.
**How to avoid:** Always display SVGs via `<img>` tag (which sandboxes them). Never use `innerHTML` or `dangerouslySetInnerHTML` with SVG data. The current `FullImageLayout` uses `<img>` tags, which is already safe.
**Warning signs:** SVG content rendered outside of `<img>` tags.

### Pitfall 4: Paste Event Consumed Before Routing
**What goes wrong:** `e.preventDefault()` is called immediately on paste, preventing the browser from doing anything else. If the user is actually trying to paste text into a text field while the image prompt is showing, it gets swallowed.
**Why it happens:** The current `usePaste` hook calls `preventDefault` for all rich content outside text fields.
**How to avoid:** The existing text field detection in `usePaste.ts` (lines 60-63) already handles this correctly. Maintain this guard. The routing prompt should not interfere with text field paste.
**Warning signs:** Users can't paste text into inputs while the action prompt is visible.

### Pitfall 5: Image-with-HTML Paste Ambiguity
**What goes wrong:** Some clipboard content has BOTH HTML and an image (e.g., copying an image from a web page). The current code treats HTML presence as HTML paste, but the image might be the primary content.
**Why it happens:** Browsers include both `text/html` wrapper and the `image/*` item when copying images from web pages.
**How to avoid:** When both HTML and imageBlob are present, check if the HTML is just an `<img>` wrapper (common for web image copies). If the HTML is substantive (has text, bullets), treat as HTML paste. If it's just an image wrapper, treat as image paste.
**Warning signs:** Copying an image from Safari includes HTML with just an `<img>` tag; gets routed to HTML parse instead of image paste.

## Code Examples

### Reading Image from Clipboard (Already Implemented)
```typescript
// Source: hooks/usePaste.ts lines 74-81
// Already extracts image blob from clipboard items
let imageBlob: Blob | null = null;
const items = clipboardData.items;
for (let i = 0; i < items.length; i++) {
  if (items[i].type.startsWith('image/')) {
    imageBlob = items[i].getAsFile();
    break;
  }
}
```

### Converting Blob to Data URL (Already Implemented)
```typescript
// Source: App.tsx lines 896-903
const readBlobAsDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
};
```

### Full Image Layout Rendering (Already Implemented)
```typescript
// Source: components/SlideRenderers.tsx lines 82-92
// Pasted slides: show original image clean with no text overlay
if (slide.originalPastedImage) {
  return (
    <div className="w-full h-full relative overflow-hidden"
         style={{ backgroundColor: slide.backgroundColor || '#ffffff' }}>
      {slide.imageUrl && (
        <img src={slide.imageUrl} className="w-full h-full object-contain" alt={slide.title} />
      )}
    </div>
  );
}
```

### Toast with Action Button (Already Implemented)
```typescript
// Source: components/Toast.tsx lines 9-12, 33-41
export interface ToastAction {
  label: string;
  onClick: () => void;
}
// addToast supports optional action parameter:
addToast('Image pasted', 5000, 'info', { label: 'Undo', onClick: () => revert() });
```

### Drag-Drop File Handling (Already Implemented)
```typescript
// Source: hooks/useDragDrop.ts lines 32-44
const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  const isValidFile = file.name.endsWith('.cue') || file.name.endsWith('.pipi');
  if (isValidFile) {
    onFile(file);
  } else if (onInvalidFile) {
    onInvalidFile(file);
  }
};
```

### Image Compression via Canvas (Pattern in Codebase)
```typescript
// Source: Pattern from imageProcessor.ts + App.tsx line 454
// Compress to max dimension and JPEG quality
function compressImage(dataUrl: string, maxDim: number = 1920, quality: number = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      if (scale >= 1) { resolve(dataUrl); return; } // No compression needed
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `navigator.clipboard.read()` with permission prompts | `paste` event with `clipboardData` | Always (paste events) | No permission needed; direct access to clipboard data on user-initiated paste. `navigator.clipboard.read()` is async and requires permission, unnecessary when paste event provides data |
| Custom file drop zones with visible UI | Window-level `dragover`/`drop` listeners | Phase 55 pattern | "Drop anywhere" UX without visible drop zone; already implemented in `useDragDrop` |
| Separate image upload flow | Paste/drop routing to slide creation | Phase 55/56 | Images go through same flow as other paste content; no separate upload UI needed |

**Deprecated/outdated:**
- `document.execCommand('paste')` — synchronous clipboard access, deprecated in all browsers. Use paste event listeners instead (already done).
- Visible drop zones with "drag files here" message — the codebase uses invisible window-level listeners, which is the modern pattern.

## Design Recommendations (Claude's Discretion Items)

### Prompt UI Style: Toast with Default Action
**Recommendation:** Default to "new slide" (most common use case), show toast with "Replace current slide" action button. This matches the existing toast-with-action pattern.
**Rationale:** Teachers pasting screenshots most often want a new slide. Making "replace" the secondary action reduces clicks for the common case.

### Drag-Drop Interaction: Context-Aware
**Recommendation:** Drop on slide thumbnail in sidebar = replace that slide's image. Drop on empty editor area = new slide. No prompt needed for drag-drop (drop location IS the choice).
**Rationale:** Drag-drop has a spatial signal (where you drop) that paste doesn't have. Use this to avoid needing a prompt.

### Replace Behavior: Wipe to Full Image
**Recommendation:** When replacing a slide's image, switch to `full-image` layout and clear text content (matching Phase 56 pasted slide behavior). Keep original speakerNotes if they exist.
**Rationale:** If teacher drops an image onto a text slide, they want the image to be prominent. Keeping old bullets under a full-bleed image makes no sense visually.

### Full Image Empty State: Placeholder with File Picker
**Recommendation:** When `layout: 'full-image'` and no `imageUrl`, show a dashed-border placeholder with camera icon and "Paste or drop an image" text. Clicking opens a file picker for image selection.
**Rationale:** Consistent with `UploadPanel` drag-drop pattern; gives teacher a way to add image without paste/drop.

### Text Overlay on Full Image: None (Matching Phase 56)
**Recommendation:** Full Image layout when user-selected should behave same as pasted slides: pure image, no text overlay. Content drives teleprompter only.
**Rationale:** Phase 56 established this pattern for pasted slides. Consistency requires all Full Image slides to work the same way.

### AI Caption Trigger: On-Demand Button
**Recommendation:** After image paste creates a slide, show "Generate AI notes" button in the PasteComparison-style panel. Not automatic.
**Rationale:** Automatic AI calls cost money (API tokens), take time, and may be unwanted. On-demand gives teacher control. The button can live in the same location as the existing "AI Teleprompter Notes" toggle.

### AI Pipeline: Lighter-Weight Caption Method
**Recommendation:** Create new `analyzeImage()` method separate from `analyzePastedSlide()`. Different prompt: "Describe this image and suggest teaching points" rather than "Extract slide text and restructure."
**Rationale:** `analyzePastedSlide` is tuned for PowerPoint slides (extract title, bullets, layout). Image caption is conceptually different: describe what you see, suggest what to say about it.

### Multi-Image Paste: Process First Only
**Recommendation:** If clipboard contains multiple images, process only the first. Show toast "Pasted first image (1 of N)".
**Rationale:** Multi-image paste is rare and complicates the UX significantly. Keep it simple.

### Image Size Limits: 1920px Max, JPEG Compression
**Recommendation:** Compress all pasted/dropped images through Canvas: max 1920px dimension, JPEG 0.8 quality. Skip compression if image is already smaller.
**Rationale:** Retina screenshots are huge. Without compression, `.cue` files bloat. 1920px is full HD, sufficient for presentation display. Existing pattern in codebase (imageProcessor.ts, App.tsx).

### Paste Routing: Check Image Wrapper HTML
**Recommendation:** When paste has both HTML and imageBlob, check if HTML is just an `<img>` wrapper (contains only img tag, no substantive text). If so, treat as image paste. If HTML has real content, treat as HTML paste (existing flow).
**Rationale:** Copying images from web browsers wraps them in HTML. Without this check, web-copied images get routed to the wrong handler.

## Open Questions

1. **GIF Animation Preservation**
   - What we know: Canvas-based JPEG compression destroys GIF animation. `<img>` tag plays GIFs natively.
   - What's unclear: Should animated GIFs be compressed (lose animation) or stored at full size (larger files)?
   - Recommendation: Skip compression for GIF files (check MIME type). GIFs are typically smaller than screenshots anyway. If a GIF is huge (>5MB), warn the user.

2. **File Picker for Full Image Empty State**
   - What we know: The `UploadPanel` has a file picker pattern using `<input type="file" accept=".pdf,.png,.jpg,.jpeg,.docx">`.
   - What's unclear: Should the Full Image empty state use the same upload infrastructure or a simpler direct file input?
   - Recommendation: Use a simple `<input type="file" accept="image/*">` with `onChange` handler. Don't route through `uploadService.ts` (that's for resource documents, not slide images).

3. **Sidebar Thumbnail Drop Target Precision**
   - What we know: Sidebar thumbnails are small (w-64 sidebar). Drag target needs to be clear.
   - What's unclear: How to make "drop between slides" (new slide) vs "drop on slide" (replace) distinguishable in a narrow sidebar.
   - Recommendation: Drop on the editing stage (main area) targets the active slide. Drop on sidebar thumbnail targets that slide. Drop on InsertPoint between slides creates new slide. This may require drop zone handling in App.tsx rather than the global useDragDrop hook.

## Sources

### Primary (HIGH confidence)
- `hooks/usePaste.ts` — Paste hook with imageBlob extraction (verified in code)
- `hooks/useDragDrop.ts` — Drag-drop hook for .cue files (verified in code)
- `components/SlideRenderers.tsx` — FullImageLayout with pasted image branch (verified in code)
- `services/aiProvider.ts` — AIProviderInterface with analyzePastedSlide (verified in code)
- `services/slideAnalysis/slideAnalysisPrompts.ts` — AI prompts for slide analysis (verified in code)
- `App.tsx` — handlePasteSlide, InsertPoint, layout selector (verified in code)
- `components/Toast.tsx` — Toast with action button support (verified in code)
- `types.ts` — Slide interface with all relevant fields (verified in code)
- `services/documentProcessors/imageProcessor.ts` — Canvas-based image processing (verified in code)
- Phase 55 verification report — Paste infrastructure confirmation (verified in `.planning/phases/55-paste-infrastructure/55-VERIFICATION.md`)
- Phase 56 research — AI slide analysis patterns (verified in `.planning/phases/56-ai-slide-analysis/56-RESEARCH.md`)

### Secondary (MEDIUM confidence)
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) — Browser clipboard support documentation
- [MDN File Drag and Drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop) — DataTransfer API for file drops
- [MDN DataTransfer](https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer) — Drop event file access

### Tertiary (LOW confidence)
- None — all findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new libraries needed; all capabilities exist in codebase
- Architecture: HIGH — Direct extension of Phase 55/56 patterns; all touch points verified in code
- Pitfalls: HIGH — Based on direct codebase analysis and well-known browser API behaviors
- Design recommendations: MEDIUM — Based on codebase patterns and UX reasoning; not tested with users

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable — browser APIs and codebase patterns don't change fast)
