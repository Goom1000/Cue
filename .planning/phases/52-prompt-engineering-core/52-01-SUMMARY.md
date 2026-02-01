---
phase: 52-prompt-engineering-core
plan: 01
subsystem: prompts
tags: [prompt-engineering, scaffolding, teleprompter, teachable-moments, ai-generation]

# Dependency graph
requires:
  - phase: 51-detection-foundation
    provides: TeachableMoment type, ContentCategory enum, detectTeachableMoments function
provides:
  - getTeachableMomentRules function for AI system prompts
  - Content-specific scaffolding templates (math, vocabulary, comprehension, science, general)
  - Bullet structure rules for problem/answer splitting
  - Teleprompter confirmation guidance
  - Few-shot edge case examples
affects: [52-02, 52-03, 53-scaffolding-templates, geminiService-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-specific scaffolding templates by category"
    - "XML-tagged few-shot examples for edge cases"
    - "Conditional template inclusion based on detected categories"

key-files:
  created:
    - services/prompts/teachableMomentRules.ts
  modified: []

key-decisions:
  - "Vocabulary definitions must NOT repeat the vocabulary word (locked decision from CONTEXT.md)"
  - "Scaffolding uses 2-3 brief question prompts with [PAUSE] timing cues"
  - "Confirmation segment goes after answer reveal, not as separate segment"

patterns-established:
  - "Category-based template selection: scaffolding templates included only for detected categories"
  - "Empty array returns empty string: avoids cluttering prompt when no teachable moments"
  - "XML-tagged examples: consistent with contentPreservationRules.ts pattern"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 52 Plan 01: Teachable Moment Rules Summary

**Content-specific scaffolding templates and bullet structure rules for AI to split problem/answer pairs with teacher guidance in teleprompter**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T08:47:09Z
- **Completed:** 2026-02-01T08:49:10Z
- **Tasks:** 3 (combined into 1 commit - all in same file)
- **Files modified:** 1

## Accomplishments

- Created 5 content-specific scaffolding templates (math, vocabulary, comprehension, science, general)
- Implemented getTeachableMomentRules function that generates AI prompt rules
- Added bullet structure rules preventing answer leakage (problem and answer as consecutive bullets)
- Documented locked decision: vocabulary definitions do NOT repeat the word
- Added teleprompter confirmation guidance for after answer reveal
- Created few-shot edge case examples (multi-part math, vocabulary context, rhetorical questions, multiple moments)

## Task Commits

Tasks 1-3 were completed in a single file creation:

1. **Task 1: Create scaffolding template constants** - `b236447` (feat)
2. **Task 2: Create getTeachableMomentRules function** - included in `b236447`
3. **Task 3: Add few-shot examples for edge cases** - included in `b236447`

_Note: All three tasks were in the same file, so they were committed together._

## Files Created/Modified

- `services/prompts/teachableMomentRules.ts` - Main teachable moment rules module with:
  - 5 scaffolding template constants (MATH, VOCABULARY, COMPREHENSION, SCIENCE, GENERAL)
  - getTeachableMomentRules() function
  - TEACHABLE_MOMENT_EXAMPLES constant with edge cases
  - Import from contentPreservation/types.ts

## Decisions Made

1. **Vocabulary locked decision documented**: Added explicit documentation that vocabulary definitions must NOT repeat the word in both the template comment and the output rules
2. **Combined tasks**: Since all 3 tasks target the same file, implemented together to avoid artificial splitting
3. **Followed research patterns**: Used XML-tagged examples pattern from contentPreservationRules.ts
4. **Conditional template inclusion**: Only include scaffolding templates for categories present in detected moments

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compilation succeeded on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- getTeachableMomentRules function ready for integration into geminiService.ts
- Function accepts TeachableMoment[] from Phase 51 detection
- Returns formatted prompt section or empty string (no teachable moments)
- Next plan (52-02) will integrate this into the AI system prompt

---
*Phase: 52-prompt-engineering-core*
*Completed: 2026-02-01*
