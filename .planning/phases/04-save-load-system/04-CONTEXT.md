# Phase 4: Save/Load System - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

User can export presentations to downloadable .pipi files and load them back. Auto-save protects against data loss with crash recovery. This phase covers save/load mechanics and file format — cloud sync and sharing are separate concerns.

</domain>

<decisions>
## Implementation Decisions

### Save workflow
- Save button in header AND menu option for discoverability
- Always prompt for filename before download (no silent auto-naming)
- Toast notification only after save completes (no spinner during save)
- 50MB size warning: show warning toast but still allow the save

### Load experience
- Both file picker AND drag-drop supported
- No visible drop zone — drop anywhere on window, just works
- Always warn before loading: "You have unsaved changes. Continue?"
- Load errors shown as toast with reason explaining what went wrong

### Auto-save behavior
- Subtle indicator (small flash/icon) after auto-save, not persistent status
- On crash recovery: modal asking "Restore or start fresh?"
- "Start fresh" means empty presentation (clear everything)

### File format
- Rich metadata: content + version + created/modified dates + title + author + notes
- Images embedded as base64 (fully portable)
- Older format files: notify and upgrade ("This file was upgraded from older format")

### Claude's Discretion
- Auto-save architecture (same storage with flag vs separate backup)
- File format choice (plain JSON vs compressed) based on typical sizes
- Auto-save frequency/triggers
- Exact toast styling and duration

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

*Phase: 04-save-load-system*
*Context gathered: 2026-01-19*
