# Phase 48: Detection and Rules Foundation - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Build detection patterns and prompt rules that identify preservable content (questions, activities, instructions) in lesson plans and PowerPoint input before AI processing. This is an internal service — no UI changes. Detection feeds into the AI prompt so the model knows what to preserve verbatim.

</domain>

<decisions>
## Implementation Decisions

### Question Detection Patterns
- Claude's discretion on rhetorical vs deliberate questions — determine best heuristic
- Claude's discretion on handling "Ask:" prefixes — cleanest extraction approach
- Claude's discretion on numbered question lists — individual vs grouped
- Claude's discretion on embedded questions — extract question vs preserve full instruction

### Activity Detection Patterns
- Claude's discretion on action verb categories — student actions, teacher actions, or both
- Claude's discretion on timing information — preserve vs strip for teleprompter
- Claude's discretion on grouping context ("in pairs", "whole class") — include or separate
- Claude's discretion on multi-step activities — single block vs separate items

### Detection Output Format
- Claude's discretion on markup format — XML tags, markdown markers, or other
- Claude's discretion on confidence levels — binary detection vs confidence scoring
- Claude's discretion on source location metadata — include or omit
- Claude's discretion on slide vs teleprompter output structure — unified or split

### Edge Case Handling
- Claude's discretion on ambiguous content threshold — preserve-if-uncertain vs skip-if-uncertain
- Claude's discretion on long content handling — preserve full vs truncate with indicator
- Claude's discretion on duplicate handling — preserve each vs deduplicate
- Claude's discretion on non-English support — English-only vs language-agnostic patterns

### Claude's Discretion
User delegated all implementation details for this phase. Claude has full flexibility to:
- Choose detection heuristics that work best with typical lesson plan formats
- Design output format that integrates cleanly with existing prompt architecture
- Set practical limits and thresholds based on slide/teleprompter UX
- Handle edge cases in the way that produces the best teacher experience

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude to make implementation decisions that serve the core goal: teacher-specified questions and activities appear verbatim on slides rather than being generalized.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 48-detection-and-rules-foundation*
*Context gathered: 2026-02-01*
