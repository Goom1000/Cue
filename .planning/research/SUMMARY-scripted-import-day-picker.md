# Research Summary: Scripted Import, Day Picker, and Claude Chat Tips

**Domain:** Lesson presentation app -- new import mode and UI features
**Researched:** 2026-02-19
**Overall confidence:** HIGH

---

## Executive Summary

This milestone adds three features to the Cue presentation app: a scripted lesson plan import mode, a multi-day lesson plan day picker, and Claude chat integration tips. All three integrate cleanly with the existing architecture using established patterns -- no new dependencies, no architectural shifts.

The scripted import mode is architecturally distinct from existing generation modes (fresh/refine/blend). Where those modes ask AI to transform text into slides, scripted mode uses a deterministic regex parser to extract the teacher's pre-structured content directly. AI is only needed for cosmetic enhancement (image prompts and layout selection). This means the parser is a pure-function service following the exact pattern of `phaseDetector.ts` and `contentPreservation/detector.ts`. The generation pipeline gains a mode gate that routes scripted input to a simplified two-stage process (parse + enhance) instead of the three-pass AI pipeline.

The day picker is a pre-generation UI concern, not a pipeline concern. It detects multi-day structure in uploaded text and lets the teacher select which day to generate. This happens before the text enters the pipeline, keeping the generation focused and cost-effective. The day splitter is another pure-function service with regex-based boundary detection.

Claude chat tips are static content with zero service-layer footprint -- a collapsible panel on the landing page that teaches teachers how to structure their Claude conversations for optimal Cue import.

---

## Key Findings

**Stack:** Zero new dependencies. Uses existing mammoth.js (DOCX), @google/genai (AI), and Vitest (tests). The entire feature is pure TypeScript regex parsing + React UI components.

**Architecture:** New `'scripted'` value on the `GenerationMode` union type. Pipeline mode gate at the top of `runGenerationPipeline()`. Two new pure-function services (`scriptedParser.ts`, `scriptedDaySplitter.ts`). Two new UI components (`DayPicker.tsx`, `ClaudeTips.tsx`). App.tsx gains DOCX upload support, scripted auto-detection, and day picker state.

**Critical pitfall:** Scripted format auto-detection false positives. Normal lesson plans contain "Say:", "Ask:", "Do:" in regular prose. The heuristic must require line-start anchoring, multiple distinct cue types, and provide a manual override escape hatch.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Parser Core
- Build `scriptedParser.ts` and `scriptedDaySplitter.ts` as pure functions
- Comprehensive test suites for both
- **Addresses:** Core parsing, day splitting, format detection
- **Avoids:** Teleprompter segment count mismatch pitfall (caught by tests)

### Phase 2: Pipeline Integration
- Add `'scripted'` to GenerationMode type
- Add `runScriptedPipeline()` function with mode gate
- Add scripted AI enhancement (image prompts + layouts)
- **Addresses:** Pipeline wiring, AI enhancement, graceful degradation
- **Avoids:** AI enhancement failure pitfall (degradation pattern from existing pipeline)

### Phase 3: UI Integration
- `DayPicker.tsx` component
- `ClaudeTips.tsx` component
- `App.tsx` modifications (DOCX upload, scripted detection, day picker, tips panel)
- **Addresses:** User-facing features, DOCX support, mode indicator
- **Avoids:** Auto-detect flickering pitfall (debounced detection), day splitter false positive pitfall (preview text)

**Phase ordering rationale:**
- Parser must exist before pipeline can route to it (Phase 1 before Phase 2)
- Pipeline must work before UI can trigger it (Phase 2 before Phase 3)
- DayPicker depends on daySplitter (both in Phase 1 parser core)
- ClaudeTips has zero dependencies and can be built anytime (slotted into Phase 3 for convenience)

**Research flags for phases:**
- Phase 1: Needs careful design of the cue-to-slide mapping rules (how Say: cues become teleprompter segments that match the bullets+1 formula). This is the highest-risk area.
- Phase 2: Standard pipeline wiring. Follows existing mode gate pattern. Low risk.
- Phase 3: Standard UI work. Day picker is simple. DOCX upload reuses existing processor. Low risk.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new deps. All technology already in codebase. |
| Features | HIGH | Feature set well-defined by milestone context. |
| Architecture | HIGH | All integration points verified against actual code. Data flow traced through pipeline. |
| Pitfalls | HIGH | Pitfalls identified from actual code patterns (segment counting, mode detection, file handling). |

---

## Gaps to Address

- **Cue-to-slide grouping heuristic:** The parser needs a clear rule for when to start a new slide within a phase section. Is it every Ask: cue? Every pair of content cues? Based on content density? This needs design-time decision, not research -- but it should be decided in Phase 1 planning before coding begins.
- **"Do:" cue ambiguity:** "Do:" is extremely common in English ("Do: not forget..."). May need to use "Student Do:" or "Task:" instead. Needs user testing or a stronger regex.
- **Scripted mode in the mode indicator:** The current mode indicator in App.tsx has three visual styles (green/blue/purple for fresh/refine/blend). A fourth mode needs its own color and icon. This is a design decision.
- **Re-generation from scripted slides:** What happens when a teacher has a scripted deck and clicks some future "regenerate" button? Does it re-parse the original text? This is outside this milestone's scope but worth noting for future consideration.

---

## Files Created

| File | Purpose |
|------|---------|
| `.planning/research/SUMMARY-scripted-import-day-picker.md` | This file -- executive summary with roadmap implications |
| `.planning/research/STACK-scripted-import-day-picker.md` | Technology recommendations (no new deps) |
| `.planning/research/FEATURES-scripted-import-day-picker.md` | Feature landscape (table stakes, differentiators, anti-features) |
| `.planning/research/ARCHITECTURE-scripted-import-day-picker.md` | System structure, component boundaries, data flow, build order |
| `.planning/research/PITFALLS-scripted-import-day-picker.md` | Domain pitfalls (critical, moderate, minor, phase-specific) |
