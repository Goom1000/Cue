# Phase 47: Export and Persistence - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhanced resources produce print-ready output and persist across sessions. Users can export enhanced worksheets as PDFs for printing and save/load enhanced resources within .cue files.

</domain>

<decisions>
## Implementation Decisions

### PDF export format
- Each differentiation level exports as its own separate PDF file
- Header at top of each page shows the differentiation level name (e.g., "Simple Version")
- Original resource title appears as document title at top of PDF
- Answer keys export as separate PDF files (not appended to worksheets)

### Export workflow
- Export button placement: Claude's discretion based on best UX
- Export all differentiation levels at once with single click
- Multiple files delivered as a zip file download
- Progress bar shows PDF generation progress with percentage

### .cue file integration
- Full enhancement data persists: original resource, analysis, all enhanced versions, and user edits
- Resources associated at presentation-level (shown in sidebar, not per-slide)
- Auto-restore on load: enhanced resources load exactly as saved, with all enhancements intact
- User edits tracked separately from AI output (edits stored as overlay on original AI content)

### Print optimization
- Default paper size: A4 (UK/EU standard)
- Each major section starts on a new page
- Binding margins: extra margin on left for hole-punching/filing
- Visual style: clean and minimal (simple typography, light borders, ink-friendly)

### Claude's Discretion
- Export button/action placement in UI
- Staleness warning when slides change after enhancement
- Multiple vs single resource per presentation
- Analysis cache persistence in .cue file
- File size handling for embedded resources
- Exact margin dimensions
- Font choices for print

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for PDF generation and file persistence.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 47-export-and-persistence*
*Context gathered: 2026-01-30*
