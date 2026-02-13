# Technology Stack

**Project:** Cue v5.0 -- Smart Generation Pipeline
**Researched:** 2026-02-14
**Focus:** Multi-pass AI generation, resource integration during generation, lesson phase detection

## Executive Decision

**No new npm dependencies required.** The existing stack already has everything needed. The v5.0 features are architectural changes to how existing tools are orchestrated, not library additions.

## What Already Exists (DO NOT ADD)

These are already in the codebase and validated. Listed here to prevent re-research or accidental duplication.

| Capability | Technology | Version (installed) | Notes |
|------------|-----------|---------------------|-------|
| AI (Gemini) | `@google/genai` | 1.37.0 (^1.30.0) | Structured output, multimodal vision, streaming |
| AI (Claude) | Direct fetch to API | N/A (raw HTTP) | tool_choice for structured output |
| PDF parsing | pdf.js via CDN | 3.11.174 | Text extraction + page-to-image rendering |
| DOCX parsing | mammoth | ^1.11.0 | HTML/text extraction from Word docs |
| PPTX export | PptxGenJS via CDN | N/A | Write-only (no read/parse capability) |
| ZIP handling | jszip | ^3.10.1 | Already used for multi-file export |
| Image processing | Canvas API | Browser native | Compression, base64 conversion |
| File upload | uploadService.ts | Custom | PDF/image/DOCX routing, validation |
| Gap analysis | analyzeGaps + generateSlideFromGap | Custom | Both Gemini and Claude providers |
| Document analysis | analyzeDocument (multimodal) | Custom | Vision-based structure detection |
| Document enhancement | enhanceDocument | Custom | 3-level differentiation pipeline |
| Content preservation | detector.ts | Custom | Regex-based question/activity detection |
| Provider abstraction | AIProviderInterface | Custom | Strategy pattern, 20+ methods |
| Retry/backoff | withRetry() | Custom | Exponential backoff with error classification |

## Recommended Stack Changes

### No New Dependencies

The three v5.0 features require zero new packages. Here is why:

#### 1. Multi-Pass AI Generation Pipeline

**What it needs:** Sequential AI calls with intermediate state, progress tracking, and the ability to pass Pass 1 output as Pass 2 input.

**What exists:** The codebase already does multi-step AI orchestration in several places:
- `handleGenerate()` in App.tsx: generates slides, then optionally regenerates speakerNotes per-slide for non-standard verbosity (lines 563-590)
- `transformForColleague()`: batched slide processing with `onProgress` callback
- `enhanceUploadedDocument()`: analysis -> enhancement pipeline with state machine (`EnhancementState`)
- `withRetry()`: retry wrapper for transient failures

**What to build (no new deps):**
- A `GenerationPipeline` service class that chains: generate -> analyze gaps -> fill gaps -> return merged deck
- Reuse `GapAnalysisResult` and `generateSlideFromGap` types/methods already on `AIProviderInterface`
- Progress state machine mirroring `EnhancementState` pattern (idle -> generating -> analyzing -> filling -> complete -> error)

**Confidence:** HIGH -- all primitives exist, this is pure orchestration code.

#### 2. Resource Integration During Generation

**What it needs:** Accept uploaded files (PDF, images, DOCX, PPTX) alongside the lesson plan, extract their content, and feed it to the AI during slide generation.

**What exists:**
- `uploadService.ts` already validates and routes files to processors
- `pdfProcessor.ts` extracts text + page images from PDFs
- `docxProcessor.ts` extracts text from Word docs via mammoth
- `imageProcessor.ts` extracts base64 from images
- `GenerationInput` type already has `lessonText`, `lessonImages`, `presentationText`, `presentationImages`

**What to build (no new deps):**
- Extend `GenerationInput` with a `supplementaryResources?: ProcessedResource[]` field
- Each resource carries its extracted text and/or images
- System prompt includes resource content as context ("The teacher has also provided these supplementary materials: ...")
- PPTX upload: use existing `jszip` to unzip, parse `ppt/slides/slide*.xml` for text, extract images from `ppt/media/` -- see detailed approach below

