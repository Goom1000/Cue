# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-18)

**Core value:** Students see only slides; teachers see slides + teleprompter
**Current focus:** v1.1 Draggable Preview Window

## Current Position

Phase: 2 of 2 (Snap-to-Grid & Persistence)
Plan: 2 of 2 complete
Status: Milestone complete
Last activity: 2026-01-18 — Completed Phase 2, v1.1 milestone done

Progress: [==========] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 3 (v1.1)
- Average duration: 5min
- Total execution time: 15min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-drag-resize-float | 1/1 | 8min | 8min |
| 02-snap-to-grid-persistence | 2/2 | 7min | 3.5min |

*Updated after each plan completion*

## Completed Milestones

- v1.0 Dual-Monitor Student View (2026-01-18) — 3 phases, 6 plans
  See: .planning/milestones/v1.0-ROADMAP.md

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**v1.1 Decisions:**
- react-rnd for combined drag+resize with aspect ratio lock
- 20px edge magnetism threshold for snapping to viewport edges
- Portal rendering for z-index isolation (z-index 9999)
- Corner-only resize handles that appear on hover
- 80% opacity during drag with 150ms transition
- Storage key uses first slide ID for per-presentation uniqueness
- Save on visibilitychange + beforeunload + unmount for reliability
- Viewport bounds validation ensures preview visible on smaller screens
- Controlled mode via position/size props maintains uncontrolled backward compatibility
- 50px grid size for snap-to-grid positioning
- Invisible grid snapping (removed visual overlay per user feedback)

### Pending Todos

3 pending — see `.planning/todos/pending/`

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-18
Stopped at: v1.1 milestone complete
Resume file: None

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-18 — v1.1 milestone complete*
