# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-26)

**Core value:** Students see only the presentation; teachers see the teleprompter script
**Current focus:** v3.4 Ask AI — Phase 37

## Current Position

Phase: 37 (History & Keyboard)
Plan: 01 of 1 complete
Status: Phase complete
Last activity: 2026-01-26 — Completed 37-01-PLAN.md (History & Keyboard)

Progress: [█████░░░░░] 50% (Phase 36-37, 5 of 10 plans complete)

## Performance Metrics

**Velocity:**
- Milestones shipped: 14 (v1.0 through v3.3)
- Total phases completed: 36
- Total plans completed: 104
- Total LOC: ~18,420 TypeScript

**v3.4 Milestone (in progress):**
- Phases: 2 (36-37)
- Requirements: 17 total
- Plans completed: 5/10
- Started: 2026-01-26

**Recent Milestones:**
- v3.3: 3 phases, 3 plans, 1 day (2026-01-26)
- v3.2: 4 phases, 4 plans, 1 day (2026-01-25)
- v3.1: 2 phases, 3 plans, 1 day (2026-01-25)
- v3.0: 7 phases, 33 plans, 2 days (2026-01-24)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting future work:

- **v3.4**: Use inline panel in teleprompter (not modal) for Ask AI feature
- **v3.4**: Streaming mandatory for response display (non-negotiable)
- **v3.4**: Session-only history (not persisted to .cue files)
- **36-01**: ChatContext includes gradeLevel field for age-appropriate AI responses
- **36-01**: streamChat uses AsyncGenerator<string> pattern for streaming (not callbacks)
- **36-01**: Context builder reuses pattern from buildSlideContext for consistency
- **36-02**: Use gemini-2.0-flash-exp model for streaming chat
- **36-02**: Plain prose responses (no markdown) for better teleprompter display
- **36-02**: System prompt includes gradeLevel for age-appropriate language
- **36-03**: Claude streaming uses manual SSE parsing (EventSource doesn't support POST)
- **36-03**: Buffer strategy handles partial chunks split across network reads
- **36-04**: Ask AI moved from inline teleprompter to header dropdown (better UX)
- **36-04**: Dropdown overlays presentation area (not teleprompter) on left side
- **36-04**: White/inverse button styling for high visibility in header
- **36-04**: Character animation at 200 chars/sec using requestAnimationFrame
- **37-01**: History saved after successful streaming completes (not during)
- **37-01**: History displays newest first via reverse() on render
- **37-01**: Timestamp used as React key (guaranteed unique)

### Pending Todos

See `.planning/todos/pending/` — run `/gsd:check-todos` to review

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed 37-01-PLAN.md (History & Keyboard) — Phase 37 complete
Resume file: None

**Next step:** v3.4 Ask AI milestone complete - ready for final verification

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-26 — v3.4 Ask AI milestone Phase 37 complete*
