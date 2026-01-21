# Phase 16: Question Enhancement - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

AI-generated questions include expected answers visible only to teachers. Five difficulty buttons (A/B/C/D/E) trigger generation of difficulty-appropriate questions with answers for the teleprompter. Student view never sees the answer.

</domain>

<decisions>
## Implementation Decisions

### Answer Format
- Full sample answer with key points bolded within the text
- Length is adaptive — simple questions get short answers, complex ones get more detail
- Answer appears directly below the question in the teleprompter (same area, not separate panel)

### Difficulty Mapping
- Difficulty based on cognitive depth (Bloom's taxonomy style): A=analysis/synthesis, E=recall
- AI is slide-aware — references current slide content to generate relevant questions
- Track asked questions per session to avoid repeats
- If no slide content available (image-only), fall back to lesson context from previous slides

### Button Design
- Buttons in toolbar area (near existing controls)
- Labels: letters only (A B C D E) — compact, matches grade system
- Color gradient: A=red/orange through E=green for visual difficulty signal

### Generation Behavior
- Generate on button click (not pre-generated)
- Click same button again to regenerate a new question
- Manual dismiss available (X button), also auto-clears on slide change

### Claude's Discretion
- Loading state feedback while AI generates
- Error handling approach for API failures
- Exact toolbar positioning and spacing
- Specific color values for gradient

</decisions>

<specifics>
## Specific Ideas

- Color gradient should feel intuitive: harder = warmer (red/orange), easier = cooler (green)
- Question tracking is per-session, not persisted — fresh start each presentation
- Answer bolding should highlight the key terms/concepts the teacher is listening for

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-question-enhancement*
*Context gathered: 2026-01-21*