**PPTX Parsing via JSZip (no new dependency):**
The project already has `jszip ^3.10.1`. PPTX files are ZIP archives (Office Open XML format). The extraction path:
```
1. jszip.loadAsync(file) to open the PPTX as a ZIP
2. Read ppt/slides/slide1.xml, slide2.xml, etc.
3. Parse XML with DOMParser (browser-native) to extract text from <a:t> elements
4. Extract images from ppt/media/*.png|jpg as base64
5. Return { text: string, images: string[], slideCount: number }
```

This is the same approach used by pptx-text-parser and pptx-content-extractor libraries, but we avoid adding a dependency because the XML structure is simple and we already have JSZip. The core extraction logic is ~80 lines.

**Confidence:** HIGH -- file processing pipeline exists, just needs a new processor and extended input type.

#### 3. Lesson Phase Detection (I Do / We Do / You Do)

**What it needs:** Detect pedagogical phases in lesson plan text and tag slides with their phase.

**What exists:**
- `contentPreservation/detector.ts` already does regex-based pattern matching on lesson plan text
- The existing system prompt already references phases: "Preserve the pedagogical structure: 'Hook', 'I Do', 'We Do', 'You Do'" (geminiService.ts line 173)
- `Slide` type has extensible optional fields (can add `lessonPhase?`)

**What to build (no new deps):**
- A `phaseDetector.ts` module using regex patterns (like `detector.ts` does for questions/activities)
- Pattern matching for common phase labels in Australian/UK education:
  - Exact: "I Do", "We Do", "We Do Together", "You Do"
  - Equivalent: "Modelling", "Guided Practice", "Shared Practice", "Independent Practice"
  - Structural: "Introduction", "Warm-Up", "Hook", "Main Activity", "Plenary", "Exit Ticket"
- Feed detected phases to AI in the generation prompt so AI can tag slides with phase metadata
- Add `lessonPhase?: LessonPhase` to the `Slide` type

**Why regex over AI for phase detection:**
- Phase labels are consistent and finite (teachers use standard terminology)
- Regex detection is instant (0ms) vs. an extra AI call (~2-5 seconds)
- The AI already sees the lesson plan -- telling it "I detected I Do at position X, We Do at position Y" lets it assign phases to slides accurately
- Matches the existing `contentPreservation/detector.ts` pattern the codebase already uses

**Confidence:** HIGH -- purely string matching + prompt engineering, no external tools needed.

## Detailed Technology Decisions

### @google/genai SDK: Stay on ^1.30.0 (currently 1.37.0)

The installed version (1.37.0) is recent. The latest on npm is 1.41.0 (published 2 days ago per npmjs.com). The `^1.30.0` semver range covers it. No action needed.

Key capabilities already available in 1.37.0 that v5.0 uses:
- `responseSchema` for structured JSON output (used in gap analysis, condensation, etc.)
- Multimodal `inlineData` for image input (used for document analysis, slide analysis)
- System instructions (used in all generation prompts)

**Recommendation:** Do NOT update to 1.41.0 unless a specific bug fix is needed. The project works, avoid unnecessary churn.

### Claude API: No Changes

Claude is called via direct `fetch()` to `https://api.anthropic.com/v1/messages` with `tool_choice` for structured output. This pattern works and does not need modification. The multi-pass pipeline will make sequential calls using the same provider instance.

Default model is `claude-sonnet-4-20250514`. No change needed.

### JSZip for PPTX Reading: Already Installed

`jszip ^3.10.1` is already a dependency. PPTX files are ZIP archives (Office Open XML format). The extraction path:

1. `ppt/slides/slide{N}.xml` -- Slide content (text in `<a:t>` elements within `<a:p>` paragraphs)
2. `ppt/media/image{N}.png` -- Embedded images
3. `ppt/presentation.xml` -- Slide order metadata (maps rId to slide files)
4. `ppt/notesSlides/notesSlide{N}.xml` -- Speaker notes (optional)
5. `[Content_Types].xml` -- MIME types for each file in the archive

