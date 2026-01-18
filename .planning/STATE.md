# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-19)

**Core value:** Colleagues can use presentations you create, with optional AI features via their own API keys
**Current focus:** Phase 2 - Multi-Provider AI

## Current Position

Phase: 3 of 5 (Disabled AI State)
Plan: 1/2 complete
Status: In progress
Last activity: 2026-01-19 — Completed 03-01-PLAN.md

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**
- v1.0: 6 plans, 1 day
- v1.1: 3 plans, 8 hours
- v1.2: 5 plans, 1 day
- v2.0 Phase 1: 2 plans complete
- v2.0 Phase 2: 3 plans complete

**Project Totals:**
- Milestones shipped: 3 (v1.0, v1.1, v1.2)
- Total phases: 7 (v1.0: 3, v1.1: 2, v1.2: 2)
- Total plans: 18 (14 prior + 4 v2.0)
- Total LOC: ~5,400 TypeScript

## Completed Milestones

- v1.2 Permission Flow Fix (2026-01-18) - 2 phases, 5 plans
- v1.1 Draggable Preview Window (2026-01-18) - 2 phases, 3 plans
- v1.0 Dual-Monitor Student View (2026-01-18) - 3 phases, 6 plans

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**v2.0 Phase 1 Decisions:**
- Use list-models endpoints for API key validation (free/cheap)
- Settings stored globally in 'pipi-settings' localStorage key
- Type guards validate data shape on localStorage read
- Save directly to localStorage before closing modal (race condition fix)

**v2.0 Phase 2 Decisions:**
- Strategy pattern with factory for provider abstraction
- AIProviderError class with error codes for unified error handling
- OpenAI removed from UI (CORS blocked in browser, confusing for users)
- Claude uses claude-sonnet-4-20250514 model for text generation
- Claude image methods return undefined (graceful degradation)
- JSON extraction handles optional markdown code block wrapping
- Settings sync on modal close ensures app state matches localStorage
- Provider passed as prop to child components with onError callback

**v2.0 Phase 3 Decisions:**
- Single 'Open Settings' action in EnableAIModal (no dismiss button)
- Lock icon positioned top-right of button for visibility
- 100ms delay on Settings auto-focus ensures modal animation completes

### Pending Todos

7 pending - see `.planning/todos/pending/`

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-19
Stopped at: Completed 03-01-PLAN.md
Resume file: None
Next: 03-02-PLAN.md (Extend disabled state to child components)

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-19 — Completed 03-01-PLAN.md*
