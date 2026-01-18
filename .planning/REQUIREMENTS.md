# Requirements: PiPi Dual-Monitor Student View

**Defined:** 2026-01-18
**Core Value:** Students see only slides; teachers see slides + teleprompter

## v1 Requirements

Requirements for rock-solid dual-monitor student view.

### Window Management

- [x] **WIN-01**: Student window launches reliably from a button click without popup blocker issues
- [x] **WIN-02**: Teacher view and student view are perfectly synchronized (same slide index, same bullet reveal count)
- [x] **WIN-03**: Student window displays only slide content (no teleprompter, no teacher controls visible)
- [x] **WIN-04**: On Chromium browsers (Chrome, Edge, Arc, Opera, Brave), auto-detect secondary monitor and position student window there
- [x] **WIN-05**: On non-Chromium browsers (Firefox, Safari), provide clear instructions for manually dragging window to projector

### Presentation Enhancements

- [x] **PRES-01**: Support presenter remote navigation (Page Up/Down keyboard shortcuts for prev/next)
- [x] **PRES-02**: Display next slide preview thumbnail in teacher view

### Resilience

- [x] **RES-01**: Student window can be reopened if accidentally closed (button re-enables)
- [x] **RES-02**: Visual sync status indicator shows whether student view is connected
- [x] **RES-03**: Sync persists after page refresh (session can be reconnected)

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
| WIN-04 | Phase 2 | Complete |
| WIN-05 | Phase 2 | Complete |
| PRES-01 | Phase 3 | Complete |
| PRES-02 | Phase 3 | Complete |
| RES-01 | Phase 3 | Complete |
| RES-02 | Phase 3 | Complete |
| RES-03 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-01-18*
*Last updated: 2026-01-18 — All v1 requirements complete*