DOMParser (browser-native) handles the XML parsing. No xml2js or other XML library needed.

Key XML structure for text extraction:
```xml
<!-- ppt/slides/slide1.xml -->
<p:sp>
  <p:txBody>
    <a:p>              <!-- paragraph -->
      <a:r>            <!-- run -->
        <a:t>Text</a:t>  <!-- text content -->
      </a:r>
    </a:p>
  </p:txBody>
</p:sp>
```

### File Type Support Matrix (After v5.0)

| File Type | Lesson Plan Upload | Resource Upload | As Supplementary | Parse Library |
|-----------|-------------------|----------------|-----------------|---------------|
| PDF | Yes (existing) | Yes (existing) | Yes (new) | pdf.js CDN |
| Image (PNG/JPG) | Yes (existing) | Yes (existing) | Yes (new) | Canvas API |
| DOCX | No | Yes (existing) | Yes (new) | mammoth |
| PPTX | No | **New** | **New** | jszip + DOMParser |

## What NOT to Add

| Technology | Why Considered | Why Rejected |
|------------|---------------|-------------|
| officeparser (npm) | PPTX parsing | Adds 200KB+ for something achievable with jszip (already installed) + DOMParser (browser-native). 80 lines of custom code vs. a dependency. |
| pptx-parser (npm) | PPTX parsing | Node.js focused, browser support unclear, 6 transitive deps |
| pptx-content-extractor (npm) | PPTX parsing | Node.js only (uses `fs`), not browser-compatible |
| LangChain | Pipeline orchestration | Massive overkill for sequential AI calls; project uses direct API calls successfully |
| Zustand/Redux | Pipeline state management | App state lives in App.tsx useState; pipeline state is a service-layer concern using discriminated unions |
| xml2js (npm) | XML parsing for PPTX | DOMParser is browser-native and sufficient for the simple XML queries needed |
| XState | State machine for pipeline | `EnhancementState` discriminated union pattern already works well in the codebase |
| AbortController polyfill | Cancellation support | Browser-native since Chrome 66, Safari 12.1 -- project targets modern browsers |
| compromise / natural (NLP) | Phase label detection | Overkill -- regex handles finite set of known pedagogical labels |

## Integration Points with Existing Code

### Multi-Pass Pipeline Integration

The pipeline hooks into the existing generation flow at `App.tsx handleGenerate()`:

```
BEFORE (current single-pass):
  handleGenerate()
    -> provider.generateLessonSlides(input)
    -> setSlides(result)

AFTER (v5.0 multi-pass):
  handleGenerate()
    -> generationPipeline.execute({
         provider,
         lessonInput: GenerationInput,
         resources?: ProcessedResource[],
         enableAutoGapFilling: boolean,
         onProgress: (PipelineState) => void
       })
    -> setSlides(result.slides)
```

The pipeline internally calls existing `AIProviderInterface` methods:
1. `provider.generateLessonSlides()` -- existing, unchanged
2. `provider.analyzeGaps()` -- existing, unchanged
3. `provider.generateSlideFromGap()` -- existing, called per critical/recommended gap
4. Merge gap slides into deck at suggested positions, return combined result

### Resource Upload Integration

Upload panel on landing page extends the existing dual-PDF upload zones:

```
BEFORE (current):
  [Lesson Plan Zone] + [Existing Presentation Zone]

AFTER (v5.0):
  [Lesson Plan Zone] + [Existing Presentation Zone] + [+ Add Resources]
```

Resources processed through existing `processUploadedFile()` in `uploadService.ts`, extended with:
- New `pptxProcessor.ts` for PPTX files
- Extended `ACCEPTED_TYPES` and `EXTENSION_MAP` to include `.pptx` MIME type

### Slide Type Extension for Phases

```typescript
// Non-breaking addition to Slide interface in types.ts:
export type LessonPhase =
  | 'hook'
  | 'i-do'
  | 'we-do'
  | 'we-do-together'
  | 'you-do'
  | 'plenary';

export interface Slide {
  // ... existing fields unchanged ...
  lessonPhase?: LessonPhase;
}
```

