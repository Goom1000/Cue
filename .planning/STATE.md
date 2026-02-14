# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Students see only the presentation; teachers see the teleprompter script that lets them sound knowledgeable and natural.
**Current focus:** v5.0 Smart Generation -- Phase 68 (Phase-Aware UI + Resource Injection)

## Current Position

Phase: 68 of 68 (Phase-Aware UI + Resource Injection)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-15 -- Phase 67 executed and verified (gap closure complete)

Progress: [████████░░] 75%

## Performance Metrics

**Velocity:**
- Milestones shipped: 23 (v1.0 through v4.1)
- Total phases completed: 67
- Total plans completed: 226
- Total LOC: ~36,000 TypeScript

**Recent Milestones:**
- v4.1: 4 phases, 5 plans, 1 day (2026-02-08) - Script Mode
- v4.0: 6 phases, 18 plans, 21 days (2026-02-07) - Clipboard Builder
- v3.9: 4 phases, 8 plans, 14 days (2026-02-01) - Delay Answer Reveal

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.

**Phase 65-01 decisions:**
- Content patterns skipped when structural (high confidence) match exists for same phase -- prevents duplicate detections
- "I Do" uses case-sensitive structural regex; longer synonyms use case-insensitive
- PHASE_PATTERNS ordered: hook, i-do, we-do-together, we-do, you-do, plenary (longest match first)

**Phase 65-02 decisions:**
- Phase detection is pure client-side post-processing -- AI prompt and response schema are not modified
- Mode guard uses explicit `fresh || blend` (not `!== refine`) for safety against future mode additions
- Phase detection runs before content preservation detection to operate on full unprocessed lesson text

**Phase 66-01 decisions:**
- PPTX extraction is text-only (no images from ppt/media/) to avoid save file bloat
- Content capping is a pure view function applied at prompt construction time, not upload time
- Per-resource cap 2000 chars, total cap 6000 chars, max 5 supplementary resources
- Used getElementsByTagNameNS with full DrawingML namespace URI (not prefix-based)

**Phase 66-02 decisions:**
- Auto-save explicitly excludes supplementary resources to prevent localStorage overflow (~5MB limit)
- Supplementary resources persist through generate -- they are input context, not output
- Amber/orange theme distinguishes supplementary section from green (lesson plan) and blue (presentation) zones

**Phase 67-01 decisions:**
- Phase detection re-runs on merged deck using detectPhasesInText + assignPhasesToSlides (same two-step pattern as providers)
- Pipeline options use a flat interface rather than extending GenerationInput for clarity
- wasPartial covers three cases: failed gaps, overflowed gaps (beyond 5-gap cap), and AbortSignal cancellation

**Phase 67-02 decisions:**
- Pipeline progress maps PipelineStage to extended generationProgress.phase via detail string matching for teleprompter vs slides distinction
- Cancel preserves partial results: only returns to INPUT if slides.length === 0
- Coverage percentage stored in separate state for future Phase 68 UI display, currently drives success toast only

**Phase 67-03 decisions:**
- Signal threads to generateLessonSlides only -- regenerateTeleprompter skipped since individual calls are fast (~2-3s) and per-iteration abort check is sufficient
- Used undefined for pageImages parameter in pipeline call since GenerationInput carries images internally

### Pending Todos

See `.planning/todos/pending/` - run `/gsd:check-todos` to review.

### Blockers/Concerns

- Phase detection regex needs validation against real Australian lesson plan templates (research flag from SUMMARY)
- PPTX edge cases (SmartArt, charts, grouped shapes) may not extract cleanly -- needs testing with real teacher files

## Session Continuity

Last session: 2026-02-15
Stopped at: Phase 67 executed and verified -- ready to plan Phase 68
Resume file: .planning/ROADMAP.md

---
*State initialized: 2026-01-18*
*Last updated: 2026-02-15 -- Phase 67 executed and verified*
