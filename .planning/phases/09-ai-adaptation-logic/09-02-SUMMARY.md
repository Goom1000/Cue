---
phase: 09-ai-adaptation-logic
plan: 02
subsystem: ai-generation
tags: [gemini, prompts, generation-modes, backward-compatible]

dependency_graph:
  requires:
    - 09-01 (GenerationMode types and GenerationInput interface)
  provides:
    - Mode-specific system instructions in GeminiProvider
    - Gemini parity with Claude for refine/blend modes
  affects:
    - 09-03 (will connect App.tsx upload mode to providers)

tech_stack:
  added: []
  patterns:
    - Shared TELEPROMPTER_RULES constant (same as Claude)
    - Input normalization (string | GenerationInput)
    - Mode-specific instruction selection via switch statement

key_files:
  created: []
  modified:
    - services/geminiService.ts
    - services/providers/geminiProvider.ts

decisions:
  - decision: Mirror Claude's prompt structure exactly
    rationale: Consistency between providers, easier maintenance
    alternatives: [Provider-specific prompts with different wording]

metrics:
  duration: ~3 min
  completed: 2026-01-19
---

# Phase 9 Plan 2: Mode-Specific Generation in GeminiProvider Summary

Gemini provider now supports fresh/refine/blend modes with mode-specific system instructions matching Claude implementation.

## What Was Built

### Task 1: geminiService Mode-Specific Generation
- Extracted `TELEPROMPTER_RULES` as shared constant (identical to Claude)
- Created `getSystemInstructionForMode(mode)` function with three distinct prompts:
  - **Fresh**: Transform lesson plan, use images for tables/charts, preserve pedagogical structure
  - **Refine**: Extract and rebuild from presentation, AI decides slide count, note visuals with `[Visual: description]`
  - **Blend**: Analyze both sources, add missing topics, flag conflicts with `[Note: Sources differ on...]`
- Updated `generateLessonSlides` signature to accept `GenerationInput | string`
- Built contents array based on mode:
  - Fresh: lesson text + lesson images (up to 10)
  - Refine: presentation text + presentation images (up to 10)
  - Blend: combined text + both image sets (5 each, total 10 max)

### Task 2: GeminiProvider Wrapper Update
- Imported `GenerationInput` type from aiProvider
- Updated `generateLessonSlides` signature to match interface
- Passes inputOrText through to geminiService (normalization happens there)

## Key Implementation Details

### Backward Compatibility
```typescript
export const generateLessonSlides = async (
  apiKey: string,
  inputOrText: GenerationInput | string,
  pageImages: string[] = []
): Promise<Slide[]> => {
  // Normalize to GenerationInput for backward compatibility
  const input: GenerationInput = typeof inputOrText === 'string'
    ? { lessonText: inputOrText, lessonImages: pageImages, mode: 'fresh' }
    : inputOrText;
  // ... rest uses input.mode
}
```

### Prompt Structure Parity with Claude
All mode prompts include:
1. Role and goal (mode-specific)
2. Mode-specific rules (what to extract, how to handle content)
3. `TELEPROMPTER_RULES` constant (Progressive Disclosure system)
4. Gemini responseSchema handles JSON output format

### Gemini-Specific Image Handling
Gemini uses `inlineData` format for images:
```typescript
contents.push({
  inlineData: {
    mimeType: "image/jpeg",
    data  // base64 without data URI prefix
  }
});
```

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Match Claude prompt wording exactly | Consistent behavior between providers |
| Keep Gemini responseSchema unchanged | Output format identical across all modes |
| Reuse addImages helper pattern | Cleaner code, same approach as claudeProvider |

## Commits

| Hash | Description |
|------|-------------|
| 6acc5e0 | feat(09-02): add mode-specific generation to geminiService |
| a7dfd2e | feat(09-02): update GeminiProvider to pass GenerationInput |

## Next Phase Readiness

### Blockers
None - both providers now support all three generation modes.

### Ready For
- Plan 09-03: Connect App.tsx upload mode to providers via GenerationInput
- Both Claude and Gemini providers accept GenerationInput, enabling mode-based generation

---

*Plan: 09-02*
*Completed: 2026-01-19*
