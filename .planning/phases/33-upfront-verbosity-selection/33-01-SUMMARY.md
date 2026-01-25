---
phase: 33-upfront-verbosity-selection
plan: 01
subsystem: ai-generation
tags: [verbosity, teleprompter, upfront-selection, ui]
completed: 2026-01-25

dependency-graph:
  requires:
    - v3.1 per-slide verbosity (TELEPROMPTER_RULES variants)
  provides:
    - Upfront verbosity selection on landing page
    - Verbosity-aware initial slide generation
  affects:
    - Phase 34 (preferences persistence)
    - Phase 35 (deck-wide regeneration)

tech-stack:
  added: []
  patterns:
    - getTeleprompterRulesForVerbosity helper pattern
    - Optional verbosity parameter in GenerationInput

key-files:
  created: []
  modified:
    - services/aiProvider.ts
    - services/geminiService.ts
    - services/providers/claudeProvider.ts
    - App.tsx

decisions:
  - key: verbosity-field-optional
    choice: Made verbosity optional in GenerationInput with 'standard' default
    reason: Backward compatibility with existing callers (tests, edge cases)

metrics:
  tasks: 2
  duration: ~5 minutes
---

# Phase 33 Plan 01: Upfront Verbosity Selection Summary

**One-liner:** Verbosity selector on landing page that affects initial teleprompter generation for all slides.

## What Was Built

Teachers can now select their preferred teleprompter style (Concise/Standard/Detailed) on the landing page before generating slides. The selected verbosity level is passed to the AI provider and affects the initial teleprompter content generation.

## Implementation Details

### Task 1: AI Generation Pipeline Extension

Extended the AI generation pipeline to accept and use verbosity:

1. **aiProvider.ts:** Added `verbosity?: VerbosityLevel` field to `GenerationInput` interface
2. **geminiService.ts:**
   - Added `getTeleprompterRulesForVerbosity(verbosity)` helper function
   - Modified `getSystemInstructionForMode(mode, verbosity)` to use dynamic teleprompter rules
   - Updated `generateLessonSlides` to pass `input.verbosity` through
3. **claudeProvider.ts:**
   - Added same `getTeleprompterRulesForVerbosity(verbosity)` helper
   - Modified `getSystemPromptForMode(mode, verbosity)` to use dynamic rules
   - Updated `generateLessonSlides` to pass `input.verbosity` through

### Task 2: Landing Page UI

Added verbosity selector to App.tsx landing page:

1. **State:** `upfrontVerbosity` state initialized to `'standard'`
2. **UI Component:** Three-button selector (Concise/Standard/Detailed) appears after Mode Indicator when file is uploaded
3. **Description:** Dynamic text updates based on selection explaining each level
4. **Wiring:** `upfrontVerbosity` passed to `GenerationInput` in `handleGenerate`

## Key Code Patterns

```typescript
// aiProvider.ts - Extended interface
export interface GenerationInput {
  // ... existing fields
  verbosity?: VerbosityLevel;  // NEW: optional, defaults to 'standard'
}

// geminiService.ts / claudeProvider.ts - Helper function
function getTeleprompterRulesForVerbosity(verbosity: VerbosityLevel = 'standard'): string {
  switch (verbosity) {
    case 'concise': return TELEPROMPTER_RULES_CONCISE;
    case 'detailed': return TELEPROMPTER_RULES_DETAILED;
    default: return TELEPROMPTER_RULES;
  }
}

// App.tsx - State and usage
const [upfrontVerbosity, setUpfrontVerbosity] = useState<VerbosityLevel>('standard');
// In handleGenerate:
const generationInput: GenerationInput = {
  // ...
  verbosity: upfrontVerbosity,
};
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 9ff99de | feat | Extend AI generation pipeline with verbosity parameter |
| ac8a217 | feat | Add verbosity selector UI to landing page |

## Files Modified

- `services/aiProvider.ts` - Added verbosity field to GenerationInput
- `services/geminiService.ts` - Added helper + modified system instruction builder
- `services/providers/claudeProvider.ts` - Added helper + modified system prompt builder
- `App.tsx` - Added state, UI component, and wiring

## Verification

- [x] Build passes with no type errors
- [x] Verbosity field in GenerationInput interface
- [x] getTeleprompterRulesForVerbosity helper in both providers
- [x] UI selector appears after file upload
- [x] Standard is pre-selected by default

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 34 (Preferences Persistence) can proceed:
- `upfrontVerbosity` state exists and is ready to be persisted
- The verbosity selection UI is in place for the preference to control
