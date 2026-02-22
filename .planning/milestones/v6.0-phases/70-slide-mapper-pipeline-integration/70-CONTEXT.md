# Phase 70: Slide Mapper + Pipeline Integration - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert parsed ScriptedBlock[] (from Phase 69) into valid Cue Slide[] objects with correct field mapping, enforce the teleprompter segment count invariant, and wire a `scripted` generation mode into the pipeline that bypasses all three AI passes. Existing Fresh/Refine/Blend modes must be unaffected.

</domain>

<decisions>
## Implementation Decisions

### Slide density & grouping
- Split slides on Ask: and Activity: blocks (interaction points) — consecutive Say/Write blocks group together on the same slide
- Section headings (## Hook, ### I Do, etc.) always create a new slide boundary
- Maximum content bullets per slide: as many as visually fit on the slide without overflowing. Auto-split to a continuation slide if content would go off-screen
- Short single-sentence Activity: blocks are absorbed as a content bullet on the current slide rather than spawning a separate work-together slide. Substantial multi-step activities get their own work-together slide

### Content bullet treatment
- Ask: and Write on board: blocks both become plain-text content[] bullets — no labels, no "Q:" or "Board:" prefixes
- Scripted slide content bullets match the visual style of existing AI-generated Cue slides
- One content bullet per Ask: block — multi-sentence questions are not split into separate bullets
- hasQuestionFlag is metadata only — no visual indicator on the slide from the mapper (existing teachable moment system handles question detection at presentation time)

### Activity slide content
- Substantial Activity: blocks produce work-together typed slides with activity instructions parsed into content[] bullets (step-by-step)
- Short single-sentence Activity: blocks are absorbed into the preceding slide as a regular content bullet
- Full activity facilitation text goes into speakerNotes for the teleprompter

### Teleprompter script flow
- Say: text maps to the segment BEFORE the next content bullet reveal — "say this, then show that" pattern
- Multiple consecutive Say: blocks before a single content bullet merge into one segment with paragraph breaks (\n\n) preserved between them
- Empty segments are acceptable — if no Say: block precedes a content bullet, that segment is empty. Respects the lesson plan as written
- Trailing Say: blocks (after the last content bullet on a slide) fill the final segment — they wrap up the current slide's context

### Claude's Discretion
- Continuation slide titling (same title vs "(cont.)" suffix)
- Implicit Say: block treatment (identical to explicit vs flagged)
- Timer/duration detection from Activity: block text
- Short vs substantial Activity: threshold heuristic (single line vs multi-line, or character count — Claude picks)
- Exact content bullet overflow threshold for auto-splitting

</decisions>

<specifics>
## Specific Ideas

- Slide grouping should mirror natural teaching flow: teacher says something, then reveals a bullet, says more, reveals the next bullet
- The teleprompter segment mapping (Say → segment before reveal) is the core value proposition of scripted import — get this right and the presenting experience feels like reading from a prepared script
- Content appearance should be indistinguishable from AI-generated slides so teachers can mix scripted and AI modes within a presentation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 70-slide-mapper-pipeline-integration*
*Context gathered: 2026-02-21*
