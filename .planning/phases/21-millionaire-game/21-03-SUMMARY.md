---
phase: 21-millionaire-game
plan: 03
subsystem: games
tags: [millionaire, lifelines, gemini, ai, game-mechanics]

# Dependency graph
requires:
  - phase: 21-02
    provides: Millionaire question display and core game flow
provides:
  - Functional 50:50 lifeline that eliminates 2 wrong answers
  - Ask the Audience lifeline with difficulty-scaled poll percentages
  - Phone-a-Friend lifeline with AI-generated natural hints
  - LifelinePanel component with used/available states
  - Overlay components for displaying lifeline results
affects: [21-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [AI-generated game hints, difficulty-based probability distribution]

key-files:
  created:
    - components/games/millionaire/LifelinePanel.tsx
    - components/games/millionaire/AudiencePollOverlay.tsx
    - components/games/millionaire/PhoneAFriendOverlay.tsx
  modified:
    - services/geminiService.ts
    - components/games/MillionaireGame.tsx
    - components/games/GameContainer.tsx
    - components/PresentationView.tsx

key-decisions:
  - "50:50 eliminates exactly 2 of 3 wrong answers randomly (preserves correct answer)"
  - "Audience poll percentages scale with difficulty: 60-80% correct for early questions, 25-35% for late questions"
  - "Phone-a-Friend AI genuinely reasons about questions (not given correct answer) for realistic gameplay"
  - "AI response varies style randomly (confident, reasoning, elimination, uncertain) with ~15% intentional errors"
  - "Lifeline data persists in state after overlay dismissal for student view synchronization"

patterns-established:
  - "Difficulty-based probability distribution: question progress determines audience confidence levels"
  - "AI hint generation: natural phone conversation style with confidence indicators"
  - "Overlay dismissal pattern: close UI but keep data in state for cross-window sync"

# Metrics
duration: 4min
completed: 2026-01-23
---

# Phase 21 Plan 03: Millionaire Lifeline Implementations Summary

**All three classic Millionaire lifelines functional: 50:50 eliminates options, Ask the Audience shows difficulty-scaled polls, Phone-a-Friend generates AI hints with varied confidence**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-23T07:56:59Z
- **Completed:** 2026-01-23T08:01:26Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Three lifeline components with polished UI matching Millionaire blue/purple theme
- 50:50 lifeline randomly eliminates 2 wrong answers while preserving correct answer
- Ask the Audience generates realistic poll data scaled to question difficulty
- Phone-a-Friend uses Gemini AI to generate natural, varied hints with confidence levels
- All lifelines integrate seamlessly into game flow with proper state management

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LifelinePanel and overlay components** - `e37c871` (feat)
2. **Task 2: Add Phone-a-Friend AI generation to geminiService** - `7845e70` (feat)
3. **Task 3: Integrate lifelines into MillionaireGame and PresentationView** - `3b4ab68` (feat)

## Files Created/Modified

### Created
- `components/games/millionaire/LifelinePanel.tsx` - Row of 3 circular lifeline buttons with icons, available/used states, loading spinner for Phone-a-Friend
- `components/games/millionaire/AudiencePollOverlay.tsx` - Bar chart display with animated percentages, highest bar highlighted in amber
- `components/games/millionaire/PhoneAFriendOverlay.tsx` - Speech bubble overlay with confidence indicator and AI response text

### Modified
- `services/geminiService.ts` - Added generatePhoneAFriendHint function with PhoneAFriendResponse interface, natural conversation prompts
- `components/games/MillionaireGame.tsx` - Imported lifeline components, added overlay state, replaced placeholder UI with LifelinePanel, conditionally render overlays
- `components/games/GameContainer.tsx` - Added onMillionaireUseLifeline and isLifelineLoading props, passed to MillionaireGame
- `components/PresentationView.tsx` - Implemented handleUseLifeline with 50:50 logic, audience poll generation, and async Phone-a-Friend AI call

## Decisions Made

**50:50 elimination logic:**
- Randomly selects 2 of 3 wrong answers to eliminate
- Uses shuffled wrong indices to ensure randomness
- Correct answer never eliminated

**Audience poll difficulty scaling:**
- Question progress (currentQuestionIndex / total) determines difficulty tier
- Easy questions (0-30%): 60-80% audience votes for correct answer
- Medium questions (30-70%): 40-55% correct
- Hard questions (70-100%): 25-35% correct
- Remaining percentage distributed randomly among wrong answers

**Phone-a-Friend AI behavior:**
- AI does NOT receive correct answer - genuinely reasons about question
- Varies response style: confident, reasoning, elimination, uncertain
- ~15% intentional errors for realism
- Confidence level (high/medium/low) assigned randomly
- Responses limited to <50 words (timed call simulation)
- Fallback error handling for network issues

**Lifeline data persistence:**
- eliminatedOptions, audiencePoll, phoneHint stored in MillionaireState
- Data persists after overlay dismissal for student view sync
- Overlays can be reopened by re-setting local showAudiencePoll/showPhoneHint state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

All three Millionaire lifelines complete and functional. Ready for Plan 04 (final integration and polish).

- 50:50 visually removes wrong options
- Ask the Audience displays realistic, difficulty-appropriate poll data
- Phone-a-Friend provides helpful AI hints with natural conversation style
- Lifeline state properly synchronized between teacher and student views
- Each lifeline can only be used once per game

---
*Phase: 21-millionaire-game*
*Completed: 2026-01-23*
