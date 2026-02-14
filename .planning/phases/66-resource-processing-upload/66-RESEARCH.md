# Phase 66: Resource Processing + Upload - Research

**Researched:** 2026-02-14
**Domain:** File processing (PPTX parsing, multi-format upload), UI composition, persistence
**Confidence:** HIGH

## Summary

Phase 66 adds supplementary resource uploads to the landing page (alongside the lesson plan PDF), builds a PPTX processor using JSZip + DOMParser (both already available -- JSZip is a project dependency and DOMParser is a browser API), enforces per-resource and total character caps, and persists resources in the .cue save file.

The codebase already has robust infrastructure for this: document processors exist for PDF, images, and DOCX in `services/documentProcessors/`; an `UploadPanel` component handles drag-drop uploads with progress feedback; an `UploadedResource` type stores extracted content; and the save/load cycle (`.cue` file format v4) already supports `enhancedResources`. The main new work is: (1) a PPTX processor, (2) landing page UI for supplementary resource attachment, (3) character-cap truncation logic, and (4) wiring persistence for landing-page resources (distinct from the post-generation ResourceHub resources).

**Primary recommendation:** Build the PPTX processor as a new file in `services/documentProcessors/pptxProcessor.ts` following the exact pattern of the existing processors. Extend the landing page with a collapsible supplementary resources section below the textarea. Introduce a new `SupplementaryResource` type (lighter than `UploadedResource`) or reuse `UploadedResource` with a content cap wrapper. Persist in `CueFileContent` as a new field.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| JSZip | ^3.10.1 | Unzip PPTX files (which are ZIP archives) | Already in `package.json`, used by `exportService.ts` |
| DOMParser | Browser API | Parse XML from PPTX slide files | Zero-dependency, available in all modern browsers |
| pdf.js | 3.11.174 (CDN) | Extract text/images from PDF resources | Already loaded via CDN in `index.html` |
| mammoth | ^1.11.0 | Extract text from DOCX resources | Already in `package.json`, used by `docxProcessor.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| FileReader API | Browser | Read uploaded files as ArrayBuffer/DataURL | All file processing paths |
| Canvas API | Browser | Generate thumbnails from PPTX slide images | PPTX image extraction |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSZip + DOMParser for PPTX | pptx-parser npm package | Would violate "no new dependencies" constraint |
| Manual XML parsing | xml2js | Would add dependency; DOMParser is sufficient for our needs |

**Installation:** No new packages needed. All dependencies already present.

## Architecture Patterns

### Recommended Project Structure
```
services/
  documentProcessors/
    pdfProcessor.ts       # (existing) PDF -> text + images
    imageProcessor.ts     # (existing) Image -> thumbnail + base64
    docxProcessor.ts      # (existing) DOCX -> text via mammoth
    pptxProcessor.ts      # (NEW) PPTX -> text + images via JSZip + DOMParser
  uploadService.ts        # (MODIFY) Add PPTX to accepted types, route to processor
  saveService.ts          # (MODIFY) Add supplementary resources to CueFile
  loadService.ts          # (MODIFY) Restore supplementary resources on load
types.ts                  # (MODIFY) Add SupplementaryResource type + extend CueFileContent
App.tsx                   # (MODIFY) Add landing page supplementary upload section + state
```

### Pattern 1: Document Processor Module
**What:** Each file type has its own processor in `services/documentProcessors/` that exports a single `processX(file: File): Promise<ProcessResult>` function.
**When to use:** For every new file type supported.
**Example (existing pattern from `docxProcessor.ts`):**
```typescript
export interface PptxProcessResult {
  thumbnail: string;      // Base64 data URL
  pageCount: number;      // Number of slides
  type: 'pptx';
  text: string;           // Extracted text content
  images?: string[];      // Extracted slide images as base64
}

