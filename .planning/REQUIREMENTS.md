# Requirements: Cue v4.1 Script Mode (Share with Colleague)

**Defined:** 2026-02-08
**Core Value:** Teachers can export any Cue deck as a self-contained presentation that colleagues can deliver without Cue — AI transforms teleprompter scripts into expanded talking-point bullets alongside images.

## v4.1 Requirements

Requirements for Script Mode export. Each maps to roadmap phases.

### AI Transformation

- [ ] **TRANSFORM-01**: AI transforms teleprompter script into 4-7 expanded talking-point bullets per slide
- [ ] **TRANSFORM-02**: Transformed bullets are action-oriented, self-contained, and preserve teaching examples, analogies, and interaction cues from the original script
- [ ] **TRANSFORM-03**: AI processes slides in batches with deck-level context for narrative coherence across the export
- [ ] **TRANSFORM-04**: Special slide types (pasted, Work Together, Class Challenge) are handled with appropriate transformation rules
- [ ] **TRANSFORM-05**: Verbosity cache is resolved correctly (uses active teleprompter text matching deck verbosity setting)
- [ ] **TRANSFORM-06**: Both Gemini and Claude providers support the transformation method

### PPTX Export

- [ ] **PPTX-01**: User can export script version as a PPTX file with expanded bullets and images
- [ ] **PPTX-02**: Script-mode PPTX uses a dedicated layout with reduced font size (16-18pt) and expanded text area to prevent overflow
- [ ] **PPTX-03**: Slide images are preserved in the PPTX export alongside expanded text
- [ ] **PPTX-04**: Slide titles are preserved for topic orientation
- [ ] **PPTX-05**: Exported file has a sensible filename (deck title + "Script Version" suffix)

### PDF Export

- [ ] **PDF-01**: User can export script version as a PDF with expanded bullets and images
- [ ] **PDF-02**: PDF uses readable text rendering (not blurry rasterized text)
- [ ] **PDF-03**: PDF layout presents slides with images and expanded talking points in a print-friendly format

### Share UI

- [ ] **UI-01**: "Share with colleague" button is accessible from the editor page
- [ ] **UI-02**: Share dialog allows choosing between PPTX and PDF export formats
- [ ] **UI-03**: Progress indicator shows transformation status during AI processing ("Transforming slides X of Y...")
- [ ] **UI-04**: Optional preview of script-version slides is available before downloading
- [ ] **UI-05**: Export triggers automatic file download (no cloud flows or accounts)
- [ ] **UI-06**: Error handling with user feedback via toast notifications

## Future Requirements

Deferred to v4.2+. Tracked but not in current roadmap.

### Share Enhancements

- **SHARE-01**: Cover slide with delivery instructions for the colleague
- **SHARE-02**: Teacher name attribution on exported deck
- **SHARE-03**: Per-slide regeneration in preview (re-transform individual slides before export)
- **SHARE-04**: Editable script-version slides in-app before export

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Generation-time "Script Mode" toggle | Export-time transformation is simpler and non-destructive |
| Editable script slides in-app | Creates two parallel decks to maintain — massive complexity |
| Cloud sharing / link-based sharing | Outside scope for local SPA |
| Verbosity selection for script version | Uses deck's existing verbosity as input |
| Dual-format export (PPTX + PDF in one click) | Confusing — let teacher choose one format |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TRANSFORM-01 | Phase 61 | Pending |
| TRANSFORM-02 | Phase 61 | Pending |
| TRANSFORM-03 | Phase 61 | Pending |
| TRANSFORM-04 | Phase 61 | Pending |
| TRANSFORM-05 | Phase 61 | Pending |
| TRANSFORM-06 | Phase 61 | Pending |
| PPTX-01 | Phase 62 | Pending |
| PPTX-02 | Phase 62 | Pending |
| PPTX-03 | Phase 62 | Pending |
| PPTX-04 | Phase 62 | Pending |
| PPTX-05 | Phase 62 | Pending |
| PDF-01 | Phase 64 | Pending |
| PDF-02 | Phase 64 | Pending |
| PDF-03 | Phase 64 | Pending |
| UI-01 | Phase 63 | Pending |
| UI-02 | Phase 63 | Pending |
| UI-03 | Phase 63 | Pending |
| UI-04 | Phase 63 | Pending |
| UI-05 | Phase 63 | Pending |
| UI-06 | Phase 63 | Pending |

**Coverage:**
- v4.1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after roadmap creation*
