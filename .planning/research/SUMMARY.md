# Project Research Summary

**Project:** Cue v6.0 - Scripted Lesson Plan Import
**Domain:** Structured lesson plan parsing and minimal-AI slide generation
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

Scripted Import is the smallest and cleanest feature scope Cue has had since v2.0. It requires zero new library dependencies, extends established codebase patterns rather than introducing new ones, and reduces AI usage by 97% compared to Fresh mode. The core insight is that teachers who write detailed scripted lesson plans (with explicit `Say:`, `Ask:`, `Write on board:` markers) are actively harmed by the existing AI generation pipeline -- which rewrites their carefully crafted words. The v6.0 approach adds a fourth generation mode that bypasses AI content generation entirely: a deterministic regex parser extracts teacher text verbatim, a mapper converts it directly to slides, and AI is called only for image prompts and layout selection (~700 tokens total vs 23K-45K for Fresh mode).

The recommended implementation is a two-file parser/mapper pair (`scriptedParser.ts` + `scriptedMapper.ts`) following the exact architecture of the existing `phaseDetector.ts` and `contentPreservation/detector.ts` -- pure functions, typed output, no side effects, comprehensive unit tests. A `DayPicker.tsx` component handles multi-day lesson plans (common in UK/Australian education). A static `ClaudeTips.tsx` page gives teachers a copyable prompt template for generating Cue-compatible lesson plans via Claude chat. Total new code: ~900 lines including tests. Existing modifications: ~120 lines across 5 files. No file format changes required.

The main risks are semantic, not technical: the teleprompter's segment count invariant (exactly N+1 segments for N content bullets) must be mechanically enforced by the mapper since no AI will do it, slide boundary explosion must be prevented by grouping markers into slides by section heading rather than creating a slide per marker, and multi-line `Say:` blocks must accumulate continuation lines rather than truncating at line end. All three risks are testable with pure-function unit tests and have clear mitigations documented in research.

---

## Key Findings

### Recommended Stack

Zero new dependencies. The entire feature is built with existing infrastructure: TypeScript regex parsing (same pattern as `phaseDetector.ts`), React components (same patterns as existing Cue UI), existing document processors for DOCX/PDF/PPTX text extraction, and the existing Gemini/Claude provider interface for the minimal AI call. The `GenerationMode` type is extended from `'fresh' | 'refine' | 'blend'` to include `'scripted'` -- a one-line type change with TypeScript exhaustiveness checking catching all switch sites at compile time.

**Core technologies:**
- **TypeScript 5.8 regex parsing:** Marker detection following `phasePatterns.ts` structural + content tier pattern -- no libraries needed
- **React 19 components:** `DayPicker.tsx` and `ClaudeTips.tsx` using existing Tailwind patterns -- no component libraries needed
- **mammoth.js (existing):** DOCX text extraction for lesson plans uploaded as Word documents -- already installed
- **Gemini/Claude providers (existing):** Minimal AI call for image prompts + layout assignment only -- same interface, ~700 tokens
- **Vitest (existing):** Unit tests for parser pure functions -- same pattern as `phaseDetector.test.ts`

**What NOT to add:** `unified`/`remark` (overkill for line-anchored markers), `react-tabs` (one checkbox list needs no library), `clipboard-copy` (`navigator.clipboard.writeText()` is one line), `marked`/`markdown-it` (static JSX is simpler for one tips page).

### Expected Features

**Must have (table stakes):**
- Verbatim `Say:` block preservation into `speakerNotes` -- the core value proposition; AI rewriting is a failure mode
- Automatic marker detection: `Say:`, `Ask:`, `Write on board:`, `Activity:`, section headings -- teacher uploads, Cue recognizes
- Slide boundary detection from section headings and phase transitions -- not from individual markers
- Progressive disclosure mapping: `Say:` blocks become pointing-right delimited `speakerNotes` segments
- AI image prompt and layout assignment: minimal batch call, ~500 tokens total
- Phase label detection (`## Hook`, `### I Do`, etc.) using existing `phaseDetector.ts` -- zero new code
- `hasQuestionFlag: true` on `Ask:` blocks that contain genuine questions

