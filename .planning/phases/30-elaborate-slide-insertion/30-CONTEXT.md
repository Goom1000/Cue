# Phase 30: Elaborate Slide Insertion - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can insert AI-generated depth content expanding on the current slide. The Elaborate slide provides deeper understanding through examples, analogies, and application focus. Creating the slide, generating content, and displaying teleprompter guidance are in scope. Other pedagogical slide types (Work Together, Class Challenge) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Generated content scope
- Tone matches the source slide's existing tone (AI analyzes and continues it)
- Always include at least one analogy ("Think of it like...") to make concepts concrete
- Focus on application — show how to use/apply the concept in practice
- Number of examples: Claude's discretion based on topic complexity

### Insertion trigger & context
- "Elaborate" appears in the + menu between slides (same pattern as adding new slides)
- Source slide is the slide ABOVE the + button (elaborate expands on what you just passed)
- AI receives entire presentation for context coherence
- AI considers subject/grade level from presentation to adjust complexity and language

### Visual presentation
- Slide density: Claude decides based on content length (may split across 2-3 slides if substantial)
- Subtle indicator shows it's an Elaborate slide (small badge or icon)
- Mixed content format: opening context as prose, then examples as bullets or cards
- Title references source slide (e.g., "More on [Source Topic]" or "[Topic]: Going Deeper")

### Teleprompter guidance
- Script follows current verbosity level (Concise/Standard/Detailed from Phase 27)
- No special teacher notes beyond standard teleprompter script
- Standard script is sufficient for elaborate content delivery

### Claude's Discretion
- Number of examples to include (based on topic complexity)
- Whether to split elaborate content across multiple slides
- Pacing cues in teleprompter (based on content density)
- How to highlight analogies/examples in script (weave naturally vs call out explicitly)

</decisions>

<specifics>
## Specific Ideas

- Application focus is key — students should understand HOW to use concepts, not just what they are
- Analogies are important pedagogically — always include one to ground abstract concepts
- The elaborate slide should feel like a natural continuation, not an interruption

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-elaborate-slide-insertion*
*Context gathered: 2026-01-25*