export async function processPptx(file: File): Promise<PptxProcessResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  // ... parse ppt/slides/slide*.xml for text
  // ... extract ppt/media/image*.* for images
}
```

### Pattern 2: Upload Service Routing
**What:** `uploadService.ts` acts as a router -- detects file type from MIME/extension, validates, and delegates to the appropriate processor.
**When to use:** Adding new file type support.
**Key detail:** The existing `ACCEPTED_TYPES` and `EXTENSION_MAP` dictionaries need PPTX entries added. The `processUploadedFile` switch statement needs a `case 'pptx'` branch.

### Pattern 3: Landing Page State Management
**What:** App.tsx uses `useState` at the top level for all landing page form state. No state management library -- just React state + callback props.
**When to use:** For the supplementary resources state on the landing page.
**Key detail:** Resources need to be:
1. Stored in App.tsx state (e.g., `const [supplementaryResources, setSupplementaryResources] = useState<UploadedResource[]>([])`)
2. Passed to the generate handler for future pipeline injection (Phase 68)
3. Included in save/load cycle

### Pattern 4: Content Capping
**What:** Truncate extracted text to prevent token overflow in AI prompts.
**When to use:** After extraction, before storage.
**Key constraint from requirements:**
- Per-resource cap: 2,000 characters
- Total cap across all resources: 6,000 characters
- This is separate from the full content stored for ResourceHub enhancement -- the cap applies to what gets injected into generation prompts

### Anti-Patterns to Avoid
- **Duplicating the UploadPanel component:** The existing `UploadPanel` in `components/UploadPanel.tsx` already handles drag-drop, file selection, progress, error display, and resource grid. Reuse it on the landing page rather than rebuilding upload UI.
- **Storing resources in localStorage for auto-save:** The `useAutoSave` hook saves to localStorage which has a 5-10MB limit. Supplementary resources with base64 images could easily exceed this. Auto-save should either exclude resource content or store only metadata.
- **Adding PPTX as a dependency-heavy feature:** The constraint says "no new npm dependencies." Stick to JSZip (already installed) + DOMParser (browser native).

## PPTX File Format Deep Dive

### Structure of a PPTX File (HIGH confidence -- verified via OOXML spec)
A PPTX file is a ZIP archive containing:
```
[Content_Types].xml          # MIME type mappings
_rels/.rels                  # Top-level relationships
ppt/
  presentation.xml           # Master presentation definition
  _rels/presentation.xml.rels # Relationships for slides
  slides/
    slide1.xml               # Slide content (text, shapes)
    slide2.xml
    _rels/
      slide1.xml.rels        # Relationships for slide media
  media/
    image1.png               # Embedded images
    image2.jpeg
  slideMasters/              # Master slide layouts
  slideLayouts/              # Slide layout templates
```

### Extracting Text from Slide XML
Each `slide*.xml` contains text in `<a:t>` elements nested inside `<a:p>` (paragraph) elements. The namespace prefix `a:` maps to `http://schemas.openxmlformats.org/drawingml/2006/main`.

```typescript
// Parse slide XML to extract text
const parser = new DOMParser();
const doc = parser.parseFromString(xmlString, 'application/xml');
const textElements = doc.getElementsByTagNameNS(
  'http://schemas.openxmlformats.org/drawingml/2006/main', 't'
);
```

### Extracting Images from PPTX
Images live in `ppt/media/` directory. Each slide's relationships file (`ppt/slides/_rels/slideN.xml.rels`) maps `rId` references to media files:
```xml
<Relationship Id="rId2" Type="...image" Target="../media/image1.png"/>
```

To get images:
1. List all files in `ppt/media/` via JSZip
2. Read each as base64 using `zip.file(path).async('base64')`
3. Determine MIME type from extension

### Edge Cases (from phase description)
- **SmartArt:** Text is in `<dgm:t>` elements in separate `diagrams/` folder -- may not extract cleanly
- **Charts:** Data is in `charts/chart*.xml` using different namespace -- text extraction limited
- **Grouped shapes:** Text is nested deeper but still uses `<a:t>` elements -- should extract
- **Notes:** Speaker notes are in `notesSlides/notesSlide*.xml` -- same `<a:t>` pattern

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP decompression | Custom unzip | JSZip (already installed) | Binary format parsing is complex; JSZip handles all compression methods |
| XML parsing | Regex-based extraction | DOMParser | XML namespaces, CDATA, entities make regex unreliable |
| PDF text extraction | Custom parser | pdf.js (already loaded) | PDF format is extremely complex |
| DOCX text extraction | Custom parser | mammoth (already installed) | OOXML is deeply nested; mammoth handles edge cases |
| Thumbnail generation | Server-side rendering | Canvas API | Already used by imageProcessor and pdfProcessor |

