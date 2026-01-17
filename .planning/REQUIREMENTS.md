# Requirements: PiPi Dual-Monitor Student View

**Defined:** 2026-01-18
**Core Value:** Students see only slides; teachers see slides + teleprompter

## v1 Requirements

Requirements for rock-solid dual-monitor student view.

### Window Management

- [x] **WIN-01**: Student window launches reliably from a button click without popup blocker issues
- [x] **WIN-02**: Teacher view and student view are perfectly synchronized (same slide index, same bullet reveal count)
- [x] **WIN-03**: Student window displays only slide content (no teleprompter, no teacher controls visible)
- [ ] **WIN-04**: On Chromium browsers (Chrome, Edge, Arc, Opera, Brave), auto-detect secondary monitor and position student window there
- [ ] **WIN-05**: On non-Chromium browsers (Firefox, Safari), provide clear instructions for manually dragging window to projector

### Presentation Enhancements

- [ ] **PRES-01**: Support presenter remote navigation (Page Up/Down keyboard shortcuts for prev/next)
- [ ] **PRES-02**: Display next slide preview thumbnail in teacher view

### Resilience

- [ ] **RES-01**: Student window can be reopened if accidentally closed (button re-enables)
- [ ] **RES-02**: Visual sync status indicator shows whether student view is connected
- [ ] **RES-03**: Sync persists after page refresh (session can be reconnected)

## v2 Requirements

Deferred to future release.

### Presentation Enhancements

- **PRES-03**: Elapsed time display showing presentation duration
- **PRES-04**: Fullscreen recovery (auto re-enter if student exits fullscreen)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Annotation tools / laser pointer | Scope creep; PiPi is teleprompter-focused, not competing with PowerPoint on drawing |
| Student devices (each student on own phone/tablet) | High complexity; v1 focuses on classroom projector setup |
| Slide transitions / animations | Not core to teleprompter value; adds complexity |
| Video embedding | Storage/bandwidth concerns; existing image support sufficient |
| Cloud sync / authentication | Local-first for simplicity |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WIN-01 | Phase 1 | Complete |
| WIN-02 | Phase 1 | Complete |
| WIN-03 | Phase 1 | Complete |
| WIN-04 | Phase 2 | Pending |
| WIN-05 | Phase 2 | Pending |
| PRES-01 | Phase 3 | Pending |
| PRES-02 | Phase 3 | Pending |
| RES-01 | Phase 3 | Pending |
| RES-02 | Phase 3 | Pending |
| RES-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-01-18*
*Last updated: 2026-01-18 — Phase 1 requirements complete (WIN-01, WIN-02, WIN-03)*
