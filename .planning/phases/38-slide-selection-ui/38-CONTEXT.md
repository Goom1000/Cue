# Phase 38: Slide Selection UI - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable teachers to select which slides to export for Working Wall display. This is a multi-select interface on existing slide thumbnails with selection controls and count feedback. Exporting the selected slides is Phase 39.

</domain>

<decisions>
## Implementation Decisions

### Selection trigger
- Checkboxes always visible on every slide thumbnail (no mode toggle)
- Checkbox positioned in top-left corner of each thumbnail
- Clicking checkbox only toggles selection (thumbnail click behavior unchanged)
- Full keyboard support: Shift+click for range select, Cmd/Ctrl+click to add/remove

### Visual feedback
- Border highlight around selected slides (not overlay or tint)
- Use app's existing accent color for the selection border
- Checkbox fills with color and shows checkmark icon when selected
- Instant state change — no animation on select/deselect

### Selection controls
- Select All and Deselect All buttons in toolbar above slide list
- Both buttons always visible (not conditional on selection state)
- Two separate buttons (not a single toggle)
- No keyboard shortcuts for Select All / Deselect All

### Count display
- Selection count displayed in toolbar (near Select All / Deselect All)
- Format: "X of Y selected" showing count and total
- When 0 selected: show prompt text "Select slides to export" instead of count

### Claude's Discretion
- Count update timing (live vs debounced)
- Exact checkbox styling details
- Border thickness and radius
- Toolbar layout and spacing

</decisions>

<specifics>
## Specific Ideas

No specific product references mentioned — standard multi-select UI patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-slide-selection-ui*
*Context gathered: 2026-01-27*