**Key insight:** PPTX parsing is the only truly new processor needed. All other file types already have processors. The PPTX processor follows identical patterns but uses JSZip + DOMParser instead of mammoth or pdf.js.

## Common Pitfalls

### Pitfall 1: PPTX Namespace Handling
**What goes wrong:** `getElementsByTagName('a:t')` fails because `a:` is a namespace prefix, not part of the tag name.
**Why it happens:** DOMParser parses XML with full namespace awareness. The prefix `a:` maps to a URI, and the actual tag is `t` in the DrawingML namespace.
**How to avoid:** Use `getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 't')` instead.
**Warning signs:** Empty text extraction from valid PPTX files.

### Pitfall 2: Base64 Image Size in Save Files
**What goes wrong:** Storing full-resolution images from PPTX slides inflates `.cue` file size beyond practical limits.
**Why it happens:** Each PPTX slide image can be 500KB-2MB in base64. A 20-slide PPTX with images could add 10-40MB.
**How to avoid:** For supplementary resources: store only thumbnails and extracted text. Do NOT store full-resolution images from PPTX media. If images are needed for AI processing, they should be extracted on-demand or stored as compressed thumbnails only.
**Warning signs:** `.cue` files growing beyond 50MB (existing `checkFileSize` guard).

### Pitfall 3: UploadedResourceType Enum Mismatch
**What goes wrong:** The existing `UploadedResourceType` union is `'pdf' | 'image' | 'docx'` -- adding `'pptx'` requires updating this type AND all code that switches on it.
**Why it happens:** TypeScript won't catch exhaustiveness if switch statements use `default` instead of explicit cases.
**How to avoid:** Add `'pptx'` to the `UploadedResourceType` union. Then search for all switch statements and Record types that use this union to add the new case.
**Warning signs:** TypeScript compile errors after adding the type (which is good -- they guide you to all places needing updates).

### Pitfall 4: Landing Page vs ResourceHub Resource Confusion
**What goes wrong:** The existing `UploadPanel` and `UploadedResource` types are used in `ResourceHub` (post-generation, for enhancement). Phase 66 adds uploads to the landing page (pre-generation, for supplementary context). These are different use cases.
**Why it happens:** Same component/type used in two contexts with different lifecycles.
**How to avoid:** Clearly separate the two resource collections:
- Landing page resources: stored in App.tsx state, persisted in CueFileContent, passed to generation pipeline
- ResourceHub resources: managed within ResourceHub component, used for enhancement flow
- Consider whether they should merge (Phase 68 RES-06 says "resources uploaded on landing page pre-populate ResourceHub")

### Pitfall 5: Auto-Save localStorage Overflow
**What goes wrong:** Adding resource content (especially base64 images) to auto-save data exceeds localStorage's ~5MB limit.
**Why it happens:** `useAutoSave` stores `AutoSaveData` to localStorage every 30 seconds. Resource content can be large.
**How to avoid:** Either exclude supplementary resources from `AutoSaveData` or strip binary content (thumbnails, images) before auto-saving, keeping only metadata and text.
**Warning signs:** Console warnings "Auto-save failed (localStorage may be full)."

## Code Examples

