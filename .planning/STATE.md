# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Students see only the presentation; teachers see the teleprompter script
**Current focus:** v2.2 Flexible Upload & Class Bank

## Current Position

Phase: 8 - Flexible Upload UI
Plan: 1 of 1 complete
Status: Phase 8 complete, Phase 9 ready
Last activity: 2026-01-19 - Completed 08-01-PLAN.md (dual upload zones)

Progress: [##--------] 1/4 v2.2 plans complete

## Performance Metrics

**Velocity:**
- v1.0: 6 plans, 1 day
- v1.1: 3 plans, 8 hours
- v1.2: 5 plans, 1 day
- v2.0: 11 plans, 1 day
- v2.1: 2 plans, 4 hours
- v2.2: In progress (1 plan, 3 min)

**Project Totals:**
- Milestones shipped: 5 (v1.0, v1.1, v1.2, v2.0, v2.1)
- Total phases: 14 completed + 4 planned (v2.2)
- Total plans: 28 (27 + 1 new)
- Total LOC: ~7,100 TypeScript

## Completed Milestones

- v2.1 Landing Page & Branding (2026-01-19) - 2 phases, 2 plans
- v2.0 Shareable Presentations (2026-01-19) - 5 phases, 11 plans
- v1.2 Permission Flow Fix (2026-01-18) - 2 phases, 5 plans
- v1.1 Draggable Preview Window (2026-01-18) - 2 phases, 3 plans
- v1.0 Dual-Monitor Student View (2026-01-18) - 3 phases, 6 plans

## v2.2 Milestone Progress

| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 8 | Flexible Upload UI | Complete | UPLOAD-01 to UPLOAD-04 |
| 9 | AI Adaptation Logic | Ready | UPLOAD-05 to UPLOAD-07 |
| 10 | Class Bank Core | Ready | CLASS-01 to CLASS-04 |
| 11 | Class Management UI | Blocked by 10 | CLASS-05 to CLASS-08 |

Note: Phases 9 and 10 can be worked in parallel (independent feature sets).

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Summary of key v2.2 decisions (Phase 8):
- Green theme for lesson PDF upload zone (existing pattern)
- Blue theme for existing presentation PDF upload zone (new)
- Mode derivation via useMemo (fresh/refine/blend/none)
- Shared processPdf helper with callbacks for code reuse
- Dynamic button labels based on upload mode

Summary of key v2.1 decisions:
- Load button placed left of Generate button (secondary action left, primary right)
- Styled text header branding with whiteboard icon (better theming than logo image)
- Dark mode as default theme (better visual experience)
- Subtle violet light mode background (consistent brand theming)

### Pending Todos

See `.planning/todos/pending/`

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-19 11:14 UTC
Stopped at: Completed 08-01-PLAN.md
Resume file: None
Next: Phase 9 (AI Adaptation Logic) or Phase 10 (Class Bank Core)

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-19 - Completed Phase 8 Plan 1*
