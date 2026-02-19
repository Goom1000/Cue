# Research Summary: Scripted Import Mode, Day Picker, Claude Chat Tips

**Domain:** Structured lesson plan parsing and minimal-AI slide generation
**Researched:** 2026-02-19
**Overall confidence:** HIGH

## Executive Summary

Scripted Import is an unusually clean feature from a technology standpoint. It requires zero new library dependencies, extends existing codebase patterns rather than introducing new ones, and reduces AI usage by 97% compared to Fresh mode. The core work is a regex-based text parser (~250 lines) following the exact architecture of the existing `phaseDetector.ts` and `contentPreservation/detector.ts`, a block-to-slide mapper (~150 lines) that converts parsed structures into the standard `Slide[]` format, and a minimal AI call for image prompts and layout assignment.

The main risk areas are not technological but semantic: correctly handling the pointing-right segment count invariant (Cue's progressive disclosure system requires exactly N+1 segments for N bullets), avoiding slide boundary explosion (not every marker should create a new slide), and properly handling multi-line `Say:` blocks that span multiple text lines. All three risks are mitigated by comprehensive unit testing following the established pure-function pattern.

Multi-day lesson plan splitting adds a DayPicker UI component that renders detected day sections as selectable cards. This is a simple React component with local state -- no global state changes, no routing, no complex UI library. Claude chat integration tips are a static JSX page with a copyable prompt template, requiring no API integration.

The total estimated new code is ~900 lines (including tests) with ~120 lines of modifications across 5 existing files. This is the smallest feature scope of any milestone since v2.0, primarily because Cue's existing infrastructure (document processors, phase detection, pipeline orchestration, slide types, export) all work unchanged with scripted-import slides.

## Key Findings

**Stack:** Zero new dependencies. Pure TypeScript parsing + mapping, minimal AI for image prompts only. ~97% token cost reduction vs Fresh mode.

**Architecture:** Fourth generation mode (`'scripted'`) that short-circuits the three-pass pipeline. Parser follows `phaseDetector.ts` pure-function pattern. Mapper converts `ScriptedBlock[]` to `Slide[]` with verbatim content preservation.

**Critical pitfall:** Pointing-right segment count mismatch. The teleprompter requires exactly `(bullets + 1)` segments. If the teacher's `Say:` blocks don't align with their `Write on board:` blocks, progressive disclosure breaks. Mitigation: enforce the invariant in the mapper with overflow concatenation and underflow empty segments.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Scripted Parser + Tests** - Build the detection engine first, test thoroughly
   - Addresses: Marker detection, day splitting, multi-line block handling
   - Avoids: Multi-line truncation pitfall (#3), false positive pitfall (#5)
   - Rationale: Parser is the foundation. Everything depends on its accuracy. Pure functions are easy to test in isolation.

2. **Block-to-Slide Mapper + Pipeline Integration** - Convert parsed output to slides
   - Addresses: Verbatim script preservation, pointing-right segment mapping, slide boundaries
   - Avoids: Segment count mismatch (#1), slide boundary explosion (#2), mode confusion (#4)
   - Rationale: Mapper depends on parser output types. Pipeline integration requires `GenerationMode` extension and all switch-site updates.

3. **AI Image Prompts + Layout Assignment** - Minimal AI enrichment
   - Addresses: Image prompts, layout selection, batch vs per-slide fallback
   - Avoids: Batch failure pitfall (#10)
   - Rationale: Can be built incrementally -- slides work without images (just show placeholder).

4. **Day Picker UI** - Multi-day lesson plan support
   - Addresses: Day boundary detection, day selection, selected-day filtering
   - Avoids: False day detection pitfall (#6)
   - Rationale: UI component depends on parser's `ScriptedParseResult` type being stable.

5. **Claude Chat Tips Page** - Independent, no technical dependencies
   - Addresses: Prompt template, format specification, copy-to-clipboard
   - Avoids: Tips staleness pitfall (#9)
   - Rationale: Can be built in parallel with any other phase. Static content.

6. **Landing Page Integration** - Wire everything together
   - Addresses: Mode selector, import flow, progress feedback
   - Rationale: Final integration point. Requires all preceding phases to be complete.

**Phase ordering rationale:**
- Parser before mapper: mapper types depend on parser output types
- Mapper before AI enrichment: slides must exist before AI can enrich them
- AI enrichment before UI integration: full pipeline must work before user-facing flow
- Day picker can be Phase 4 or later: single-day plans work without it
- Claude tips is independent: can be done anytime

**Research flags for phases:**
- Phase 1 (Parser): Likely needs NO deeper research -- regex patterns are fully specified in FEATURES.md marker catalogue
- Phase 2 (Mapper): Needs careful attention to pointing-right segment invariant -- the teleprompter rules in geminiService.ts lines 12-37 are the specification
- Phase 3 (AI enrichment): Standard pattern, unlikely to need research
- Phase 4 (Day Picker): Standard UI component, unlikely to need research
- Phase 5 (Claude Tips): Content authoring, not technical research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new deps. All capabilities verified in existing codebase. |
| Features | HIGH | Feature scope is narrow and well-defined. No ambiguity. |
| Architecture | HIGH | Follows established patterns (phaseDetector, contentPreservation). |
| Pitfalls | HIGH | All pitfalls have clear mitigations. Most are testable. |

## Gaps to Address

- **Real-world scripted lesson plan corpus:** The marker patterns are based on common UK/Australian education conventions. Testing with actual teacher-written scripted plans would validate the pattern set. This can be done during Phase 1 testing.
- **Batch image prompt API design:** The exact prompt for "generate image prompts for these 10 slides in one call" needs to be designed during Phase 3. It follows the existing `transformationPrompts.ts` batching pattern but the specific schema needs authoring.
- **Landing page UX for mode selection:** Currently the landing page has Fresh/Refine/Blend modes (or the mode is inferred from what files are uploaded). Adding Scripted needs UX design -- is it a fourth button, an auto-detected mode, or a toggle? This is a design decision, not a technical research question.