### PPTX Text Extraction via JSZip + DOMParser
```typescript
// Verified pattern: JSZip for unzipping, DOMParser for XML
import JSZip from 'jszip';

const DRAWINGML_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

export async function processPptx(file: File): Promise<PptxProcessResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find slide files (sorted numerically)
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  const parser = new DOMParser();
  const textParts: string[] = [];

  for (const slidePath of slideFiles) {
    const xmlString = await zip.file(slidePath)!.async('string');
    const doc = parser.parseFromString(xmlString, 'application/xml');

    // Extract all text runs
    const textNodes = doc.getElementsByTagNameNS(DRAWINGML_NS, 't');
    const paragraphs = doc.getElementsByTagNameNS(DRAWINGML_NS, 'p');

    // Group text by paragraphs for readability
    let slideText = '';
    for (let i = 0; i < paragraphs.length; i++) {
      const runs = paragraphs[i].getElementsByTagNameNS(DRAWINGML_NS, 't');
      const paraText = Array.from(runs).map(r => r.textContent || '').join('');
      if (paraText.trim()) {
        slideText += paraText.trim() + '\n';
      }
    }

    if (slideText.trim()) {
      const slideNum = slidePath.match(/slide(\d+)/)?.[1];
      textParts.push(`[Slide ${slideNum}]\n${slideText.trim()}`);
    }
  }

  return {
    thumbnail: PPTX_ICON, // SVG placeholder like DOCX_ICON
    pageCount: slideFiles.length,
    type: 'pptx',
    text: textParts.join('\n\n'),
  };
}
```

### Content Capping Utility
```typescript
const PER_RESOURCE_CAP = 2000;  // chars
const TOTAL_RESOURCE_CAP = 6000; // chars across all resources

export function capResourceContent(
  resources: { id: string; text: string }[]
): Map<string, string> {
  const capped = new Map<string, string>();
  let totalUsed = 0;

  for (const resource of resources) {
    const remaining = TOTAL_RESOURCE_CAP - totalUsed;
    if (remaining <= 0) break;

    const perCap = Math.min(PER_RESOURCE_CAP, remaining);
    const text = resource.text.substring(0, perCap);
    capped.set(resource.id, text);
    totalUsed += text.length;
  }

  return capped;
}
```

### Extending UploadedResourceType
```typescript
// In types.ts -- add 'pptx' to the union
export type UploadedResourceType = 'pdf' | 'image' | 'docx' | 'pptx';
```

### Extending Upload Service
```typescript
// In uploadService.ts -- add PPTX MIME types and extensions
const ACCEPTED_TYPES: Record<string, UploadedResourceType> = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

const EXTENSION_MAP: Record<string, UploadedResourceType> = {
  '.pdf': 'pdf',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.docx': 'docx',
  '.pptx': 'pptx',
};
```

