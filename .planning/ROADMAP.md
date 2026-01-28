# Roadmap: Cue v3.6 Tooltips & Onboarding

## Overview

v3.6 adds feature discovery through contextual tooltips and per-screen walkthrough tours. Using driver.js (5kb) and Floating UI (3kb), we implement manual-trigger tours (3-5 steps each) for Landing, Editor, and Presentation screens, plus info icon tooltips explaining complex features. Infrastructure first, then progressive screen-by-screen rollout to avoid tour fatigue.

## Milestones

- v3.5 Working Wall Export - Phases 1-40 (shipped 2026-01-27)
- v3.6 Tooltips & Onboarding - Phases 41-44 (in progress)

## Phases

<details>
<summary>v3.5 Working Wall Export (Phases 1-40) - SHIPPED 2026-01-27</summary>

Previous milestone phases collapsed. See git history for details.

</details>

### v3.6 Tooltips & Onboarding (In Progress)

**Milestone Goal:** Help teachers discover and understand Cue's features through contextual tooltips and per-screen walkthrough tours.

#### Phase 41: Tour Infrastructure & Accessibility

**Goal:** Establish reusable tour and tooltip components with full keyboard accessibility

**Depends on:** Phase 40 (v3.5 complete)

**Requirements:** TOUR-01, TOUR-02, TOUR-03, TOUR-04, TOUR-05, TIP-01, TIP-02, TIP-03, A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05

**Success Criteria** (what must be TRUE):
1. User can trigger tours via button on any screen
2. User can skip/dismiss tours at any step using button or Escape key
3. Completed tours don't replay on next visit (state persists in localStorage)
4. User sees progress indicator showing current step and total steps
5. Tour overlay appears above all existing UI including modals (z-index 10000+)
6. User can navigate tours using keyboard (Tab, Enter, Escape)
7. User can trigger tooltips via keyboard focus, not just hover
8. Screen readers announce tour dialogs and tooltip content with proper ARIA labels

**Plans:** 4 plans

Plans:
- [x] 41-01-PLAN.md - Install driver.js and Floating UI, create InfoTooltip component
- [x] 41-02-PLAN.md - Implement useTourState hook with localStorage persistence
- [x] 41-03-PLAN.md - Create TourButton component and useTour hook with keyboard accessibility
- [x] 41-04-PLAN.md - Gap closure: Minimal integration to prove components work

#### Phase 42: Landing Page Tour & Tooltips

**Goal:** Guide new users through initial upload-to-generation workflow with contextual help

**Depends on:** Phase 41

**Requirements:** LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, TIP-04

**Success Criteria** (what must be TRUE):
1. User can take 3-5 step tour covering PDF upload zone, settings button, and generation options
2. Tour explains both lesson plan upload and existing presentation upload workflows
3. Tour highlights API key setup requirement before generation
4. Tour covers verbosity selector and explains purpose (detail level control)
5. Info tooltips appear next to upload zones, settings, and verbosity selector explaining each feature
6. Tour button is visible in landing page header/footer

**Plans:** TBD

Plans:
- [ ] 42-01: Build landing page tour with data-tour attributes
- [ ] 42-02: Add info tooltips to landing page features

#### Phase 43: Editor Tour & Tooltips

**Goal:** Help users master slide editing, insertion, and Class Bank features

**Depends on:** Phase 42

**Requirements:** EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, TIP-05

**Success Criteria** (what must be TRUE):
1. User can take 3-5 step tour covering slide thumbnails, Insert menu, slide editing, and Class Bank
2. Tour explains how to navigate slides using thumbnail sidebar
3. Tour demonstrates Insert menu with different slide types (Elaborate, Work Together, Class Challenge)
4. Tour shows how to edit slide content and teleprompter text
5. Tour highlights Class Bank feature for loading saved student lists
6. Info tooltips appear next to Insert menu options, Class Bank button, and Export button
7. Tour button is visible in editor header

**Plans:** TBD

Plans:
- [ ] 43-01: Build editor tour with data-tour attributes
- [ ] 43-02: Add info tooltips to editor features

#### Phase 44: Presentation Mode Tour & Tooltips

**Goal:** Guide teachers through live presentation controls without interrupting teaching

**Depends on:** Phase 43

**Requirements:** PRES-01, PRES-02, PRES-03, PRES-04, PRES-05, PRES-06, PRES-07, TIP-06

**Success Criteria** (what must be TRUE):
1. User can take 3-5 step tour covering teleprompter, student window, Targeted Questioning, and Ask AI
2. Tour explains teleprompter panel and how it helps teachers sound natural
3. Tour demonstrates student window launch button for projector display
4. Tour shows Targeted Questioning controls (grade level buttons, student cycling)
5. Tour highlights Ask AI feature for on-the-fly teaching assistance
6. Tour only triggers manually (never interrupts live teaching)
7. Tour button is visible in teleprompter header
8. Info tooltips appear next to Targeted Mode toggle, Verbosity selector, and Ask AI button
9. Tooltips explain pedagogical benefits (why use this feature, not just what it does)

**Plans:** TBD

Plans:
- [ ] 44-01: Build presentation mode tour with BroadcastChannel safety
- [ ] 44-02: Add context-aware tooltips to presentation controls

## Progress

**Execution Order:** Phases execute in numeric order: 41 -> 42 -> 43 -> 44

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 41. Tour Infrastructure & Accessibility | v3.6 | 4/4 | Complete | 2026-01-28 |
| 42. Landing Page Tour & Tooltips | v3.6 | 0/2 | Not started | - |
| 43. Editor Tour & Tooltips | v3.6 | 0/2 | Not started | - |
| 44. Presentation Mode Tour & Tooltips | v3.6 | 0/2 | Not started | - |

---

*Roadmap created: 2026-01-27*
*Last updated: 2026-01-28 - Phase 41 complete (4/4 plans, goal verified)*
