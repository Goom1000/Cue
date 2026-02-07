# Phase 57 Plan 02: AI Image Caption Infrastructure Summary

**One-liner:** analyzeImage() method on both Gemini and Claude providers with vision APIs returning title, caption, and Year 6 teaching talking points

---
phase: 57
plan: 02
subsystem: ai-providers
tags: [vision-api, image-caption, gemini, claude, structured-output, teleprompter]
requires: [56]
provides: [analyzeImage-method, image-caption-prompts, dual-provider-image-analysis]
affects: [57-03]
tech-stack:
  added: []
  patterns: [vision-api-caption, lightweight-structured-output]
key-files:
  created: []
  modified: [services/slideAnalysis/slideAnalysisPrompts.ts, services/aiProvider.ts, services/providers/geminiProvider.ts, services/providers/claudeProvider.ts]
key-decisions:
  - Lighter-weight schema than analyzePastedSlide (3 fields vs full Slide object)
  - IMAGE_CAPTION_PROMPT uses second-person teleprompter style ("Tell the students...", "Point out...")
  - image/jpeg mimeType used for both providers (matches existing pattern)
duration: ~2 minutes
completed: 2026-02-07
---

## Performance

- **Duration:** ~2 minutes
- **Started:** 2026-02-07T05:53:31Z
- **Completed:** 2026-02-07T05:55:53Z
- **Tasks:** 2/2
- **Files modified:** 4

## Accomplishments

1. Added IMAGE_CAPTION_PROMPT, IMAGE_CAPTION_SCHEMA, IMAGE_CAPTION_TOOL, and ImageCaptionResult type to slideAnalysisPrompts.ts
2. Added analyzeImage(imageBase64) to AIProviderInterface with ImageCaptionResult return type
3. Implemented Gemini provider using responseSchema structured output with vision API
4. Implemented Claude provider using tool_choice structured output with Messages API
5. Both providers follow exact patterns established by analyzePastedSlide in Phase 56

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add image caption prompts and schemas | e39ec6b | services/slideAnalysis/slideAnalysisPrompts.ts |
| 2 | Implement analyzeImage on both providers | 3123bc3 | services/aiProvider.ts, geminiProvider.ts, claudeProvider.ts |

## Files Modified

| File | Changes |
|------|---------|
| services/slideAnalysis/slideAnalysisPrompts.ts | +60 lines: ImageCaptionResult interface, IMAGE_CAPTION_PROMPT, IMAGE_CAPTION_SCHEMA, IMAGE_CAPTION_TOOL |
| services/aiProvider.ts | +6 lines: analyzeImage in interface, ImageCaptionResult import and re-export |
| services/providers/geminiProvider.ts | +33 lines: analyzeImage implementation with GoogleGenAI vision + responseSchema |
| services/providers/claudeProvider.ts | +66 lines: analyzeImage implementation with fetch + tool_choice |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 3-field output (title, caption, teachingNotes) | Lighter-weight than full Slide analysis; image-only slides need description, not restructuring |
| Second-person teleprompter style in prompt | Matches Cue's existing pattern where speaker notes are teacher-facing instructions |
| Reuse same slideAnalysisPrompts.ts file | Keeps all vision-related prompts/schemas co-located; follows Phase 56 organizational pattern |
| No new dependencies | Uses existing @google/genai Type import and Anthropic fetch pattern |

## Deviations from Plan

### Minor Adjustments

**1. No currentProvider proxy update needed**
- Plan mentioned updating a "currentProvider proxy object" in aiProvider.ts
- This proxy pattern does not exist in the codebase; aiProvider.ts uses a factory function + interface pattern
- Skipped proxy update; interface addition is sufficient for the factory pattern

**2. Added ImageCaptionResult re-export from aiProvider.ts**
- Plan did not explicitly mention re-exporting the type
- Added `export type { ImageCaptionResult }` for consumer convenience (Rule 2 - Missing Critical: consumers need the type without reaching into slideAnalysis subdirectory)

## Issues

None.

## Next Phase Readiness

**Plan 03 can proceed.** The analyzeImage() method is callable through AIProviderInterface. Plan 03 will wire it into the UI with an on-demand "AI Caption" button for image-only slides.

**Integration points for Plan 03:**
- Import `ImageCaptionResult` from `services/aiProvider`
- Call `provider.analyzeImage(imageBase64)` where imageBase64 is the raw base64 string (no data URL prefix)
- Returns `{ title, caption, teachingNotes }` to populate slide fields