**Should have (differentiators):**
- Multi-day lesson plan splitting: detect `## Day 1`/`## Day 2` boundaries, offer day picker UI
- Claude chat prompt template: copyable template in a static tips page -- no API integration
- Import preview: "Detected 3 days, 12 sections, 45 script blocks" before generation
- Mixed-marker tolerance: treat unmarked prose as implicit `Say:` blocks rather than silently dropping it
- Content-type slide mapping: `Activity:` blocks auto-set `slideType: 'work-together'`

**Defer (v2+):**
- Timing annotation extraction: `(5 min)` markers surfaced in teleprompter -- low value for first release
- `Show:` cue as image prompt seed: teacher-specified visuals -- add post-launch based on feedback
- `mammoth.convertToHtml()` for formatting-based markers (bold = board content) -- complex, document the limitation for v1
- Real-time parse preview with line-level highlighting

**Anti-features (explicitly not building):**
- AI rewriting of scripted content: defeats the feature's purpose
- Gap analysis in scripted mode: teacher's script is authoritative, not incomplete
- Verbosity variants for scripted mode: requires AI rewriting, contradicts verbatim preservation
- Claude API integration: tips page only, no in-app Claude API calls
- Auto-import all days without confirmation: would produce 50+ slide decks

### Architecture Approach

Scripted mode adds a deterministic short-circuit path in `generationPipeline.ts`: if `mode === 'scripted'`, bypass all three AI passes entirely, run the parser + mapper instead, call AI for image prompts only, then run phase detection and return. The `scriptedParser.ts` is a pure function module (~250 lines) following `phaseDetector.ts` architecture. The `scriptedMapper.ts` (~150 lines) converts `ScriptedBlock[]` to `Slide[]` with the segment count invariant enforced as a post-processing step. The `DayPicker.tsx` component renders between upload and generation when multi-day content is detected. The `CueFile` format stays at v5 -- scripted slides use all existing `Slide` fields and serialize identically.

**Major components:**
1. **`services/scriptedParser.ts` (NEW):** Pure function. Text in, `ScriptedParseResult` out. Detects markers, splits days, extracts typed `ScriptedBlock[]`. Follows `phasePatterns.ts` structural + content tier pattern. ~250 lines.
2. **`services/scriptedMapper.ts` (NEW):** Pure function. `ScriptedBlock[]` in, `Slide[]` out. Enforces segment count invariant. Handles slide boundaries by section heading. Maps marker types to slide fields. ~150 lines.
3. **`components/DayPicker.tsx` (NEW):** React component with local `useState<Set<string>>`. Renders detected days as selectable cards. No global state. ~80 lines.
4. **`components/ClaudeTips.tsx` (NEW):** Static JSX with hardcoded prompt template. `navigator.clipboard.writeText()` copy button. ~120 lines.
5. **`services/generationPipeline.ts` (MODIFIED):** Mode gate at top of pipeline: scripted path returns after mapper + AI enrichment, skips Pass 1/2/3. ~30 new lines.
6. **`services/aiProvider.ts` (MODIFIED):** Add `'scripted'` to `GenerationMode` union. 1 line.

**Key patterns:**
- Pure function parser (no AI calls, no side effects, fully testable)
- Structural-before-content pattern tiers (line-anchored `^Say:` high confidence, body-text detection not implemented)
- Mode gating via explicit exclusion set rather than `||` boolean chain
- Immutable slide construction (spread operators throughout, never mutate)
- Day picker only activates when 2+ distinct day numbers found in sequence

### Critical Pitfalls

1. **Segment count violation** -- The teleprompter requires exactly `(content.length + 1)` segments in `speakerNotes`. The AI normally enforces this via prompt instructions; the scripted mapper has no AI. Mitigation: `validateSegmentCount(slide)` utility called on every slide post-mapping -- merge excess `Say:` segments, pad with synthesized intro segments on underflow. Unit test: assert invariant on all output slides. This must be designed into the mapper, not patched later.

2. **Silent content dropping from unmarked text** -- Lesson plans from non-Claude sources (school templates, TES downloads, hand-written Word docs) have no explicit markers. The parser misses them; content disappears. Mitigation: treat any paragraph of 20+ characters between recognized markers as an implicit `Say:` block with `confidence: 'medium'`. Never silently drop content. Show a warning when large `unmarkedText[]` is detected. The worst outcome is too much content; the unforgivable outcome is lost content the teacher wrote.

