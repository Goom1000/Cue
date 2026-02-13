---
phase: 65-foundation-types-phase-detection
plan: 01
subsystem: types
tags: [typescript, regex, phase-detection, grr, lesson-phases, tdd]

# Dependency graph
requires: []
provides:
  - LessonPhase type with 6 GRR phases on Slide interface
  - PhasePattern dictionary with UK/Australian teaching terminology
  - detectPhasesInText function for regex-based phase boundary detection
  - assignPhasesToSlides function for explicit and heuristic phase assignment
  - PHASE_DISPLAY_LABELS for UI rendering
affects: [65-02-generation-wiring, phase-badges, phase-balance-indicators]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase detection module follows contentPreservation/detector.ts pure-function pattern"
    - "Structural vs content regex pattern priority (skip content when structural found)"
    - "PHASE_PATTERNS array ordered for longest-match-first (we-do-together before we-do)"

key-files:
  created:
    - services/phaseDetection/phasePatterns.ts
    - services/phaseDetection/phaseDetector.ts
    - services/phaseDetection/phaseDetector.test.ts
  modified:
    - types.ts

key-decisions:
  - "Content patterns skipped when structural (high confidence) match exists for same phase -- prevents duplicate detections"
  - "I Do structural pattern uses case-sensitive regex to prevent false positives from casual 'I do not' text"
  - "PHASE_PATTERNS array ordered hook, i-do, we-do-together, we-do, you-do, plenary for correct matching priority"

patterns-established:
  - "Phase detection: structural patterns (line-anchored, high confidence) checked before content patterns (body text, medium confidence)"
  - "PhasePattern interface with structuralPatterns + contentPatterns arrays per phase"
  - "assignPhasesToSlides: three strategies -- explicit mapping, positional heuristics (5+ slides), or no assignment (<5 slides)"

# Metrics
duration: 6min
completed: 2026-02-14
---

# Phase 65 Plan 01: Foundation Types + Phase Detection Summary

**LessonPhase type with 6 GRR phases, regex phase detector with UK/Australian synonym dictionary, and slide assignment via explicit detection or positional heuristics**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-13T23:26:10Z
- **Completed:** 2026-02-13T23:32:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- LessonPhase type with 6 values (hook, i-do, we-do, we-do-together, you-do, plenary) added to types.ts with optional lessonPhase field on Slide interface
- Phase patterns dictionary with comprehensive UK/Australian teaching terminology (Tuning In, Explicit Teaching, Modelled Practice, Guided Practice, Partner Work, Independent Practice, etc.)
- Phase detector module with detectPhasesInText (regex-based, structural + content patterns) and assignPhasesToSlides (proportional mapping + positional heuristics)
- 17 unit tests covering all 6 phases, false positive prevention, heuristic assignment, immutability, and edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Add LessonPhase type and create phase patterns dictionary** - `f663a15` (feat)
2. **Task 2 RED: Failing tests for phase detection** - `1757e44` (test)
3. **Task 2 GREEN: Implement phase detector** - `1784bac` (feat)

_TDD task had RED + GREEN commits. No REFACTOR needed._

## Files Created/Modified
- `types.ts` - Added LessonPhase type and optional lessonPhase field on Slide interface
- `services/phaseDetection/phasePatterns.ts` - Phase synonym dictionary with 6 PhasePattern entries, PhasePattern interface, PHASE_DISPLAY_LABELS
- `services/phaseDetection/phaseDetector.ts` - detectPhasesInText and assignPhasesToSlides with DetectedPhase and PhaseDetectionResult types
- `services/phaseDetection/phaseDetector.test.ts` - 17 unit tests for detection accuracy, false positive prevention, and slide assignment

## Decisions Made
- Content patterns are skipped when a structural (high confidence) match already exists for the same phase. This prevents duplicate detections when body text repeats phase-related terminology (e.g., "Teacher explains" appearing under an "I Do:" heading).
- "I Do" uses case-sensitive structural regex to prevent false positives from "I do not recommend" in casual English. Longer synonyms (Modelled Practice, Direct Instruction, etc.) use case-insensitive matching since they don't appear in casual text.
- PHASE_PATTERNS array is ordered with we-do-together before we-do to ensure "We Do Together" matches before the shorter "We Do" can consume it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed duplicate phase detection when content patterns match within structural phase regions**
- **Found during:** Task 2 (GREEN phase, test 8 failing)
- **Issue:** detectPhasesInText detected 7 phases instead of 6 in a full lesson plan. The content pattern `teacher (?:models?|explains?|demonstrates?)` matched "Teacher explains" within the I Do section that was already structurally detected.
- **Fix:** Added a check: skip content pattern scanning for a phase when that phase was already detected via a structural (high confidence) pattern.
- **Files modified:** services/phaseDetection/phaseDetector.ts
- **Verification:** All 17 tests pass including the full lesson plan test (test 8)
- **Committed in:** 1784bac (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for correct deduplication behavior. No scope creep.

## Issues Encountered
None -- plan executed cleanly after the auto-fix above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LessonPhase type and phase detection module ready for Plan 02 (generation wiring)
- detectPhasesInText can be called on full lesson plan text pre-truncation
- assignPhasesToSlides can be called as post-processing on generated slides
- PHASE_DISPLAY_LABELS ready for UI badge rendering
- Phase detection regex needs validation against real Australian lesson plan templates (carried over from STATE.md)

## Self-Check: PASSED

- All 5 files exist (types.ts, phasePatterns.ts, phaseDetector.ts, phaseDetector.test.ts, 65-01-SUMMARY.md)
- All 3 commits found (f663a15, 1757e44, 1784bac)

---
*Phase: 65-foundation-types-phase-detection*
*Completed: 2026-02-14*
