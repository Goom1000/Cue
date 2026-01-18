# Phase 2: Snap-to-Grid & Persistence - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Preview window remembers its position and size across sessions, and can optionally snap to grid positions during drag. Toggle enables/disables snap mode. Position is saved per-presentation.

</domain>

<decisions>
## Implementation Decisions

### Snap behavior
- Magnetic snap — free drag, but preview "pulls" to nearest grid point when close
- Medium grid size (50-60px) for balance of precision and simplicity
- Grid lines appear while dragging with snap enabled
- Snap affects both position AND resize (size snaps to grid increments)

### Toggle UI
- Toggle button lives on the preview window itself (not main toolbar)
- Button is always visible (not hover-to-reveal like resize handles)
- Color change indicates state (same icon, blue=on, gray=off)
- Button positioned in top-right corner of preview window

### Persistence scope
- Saves position + size + snap toggle state (full preview state)
- Saves on session end (not on every change)
- Per-presentation storage (each presentation remembers its own layout)

### Edge cases
- If saved position is off-screen after resize: auto-adjust to keep visible, staying as close to original position as possible
- If saved size exceeds viewport: clamp to maximum allowed size
- No explicit reset button needed — user can just drag wherever they want
- Grid lines show full grid; edge magnetism from Phase 1 handles boundary constraints

### Claude's Discretion
- Storage mechanism (localStorage vs alternative)
- Exact grid line styling and opacity
- Animation/transition timing for snap effect
- Exact magnetic pull threshold distance

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-snap-to-grid-persistence*
*Context gathered: 2026-01-18*
