# Phase 44: AI Document Analysis - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

AI understands uploaded documents before enhancement begins. This phase provides the analysis foundation that Phase 45 enhancement builds upon. Uses multimodal AI (Gemini/Claude vision) per research recommendations.

Scope: Document type detection, structure identification, content extraction. Enhancement options and actual modifications are Phase 45.

</domain>

<decisions>
## Implementation Decisions

### Analysis Output
- Analysis happens silently inline with enhancement flow — no separate "analysis complete" step
- User doesn't see confidence indicators — just show findings without making teachers second-guess AI
- No confidence shown for any detected elements

### Document Classification
- User must confirm or select document type before proceeding to enhancement
- If AI can't confidently classify, present top 2-3 possibilities for user to pick
- Classification granularity and whether type affects enhancement options left to Claude's discretion

### Structure Detection
- Detect all structural elements comprehensively: questions, answers, sections, headers, images, tables, diagrams, text blocks
- Full text extraction for all detected elements (not just region identification)
- Visual content (diagrams, charts, images): preserve position and any captions, flag for manual review during enhancement — don't skip but don't try to describe contents

### Claude's Discretion
- How much detail to show in analysis display (minimal vs structured breakdown)
- Visual connection between analysis and uploaded document (text summary vs annotated preview)
- Document type granularity (broad categories vs detailed subtypes)
- Whether classification affects available enhancement options
- Internal data model structure (flat list vs hierarchical tree)

</decisions>

<specifics>
## Specific Ideas

- Analysis should feel invisible to the teacher — they upload, confirm type, proceed to enhancement
- "Preserve mode" philosophy from v3.7 decisions applies: AI understands document to preserve it, not to reimagine it
- Visual content flagged for manual review aligns with trust UI coming in Phase 46

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 44-ai-document-analysis*
*Context gathered: 2026-01-29*
