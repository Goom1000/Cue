# Requirements: Cue v3.7 AI Resource Enhancement

**Defined:** 2026-01-29
**Core Value:** Teachers can enhance their existing worksheets and handouts with AI while maintaining original intent, and slide content speaks directly to students.

## v3.7 Requirements

### Student-Friendly Slides

- [x] **SLIDE-01**: AI generates bullet points as conversational sentences directed at students
- [x] **SLIDE-02**: Bullet language adapts to grade level already set in Cue
- [x] **SLIDE-03**: Student-friendly style is the default for all new generations

### Resource Upload

- [x] **UPLOAD-01**: User can upload PDF resources (worksheets, handouts)
- [x] **UPLOAD-02**: User can upload image resources (PNG, JPG photos of worksheets)
- [x] **UPLOAD-03**: User can upload Word documents (.docx)
- [x] **UPLOAD-04**: System enforces file size limits (25MB max, 20 pages)
- [x] **UPLOAD-05**: User sees preview of uploaded resource before enhancement

### AI Enhancement

- [x] **ENHANCE-01**: AI enhances resource while preserving original content/facts (preserve mode default)
- [x] **ENHANCE-02**: AI generates differentiated versions (simple/standard/detailed)
- [x] **ENHANCE-03**: AI uses lesson context to align enhanced resources with slides
- [x] **ENHANCE-04**: AI generates answer key for worksheet exercises
- [x] **ENHANCE-05**: User can cancel enhancement in progress
- [x] **ENHANCE-06**: User can regenerate enhancement if unhappy with result

### Preview & Editing

- [x] **PREVIEW-01**: User sees enhanced resource preview before export
- [x] **PREVIEW-02**: User can edit enhanced content inline before export
- [x] **PREVIEW-03**: User sees visual diff showing what AI changed from original
- [x] **PREVIEW-04**: User can regenerate individual sections

### Export & Persistence

- [x] **EXPORT-01**: User can export enhanced resource as print-ready PDF
- [x] **EXPORT-02**: Enhanced resources persist in .cue save file
- [x] **EXPORT-03**: Enhanced resources restore when loading .cue file

## Future Requirements (v3.8+)

### Advanced Enhancement

- **ADV-01**: Batch enhancement of multiple resources at once
- **ADV-02**: Per-slide resource linking (worksheet linked to specific slide)
- **ADV-03**: Visual layout enhancement (graphics, colors, spacing)
- **ADV-04**: Template library for common worksheet types

### Collaboration

- **COLLAB-01**: Share enhanced resources with colleagues
- **COLLAB-02**: Resource library across presentations

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaborative editing | High complexity, not core to enhancement value |
| Cloud storage for resources | File-based sharing sufficient for team of 5 |
| OCR/Tesseract.js | Gemini vision superior, avoids 5MB+ bloat |
| Complex layout reconstruction | Tables/columns handled via multimodal AI, not manual parsing |
| Mobile-first resource upload | Web-first, teachers use desktop primarily |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SLIDE-01 | Phase 42 | Complete |
| SLIDE-02 | Phase 42 | Complete |
| SLIDE-03 | Phase 42 | Complete |
| UPLOAD-01 | Phase 43 | Complete |
| UPLOAD-02 | Phase 43 | Complete |
| UPLOAD-03 | Phase 43 | Complete |
| UPLOAD-04 | Phase 43 | Complete |
| UPLOAD-05 | Phase 43 | Complete |
| ENHANCE-01 | Phase 45 | Complete |
| ENHANCE-02 | Phase 45 | Complete |
| ENHANCE-03 | Phase 45 | Complete |
| ENHANCE-04 | Phase 45 | Complete |
| ENHANCE-05 | Phase 45 | Complete |
| ENHANCE-06 | Phase 45 | Complete |
| PREVIEW-01 | Phase 46 | Complete |
| PREVIEW-02 | Phase 46 | Complete |
| PREVIEW-03 | Phase 46 | Complete |
| PREVIEW-04 | Phase 46 | Complete |
| EXPORT-01 | Phase 47 | Complete |
| EXPORT-02 | Phase 47 | Complete |
| EXPORT-03 | Phase 47 | Complete |

**Coverage:**
- v3.7 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-01-31 — Phase 47 requirements complete (EXPORT-01 through EXPORT-03)*
