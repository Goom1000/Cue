# Phase 72: Day Picker UI + Mode Selector - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can choose scripted import mode from the landing page, select which days to import from multi-day lesson plans, and see import statistics before generation. This phase covers the UI layer only — parser logic (Phase 69) and slide generation pipeline (Phase 70) are already built.

</domain>

<decisions>
## Implementation Decisions

### Mode Selector Design
- Auto-detect approach: parser checks for scripted markers (Say:, Ask:, etc.) after upload — if found, scripted mode is suggested automatically
- No upfront toggle — mode suggestion only appears when markers are detected
- Banner with toggle switch: "Scripted markers detected" banner appears after upload with a switch to override back to AI generation mode
- If no markers detected, scripted mode is not offered (markers are required for scripted import to work)

### Day Picker Layout
- Inline step: day cards appear on the landing page below the upload area (no modal)
- Preview cards in a grid: each card shows day number, title, section names, and block counts
- All days pre-selected by default (teacher deselects what they don't want)
- Select all / deselect all control above the card grid
- Day picker only appears when 2+ days are detected (single-day plans skip this step)

### Import Preview
- Compact stats summary line above the generate button: "3 days · 8 sections · 24 script blocks"
- Shows day count, section count, and block count (no estimated slides — would be a guess)
- Stats update reactively as days are selected/deselected
- Generate button text changes in scripted mode to communicate the different action

### Cross-day Warnings
- Generic inline callout (amber/yellow) below day cards when not all days are selected
- Message: "Some days may reference content from unselected days"
- Informational only — does not block generation, no extra confirmation step
- Warning hidden completely when all days selected or only 1 day exists

### Claude's Discretion
- Exact banner color and icon style (match existing app design language)
- Day card visual treatment (shadows, borders, selection indicator)
- Stats line typography and spacing
- Select all control style (checkbox vs button)
- Generate button label in scripted mode
- Animation/transition for day picker appearing after upload

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User deferred all visual styling decisions to Claude's discretion, focusing on behavioral decisions:
- Auto-detect over manual toggle (smart defaults)
- All pre-selected over opt-in (optimize for common case)
- Reactive stats over static (clear feedback)
- Informational warning over blocking (non-destructive action)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 72-day-picker-ui-mode-selector*
*Context gathered: 2026-02-21*
