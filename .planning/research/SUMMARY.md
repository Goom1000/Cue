# Project Research Summary

**Project:** Cue v4.1 - Script Mode (Share with Colleague) Export
**Domain:** AI-powered presentation transformation for teacher lesson handoff
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

The "Share with Colleague" feature transforms Cue's teleprompter-driven presentations into standalone teaching materials that a substitute or collaborating teacher can deliver without the original presenter. This is achieved by using AI to convert the progressive-disclosure teleprompter scripts (stored in `speakerNotes`) into expanded, self-contained bullet points suitable for on-slide display, then exporting as PPTX or PDF with images preserved.

The critical insight from research is that **no new library dependencies are needed**. The existing stack — PptxGenJS 3.12.0 (CDN), jsPDF 4.0.0, html2canvas 1.4.1, and the Gemini/Claude AI provider abstraction — already handles every capability. The work is entirely service-layer code: a new `scriptTransformService.ts` for AI text expansion, extension of `pptxService.ts` with export options, and a new `ShareModal.tsx` component following the proven ExportModal pattern. The architecture creates temporary "script version" slides in memory during export, never mutating the original deck, and processes AI transformations in batched requests (5-8 slides per call) to manage token limits and maintain narrative coherence.

The primary risks center on AI transformation quality (avoiding lossy, generic bullet output that strips pedagogical value) and PPTX layout challenges (preventing text overflow when expanded bullets are 3-5x longer than original content). Prevention requires explicit prompt engineering with few-shot examples to preserve teaching narrative, plus a dedicated script-mode PPTX layout with reduced font size (16-18pt vs 24pt) and full-width text area. Secondary risks include handling special slide types (pasted slides, Work Together, Class Challenge) gracefully and respecting verbosity cache for correct text sourcing.

## Key Findings

### Recommended Stack

**Zero new dependencies required.** All capabilities are covered by existing libraries:

**Core technologies:**
- **PptxGenJS 3.12.0 (CDN):** PPTX generation with base64 image embedding and text bullets. Already proven for current exports, just needs layout adjustment for longer bullet text in script mode.
- **jsPDF 4.0.0 + html2canvas 1.4.1:** PDF generation. Use the existing ExportModal rasterize pattern for visual fidelity (render React slides, capture with html2canvas, embed as images).
- **Gemini/Claude AI providers:** Text transformation via new `transformSlidesForSharing()` method added to existing `AIProviderInterface`. Batched calls (5-8 slides) with full-deck context for narrative coherence.

**What NOT to add:**
- Don't install pptxgenjs via npm (would duplicate CDN version)
- Don't switch to pdf-lib (jsPDF 4.0.0 already handles image embedding and text layout)
- Don't adopt puppeteer/playwright (client-side SPA, html2canvas already proven)
- Don't add Batch API (single batched call is faster for typical 8-15 slide decks)

**Critical version note:** Stay on PptxGenJS 3.12.0. Version 3.14.0+ has documented bugs with base64 image aspect ratio distortion.

### Expected Features

**Must have (table stakes):**
- One-click export to PPTX (teachers live in PowerPoint — non-negotiable format)
- Slide images preserved (visual anchor, already base64 data URLs)
- Expanded talking points per slide (the core value — AI transforms teleprompter into readable teaching notes)
- Slide titles preserved (colleague needs topic orientation)
- Automatic file download (no cloud flows, no accounts)
- Sensible filename (deck title + "Script Version" suffix)

**Should have (competitive differentiators):**
- **AI-transformed talking points** (not raw teleprompter copy) — restructured for standalone reading, not delivery-aligned progressive disclosure
- Optional in-app preview (teacher sees script version before exporting, catches errors)
- Handles all slide types gracefully (pasted slides, Work Together, Class Challenge need special treatment)
- Progress feedback during generation (AI transformation takes 8-15s for typical decks)
- Deck-level context in AI prompt (surrounding slides inform coherent narrative)