3. **Slide boundary explosion** -- A naive "each marker = new slide" approach from a detailed 30-question lesson plan produces 50+ slides. Mitigation: only create new slides on section headings (`## Hook`, `### I Do`) and phase transitions. `Say:` blocks accumulate into `speakerNotes`. `Ask:` and `Write on board:` blocks become `content[]` bullets on the current slide. `Activity:` blocks create new slides only if preceded by non-activity blocks.

4. **Shared code path regression from new `GenerationMode`** -- The `canAnalyzeGaps` check in `generationPipeline.ts` (line 164) is a `||` boolean chain, not a switch -- TypeScript exhaustiveness checking does NOT catch a missing `'scripted'` case here. `getSystemInstructionForMode()`, `getDetectionSource()`, and `getMinConfidenceForMode()` in `geminiService.ts` all need explicit `'scripted'` cases. Both Gemini and Claude providers must be updated simultaneously. Mitigation: audit every `GenerationMode` reference before implementing, convert `canAnalyzeGaps` to an explicit exclusion set, add regression tests for existing modes before adding the new one.

5. **Multi-line `Say:` block truncation** -- Teachers write multi-paragraph scripts after `Say:`. Regex end-of-line matching captures only the first line; the rest falls into `unmarkedText[]`. Mitigation: continuation-line accumulation logic in the parser -- after matching `Say:`, consume subsequent lines until the next recognized marker or blank line. This must be designed into the initial parser, not patched later.

---

## Implications for Roadmap

Based on research, the natural dependency chain is: parser (foundation for all else) -> mapper + pipeline integration (converts parser output to usable slides) -> AI enrichment (adds images and layouts) -> day picker UI (depends on stable parser types) -> Claude tips (independent, can go anywhere). The phases below reflect this chain.

### Phase 1: Scripted Parser + Tests

**Rationale:** The parser is the foundation. All other phases depend on its output types and correctness. Pure functions are uniquely easy to test in isolation before any UI exists. Building and testing the parser first reveals edge cases before they are buried inside a pipeline.

**Delivers:** `scriptedParser.ts` with all marker types (Say, Ask, Write on board, Activity, Resource, section headings, day boundaries), multi-line continuation-line accumulation, implicit `Say:` fallback for unmarked prose, `ScriptedParseResult` type, comprehensive unit test fixtures covering all marker types, multi-line blocks, false day boundary cases, and unmarked-text fallback.

**Addresses:** Marker detection, day splitting, multi-line block handling, mixed-marker tolerance.

**Avoids:** Multi-line truncation pitfall (must be in initial design), false positive day boundaries (structural anchoring from day one), silent content dropping (unmarked text fallback designed in, not bolted on).

**Research flag:** No deeper research needed. Marker patterns are fully specified in `FEATURES-v6.0-scripted-import.md` marker catalogue. `phaseDetector.ts` provides the exact implementation template.

### Phase 2: Block-to-Slide Mapper + Pipeline Integration

**Rationale:** With a validated parser, the mapper can be built against stable types. Pipeline integration requires touching 5 existing files -- doing this with tests for existing modes in place minimizes regression risk. The segment count invariant must be enforced here.

**Delivers:** `scriptedMapper.ts` with slide boundary logic (section-heading-only splits, accumulation rules for Say/Ask/Write blocks), segment count enforcement post-processing, `generationPipeline.ts` scripted mode gate, `GenerationMode` type extension, `geminiService.ts` and `claudeProvider.ts` scripted prompt paths, explicit `canAnalyzeGaps` exclusion refactor.

**Addresses:** Verbatim script preservation, pointing-right segment mapping, slide boundaries, mode integration, regression protection for existing modes.

**Avoids:** Segment count violation (mechanical enforcement in mapper), slide boundary explosion (section-heading-only splitting), shared code path regression (explicit exclusion sets, provider parity, regression tests).

**Research flag:** Careful attention needed on pointing-right segment invariant. The teleprompter rules in `geminiService.ts` lines 12-37 are the specification. No external research needed.

### Phase 3: AI Image Prompts + Layout Assignment

**Rationale:** Slides produced by Phase 2 have no images or layout assignments. This is the minimum AI involvement -- one batch call per deck. Can be tested incrementally since slides work without images (placeholder state).

