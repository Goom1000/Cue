# Research Summary: Cue v5.0 Smart Generation Pipeline

**Domain:** Multi-pass AI slide generation with auto gap filling, resource integration, and lesson phase detection
**Researched:** 2026-02-14
**Overall confidence:** HIGH

## Executive Summary

Cue v5.0 transforms the slide generation flow from a single-pass AI call into a multi-pass pipeline that automatically evaluates and fills content gaps, accepts supplementary teaching resources during generation, and tags slides with lesson phase metadata (I Do / We Do / You Do). The core finding is that **no new npm dependencies are needed** -- the existing stack (Gemini/Claude providers, JSZip, upload infrastructure, gap analysis methods) already contains every primitive required.

The architecture follows a "Self-Refine" pattern: generate slides (Pass 1), evaluate coverage against lesson plan (Pass 2), fill identified gaps (Pass 3). All three AI operations already exist as tested methods on the `AIProviderInterface` (from Phases 59 and earlier). The v5.0 work is orchestration code -- a `GenerationPipeline` service that calls these existing methods in sequence with progress tracking and partial-result recovery.

Resource integration reuses the existing upload and document processing infrastructure (Phases 43-47). The main new code is a PPTX processor (~120 lines) built on the already-installed JSZip package, and an extended `GenerationInput` type that carries supplementary resource content for prompt injection. Lesson phase detection uses regex pattern matching (following the `contentPreservation/detector.ts` precedent) rather than AI, because phase labels are a finite, known vocabulary that regex handles in 0ms versus 3+ seconds for an AI call.

The critical design principle is **orchestration, not modification**: existing AI provider methods remain unchanged. The pipeline calls them in sequence. This means zero risk to existing generation quality, independent testability of each pass, and graceful degradation (if Pass 2 fails, Pass 1 results are still returned).

## Key Findings

**Stack:** No new dependencies. Zero changes to package.json. JSZip (already installed) handles PPTX reading. DOMParser (browser-native) handles PPTX XML parsing. All AI operations exist.

**Architecture:** New `GenerationPipeline` service orchestrates existing `generateLessonSlides()`, `analyzeGaps()`, and `generateSlideFromGap()` methods with progress tracking and partial-result recovery.

**Critical pitfall:** Gap slide index shifting during insertion -- inserting slides sequentially corrupts positions. Must use single-pass merge or reverse-order insertion.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Phase 1: Foundation Types and Phase Detection** - Add `LessonPhase` type, `lessonPhase?` to Slide, and build the phase detection regex module.
   - Addresses: Lesson phase labels (table stakes), phase badge UI foundation
   - Avoids: Pitfall #7 (false positives) by implementing structural matching from the start
   - Rationale: New Slide field is referenced by all subsequent features. Must come first.

2. **Phase 2: PPTX Processor and Resource Upload** - Build PPTX processor via JSZip, extend upload service, create supplementary upload UI in INPUT state.
   - Addresses: PPTX resource upload (differentiator), resource upload in INPUT (table stakes)
   - Avoids: Pitfall #4 (XML namespace handling) by using namespace-aware DOM from the start
   - Rationale: Resource infrastructure must exist before the pipeline can consume it.

3. **Phase 3: Generation Pipeline Orchestrator** - Build the multi-pass pipeline service, wire into App.tsx, implement progress UI.
   - Addresses: Auto gap filling (table stakes), multi-pass pipeline (differentiator), coverage score display
   - Avoids: Pitfall #1 (index shifting) with single-pass merge, Pitfall #2 (error cascading) with partial-result recovery
   - Rationale: Core value proposition. Depends on phase detection (Phase 1) and resource processing (Phase 2).

4. **Phase 4: Phase-Aware Generation and UI** - Extend generation prompts with phase context and resource content, add phase badges to editor, surface coverage score.
   - Addresses: Phase labels on slides (table stakes), resource content in generation (table stakes), phase badges (differentiator)
   - Avoids: Pitfall #3 (truncated phase detection) by running detection on full text before truncation
   - Rationale: The "visible impact" phase -- everything built in 1-3 becomes user-visible here.

**Phase ordering rationale:**
- Types first (Phase 1) because all other phases reference `LessonPhase` and `ProcessedResource`
- Processors second (Phase 2) because the pipeline needs resources to integrate
- Pipeline third (Phase 3) because it orchestrates everything but needs the building blocks
- UI last (Phase 4) because it renders results from the pipeline

**Research flags for phases:**
- Phase 1 (Phase Detection): Likely needs deeper research on real Australian lesson plan templates to build comprehensive synonym dictionary. Regex patterns for non-standard phase labels are a risk.
- Phase 2 (PPTX Processor): Standard patterns, unlikely to need research. JSZip + DOMParser approach is well-documented.
- Phase 3 (Pipeline): Standard orchestration, unlikely to need research. Existing gap analysis methods are proven.
- Phase 4 (UI): May need UX research on phase badge design and placement. Teacher testing recommended.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified: no new deps needed. All packages at working versions. JSZip handles PPTX. |
| Features | HIGH | Table stakes verified against competitors (Monsha, Chalkie, MagicSchool). Core operations already exist. |
| Architecture | HIGH | Pipeline pattern follows existing `EnhancementState` precedent. All AI methods exist and are tested. |
| Phase Detection | MEDIUM | Regex approach is sound, but Australian lesson plan format variety is not fully catalogued. Need real-world testing. |
| PPTX Parsing | HIGH | Office Open XML is well-documented. JSZip + DOMParser is proven pattern used by multiple npm packages. |
| Pitfalls | HIGH | Critical pitfalls (index shifting, error cascading, truncation) are well-understood with clear prevention strategies. |

## Gaps to Address

- **Australian lesson plan format variety:** Need to collect 5-10 real lesson plan PDFs from different template sources to validate phase detection regex patterns. UK vs. Australian vs. US terminology may differ.
- **Phase balance thresholds:** What constitutes a "good" distribution of I Do / We Do / You Do slides? Needs teacher validation. Initial heuristic: flag if any phase is 0% of the deck.
- **Resource token budgeting:** The 2,000-char-per-resource cap is a conservative estimate. May need tuning based on real teacher resources and generation quality testing.
- **PPTX edge cases:** SmartArt, charts, and grouped shapes in PPTX may not extract cleanly. Need testing with real teacher PowerPoint files, not just simple test decks.
- **Pipeline timing:** Multi-pass adds 10-25 seconds to generation. Need to validate that the progress UI makes this feel acceptable versus the current ~15 second single-pass.

## Files Created

| File | Purpose |
|------|---------|
| `.planning/research/STACK.md` | Technology recommendations -- no new deps, version pins, integration points |
| `.planning/research/FEATURES-v5.0-smart-generation.md` | Feature landscape with table stakes, differentiators, anti-features, MVP ordering |
| `.planning/research/ARCHITECTURE-v5.0-smart-generation.md` | Pipeline architecture, component boundaries, data flow, type definitions |
| `.planning/research/PITFALLS-v5.0-smart-generation.md` | 11 pitfalls with prevention strategies, severity-ranked |
| `.planning/research/SUMMARY-v5.0-smart-generation.md` | This file -- executive summary with roadmap implications |
