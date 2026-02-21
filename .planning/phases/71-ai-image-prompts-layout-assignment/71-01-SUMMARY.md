---
phase: 71-ai-image-prompts-layout-assignment
plan: 01
subsystem: ai, pipeline
tags: [gemini, claude, structured-output, image-prompts, layout-assignment, scripted-import]

# Dependency graph
requires:
  - phase: 70-slide-mapper-pipeline-integration
    provides: scripted mode early-return in generationPipeline.ts with mapBlocksToSlides producing slides with empty imagePrompt
provides:
  - enrichScriptedSlides method on AIProviderInterface and both provider implementations
  - Batch AI enrichment of scripted slides with imagePrompt, layout, and theme per slide
  - Graceful fallback with synthesized prompts from slide titles and first bullets on AI failure
  - Layout lock protection preventing AI from overriding mapper-assigned layouts (work-together, class-challenge)
  - Shared buildEnrichmentPrompt utility in aiProvider.ts used by both providers
affects: [72-day-selection, future-image-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [batch-enrichment-with-fallback, layout-lock-merge-protection, shared-prompt-builder]

key-files:
  created: []
  modified:
    - services/aiProvider.ts
    - services/providers/geminiProvider.ts
    - services/providers/claudeProvider.ts
    - services/generationPipeline.ts

key-decisions:
  - "Shared buildEnrichmentPrompt in aiProvider.ts prevents prompt drift between providers"
  - "Layout lock check duplicated in both prepareEnrichmentInputs (prompt hint) and mergeEnrichmentResults (defense in depth)"
  - "Partial success merges valid results then applies fallback for remaining, maximizing AI value"
  - "Theme assignment included in batch call (adds ~10 tokens per slide, free latency cost)"

patterns-established:
  - "Batch enrichment pattern: prepare inputs -> call provider -> validate results -> merge with lock protection -> fallback on failure"
  - "Shared prompt builder exported from aiProvider.ts for cross-provider consistency"

requirements-completed: [PIPE-03, PIPE-04]

# Metrics
duration: 3min
completed: 2026-02-21
---

# Phase 71 Plan 01: AI Image Prompts + Layout Assignment Summary

**Batch AI enrichment of scripted slides with image prompts, layout assignments, and theme colors via shared prompt builder, with three-tier fallback on failure**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-21T02:00:55Z
- **Completed:** 2026-02-21T02:04:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Both Gemini and Claude providers implement enrichScriptedSlides() with structured output schemas (responseSchema and tool_use respectively)
- Pipeline scripted mode block enriches slides after mapBlocksToSlides() with try/catch fallback ensuring imports never fail
- Layout lock protection in mergeEnrichmentResults prevents AI from overriding work-together/class-challenge layouts
- Shared buildEnrichmentPrompt utility in aiProvider.ts ensures consistent prompts across providers
- Three-tier fallback: full success, partial success (valid results merged + fallback for invalid), total failure (all synthesized)
- All 76 existing parser/mapper tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add enrichment types and implement enrichScriptedSlides in both providers** - `b1dba01` (feat)
2. **Task 2: Wire enrichment into pipeline scripted block with fallback and merge logic** - `efc8075` (feat)

## Files Created/Modified
- `services/aiProvider.ts` - SlideEnrichmentInput/Result types, buildEnrichmentPrompt shared utility, enrichScriptedSlides on AIProviderInterface
- `services/providers/geminiProvider.ts` - ENRICHMENT_RESPONSE_SCHEMA constant, enrichScriptedSlides implementation using responseSchema
- `services/providers/claudeProvider.ts` - ENRICHMENT_TOOL constant, enrichScriptedSlides implementation using tool_use with direct fetch
- `services/generationPipeline.ts` - prepareEnrichmentInputs, mergeEnrichmentResults, synthesizeFallbackEnrichment helpers; enrichment wiring in scripted mode block

## Decisions Made
- Shared buildEnrichmentPrompt in aiProvider.ts prevents prompt drift between providers (same prompt format for both Gemini and Claude)
- Layout lock check duplicated in both prepareEnrichmentInputs (sends LAYOUT_LOCKED hint to AI) and mergeEnrichmentResults (ignores AI layout for locked slides) for defense in depth
- Partial success strategy: merge valid results first, then apply synthesizeFallbackEnrichment to fill remaining empty imagePrompts, maximizing value from the AI call
- Theme assignment included in the batch call alongside imagePrompt and layout (trivial token cost, already supported by Slide type)
- Claude provider uses direct fetch instead of callClaude standalone function (avoids this.model bug per RESEARCH.md Pitfall 5)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scripted slides now receive AI-generated image prompts, layouts, and themes after import
- Image generator (generateSlideImage) will consume the imagePrompt values downstream
- Day selection (Phase 72) can proceed independently as enrichment operates on the full flattened block array

## Self-Check: PASSED

All 4 modified files verified present on disk. Both task commits (b1dba01, efc8075) verified in git log. TypeScript compiles cleanly. All 76 parser/mapper tests pass.

---
*Phase: 71-ai-image-prompts-layout-assignment*
*Completed: 2026-02-21*
