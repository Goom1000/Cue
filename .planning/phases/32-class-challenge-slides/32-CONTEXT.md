# Phase 32: Class Challenge Interactive Slides - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can capture live student contributions visible to projector. Teacher inputs student answers during presentation, contributions display as styled cards on the slide, and sync to student view in real-time. Contributions become read-only when navigating away (but re-unlock on return).

</domain>

<decisions>
## Implementation Decisions

### Input experience
- Input field visible on the slide itself — students see teacher typing
- Enter key submits, but also show Add button for mouse users
- Delete button appears on hover over cards — teacher can remove mistakes
- Input field auto-focuses when arriving at a Class Challenge slide

### Card display
- Flowing grid layout with padding between cards — presentable for projection
- Pop/scale-in animation when cards are added — noticeable but not distracting
- Cards shrink to fit if many contributions — all cards visible, no scrolling

### Prompt editing
- Modal/dialog for editing the challenge prompt (click edit button to open)
- Default is blank — "Click to add your challenge question"
- Option to generate prompt via AI based on surrounding slides
- Prompt can be edited anytime, including during presentation

### Read-only behavior
- No visual indicator for locked state — implicit from missing delete buttons
- Auto-unlocks when teacher navigates back — can always add more contributions
- Contributions sync to student view immediately on add (real-time)

### Teleprompter
- AI-generated facilitation tips for running the activity

### Claude's Discretion
- Card color scheme (should be distinct from teal Work Together and purple Elaborate)
- Prompt position on slide (top vs left)
- Exact modal design for prompt editing
- Facilitation tip content and format

</decisions>

<specifics>
## Specific Ideas

- Cards should have padding between them so it looks "more presented when it goes on the wall"
- Teacher should be able to write their own prompt OR let AI generate one — both options available

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 32-class-challenge-slides*
*Context gathered: 2026-01-25*
