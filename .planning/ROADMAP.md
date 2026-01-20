# Roadmap: PiPi v2.3 Bug Fixes

## Milestones

- [x] **v1.0 MVP** - Phases 1-3 (shipped 2026-01-18)
- [x] **v1.1 Draggable Preview** - Phases 4-5 (shipped 2026-01-18)
- [x] **v1.2 Permission Flow** - Phases 6-7 (shipped 2026-01-18)
- [x] **v2.0 Shareable Presentations** - Phases 8-9 (shipped 2026-01-19)
- [x] **v2.1 Landing Page & Branding** - Phases 9.1-9.2 (shipped 2026-01-19)
- [x] **v2.2 Flexible Upload & Class Bank** - Phases 10-11 (shipped 2026-01-20)
- [ ] **v2.3 Bug Fixes** - Phases 12-14 (in progress)

## Overview

Fix critical bugs affecting presentation experience: flowchart layout issues with misaligned arrows and wasted space, slide preview cutoff in teacher view, AI revision error handling, and game activity not syncing to student view. Three phases address CSS layout (simplest), error handling (API layer), and game sync (most complex).

## Phases

- [x] **Phase 12: CSS Layout Fixes** - Fix flowchart arrows, box spacing, and slide preview cutoff
- [ ] **Phase 13: AI Error Handling** - Add user-friendly error messages for AI revision failures
- [ ] **Phase 14: Game Sync** - Display game activity in student view with real-time state sync

## Phase Details

### Phase 12: CSS Layout Fixes
**Goal**: Flowcharts render with properly centered arrows and filled space; slide preview shows complete content
**Depends on**: Nothing (CSS-only changes)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03
**Success Criteria** (what must be TRUE):
  1. Flowchart arrows are vertically centered with their adjacent boxes
  2. Flowchart boxes fill available vertical space without large gaps below content
  3. Next slide preview in teacher view shows complete slide content (no cutoff at bottom or sides)
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — Fix flowchart layout and teacher view slide scaling

### Phase 13: AI Error Handling
**Goal**: AI slide revision fails gracefully with clear user feedback
**Depends on**: Nothing (independent fix)
**Requirements**: ERROR-01, ERROR-02
**Success Criteria** (what must be TRUE):
  1. When AI service fails (network error, rate limit), user sees friendly error message instead of app crash
  2. When AI returns malformed JSON, user sees parse error message with option to retry
  3. Error messages are specific enough for user to understand what went wrong
**Plans**: 1 plan

Plans:
- [ ] 13-01-PLAN.md — Add error handling to reviseSlide with retry logic and toast notifications

### Phase 14: Game Sync
**Goal**: Students see game activity when teacher opens quiz/game mode
**Depends on**: Nothing (independent feature fix)
**Requirements**: SYNC-01, SYNC-02, SYNC-03
**Success Criteria** (what must be TRUE):
  1. When teacher opens game activity, student view switches from slide to game display
  2. Game state syncs in real-time: question number changes, answer reveals
  3. When teacher closes game, student view returns to current slide
  4. Game display in student view matches teacher view content (same question, same state)
**Plans**: TBD

Plans:
- [ ] 14-01: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 12. CSS Layout Fixes | v2.3 | 1/1 | Complete | 2026-01-20 |
| 13. AI Error Handling | v2.3 | 0/1 | Planned | - |
| 14. Game Sync | v2.3 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-20*
*Last updated: 2026-01-20*
