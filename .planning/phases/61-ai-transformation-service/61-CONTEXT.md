# Phase 61: AI Transformation Service - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

AI converts teleprompter scripts into expanded, self-contained talking-point bullets suitable for a colleague to read aloud and deliver to students. This phase builds the transformation service only — no UI (Phase 63), no export formats (Phases 62/64).

</domain>

<decisions>
## Implementation Decisions

### Bullet Output Shape
- Bullet count is flexible by content — AI decides based on how much material the slide has (some slides get 3, others get 7)
- Tone must be student-facing and deliverable — these are the actual words the colleague says to students, matching the tone of the current app slides (not teacher notes *about* teaching)
- Each bullet should be 2-4 sentences — enough context that the colleague doesn't need to improvise
- Interaction cues (e.g., "Ask students what they think") should be converted to hints like "[Discussion point: X]" — signal the activity without prescribing how to run it

### Teaching Content Fidelity
- Slides with no teleprompter content at all are skipped entirely — not included in the transformation output

### Claude's Discretion
- Whether to bold key terms or use sub-bullets (pick formatting that works well in both PPTX and PDF export)
- Whether to preserve examples/analogies verbatim or rephrase for clarity in bullet form
- Whether thin-content slides should be expanded or kept brief (judge intent)
- Whether to add light transitions between slides or just avoid repetition (pick what reads best)
- How to handle Work Together and Class Challenge slides (make activities deliverable by a colleague)
- How to handle answer-reveal slides (combine question+answer or keep as separate slide bullets)

### Verbosity Resolution
- Always use the deck's active verbosity setting as input for transformation
- Use the deck's current AI provider (same one that generates teleprompter content)

### Claude's Discretion (Verbosity)
- Fallback chain when the active verbosity level hasn't been generated yet for a slide
- Whether the service should be level-aware (adjusting expansion based on input verbosity) or treat text as opaque input

</decisions>

<specifics>
## Specific Ideas

- Bullets are meant to be read aloud to students — the colleague is delivering the lesson, not reading teacher notes
- The "Share with Colleague" concept means: give someone everything they need to deliver this lesson without having used the app

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 61-ai-transformation-service*
*Context gathered: 2026-02-08*
