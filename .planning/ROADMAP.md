# Roadmap: PiPi v2.2

**Milestone:** Flexible Upload & Class Bank
**Phases:** 4 (Phase 8-11)
**Depth:** Standard (YOLO mode)
**Coverage:** 15/15 requirements mapped

## Overview

This milestone adds two independent feature sets: flexible PDF upload (lesson plans, existing presentations, or both) and a class bank for saving/loading student lists. Teachers gain more input options and can reuse their class rosters across presentations.

---

## Phase 8: Flexible Upload UI ✓

**Goal:** Teachers can upload lesson PDFs, existing presentations (as PDF), or both from the landing page.

**Dependencies:** None (landing page already has PDF upload)

**Requirements:** UPLOAD-01, UPLOAD-02, UPLOAD-03, UPLOAD-04

**Plans:** 1 plan

Plans:
- [x] 08-01-PLAN.md - Dual upload zones, state management, mode indicator

**Completed:** 2026-01-19

**Success Criteria:**
1. Landing page shows two upload zones: "Lesson Plan PDF" and "Existing Presentation (PDF)"
2. Teacher can upload lesson PDF only and proceed to generation (current behavior preserved)
3. Teacher can upload existing presentation PDF only and proceed to generation
4. Teacher can upload both files together and proceed to generation
5. Clear visual indication of which files are uploaded and which mode will be used

---

## Phase 9: AI Adaptation Logic ✓

**Goal:** AI generates appropriate content based on what files are uploaded (fresh, refine, or blend mode).

**Dependencies:** Phase 8 (upload UI provides files and mode)

**Requirements:** UPLOAD-05, UPLOAD-06, UPLOAD-07

**Plans:** 3 plans

Plans:
- [x] 09-01-PLAN.md - Types and Claude provider mode-specific prompts
- [x] 09-02-PLAN.md - Gemini service and provider mode-specific prompts
- [x] 09-03-PLAN.md - App.tsx integration and end-to-end verification

**Completed:** 2026-01-20

**Success Criteria:**
1. When existing presentation only: AI produces less text-dense slides with proper structure (refine mode)
2. When both files provided: AI uses lesson content to enhance existing slides (blend mode)
3. Generated slides reflect teacher's original style and preferences when adapting existing presentation
4. Teleprompter scripts generated for all modes (not just fresh generation)

---

## Phase 10: Class Bank Core

**Goal:** Teachers can save and load student lists that persist across all presentations.

**Dependencies:** None (editor already has student name input)

**Requirements:** CLASS-01, CLASS-02, CLASS-03, CLASS-04

**Plans:** 2 plans

Plans:
- [ ] 10-01-PLAN.md - Types, useClassBank hook, and save modal
- [ ] 10-02-PLAN.md - Load dropdown, App.tsx integration, and verification

**Success Criteria:**
1. Teacher can save current student list with a custom name (e.g., "Period 1 Math")
2. Teacher can load a saved class to instantly populate the student list
3. Saved classes persist in localStorage and survive browser close
4. Classes are available in any presentation on the same device (not tied to specific .pipi file)

---

## Phase 11: Class Management UI

**Goal:** Teachers can view, rename, edit, and delete their saved classes.

**Dependencies:** Phase 10 (class bank storage exists)

**Requirements:** CLASS-05, CLASS-06, CLASS-07, CLASS-08

**Success Criteria:**
1. Teacher can view a list of all saved classes with student counts
2. Teacher can rename any saved class
3. Teacher can edit the student list within a saved class
4. Teacher can delete a saved class with confirmation

---

## Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 8 | Flexible Upload UI | ✓ Complete | 1 |
| 9 | AI Adaptation Logic | ✓ Complete | 3 |
| 10 | Class Bank Core | Planned | 2 |
| 11 | Class Management UI | Not Started | 0 |

---
*Roadmap created: 2026-01-19*
*Last updated: 2026-01-20*
