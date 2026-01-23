---
phase: 21-millionaire-game
plan: 01
subsystem: ui
tags: [react, typescript, tailwind, game-types, millionaire]

# Dependency graph
requires:
  - phase: 20-game-foundation
    provides: Unified game type system with discriminated unions and BaseGameState
provides:
  - Extended MillionaireState with lifeline result tracking and safe haven management
  - Money tree configuration system for 3, 5, and 10 question variants
  - MoneyTree visual component with prize ladder display
affects: [21-02-millionaire-lifelines, 21-03-millionaire-game-logic]

# Tech tracking
tech-stack:
  added: []
  patterns: [Money tree configuration as data-driven scaling system]

key-files:
  created:
    - components/games/millionaire/millionaireConfig.ts
    - components/games/millionaire/MoneyTree.tsx
  modified:
    - types.ts

key-decisions:
  - "Money tree prizes and safe havens configured as data structures for 3/5/10 question variants"
  - "MoneyTree component uses flex-col-reverse to display highest prize at top (classic Millionaire layout)"
  - "Safe haven amounts calculated dynamically based on current position"

patterns-established:
  - "MoneyTreeConfig pattern: Question count drives prize ladder and safe haven positions"
  - "getSafeHavenAmount helper: Returns guaranteed minimum prize based on passed safe havens"

# Metrics
duration: 1min
completed: 2026-01-23
---

# Phase 21 Plan 01: Millionaire Game Foundation Summary

**Extended MillionaireState with lifeline tracking, money tree configuration for 3/5/10 question variants, and visual MoneyTree component with prize ladder display**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-23T07:44:51Z
- **Completed:** 2026-01-23T07:45:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extended MillionaireState type with lifeline result fields (eliminatedOptions, audiencePoll, phoneHint)
- Created money tree configuration system scaling to 3, 5, and 10 question variants
- Built MoneyTree component with visual distinction for current position, answered questions, and safe havens

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend MillionaireState type and create money tree configuration** - `97ad3b2` (feat)
2. **Task 2: Create MoneyTree component** - `360a0da` (feat)

## Files Created/Modified
- `types.ts` - Extended MillionaireState with eliminatedOptions, audiencePoll, phoneHint, safeHavenAmount, questionCount
- `components/games/millionaire/millionaireConfig.ts` - MONEY_TREE_CONFIGS for 3/5/10 variants, getSafeHavenAmount helper
- `components/games/millionaire/MoneyTree.tsx` - Visual prize ladder component with flex-col-reverse layout

## Decisions Made

**Money tree configuration as data structures:**
- Created MONEY_TREE_CONFIGS with three variants (3, 5, 10 questions) each with appropriate prize ladders and safe haven positions
- Safe havens positioned at final question for 3-question mode, questions 3 and 5 for 5-question mode, questions 5 and 10 for 10-question mode
- Rationale: Data-driven approach allows game logic to scale across difficulty levels without conditionals

**MoneyTree visual design:**
- flex-col-reverse layout displays highest prize at top (classic Millionaire visual hierarchy)
- Current question highlighted with amber background, scale transform, and shadow
- Answered questions shown in green with checkmark icon
- Safe havens have amber border and bold text when not yet reached
- Rationale: Matches iconic "Who Wants to Be a Millionaire" prize ladder appearance

**Safe haven amount calculation:**
- getSafeHavenAmount dynamically calculates guaranteed minimum based on passed safe havens
- Returns 0 if no safe havens passed yet, otherwise returns prize amount of last passed safe haven
- Rationale: Simplifies game logic by centralizing safe haven tracking

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MillionaireState type ready for lifeline implementations (21-02)
- MoneyTree component ready for integration into game UI
- Money tree configuration system ready for game state initialization
- Next: Implement lifeline logic (50:50, Phone a Friend, Ask the Audience)

---
*Phase: 21-millionaire-game*
*Completed: 2026-01-23*
