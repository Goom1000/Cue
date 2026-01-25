---
phase: 31-work-together-slide-insertion
plan: 01
subsystem: ai-content-generation
tags: [gemini, claude, collaborative-activities, pair-work, fisher-yates, teleprompter]

# Dependency graph
requires:
  - phase: 30-elaborate-slide-insertion
    provides: "InsertPoint vertical dropdown pattern with 3 options (Blank, Exemplar, Elaborate)"
provides:
  - "Work Together slide type with AI-generated collaborative pair activities"
  - "StudentPair interface for randomized pair generation with Fisher-Yates shuffle"
  - "WorkTogetherLayout component with teal theme and numbered instructions"
  - "generateWorkTogetherSlide in both Gemini and Claude providers"
  - "Activity constraints: basic resources only, group-of-3 variant required"
affects: [32-class-challenge-slide, presentation-view, student-roster]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fisher-Yates shuffle for randomized pair generation"
    - "Pair state stored separately from AI content for independent shuffle"
    - "Group-of-3 handling for odd class sizes"
    - "Activity resource constraints in AI system prompts"

key-files:
  created: []
  modified:
    - types.ts
    - services/aiProvider.ts
    - services/geminiService.ts
    - services/providers/geminiProvider.ts
    - services/providers/claudeProvider.ts
    - components/SlideRenderers.tsx
    - App.tsx

key-decisions:
  - "StudentPair stored separately from content (enables shuffle without AI regeneration)"
  - "Teal color scheme (bg-teal-600) for Work Together slides to distinguish from purple Elaborate"
  - "Fisher-Yates shuffle for fair randomization of student pairs"
  - "Group-of-3 variant required in all activities for odd class sizes"
  - "Activity constraints enforced via AI prompts: pen, paper, whiteboard only"

patterns-established:
  - "Fourth button pattern in InsertPoint dropdown (extensible to Class Challenge)"
  - "Pairs field optional on Slide interface (only present for work-together layout)"
  - "handleShufflePairs pattern for re-randomizing without AI call"
  - "isGroupOfThree flag on StudentPair for special rendering"

# Metrics
duration: 5min
completed: 2026-01-25
---

# Phase 31 Plan 01: Work Together Slide Insertion Summary

**Work Together slide insertion with AI-generated collaborative pair activities, randomized student pairings via Fisher-Yates shuffle, and teal-themed layout with numbered instructions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-25T03:03:21Z
- **Completed:** 2026-01-25T03:08:13Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Work Together button (teal) added to InsertPoint dropdown as 4th option
- AI generates collaborative activities with constraints: basic resources only (pen, paper, whiteboard), group-of-3 variant required
- StudentPair interface with Fisher-Yates shuffle generates randomized pairs from class roster
- WorkTogetherLayout component displays numbered instructions and pairs panel (or placeholder if no roster)
- handleShufflePairs enables re-randomization without regenerating AI content

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Types and AI Provider Interface** - `9b39286` (feat)
2. **Task 2: Implement AI Generation in Both Providers** - `bb0d00f` (feat)
3. **Task 3: Add WorkTogetherLayout and Wire InsertPoint** - `afd2360` (feat)

## Files Created/Modified
- `types.ts` - Added StudentPair interface, pairs field on Slide, 'work-together' layout type
- `services/aiProvider.ts` - Added generateWorkTogetherSlide to AIProviderInterface
- `services/geminiService.ts` - Implemented generateWorkTogetherSlide with activity constraints
- `services/providers/geminiProvider.ts` - Added passthrough method for Work Together generation
- `services/providers/claudeProvider.ts` - Implemented generateWorkTogetherSlide with activity constraints
- `components/SlideRenderers.tsx` - Added WorkTogetherLayout component, updated SlideContentRenderer switch
- `App.tsx` - Added generatePairs helper, Work Together button in InsertPoint, handleInsertWorkTogetherSlide, handleShufflePairs

## Decisions Made

**1. StudentPair stored separately from content**
- Rationale: Enables shuffle button to re-randomize pairs without calling AI again
- Pattern: pairs field optional on Slide interface, only populated for work-together slides

**2. Teal color scheme for Work Together slides**
- Rationale: Distinguish from purple Elaborate slides and indigo Exemplar slides
- Implementation: bg-teal-600 default, numbered circles use bg-amber-400

**3. Fisher-Yates shuffle for pair generation**
- Rationale: Standard algorithm for unbiased randomization
- Implementation: Shuffle student array, then pair off from start, handle odd remainder as group-of-3

**4. Activity constraints enforced via AI prompts**
- Rationale: Ensure activities are classroom-feasible without tech/special materials
- Implementation: System prompts require basic resources only (pen, paper, whiteboard), explicitly prohibit tablets/computers/glue/scissors

**5. Group-of-3 variant required in all activities**
- Rationale: Handle odd class sizes gracefully, AI generates instructions that work for both pairs and groups-of-3
- Implementation: isGroupOfThree flag on StudentPair, rendered with amber highlight

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Work Together slide insertion complete and functional
- Pattern established for 4th InsertPoint option (ready for Class Challenge in Phase 32)
- StudentPair system ready for potential shuffle UI in PresentationView
- AI providers enforce activity constraints correctly

**Next:** Phase 32 - Class Challenge Slide Insertion (final slide type in v3.2 milestone)

---
*Phase: 31-work-together-slide-insertion*
*Completed: 2026-01-25*
