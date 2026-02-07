# Domain Pitfalls: Script Mode (Share with Colleague) Export

**Project:** Cue v4.1 -- Script Mode Export
**Researched:** 2026-02-08
**Confidence:** HIGH (codebase analysis + verified external sources)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken exports, or unusable output for the colleague.

### Pitfall 1: AI Transforms Teleprompter Into Lossy, Generic Bullets

**What goes wrong:** The teleprompter text uses a progressive-disclosure format with emoji delimiters, conversational tone, teacher-action cues (`[PAUSE]`, `[Point to diagram]`), and segment-aligned pacing. AI transformation strips all of this pedagogical structure and produces generic "textbook bullets" that no teacher can actually deliver a lesson from.

**Why it happens:**
- Cue's teleprompter format is domain-specific: segments separated by "pointing-right emoji" aligned 1:1 with bullet reveals. This structure is invisible to a naive "convert to bullets" prompt.
- The teleprompter includes context that only makes sense in sequence ("Now that they've seen X..." referring to a bullet just revealed). Without the reveal context, these become incoherent.
- Conversational tone ("Alright everyone, let's think about why...") is the exact thing that makes the export usable -- stripping it produces dead text.
- AI models default to "concise summary" behavior when told to make bullets, discarding the pedagogical narrative.

**Consequences:**
- Colleague receives slides with bullet points no better than the existing `content` array
- The entire value proposition of "script mode" (self-contained teaching script) is lost
- Teacher who shared the deck gets feedback: "I couldn't teach from this"

**Prevention:**
1. Prompt must explicitly state: "Transform the speaker's conversational script into EXPANDED talking-point bullets that a different teacher can read aloud. Preserve the teaching narrative, examples, analogies, and interaction cues."
2. Include 2-3 few-shot examples showing input teleprompter segments and desired output bullets
3. Instruct the AI to KEEP teacher-action cues as formatted instructions: `[Ask students: ...]`, `[Wait for responses]`, `[Draw on board: ...]`
4. Validate output length: if transformed text is shorter than the original speakerNotes, it almost certainly lost content. Flag and retry.
5. Preserve the segment count: if the original had N+1 segments, the output should produce at least N expanded bullets (one per segment, excluding the intro)

**Detection (warning signs):**
- Output bullets are shorter than input speakerNotes
- Output reads like textbook definitions, not teaching guidance
- Teacher-action cues (`[PAUSE]`, `[Point to...]`) are missing from output
- Examples and analogies from original teleprompter are absent

**Phase to address:** AI transformation prompt design -- this is the FIRST phase, before any export work

**Cue-specific context:** The existing `TELEPROMPTER_RULES_DETAILED` (line 61-83 of geminiService.ts) shows the desired output style. The transformation prompt should reference this style, not fight against it.

---

### Pitfall 2: Sending Entire Deck to AI in One Request Hits Token Limits or Degrades Quality

**What goes wrong:** A 30-slide deck with detailed teleprompter scripts and slide content generates a massive prompt. The AI either truncates output, hits rate limits, or produces increasingly poor transformations for later slides as context window fills up.

**Why it happens:**
- Each slide has: title (~10 tokens), content array (3-5 bullets, ~50 tokens), speakerNotes (100-400 tokens for standard verbosity, 400-800 for detailed). A 30-slide deck could be 15,000-30,000 tokens of input alone.
- Gemini free tier: 250,000 TPM but only 5-15 RPM. One massive request is fine on tokens, but if it fails and retries, you burn RPM quickly.
- Claude API: 20,000 TPM on free tier -- a single 30-slide deck could exceed this.
- AI quality degrades in later portions of long outputs -- "lost in the middle" phenomenon.
- Output token limits: the AI must generate transformed text for ALL slides in one response, which could be 10,000+ output tokens.

