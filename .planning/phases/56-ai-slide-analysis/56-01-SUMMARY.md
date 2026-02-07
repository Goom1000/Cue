---
phase: 56-ai-slide-analysis
plan: 01
subsystem: ai
tags: [gemini, claude, vision-api, multimodal, structured-output, slide-analysis]

# Dependency graph
requires:
  - phase: 44-document-analysis
    provides: "Vision API patterns (analyzeDocument) for both Gemini and Claude providers"
  - phase: 55-paste-infrastructure
    provides: "Paste event handling and imageBlob extraction"
provides:
  - "analyzePastedSlide() method on AIProviderInterface"
  - "Gemini implementation using GoogleGenAI vision + responseSchema"
  - "Claude implementation using Messages API vision + tool_choice"
  - "Slide analysis prompts with Cue-specific educational context"
  - "SLIDE_RESPONSE_SCHEMA (Gemini) and SLIDE_CREATION_TOOL (Claude) structured output schemas"
affects: [56-02, paste-flow-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-image vision analysis with structured output (extends multi-page analyzeDocument pattern)"
    - "Shared prompts file with dual schema exports (Gemini Type + Claude JSON Schema)"

key-files:
  created:
    - "services/slideAnalysis/slideAnalysisPrompts.ts"
  modified:
    - "services/aiProvider.ts"
    - "services/providers/geminiProvider.ts"
    - "services/providers/claudeProvider.ts"

key-decisions:
  - "Separate slideAnalysis prompts file following documentAnalysis pattern"
  - "analyzePastedSlide returns Slide with empty id (caller provides)"
  - "temperature 0.7 for Gemini (creative content generation)"

patterns-established:
  - "Single-image vision: simplified version of multi-image analyzeDocument, single inlineData/image block"
  - "Dual schema export: SLIDE_RESPONSE_SCHEMA + SLIDE_CREATION_TOOL in same file for Gemini/Claude parity"

# Metrics
duration: 6min
completed: 2026-02-07
---

# Phase 56 Plan 01: AI Slide Analysis Prompts & Provider Methods Summary

**analyzePastedSlide() on both Gemini and Claude providers with dedicated prompts for Year 6 slide image analysis, teleprompter segment generation, and layout selection**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-07T02:04:23Z
- **Completed:** 2026-02-07T02:10:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created slide analysis prompts file with system prompt, user prompt builder, and dual structured output schemas
- Added analyzePastedSlide() method to AIProviderInterface
- Implemented Gemini provider using GoogleGenAI vision with responseSchema pattern
- Implemented Claude provider using Messages API with image content block and tool_choice pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create slide analysis prompts and schemas** - `eb55c93` (feat)
2. **Task 2: Add analyzePastedSlide to AIProviderInterface and both providers** - `467ed4b` (feat)

## Files Created/Modified
- `services/slideAnalysis/slideAnalysisPrompts.ts` - System prompt, user prompt builder, Gemini responseSchema, Claude tool schema
- `services/aiProvider.ts` - analyzePastedSlide method added to AIProviderInterface
- `services/providers/geminiProvider.ts` - Gemini implementation using inlineData + responseSchema
- `services/providers/claudeProvider.ts` - Claude implementation using image content block + tool_choice

## Decisions Made
- Separate `services/slideAnalysis/` directory following the `services/documentAnalysis/` pattern for organizational consistency
- `analyzePastedSlide` returns Slide with empty `id` string -- caller is responsible for assigning slide ID and source metadata
- Temperature set to 0.7 for Gemini (matching creative generation pattern, not the 0 used for document classification)
- VerbosityLevel imported from `geminiService` (not `aiProvider`) following existing prompts file convention
- max_tokens 4096 for Claude (matching analyzeDocument pattern, sufficient for single slide output)
- `isGeneratingImage: false` set in both providers (image generation is a separate step)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- analyzePastedSlide() is ready for integration into the paste flow (Plan 02)
- Both providers accept raw base64 image data (no data URL prefix)
- Method returns complete Slide object ready for insertion into slides array
- Caller needs to: assign id, set source metadata, optionally trigger image generation

---
*Phase: 56-ai-slide-analysis*
*Completed: 2026-02-07*
