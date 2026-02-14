# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Students see only the presentation; teachers see the teleprompter script that lets them sound knowledgeable and natural.
**Current focus:** v5.0 Smart Generation -- MILESTONE COMPLETE

## Current Position

Phase: 68 of 68 (Phase-Aware UI + Resource Injection)
Plan: 2 of 2 in current phase
Status: ✓ Complete -- Milestone v5.0 finished
Last activity: 2026-02-15 -- Phase 68 executed and verified

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Milestones shipped: 23 (v1.0 through v4.1)
- Total phases completed: 68
- Total plans completed: 230
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

**Phase 68-01 decisions:**
- Phase percentages calculated relative to assigned slides only (not total), so unassigned slides don't dilute distribution
- Phase badge uses native `<select>` styled as colored pill -- accessible by default, no custom dropdown needed
- Balance indicator only renders when at least one slide has a lessonPhase assigned

**Phase 68-02 decisions:**
- Resource injection appended to user prompt (not system prompt) so AI sees resources as teacher-provided context
- Both providers inject identically via shared buildResourceInjectionText -- ensures PROV-01/PROV-02 parity
- ResourceHub deduplicates by resource ID on mount to handle overlap between enhancedResourceStates and supplementaryResources
- generationPipeline.ts not modified -- supplementaryResourceText passes through automatically via GenerationInput

### Pending Todos

See `.planning/todos/pending/` - run `/gsd:check-todos` to review.

### Blockers/Concerns

- Phase detection regex needs validation against real Australian lesson plan templates (research flag from SUMMARY)
- PPTX edge cases (SmartArt, charts, grouped shapes) may not extract cleanly -- needs testing with real teacher files

## Session Continuity

Last session: 2026-02-15
Stopped at: v5.0 milestone complete -- all 4 phases (65-68) executed and verified
Resume file: .planning/ROADMAP.md

---
*State initialized: 2026-01-18*
*Last updated: 2026-02-15 -- v5.0 milestone complete (Phase 68 executed and verified)*
