# Phase 11: Class Management UI - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can view, rename, edit, and delete their saved classes from the class bank. This is management of existing saved classes — saving new classes and loading classes are handled in Phase 10.

</domain>

<decisions>
## Implementation Decisions

### Access pattern
- Entry point: "Manage Classes..." option at bottom of existing load dropdown
- Opens a full centered modal
- Option only appears when there are saved classes (no empty state access)

### List presentation
- Display format: Class name + student count (e.g., "Period 1 Math (24 students)")
- Sorting: Alphabetical by class name
- Search: Filter input at top to find classes by name
- Actions: Edit and Delete icons aligned to right side of each row (always visible)

### Edit flow
- Rename: Inline edit — click name to edit directly in the row
- Changes auto-save immediately (no explicit save button)

### Delete behavior
- Confirmation: window.confirm (consistent with Phase 10 patterns)
- Message: Simple "Delete this class?" (no student count)
- Undo: Toast notification with "Undo" button after deletion

### Claude's Discretion
- Modal close behavior (backdrop click vs explicit close only)
- Student list editing UX (nested modal vs expand in place)
- Sync behavior when editing currently-loaded class
- What happens in editor when deleting currently-loaded class

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-class-management-ui*
*Context gathered: 2026-01-20*
