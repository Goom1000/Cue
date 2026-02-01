# Phase 53: Scaffolding Templates - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Create subject-specific scaffolding templates so AI generates appropriate guidance strategies based on content type. Math gets decomposition scaffolding, vocabulary gets context scaffolding, comprehension gets evidence scaffolding. Each scaffold prompt must be verbally deliverable in under 20 words.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User delegated all implementation choices to Claude. The following areas are open for Claude to determine based on pedagogical best practices:

**Tone & Voice:**
- Tone style (warm/encouraging vs direct/efficient vs Socratic)
- Voice approach (direct "you" vs inclusive "we" vs teacher instruction)
- Hint explicitness level (subtle to nearly explicit)
- Content specificity (reference actual problem content vs pattern-based)

**Template Flexibility:**
- Whether subjects feel distinct or follow common structure
- Number of scaffolding prompts per moment (within 2-3 guideline)
- Whether same problem types get consistent or varied scaffolding
- How multi-moment slides handle scaffolding style

**Prompt Sequencing:**
- Progression pattern (hint→guide→check, question→process→predict, notice→connect→apply)
- Whether to always invite prediction before answer reveal
- Convergent vs divergent approach based on content type
- Coverage depth for multi-step problems

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

User trusts Claude to apply pedagogical best practices for scaffolding strategies. Key constraint from roadmap: each prompt must be verbally deliverable in under 20 words.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 53-scaffolding-templates*
*Context gathered: 2026-02-01*
