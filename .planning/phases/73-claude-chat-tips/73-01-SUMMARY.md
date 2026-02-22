---
phase: 73-claude-chat-tips
plan: 01
subsystem: ui
tags: [react, tailwind, clipboard, overlay, static-page]

# Dependency graph
requires:
  - phase: 69-scripted-parser-engine
    provides: SUPPORTED_MARKERS constant from services/scriptedParser/types.ts
provides:
  - ClaudeChatTips overlay component with format spec, example, and copyable prompt template
  - Landing page link to open tips overlay
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Clipboard copy with HTTPS fallback via execCommand"
    - "Shared constant import between parser and UI (SUPPORTED_MARKERS)"

key-files:
  created:
    - components/ClaudeChatTips.tsx
  modified:
    - App.tsx

key-decisions:
  - "Marker descriptions hardcoded in component since SUPPORTED_MARKERS only has names, not descriptions"
  - "Tips link shown unconditionally (not gated by isScriptedMode) so teachers can read tips before toggling scripted mode"
  - "Prompt template stored as dedented string constant at top of file to avoid whitespace issues on copy"

patterns-established:
  - "copyToClipboard utility with navigator.clipboard + execCommand fallback pattern"

requirements-completed: [TIPS-01, TIPS-02, TIPS-03, TIPS-04, TIPS-05]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 73 Plan 01: Claude Chat Tips Summary

**Static tips overlay with marker format spec from SUPPORTED_MARKERS, example lesson snippet, and copyable prompt template with clipboard HTTPS fallback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T01:07:03Z
- **Completed:** 2026-02-22T01:10:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- ClaudeChatTips overlay component with format specification (content markers, section headings, day headers), example snippet, and prompt template
- Content markers rendered from shared SUPPORTED_MARKERS constant -- no hardcoded marker names
- Clipboard copy with HTTPS fallback (navigator.clipboard.writeText + execCommand) and toast feedback
- Landing page link wired into App.tsx with state toggle

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ClaudeChatTips overlay component** - `f39b94b` (feat)
2. **Task 2: Wire tips page into App.tsx landing page** - `adb8368` (feat)

## Files Created/Modified
- `components/ClaudeChatTips.tsx` - Full-screen overlay with format spec, example, prompt template, clipboard copy
- `App.tsx` - Import, showClaudeTips state, overlay render, landing page link

## Decisions Made
- Marker descriptions hardcoded in component via MARKER_DESCRIPTIONS record since SUPPORTED_MARKERS only provides marker names, not descriptions. Descriptions match the parser semantics (Say = teleprompter, Ask = slide question, Write on board = slide content, Activity = group work).
- Tips link shown unconditionally on landing page (not gated by isScriptedMode) so teachers can read the format before toggling to scripted mode.
- Prompt template stored as a top-level string constant (not inline JSX) to ensure clean copy without indentation artifacts.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 73 is the final phase of v6.0 Scripted Import milestone
- Tips page is live and functional from the landing page
- No blockers or concerns

---
*Phase: 73-claude-chat-tips*
*Completed: 2026-02-22*

## Self-Check: PASSED
