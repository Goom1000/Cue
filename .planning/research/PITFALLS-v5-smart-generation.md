# Domain Pitfalls: v5.0 Smart Generation Pipeline

**Domain:** Multi-pass AI generation with auto gap analysis, resource upload integration, lesson phase detection, and dual-provider parity
**Project:** Cue v5.0 - Smart Generation Pipeline
**Researched:** 2026-02-14
**Confidence:** HIGH (verified against Cue codebase patterns + production debug history + research literature)

## Executive Summary

Adding a multi-pass generation pipeline to an existing ~35,000 LOC client-side app with dual AI providers creates compounding complexity at four levels: (1) sequential AI calls where each pass depends on the previous pass's output quality, (2) token budget pressure when stuffing lesson plan text, resource content, and existing slides into a single context window, (3) pedagogical structure detection from unstructured text that varies wildly in format, and (4) maintaining behavioral parity between Gemini and Claude when their structured output mechanisms are fundamentally different. The biggest risk is not any single pitfall but the interaction between them: a token-truncated resource causes a gap analysis miss, which causes the auto-generation pass to produce redundant slides, which then takes so long that the teacher abandons the feature. This document maps the pitfalls from the most dangerous (rewrites, data loss) to the most common (UX annoyance, quality degradation).

---

## Critical Pitfalls

Mistakes that cause rewrites, broken generation, or major user-facing failures.

---

### Pitfall 1: Generation-Verification Feedback Loop (Multi-Pass Amplifies Errors)

**What goes wrong:** In a multi-pass pipeline (generate slides, then verify against lesson plan, then fill gaps), errors in pass 1 propagate and amplify in pass 2. If the initial generation misinterprets the lesson plan, the gap analysis will identify "gaps" that are actually covered by misnamed slides. The gap fill pass then generates redundant content. The teacher ends up with 20 slides covering 10 topics with duplication.

**Why it happens:**
- Current single-pass generation (in `generateLessonSlides`) produces slides once. Quality issues are visible immediately. Multi-pass means quality issues in pass 1 are hidden until pass 2 exposes them differently.
- The existing gap analysis (`analyzeGaps` in `gapAnalysisPrompts.ts`) compares slide titles and content strings against lesson plan text. It uses semantic matching, not exact matching. If a slide's title is creatively worded (as AI tends to do), the gap analyzer may not recognize it covers a topic.
- The current `MAX_LESSON_PLAN_CHARS = 8000` truncation means long lesson plans lose their later sections, causing false gaps for content that was truncated away.

**Warning signs:**
- Gap analysis consistently finds 5+ "critical" gaps when teacher says deck is mostly complete
- Generated gap-fill slides duplicate existing slide content with different titles
- Coverage percentage swings wildly between runs (60% then 85% on same input)
- Teacher rejects most auto-generated gap fills

**Consequences:** Teacher loses trust in the feature. Worse, if auto-fill is non-optional, they spend more time deleting bad slides than it would take to create good ones manually.

**Prevention:**
1. Keep gap analysis as a reviewable step, not automatic. The current Phase 59 UX (GapAnalysisPanel with manual "Add Slide" buttons) is the right pattern. Do NOT make it automatic in v5.0.
2. Add a deduplication check: before generating a gap-fill slide, compare the gap's suggested content against all existing slide titles AND content arrays using substring matching, not just AI semantic matching.
3. Pass full deck context (not just titles) to gap analysis. The current `buildGapAnalysisContext` uses `buildDeckContextForCohesion` which includes content bullets -- verify this survives token limits when combined with lesson plan text.
4. Surface confidence clearly: if coverage is above 80%, show "Your deck covers this lesson well" rather than listing minor gaps.

**Phase to address:** The phase that wires auto gap analysis into the generation pipeline. Must be after basic multi-pass infrastructure is working.

**Source:** Cue codebase analysis: `gapAnalysisPrompts.ts` line 71 (`MAX_LESSON_PLAN_CHARS = 8000`), `App.tsx` gap analysis flow, debug history from worksheet generation infinite loop.

---

### Pitfall 2: Token Budget Explosion When Combining Sources

