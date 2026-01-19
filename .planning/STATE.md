# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Students see only the presentation; teachers see the teleprompter script
**Current focus:** v2.2 Flexible Upload & Class Bank

## Current Position

Phase: 10 - Class Bank Core
Plan: 2 of 2 complete (Phase complete)
Status: Phase complete
Last activity: 2026-01-20 - Completed 10-02-PLAN.md (load dropdown + App.tsx integration)

Progress: [#######---] 6/7 v2.2 plans complete

## Performance Metrics

**Velocity:**
- v1.0: 6 plans, 1 day
- v1.1: 3 plans, 8 hours
- v1.2: 5 plans, 1 day
- v2.0: 11 plans, 1 day
- v2.1: 2 plans, 4 hours
- v2.2: In progress (6 plans, ~20 min)

**Project Totals:**
- Milestones shipped: 5 (v1.0, v1.1, v1.2, v2.0, v2.1)
- Total phases: 16 completed + 2 planned (v2.2)
- Total plans: 32
- Total LOC: ~7,400 TypeScript

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
| 9 | AI Adaptation Logic | Complete (3 plans) | UPLOAD-05 to UPLOAD-07 |
| 10 | Class Bank Core | Complete (2 plans) | CLASS-01 to CLASS-04 |
| 11 | Class Management UI | Ready to start | CLASS-05 to CLASS-08 |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Summary of key v2.2 decisions (Phase 10):
- CLASS_BANK_KEY constant for localStorage key (consistent with useSettings pattern)
- Type guard validates every student string in array (prevents corrupted data)
- window.confirm for duplicate class name confirmation (simple, per context)
- Save/Load buttons placed before student chips (logical grouping)
- Clear activeClassName on manual student modification (accurate dirty state tracking)

Summary of key v2.2 decisions (Phase 9):
- Backward compatible signature (string | GenerationInput) for generateLessonSlides
- Shared prompt constants (TELEPROMPTER_RULES, JSON_OUTPUT_FORMAT) for consistency
- Blend mode limited to 5 images per source (10 total) for token safety
- GeminiProvider mirrors Claude prompt structure for consistent behavior
- Refine mode must preserve ALL content (restructure, don't omit) - user decides what to remove

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

12 todos in `.planning/todos/pending/` — run `/gsd:check-todos` to review

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-20
Stopped at: Completed 10-02-PLAN.md (load dropdown + App.tsx integration)
Resume file: None
Next: Phase 11 - Class Management UI

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-20 - Completed Phase 10 (Class Bank Core)*
