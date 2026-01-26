# Roadmap: v3.5 Working Wall Export

**Milestone:** v3.5
**Goal:** Enable teachers to export selected slides as printable A4 PDFs for classroom "Working Wall" displays, with optional AI poster enhancement

**Depth:** Comprehensive
**Phases:** 3 (38-40)
**Requirements:** 17 total

## Overview

v3.5 enables teachers to select slides from their presentation and export them for classroom display. Teachers can either quick-export slides as-is (preserving class notes) or use AI Poster Mode to transform raw content into polished educational reference materials optimized for wall display.

## Phases

### Phase 38: Slide Selection UI

**Goal:** Teachers can select which slides to export for Working Wall display

**Dependencies:** None (first phase of milestone)

**Plans:** 1 plan

Plans:
- [x] 38-01-PLAN.md - Add selection state, checkbox UI, and toolbar controls

**Requirements:**
- SEL-01: Teacher can toggle selection checkbox on each slide thumbnail
- SEL-02: Selected slides show visual indicator (highlight, checkmark, or border)
- SEL-03: Selection count displays when 1+ slides selected
- SEL-04: "Select All" button selects all slides at once
- SEL-05: "Deselect All" button clears all selections

**Success Criteria:**
1. Teacher can click on slide thumbnails to toggle selection state
2. Selected slides are visually distinguishable from unselected slides
3. Selection count updates in real-time as teacher selects/deselects
4. Teacher can select all slides with one click
5. Teacher can clear all selections with one click

---

### Phase 39: Export Infrastructure

**Goal:** Teachers can export selected slides as A4 PDFs with exact content preservation

**Dependencies:** Phase 38 (requires slide selection)

**Plans:** 1 plan

Plans:
- [x] 39-01-PLAN.md - Export modal with Quick Export PDF generation

**Requirements:**
- EXP-01: "Export for Working Wall" button appears when 1+ slides selected
- EXP-02: Export button opens modal with export mode options
- EXP-03: Modal shows preview of selected slides before export
- QEX-01: "Quick Export" option exports slides as-is to A4 PDF
- QEX-02: PDF preserves exact slide content (what teacher wrote during class)
- QEX-03: PDF downloads automatically after generation

**Success Criteria:**
1. Export button only appears when at least one slide is selected
2. Export modal displays with Clear options for Quick Export vs AI Poster modes
3. Teacher can preview which slides will be exported before confirming
4. Quick Export produces A4 PDF with exact slide content (no AI modification)
5. PDF downloads automatically with no additional user action required

---

### Phase 40: AI Poster Mode

**Goal:** Teachers can transform selected slides into educational wall posters with AI enhancement

**Dependencies:** Phase 39 (requires export modal infrastructure)

**Plans:** 2 plans

Plans:
- [ ] 40-01-PLAN.md - AI poster generation service (types, claudeProvider extension, posterService)
- [ ] 40-02-PLAN.md - UI integration and PDF export (PosterRenderer, ExportModal updates)

**Requirements:**
- POS-01: "AI Poster" option transforms slides into educational posters
- POS-02: AI analyzes slide content and surrounding slides for context
- POS-03: AI generates poster with larger text optimized for wall display
- POS-04: AI creates clearer visual hierarchy than original slide
- POS-05: AI explains concept clearly for student reference
- POS-06: Poster output as A4 PDF download

**Success Criteria:**
1. Teacher can select AI Poster mode from export modal
2. AI-generated poster visibly differs from original slide (larger text, clearer hierarchy)
3. Poster content reflects understanding of surrounding slide context
4. Poster explains the concept in student-friendly language
5. Poster PDF downloads in A4 format ready for printing

---

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 38 | Slide Selection UI | SEL-01, SEL-02, SEL-03, SEL-04, SEL-05 | ✓ Complete |
| 39 | Export Infrastructure | EXP-01, EXP-02, EXP-03, QEX-01, QEX-02, QEX-03 | ✓ Complete |
| 40 | AI Poster Mode | POS-01, POS-02, POS-03, POS-04, POS-05, POS-06 | Planned |

**Coverage:** 17/17 requirements mapped

---
*Roadmap created: 2026-01-27*
*Last updated: 2026-01-27 — Phase 40 planned (2 plans)*
