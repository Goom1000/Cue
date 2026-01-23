---
phase: 24-beat-the-chaser
plan: 03
subsystem: ui
tags: [react, typescript, game-mechanics, timers, animations, hooks]

# Dependency graph
requires:
  - phase: 24-01
    provides: Config constants, difficulty types, timer calculation helpers
  - phase: 23-02
    provides: useTimer hook, useChaserAI hook
provides:
  - DualTimerDisplay component with side-by-side countdown timers
  - TimeBonusEffect component with floating +5s animation
  - TimedBattlePhase orchestrator with turn-based mechanics and catch-up mechanic
affects: [24-04, 24-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Turn-based state machine (TurnPhase union type)
    - Active/inactive timer control (only one counts down at a time)
    - Catch-up mechanic (time bonus on opponent error)

key-files:
  created:
    - components/games/beat-the-chaser/DualTimerDisplay.tsx
    - components/games/beat-the-chaser/TimeBonusEffect.tsx
    - components/games/beat-the-chaser/TimedBattlePhase.tsx
  modified: []

key-decisions:
  - "Turn-based mechanics: contestant answers first, then chaser on same question (sequential play)"
  - "Only active player's timer counts down - timers pause during answer feedback"
  - "Catch-up mechanic: +5s added to contestant timer when chaser answers incorrectly (capped at 120s)"
  - "Instant loss: Timer reaching 0 immediately triggers game over for that player"
  - "End condition: Timer expiry OR questions exhausted (winner = most time remaining)"

patterns-established:
  - "TurnPhase state machine: contestant-answering → contestant-feedback → chaser-thinking → chaser-feedback → time-bonus (if applicable) → next question"
  - "Dual timer control: useTimer hook called twice with separate autoStart configs"
  - "AI chaser integration: useChaserAI with 1000ms thinking delay for dramatic pacing"

# Metrics
duration: 2min
completed: 2026-01-23
---

# Phase 24 Plan 03: Timed Battle Phase Summary

**Dual independent timers with turn-based mechanics and catch-up bonus for dynamic Beat the Chaser gameplay**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-01-23T16:43:01Z
- **Completed:** 2026-01-23T16:45:44Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Dual timer display with active/inactive visual states (glow, scale, opacity)
- Turn-based mechanics with only active player's timer counting down
- Catch-up mechanic: +5s floating animation when chaser answers incorrectly
- Instant loss condition when either timer reaches zero
- Sequential question flow with automatic turn switching

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DualTimerDisplay component** - `ddab31e` (feat)
2. **Task 2: Create TimeBonusEffect component** - `60f8074` (feat)
3. **Task 3: Create TimedBattlePhase component** - `6f65a71` (feat)

## Files Created/Modified
- `components/games/beat-the-chaser/DualTimerDisplay.tsx` - Side-by-side countdown timers with active/inactive states, urgency styling at 10s threshold
- `components/games/beat-the-chaser/TimeBonusEffect.tsx` - Floating +5s animation with fade-up effect (1200ms duration)
- `components/games/beat-the-chaser/TimedBattlePhase.tsx` - Main timed battle orchestrator with turn mechanics, dual timer control, and catch-up bonus

## Decisions Made

**Turn-based mechanics:**
- Contestant answers first, then chaser on same question (sequential play prevents simultaneous answering)
- Only active player's timer counts down (inactive timer paused)
- Timers pause during answer feedback for dramatic effect

**Catch-up mechanic:**
- Contestant earns +5s when chaser answers incorrectly (only during chaser's turn)
- Time bonus capped at 120 seconds to prevent runaway accumulation
- Floating animation provides visual feedback for bonus awarded

**Game end conditions:**
- Instant loss: Timer reaching 0 immediately ends game (winner = other player)
- Questions exhausted: Winner determined by most time remaining
- AI chaser uses 1000ms thinking delay (faster than Chase's 1500ms for tighter pacing)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 24-04 (Result Screen):**
- Timed battle phase delivers winner ('contestant' | 'chaser') to onComplete callback
- Game state includes final timer values for victory margin display

**Ready for 24-05 (Game Orchestrator):**
- TimedBattlePhase accepts contestantStartTime and chaserStartTime props from Cash Builder results
- Component exports default for easy integration

---
*Phase: 24-beat-the-chaser*
*Completed: 2026-01-23*