**Consequences:**
- Export fails silently on large decks (the teacher's most important ones)
- Later slides receive worse transformations than early slides
- Rate limit errors during export with no recovery
- Users on Claude free tier unable to export at all

**Prevention:**
1. **Batch slides in groups of 5-8** per AI request, not the full deck. Send slide N-1's content as context so the AI maintains narrative flow between batches.
2. Implement sequential processing with progress indicator: "Transforming slides 1-5 of 30..."
3. Add a 1-2 second delay between batch requests to avoid RPM throttling
4. Set explicit `max_tokens` on output to prevent truncation -- estimate 150-200 output tokens per slide
5. Include the existing `withRetry` utility (from aiProvider.ts) for transient failures
6. Consider caching: if the user re-exports the same deck, reuse previous transformations for unchanged slides

**Detection (warning signs):**
- Testing only with 5-slide decks
- No progress indicator during AI processing
- Single API call for entire deck
- No error handling for rate limit (429) responses

**Phase to address:** AI batch processing architecture -- design before implementation

**Cue-specific context:** The existing `buildSlideContextForEnhancement()` already limits to 15 slides max (aiProvider.ts line 158). Script mode transformation needs a similar batching strategy.

---

### Pitfall 3: PPTX Export With Expanded Text Overflows Slide Layout

**What goes wrong:** The existing PPTX export (pptxService.ts) is designed for brief bullet points in `slide.content`. Script mode produces EXPANDED talking-point bullets that are 3-5x longer. Text overflows the text box, gets clipped in PowerPoint, or requires manual resizing.

**Why it happens:**
- Current layout: content area is `w: "45%"` (with image) or `w: "90%"` (without), `h: 4.5` inches, `fontSize: 24` (pptxService.ts lines 51-60)
- At fontSize 24 with 4.5 inches height, you can fit roughly 8-10 short bullet lines
- Script mode bullets are full teaching sentences: "Explain that the denominator tells us the total number of equal parts, using the pizza analogy -- draw a circle on the board and divide it into 4 slices" -- a single bullet might wrap to 3-4 lines
- With 4-6 such bullets, that is 12-24 lines at fontSize 24, which is 2-3x more than the available space
- PptxGenJS has no "shrink text on overflow" option (only "do not autofit" and "resize shape to fit text") per GitHub issue #330

**Consequences:**
- Text is clipped at bottom of text box -- colleague misses crucial teaching guidance
- If autoFit is enabled, the text box grows beyond the slide boundary
- Professional-looking export becomes unusable
- Images get pushed off-slide or overlap with text

**Prevention:**
1. **Create a dedicated script-mode PPTX layout** separate from the existing one:
   - Reduce fontSize to 16-18 (vs current 24)
   - Use full slide width for text (no side-by-side image)
   - Place image as a smaller thumbnail in the top-right corner, not a full 4.5x3.5 block
   - Increase content area to full height: `h: 5.5` inches
2. Implement text length detection: if total bullet text exceeds ~600 characters, split across two slides
3. Consider "notes" layout: title + small image at top, expanded bullets below
4. Test with the longest realistic teleprompter scripts (detailed verbosity, 5+ bullets per slide)

**Detection (warning signs):**
- Reusing existing pptxService layout for script mode
- Not testing with detailed-verbosity teleprompter content
- No font size reduction for expanded text

**Phase to address:** PPTX export implementation -- must be planned alongside AI transformation

**Cue-specific context:** The existing pptxService.ts handles two layouts (full-image and split). Script mode needs a THIRD layout path, not a modification of existing ones. The `layout` field on Slide already supports multiple values.

---

### Pitfall 4: PptxGenJS Base64 Image Aspect Ratio Distortion

**What goes wrong:** Slide images (stored as base64 data URLs in `slide.imageUrl`) get stretched to 16:9 ratio regardless of their original dimensions when embedded in the PPTX.

**Why it happens:**
- PptxGenJS v3.14.0 has a documented bug (GitHub issue #1351) where base64 images are forced into 16:9 aspect ratio
- Cue currently uses PptxGenJS v3.12.0 via CDN, which may or may not have this issue
- The existing pptxService uses `sizing: { type: "contain", w: 4.5, h: 3.5 }` which SHOULD preserve ratio, but the bug overrides this
- AI-generated images (from Gemini image generation) may not have consistent aspect ratios
- Pasted images (`originalPastedImage` field) can be any aspect ratio

**Consequences:**
- Distorted images in the exported PPTX make slides look unprofessional
- Teacher diagrams (pasted slides) become unreadable when stretched
- Colleague receiving the export sees broken visuals

**Prevention:**
1. **Pin PptxGenJS version to 3.12.0** (current CDN version) and test image rendering before considering upgrade
2. If aspect ratio distortion occurs, calculate image dimensions BEFORE passing to addImage: load into an Image element, read naturalWidth/naturalHeight, compute proportional w/h manually
3. For script mode specifically: use smaller image placement (e.g., 3x2.5 inches) where distortion is less noticeable
4. Test with: square images, portrait images, landscape images, very wide panoramic images
5. Consider embedding images as JPEG (re-encode from PNG) if PPTX files are too large with many base64 PNGs

**Detection (warning signs):**
- Not testing exported PPTX in actual PowerPoint (only previewing in Google Slides or Keynote)
- Not testing with pasted-slide images (which have arbitrary aspect ratios)
- Upgrading PptxGenJS CDN without regression testing images

**Phase to address:** PPTX export implementation

**Sources:**
- [PptxGenJS Image Bug #1351](https://github.com/gitbrent/PptxGenJS/issues/1351)
- [PptxGenJS Sizing Options Issue #313](https://github.com/gitbrent/PptxGenJS/issues/313)
- [PptxGenJS Image API Docs](https://gitbrent.github.io/PptxGenJS/docs/api-images/)

---

## Moderate Pitfalls

Mistakes that cause poor quality output, user confusion, or technical debt.

### Pitfall 5: PDF Export Via html2canvas Produces Blurry Text

**What goes wrong:** The existing PDF export pipeline (ExportModal.tsx) renders React components to canvas via html2canvas, then embeds as JPEG in jsPDF. This works for "Working Wall" posters viewed from distance, but script mode PDFs need READABLE text that colleagues study up close. The rasterized text is blurry, non-selectable, and non-searchable.

**Why it happens:**
- html2canvas rasterizes the entire DOM element including text -- text becomes pixels, not vectors
- Even at `scale: 2`, text at small font sizes (14-16px) appears fuzzy
- JPEG compression (0.95 quality in ExportModal.tsx line 218) further degrades text
- CSS flexbox/grid layouts render inconsistently in html2canvas
- External fonts (Fredoka, Poppins via Google Fonts CDN) may not render correctly in the canvas clone

**Consequences:**
- Colleague can't comfortably read the teaching script from the PDF
- Text is not searchable (entire page is a single image)
- File sizes are large (full-page images at 2x scale)
- Printed output looks noticeably worse than screen

**Prevention:**
1. For script mode PDF, use jsPDF's native text rendering (like exportService.ts does for worksheets) instead of html2canvas capture
2. Build a text-based PDF layout: title, image (if present, embedded as actual image), then bullet list rendered as jsPDF text with `splitTextToSize`
3. This approach already exists in the codebase -- the `exportService.ts` worksheet export uses pure jsPDF text rendering with page-break handling and is the proven pattern
4. Reserve html2canvas for the "visual preview" (screenshot-style) export only
5. If html2canvas must be used, increase scale to 3 or 4 for readable text, and use PNG instead of JPEG

**Detection (warning signs):**
- Reusing ExportModal's html2canvas pipeline for script mode
- Not testing printed output (only viewing PDF on screen where resolution is lower)
- Not comparing file sizes between approaches

**Phase to address:** PDF export implementation -- choose approach before coding

**Cue-specific context:** The exportService.ts already has a mature text-based PDF renderer (lines 61-280) with page-break handling, bullet formatting, and headers. Script mode PDF should extend this pattern, not reinvent via html2canvas.

---

### Pitfall 6: Preview vs Export Fidelity Mismatch

**What goes wrong:** The "preview" of the script-mode export (shown in-app before download) looks perfect. The actual PPTX/PDF output looks different: text wrapping changes, fonts substitute, image positioning shifts, colors are off.

**Why it happens:**
- Preview renders in browser using Tailwind CSS, Google Fonts, and modern CSS layout
- PPTX output uses PptxGenJS text engine with Arial/Helvetica (not Fredoka/Poppins)
- PDF output depends on rendering pipeline (html2canvas vs native text)
- PowerPoint on Windows renders differently than on Mac
- Google Slides opens PPTX files with slight layout differences
- Line wrapping in browser (CSS `word-wrap`) differs from PowerPoint's text wrapping algorithm

**Consequences:**
- Teacher approves preview, sends to colleague, colleague sees different output
- Trust in export feature erodes
- Support burden: "it looked different when I previewed it"

**Prevention:**
1. **Do not build a pixel-perfect preview.** Instead, show a "preview" that is intentionally simplified/schematic -- make it clear this is a preview, not a WYSIWYG editor
2. Use the same font family in preview as in export (Arial/Helvetica, not Fredoka)
3. Test the FULL pipeline: generate preview -> export -> open in PowerPoint/Acrobat -> compare
4. Document known differences: "Colors may appear slightly different in PowerPoint"
5. Consider generating a "preview PDF" that uses the same jsPDF pipeline as the real export, just rendered in-browser via blob URL

**Detection (warning signs):**
- Preview uses different fonts/sizes than export
- Preview uses CSS layout but export uses PptxGenJS absolute positioning
- Only testing preview, not opening the actual exported file
- No side-by-side comparison of preview vs exported output

**Phase to address:** UI/preview implementation -- design preview to match export, not vice versa

---

### Pitfall 7: Pasted Slides with Full-Image Layout Produce Empty Script Bullets

**What goes wrong:** Pasted slides use `layout: 'full-image'` with `originalPastedImage` -- the visual content IS the image. The content array may be populated with AI-extracted text (for teleprompter) but these are hidden in display. When script mode transformation runs, it has no meaningful `content` to work with, or the AI-extracted content is low quality (OCR artifacts from diagrams).

**Why it happens:**
- Per the pasted-slide design decision (Phase 56): pasted slides display the original image full-screen with NO text overlay. Content array drives teleprompter only.
- The content array for pasted slides may contain OCR-quality text: fragmented, out-of-order, with diagram labels mixed in
- AI transformation of garbage-in content produces garbage-out bullets
- The speakerNotes for pasted slides were generated from the AI's interpretation of the image, which may already be approximate

**Consequences:**
- Script mode slides for pasted content show incoherent bullets
- OR: slides show the image but with no useful teaching text (defeating the purpose)
- Colleague can't deliver these slides without the original teacher's context

**Prevention:**
1. For pasted slides in script mode: display the original image at reduced size (top half) with the AI-transformed teaching notes below
2. Flag pasted slides in the transformation prompt: "This slide was pasted from an external presentation. The content was AI-extracted from an image and may be approximate. Prioritize the speakerNotes as the source of truth for transformation."
3. Consider a per-slide "review needed" flag in the export for pasted slides
4. If speakerNotes are empty or very short for a pasted slide, skip AI transformation and show a placeholder: "[Teaching notes not available -- original slide image shown]"

**Detection (warning signs):**
- Not testing script mode export with decks containing pasted slides
- Treating pasted slides identically to AI-generated slides in the transformation pipeline
- Not checking `slide.source?.type === 'pasted'` before transformation

**Phase to address:** AI transformation -- handle pasted slides as a special case

**Cue-specific context:** The `SlideSource` type (types.ts line 6-8) tracks provenance. The `originalPastedImage` field (types.ts line 36) is the key indicator.

---

### Pitfall 8: Script Mode PPTX Speaker Notes Conflict

**What goes wrong:** The existing PPTX export puts `slide.speakerNotes` into PowerPoint's speaker notes field (pptxService.ts line 77). In script mode, the teaching script is now ON the slides as bullets. But the original speakerNotes also get exported to the notes pane, creating confusing duplication: the colleague sees teaching script on-slide AND a similar but differently-worded version in the notes pane.

**Why it happens:**
- The transformation converts speakerNotes INTO on-slide content, but the original speakerNotes still exist on the Slide object
- The PPTX export blindly copies speakerNotes to the notes pane regardless of export mode
- No one thought to suppress or modify the notes pane content for script mode

**Consequences:**
- Colleague sees redundant, slightly different versions of the same guidance
- Confusion about which version to follow
- Unprofessional output

**Prevention:**
1. In script mode PPTX export: either OMIT speaker notes entirely, or replace them with a brief note: "Teaching script is displayed on-slide above"
2. Alternatively, use the notes pane for ADDITIONAL context not on the slide: source references, differentiation tips, timing notes
3. Make this decision explicit in the export code -- don't let it happen by accident

**Detection (warning signs):**
- Not opening the exported PPTX and checking the notes pane
- Script mode export using the same code path as normal export without modification
- No test case for "what appears in the notes pane in script mode"

**Phase to address:** PPTX export implementation

---

### Pitfall 9: Verbosity Cache Inconsistency With Script Mode

**What goes wrong:** Slides have a `verbosityCache` (types.ts line 24-27) with `concise` and `detailed` variants. The teacher may have regenerated teleprompter scripts at different verbosity levels. Script mode transformation uses `speakerNotes` (the "standard" version), ignoring that the teacher chose "detailed" as their deck verbosity. The exported script uses a different verbosity than what the teacher was presenting with.

**Why it happens:**
- `speakerNotes` is always the "standard" verbosity text
- If the teacher set deck verbosity to "detailed", the ACTIVE teleprompter text is `verbosityCache.detailed`, not `speakerNotes`
- The script mode transformation reads `slide.speakerNotes` without checking the deck-level verbosity setting
- The `deckVerbosity` field is on the CueFile (types.ts line 504), not on individual slides

**Consequences:**
- Exported script is less detailed than what the teacher actually presents
- Teacher thinks they're sharing their detailed script; colleague gets the standard version
- Subtle but undermines trust: "this isn't what I see when I present"

**Prevention:**
1. Before transformation, resolve the ACTIVE teleprompter text: check deck verbosity, use the appropriate cached version or `speakerNotes` as fallback
2. Create a utility function: `getActiveTeleprompterText(slide, deckVerbosity)` that returns the correct text
3. If `verbosityCache.detailed` exists and deck verbosity is "detailed", use that -- not `speakerNotes`
4. Document this in the export code with a comment explaining the resolution logic

**Detection (warning signs):**
- Directly reading `slide.speakerNotes` without checking verbosity
- Testing only with standard verbosity
- No awareness of the `verbosityCache` field during export development

**Phase to address:** AI transformation -- text sourcing logic, before prompt construction

---

## Minor Pitfalls

Mistakes that cause annoyance but are recoverable.

### Pitfall 10: Export File Size Explosion With Base64 Images

**What goes wrong:** Each slide image is a base64 data URL. A deck with 20 slides, each with AI-generated images (~200KB-1MB base64), produces a 10-40MB PPTX/PDF file.

**Prevention:**
1. Re-encode images to JPEG at 70-80% quality before embedding (significant size reduction from PNG)
2. Resize images to maximum 1200px width for PPTX (full slide width is ~960px at 96dpi)
3. Show estimated file size before export begins
4. Consider offering "with images" vs "text only" export option

**Phase to address:** PPTX/PDF export implementation

---

### Pitfall 11: No Progress Feedback During Multi-Step Export

**What goes wrong:** Script mode export involves: AI transformation (slow, per-batch) -> layout generation -> file creation. With a 30-slide deck, this could take 30-60 seconds. UI shows nothing or a generic spinner. User thinks it's frozen.

**Prevention:**
1. Multi-stage progress bar: "Step 1/3: Transforming teaching scripts (8/30 slides)... Step 2/3: Building layout... Step 3/3: Generating file..."
2. Disable the export button during processing (prevent double-submit)
3. Show estimated time based on slide count
4. The existing ExportModal pattern (lines 58-61) has `generationProgress` state -- extend it for the AI step

**Phase to address:** UI implementation

---

### Pitfall 12: Special Slide Types Have No Script Mode Equivalent

**What goes wrong:** Work Together slides, Class Challenge slides, and Elaborate slides have special `slideType` values and unique content structures (pairs, contributions, challengePrompt). Script mode doesn't know how to transform these into readable teaching bullets.

**Prevention:**
1. Define transformation rules per slide type:
   - `work-together`: Include the collaboration instructions and group activity description
   - `class-challenge`: Include the challenge prompt and expected discussion points
   - `elaborate`: Include the deeper exploration content
2. Fall back gracefully: if no special handling exists, use the standard content + speakerNotes transformation
3. Add slide-type indicator in the exported output: "[Group Activity]" prefix for work-together slides

**Phase to address:** AI transformation -- handle slide types before implementation

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| AI transformation prompt | Lossy, generic bullet output (#1) | Few-shot examples, length validation, preserve pedagogical cues |
| Batch processing design | Token limits and rate throttling (#2) | Batch 5-8 slides, inter-request delays, progress UI |
| PPTX layout for expanded text | Text overflow clipping (#3) | Dedicated script-mode layout, smaller font, full-width text |
| PPTX image embedding | Aspect ratio distortion (#4) | Pre-calculate dimensions, test all aspect ratios |
| PDF export pipeline choice | Blurry rasterized text (#5) | Use native jsPDF text rendering (existing exportService pattern) |
| Preview implementation | Fidelity mismatch with export (#6) | Simplified preview, same fonts as export |
| Pasted slide handling | Empty or incoherent script bullets (#7) | Source-aware transformation, fallback placeholders |
| PPTX notes pane | Duplicate content confusion (#8) | Suppress or repurpose notes pane in script mode |
| Teleprompter text sourcing | Wrong verbosity version used (#9) | Resolve active text from verbosityCache + deckVerbosity |
| Large deck export | File size and processing time (#10, #11) | Image compression, multi-stage progress bar |
| Special slide types | No transformation rules (#12) | Per-type handling, graceful fallback |

---

## Integration Pitfalls with Existing Cue Architecture

### Existing Pattern Conflicts

| Cue Pattern | Script Mode Conflict | Resolution |
|-------------|---------------------|------------|
| Content array = brief bullets | Script mode needs expanded bullets as content | Create transformed content separately, don't mutate original slides |
| speakerNotes = progressive disclosure | Script mode flattens progressive disclosure into static bullets | Transform THEN export; never modify the working slide data |
| PptxGenJS via CDN global | Version pinned at 3.12.0, image bugs in 3.14+ | Stay on 3.12.0, don't upgrade for this feature |
| ExportModal html2canvas pipeline | Rasterized text unsuitable for script reading | Use jsPDF text rendering (exportService.ts pattern) for script PDF |
| BroadcastChannel for student view | Script mode export shouldn't affect live presentation | Export operates on a COPY of slide data, not live state |
| Slide.verbosityCache | Active verbosity may not be speakerNotes | Resolve correct text before transformation |

### Data Flow for Script Mode Export

The transformation MUST NOT mutate the original slide data. Correct flow:

```
Original Slides (in-app state)
    |
    v
Copy slides -> Resolve active teleprompter text per slide
    |
    v
Batch AI transformation (5-8 slides per request)
    |
    v
Transformed slide copies (expanded bullets in content, modified speakerNotes)
    |
    v
Export to PPTX or PDF using script-mode layout
```

**Critical invariant:** At no point should the in-app Slide objects be modified. The export operates on cloned data throughout.

### AI Provider Compatibility

| Provider | Concern | Mitigation |
|----------|---------|------------|
| Gemini (free tier) | 5-15 RPM, 250K TPM | Batch requests, delays between batches |
| Gemini (paid) | Higher limits, still needs batching | Same architecture, faster execution |
| Claude (free tier) | 5 RPM, 20K TPM | May be too constrained for large decks |
| Claude (paid) | Adequate limits | Same architecture as Gemini path |

---

## Confidence Assessment

| Pitfall Area | Confidence | Reason |
|--------------|------------|--------|
| AI transformation quality (#1) | HIGH | Direct analysis of existing teleprompter format in geminiService.ts |
| Batch processing limits (#2) | HIGH | Verified rate limits from official Gemini and Claude docs |
| PPTX text overflow (#3) | HIGH | Measured: existing layout at fontSize 24 with 4.5" height vs expanded text length |
| PPTX image distortion (#4) | MEDIUM | Bug documented in v3.14.0; Cue uses v3.12.0 (may not be affected) |
| PDF text quality (#5) | HIGH | Known html2canvas limitation, existing exportService.ts proves alternative works |
| Preview fidelity (#6) | MEDIUM | Common pattern across export tools, inferred from font/rendering differences |
| Pasted slide handling (#7) | HIGH | Direct analysis of Slide type and pasted-slide design decisions |
| Speaker notes duplication (#8) | HIGH | Direct code analysis of pptxService.ts line 77 |
| Verbosity cache (#9) | HIGH | Direct analysis of types.ts verbosityCache and deckVerbosity fields |
| File size (#10) | MEDIUM | Estimated from typical base64 image sizes |
| Progress feedback (#11) | HIGH | Existing pattern in ExportModal.tsx, known UX requirement |
| Special slide types (#12) | HIGH | Direct analysis of slideType enum and content structures |

---

## Sources

### Cue Codebase Analysis (HIGH confidence)
- `/services/pptxService.ts` -- Existing PPTX export layout, image handling, speaker notes
- `/services/exportService.ts` -- Text-based PDF rendering with jsPDF (proven pattern)
- `/components/ExportModal.tsx` -- html2canvas PDF pipeline, progress state
- `/services/geminiService.ts` -- Teleprompter format rules, progressive disclosure system
- `/services/aiProvider.ts` -- AI provider interface, withRetry utility, slide context building
- `/types.ts` -- Slide type, verbosityCache, SlideSource, layout options

### External Documentation (MEDIUM-HIGH confidence)
- [PptxGenJS Image API Docs](https://gitbrent.github.io/PptxGenJS/docs/api-images/)
- [PptxGenJS Text Autofit Issue #330](https://github.com/gitbrent/PptxGenJS/issues/330)
- [PptxGenJS Base64 Image Bug #1351](https://github.com/gitbrent/PptxGenJS/issues/1351)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Claude API Rate Limits](https://docs.anthropic.com/en/api/rate-limits)

### WebSearch Findings (MEDIUM confidence)
- [Creating PDFs from HTML+CSS: What actually works (Joyfill)](https://joyfill.io/blog/creating-pdfs-from-html-css-in-javascript-what-actually-works)
- [jsPDF + html2canvas iOS Issues #3876](https://github.com/parallax/jsPDF/issues/3876)
- [LLM Token Limit Approaches (Deepchecks)](https://www.deepchecks.com/5-approaches-to-solve-llm-token-limits/)