### CueFile Format Compatibility

The `Slide` interface change is purely additive (new optional field). Existing .cue files will load without modification -- `lessonPhase` will be `undefined` for old slides. No file format version bump needed.

## Version Pins (Current Working State)

| Package | package.json | Installed | Action |
|---------|-------------|-----------|--------|
| `@google/genai` | ^1.30.0 | 1.37.0 | Keep |
| `react` | ^19.2.0 | 19.2.0 | Keep |
| `jszip` | ^3.10.1 | 3.10.1 | Keep (now also used for PPTX read) |
| `mammoth` | ^1.11.0 | 1.11.0 | Keep |
| `jspdf` | ^4.0.0 | 4.0.0 | Keep |
| `html2canvas` | ^1.4.1 | 1.4.1 | Keep |
| `typescript` | ~5.8.2 | 5.8.x | Keep |
| `vite` | ^6.2.0 | 6.2.x | Keep |

**No version bumps needed. No new packages needed.**

## New Files to Create (Architecture Preview)

| File | Purpose | Lines Est. |
|------|---------|------------|
| `services/generationPipeline.ts` | Multi-pass orchestration (generate -> analyze -> fill -> merge) | ~200 |
| `services/documentProcessors/pptxProcessor.ts` | PPTX text/image extraction via JSZip + DOMParser | ~120 |
| `services/phaseDetection/phaseDetector.ts` | Regex-based lesson phase detection | ~150 |
| `services/phaseDetection/phasePatterns.ts` | Pattern dictionaries for phase labels | ~80 |
| `services/prompts/pipelinePrompts.ts` | System prompts for phase-aware + resource-aware generation | ~100 |

Estimated total: ~650 new lines across 5 new files, modifying ~5-8 existing files.

## Existing Files to Modify

| File | Change | Reason |
|------|--------|--------|
| `types.ts` | Add `LessonPhase` type, `lessonPhase?` to Slide, `ProcessedResource` type | New data model fields |
| `services/aiProvider.ts` | Extend `GenerationInput` with `supplementaryResources?` | Resource integration |
| `services/uploadService.ts` | Add PPTX MIME type to `ACCEPTED_TYPES` and `EXTENSION_MAP` | PPTX upload support |
| `services/geminiService.ts` | Update system prompt to include resource context and phase assignments | Enhanced generation |
| `services/providers/claudeProvider.ts` | Mirror geminiService prompt changes | Provider parity |
| `services/prompts/gapAnalysisPrompts.ts` | Update to accept resource context alongside lesson plan | Resource-aware gap analysis |
| `App.tsx` | Replace direct `generateLessonSlides()` with `generationPipeline.execute()` | Pipeline orchestration |

## Sources

- Codebase analysis: `package.json`, `services/aiProvider.ts`, `services/geminiService.ts`, `services/uploadService.ts`, `types.ts`, `App.tsx`
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) -- latest version 1.41.0, installed 1.37.0
- [Gemini API structured output and function calling](https://ai.google.dev/gemini-api/docs/function-calling) -- confirms chained function calling available
- [Gemini API multi-turn conversations](https://firebase.google.com/docs/ai-logic/chat) -- chat history management
- [JSZip](https://www.npmjs.com/package/jszip) -- already installed ^3.10.1
- [Office Open XML format (training data)](https://learn.microsoft.com/en-us/office/open-xml/understanding-the-open-xml-file-formats) -- PPTX = ZIP with XML, HIGH confidence
- [pptx-content-extractor](https://github.com/Paul0908/pptx-content-extractor) -- reference for JSZip-based PPTX extraction approach
- [I Do, We Do, You Do framework](https://study.com/academy/lesson/i-do-we-do-you-do-lesson-plan-template.html) -- GRR pedagogical structure
- Existing codebase patterns from v4.0 (gap analysis, Phase 59) and v3.7 (document enhancement, Phases 43-47)