### Save/Load Extension
```typescript
// In types.ts -- extend CueFileContent
export interface CueFileContent {
  slides: Slide[];
  studentNames: string[];
  lessonText: string;
  studentGrades?: StudentWithGrade[];
  enhancedResources?: EnhancedResourceState[];
  supplementaryResources?: UploadedResource[];  // NEW: landing page resources
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Upload resources only in ResourceHub (post-gen) | Upload on landing page (pre-gen) for pipeline | Phase 66 | Resources available at generation time, not just for enhancement |
| PPTX not supported as upload type | PPTX parsed via JSZip + DOMParser | Phase 66 | Teachers can upload PowerPoint files as supplementary context |
| No content caps on resources | 2K per resource, 6K total | Phase 66 | Prevents token overflow in generation prompts |

**Important forward reference (Phase 68):**
- RES-06 says "Resources uploaded on landing page pre-populate ResourceHub (no re-uploading needed)."
- This means the data model chosen now must be compatible with what ResourceHub expects. The existing `UploadedResource` type is already used by ResourceHub, so reusing it for landing page resources ensures seamless handoff.

## Persistence Analysis

### Current .cue File Structure (v4)
```json
{
  "version": 4,
  "createdAt": "...",
  "modifiedAt": "...",
  "title": "...",
  "content": {
    "slides": [...],
    "studentNames": [...],
    "lessonText": "...",
    "studentGrades": [...],
    "enhancedResources": [...]
  }
}
```

### Decision: Version Bump?
The current version is 4. Adding `supplementaryResources` to `CueFileContent` is backward-compatible (optional field, defaults to `[]`). The migration function in `loadService.ts` already handles version gaps. A version bump to 5 is clean but not strictly necessary since the field is optional.

**Recommendation:** Bump to v5 for clarity. Add migration case in `migrateFile()` that sets `supplementaryResources: []` for v4 files.

### Save/Load Touchpoints
1. `saveService.ts` -- `createCueFile()` needs new parameter
2. `loadService.ts` -- `migrateFile()` needs v4->v5 migration, `isValidCueFile()` unchanged (optional field)
3. `App.tsx` -- `handleSaveClick`, `handleSaveConfirm`, and load handler need to include supplementary resources
4. `useAutoSave.ts` -- decide whether to include resources (risk: localStorage overflow)

## Landing Page UI Placement

### Current Landing Page Layout (top to bottom)
1. Logo + "Design Your Lesson" heading
2. White card container:
   a. Dual upload zones (Lesson Plan PDF | Existing Presentation PDF)
   b. Mode indicator (Fresh/Refine/Blend)
   c. Verbosity selector
   d. "Or paste text below" divider
   e. Textarea for notes
   f. Auto-generate AI Visuals toggle
   g. Error display
   h. Generate / Load buttons

### Recommended Placement for Supplementary Resources
**After the textarea (item e), before the AI Visuals toggle (item f).**

Rationale:
- The supplementary resources are optional context alongside the lesson text
- They should appear after the primary input (PDF + text) but before settings/actions
- A collapsible section keeps the landing page clean for teachers who don't use this feature

### UI Design Notes
- Reuse the existing `UploadPanel` component which already has drag-drop, progress, error handling, and resource grid
- Wrap it in a collapsible section with header like "Supplementary Resources (optional)"
- Accept: PDF, images, DOCX, PPTX (extended from the current PDF/images/DOCX)
- Show resource count badge when collapsed and resources exist
- Use orange/amber theme to distinguish from the green (lesson plan) and blue (presentation) zones

## Open Questions

1. **Image extraction from PPTX: include or skip?**
   - What we know: PPTX media images can be large. The requirements say "parsed for text and images."
   - What's unclear: Whether "images" means extracting embedded media or rendering slides as images.
   - Recommendation: Extract embedded media images from `ppt/media/` but compress to thumbnails for storage. Full extraction is for AI processing only (transient, not persisted). Keep text as the primary extracted content.

2. **Should supplementary resources share the UploadedResource type or use a new type?**
   - What we know: Phase 68 (RES-06) says landing page resources should pre-populate ResourceHub. Using the same type makes this trivial.
   - What's unclear: Whether the full content extraction (images, detailed text) needed for ResourceHub enhancement is appropriate for landing page resources that only need capped text.
   - Recommendation: Reuse `UploadedResource` type. Apply content capping as a view/utility function when building generation prompts, not at the storage level. This preserves full content for ResourceHub use in Phase 68.

3. **Max number of supplementary resources?**
   - What we know: Total cap is 6,000 chars. At 2,000 chars per resource, that's effectively 3 resources at full cap.
   - What's unclear: Whether there should be a hard file count limit.
   - Recommendation: Cap at 5 files. With per-resource and total caps, even 5 files is safe. The UI can show "Maximum 5 supplementary resources" hint.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `types.ts`, `uploadService.ts`, `documentProcessors/*.ts`, `saveService.ts`, `loadService.ts`, `App.tsx`, `UploadPanel.tsx`, `ResourceHub.tsx`, `exportService.ts` (JSZip usage)
- OOXML specification for PPTX file structure: The namespace `http://schemas.openxmlformats.org/drawingml/2006/main` for `<a:t>` text elements is from the ECMA-376 standard

### Secondary (MEDIUM confidence)
- JSZip API: `loadAsync()`, `file().async('string')`, `file().async('base64')` -- verified in project's existing `exportService.ts`
- DOMParser `getElementsByTagNameNS` -- standard DOM API, verified in MDN documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, no new dependencies
- Architecture: HIGH - Follows exact patterns established by existing document processors
- PPTX parsing: HIGH - OOXML structure is well-documented; JSZip + DOMParser is the standard approach for browser-based PPTX reading
- Pitfalls: HIGH - Based on actual codebase analysis and known OOXML quirks
- Persistence: HIGH - Extends existing v4 save format with optional field
- UI placement: MEDIUM - Depends on user preference for landing page layout

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (stable domain, no moving targets)
