# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-27)

**Core value:** Students see only the presentation; teachers see the teleprompter script
**Current focus:** Phase 41 - Tour Infrastructure & Accessibility

## Current Position

Phase: 41 of 44 (Tour Infrastructure & Accessibility)
Plan: 4 of 4 complete
Status: Complete (verified 14/14 must-haves)
Last activity: 2026-01-28 — Phase 41 verified and complete

Progress: [████░░░░░░] 4.1% (5/122)

## Performance Metrics

**Velocity:**
- Milestones shipped: 17 (v1.0 through v3.5)
- Total phases completed: 41
- Total plans completed: 123
- Total LOC: ~20,433 TypeScript

**v3.5 Milestone (shipped):**
- Phases: 3 (38-40)
- Requirements: 17 total, 17 shipped
- Plans completed: 4
- Started: 2026-01-27
- Shipped: 2026-01-27

**Recent Milestones:**
- v3.5: 3 phases, 4 plans, 1 day (2026-01-27)
- v3.4: 2 phases, 5 plans, 8 days (2026-01-26)
- v3.3: 3 phases, 3 plans, 1 day (2026-01-26)
- v3.2: 4 phases, 4 plans, 1 day (2026-01-25)
- v3.1: 2 phases, 3 plans, 1 day (2026-01-25)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions for v3.6:
- Using driver.js (5kb) for tours and Floating UI (3kb) for tooltips per research findings
- Per-screen tour pattern (separate tours for Landing/Editor/Presentation) to avoid tour fatigue
- Manual trigger only (no auto-play) to prevent workflow interruption during live teaching
- Z-index 10000+ range for tours: overlay at z-10000, popover at z-10001 (41-01)
- Tooltip color inversion in dark mode: light tooltips on dark bg for better contrast (41-01)
- 200ms hover delay for tooltips to prevent accidental triggers (41-01)
- Tour completion detection: Track step index and only fire onComplete when user reaches last step, not on skip/dismiss (41-03)
- Keyboard navigation: Enable allowKeyboardControl in driver.js for Tab/Enter/Escape handling (41-03)
- Focus indicators: Use theme-aware focus rings (indigo-500 light, amber-500 dark) for keyboard visibility (41-03)
- Tour button visibility: Only on INPUT state (landing page), not EDITING state to avoid clutter (41-04)
- Tour replay behavior: User can restart tour anytime by clicking button, regardless of completion state (41-04)
- Data-tour attributes: Pattern established for element targeting (upload-zone, generate-button) (41-04)

### Pending Todos

See `.planning/todos/pending/` — run `/gsd:check-todos` to review

### Blockers/Concerns

**Phase 41 considerations:**
- Z-index hierarchy established: Tour overlay (z-10000) above FloatingWindow (z-9999), tour popover (z-10001) above overlay ✓
- Accessibility testing: Verify keyboard-only navigation works with screen readers (NVDA/VoiceOver) - deferred to Phase 44
- Dark mode contrast: Verify tooltip text contrast ratio meets WCAG 2.1 (4.5:1 minimum) - recommend WebAIM testing in Phase 43
- Tour overlay interaction: Verify tooltips remain accessible during active tours - test in Phase 42

**Phase 44 considerations:**
- BroadcastChannel safety: Tours must never sync to student view or corrupt game state
- Context-aware suppression: Disable tooltips during active game state or export process

## Session Continuity

Last session: 2026-01-28
Stopped at: Completed 41-04-PLAN.md (Phase 41 complete)
Resume file: None

**Next step:** `/gsd:discuss-phase 42` or `/gsd:plan-phase 42` to build Landing Page Tour & Tooltips

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-28 — Phase 41 tour infrastructure & accessibility complete*
