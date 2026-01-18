# Roadmap: PiPi v1.1

## Overview

Transform the fixed-position next slide preview into a fully interactive floating window. Phase 1 delivers drag, resize, and float-above-all behavior. Phase 2 adds snap-to-grid positioning and session persistence so teachers don't have to reposition the preview every time.

## Milestones

- v1.0 Dual-Monitor Student View (shipped 2026-01-18)
  See: .planning/milestones/v1.0-ROADMAP.md
- **v1.1 Draggable Preview Window** - Phases 1-2 (in progress)

## Phases

- [x] **Phase 1: Drag, Resize & Float** - Core preview window interaction ✓
- [ ] **Phase 2: Snap-to-Grid & Persistence** - Smart positioning and memory

## Phase Details

### Phase 1: Drag, Resize & Float
**Goal**: Teacher can move and resize the preview window freely
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: PREV-01, PREV-02, PREV-03, PREV-04, PREV-05
**Success Criteria** (what must be TRUE):
  1. Teacher can click and drag preview window center to any position on screen
  2. Preview window stays above all other UI elements (slides, controls, teleprompter)
  3. Teacher can drag preview corners to resize the window
  4. Preview cannot be resized below minimum readable size (content remains visible)
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Implement drag, resize, float with react-rnd ✓

### Phase 2: Snap-to-Grid & Persistence
**Goal**: Preview remembers position and can snap to neat grid positions
**Depends on**: Phase 1
**Requirements**: PREV-06, PREV-07, PREV-08, PREV-09, PREV-10, PREV-11
**Success Criteria** (what must be TRUE):
  1. Toggle button on preview window enables/disables snap-to-grid mode
  2. When snap enabled, dragging preview snaps to invisible grid positions
  3. Button visual clearly indicates current snap state (on vs off)
  4. After page refresh, preview appears in same position and size as before
  5. Snap toggle state persists across sessions (remembers on/off preference)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Drag, Resize & Float | 1/1 | ✓ Complete | 2026-01-18 |
| 2. Snap-to-Grid & Persistence | 0/? | Not started | - |

---
*Roadmap created: 2026-01-18*
*Last updated: 2026-01-18 — Phase 1 complete*
