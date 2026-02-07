# Plan 60-02 Summary: Claude Provider condenseDeck

## What was done

1. **claudeProvider.ts** — Updated imports: removed `CohesionResult`, `COHESION_SYSTEM_PROMPT`, `COHESION_TOOL`, `buildCohesionUserPrompt`. Added `CondensationResult`, `CONDENSATION_SYSTEM_PROMPT`, `buildCondensationUserPrompt`, `buildCondensationContext`, `CONDENSATION_TOOL`.

2. Replaced `makeDeckCohesive` with `condenseDeck`:
   - Multimodal content array: text + up to 5 base64 lesson plan images
   - `tool_choice` forces `propose_condensation` tool
   - Error handling follows established `AIProviderError` pattern
   - Same action enrichment post-processing as Gemini provider

## Verification

- `npx tsc --noEmit` — zero errors in both providers
- No remaining references to old cohesion types/methods in either provider
- `buildDeckContextForCohesion` still imported (used by gap analysis)