**Delivers:** Batch AI call generating one-sentence `imagePrompt` per slide and `layout` assignment, graceful failure fallback (synthesized prompts: `"An educational illustration about " + slide.title`), scripted-mode system prompt in `geminiService.ts` and `claudeProvider.ts`.

**Addresses:** Image generation for scripted slides, layout selection without full AI pipeline.

**Avoids:** Missing image prompts pitfall (image prompt failure must never block slide import).

**Research flag:** Standard pattern following `transformationPrompts.ts` batching. No research needed.

### Phase 4: Day Picker UI + Mode Selector

**Rationale:** Depends on `ScriptedParseResult` type being stable (established in Phase 1). The mode selector UI must exist before scripted import is teacher-accessible -- `uploadMode` derivation in `App.tsx` cannot distinguish fresh from scripted since both take a lesson plan file as input.

**Delivers:** `DayPicker.tsx` component with day cards showing section previews, "select all" option, cross-day reference warning when importing a subset, explicit mode toggle on landing page (lesson plan upload zone shows "Generate from AI" vs "Import as scripted lesson"), default all-days-selected behavior.

**Addresses:** Multi-day lesson plan splitting, mode selection UX, cross-day context warnings.

**Avoids:** Automatic day detection without confirmation (50+ slide decks), `uploadMode` derivation impossibility (explicit toggle required), false day boundary false positives (minimum 2+ sequential day numbers required to activate picker).

**Research flag:** Standard UI component. No research needed.

### Phase 5: Claude Chat Tips Page

**Rationale:** Fully independent -- no technical dependencies on any other phase. Can be built in parallel with any phase above. Static content, no risk.

**Delivers:** `ClaudeTips.tsx` static page with copyable prompt template, format specification showing `## Day 1 / ### Hook / Say: / Ask:` structure, example output snippet, copy-to-clipboard with HTTPS fallback (hidden textarea `execCommand`), toast feedback on copy.

**Addresses:** Claude chat prompt template, format specification, teacher onboarding for scripted mode.

**Avoids:** Format specification drift (define `SUPPORTED_MARKERS` as a shared constant imported by both parser and tips page so they cannot drift independently).

**Research flag:** Content authoring, not technical. No research needed.

### Phase Ordering Rationale

- Parser before mapper: `ScriptedBlock` and `ScriptedParseResult` types must be stable before mapper can be written
- Mapper before AI enrichment: slides must exist before AI can enrich them
- AI enrichment before full UI integration: complete pipeline must work before teacher-facing flow
- Day picker after parser: `DayPicker.tsx` props depend on `ScriptedParseResult` -- needs stable types
- Mode selector in Phase 4 not Phase 1: the pipeline can be tested directly without UI; adding the mode toggle is final wiring
- Claude tips at any point: fully independent, zero risk

### Research Flags

**Skip research-phase for all phases:**
- Phase 1 (Parser): Fully specified. `phaseDetector.ts` is the template, marker catalogue is in `FEATURES-v6.0-scripted-import.md`.
- Phase 2 (Mapper + Pipeline): Teleprompter rules in `geminiService.ts` lines 12-37 are the segment count specification. `generationPipeline.ts` mode gating pattern is established.
- Phase 3 (AI enrichment): `transformationPrompts.ts` batching pattern is the template.
- Phase 4 (Day Picker): Standard React component, existing card patterns in Cue UI.
- Phase 5 (Claude Tips): Static content, no technical decisions.

**No phase needs `/gsd:research-phase`.** The entire feature extends well-understood codebase patterns. The unknowns (real-world marker variety, exact batch prompt schema for image generation) are resolved by testing during implementation, not by pre-implementation research.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All capabilities verified in existing codebase. Zero new dependencies confirmed. Token economics calculated from actual pipeline analysis. |
| Features | HIGH | Feature scope is narrow and well-defined. Table stakes derived from direct user need analysis. Anti-features have clear rationale. Marker catalogue covers common UK/Australian education conventions. |
| Architecture | HIGH | Follows two production-proven patterns (`phaseDetector.ts` 289 lines, `contentPreservation/detector.ts` 672 lines). Component boundaries are clean with no circular dependencies. Data flow is linear. |
| Pitfalls | HIGH | All critical pitfalls identified via direct codebase analysis. Segment count invariant documented in 8+ locations in `geminiService.ts`. `canAnalyzeGaps` non-exhaustive boolean expression verified at line 164. `mammoth.extractRawText()` formatting loss verified at `docxProcessor.ts` line 31. |

