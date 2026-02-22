---
phase: 72-day-picker-ui-mode-selector
plan: 02
subsystem: ui
tags: [scripted-mode, day-picker, multi-format-upload, mode-detection, react-state, mammoth]

# Dependency graph
requires:
  - phase: 72-01
    provides: "detectScriptedMarkers(), GenerationInput.selectedDays, pipeline day filtering"
  - phase: 69-scripted-parser
    provides: "parseScriptedLessonPlan() and ScriptedParseResult type"
provides:
  - "Scripted mode auto-detection banner with toggle on landing page"
  - "Day picker grid with select all/deselect all and cross-day warning"
  - "Multi-format upload (PDF, DOCX, TXT) for lesson plans"
  - "Reactive import stats (days, sections, blocks) above generate button"
  - "Scripted-specific generate button label and mode wiring"
affects: [73-claude-chat-tips, future scripted enhancements]

# Tech tracking
tech-stack:
  added: [mammoth]
  patterns: ["useMemo for reactive import stats", "Set-based day selection state", "Override-nullable pattern for auto-detect toggle"]

key-files:
  created: []
  modified:
    - "App.tsx"
    - "services/documentProcessors/docxTextExtractor.ts"
    - "services/documentProcessors/pdfTextExtractor.ts"

key-decisions:
  - "Scripted mode override uses nullable boolean (null = auto, true/false = manual) for clean toggle semantics"
  - "Day picker positioned inline on landing page between banner and verbosity selector per CONTEXT.md decision"
  - "Verbosity selector hidden in scripted mode since scripted preserves verbatim text"

patterns-established:
  - "Override-nullable pattern: null means auto-detect, non-null means user override, resets on new upload"
  - "Multi-format routing: extension-based dispatch in handleFileChange with mammoth for DOCX"

requirements-completed: [MODE-01, MODE-02, MODE-03, DAY-01, DAY-02, DAY-03, DAY-04, DAY-05]

# Metrics
duration: 45min
completed: 2026-02-21
---

# Phase 72 Plan 02: Mode Banner + Day Picker + Multi-format Upload + Import Stats Summary

**Teacher-facing scripted import UI with auto-detection banner, day picker grid, multi-format upload (PDF/DOCX/TXT), and reactive import statistics**

## Performance

- **Duration:** 45 min (across checkpoint)
- **Started:** 2026-02-21T10:38:31Z
- **Completed:** 2026-02-21T11:41:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint verification)
- **Files modified:** 3

## Accomplishments
- Multi-format lesson plan upload supporting PDF, DOCX, and TXT files with appropriate text extraction
- Auto-detection banner with amber styling appears when scripted markers found, with toggle to override
- Day picker card grid shows day number, title, section/block counts with select all/deselect all
- Cross-day reference warning appears when importing subset of days
- Reactive import stats line updates as days are toggled on/off
- Generate button shows "Import Scripted Lesson" in scripted mode and is disabled when no days selected
- Verbosity selector hidden in scripted mode (verbatim text, no AI rewriting)

## Task Commits

Each task was committed atomically:

1. **Task 1: Multi-format upload + scripted mode state + mode banner + button label** - `fe8cf28` (feat)
2. **Task 2: Day picker grid + select all + cross-day warning + import stats** - `fdf9a20` (feat)
3. **Task 3: Verify scripted import flow end-to-end** - checkpoint approved (no commit)

**Deviation fix:** `65a045b` (fix) - Preserve line breaks and headings in PDF/DOCX text extraction

## Files Created/Modified
- `App.tsx` - Scripted mode state, auto-detection banner, day picker grid, multi-format upload routing, import stats, generate button label override, pipeline wiring
- `services/documentProcessors/docxTextExtractor.ts` - Preserve line breaks and headings in DOCX text extraction
- `services/documentProcessors/pdfTextExtractor.ts` - Preserve line breaks and headings in PDF text extraction

## Decisions Made
- Scripted mode override uses nullable boolean pattern (null = auto-detect follows markers, non-null = user override) -- resets on new file upload
- Day picker positioned inline on landing page between scripted banner and verbosity selector
- Verbosity selector hidden in scripted mode since scripted mode preserves the teacher's verbatim text with no AI rewriting

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preserve line breaks and headings in PDF/DOCX text extraction**
- **Found during:** Task 2 (day picker verification)
- **Issue:** PDF and DOCX text extractors were stripping line breaks and heading markers (## Day N), causing scripted marker detection and day parsing to fail on uploaded files
- **Fix:** Updated both extractors to preserve newlines and heading structure in extracted text
- **Files modified:** App.tsx, services/documentProcessors/docxTextExtractor.ts, services/documentProcessors/pdfTextExtractor.ts
- **Verification:** Uploaded DOCX and PDF files now correctly detect scripted markers and day boundaries
- **Committed in:** `65a045b`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for multi-format upload to work correctly with scripted detection. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 72 complete -- all 8 requirements (DAY-01 through DAY-05, MODE-01 through MODE-03) implemented
- Phase 73 (Claude Chat Tips) can proceed independently
- All scripted import features are end-to-end functional: upload -> detect -> pick days -> generate slides

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 72-day-picker-ui-mode-selector*
*Completed: 2026-02-21*
