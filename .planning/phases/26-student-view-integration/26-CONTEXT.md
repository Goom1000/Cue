# Phase 26: Student View Integration - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

All games display correctly on student view with proper synchronization via BroadcastChannel. Answer options remain hidden until teacher reveals, timers are visible and synchronized, and current game state is always clear (whose turn, scores, positions).

</domain>

<decisions>
## Implementation Decisions

### Answer Reveal Timing
- Answers fade in together (300-500ms) when teacher clicks reveal — no delay
- Result feedback displays briefly (1-2 seconds) before moving on
- Wrong options dim/gray out when correct answer is revealed — draws focus to correct one

### Timer Visibility
- Large, prominent timers for classroom visibility (readable from back of room)
- Timer position depends on game — each format positions timer where it fits best
- Urgency styling is dramatic: red color + rapid pulse + screen edge glow at low time
- Dual-timer games (Beat the Chaser): both timers same size, active has glow/ring highlight

### Turn/State Clarity
- Current phase shown as clear text label (e.g., "Cash Builder", "Head-to-Head") at top
- Whose turn displayed as large banner ("CONTESTANT'S TURN" / "CHASER'S TURN")
- Turn changes have smooth fade/slide transition animation

### Score Display Behavior
- Score updates are animated (numbers count up/down with brief animation)
- Active team highlighted with amber/gold glow ring (consistent with existing 25-03 implementation)
- Scores positioned in top-right corner as fixed overlay
- Scores always visible throughout entire game (all phases)

### Claude's Discretion
- The Chase game board display approach (full board vs zoomed to action)
- Exact animation durations and easing functions
- Timer positioning per game type

</decisions>

<specifics>
## Specific Ideas

- Urgency should feel intense — students should sense the pressure when timer is low
- Turn banners need to be unmissable from the back of a classroom
- Score animations add polish but shouldn't slow down game pace

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-student-view-integration*
*Context gathered: 2026-01-24*
