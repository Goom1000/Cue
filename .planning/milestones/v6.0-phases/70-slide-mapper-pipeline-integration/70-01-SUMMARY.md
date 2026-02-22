---
phase: 70-slide-mapper-pipeline-integration
plan: 01
subsystem: parsing
tags: [typescript, jest, pure-function, tdd, teleprompter, slide-mapping]

# Dependency graph
requires:
  - phase: 69-scripted-parser
    provides: "parseScriptedLessonPlan() producing ScriptedBlock[], SectionLabel types"
provides:
  - "mapBlocksToSlides() pure function converting ScriptedBlock[] to Slide[]"
  - "Positional segment tracking for teleprompter segment count invariant"
  - "Section-to-LessonPhase mapping from parser section labels"
affects: [70-02-pipeline-integration, 71-image-prompts, 72-day-selection]

# Tech tracking
tech-stack:
  added: []
  patterns: [positional-segment-accumulator, block-to-slide-grouping, sequential-accumulator-with-flush]

key-files:
  created:
    - services/scriptedParser/scriptedMapper.ts
    - services/scriptedParser/scriptedMapper.test.ts

key-decisions:
  - "Positional segment groups instead of flat Say list: Say blocks tracked by position relative to content bullets for correct teleprompter alignment"
  - "Ask flush only when more blocks follow: Ask block stays on current slide, triggers new slide only if there are subsequent blocks"
  - "Consecutive section headings collapse: empty slides from back-to-back headings are suppressed by checking for zero content + zero say"
  - "Continuation slides get (cont.) suffix: slides created by ask-boundary flush inherit section title with (cont.) appended"

patterns-established:
  - "Positional segment accumulator: track Say blocks by their position relative to content bullets, not as a flat list"
  - "Block-to-slide flush pattern: accumulate blocks onto current slide, flush on boundary triggers (section heading, ask interaction, substantial activity)"
  - "Segment count invariant enforcement: mechanical check in buildSpeakerNotes ensures segments = content.length + 1"

requirements-completed: [MAP-01, MAP-02, MAP-03, MAP-04, MAP-05]

# Metrics
duration: 5min
completed: 2026-02-21
---

# Phase 70 Plan 01: Slide Mapper Summary

**Pure-function mapper converting ScriptedBlock[] to Slide[] with positional segment tracking, section-to-phase mapping, and work-together slide detection**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-20T23:47:43Z
- **Completed:** 2026-02-20T23:53:18Z
- **Tasks:** 2
- **Files created:** 2 (928 lines total)

## Accomplishments

- TDD-built mapBlocksToSlides() with 39 passing tests covering all 5 MAP requirements
- Positional segment tracking aligns Say blocks to their natural position relative to content bullets, enforcing the teleprompter segment count invariant mechanically
- Section-to-LessonPhase direct lookup map from parser SectionLabel values
- Work-together slide detection via multi-line heuristic with both slideType and layout set

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Write failing tests for mapBlocksToSlides** - `2457abd` (test)
2. **Task 2 GREEN: Implement mapBlocksToSlides** - `5595f35` (feat)

## Files Created/Modified

- `services/scriptedParser/scriptedMapper.ts` - mapBlocksToSlides() pure function with positional segment tracking, section-to-phase mapping, slide boundary logic (309 lines)
- `services/scriptedParser/scriptedMapper.test.ts` - Comprehensive test suite: 39 tests across MAP-01 through MAP-05 + slide construction + cross-check (619 lines)

## Decisions Made

- **Positional segment groups instead of flat Say list:** The plan specified a flat `saySegments[]` array distributed across slots. During implementation, this caused incorrect segment placement for trailing Say blocks (Say after Write would fill the intro segment instead of the trailing segment). Changed to `segmentGroups[][]` where each group tracks Say texts at a specific position relative to content bullets. This correctly implements the "say this, then show that" pattern from CONTEXT.md.
- **Ask flush only when more blocks follow:** Ask blocks add their content to the current slide and only trigger a flush if there are subsequent blocks in the array. An Ask as the last block stays on its slide without creating an empty trailing slide.
- **Consecutive section headings collapse:** When multiple section headings appear with no content between them, the flush logic suppresses empty slides (zero content + zero say segments). The last heading's title and phase take precedence.
- **Continuation slide titling:** Slides created by ask-boundary flush within a section get the section title with " (cont.)" appended via sectionSlideCount tracking.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Redesigned segment accumulation from flat list to positional groups**
- **Found during:** Task 2 GREEN (implementation)
- **Issue:** The plan specified a flat `saySegments[]` list with distribution logic in `buildSpeakerNotes`. This caused trailing Say blocks to fill the wrong segment position -- a Say block after a Write block would go to segment 0 (intro) instead of segment 1 (after the bullet).
- **Fix:** Changed PartialSlide to use `segmentGroups: string[][]` where each group index corresponds to a position relative to content bullets. `buildSpeakerNotes` now merges each group independently with `\n\n` between Say texts in the same position.
- **Files modified:** services/scriptedParser/scriptedMapper.ts, services/scriptedParser/scriptedMapper.test.ts (1 test expectation updated)
- **Verification:** All 39 tests pass, segment count invariant holds for every slide
- **Committed in:** 5595f35 (GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** The positional approach is necessary for correct "say this, then show that" alignment. The flat distribution model from the plan would misplace segments when Say blocks appear after content bullets. No scope creep.

## Issues Encountered

None -- plan executed cleanly after the segment accumulation redesign.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- mapBlocksToSlides() is ready for Phase 70 Plan 02 (Pipeline Integration) to wire into generationPipeline.ts
- The mapper exports only `mapBlocksToSlides` -- clean import surface for the pipeline
- Work-together slides have both `slideType` and `layout` set for renderer compatibility
- No blockers or concerns

## Self-Check: PASSED

- All 2 created files exist on disk
- All 2 task commits verified in git log (2457abd, 5595f35)
- 39/39 tests passing
- Zero type errors

---
*Phase: 70-slide-mapper-pipeline-integration*
*Completed: 2026-02-21*
