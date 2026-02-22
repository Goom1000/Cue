# Phase 69: Scripted Parser - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure-function parser that extracts typed blocks (Say, Ask, Write on board, Activity) from marker-annotated lesson plans into structured ScriptedBlock objects. Handles multi-day plans with day headers and section headings as slide boundaries. No AI, no side effects — input text in, structured data out. Downstream phases (Slide Mapper, Pipeline) consume the output.

</domain>

<decisions>
## Implementation Decisions

### Marker format tolerance
- Case-insensitive matching — accept Say:, say:, SAY: — normalize to Title Case in output
- Strict canonical markers only — Say, Ask, Write on board, Activity — no abbreviations or shorthands (prompt template in Phase 73 controls input format)
- Flexible whitespace after colon — accept "Say:text", "Say: text", "Say:  text" — trim content
- Line-start only — markers recognized only at the beginning of a line to avoid false positives in natural text

### Section heading mapping
- 5 canonical headings: Hook, I Do, We Do, You Do, Plenary — these are the complete set
- Any order accepted — parser detects boundaries, doesn't enforce pedagogical sequence
- No section headings = one big section — still parse markers, just no phase labels
- Sections repeat per day — each day can have its own Hook → Plenary cycle

### Unstructured content handling
- Unmarked prose = implicit Say: block — any text without a marker is assumed to be teacher speech
- Preserve markdown formatting within blocks — parser passes through bold/italic/lists verbatim, downstream phases decide rendering
- Consecutive same-type markers stay separate — each marker instance creates its own block (preserves teacher's intentional pacing)
- Blank lines preserved within blocks (paragraph breaks), ignored between blocks (formatting whitespace)

### Day structure format
- `## Day N` format with optional title — e.g., `## Day 1` or `## Day 1: Introduction to Fractions`
- No day headers = single Day 1 default — keeps data structure consistent (always ≥1 day)
- Warn on empty days — parser succeeds but returns warnings for days with no blocks

### Claude's Discretion
- Heading level detection (which ## vs ### levels to recognize)
- Internal data structure design for ScriptedBlock
- Parsing algorithm and implementation approach
- Whitespace normalization details
- Error/warning format

</decisions>

<specifics>
## Specific Ideas

- Input is expected to come from Claude-generated output using a copyable prompt template (Phase 73), so format will be fairly consistent
- Parser should be a pure function — no side effects, easily testable
- Success criteria require accurate block counts per day for multi-day plans
- Multi-line Say: blocks (paragraphs after a single marker) must be captured in full, not truncated at line end

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 69-scripted-parser*
*Context gathered: 2026-02-19*
