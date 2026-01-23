# Phase 23: The Chase - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Students play The Chase with multi-phase gameplay and timer-based rounds. Includes Cash Builder (60-second rapid-fire), Head-to-Head chase on 7-step board, offer selection, and Final Chase with pushback mechanic. AI-controlled or manual chaser options.

</domain>

<decisions>
## Implementation Decisions

### Game Board Visuals
- Vertical orientation (TV style) - chaser starts at top, home at bottom
- Icons/avatars for position markers - person icon for contestant, predator silhouette for chaser
- No labels on steps - clean look, positions understood from icons
- Slide animation for movement (300-500ms) when moving down steps

### Offer System
- Three offers displayed side by side horizontally
- Teacher manually sets offer values (not calculated from Cash Builder)
- Steps number badge on each offer card showing position difference (e.g., "+2 steps", "-1 step")
- Class votes to select offer (requires voting UI with majority wins)

### Chaser Behavior
- AI controlled by default
- Difficulty via accuracy percentage: Easy = 60%, Medium = 75%, Hard = 90%
- Chaser answer revealed after contestant locks in (not simultaneous)
- Brief thinking pause (1-2 seconds) before chaser answers

### Final Chase Mechanics
- Pushback is steps-based (correct answers push chaser back 1 step)
- Head start based on Head-to-Head performance (dynamic, not fixed)
- Timed rounds structure: contestant gets 2 minutes, then chaser gets 2 minutes
- Wrong chaser answers become pushback opportunities - if contestant answers same question correctly, chaser pushed back 1 step

### Claude's Discretion
- Exact icon designs for contestant/chaser
- Cash Builder timer UI styling
- Animation easing curves
- Vote counting UI implementation
- How to calculate head start from Head-to-Head performance

</decisions>

<specifics>
## Specific Ideas

- Movement should feel satisfying with slide animation
- Voting should be quick and visible to whole class
- Chaser "thinking" pause adds tension before reveal

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 23-the-chase*
*Context gathered: 2026-01-23*
