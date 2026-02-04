# Phase 55: Paste Infrastructure - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can paste slide content from PowerPoint and have it appear as a new slide in Cue. Includes keyboard shortcut (Cmd+V) and discoverable button. Does NOT include AI enhancement of pasted content (Phase 56) or image paste (Phase 57).

</domain>

<decisions>
## Implementation Decisions

### Paste Trigger Behavior
- Immediate creation — no confirmation step, slide appears instantly on paste
- Content type detection — rich HTML content (from PowerPoint) creates new slide; plain text pastes into active text field normally
- If no deck exists, paste can create a new deck with that slide (Claude's discretion on flow)

### Insertion Positioning
- Insert after currently selected slide
- If no slide is selected, append to end of deck
- Auto-select the newly pasted slide after insertion
- No insertion preview indicator needed — behavior is intuitive

### Loading Feedback
- Loading indicator appears at the insertion point in the slide list
- Paste operation is cancelable — show cancel option during processing
- Non-blocking — user can continue editing other slides while paste processes

### Paste Button Placement
- Button lives in the editor toolbar alongside other slide actions

### Claude's Discretion
- Error feedback style (toast vs inline message)
- Loading indicator visual style (skeleton vs spinner)
- Button appearance (icon only vs icon + label)
- Keyboard shortcut hint visibility
- Button disabled state behavior (browser clipboard API constraints may affect this)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches that feel native to the existing Cue editor patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 55-paste-infrastructure*
*Context gathered: 2026-02-03*