**Overall confidence:** HIGH

All research was conducted via direct codebase analysis of verified source files. No external libraries or undocumented APIs are involved. The feature scope is conservative, extending proven patterns rather than introducing new ones.

### Gaps to Address

- **Real-world scripted lesson plan corpus:** Marker patterns are based on common conventions. Testing with 5-10 actual teacher-written scripted plans during Phase 1 unit test development would validate the pattern set. Resolve during Phase 1 test authoring.

- **Batch image prompt API schema:** The exact structure of a "generate image prompts for these 10 slides in one call" request needs to be designed. Follows `transformationPrompts.ts` pattern but the specific schema (JSON array response? Line-delimited strings?) needs authoring. Resolve during Phase 3 implementation.

- **Landing page UX for mode selection:** Is the scripted mode selector a fourth button alongside Fresh/Refine/Blend, a toggle after lesson plan upload, or an auto-detected mode with override? The feature research notes auto-detection as a differentiator but also as a pitfall source. Design decision, not a technical research question. Resolve during Phase 4 planning by reviewing existing mode selector UI.

- **Mammoth DOCX formatting loss (accepted limitation):** `mammoth.extractRawText()` strips bold/italic/heading formatting. Lesson plans that use bold text as "board content" markers instead of explicit `Write on board:` markers will not be detected. Documented as a v1 limitation; formatting-based parsing via `mammoth.convertToHtml()` is a future enhancement.

---

## Sources

### Primary (HIGH confidence)

**Codebase analysis -- all assertions verified against source files:**
- `services/phaseDetection/phaseDetector.ts` (289 lines) -- pure function parser pattern, phase detection with structural/content tiers
- `services/phaseDetection/phasePatterns.ts` (161 lines) -- 6 phase pattern definitions, structural vs content tiers, delimiter requirements
- `services/contentPreservation/detector.ts` (672 lines) -- `Ask:` context pattern (line 148), rhetorical patterns (line 47), question/activity/instruction detection
- `services/generationPipeline.ts` (329 lines) -- three-pass pipeline, `canAnalyzeGaps` boolean expression (line 164), mode gating pattern
- `services/aiProvider.ts` (430 lines) -- `GenerationMode` type (line 66), `GenerationInput` interface, `withRetry` utility
- `services/geminiService.ts` -- `TELEPROMPTER_RULES` segment invariant (line 36), `getSystemInstructionForMode()` (line 131), `getDetectionSource()` (line 108)
- `services/documentProcessors/docxProcessor.ts` -- `mammoth.extractRawText()` (line 31)
- `types.ts` (615 lines) -- `Slide` interface, `CueFile` format v5 (`CURRENT_FILE_VERSION = 5`), `GenerationMode`
- `App.tsx` -- `uploadMode` derivation logic (line 403)
- `package.json` -- all current dependencies confirmed

### Secondary (MEDIUM confidence)

- Domain knowledge: structured lesson plan conventions (UK/Australian GRR model -- Hook, I Do, We Do, You Do, Plenary) from existing phase detection implementation

### Prior Cue Research (HIGH confidence)

- `STACK-v6.0-scripted-import.md` -- Zero-dependency decision, parser architecture, type extension points, token economics
- `FEATURES-v6.0-scripted-import.md` -- Marker catalogue, feature dependencies, Claude chat output format specification
- `ARCHITECTURE-v6.0-scripted-import.md` -- Component boundaries, data flow, 5 anti-patterns, scalability considerations
- `PITFALLS-v6.0-scripted-import.md` -- 14 numbered pitfalls with mitigations, phase-specific warning summary, integration conflict table
- `STACK-scripted-import-day-picker.md` -- Confirms zero-dependency finding, alternatives considered
- `FEATURES-scripted-import-day-picker.md` -- Confirms marker set, adds auto-detect as differentiator, `Show:` cue idea
- `ARCHITECTURE-scripted-import-day-picker.md` -- Confirms component boundaries, adds `scriptedDaySplitter.ts` as separate module option
- `PITFALLS-scripted-import-day-picker.md` -- Confirms pitfalls 1-3, adds scripted detection false positive risk

---

*Research completed: 2026-02-19*
*Ready for roadmap: yes*
