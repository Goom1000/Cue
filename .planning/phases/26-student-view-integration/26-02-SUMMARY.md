---
phase: 26
plan: 02
subsystem: "student-view"
tags: ["the-chase", "ui", "timers", "banners", "classroom-visibility"]

requires:
  - "26-01 (Visual Enhancement Foundation)"
  - "23-* (The Chase game implementation)"
  - "Plan 01 urgent timer animations"

provides:
  - "PhaseBanner component for phase and turn display"
  - "UrgentTimer component with screen glow urgency"
  - "Enhanced Chase student views with large timers"
  - "Turn indicators for Head-to-Head and Final Chase"

affects:
  - "26-03: Quick Quiz student view will use similar patterns"
  - "26-04: Millionaire student view enhancements"
  - "26-05: Beat the Chaser student view updates"

tech-stack:
  added: []
  patterns:
    - "Helper components for reusable UI patterns"
    - "Screen glow overlay technique (fixed inset-0 with z-index)"
    - "Conditional urgency effects based on isActive prop"
    - "Dynamic turn determination from game state"

key-files:
  created: []
  modified:
    - path: "components/StudentGameView.tsx"
      why: "Added PhaseBanner, UrgentTimer helpers and enhanced TheChaseStudentView"
      lines: "+101/-27"

decisions:
  - id: "phase-banner-positioning"
    choice: "Fixed top positioning with pointer-events-none"
    reason: "Always visible without blocking interactions"
    alternatives: "Inline phase headers (less prominent)"

  - id: "turn-banner-visibility"
    choice: "Only show turn banner when turn prop provided"
    reason: "Clean display for non-turn-based phases"
    alternatives: "Always show phase label separately"

  - id: "urgent-timer-format"
    choice: "M:SS format with text-7xl/8xl size"
    reason: "Classroom visibility from back of room"
    alternatives: "Seconds-only display (less intuitive for 2-minute timers)"

  - id: "screen-glow-timing"
    choice: "Screen glow at <=10 seconds with isActive check"
    reason: "Prevents dual glows in Final Chase when both timers low"
    alternatives: "Always show glow when <=10s (too distracting)"

  - id: "head-to-head-turn-logic"
    choice: "Determine turn from contestantAnswer and showChaserAnswer state"
    reason: "Accurate turn display during sequential gameplay"
    alternatives: "Static turn label (doesn't reflect game flow)"

metrics:
  duration: "2min"
  completed: "2026-01-23"
---

# Phase 26 Plan 02: Chase Student View Enhancement Summary

**One-liner:** Phase banners and classroom-size timers with screen glow urgency for The Chase student views

## What Was Built

### PhaseBanner Component
Reusable helper component for displaying game phase and turn information:
- **Phase label**: Amber text in slate rounded badge, always visible at top center
- **Turn banner**: Large blue/red banner showing "CONTESTANT'S TURN" or "CHASER'S TURN"
- **Positioning**: Fixed top with pointer-events-none for non-intrusive overlay
- **Animation**: Turn banner uses animate-fade-in for smooth transitions

### UrgentTimer Component
Large countdown timer with urgency visual effects:
- **Size**: text-7xl/8xl for classroom visibility from back of room
- **Format**: M:SS display for intuitive time reading
- **Urgency effects**:
  - Screen edge glow overlay (animate-urgency-glow) at <=10 seconds
  - Rapid pulse animation on timer text
  - Red color when urgent, white otherwise
- **Active control**: `isActive` prop prevents dual urgency in Final Chase when both timers low

### Enhanced TheChaseStudentView

**Cash Builder Phase:**
- PhaseBanner shows "Cash Builder" at top
- UrgentTimer replaces previous text-6xl timer
- Screen glow appears when timer reaches <=10 seconds
- Prize pot display sized consistently with timer (text-7xl/8xl)

**Head-to-Head Phase:**
- PhaseBanner shows "Head-to-Head" with dynamic turn indicator
- Turn logic:
  - Default: contestant's turn
  - If contestant answered (contestantAnswer set): chaser's turn
  - If showChaserAnswer flag: chaser's turn
- Turn banner provides clear visual feedback of game flow

**Final Chase Phases:**
- PhaseBanner shows "Final Chase" with contestant/chaser turn
- Dual UrgentTimer components replace text-4xl timers
- Active timer shows urgency effects (screen glow, pulse, red text)
- Inactive timer remains calm (white text, no glow)
- Score displays preserved above each timer

**Game Over Phase:**
- No banner needed - VICTORY/CAUGHT result is prominent enough
- Existing design already provides clear game outcome

## Implementation Notes

### Helper Component Pattern
Following 26-01 foundation, created two reusable helper components inside StudentGameView.tsx:
- **Local scope**: Components defined before main StudentGameView component
- **Type safety**: Dedicated Props interfaces for each helper
- **Reusability**: Both components can be used across multiple game types

### Turn Logic for Head-to-Head
Implemented state-based turn determination:
```typescript
let turn: 'contestant' | 'chaser' | undefined = 'contestant';
if (state.contestantAnswer !== null && !state.currentQuestionAnswered) {
  turn = 'chaser'; // Contestant answered, showing chaser's turn
} else if (state.showChaserAnswer) {
  turn = 'chaser'; // Chaser's turn to answer
}
```
This ensures accurate turn display throughout the sequential gameplay flow.

### Active Timer Control
In Final Chase, both timers are displayed but only one counts down:
```typescript
<UrgentTimer
  seconds={state.finalChaseContestantTime}
  label="Contestant"
  isActive={isContestantPhase}
/>
```
The `isActive` prop ensures only the active player's timer shows urgency effects, preventing visual overload.

## Testing Completed

✅ TypeScript compilation: `npm run build` succeeded with no errors
✅ Component definitions verified via grep searches
✅ All three Chase phases use PhaseBanner
✅ UrgentTimer properly integrated in Cash Builder and Final Chase
✅ Screen glow overlay animation class references

## Deviations from Plan

None - plan executed exactly as written.

## Known Issues

None identified.

## Next Phase Readiness

**Ready for 26-03 (Quick Quiz student view):**
- PhaseBanner and UrgentTimer patterns established
- Helper component approach proven effective
- Screen glow urgency technique available for reuse

**Blockers:** None

**Concerns:** None

## Key Learnings

1. **Helper components scale well**: Keeping PhaseBanner and UrgentTimer as local helpers maintains encapsulation while providing reusability within StudentGameView

2. **isActive prop prevents urgency overload**: Essential for dual-timer scenarios like Final Chase where both timers could be low simultaneously

3. **Turn logic complexity**: Head-to-Head required careful state analysis to determine correct turn display during sequential gameplay

4. **M:SS format improves readability**: For 2-minute timers, showing "1:45" is more intuitive than "105s"

## Future Considerations

- Consider extracting PhaseBanner and UrgentTimer to shared components if used outside StudentGameView
- Screen glow animation could support color variants (blue vs red) for player-specific urgency
- Timer format could be configurable (M:SS vs SS) based on duration range
