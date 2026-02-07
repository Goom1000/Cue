---
phase: 58-deck-cohesion
plan: 01
subsystem: ai
tags: [gemini, structured-output, cohesion, teleprompter, dual-schema]

# Dependency graph
requires:
  - phase: 57-image-paste
    provides: analyzeImage method pattern, ImageCaptionResult type, pasted-image slide handling
  - phase: 56-paste-slide
    provides: SLIDE_ANALYSIS_SYSTEM_PROMPT dual-schema pattern, originalPastedImage field
provides:
  - COHESION_SYSTEM_PROMPT with teleprompter rules and pasted-image handling
  - buildCohesionUserPrompt with verbosity-aware hints
  - buildDeckContextForCohesion deck serializer (20-slide cap)
  - COHESION_RESPONSE_SCHEMA (Gemini Type) and COHESION_TOOL (Claude JSON Schema)
  - CohesionResult and CohesionChange types on aiProvider.ts
  - makeDeckCohesive on AIProviderInterface
  - GeminiProvider.makeDeckCohesive with structured responseSchema and original-data enrichment
affects: [58-02 Claude provider implementation, 58-03 cohesion UI and preview modal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deck serializer with slide-cap and speaker-notes truncation for token management"
    - "AI response enrichment with original slide data for diff display"

key-files:
  created:
    - services/prompts/cohesionPrompts.ts
  modified:
    - services/aiProvider.ts
    - services/providers/geminiProvider.ts
    - services/providers/claudeProvider.ts

key-decisions:
  - "Deck serializer caps at 20 slides with 200-char speaker notes truncation to manage tokens"
  - "AI returns slideIndex only; provider enriches with slideId and original fields for diff display"
  - "Claude provider gets stub implementation (throws PROVIDER_NOT_SUPPORTED) pending Plan 02"

patterns-established:
  - "Cohesion prompt pattern: system prompt with {VERBOSITY_RULES} placeholder filled by user prompt builder"
  - "Enrichment pattern: AI returns minimal data, provider maps back to full slide objects for UI consumption"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 58 Plan 01: Cohesion AI Infrastructure Summary

**Cohesion prompts with dual schemas (Gemini Type + Claude tool), CohesionResult types, and GeminiProvider.makeDeckCohesive with structured responseSchema and original-data enrichment**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T07:13:11Z
- **Completed:** 2026-02-07T07:16:36Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments
- Created cohesionPrompts.ts with system prompt embedding teleprompter rules, pasted-image handling, and verbosity placeholder
- Built dual schemas (Gemini responseSchema + Claude tool) following slideAnalysisPrompts.ts pattern exactly
- Deck serializer caps at 20 slides, truncates speaker notes to 200 chars, marks pasted-image slides
- CohesionResult/CohesionChange types exported from aiProvider.ts with original/proposed fields for diff display
- GeminiProvider.makeDeckCohesive enriches AI response with slideId and original field values from actual slides array

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cohesionPrompts.ts with system prompt and dual schemas** - `2271292` (feat)
2. **Task 2: Add CohesionResult types and interface method, implement Gemini makeDeckCohesive** - `ecfb76c` (feat)

## Files Created/Modified
- `services/prompts/cohesionPrompts.ts` - System prompt, user prompt builder, deck serializer, Gemini schema, Claude tool schema (239 lines)
- `services/aiProvider.ts` - CohesionChange/CohesionResult types, makeDeckCohesive on AIProviderInterface
- `services/providers/geminiProvider.ts` - makeDeckCohesive implementation with structured responseSchema and enrichment
- `services/providers/claudeProvider.ts` - Stub makeDeckCohesive (throws PROVIDER_NOT_SUPPORTED pending Plan 02)

## Decisions Made
- Deck serializer caps at 20 slides with 200-char speaker notes truncation (balances token cost with tone detection fidelity)
- AI returns only slideIndex; provider enriches with slideId and original field values (keeps AI output small, provides full context for diff UI)
- Claude provider gets a stub that throws PROVIDER_NOT_SUPPORTED rather than leaving the interface incomplete (Rule 3: unblocks TypeScript compilation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Claude provider stub for makeDeckCohesive**
- **Found during:** Task 2 (interface method addition)
- **Issue:** Adding makeDeckCohesive to AIProviderInterface caused ClaudeProvider to fail TypeScript compilation since it doesn't implement the method yet (Plan 02)
- **Fix:** Added stub method that throws AIProviderError with PROVIDER_NOT_SUPPORTED code
- **Files modified:** services/providers/claudeProvider.ts
- **Verification:** npx tsc --noEmit passes cleanly
- **Committed in:** ecfb76c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to satisfy TypeScript interface contract. No scope creep -- stub will be replaced by full implementation in Plan 02.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cohesion prompts, schemas, and types are ready for Plan 02 (Claude provider implementation)
- CohesionResult type is ready for Plan 03 (UI preview modal with diff viewer)
- buildDeckContextForCohesion is ready to be called from App.tsx

---
*Phase: 58-deck-cohesion*
*Completed: 2026-02-07*
