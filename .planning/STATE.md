# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Students see only the presentation; teachers see the teleprompter script that lets them sound knowledgeable and natural.
**Current focus:** v6.0 Scripted Import -- Phase 73: Claude Chat Tips

## Current Position

Phase: 73 of 73 (Claude Chat Tips)
Plan: 1 of 1 complete
Status: Phase 73 complete (Claude Chat Tips), v6.0 Scripted Import milestone complete
Last activity: 2026-02-22 -- Phase 73 Plan 01 complete (Claude Chat Tips overlay)

Progress: [██████████] 100% (5/5 phases)

## Performance Metrics

**Velocity:**
- Milestones shipped: 24 (v1.0 through v5.0)
- Total phases completed: 68
- Total plans completed: 232
- Total LOC: ~37,950 TypeScript

**Recent Milestones:**
- v5.0: 4 phases, 10 plans, 3 days (2026-02-16) - Smart Generation
- v4.1: 4 phases, 5 plans, 1 day (2026-02-08) - Script Mode
- v4.0: 6 phases, 18 plans, 21 days (2026-02-07) - Clipboard Builder

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.

- Phase 69-01: Day boundary flush skips default empty Day 1 when first line is ## Day N header
- Phase 69-01: Section headings accept both ## and ### levels for flexibility
- Phase 69-01: SUPPORTED_MARKERS ordered longest-first to prevent partial regex matches
- Phase 70-01: Positional segment groups instead of flat Say list for correct teleprompter alignment
- Phase 70-01: Ask flush only when more blocks follow to prevent empty trailing slides
- Phase 70-01: Consecutive section headings collapse into single slide
- Phase 70-02: Early-return before Pass 1 for scripted mode ensures zero regression risk on existing AI code paths
- Phase 70-02: Unreachable provider switch cases return empty string with comment for TypeScript exhaustiveness
- Phase 71-01: Shared buildEnrichmentPrompt in aiProvider.ts prevents prompt drift between providers
- Phase 71-01: Layout lock duplicated in prompt hints and merge logic for defense in depth
- Phase 71-01: Partial success merges valid results then applies fallback for remaining empty prompts
- Phase 71-01: Theme assignment included in batch call (trivial token cost, already on Slide type)
- Phase 72-01: Reuse existing MARKER_PATTERNS for detection instead of creating separate regex set
- Phase 72-01: Set-based day filtering for O(1) lookup per day instead of array.includes()
- Phase 72-02: Scripted mode override uses nullable boolean (null = auto, true/false = manual) for clean toggle semantics
- Phase 72-02: Day picker positioned inline on landing page between banner and verbosity selector
- Phase 72-02: Verbosity selector hidden in scripted mode since scripted preserves verbatim text
- Phase 73-01: Marker descriptions hardcoded in component since SUPPORTED_MARKERS only has names
- Phase 73-01: Tips link shown unconditionally so teachers can read format before toggling scripted mode
- Phase 73-01: Prompt template stored as dedented string constant to avoid whitespace issues on copy

### Pending Todos

See `.planning/todos/pending/` - run `/gsd:check-todos` to review.

### Blockers/Concerns

None for v6.0. Research confidence is HIGH across all areas. Zero new dependencies.

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 73-01-PLAN.md (Claude Chat Tips overlay)
Resume file: .planning/phases/73-claude-chat-tips/73-01-SUMMARY.md

---
*State initialized: 2026-01-18*
*Last updated: 2026-02-22 -- Phase 73 complete (Claude Chat Tips), v6.0 milestone complete*
