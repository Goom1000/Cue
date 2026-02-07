# Plan 60-01 Summary: Types, Prompts, Gemini Provider, Cohesion Cleanup

## What was done

1. **aiProvider.ts** — Removed `CohesionResult`/`CohesionChange` types and `makeDeckCohesive` interface method. Added `CondensationAction`, `CondensationSlideAction`, `CondensationResult` types and `condenseDeck` method signature.

2. **condensationPrompts.ts** (NEW) — Created with 5 exports:
   - `CONDENSATION_SYSTEM_PROMPT` — Four-action model (keep/edit/remove/merge) with merge semantics and teleprompter format rules
   - `buildCondensationUserPrompt()` — User prompt builder with grade level
   - `buildCondensationContext()` — Deck + lesson plan context (8000 char cap on plan text)
   - `CONDENSATION_RESPONSE_SCHEMA` — Gemini structured output schema
   - `CONDENSATION_TOOL` — Claude tool schema (`propose_condensation`)

3. **cohesionPrompts.ts** — Gutted to only `buildDeckContextForCohesion` (deck serializer used by condensation, gap analysis, and gap slide generation). Removed all prompt/schema/tool exports.

4. **geminiProvider.ts** — Replaced `makeDeckCohesive` with `condenseDeck`. Multimodal support (up to 5 lesson plan images), temperature 0.5, structured JSON output. Same pattern as `analyzeGaps`.

## Verification

- `npx tsc --noEmit` passes (only claudeProvider error expected, fixed in 60-02)
- All old cohesion exports removed from cohesionPrompts.ts
- `CondensationResult` exported from aiProvider.ts
- `condenseDeck` in AIProviderInterface with correct signature
