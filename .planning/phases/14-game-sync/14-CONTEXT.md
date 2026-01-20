# Phase 14: Game Sync - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Display game activity in student view with real-time state sync. When teacher opens a quiz/game, students see it. When teacher advances questions or reveals answers, students see the updates. When teacher closes the game, students return to the current slide.

</domain>

<decisions>
## Implementation Decisions

### Game display layout
- Full-screen display, game content fills entire viewport
- Identical to teacher view — same layout, styling, and information
- No branding or headers — clean display with just game content
- Slight delay (1-2 seconds) acceptable for answer reveals

### Transition behavior
- Show loading state when switching from slide to game ("Loading game...")
- Show loading state when returning from game to slide ("Returning to presentation...")
- Brief loading duration (0.5-1 second) to indicate mode change
- Loading should feel like a clear mode switch, not a wait

### State sync timing
- Investigate current slide sync mechanism (BroadcastChannel or Firebase)
- Use whatever sync approach works best for game requirements
- Consistency with existing architecture not required if better solution exists

### Error handling
- Show error message if game data fails to load ("Unable to load game" with refresh option)

### Claude's Discretion
- Question-to-question transitions within a game (subtle indicator vs instant)
- Latency handling (brief stale state vs show syncing)
- Sync status indicator (visible or hidden)
- Reconnection behavior when connection drops mid-game
- Late-join behavior when student opens view mid-game
- Debouncing rapid teacher switches between game and slides

</decisions>

<specifics>
## Specific Ideas

- Game should feel seamless — students just see what teacher is presenting
- Loading states create intentional pause, help students recognize mode changed
- Full-screen maximizes visibility in classroom setting

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-game-sync*
*Context gathered: 2026-01-20*
