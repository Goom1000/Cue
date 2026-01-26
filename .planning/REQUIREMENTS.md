# Requirements: Cue

**Defined:** 2026-01-27
**Core Value:** Students see only the presentation; teachers see the teleprompter script

## v3.5 Requirements

Requirements for Working Wall Export milestone.

### Slide Selection

- [x] **SEL-01**: Teacher can toggle selection checkbox on each slide thumbnail
- [x] **SEL-02**: Selected slides show visual indicator (highlight, checkmark, or border)
- [x] **SEL-03**: Selection count displays when 1+ slides selected (e.g., "3 slides selected")
- [x] **SEL-04**: "Select All" button selects all slides at once
- [x] **SEL-05**: "Deselect All" button clears all selections

### Export UI

- [x] **EXP-01**: "Export for Working Wall" button appears when 1+ slides selected
- [x] **EXP-02**: Export button opens modal with export mode options
- [x] **EXP-03**: Modal shows preview of selected slides before export

### Quick Export

- [x] **QEX-01**: "Quick Export" option exports slides as-is to A4 PDF
- [x] **QEX-02**: PDF preserves exact slide content (what teacher wrote during class)
- [x] **QEX-03**: PDF downloads automatically after generation

### AI Poster Mode

- [x] **POS-01**: "AI Poster" option transforms slides into educational posters
- [x] **POS-02**: AI analyzes slide content and surrounding slides for context
- [x] **POS-03**: AI generates poster with larger text optimized for wall display
- [x] **POS-04**: AI creates clearer visual hierarchy than original slide
- [x] **POS-05**: AI explains concept clearly for student reference
- [x] **POS-06**: Poster output as A4 PDF download

## Future Requirements

Deferred to future milestones.

### Extended Export Options

- **EXT-01**: A3 poster size option
- **EXT-02**: Multiple poster styles/templates
- **EXT-03**: Batch AI poster generation with progress indicator

## Out of Scope

Explicitly excluded from v3.5.

| Feature | Reason |
|---------|--------|
| A3 poster size | A4 sufficient for v3.5, most school printers are A4 |
| Print directly (skip PDF) | Browser print from PDF is standard workflow |
| Cloud poster storage | File-based workflow matches existing Cue patterns |
| Poster editing before export | Adds complexity, teachers can edit slides before export |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEL-01 | Phase 38 | Complete |
| SEL-02 | Phase 38 | Complete |
| SEL-03 | Phase 38 | Complete |
| SEL-04 | Phase 38 | Complete |
| SEL-05 | Phase 38 | Complete |
| EXP-01 | Phase 39 | Complete |
| EXP-02 | Phase 39 | Complete |
| EXP-03 | Phase 39 | Complete |
| QEX-01 | Phase 39 | Complete |
| QEX-02 | Phase 39 | Complete |
| QEX-03 | Phase 39 | Complete |
| POS-01 | Phase 40 | Complete |
| POS-02 | Phase 40 | Complete |
| POS-03 | Phase 40 | Complete |
| POS-04 | Phase 40 | Complete |
| POS-05 | Phase 40 | Complete |
| POS-06 | Phase 40 | Complete |

**Coverage:**
- v3.5 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 — v3.5 milestone complete (all 17 requirements)*
