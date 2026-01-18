# Requirements: PiPi v1.1

**Defined:** 2026-01-18
**Core Value:** Students see only slides; teachers see slides + teleprompter

## v1.1 Requirements

Requirements for draggable preview window milestone.

### Preview Window Interaction

- [ ] **PREV-01**: User can drag preview window by clicking and holding center area
- [ ] **PREV-02**: Preview window can be positioned anywhere on screen (including over presentation area)
- [ ] **PREV-03**: Preview floats above all other UI (teacher-only layer)
- [ ] **PREV-04**: User can resize preview by dragging corners
- [ ] **PREV-05**: Minimum size enforced to keep content visible

### Snap-to-Grid

- [x] **PREV-06**: Toggle button on preview window enables/disables snap-to-grid
- [x] **PREV-07**: When enabled, window snaps to invisible grid positions during drag
- [x] **PREV-08**: Visual feedback shows snap state (button appearance changes)

### Persistence

- [x] **PREV-09**: Position persists across sessions (localStorage)
- [x] **PREV-10**: Size persists across sessions (localStorage)
- [x] **PREV-11**: Snap toggle state persists across sessions

## v2 Requirements

Deferred from previous milestones:

### Presentation Polish

- **PRES-03**: Elapsed time display showing presentation duration
- **PRES-04**: Fullscreen recovery (auto re-enter if exited)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multiple preview windows | Complexity not justified for single use case |
| Preview window on student display | Defeats purpose — students shouldn't see preview |
| Custom grid size configuration | Over-engineering — sensible default is enough |
| Animation during snap | Performance concern, adds no value |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PREV-01 | Phase 1 | Complete |
| PREV-02 | Phase 1 | Complete |
| PREV-03 | Phase 1 | Complete |
| PREV-04 | Phase 1 | Complete |
| PREV-05 | Phase 1 | Complete |
| PREV-06 | Phase 2 | Complete |
| PREV-07 | Phase 2 | Complete |
| PREV-08 | Phase 2 | Complete |
| PREV-09 | Phase 2 | Complete |
| PREV-10 | Phase 2 | Complete |
| PREV-11 | Phase 2 | Complete |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11
- Complete: 11 ✓

---
*Requirements defined: 2026-01-18*
*Last updated: 2026-01-18 — All v1.1 requirements complete*
