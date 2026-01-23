---
phase: 25-competition-modes
plan: 01
subsystem: game-foundation
tags: [typescript, discriminated-unions, team-names, type-system]

# Dependency graph
requires:
  - phase: 20-game-foundation
    provides: BaseGameState, discriminated union pattern
provides:
  - CompetitionMode discriminated union type
  - Team interface with UUID-based identity
  - Team name generator utility with kid-friendly vocabulary
affects: [25-02, 25-03, 25-04, 25-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [Fisher-Yates shuffle for team name randomization, in-memory word lists for instant generation]

key-files:
  created: [utils/teamNameGenerator.ts]
  modified: [types.ts]

key-decisions:
  - "Team uses UUID for stable React keys (not array index)"
  - "activeTeamIndex tracks which team's turn (managed by orchestrator)"
  - "playerName can be empty string (defaults to 'Player' in UI)"
  - "In-memory word lists (20 adjectives x 20 nouns = 400 combinations) for instant regeneration"
  - "Fisher-Yates shuffle ensures true randomness in team name generation"

patterns-established:
  - "CompetitionMode discriminated union follows existing GameState pattern (mode literal discriminant)"
  - "Team name generation uses zero dependencies (no external APIs or packages)"
  - "createTeams utility function produces ready-to-use Team objects with UUIDs"

# Metrics
duration: 1.5min
completed: 2026-01-23
---

# Phase 25 Plan 01: Type System & Team Names Summary

**CompetitionMode discriminated union with individual/team variants and zero-dependency team name generator producing kid-friendly combinations**

## Performance

- **Duration:** 1.5 min
- **Started:** 2026-01-23T20:46:00Z
- **Completed:** 2026-01-23T20:47:31Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Defined CompetitionMode type system with discriminated union matching existing GameState patterns
- Created Team interface with UUID-based identity for stable React keys
- Built team name generator with Fisher-Yates shuffle and curated kid-friendly vocabulary
- Enabled instant team name generation with 400 possible combinations (20 adjectives x 20 nouns)

## Task Commits

Each task was committed atomically:

1. **Task 1: Define CompetitionMode types** - `e5ec87f` (feat)
2. **Task 2: Create team name generator utility** - `c04c7e7` (feat)

## Files Created/Modified
- `types.ts` - Added CompetitionMode discriminated union and Team interface
- `utils/teamNameGenerator.ts` - Team name generation with shuffle algorithm and curated word lists

## Decisions Made

**1. Team identity via UUID**
- Rationale: Array indices unstable when teams reorder, UUIDs provide stable React keys

**2. activeTeamIndex in team mode config**
- Rationale: Orchestrator manages turn rotation, index tracks current team

**3. In-memory word lists instead of API/package**
- Rationale: Zero dependencies (v3.0 decision), instant generation, kid-appropriate curation

**4. Fisher-Yates shuffle for randomization**
- Rationale: True random ordering, prevents predictable patterns in team names

**5. playerName optional (can be empty string)**
- Rationale: Default to "Player" in UI when no name provided, maintains flexibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CompetitionMode types ready for integration into game setup modals
- Team name generator ready for UI consumption
- Pattern established for extending BaseGameState with competition fields (Plan 02)
- createTeams utility ready for immediate use in setup modal state

---
*Phase: 25-competition-modes*
*Completed: 2026-01-23*
