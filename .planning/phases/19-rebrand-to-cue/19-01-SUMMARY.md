---
phase: 19-rebrand-to-cue
plan: 01
subsystem: ui
tags: [branding, file-format, migration, typescript]

# Dependency graph
requires:
  - phase: 18-targeted-questioning
    provides: Application UI and file handling infrastructure
provides:
  - "Cue" branding visible throughout application
  - .cue file format with backward compatibility for .pipi files
  - Rebranded AI prompts referencing Cue-style
affects: [20-repository-organization, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backward compatible file format migration"
    - "Type and function renaming with full backward compatibility"

key-files:
  created: []
  modified:
    - index.html
    - App.tsx
    - types.ts
    - services/saveService.ts
    - services/loadService.ts
    - hooks/useDragDrop.ts
    - components/ResourceHub.tsx
    - services/geminiService.ts
    - services/providers/claudeProvider.ts

key-decisions:
  - "Maintain backward compatibility by accepting both .cue and .pipi file extensions"
  - "Keep localStorage keys unchanged (pipi- prefix) to preserve user data"
  - "Keep BroadcastChannel name unchanged for cross-window sync compatibility"

patterns-established:
  - "File format migration: Accept both old and new extensions during transition period"
  - "Type renaming: Complete rename of all public types while maintaining interface compatibility"

# Metrics
duration: 4min
completed: 2026-01-22
---

# Phase 19 Plan 01: Rebrand to Cue Summary

**Complete rebrand from "PiPi" to "Cue" across all user-visible UI, with .cue file format migration maintaining full backward compatibility for .pipi files**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-22T09:51:50Z
- **Completed:** 2026-01-22T09:55:36Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Browser tab title, favicon, header, and landing page all display "Cue"
- File saves use .cue extension
- File loads accept both .cue and .pipi (backward compatible)
- AI prompts reference "Cue-style" instead of "PiPi-style"
- All TypeScript types renamed from PiPi* to Cue*
- Drag-drop accepts both file formats

## Task Commits

Each task was committed atomically:

1. **Task 1: Update UI branding strings and favicon** - `3c97c7b` (feat)
2. **Task 2: Migrate file format types and functions** - `98b1c6b` (feat)

## Files Created/Modified

### UI Branding (Task 1)
- `index.html` - Browser tab title changed to "Cue", favicon path updated to relative
- `App.tsx` - Header and landing page logo text changed to "Cue"
- `components/ResourceHub.tsx` - Footer branding updated to "Cue"
- `services/geminiService.ts` - AI prompts updated to reference "Cue-style"
- `services/providers/claudeProvider.ts` - AI prompts updated to reference "Cue-style"

### File Format Migration (Task 2)
- `types.ts` - Renamed PiPiFile/PiPiFileContent interfaces to CueFile/CueFileContent
- `services/saveService.ts` - Renamed createPiPiFile to createCueFile, updated to .cue extension
- `services/loadService.ts` - Renamed readPiPiFile to readCueFile, accepts both .cue and .pipi
- `hooks/useDragDrop.ts` - Updated to accept both .cue and .pipi files
- `App.tsx` - Updated imports and function calls, file input accepts both extensions

## Decisions Made

**1. Backward compatibility strategy**
- Accept both .cue and .pipi file extensions during load operations
- This ensures users can open existing .pipi files after upgrade
- New saves use .cue extension, but legacy files remain functional

**2. Preserve internal identifiers**
- localStorage keys kept as "pipi-class-bank", "pipi-settings" etc.
- BroadcastChannel name kept as "pipi-presentation"
- Rationale: Internal naming doesn't affect UX, and changing would break existing user data
- Users never see these internal identifiers

**3. Favicon asset reuse**
- Existing /public/favicon.png retained without replacement
- Only href path updated to relative reference
- Rationale: Favicon is an icon graphic without text, no rebrand needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all changes completed successfully without blockers.

## User Setup Required

None - no external service configuration required. This is a pure UI and file format rebrand.

## Next Phase Readiness

- Rebrand complete for all user-visible elements
- File format migrated with backward compatibility
- Ready for Phase 19 Plan 02 (repository organization and documentation)
- All type system changes complete - TypeScript compilation passes
- Build succeeds without warnings

**Blockers:** None

**Concerns:** None - backward compatibility ensures smooth transition for existing users

---
*Phase: 19-rebrand-to-cue*
*Completed: 2026-01-22*
