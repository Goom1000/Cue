# Phase 52: Prompt Engineering Core - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

AI generates slides with problem/answer split across progressive bullets and scaffolding guidance in teleprompter. Uses Phase 51's teachable moment detection as input. Problem appears first, answer on the immediately following bullet, with teacher scaffolding strategies between reveals.

</domain>

<decisions>
## Implementation Decisions

### Problem bullet presentation
- Claude's discretion on signaling style (explicit "Solve:" prompts vs natural presentation) based on content type
- Claude's discretion on math formatting (blank placeholder vs stopping before answer)
- Claude's discretion on vocabulary presentation (word only, in context, or with prompt)
- Claude's discretion on visual distinction from regular bullets

### Answer reveal style
- For vocabulary: definition only, without repeating the word (word visible above)
- Claude's discretion on whether to repeat problem context in math answers
- Claude's discretion on visual markers to signal reveals
- Claude's discretion on multi-part answer grouping vs separation

### Teleprompter scaffolding format
- **Visually separated** from regular speaker notes (clear section header or visual treatment)
- Claude's discretion on format (numbered steps, bullets, or prose)
- Claude's discretion on question prompt style (exact phrasings vs topic cues)
- Claude's discretion on tone (instructional, conversational, or script-like)

### Transition flow
- Claude's discretion on timing cues
- Claude's discretion on transition phrases before answer reveals
- Claude's discretion on multiple teachable moment sequencing
- Claude's discretion on whether scaffolding feels like a pause or blends seamlessly

### Claude's Discretion
Most presentation decisions are flexible — Claude should optimize based on content type and lesson context. The key locked decisions are:
- Vocabulary definitions appear without repeating the word
- Teleprompter scaffolding is visually separated from regular notes

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude to make content-appropriate decisions across content types (math, vocabulary, comprehension, science).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 52-prompt-engineering-core*
*Context gathered: 2026-02-01*
