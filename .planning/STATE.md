# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-14)

**Core value:** Students see only the presentation; teachers see the teleprompter script that lets them sound knowledgeable and natural.
**Current focus:** v5.0 Smart Generation -- Phase 67 (Generation Pipeline)

## Current Position

Phase: 67 of 68 (Generation Pipeline)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-14 -- Phase 66 verified and complete

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**
- Milestones shipped: 23 (v1.0 through v4.1)
- Total phases completed: 66
- Total plans completed: 221
- Total LOC: ~35,000 TypeScript

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

### Pending Todos

See `.planning/todos/pending/` - run `/gsd:check-todos` to review.

### Blockers/Concerns

- Phase detection regex needs validation against real Australian lesson plan templates (research flag from SUMMARY)
- PPTX edge cases (SmartArt, charts, grouped shapes) may not extract cleanly -- needs testing with real teacher files

## Session Continuity

Last session: 2026-02-14
Stopped at: Phase 66 verified and complete -- ready to plan Phase 67
Resume file: .planning/ROADMAP.md

---
*State initialized: 2026-01-18*
*Last updated: 2026-02-14 -- Phase 66 verified complete*
