# Roadmap: PiPi Dual-Monitor Student View

## Overview

This milestone delivers rock-solid dual-monitor presentation functionality where students see only slides on a projector while teachers see slides plus teleprompter on their laptop. The journey progresses from fixing the core popup/sync issues (Phase 1), to automatic display targeting for Chromium users (Phase 2), to resilience features and presenter conveniences (Phase 3).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Reliable dual-window launch with BroadcastChannel sync
- [x] **Phase 2: Display Targeting** - Automatic projector placement for Chromium, fallback for others
- [x] **Phase 3: Resilience & Polish** - Recovery features and presenter conveniences

## Phase Details

### Phase 1: Foundation
**Goal**: Teacher can launch student window that stays synced with the teacher view
**Depends on**: Nothing (first phase)
**Requirements**: WIN-01, WIN-02, WIN-03
**Success Criteria** (what must be TRUE):
  1. Teacher clicks "Student View" button and a new window opens reliably (no popup blocker issues)
  2. Navigating slides in teacher view instantly updates the student window (same slide, same bullet reveal)
  3. Student window shows only slide content (no teleprompter, no controls visible)
  4. Student view works as a standalone /student route that can be opened manually if popup is blocked
**Plans**: 2 plans

Plans:
- [x] 01-01-sync-infrastructure-PLAN.md — Core types, BroadcastChannel hook, hash routing hook
- [x] 01-02-dual-window-views-PLAN.md — StudentView component, App.tsx routing, PresentationView refactor

### Phase 2: Display Targeting
**Goal**: Chromium users get automatic projector placement; others get clear instructions
**Depends on**: Phase 1
**Requirements**: WIN-04, WIN-05
**Success Criteria** (what must be TRUE):
  1. On Chrome/Edge with external monitor, student window automatically opens on the secondary display
  2. Permission prompt is preceded by explanation UI so teacher understands why
  3. On Firefox/Safari (or when permission denied), clear instructions appear for dragging window to projector
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Window Management API types and useWindowManagement hook
- [x] 02-02-PLAN.md — PermissionExplainer, ManualPlacementGuide components, PresentationView integration

### Phase 3: Resilience & Polish
**Goal**: Presentation survives interruptions and supports presenter remotes
**Depends on**: Phase 2
**Requirements**: RES-01, RES-02, RES-03, PRES-01, PRES-02
**Success Criteria** (what must be TRUE):
  1. If student window is closed, button re-enables and teacher can reopen it without losing position
  2. Visual indicator in teacher view shows whether student window is connected
  3. Sync survives page refresh (teacher can reconnect to existing student window session)
  4. Page Up/Down keyboard shortcuts navigate slides (for presenter remotes/clickers)
  5. Teacher view shows next slide preview thumbnail
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Resilience infrastructure (extended types, heartbeat hook, keyboard hook, ConnectionStatus, Toast)
- [x] 03-02-PLAN.md — Integration (StudentView heartbeat, PresentationView wiring, NextSlidePreview)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-01-18 |
| 2. Display Targeting | 2/2 | Complete | 2026-01-18 |
| 3. Resilience & Polish | 2/2 | Complete | 2026-01-18 |

---
*Roadmap created: 2026-01-18*
*Last updated: 2026-01-18 — Phase 3 complete, milestone complete*
