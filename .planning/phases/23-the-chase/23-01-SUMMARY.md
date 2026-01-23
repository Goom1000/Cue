---
phase: 23-the-chase
plan: 01
subsystem: game-types
tags: [typescript, react, hooks, countdown-timer, chase-game, game-state]

# Dependency graph
requires:
  - phase: 20-game-foundation
    provides: "Unified GameState discriminated union with BaseGameState"
provides:
  - "ChasePhase union type for multi-phase game flow"
  - "ChaseOffer interface for offer selection mechanics"
  - "Extended TheChaseState with complete game state fields"
  - "useTimer hook with pause/resume for countdown functionality"
  - "Timer component with urgency styling"
affects: [23-02-cash-builder, 23-03-offer-selection, 23-04-head-to-head, 23-05-final-chase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reusable countdown timer hook with external control option"
    - "Visual timer component with urgency threshold styling"

key-files:
  created:
    - "hooks/useTimer.ts"
    - "components/games/shared/Timer.tsx"
  modified:
    - "types.ts"

key-decisions:
  - "ChasePhase union type covers all game phases including game-over state"
  - "Timer hook supports both internal and external control for flexibility"
  - "Urgency threshold defaults to 10 seconds with red pulsing animation"
  - "Kept legacy isChasing field for backward compatibility"

patterns-established:
  - "Timer hook: setInterval-based countdown with cleanup, onTick/onComplete callbacks"
  - "Timer component: Internal or external control, size variants, urgency styling"

# Metrics
duration: 2min
completed: 2026-01-23
---

# Phase 23 Plan 01: Type System and Timer Foundation Summary

**Complete Chase game state type system with multi-phase support and reusable countdown timer infrastructure**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-23T10:45:55Z
- **Completed:** 2026-01-23T10:47:38Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Extended TheChaseState with complete multi-phase game structure (Cash Builder, Offer Selection, Head-to-Head, Final Chase)
- Created reusable useTimer hook with start/pause/reset/formattedTime controls
- Built Timer display component with urgency styling and size variants

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend TheChaseState type with full game state structure** - `28b04e9` (feat)
2. **Task 2: Create useTimer hook with pause/resume capability** - `aa79c4b` (feat)
3. **Task 3: Create Timer display component with urgency styling** - `4463800` (feat)

## Files Created/Modified

**Created:**
- `hooks/useTimer.ts` - Countdown timer hook with pause/resume, onTick/onComplete callbacks, formatted time (M:SS)
- `components/games/shared/Timer.tsx` - Visual countdown display with urgency styling, size variants, external control option

**Modified:**
- `types.ts` - Added ChasePhase union, ChaseOffer interface, extended TheChaseState with all game phase fields

## Decisions Made

**1. Multi-phase state structure**
- Defined 6 Chase phases: cash-builder, offer-selection, head-to-head, final-chase-contestant, final-chase-chaser, game-over
- Each phase has dedicated state fields in TheChaseState (cashBuilderScore, offers, contestantPosition, etc.)
- Kept legacy fields (isChasing, chaserPosition, contestantPosition) for backward compatibility

**2. Timer hook design**
- useTimer returns start/pause/reset functions with timeRemaining and formattedTime
- onTick callback fires each second with remaining time
- onComplete callback fires when timer reaches zero
- Optional autoStart parameter for immediate countdown

**3. Timer component flexibility**
- Supports both internal (using useTimer hook) and external control (parent-managed state)
- Size variants: small (text-2xl for inline) and large (text-6xl for prominent display)
- Urgency threshold defaults to 10 seconds (configurable)
- Urgency styling: red text with animate-pulse at threshold

**4. ChaseOffer structure**
- amount: Prize money value
- position: Starting board position (1-5, where 3 is middle offer)
- label: Display text like "High Offer (+2 steps)"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phase:**
- TheChaseState type system complete with all game phase fields
- Timer infrastructure ready for Cash Builder (60s), Final Chase contestant (2min), and Final Chase chaser (2min) rounds
- ChaseOffer structure ready for offer selection phase
- All TypeScript types compile without errors

**Next implementations:**
- 23-02: Cash Builder round (60-second rapid-fire Q&A)
- 23-03: Offer selection with student voting
- 23-04: Head-to-Head board mechanics
- 23-05: Final Chase dual-timer rounds

**No blockers or concerns.**

---
*Phase: 23-the-chase*
*Completed: 2026-01-23*