**Defer (anti-features to NOT build):**
- Generation-time "Script Mode" toggle (export-time transformation is simpler and non-destructive)
- Editable script-version slides in-app (creates two parallel decks to maintain — massive complexity)
- Per-slide AI regeneration in preview (delays export, adds UI complexity)
- Cloud sharing / link-based sharing (outside scope for local SPA)
- Verbosity selection for script version (use deck's existing verbosity as input)
- Dual-format export (PPTX + PDF in one click — confusing, let teacher choose)

**Feature design principle:** Talking points should be 4-7 concise but substantive bullet points per slide. Each bullet is action-oriented ("Ask students to..." not "Students should understand..."), self-contained (no cross-referencing), concrete (include the specific example/analogy), and preserve interaction prompts from teleprompter (transform "[PAUSE]" to "Pause — ask if anyone has questions so far").

### Architecture Approach

The recommended architecture follows a **transform-then-export pipeline** similar to the existing AI Poster flow in ExportModal, but simpler because it transforms text data rather than generating entirely new layouts. The feature creates **temporary "script version" slides in memory** during the modal lifecycle, adds a **new dedicated AI method** (not reusing `regenerateTeleprompter`), and reuses the existing `SlideContentRenderer` for preview.

**Major components:**

1. **ShareModal.tsx (NEW):** Modal orchestrator — manages transformation lifecycle (initiation → progress → preview → export). Auto-triggers AI on mount, shows progress, displays scrollable preview grid, handles PPTX/PDF downloads. Holds script slides in component-local state, never mutates App.tsx slides.

2. **scriptTransformService.ts (NEW):** AI prompt construction, response parsing, ScriptSlide construction, adapter function `toRenderableSlide()` for compatibility with SlideContentRenderer. Handles special slide types (pasted, Work Together, Class Challenge) and verbosity cache resolution.

3. **AIProviderInterface extension:** Add `transformSlidesForSharing(slides, lessonTopic): Promise<ScriptSlide[]>` method. Implement in both GeminiProvider and ClaudeProvider. Use batched calls (5-8 slides per request) for cross-slide context, not per-slide calls.

4. **pptxService.ts (MODIFIED):** Add optional `PptxExportOptions` parameter for `bulletFontSize` (default 24, script mode uses 16-18) and `includeSpeakerNotes` toggle. Backward-compatible — existing calls work unchanged.

5. **App.tsx (MODIFIED):** Add "Share" button to editor toolbar, `showShareModal` state, render ShareModal alongside existing modals. Pass slides, lessonTitle, provider, addToast as props.

**Data flow:**
```
User clicks "Share" → ShareModal opens (receives slides[], lessonTitle, provider)
  → AI batch transformation (all slides, 1-2 API calls)
  → ScriptSlide[] created (expanded bullets, images by reference, in-memory only)
  → Preview render (SlideContentRenderer with adapter)
  → User clicks "Download PPTX" or "Download PDF"
  → Export (PPTX uses extended pptxService, PDF uses html2canvas rasterize)
  → Modal closes, scriptSlides discarded
```

**Critical invariant:** Original slides are never mutated. Export operates on cloned data throughout.

### Critical Pitfalls

1. **AI transforms teleprompter into lossy, generic bullets** — The teleprompter uses progressive-disclosure format with emoji delimiters, conversational tone, and teacher-action cues. Naive "convert to bullets" prompts strip pedagogical structure, producing generic textbook summaries. **Prevention:** Explicit prompt with few-shot examples showing desired output style. Instruct AI to preserve teaching narrative, examples, analogies, and interaction cues. Validate output length (if shorter than input, content was lost). Preserve segment count (N+1 segments should produce N+ bullets).

2. **Batch processing hits token limits or rate throttling** — A 30-slide deck with detailed verbosity could generate 15K-30K input tokens. Single massive request risks rate limits (Claude free tier: 20K TPM), output truncation, and quality degradation in later slides. **Prevention:** Batch slides in groups of 5-8 per AI request with 1-2 second delays between batches. Show progress indicator ("Transforming slides 1-5 of 30..."). Set explicit `max_tokens` (150-200 per slide). Use existing `withRetry` utility for transient failures.

3. **PPTX export with expanded text overflows slide layout** — Current layout uses fontSize 24 with 4.5" text height, fitting ~8-10 short bullet lines. Script mode bullets are 3-5x longer — a single bullet might wrap to 3-4 lines. With 4-6 bullets, that's 12-24 lines, causing text clipping or image overlap. **Prevention:** Create dedicated script-mode PPTX layout separate from existing — reduce fontSize to 16-18pt, use full slide width for text (no side-by-side image), increase content area to 5.5" height. Test with detailed-verbosity teleprompter content.

4. **PptxGenJS base64 image aspect ratio distortion** — Documented bug in v3.14.0+ where base64 images are forced into 16:9 aspect ratio regardless of `sizing: { type: "contain" }`. Pasted images and AI-generated images may have arbitrary aspect ratios. **Prevention:** Stay on PptxGenJS 3.12.0 (current CDN version). Test with square, portrait, landscape, and panoramic images. If distortion occurs, calculate image dimensions manually before passing to `addImage()`.

5. **PDF export via html2canvas produces blurry text** — The ExportModal rasterize pattern works for "Working Wall" posters viewed from distance, but script mode PDFs need readable text for colleagues studying up close. html2canvas rasterizes text to pixels (non-selectable, non-searchable), and even at scale:2, small fonts appear fuzzy. **Prevention:** For script mode PDF, consider using jsPDF native text rendering (like exportService.ts worksheet pattern) instead of html2canvas capture. This produces vector text with smaller file sizes and better print quality. Reserve html2canvas for visual preview only.

## Implications for Roadmap

Based on research, suggested phase structure prioritizes AI transformation quality first (the core value), followed by PPTX export (primary use case), then PDF + polish. Build in dependency order to minimize integration risk.

### Phase 1: AI Transformation Service

**Rationale:** Without high-quality AI text transformation, everything else is just layout work. This is the core value proposition and highest risk area. Build and validate prompt design before wiring up UI or exports.

**Delivers:**
- `ScriptSlide` type definition in types.ts
- `scriptTransformService.ts` with prompt construction and response parsing
- `transformSlidesForSharing()` added to AIProviderInterface
- Implementation in ClaudeProvider
- Implementation in GeminiProvider

**Addresses:** Must-have feature "expanded talking points per slide," differentiator "AI-transformed (not raw teleprompter)," and feature design principles (4-7 bullets, action-oriented, preserve pedagogical cues).

**Avoids:** Pitfall #1 (lossy transformation). Prompt must include explicit guidance, few-shot examples, and validation logic. Test output with console logging before UI integration.

**Research flag:** Standard pattern — no deeper research needed. Existing `AIProviderInterface` and prompt patterns are well-established.

---

### Phase 2: PPTX Export Extension

**Rationale:** PPTX is the primary share format (teachers live in PowerPoint). Needs dedicated script-mode layout to prevent text overflow. This phase is isolated from UI — can be tested via direct function calls.

**Delivers:**
- Optional `PptxExportOptions` parameter added to `exportToPowerPoint()` in pptxService.ts
- Script-mode layout with reduced font size (16-18pt), full-width text area, smaller image placement
- Suppression or repurposing of speaker notes field for script mode
- Test cases with pasted slides, Work Together slides, detailed verbosity content

**Addresses:** Must-have features "one-click export to PPTX" and "slide images preserved." Handles special slide types gracefully (Work Together, Class Challenge, pasted).

**Avoids:** Pitfall #3 (text overflow). New layout designed specifically for expanded bullets. Also addresses Pitfall #4 (image distortion) by staying on PptxGenJS 3.12.0 and testing all aspect ratios. Addresses Pitfall #8 (speaker notes duplication) by suppressing notes in script mode.

**Research flag:** Standard pattern — existing pptxService.ts provides clear extension points. No additional research needed.

---

### Phase 3: ShareModal UI

**Rationale:** Brings together AI transformation and PPTX export with preview and progress feedback. Once Phases 1-2 are solid, this is straightforward wiring following ExportModal pattern.

**Delivers:**
- `ShareModal.tsx` component with auto-trigger transformation on mount
- Progress indicator during AI calls ("Transforming slides X of Y...")
- Scrollable preview grid using SlideContentRenderer + `toRenderableSlide()` adapter
- "Download PPTX" button (primary action)
- Error handling and user feedback (via addToast)
- "Share" button added to App.tsx editor toolbar
- Modal state management in App.tsx

**Addresses:** Must-have features "automatic file download," "sensible filename." Should-have features "optional in-app preview," "progress feedback during generation," "deck-level context in AI prompt."

**Avoids:** Pitfall #2 (token limits) via batched processing with progress UI. Addresses Pitfall #6 (preview fidelity mismatch) by using same SlideContentRenderer as actual slides, setting expectations appropriately.

**Research flag:** Standard pattern — ExportModal, CondensationPreview, and other modals provide clear blueprint. No additional research needed.

---

### Phase 4: PDF Export + Special Cases (Optional)

**Rationale:** PPTX is launch-critical, PDF is "nice to have." Also includes edge case handling that can be deferred if time-constrained.

**Delivers:**
- PDF export option in ShareModal (secondary button)
- Native jsPDF text rendering (exportService.ts pattern) or html2canvas rasterize (ExportModal pattern)
- Pasted slide handling (preserve original image, notes below or in notes pane)
- Work Together / Class Challenge transformation rules
- Verbosity cache resolution logic (`getActiveTeleprompterText()` utility)
- Large deck handling (chunking for 25+ slides)
- Image compression for file size optimization

**Addresses:** Must-have feature "one-click export to PDF." Should-have feature "handles all slide types gracefully."

**Avoids:** Pitfall #5 (blurry PDF text) via jsPDF native rendering. Addresses Pitfall #7 (pasted slides with empty script bullets) via source-aware transformation. Addresses Pitfall #9 (verbosity cache inconsistency) by resolving active teleprompter text before transformation.

**Research flag:** Moderate complexity. PDF approach decision (native text vs rasterize) may need brief exploration during phase planning, but exportService.ts provides proven native-text pattern.

---

### Phase Ordering Rationale

- **Phases 1 & 2 are parallel-safe** if needed — AI transformation and PPTX export have zero overlap. However, sequential is safer for validation (test prompt output quality before wiring up export).
- **Phase 3 depends on Phases 1 & 2** — ShareModal is just the orchestrator. If service layer is solid, UI is low-risk.
- **Phase 4 is genuinely optional** — PPTX covers 80% of use cases. PDF and edge cases can be follow-up work if time-constrained or if user feedback suggests prioritizing other features.
- **Foundation-first approach avoids rework** — getting AI transformation quality right in Phase 1 prevents having to refactor prompt logic after UI is built.

### Research Flags

**Phases with standard patterns (skip `/gsd:research-phase`):**
- **Phase 1 (AI transformation):** Existing `AIProviderInterface`, `posterService.ts` batched processing, and prompt patterns from `geminiService.ts` provide clear blueprint. High confidence implementation.
- **Phase 2 (PPTX export):** Existing `pptxService.ts` structure is well-understood. Extension via optional parameters is straightforward. High confidence implementation.
- **Phase 3 (ShareModal UI):** Existing `ExportModal.tsx` and `CondensationPreview.tsx` provide proven modal patterns. React component architecture is standard. High confidence implementation.

**Phase likely needing research validation during planning:**
- **Phase 4 (PDF + special cases):** Decision between jsPDF native text rendering vs html2canvas rasterize for script PDF should be validated with quick prototype during phase planning. Also verify PptxGenJS 3.12.0 image handling with real Cue data URLs. **Recommendation:** Allocate 30-60 minutes during Phase 4 planning to test both PDF approaches with actual slides and compare output quality.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All dependencies verified present in codebase. PptxGenJS image embedding confirmed in existing pptxService.ts. jsPDF patterns proven in ExportModal.tsx and exportService.ts. AI provider abstraction already supports extensibility. |
| Features | HIGH | Table stakes and differentiators derived from domain research (substitute teacher plans, PowerPoint speaker notes usage) and codebase analysis (existing export patterns, teleprompter structure). Anti-features validated against complexity vs value tradeoffs. |
| Architecture | HIGH | Recommended component boundaries follow existing patterns (posterService + ExportModal flow, provider interface extension, modal orchestration). Data flow verified against existing codebase invariants (no mutation of original slides). Special slide type handling validated via types.ts analysis. |
| Pitfalls | HIGH | Critical pitfalls identified via codebase analysis (teleprompter format in geminiService.ts, PPTX layout dimensions in pptxService.ts, verbosity cache in types.ts) and official documentation (rate limits, PptxGenJS bugs, html2canvas limitations). |

**Overall confidence:** HIGH

Research is comprehensive with direct codebase verification and official source documentation. The recommended approach is conservative (zero new dependencies) and follows proven patterns throughout the codebase.

### Gaps to Address

**Verbosity cache behavior with detailed mode:** The existing `getActiveTeleprompterText()` logic needs validation — if `deckVerbosity === 'detailed'` but `verbosityCache.detailed` is undefined for some slides (partially regenerated deck), what should happen? **Resolution during planning:** Define fallback hierarchy (detailed cache → speakerNotes → error state).

**PptxGenJS 3.12.0 image handling confirmation:** While codebase uses this version via CDN, the base64 image aspect ratio distortion bug is documented in 3.14.0+. Need to confirm 3.12.0 does NOT have this issue with real Cue data URLs. **Resolution during Phase 2:** Quick test export with square, portrait, and landscape images before implementing full layout.

**Optimal batch size for AI calls:** Research suggests 5-8 slides per batch, but optimal size depends on actual token counts from real decks with different verbosity levels. **Resolution during Phase 1:** Test with 3 representative decks (concise 15-slide, standard 10-slide, detailed 20-slide) and measure token usage to tune batch size.

**PDF export approach decision:** html2canvas rasterize (existing pattern, guaranteed visual fidelity) vs jsPDF native text (better text quality, smaller files). **Resolution during Phase 4 planning:** 30-minute prototype test comparing both approaches with actual script slides. Measure file size, text readability on screen and print, and implementation complexity.

## Sources

### Primary (HIGH confidence)

**Codebase analysis:**
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/services/pptxService.ts` — Existing PPTX export with image embedding, layout dimensions, speaker notes handling
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/services/exportService.ts` — Text-based PDF generation with jsPDF, proven pattern for native text rendering
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/components/ExportModal.tsx` — Modal orchestration, html2canvas rasterize pattern, progress state management
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/services/geminiService.ts` — Teleprompter format rules, progressive disclosure system, TELEPROMPTER_RULES_DETAILED
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/services/aiProvider.ts` — AIProviderInterface, withRetry utility, buildSlideContextForEnhancement pattern
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/types.ts` — Slide type definition, verbosityCache, SlideSource, layout options, slideType enum

**Official documentation:**
- [PptxGenJS Images API](https://gitbrent.github.io/PptxGenJS/docs/api-images/) — Base64 data property, sizing modes (contain/cover/crop)
- [jsPDF addImage documentation](https://artskydj.github.io/jsPDF/docs/module-addImage.html) — Base64 image support, coordinate-based placement
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits) — 250K TPM, 5-15 RPM on free tier
- [Claude API Rate Limits](https://docs.anthropic.com/en/api/rate-limits) — 20K TPM on free tier

### Secondary (MEDIUM-HIGH confidence)

- [Microsoft - Print slides with notes](https://support.microsoft.com/en-us/office/print-your-powerpoint-slides-handouts-or-notes-194d4320-aa03-478b-9300-df25f0d15dc4) — Authoritative on PowerPoint speaker notes usage
- [Moreland - Creating Substitute Plans](https://moreland.edu/resources/blog-insights/creating-substitute-plans-without-stress-a-teachers-guide-how-ai-can-help) — Domain research on teacher handoff materials
- [Education Corner - Creating Effective Sub Plans](https://www.educationcorner.com/how-create-sub-plans/) — Design principles for teaching handoff documentation
- [PptxGenJS GitHub Issues #1351, #330, #313] — Known bugs with base64 images and text autofit
- [jsPDF 4.0.0 Release Notes](https://github.com/parallax/jsPDF/releases) — Security-focused release, no browser API changes

### Tertiary (LOW confidence - noted for completeness)

- Duarte blog on speaker notes — Principles verified via other sources but content not fully accessible
- Teaching Hub presentation guidelines — Generic presentation advice, not Cue-specific
- Readability Guidelines presentations — Standard design principles

---

*Research completed: 2026-02-08*
*Ready for roadmap: yes*
