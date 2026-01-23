---
phase: 22-ai-integration
plan: 04
subsystem: integration
tags: [millionaire, game-launch, retry-logic, slide-context]

# Dependency graph
requires:
  - phase: 22-02
    provides: GeminiProvider.generateGameQuestions with progressive difficulty
  - phase: 22-03
    provides: ClaudeProvider.generateGameQuestions with progressive difficulty
provides:
  - buildSlideContext helper function for cumulative slide content
  - withRetry helper function for auto-retry with exponential backoff
  - Millionaire game launch using generateGameQuestions API
affects: [23-the-chase, 24-beat-the-chaser]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exponential backoff retry pattern for transient AI failures"
    - "Cumulative slide context for contextual question generation"
    - "Explicit generic typing for async retry wrapper"

key-files:
  created: []
  modified:
    - services/aiProvider.ts
    - components/PresentationView.tsx

key-decisions:
  - "withRetry only retries NETWORK_ERROR, RATE_LIMIT, SERVER_ERROR (not AUTH_ERROR, PARSE_ERROR)"
  - "buildSlideContext uses all slides up to and including current index for cumulative content"
  - "Millionaire passes difficulty='medium' to generateGameQuestions but it's ignored (progressive difficulty handled internally)"
  - "Empty questions array throws PARSE_ERROR to trigger user-friendly error message"

patterns-established:
  - "withRetry<T> with explicit generic parameter for TypeScript inference"
  - "Game launch flow: loading state -> build context -> generate questions -> create game state"

# Metrics
duration: 2min
completed: 2026-01-23
---

# Phase 22 Plan 04: Game Question Integration Summary

**Millionaire game launch connected to generateGameQuestions API with auto-retry and cumulative slide context**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-23T09:23:21Z
- **Completed:** 2026-01-23T09:25:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added buildSlideContext helper to build cumulative slide content for question generation
- Added withRetry helper with exponential backoff for transient AI failure handling
- Updated launchMillionaire to use provider.generateGameQuestions instead of generateImpromptuQuiz
- Slide context includes all slides from start through current index
- Auto-retry 3 times with 1s/2s/4s delays for NETWORK_ERROR, RATE_LIMIT, SERVER_ERROR
- Non-retryable errors (AUTH_ERROR, PARSE_ERROR) fail immediately

## Task Commits

Each task was committed atomically:

1. **Task 1: Add buildSlideContext and withRetry helpers** - `3b58af0` (feat)
2. **Task 2: Update launchMillionaire to use generateGameQuestions** - `b042b34` (feat)

## Files Created/Modified
- `services/aiProvider.ts` - Added buildSlideContext and withRetry helper functions
- `components/PresentationView.tsx` - Updated imports and launchMillionaire function

## Decisions Made
- withRetry only retries transient errors (NETWORK_ERROR, RATE_LIMIT, SERVER_ERROR) - auth and parse errors fail immediately
- buildSlideContext creates cumulative content from slides[0] through slides[currentIndex]
- Millionaire passes difficulty='medium' but this is ignored by generateGameQuestions (uses internal progressive difficulty based on question count)
- Added explicit generic typing `withRetry<QuizQuestion[]>` for TypeScript inference

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript inference issue with withRetry generic**
- **Issue:** TypeScript couldn't infer the return type `T` from the operation parameter
- **Solution:** Added explicit generic parameter `withRetry<QuizQuestion[]>` at call site
- **Impact:** None - standard TypeScript pattern for generic async wrappers

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 22 AI Integration complete
- Millionaire game now generates progressive difficulty questions from slide content
- Chase/Beat the Chaser games remain placeholders (Phase 23/24)
- buildSlideContext and withRetry helpers available for future game implementations

---
*Phase: 22-ai-integration*
*Completed: 2026-01-23*
