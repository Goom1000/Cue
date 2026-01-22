# Roadmap: PiPi v2.4 Targeted Questioning

**Created:** 2026-01-21
**Phases:** 4 (15-18)
**Requirements:** 16 mapped

## Overview

Enable teachers to call on specific students by ability level. Grade assignments stored in class bank, AI generates question + answer for teleprompter, targeted mode selects students at the requested grade level with randomized cycling, and selected student name appears on the student view.

## Phase 15: Student Grades

**Goal:** Teachers can assign and manage grade levels for each student in the class bank

**Dependencies:** None (foundation phase)

**Plans:** 3 plans

Plans:
- [x] 15-01-PLAN.md - Type and hook extension for grade data
- [x] 15-02-PLAN.md - UI integration and export/import preservation
- [x] 15-03-PLAN.md - Wire grade data through export/import flows (gap closure)

**Requirements:**
- GRAD-01: Teacher can assign grade level (A/B/C/D/E) to each student in class bank
- GRAD-02: Grade assignments persist in localStorage with class data
- GRAD-03: Modal UI to view and edit student grade assignments

**Success Criteria:**
1. Teacher can assign a grade level (A/B/C/D/E) to any student in the class bank
2. Grade assignments persist across browser sessions (localStorage)
3. Teacher can view all students with their assigned grades in a modal
4. Teacher can edit a student's grade level and see the change immediately
5. Saved classes include grade data when exported/imported

---

## Phase 16: Question Enhancement

**Goal:** AI-generated questions include expected answers visible only to teachers

**Dependencies:** None (independent of Phase 15)

**Plans:** 2 plans

Plans:
- [x] 16-01-PLAN.md - AI service layer: generateQuestionWithAnswer with structured output
- [x] 16-02-PLAN.md - UI: 5 difficulty buttons and answer display in teleprompter

**Requirements:**
- QGEN-01: AI generates question + expected answer for teleprompter
- QGEN-02: Five difficulty levels (A/B/C/D/E) available as buttons
- QGEN-03: Question difficulty matches selected grade level

**Success Criteria:**
1. When teacher clicks a difficulty button, AI generates both question and expected answer
2. Answer appears in teleprompter (teacher view only, not on student screen)
3. Five difficulty buttons (A/B/C/D/E) visible in teleprompter during presentation
4. Generated question difficulty matches the button clicked (A=hardest, E=easiest)

---

## Phase 17: Targeting Mode

**Goal:** Teachers can switch between manual questioning and targeted student selection with fair cycling

**Dependencies:** Phase 15 (needs grade assignments)

**Plans:** 3 plans

Plans:
- [x] 17-01-PLAN.md - Cycling state infrastructure (shuffle, types, helpers)
- [x] 17-02-PLAN.md - Mode toggle UI and conditional button rendering
- [x] 17-03-PLAN.md - Progress counter, expandable list, and integration polish

**Requirements:**
- TARG-01: Toggle switch in teleprompter: Manual vs Targeted mode
- TARG-02: Manual mode: click grade -> generate question (current behavior)
- TARG-03: Targeted mode: click grade -> generate question + select student at that level
- CYCL-01: Students at each grade level cycled in randomized order
- CYCL-02: Track which students have been asked per grade level
- CYCL-03: Auto-reshuffle and restart cycle when all students at level asked
- CYCL-04: Reset tracking when navigating to a new slide

**Success Criteria:**
1. Toggle switch in teleprompter allows switching between Manual and Targeted modes
2. In Manual mode, clicking a grade button generates a question without selecting a student
3. In Targeted mode, clicking a grade button generates a question AND selects a student at that grade level
4. Students at each grade level are called in randomized order (not alphabetical, not predictable)
5. Each student at a grade level is asked once before any student is repeated
6. When all students at a level have been asked, the cycle reshuffles and restarts
7. Navigating to a new slide resets the tracking (students can be asked again)

---

## Phase 18: Student Display

**Goal:** Selected student's name appears on the student view so the whole class sees who was called

**Dependencies:** Phase 17 (needs student selection)

**Requirements:**
- DISP-01: Student name appears as overlay banner on student view
- DISP-02: Banner shows "Question for [Name]" format
- DISP-03: Banner synced to student view via BroadcastChannel

**Success Criteria:**
1. When a student is selected in Targeted mode, their name appears on the student view
2. Banner displays "Question for [Name]" format (visible to whole class on projector)
3. Banner appears as overlay that doesn't disrupt slide content
4. Banner syncs instantly via BroadcastChannel (no delay)
5. Banner clears when question is dismissed or slide changes

---

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 15 | Student Grades | GRAD-01, GRAD-02, GRAD-03 | Complete |
| 16 | Question Enhancement | QGEN-01, QGEN-02, QGEN-03 | Complete |
| 17 | Targeting Mode | TARG-01, TARG-02, TARG-03, CYCL-01, CYCL-02, CYCL-03, CYCL-04 | Complete |
| 18 | Student Display | DISP-01, DISP-02, DISP-03 | Pending |

**Coverage:** 16/16 requirements mapped

---
*Roadmap created: 2026-01-21*
*Phase 15 planned: 2026-01-21*
*Phase 15 gap closure: 2026-01-21*
*Phase 15 complete: 2026-01-21*
*Phase 16 planned: 2026-01-22*
*Phase 16 complete: 2026-01-22*
*Phase 17 planned: 2026-01-22*
*Phase 17 complete: 2026-01-22*