**What goes wrong:** The smart generation pipeline must fit lesson plan text + uploaded resource content + existing slide deck (for gap analysis) into a single API call. Each component alone is manageable; combined, they blow past practical token limits. Gemini has large context windows (1M+ tokens) but Claude's window is smaller and costs more per token. Images from PDFs are especially expensive -- each page image is ~1,000-2,000 tokens.

**Why it happens:**
- Current Cue already manages token pressure with careful limits: `MAX_LESSON_PLAN_CHARS = 8000`, `MAX_PAGES_FOR_ANALYSIS = 10`, `MAX_SLIDES = 15` for enhancement context, image limits of 5-10 per call. These limits were tuned for single-feature calls.
- Multi-pass pipeline compounds the problem: pass 1 (generation) needs lesson text + resource content. Pass 2 (gap analysis) needs lesson text + existing slides. If both are in one orchestrated flow, the total context is lesson text (used twice) + resource content + slide deck.
- Resource content varies enormously: a 1-page worksheet is 500 chars; a 20-page teacher guide is 40,000+ chars.
- Image-based PDFs (scanned worksheets) have NO extractable text, so analysis depends on base64 images at ~1,500 tokens each. A 10-page PDF is ~15,000 tokens of images alone.

**Warning signs:**
- API calls returning 400/413 errors (context too long)
- Claude returning truncated/incomplete JSON (ran out of output tokens)
- Gemini silently dropping content from long inputs
- Resource content appearing garbled or summarized in generated slides
- Generation works with short lesson plans but fails with real teacher documents

**Consequences:** Feature works in demo but fails with real teacher content. Teachers upload 15-page lesson plans and the system either crashes or produces slides that ignore the last 60% of the document.

**Prevention:**
1. Implement a token budget system. Before each API call, estimate token usage: `textTokens ~= text.length / 4` (rough English estimate), `imageTokens ~= 1500 per image`. Set hard budgets per call: ~6,000 tokens for lesson text, ~4,000 for resource content, ~3,000 for slide deck context, ~2,000 for system prompt.
2. Implement intelligent truncation with summarization. For long documents: first try truncation (current approach). If truncated content exceeds 30% of total, do a pre-pass summarization call to compress the document to key points before using it as generation context.
3. Keep per-pass token budgets independent. Do NOT try to share context across passes. Pass 1 gets its own budget. Pass 2 gets its own budget. Pass the slides from pass 1 to pass 2, not the original source documents.
4. Set different image limits by provider. Gemini handles more images per call than Claude. Use the existing pattern from `addImages()` in both providers where blend mode limits to 5 per source.
5. Add a pre-flight token estimate and warn the user: "Your lesson plan is very long. Generation may take longer and some content may be summarized."

**Phase to address:** Must be addressed in the FIRST phase -- the multi-pass orchestration layer. Every subsequent phase depends on token budgets being correct.

