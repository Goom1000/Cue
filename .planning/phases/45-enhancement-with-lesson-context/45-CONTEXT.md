# Phase 45: Enhancement with Lesson Context - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

AI enhances uploaded resources (worksheets, handouts) while preserving original content and aligning with lesson slides. Generates three differentiation levels (simple/standard/detailed) plus answer keys. Preview and editing UI is Phase 46's domain.

</domain>

<decisions>
## Implementation Decisions

### Differentiation behavior
- Generate all three levels (simple/standard/detailed) in one operation
- **Simple:** Reduce text length + simplify vocabulary (shorter sentences, simpler words, same exercises)
- **Standard:** Light enhancement (clean up formatting, clarify wording) + lesson alignment (add slide concept references)
- **Detailed:** Extensions + scaffolding + deeper explanations (harder questions, hints/worked examples, reasoning prompts)

### Lesson alignment approach
- AI auto-detects which slides the resource relates to (teacher doesn't manually select)
- Show matched slides to teacher BEFORE enhancement begins for confirmation
- Echo slide concepts/terminology in enhanced content
- Add explicit slide number references (e.g., "See Slide 5")
- Slide number labeling appears in header/footer area of generated resources
- Each differentiated worksheet clearly marked with which slide(s) it aligns with

### Answer key generation
- Generate answer keys from the enhanced versions (not original)
- For open-ended exercises: provide rubric/marking criteria instead of specific answers
- Claude's discretion on whether to generate one master key or one per differentiation level (depends on content divergence)

### Enhancement UI flow
- After analysis completes: show configuration step (matched slides + settings)
- Teacher reviews matches, adjusts if needed, clicks 'Enhance'
- Simple progress bar during processing (no step-by-step status)
- Cancel button visible throughout, returns to pre-enhancement state immediately
- After completion: results appear in sidebar, teacher stays in editor context

### Claude's Discretion
- Exact progress bar implementation
- Answer key structure (unified vs per-level)
- How to surface slide matches in confirmation UI
- Error handling and retry behavior

</decisions>

<specifics>
## Specific Ideas

- Resources must be labeled/numbered so teachers know which slide they align with when printed
- "Worksheet 1 aligns with Slide 9" type clarity is essential for classroom use
- Teacher should be able to print differentiated worksheets and know exactly where they fit in the lesson

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 45-enhancement-with-lesson-context*
*Context gathered: 2026-01-30*
