---
phase: 68-phase-aware-ui-resource-injection
plan: 03
subsystem: ai
tags: [system-prompt, resource-awareness, gemini, claude, provider-parity]

# Dependency graph
requires:
  - phase: 68-phase-aware-ui-resource-injection
    plan: 02
    provides: "supplementaryResourceText in user prompt, buildResourceInjectionText utility"
provides:
  - "CRITICAL-level resource awareness directives in system prompts for both providers"
  - "hasResources parameter on system prompt builder functions"
  - "Conditional system-level rules that tell AI to integrate uploaded resources"
affects: [ai-generation, resource-injection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional system prompt augmentation via boolean flag parameter"
    - "Provider parity enforced via identical directive text copy-paste"

key-files:
  created: []
  modified:
    - services/geminiService.ts
    - services/providers/claudeProvider.ts

key-decisions:
  - "Resource awareness rules placed before LAYOUTS line alongside other CRITICAL/MANDATORY directives"
  - "Directive text copy-pasted between providers for character-level parity (not abstracted to shared module)"

patterns-established:
  - "Conditional system prompt sections via boolean parameter + ternary string builder"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 68 Plan 03: Resource Awareness in System Prompts Summary

**CRITICAL-level resource integration directives added to both Gemini and Claude system prompts, ensuring AI treats uploaded supplementary resources as mandatory content to weave into slides**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T19:37:21Z
- **Completed:** 2026-02-15T19:40:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `hasResources` boolean parameter to system prompt builder functions in both providers
- Conditionally appended CRITICAL-level resource awareness directives to all three generation modes (fresh, refine, blend)
- Wired `!!input.supplementaryResourceText` at both providers' `generateLessonSlides()` call sites
- Maintained character-for-character parity between Gemini and Claude directive text

## Task Commits

Each task was committed atomically:

1. **Task 1: Add resource awareness to Gemini system prompt** - `2456d9b` (feat)
2. **Task 2: Add resource awareness to Claude system prompt (provider parity)** - `2d56566` (feat)

## Files Created/Modified
- `services/geminiService.ts` - Added `hasResources` param to `getSystemInstructionForMode()`, conditional resource awareness directives in all 3 modes, call site wiring
- `services/providers/claudeProvider.ts` - Identical changes to `getSystemPromptForMode()` for provider parity

## Decisions Made
- Resource awareness rules placed before the LAYOUTS line in each mode, alongside other CRITICAL/MANDATORY directives, to maintain the established directive hierarchy
- Directive text copied verbatim between providers rather than extracting to a shared module -- matches existing pattern where each provider maintains its own prompt strings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both providers now have system-level awareness of supplementary resources when present
- UAT gap (AI ignoring uploaded resources) should be resolved: resource content in user prompt + CRITICAL-level directives in system prompt
- Ready for re-verification via UAT

## Self-Check: PASSED

- FOUND: services/geminiService.ts
- FOUND: services/providers/claudeProvider.ts
- FOUND: 68-03-SUMMARY.md
- FOUND: 2456d9b (Task 1 commit)
- FOUND: 2d56566 (Task 2 commit)

---
*Phase: 68-phase-aware-ui-resource-injection*
*Completed: 2026-02-16*