**Sources:**
- Cue codebase: `documentAnalysisService.ts` line 14 (`MAX_PAGES_FOR_ANALYSIS = 10`), `gapAnalysisPrompts.ts` line 71 (`MAX_LESSON_PLAN_CHARS = 8000`), `aiProvider.ts` line 164 (`buildSlideContextForEnhancement` limits to 15 slides), `claudeProvider.ts` line 764-789 (image limits per mode)
- [5 Approaches to Solve LLM Token Limits](https://www.deepchecks.com/5-approaches-to-solve-llm-token-limits/)
- [Reduce LLM Costs: Token Optimization Strategies](https://www.glukhov.org/post/2025/11/cost-effective-llm-applications/)

---

### Pitfall 3: Dual-Provider Schema Divergence Under Complex Structured Output

**What goes wrong:** Gemini uses `responseSchema` with `@google/genai` Type definitions for guaranteed JSON structure. Claude uses `tool_choice` with JSON Schema for tool input validation, then extracts the tool arguments as structured output. When adding new multi-pass features, each pass needs its own schema. The schemas must produce semantically equivalent output from both providers, but the providers interpret schemas differently, handle edge cases differently, and fail differently.

**Why it happens:**
- Cue already has this pattern well-established: every feature has both a `RESPONSE_SCHEMA` (Gemini) and a `TOOL` (Claude) definition in shared prompt files. See `gapAnalysisPrompts.ts` which exports both `GAP_ANALYSIS_RESPONSE_SCHEMA` and `GAP_ANALYSIS_TOOL`. This pattern works but is fragile.
- Gemini's schema is a subset of OpenAPI 3.0. Claude's tool input_schema is JSON Schema. They overlap but are not identical. Gemini requires `Type.STRING`, `Type.ARRAY`, etc. Claude uses `"type": "string"`, `"type": "array"`. When features get complex (nested arrays of objects with optional fields), the translations can subtly diverge.
- The existing `parity.test.ts` tests source code patterns (import checks, regex matching on provider source) but does NOT test actual output equivalence. It verifies "both providers use the same shared functions" but not "both providers produce the same shaped output for the same input."
- Claude's tool use approach requires extracting `tool_use` content blocks from the response, while Gemini returns direct JSON. If a new feature's response parsing works for one but not the other, it silently fails.
- Gemini now supports `propertyOrdering` in schemas (2025), ensuring key order matches schema. Claude does not guarantee key ordering. If any downstream code depends on key order, it will work on Gemini and fail on Claude.

**Warning signs:**
- Feature works on Gemini but produces empty/malformed results on Claude (or vice versa)
- One provider returns `null` for optional fields while the other omits them entirely
- Numeric fields return as strings in one provider (Gemini's `Type.NUMBER` vs Claude's `"type": "number"`)
- Tests pass with Gemini API key but fail with Claude API key
- Array fields have different ordering between providers

**Consequences:** Feature ships tested on one provider, breaks on the other. Teachers who use Claude see crashes while Gemini users are fine. Because Cue is client-side with no server logs, these failures are invisible to the developer.

**Prevention:**
1. Continue the established pattern: define schemas in shared prompt files (`*Prompts.ts`), export both Gemini and Claude variants. Every new feature must have both from day one.
2. Add structural parity tests that compare the shape of both schemas programmatically: verify they have the same required fields, same property names, same types. The current `parity.test.ts` tests imports, not schemas.
3. Add integration tests with mock responses: create a fixture of expected output, verify both providers' parsing logic produces equivalent TypeScript objects from that fixture.
4. Treat optional fields carefully: if a field can be absent, both schemas must handle it the same way. Prefer required fields with empty defaults over optional fields.
5. Add provider-specific error handling: when a provider returns malformed output, log the raw response before throwing, so debugging is possible.

**Phase to address:** Every phase. This is a process pitfall, not a one-time fix. Each new AI feature needs dual-schema definition as part of the development checklist.

**Sources:**
- Cue codebase: `gapAnalysisPrompts.ts` (dual schema pattern), `parity.test.ts` (current parity testing approach), `claudeProvider.ts` vs `geminiProvider.ts` (response extraction differences)
- [Structured Output Comparison across popular LLM providers](https://www.glukhov.org/post/2025/10/structured-output-comparison-popular-llm-providers/)

---

### Pitfall 4: Resource Content Injection Without Quality Gate

**What goes wrong:** Uploaded resources (worksheets, handouts, teacher guides) are injected into the generation context to make slides "aware" of supplementary materials. But resource content quality varies wildly: scanned PDFs produce garbled OCR text, DOCX files have formatting artifacts, and images have no text at all. Injecting low-quality resource content into generation context causes the AI to produce confusing, garbled, or irrelevant slides.

**Why it happens:**
- The existing `documentProcessors/` pipeline extracts text from PDFs (via pdf.js), images (no text), and DOCX (via mammoth). Text extraction quality depends on the source document quality.
- The existing `documentAnalysisService.ts` already handles this for enhancement (Phase 44) by passing both images AND text to the AI for analysis. But generation context is different: enhancement uses the full analysis pipeline; generation just needs key content as context.
- Teachers will upload anything: hand-drawn worksheets (no OCR text), scanned textbook pages (poor OCR), well-formatted DOCX lesson plans (clean text). The system must handle all of these gracefully.
- Current image processing (`imageProcessor.ts`) stores base64 images but does not extract text. If a resource is an image, there is zero text content to inject into generation.

**Warning signs:**
- Generated slides reference "the worksheet" vaguely instead of specific content from it
- Slides contain garbled text from bad OCR extraction
- Generation ignores the resource entirely (as if it wasn't uploaded)
- AI hallucinates resource content that doesn't match the actual document
- Token budget consumed by low-quality text that adds no value

**Consequences:** Teachers upload resources expecting the AI to use them, but the generated slides don't reflect the resource content. Teachers lose confidence, stop uploading resources, and the feature becomes dead weight.

**Prevention:**
1. Add a resource quality gate before injection: check `resource.content.text` length. If under 100 chars and no images, warn the teacher: "This resource has limited extractable content. Consider a higher-quality scan or typed document."
2. For image-only resources, use the existing `analyzeDocument()` to get a structured description, then inject the DESCRIPTION (not the image) into generation context. This is cheaper (text vs image tokens) and more useful.
3. Implement resource content summarization: if resource text exceeds budget, summarize it into key points (topic, question types, difficulty level, key vocabulary) rather than truncating arbitrarily.
4. Separate resource integration from core generation. Resources should inform slide content, not determine it. The lesson plan drives structure; resources add depth. This means resource content goes into a "supplementary context" section of the prompt, clearly distinguished from the primary lesson plan.
5. Give teacher control: "Use this resource for: slide content / reference only / ignore". Default to "reference only" so the AI mentions it but doesn't try to reproduce it.

**Phase to address:** The resource integration phase. Must come AFTER basic multi-pass pipeline works without resources.

**Source:** Cue codebase: `uploadService.ts`, `documentAnalysisService.ts`, `documentProcessors/imageProcessor.ts` (no text extraction for images), `documentEnhancement/enhancementPrompts.ts` (existing resource-to-slides alignment pattern)

---

## Moderate Pitfalls

Mistakes that cause quality degradation, UX friction, or significant rework.

---

### Pitfall 5: Lesson Phase Detection Brittleness

**What goes wrong:** Detecting pedagogical phases (Introduction, I Do, We Do, You Do, Plenary/Assessment) from unstructured lesson plan text works well when teachers use standard headings but fails catastrophically when they don't. Lesson plans come in every conceivable format: bullet lists, numbered steps, narrative paragraphs, tables, or even shorthand notes.

**Why it happens:**
- There is no standard format for lesson plans. Some teachers write formal plans with "Learning Objective:", "Success Criteria:", "Main Activity:" headings. Others write "1. Recap fractions 2. Show pizza example 3. Worksheet 4. Plenary."
- The 5E framework (Engage, Explore, Explain, Elaborate, Evaluate) is common in Australian curriculum contexts, but teachers rarely label their plans with these exact terms.
- Pattern matching on headings (regex for "Introduction", "Main Activity", etc.) catches maybe 40% of plans. The rest need semantic understanding.
- AI-based phase detection requires sending the full lesson plan to the AI, which is an additional API call with its own token budget and latency.

**Warning signs:**
- Phase detection splits a single activity across two phases
- "I Do" and "We Do" combined into one phase because the plan doesn't distinguish them
- Detection identifies 8+ phases for a simple lesson (over-splitting)
- Detection returns 1-2 phases for a complex lesson (under-splitting)
- Activities listed as "Introduction" because they appear at the start of the document

**Prevention:**
1. Use a two-tier approach: first try regex/heuristic detection on common headings (fast, no API call). If no clear structure found, fall back to AI-based detection (one API call).
2. Design the phase detection schema to be forgiving: allow "unknown" as a phase type. Better to say "I couldn't determine the phase" than to misclassify.
3. Map detected phases to slide generation as suggestions, not mandates. The teacher should see "I think this is the introduction section" and be able to correct it before generation proceeds.
4. Build a small library of common lesson plan patterns from Australian primary school conventions: "Warm-up", "Main Lesson", "Independent Practice", "Reflection", etc.
5. Accept that some plans are unstructured by design. A 3-line lesson plan ("Talk about fractions. Do worksheet. Mark together.") is valid. Don't try to force it into 5 phases.

**Phase to address:** Phase detection should be a standalone utility module (like `contentPreservation/detector.ts`) that can be tested independently before being wired into generation.

---

### Pitfall 6: Generation Wait Time Exceeds Teacher Patience

**What goes wrong:** Current single-pass generation takes 10-30 seconds. Multi-pass pipeline adds: pass 1 (generate: 10-30s) + pass 2 (gap analysis: 5-15s) + pass 3 (fill gaps: 5-15s per gap, could be 3-5 gaps). Total: 30-90+ seconds. Teachers waiting over 30 seconds will assume the app has frozen and reload.

**Why it happens:**
- Each AI pass is a separate API call with its own latency (network + inference).
- The existing progress UI shows phase transitions (`generationProgress` in App.tsx tracks 'slides' and 'teleprompter' phases) but doesn't account for additional passes.
- Client-side only means no background processing. The browser tab must stay active.
- Claude API calls are generally slower than Gemini for equivalent tasks.

**Warning signs:**
- Teachers refreshing the page during generation
- "Is it broken?" support requests
- Generation exceeding 60 seconds regularly
- Mobile browsers killing the tab for inactivity

**Prevention:**
1. Show granular progress: "Generating slides... (1/3)" then "Checking lesson coverage... (2/3)" then "Filling gaps... (3/3)". The existing `setGenerationProgress` pattern supports this -- extend the phase union type.
2. Make gap analysis optional. Default to single-pass generation. Offer "Check for gaps" as a post-generation button (the current Phase 59 UX). Auto gap analysis is a v5.1 feature, not v5.0.
3. Stream results where possible. Show slides as they're generated (pass 1), then show gap analysis results separately. Don't block the entire UI on a 3-pass pipeline.
4. Implement early termination: if gap analysis finds 0 gaps, skip pass 3 entirely. If coverage is 90%+, show "Great coverage!" and don't suggest fills.
5. Consider parallel passes where independent: resource analysis can run in parallel with slide generation since they don't depend on each other.

**Phase to address:** Pipeline orchestration phase. Progress UI must be designed before any multi-pass work begins.

**Source:** Cue codebase: `App.tsx` lines 316-317 (generationProgress state), lines 562-616 (generation flow with progress tracking), lines 2382-2401 (progress UI)

---

### Pitfall 7: Slide Position Conflicts During Gap Fill

**What goes wrong:** Gap analysis suggests insertion positions (0-indexed, from `suggestedPosition` in `IdentifiedGap`). If multiple gaps suggest similar positions, or if slides are reordered between analysis and fill, the positions become invalid. Slides insert in wrong places, breaking lesson flow.

**Why it happens:**
- `suggestedPosition` in `IdentifiedGap` is an absolute index into the slide array at analysis time. If the teacher adds, removes, or reorders slides between analysis and gap fill, the index is stale.
- If 3 gaps all suggest position 5, inserting the first one shifts all subsequent positions by 1. The naive approach inserts gap 2 at position 5 (now wrong -- it should be 6).
- The current Phase 59 implementation handles this correctly for manual single-gap insertion (`handleAddSlideFromGap` in App.tsx). But auto-filling multiple gaps simultaneously needs to handle position shifting.

**Warning signs:**
- Gap-fill slides appearing at the end of the deck instead of logical positions
- Two gap-fill slides adjacent when they should be separated by existing content
- Gap-fill slide inserted before its prerequisite content

**Prevention:**
1. Sort gaps by `suggestedPosition` descending before inserting. Insert from the end of the deck backward so earlier indices remain valid.
2. Recalculate positions after each insertion if inserting sequentially.
3. Better: use "after slide titled X" anchoring instead of absolute indices. Find the slide by title/content similarity and insert after it. This is robust to reordering.
4. Show the teacher a preview of where each gap will be inserted before committing. Allow drag-to-reorder on the preview.

**Phase to address:** Gap fill orchestration phase. Must be solved before auto-fill is implemented.

---

### Pitfall 8: Resource Integration Conflated With Resource Enhancement

**What goes wrong:** Cue already has "resource enhancement" (Phase 44-45): upload a worksheet, AI creates differentiated versions. v5.0 adds "resource integration": upload a resource, AI uses its content to inform slide generation. These are fundamentally different features but share the upload pipeline. If not clearly separated, the codebase conflates them, leading to confusing code paths and unexpected behavior.

**Why it happens:**
- Both features start with `uploadService.ts` and `documentProcessors/`.
- Both use `analyzeDocument()` from `documentAnalysisService.ts`.
- The existing `DocumentAnalysis` type was designed for enhancement (detecting worksheet structure, element types, etc.). Resource integration needs different analysis (extract key topics, vocabulary, difficulty level).
- The existing `EnhancementPanel` UI is for creating differentiated worksheets. Resource integration has no UI of its own yet.

**Warning signs:**
- Resource integration reusing `DocumentAnalysis` fields that don't apply (e.g., `documentType: 'worksheet'` for a teacher guide)
- Enhancement results appearing when the teacher expected generation context
- Code using `resource.content.text` for both generation context and enhancement input without distinguishing the use case
- Teachers confused about whether uploading a resource will modify it or inform slides

**Prevention:**
1. Define a clear conceptual boundary: "Enhancement" = transform the resource itself. "Integration" = use the resource to inform slide generation. Keep separate service modules.
2. Create a new type for resource integration context: `ResourceContext { summary: string, keyTopics: string[], vocabulary: string[], difficultyLevel: string }`. This is what gets injected into generation, NOT the raw `DocumentAnalysis`.
3. In the UI, separate the actions: "Enhance this resource" (existing) vs "Use in generation" (new). These should be different buttons/flows.
4. The existing `UploadedResource` type can stay shared. The divergence should happen at the service layer, not the data model.

**Phase to address:** Resource integration phase. Must be designed explicitly as separate from enhancement before implementation begins.

---

### Pitfall 9: The "Everything At Once" Generation UI

**What goes wrong:** The temptation with v5.0 is to present a single "Smart Generate" button that does everything: generates slides from lesson plan, integrates resources, detects phases, checks gaps, and fills them. This creates a black box where the teacher has no visibility into what the AI is doing and no ability to intervene between steps.

**Why it happens:**
- The current generation flow is already a single button: "Generate Lesson". Adding more passes behind the same button seems natural.
- Multi-pass pipelines are easier to implement as a single async function than as a series of user-reviewed steps.
- Product pressure to make the feature feel "magical" and seamless.

**Warning signs:**
- Teachers can't understand why 15 slides were generated instead of 10
- No way to skip gap analysis for a quick generation
- Teacher wants to use resources but not phase detection, and there's no way to opt out
- Generation fails at step 3 of 4, and the teacher loses all progress

**Prevention:**
1. Progressive disclosure of pipeline steps. Start with: generate slides (required) -> review -> optionally check gaps -> optionally fill gaps. Never auto-fill without review.
2. Make each enhancement optional with clear toggles: "Use uploaded resource", "Check for gaps after generation", "Detect lesson phases".
3. Save intermediate results. If generation succeeds but gap analysis fails, the teacher still has their slides. Use the existing `setSlides()` to commit results at each successful step.
4. Default to the simplest flow. Current "paste lesson plan -> generate" should remain the primary path. Smart features are add-ons, not replacements.

**Phase to address:** UX design phase. Must be resolved before implementation begins. The current Phase 59 GapAnalysisPanel pattern (separate, opt-in, reviewable) is the right model.

---

## Minor Pitfalls

Mistakes that cause friction, confusion, or minor quality issues.

---

### Pitfall 10: Lesson Phase Labels Don't Match Teacher Vocabulary

**What goes wrong:** The system uses pedagogical framework terms (Engage, Explore, Explain, Elaborate, Evaluate) but teachers use informal terms (Starter, Main, Independent Work, Plenary). The AI labels slides with framework terms the teacher doesn't recognize.

**Prevention:**
1. Map formal phase names to common Australian primary school terms in the UI. Show "Starter Activity" not "Engage Phase".
2. Let the teacher rename phases. The detection provides defaults; the teacher customizes.
3. Include both formal and informal terms in the detection prompt so the AI recognizes either.

---

### Pitfall 11: Resource Content Poisoning Generation Quality

**What goes wrong:** A poorly-formatted resource (garbled OCR, random text from headers/footers) gets injected into generation context and causes the AI to produce nonsensical slides referencing the garbled content.

**Prevention:**
1. Sanitize resource text before injection: strip common OCR artifacts (page numbers, headers/footers, copyright notices).
2. Set a minimum quality threshold: if extracted text has more than 30% non-alphanumeric characters, flag it as low quality and don't inject it.
3. Use the structured `DocumentAnalysis` summary rather than raw text. The analysis pipeline already filters for meaningful content.

---

### Pitfall 12: Gap Analysis Over-Reporting on Enrichment Content

**What goes wrong:** Gap analysis flags extension activities, enrichment tasks, and "stretch" challenges from the lesson plan as "critical" gaps. These are explicitly designed to be optional, but the AI treats all lesson plan content as equally important.

**Prevention:**
1. Add heuristic detection for enrichment markers: "Extension:", "Challenge:", "For higher ability:", "If time permits:", "Stretch:". Classify these as "nice-to-have" regardless of AI's severity assignment.
2. Include severity calibration examples in the gap analysis prompt (already partially done in `GAP_ANALYSIS_SYSTEM_PROMPT`). Add explicit examples of what is NOT critical.
3. Set a maximum of 2-3 "critical" gaps per analysis. Force the AI to prioritize.

---

### Pitfall 13: Claude Image Generation Gap Widens

**What goes wrong:** `claudeProvider.ts` already returns `undefined` for `generateSlideImage()` and `generateResourceImage()` because Claude doesn't support image generation. In multi-pass generation, this means Claude-generated slides have no images while Gemini-generated slides do. The quality gap between providers widens.

**Prevention:**
1. This is an existing known limitation. Document it clearly for teachers: "Image generation is only available with Gemini."
2. Ensure the multi-pass pipeline doesn't break when image generation returns `undefined`. All new passes that reference slide images must handle the no-image case.
3. Consider adding a post-generation image generation pass that uses Gemini's image API regardless of which provider generated the text. This is a v5.1 enhancement, not v5.0.

---

### Pitfall 14: State Management Complexity From Multi-Pass Results

**What goes wrong:** The existing App.tsx already has complex state management (the infinite loop bug from `resolved-worksheet-generation-infinite-loop-crash.md` was caused by callback identity changes in enhancement state). Multi-pass adds more interdependent state: generation results, gap analysis results, gap fill results, resource integration state. Each new state variable increases the risk of render loop bugs.

**Warning signs:**
- useEffect dependencies growing beyond 3-4 items
- Callbacks passed as props without stable identity (useCallback with changing deps)
- State updates from async operations colliding with user-initiated state changes

**Prevention:**
1. Follow the ref-based pattern established in the infinite loop fix: store callbacks in refs, use empty dependency arrays for handlers, access current state through refs.
2. Consider a state machine or reducer for the multi-pass pipeline state: `{ status: 'idle' | 'generating' | 'analyzing' | 'filling' | 'complete' | 'error', slides: Slide[], gaps: IdentifiedGap[], ... }`. This centralizes transitions and prevents impossible states.
3. Commit intermediate results to top-level state after each successful pass. Don't hold everything in a local pipeline state that could be lost on error.
4. Test the full flow with React StrictMode enabled (which double-invokes effects in dev) to catch identity-change issues early.

**Phase to address:** Every phase. Use the reducer pattern from the start.

**Source:** Cue debug history: `.planning/debug/resolved-worksheet-generation-infinite-loop-crash.md` (detailed analysis of render loop from callback identity changes)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Pipeline orchestration | Token budget explosion (Pitfall 2) | Define per-pass budgets before coding any passes |
| Pipeline orchestration | Wait time (Pitfall 6) | Design progress UI first, extend `generationProgress` type |
| Pipeline orchestration | State management complexity (Pitfall 14) | Implement reducer for pipeline state from day one |
| Lesson phase detection | Brittleness (Pitfall 5) | Two-tier: regex first, AI fallback. Test with 10+ real lesson plans |
| Lesson phase detection | Vocabulary mismatch (Pitfall 10) | Use teacher-friendly labels in UI, framework terms in AI prompts only |
| Resource integration | Conflation with enhancement (Pitfall 8) | Define `ResourceContext` type separate from `DocumentAnalysis` |
| Resource integration | Quality gate missing (Pitfall 4) | Check text quality before injection, summarize for generation |
| Resource integration | Content poisoning (Pitfall 11) | Sanitize OCR artifacts, use analysis summary not raw text |
| Auto gap analysis | Error amplification (Pitfall 1) | Keep as reviewable step, add deduplication check |
| Auto gap analysis | Over-reporting (Pitfall 12) | Enrichment content heuristic, max 2-3 critical gaps |
| Gap fill generation | Position conflicts (Pitfall 7) | Insert from end backward, use title-based anchoring |
| Gap fill generation | Black box UX (Pitfall 9) | Progressive disclosure, intermediate saves, optional steps |
| Dual-provider parity | Schema divergence (Pitfall 3) | Define both schemas in shared files, add structural parity tests |
| Dual-provider parity | Claude image gap (Pitfall 13) | Handle `undefined` images in all new passes |

---

## Integration Pitfalls (Cross-Cutting)

These pitfalls emerge from the interaction between features, not from any single feature alone.

### Integration Pitfall A: Resource Integration + Gap Analysis = Double Counting

**What goes wrong:** A teacher uploads a worksheet as a resource. The worksheet covers "fraction multiplication." The AI generates slides including fraction multiplication (from the resource). Then gap analysis compares against the lesson plan, which also mentions fraction multiplication. Gap analysis says "no gap" because the slide exists. But if the resource content was removed from generation context, there WOULD be a gap. The system is fragile: removing the resource silently creates gaps.

**Prevention:** Gap analysis should compare against the lesson plan only, ignoring resource provenance. If a topic is in the lesson plan, it must have a slide regardless of whether a resource also covers it.

### Integration Pitfall B: Phase Detection + Gap Analysis = Phase-Aware Gaps

**What goes wrong:** Phase detection identifies "Introduction, Main Activity, Plenary" as the lesson structure. Gap analysis finds a missing concept. Where should the gap-fill slide go? Without phase awareness, it might insert a practice activity into the introduction. With phase awareness, it should insert it into the appropriate phase.

**Prevention:** If implementing both features, gap analysis should receive phase annotations: "Slides 1-3 are Introduction, Slides 4-10 are Main Activity, Slides 11-12 are Plenary." The gap's `suggestedPosition` should respect phase boundaries.

### Integration Pitfall C: Multi-Pass + Dual Provider = Exponential Testing Matrix

**What goes wrong:** With 3 passes and 2 providers, there are 8 possible provider combinations (Gemini-Gemini-Gemini, Gemini-Gemini-Claude, etc.). In practice, a teacher uses one provider for everything. But each pass has its own prompt/schema pair, and each must work with both providers. Testing 3 features x 2 providers x various input sizes quickly becomes unmanageable.

**Prevention:**
1. Use the established pattern: shared prompt files with dual schemas. This halves the testing surface.
2. Test each pass independently with each provider before testing the full pipeline.
3. Accept that full pipeline testing with both providers is a manual process. Focus automated tests on individual pass parity (extending the existing `parity.test.ts` pattern).

---

## Sources

**Codebase references (HIGH confidence):**
- `services/aiProvider.ts` -- AIProviderInterface, GenerationInput, GapAnalysisResult types
- `services/providers/claudeProvider.ts` -- Claude-specific generation, image limitations, token management
- `services/providers/geminiProvider.ts` -- Gemini-specific generation, schema enforcement
- `services/providers/parity.test.ts` -- Existing provider parity testing patterns
- `services/prompts/gapAnalysisPrompts.ts` -- Gap analysis schemas, context limits (MAX_LESSON_PLAN_CHARS = 8000)
- `services/prompts/condensationPrompts.ts` -- Condensation context building patterns
- `services/prompts/transformationPrompts.ts` -- Chunking utility, slide filtering patterns
- `services/documentAnalysis/documentAnalysisService.ts` -- Document analysis pipeline, page limits
- `services/documentEnhancement/documentEnhancementService.ts` -- Enhancement pipeline patterns
- `services/uploadService.ts` -- Upload validation, file type routing
- `.planning/debug/resolved-worksheet-generation-infinite-loop-crash.md` -- Render loop debug history
- `App.tsx` -- Generation flow, progress state, gap analysis integration

**Web research (MEDIUM confidence):**
- [5 Approaches to Solve LLM Token Limits](https://www.deepchecks.com/5-approaches-to-solve-llm-token-limits/)
- [Structured Output Comparison across popular LLM providers](https://www.glukhov.org/post/2025/10/structured-output-comparison-popular-llm-providers/)
- [Understanding and Optimizing Multi-Stage AI Inference Pipelines](https://arxiv.org/abs/2504.09775)
- [Reduce LLM Costs: Token Optimization Strategies](https://www.glukhov.org/post/2025/11/cost-effective-llm-applications/)
- [State of AI Agents - LangChain](https://www.langchain.com/state-of-agent-engineering)
