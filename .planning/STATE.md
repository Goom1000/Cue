# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Students see only the presentation; teachers see the teleprompter script
**Current focus:** v3.5 Working Wall Export

## Current Position

Phase: 40 - AI Poster Mode
Plan: 1 of 2 complete
Status: In progress
Last activity: 2026-01-27 — Completed 40-01-PLAN.md

Progress: [████████░░] 80% (v3.5 phases 38-40, 3 of 4 plans complete)

## Performance Metrics

**Velocity:**
- Milestones shipped: 15 (v1.0 through v3.4)
- Total phases completed: 39
- Total plans completed: 113
- Total LOC: ~19,100 TypeScript

**v3.5 Milestone (in progress):**
- Phases: 3 (38-40)
- Requirements: 17 total, 11 shipped (SEL-01 through SEL-05, EXP-01 through EXP-03, QEX-01 through QEX-03)
- Plans completed: 3
- Started: 2026-01-27

**Recent Milestones:**
- v3.4: 2 phases, 5 plans, 8 days (2026-01-26)
- v3.3: 3 phases, 3 plans, 1 day (2026-01-26)
- v3.2: 4 phases, 4 plans, 1 day (2026-01-25)
- v3.1: 2 phases, 3 plans, 1 day (2026-01-25)
- v3.0: 7 phases, 33 plans, 2 days (2026-01-24)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

| Phase | Decision | Rationale | Impact |
|-------|----------|-----------|--------|
| 38-01 | Use Set<string> for selectedSlideIds instead of Array | O(1) operations (has/add/delete) vs Array O(n) for includes() | Better performance with many slides |
| 38-01 | Selection ring (ring-2) coexists with active state ring (ring-1) | Visual distinction between selected and currently active slide | Both states visible simultaneously |
| 38-01 | Automatic cleanup of stale selections via useEffect | Prevents ghost selections after slide delete/reorder | Prevents selecting non-existent slides |
| 39-01 | A4 landscape orientation for PDF export | Matches slide aspect ratio for optimal Working Wall display | Print-quality output |
| 39-01 | Hidden render container with 2x scale capture | 1190x842px at scale:2 produces 150+ DPI for print | High quality classroom posters |
| 39-01 | Sequential slide rendering with cleanup | Render one slide at a time, unmount after capture | Prevents memory issues with many slides |
| 40-01 | Claude structured outputs beta for poster JSON | Guarantees valid JSON matching PosterLayout schema | Type-safe AI responses |
| 40-01 | Sequential poster generation with progress callbacks | Manage memory, provide UI feedback | Better UX during generation |
| 40-01 | Subject inference from first slide | Keyword matching for color scheme selection | Subject-appropriate poster colors |

### Pending Todos

See `.planning/todos/pending/` — run `/gsd:check-todos` to review

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 40-01-PLAN.md
Resume file: None

**Next step:** Execute 40-02-PLAN.md for poster UI and PDF rendering

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-27 — Completed 40-01 (AI Poster Content Transformation)*
