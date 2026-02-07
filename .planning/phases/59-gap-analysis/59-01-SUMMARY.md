---
phase: 59
plan: 01
subsystem: ai-infrastructure
tags: [gap-analysis, prompts, schemas, gemini, types, structured-output]
dependency_graph:
  requires: [58-cohesion]
  provides: [gap-analysis-types, gap-analysis-prompts, gemini-gap-methods]
  affects: [59-02-claude-provider, 59-03-app-integration]
tech_stack:
  added: []
  patterns: [dual-schema-prompts, multimodal-gap-analysis, topic-level-severity-ranking]
key_files:
  created:
    - services/prompts/gapAnalysisPrompts.ts
  modified:
    - services/aiProvider.ts
    - services/providers/geminiProvider.ts
decisions:
  - id: gap-severity-enum
    decision: "Three-tier severity: critical / recommended / nice-to-have"
    rationale: "Matches research spec; critical = core learning objective, recommended = supporting, nice-to-have = enrichment"
  - id: lesson-plan-truncation
    decision: "Lesson plan text capped at 8000 characters"
    rationale: "Balances completeness with token cost; most lesson plans fit; truncation note appended"
  - id: page-image-limit
    decision: "Maximum 5 page images sent as multimodal inlineData"
    rationale: "Controls token usage while still capturing visual content from lesson plan PDFs"
  - id: analysis-temperature
    decision: "analyzeGaps uses temperature 0.5 (lower than cohesion's 0.7)"
    rationale: "More consistent, deterministic analysis results for gap identification"
  - id: gap-cap
    decision: "Maximum 10 gaps per analysis"
    rationale: "Prevents overwhelming teachers; enforced in system prompt"
metrics:
  duration: 3m 10s
  completed: 2026-02-07
---

# Phase 59 Plan 01: Gap Analysis AI Infrastructure Summary

**One-liner:** Gap analysis prompts, schemas, types, and Gemini provider with multimodal lesson plan comparison and severity-ranked structured output

## Performance

| Metric | Value |
|--------|-------|
| Tasks completed | 2/2 |
| Duration | 3m 10s |
| TypeScript errors (post) | 2 (expected: claudeProvider.ts missing gap methods -- Plan 02) |
| Files created | 1 |
| Files modified | 2 |

## Accomplishments

### Task 1: Gap Analysis Prompts, Schemas, and Types

Created `services/prompts/gapAnalysisPrompts.ts` with 8 sections following the exact structure of `cohesionPrompts.ts`:

1. **GAP_ANALYSIS_SYSTEM_PROMPT** - Topic-level gap identification with severity definitions, 10-gap cap, position suggestions
2. **buildGapAnalysisUserPrompt** - User prompt with grade level, step-by-step instructions
3. **buildGapAnalysisContext** - Combines deck serialization (via `buildDeckContextForCohesion`) with lesson plan text (8000-char cap)
4. **GAP_ANALYSIS_RESPONSE_SCHEMA** - Gemini `Type`-based schema with severity enum enforcement
5. **GAP_ANALYSIS_TOOL** - Claude tool schema mirroring Gemini structure for dual-provider parity
6. **buildGapSlideGenerationPrompt** - Full slide generation from gap with teleprompter rules and verbosity hints
7. **GAP_SLIDE_RESPONSE_SCHEMA** - Gemini schema for single slide generation (title, content, speakerNotes, imagePrompt, layout)
8. **GAP_SLIDE_TOOL** - Claude tool schema mirroring slide generation structure

Added to `aiProvider.ts`:
- `GapSeverity` type: `'critical' | 'recommended' | 'nice-to-have'`
- `IdentifiedGap` interface: id, topic, description, severity, suggestedTitle, suggestedContent, suggestedPosition, relatedLessonPlanExcerpt
- `GapAnalysisResult` interface: gaps, summary, coveragePercentage
- `analyzeGaps` and `generateSlideFromGap` on `AIProviderInterface`

### Task 2: Gemini Provider Implementation

Added two methods to `GeminiProvider`:

- **analyzeGaps** - Accepts slides, lesson plan text, page images (up to 5), and grade level. Builds multimodal contents array when images available, plain text otherwise. Uses `GAP_ANALYSIS_RESPONSE_SCHEMA` with temperature 0.5. Returns `GapAnalysisResult`.
- **generateSlideFromGap** - Accepts gap, slides, lesson topic, verbosity. Builds prompt with teleprompter rules and deck context for tone matching. Uses `GAP_SLIDE_RESPONSE_SCHEMA` with temperature 0.7. Returns full `Slide` with source `{ type: 'ai-generated' }`.

Both methods follow established patterns: `GoogleGenAI` client instantiation, `responseSchema` enforcement, `wrapError` error wrapping, `console.error` logging.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Gap analysis prompts, schemas, and types | 00f34c3 | services/prompts/gapAnalysisPrompts.ts, services/aiProvider.ts |
| 2 | Gemini analyzeGaps and generateSlideFromGap | f856732 | services/providers/geminiProvider.ts |

## Files Created

| File | Purpose |
|------|---------|
| services/prompts/gapAnalysisPrompts.ts | System prompt, user prompt builder, context builder, Gemini gap schema, Claude gap tool, slide generation prompt, Gemini slide schema, Claude slide tool |

## Files Modified

| File | Changes |
|------|---------|
| services/aiProvider.ts | Added GapSeverity, IdentifiedGap, GapAnalysisResult types; added analyzeGaps and generateSlideFromGap to AIProviderInterface |
| services/providers/geminiProvider.ts | Added imports for gap analysis prompts and types; implemented analyzeGaps (multimodal) and generateSlideFromGap methods |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Three-tier severity: critical / recommended / nice-to-have | Matches research spec; allows teachers to prioritize by educational importance |
| Lesson plan text capped at 8000 chars | Balances completeness with token cost; truncation note appended for AI awareness |
| Max 5 page images as multimodal inlineData | Controls token usage while capturing visual lesson plan content |
| analyzeGaps temperature 0.5 | Lower than cohesion (0.7) for more consistent, deterministic analysis |
| Max 10 gaps enforced in system prompt | Prevents overwhelming teachers with trivial gaps |

## Deviations from Plan

None - plan executed exactly as written.

## Issues

None.

## Next Phase Readiness

**Plan 02 (Claude Provider):** Ready. The `AIProviderInterface` contract is defined. ClaudeProvider needs `analyzeGaps` and `generateSlideFromGap` implementations using `GAP_ANALYSIS_TOOL` and `GAP_SLIDE_TOOL` from `gapAnalysisPrompts.ts`.

**Plan 03 (App.tsx Integration):** Ready. Types (`GapAnalysisResult`, `IdentifiedGap`, `GapSeverity`) are exported from `aiProvider.ts`. Both provider methods are defined. The UI plan can import and use these directly.

## Self-Check: PASSED
