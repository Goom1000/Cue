# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Students see only the presentation; teachers see the teleprompter script that lets them sound knowledgeable and natural.
**Current focus:** v4.1 Script Mode -- Phase 62 PPTX Export

## Current Position

Phase: 62 of 64 (PPTX Export) -- In progress
Plan: 1 of 1 in current phase
Status: In progress
Last activity: 2026-02-08 -- Completed 62-01-PLAN.md (script-mode PPTX export)

Progress: [███░░░░░░░] 3/8 plans (v4.1)

## Performance Metrics

**Velocity:**
- Milestones shipped: 22 (v1.0 through v4.0)
- Total phases completed: 61
- Total plans completed: 213
- Total LOC: ~31,000 TypeScript

**Recent Milestones:**
- v4.0: 6 phases, 18 plans, 21 days (2026-02-07) - Clipboard Builder
- v3.9: 4 phases, 8 plans, 14 days (2026-02-01) - Delay Answer Reveal

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full history.
Recent decisions affecting current work:

- [v4.1 Research]: Zero new dependencies -- PptxGenJS 3.12.0 (CDN), jsPDF, html2canvas, existing AI providers
- [v4.1 Research]: Transform-then-export pipeline -- temporary ScriptSlide in memory, never mutate original deck
- [v4.1 Research]: Batched AI calls (5-8 slides per request) for cross-slide context and token safety
- [61-01]: Verbosity fallback chain locked: verbosityCache[activeLevel] -> speakerNotes -> skip
- [61-01]: Bold key terms, flat bullets (no sub-bullets) for PPTX/PDF rendering compatibility
- [61-01]: Chunking threshold of 20 slides with prior-chunk summaries for tone continuity
- [61-01]: [Discussion point], [Activity], [Question], [Answer] cue marker format for interaction hints
- [61-02]: Temperature 0.7 for transformation (creative delivery text, not analytical)
- [61-02]: Sequential chunk iteration for cross-chunk context coherence (not parallel)
- [61-02]: No JSON sanitization needed for Claude (tool_use returns parsed JSON)
- [62-01]: Separate exportScriptPptx function (not parameterized exportToPowerPoint) -- different layout concerns
- [62-01]: White background for script-mode readability, originalPastedImage priority for thumbnail source

### Pending Todos

See `.planning/todos/pending/` - run `/gsd:check-todos` to review.
Notable: Slide Editor canvas mode (2026-02-07) for composing images on pasted slides.

### Blockers/Concerns

- PDF approach decision (jsPDF native text vs html2canvas rasterize) deferred to Phase 64 planning

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 62-01-PLAN.md (script-mode PPTX export), ready for Phase 63 (Share Modal UI)
Resume file: .planning/ROADMAP.md

---
*State initialized: 2026-01-18*
*Last updated: 2026-02-08 -- completed 62-01 script-mode PPTX export*
