---
phase: 48-detection-and-rules-foundation
plan: 02
subsystem: prompts
tags: [xml, ai-prompts, content-preservation, few-shot]

# Dependency graph
requires:
  - phase: 48-detection-and-rules-foundation
    plan: 01
    provides: DetectedContent and PreservableContent types
provides:
  - XML escaping utility for safe prompt content
  - buildPreservationPrompt for AI slide generation
  - getPreservationRules convenience wrapper
  - getTeleprompterPreservationRules for speaker notes
affects: [49-provider-integration, claude-provider, gemini-provider]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "XML-tagged prompt sections for structured AI instructions"
    - "Few-shot examples for edge case guidance"
    - "Confidence-based filtering for detection results"

key-files:
  created:
    - services/prompts/contentPreservationRules.ts
  modified: []

key-decisions:
  - "XML tags with type/method attributes for preserve instructions"
  - "Medium confidence default filter to skip low-confidence detections"
  - "Separate teleprompter rules for speaker notes context"

patterns-established:
  - "escapeXml() for any user content in XML prompts"
  - "Empty input returns empty string to avoid prompt clutter"
  - "MUST/MAY/MUST NOT rule structure for AI instructions"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 48 Plan 02: Prompt Rules Module Summary

**XML-tagged preservation prompts with few-shot examples and teleprompter guidance for verbatim content preservation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T00:38:42Z
- **Completed:** 2026-02-01T00:41:03Z
- **Tasks:** 3
- **Files created:** 1

## Accomplishments
- escapeXml utility handles all 5 XML special characters
- buildPreservationPrompt generates structured preservation rules with XML tags
- Few-shot examples cover direct questions, activities, and embedded questions
- Teleprompter-specific rules for delivery context in speaker notes
- Confidence-based filtering excludes low-confidence detections by default

## Task Commits

Each task was committed atomically:

1. **Task 1: Create XML escaping and tag building utilities** - `0c4523c` (feat)
2. **Task 2: Implement main prompt builder with few-shot examples** - `9287c34` (feat)
3. **Task 3: Add convenience wrapper and teleprompter rules** - `5e96a67` (feat)

## Files Created

- `services/prompts/contentPreservationRules.ts` - AI prompt rules for content preservation

### Exports

| Function | Purpose |
|----------|---------|
| `escapeXml(text)` | Escape &, <, >, ", ' for XML safety |
| `buildPreservationPrompt(items, minConfidence)` | Generate full preservation prompt section |
| `getPreservationRules(content, minConfidence)` | Convenience wrapper for PreservableContent |
| `getTeleprompterPreservationRules(content)` | Speaker notes delivery guidance |

## Decisions Made

1. **XML format with attributes** - `<preserve type="question" method="punctuation">` includes detection metadata for potential AI reasoning
2. **Medium confidence default** - Skip low-confidence detections to reduce false positives in prompts
3. **Separate teleprompter rules** - Delivery context (pause cues, answer hints) only added when questions/activities present

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Prompt rules module ready for provider integration
- detectPreservableContent() (plan 01) provides input for these functions
- Next: Plan 03 detection logic, then provider integration in phase 49

---
*Phase: 48-detection-and-rules-foundation*
*Completed: 2026-02-01*
