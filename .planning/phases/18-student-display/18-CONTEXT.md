# Phase 18: Student Display - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Display selected student's name on the student view when Targeted mode selects them. The banner shows on the projected screen so the whole class sees who was called. Syncs via BroadcastChannel.

</domain>

<decisions>
## Implementation Decisions

### Banner Appearance
- Position: Top center of student view
- Size: Large & bold — visible from back of classroom
- Style: Solid background with contrasting text
- Color: Match app theme (PiPi brand colors)

### Timing Behavior
- Auto-dismiss after 3 seconds
- Animation: Slide down on entrance, fade out on exit
- Clear immediately on slide change (don't wait for timer)

### Content Format
- Text: "Question for [Name]"
- No difficulty level shown — avoid embarrassing students
- No icons or extras — just the name
- Capitalization: Use name as entered in class bank

### Edge Cases
- Long names: Shrink text to fit (auto-size font smaller)
- Empty grade level: No banner shown (silent skip)
- Manual mode: No banner (only Targeted mode shows banner)

### Claude's Discretion
- Overlap handling (new selection while banner showing)
- Exact font sizes and animation timing
- Minimum readable font size for long names

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

*Phase: 18-student-display*
*Context gathered: 2026-01-22*
