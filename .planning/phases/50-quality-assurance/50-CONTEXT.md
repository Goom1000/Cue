# Phase 50: Quality Assurance - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate that content preservation (Phases 48-49) doesn't degrade non-preserved content quality or break existing functionality. This is validation and prompt refinement, not new feature development.

</domain>

<decisions>
## Implementation Decisions

### Test Coverage
- Subject areas: Claude's discretion — pick representative subjects that exercise the system
- Grade levels: Elementary focus (K-5), simpler vocabulary, more visual slides
- Density mix: Test both sparse (1-2 preserved elements) and dense (5+) scenarios
- Edge cases: Light coverage — a few edge cases for graceful degradation, not exhaustive

### Quality Bar
- Non-preserved content: Must match pre-preservation quality (indistinguishable)
- Preservation strictness: Core intent match — phrasing can adapt to slide context as long as meaning is preserved
- Vocabulary level: Match the selected grade level (elementary = simple)
- Slide flow: Natural transitions — preserved content should feel integrated, not jarring
- Teleprompter style: Conversational coaching ("Now ask them: [preserved question]")
- Activity guidance: Match user's deck-wide verbosity setting
- Layout compatibility: Not a priority — content preservation takes precedence
- Slide types: Spot check only — don't systematically verify pedagogical types

### Handling Failures
- Awkward flow: Refine prompts to smooth flow while preserving core intent
- Quality degradation: Iterate on prompts until quality matches baseline
- Context mismatch: AI can adapt preserved content to fit context while retaining core meaning
- Dense preservation: AI discretion — split across slides or intelligently condense, whichever serves the lesson better

### Validation Approach
- Method: Hybrid — automated checks for preservation, manual review for quality
- Test set size: Small (3-5 lesson plans)
- Mode coverage: All three modes (Fresh, Refine, Blend)
- Reviewer: Developer (you) performs manual quality review

### Claude's Discretion
- Which subjects to include in test scenarios
- Exact edge cases to test
- Automated check implementation details
- How to split or condense dense preserved content

</decisions>

<specifics>
## Specific Ideas

- Preserved content should feel integrated, not like separate "teacher says" moments
- AI should intelligently decide whether to split dense content across slides or condense it
- Quality bar is "indistinguishable from pre-preservation" for non-preserved content

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 50-quality-assurance*
*Context gathered: 2026-02-01*
