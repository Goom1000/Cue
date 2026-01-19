# Requirements: PiPi v2.2

**Defined:** 2026-01-19
**Core Value:** Students see only the presentation; teachers see the presentation plus a teleprompter script that lets them sound knowledgeable and natural without reading slides verbatim.

## v1 Requirements

Requirements for v2.2 Flexible Upload & Class Bank.

### Flexible Upload

- [ ] **UPLOAD-01**: Landing page shows option to upload existing presentation (as PDF)
- [ ] **UPLOAD-02**: Teacher can upload lesson PDF only (generates fresh slides)
- [ ] **UPLOAD-03**: Teacher can upload existing PPT (as PDF) only (AI refines it)
- [ ] **UPLOAD-04**: Teacher can upload both lesson PDF and existing PPT together
- [ ] **UPLOAD-05**: AI refines existing slides to PiPi format (less text-dense, proper structure)
- [ ] **UPLOAD-06**: AI uses lesson content to improve existing slides when both provided
- [ ] **UPLOAD-07**: AI preserves teacher's style/preferences when adapting

### Class Bank

- [ ] **CLASS-01**: Teacher can save current student list as a named class
- [ ] **CLASS-02**: Teacher can load a saved class to populate student list
- [ ] **CLASS-03**: Saved classes available across all presentations (same device)
- [ ] **CLASS-04**: Class bank stored in localStorage
- [ ] **CLASS-05**: Teacher can view all saved classes
- [ ] **CLASS-06**: Teacher can rename a saved class
- [ ] **CLASS-07**: Teacher can edit students within a saved class
- [ ] **CLASS-08**: Teacher can delete a saved class

## v2 Requirements

Deferred to future release.

- Model selection dropdown in settings
- Elapsed time display showing presentation duration
- Fullscreen recovery (auto re-enter if exited)
- Setup wizard with screenshots
- Auto-save indicator in header

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud-synced class lists | localStorage sufficient for single-device use |
| Import class from CSV/Excel | Manual entry is fine for small class sizes |
| PPT file parsing (native .pptx) | PDF export from PowerPoint is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UPLOAD-01 | TBD | Pending |
| UPLOAD-02 | TBD | Pending |
| UPLOAD-03 | TBD | Pending |
| UPLOAD-04 | TBD | Pending |
| UPLOAD-05 | TBD | Pending |
| UPLOAD-06 | TBD | Pending |
| UPLOAD-07 | TBD | Pending |
| CLASS-01 | TBD | Pending |
| CLASS-02 | TBD | Pending |
| CLASS-03 | TBD | Pending |
| CLASS-04 | TBD | Pending |
| CLASS-05 | TBD | Pending |
| CLASS-06 | TBD | Pending |
| CLASS-07 | TBD | Pending |
| CLASS-08 | TBD | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 after initial definition*
