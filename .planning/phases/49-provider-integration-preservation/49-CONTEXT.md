# Phase 49: Provider Integration and Preservation - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate the detection patterns and preservation rules from Phase 48 into Claude and Gemini providers. Preserved questions and activities appear verbatim on slides and with delivery context in teleprompter. Works across all three generation modes (Fresh, Refine, Blend).

</domain>

<decisions>
## Implementation Decisions

### Slide Verbatim Behavior
- No visual distinction between preserved and AI-generated content — students shouldn't know what was teacher-written
- Keep preserved content verbatim even if long — preserve teacher's exact wording regardless of slide density
- Substantial preserved items (questions, activities) get their own dedicated slide; small instructions can share slides with other content

### Teleprompter Delivery Context
- Minimal cue before preserved questions: "Ask the class:" or "Pose this question:" followed by exact question
- Include brief transition before preserved activities: "Now let's do an activity. [exact instruction]" — framing only, no timing/management tips
- Always include preserved content in teleprompter, even if slide already shows it — consistency over brevity

### Mode-Specific Handling
- Same detection and preservation behavior across all three modes (Fresh/Refine/Blend)
- In Blend mode with conflicting sources, lesson plan wins — it's the authoritative source; PowerPoint is supplementary
- In Refine mode, only preserve high-confidence detections — clear questions (ending in ?) and explicit activities
- Questions under explicit headings treated same as inline questions — a question is a question

### Edge Cases
- Skip ambiguous detections — only preserve clear-cut questions and activities, err on side of not over-preserving
- When many items detected (15+), AI uses judgment to select best items for slide deck quality — can consolidate or be selective based on context
- Overlapping classification (both question AND activity) handled by Claude based on context

### Claude's Discretion
- Format of structured content (numbered steps vs bullets) based on slide layout
- Whether teleprompter visually distinguishes preserved content — whatever makes script most readable
- Classification when content is both question and activity
- Handling of placeholders like '[student name]' — keep or generalize based on context

</decisions>

<specifics>
## Specific Ideas

- User emphasized AI intelligence for quantity decisions: "it could think about pulling them into one question, just using its intelligence and contextual understanding"
- Core value maintained: students see only the presentation; teachers see the teleprompter script

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 49-provider-integration-preservation*
*Context gathered: 2026-02-01*
