---
phase: 23-the-chase
plan: 03
subsystem: ui
tags: [react, typescript, countdown-timer, rapid-fire-qa, keyboard-shortcuts, chase-game, animations]

# Dependency graph
requires:
  - phase: 23-01
    provides: "useTimer hook and Timer component for countdown functionality"
provides:
  - "CashBuilderRound component with 60-second countdown and rapid question cycling"
  - "Chase-specific CSS animations (pulse, score flash, wrong flash, board move)"
  - "Keyboard shortcut support (1-4) for rapid answer selection"
affects: [23-04-head-to-head, 23-05-final-chase, 23-06-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS keyframe animations for game feedback (score flash, wrong flash)"
    - "Keyboard event handling for rapid answer input"
    - "Auto-advancing question flow with 300ms feedback delay"

key-files:
  created:
    - "components/games/the-chase/CashBuilderRound.tsx"
  modified:
    - "index.html"

key-decisions:
  - "$1000 per correct answer for Cash Builder prize pot"
  - "300ms feedback delay before next question auto-advance"
  - "Keyboard shortcuts (1-4) for rapid answer selection"
  - "Timer urgency styling activates at 10 seconds (red, pulse)"
  - "Full-screen green/red flash animations for answer feedback"

patterns-established:
  - "CashBuilderRound: 60s timer with auto-start, rapid question cycling, visual feedback"
  - "Chase animations: Subtle background flash (0.5s) for correct/wrong answers"

# Metrics
duration: 1min
completed: 2026-01-23
---

# Phase 23 Plan 03: Cash Builder Round Summary

**60-second rapid-fire Cash Builder round with keyboard shortcuts, visual feedback flashes, and $1000-per-correct scoring**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-23T10:52:46Z
- **Completed:** 2026-01-23T10:54:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created Cash Builder round component with 60-second countdown timer
- Added Chase-specific CSS animations for game feedback
- Implemented keyboard shortcuts (1-4) for rapid answer selection
- Built $1000-per-correct scoring with running total display

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CSS keyframes for Chase game animations** - `cbd6f28` (style)
2. **Task 2: Create Cash Builder round component** - `8e8e1c4` (feat)

## Files Created/Modified

**Created:**
- `components/games/the-chase/CashBuilderRound.tsx` - 60-second rapid-fire Q&A with countdown timer, $1000-per-correct scoring, keyboard shortcuts (1-4), visual feedback flashes (green correct/red wrong), auto-advancing questions with 300ms delay

**Modified:**
- `index.html` - Added Chase game animations: chasePulse (timer urgency), chaseScoreFlash (correct answer), chaseWrongFlash (incorrect answer), chaseBoardMove (position transitions)

## Decisions Made

**Scoring Structure:**
- $1000 per correct answer in Cash Builder (establishes prize pot for offer selection)
- Running score display with comma formatting for readability
- Score prominently displayed in amber color with border accent

**UX Flow:**
- 300ms feedback delay after answer selection before advancing to next question
- Visual feedback: full-screen green flash (correct) or red flash (incorrect)
- Auto-advance to next question after feedback
- Round completes when timer reaches 0 OR questions exhausted (whichever first)

**Timer Urgency:**
- Timer turns red and pulses at 10 seconds remaining (uses useTimer urgency threshold)
- Large 5xl font-mono display for clear countdown visibility
- Time format: M:SS (e.g., "1:00", "0:59", "0:10")

**Keyboard Shortcuts:**
- Keys 1-4 map to answer options (top-left, top-right, bottom-left, bottom-right)
- Enables rapid answering during 60-second countdown
- Hint displayed below answer grid: "Press 1-4 to answer quickly"

**Answer Grid Layout:**
- 2x2 grid layout for 4 answer options
- Each button shows numbered label (1-4) for keyboard reference
- Disabled during feedback animation (prevents double-answering)
- Correct answer highlights green during feedback, others dim to slate

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phases:**
- CashBuilderRound component ready for game flow integration (23-06)
- CSS animations ready for board movement and feedback states
- Timer infrastructure proven at 60-second duration

**Components built:**
- Cash Builder displays timer starting at 60 seconds ✓
- Score increments by $1000 on correct answers ✓
- Questions auto-advance after answer selection ✓
- Timer urgency styling activates at 10 seconds ✓
- Keyboard shortcuts (1-4) trigger answer selection ✓
- Round completes when timer reaches 0 or questions exhausted ✓

**Next implementations:**
- 23-04: Offer Selection phase (student voting on prize offer)
- 23-05: Head-to-Head round (board mechanics with chaser)
- 23-06: Game flow integration connecting all phases

**No blockers or concerns.**

---
*Phase: 23-the-chase*
*Completed: 2026-01-23*
