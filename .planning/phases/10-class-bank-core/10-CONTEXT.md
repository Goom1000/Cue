# Phase 10: Class Bank Core - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can save and load student lists that persist across all presentations. Classes are stored in localStorage and available on any presentation on the same device. Managing classes (rename, edit, delete) belongs in Phase 11.

</domain>

<decisions>
## Implementation Decisions

### Save experience
- Save button positioned next to student list input area
- Clicking save opens a popup/modal prompting for class name
- Toast notification confirms successful save ("Class saved!")
- Save button disabled when student list is empty (require at least 1 student)

### Load experience
- Load button positioned next to Save button (grouped together)
- Clicking load opens a dropdown menu showing all saved classes
- Each dropdown item shows: class name + student count (e.g., "Period 1 Math (24 students)")
- Load button disabled with tooltip when no saved classes exist ("No saved classes")

### Class naming
- Name input starts blank (no default suggestion)
- No character or length limits on class names
- Empty/whitespace-only names not allowed (save button disabled until valid name)
- Duplicate names prompt confirmation: "A class with this name exists. Replace it?"

### Loading behavior
- Loading a class replaces existing students entirely (no merge)
- If unsaved students exist, confirm before replacing: "You have students not saved. Load anyway?"
- Toast notification confirms load: "Loaded [Class Name]"
- Active class indicator shows near student list after loading (e.g., "Period 1 Math")

### Claude's Discretion
- Exact popup/modal styling and animations
- Toast notification duration and positioning
- Icon choices for Save/Load buttons
- Active class indicator styling

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-class-bank-core*
*Context gathered: 2026-01-20*
