# Roadmap: Cue v3.7 AI Resource Enhancement

## Overview

Cue v3.7 enables teachers to enhance their existing worksheets and handouts with AI while maintaining original intent. Slide content speaks directly to students via prompt improvements, and a full resource enhancement pipeline supports PDF/image/Word upload, AI-powered differentiation, preview with trust UI, and print-ready export.

## Milestones

- v3.5 Working Wall Export - Phases 1-40 (shipped 2026-01-27)
- v3.6 Tooltips & Onboarding - Phase 41 complete (infrastructure only, phases 42-44 deferred)
- v3.7 AI Resource Enhancement - Phases 42-47 (in progress)

## Phases

<details>
<summary>v3.5 Working Wall Export (Phases 1-40) - SHIPPED 2026-01-27</summary>

Previous milestone phases collapsed. See git history for details.

</details>

<details>
<summary>v3.6 Tooltips & Onboarding (Phase 41) - DEFERRED</summary>

**Phase 41: Tour Infrastructure & Accessibility** - COMPLETE (2026-01-28)

Infrastructure complete. Phases 42-44 (Landing, Editor, Presentation tours) deferred to future milestone. Phase numbers 42-44 reused for v3.7.

</details>

### v3.7 AI Resource Enhancement (In Progress)

**Milestone Goal:** Teachers can enhance existing worksheets and handouts with AI while maintaining original intent, and slide content speaks directly to students.

---

#### Phase 42: Student-Friendly Slide Generation

**Goal:** Slide content speaks directly to students in age-appropriate language.

**Depends on:** Phase 41

**Requirements:** SLIDE-01, SLIDE-02, SLIDE-03

**Success Criteria:**
1. User generates slides and sees conversational sentences directed at students (not teacher notes)
2. Bullet language complexity matches the grade level setting (e.g., simpler for KS1 than A-Level)
3. Student-friendly style applies automatically to all new generations without extra user action

**Plans:** 2 plans

Plans:
- [x] 42-01-PLAN.md — Foundation: shared prompt rules and gradeLevel wiring
- [x] 42-02-PLAN.md — Integration: apply rules to both AI providers

---

#### Phase 43: Types and File Upload

**Goal:** Teachers can upload existing resources (worksheets, handouts) in common formats for AI enhancement.

**Depends on:** Phase 42

**Requirements:** UPLOAD-01, UPLOAD-02, UPLOAD-03, UPLOAD-04, UPLOAD-05

**Success Criteria:**
1. User can drag-and-drop or browse to upload PDF worksheets
2. User can upload images (PNG, JPG) of photographed worksheets
3. User can upload Word documents (.docx)
4. User sees clear error message when file exceeds 25MB or 20 pages
5. User sees preview thumbnail of uploaded resource before proceeding

**Plans:** 2 plans

Plans:
- [x] 43-01-PLAN.md — Foundation: types, document processors, upload service
- [x] 43-02-PLAN.md — UI: upload panel with drop zone, progress, preview

---

#### Phase 44: AI Document Analysis

**Goal:** AI understands uploaded documents before enhancement begins.

**Depends on:** Phase 43

**Requirements:** (Foundation for ENHANCE requirements - no direct mapping)

**Success Criteria:**
1. User sees document type detected (worksheet, handout, quiz, etc.)
2. User sees document structure identified (sections, exercises, answer blanks)
3. Analysis completes within 10 seconds for typical 2-page worksheet

**Plans:** TBD

**Note:** This phase provides the analysis foundation that Phase 45 enhancement builds upon. Uses multimodal AI (Gemini/Claude vision) per research recommendations.

---

#### Phase 45: Enhancement with Lesson Context

**Goal:** AI enhances resources while preserving original content and aligning with lesson context.

**Depends on:** Phase 44

**Requirements:** ENHANCE-01, ENHANCE-02, ENHANCE-03, ENHANCE-04, ENHANCE-05, ENHANCE-06

**Success Criteria:**
1. User receives enhanced resource that preserves all original facts/numbers/content (preserve mode default)
2. User can select differentiation level (simple/standard/detailed) and receives appropriately adapted content
3. User sees enhanced resource aligned with existing lesson slides (mentions same concepts, builds on lesson content)
4. User can generate answer key for worksheet exercises
5. User can cancel enhancement while it is processing
6. User can regenerate enhancement if unhappy with result

**Plans:** TBD

---

#### Phase 46: Preview, Edit, and Trust UI

**Goal:** Teachers can see, understand, and approve AI changes before committing.

**Depends on:** Phase 45

**Requirements:** PREVIEW-01, PREVIEW-02, PREVIEW-03, PREVIEW-04

**Success Criteria:**
1. User sees preview of enhanced resource before export
2. User can edit enhanced content inline (fix wording, adjust difficulty)
3. User sees visual diff highlighting what AI changed from original
4. User can regenerate individual sections that need improvement

**Plans:** TBD

---

#### Phase 47: Export and Persistence

**Goal:** Enhanced resources produce print-ready output and persist across sessions.

**Depends on:** Phase 46

**Requirements:** EXPORT-01, EXPORT-02, EXPORT-03

**Success Criteria:**
1. User can export enhanced resource as print-ready PDF
2. Enhanced resources save within .cue file when user saves presentation
3. Enhanced resources restore correctly when user loads .cue file

**Plans:** TBD

---

## Progress

**Execution Order:** Phases execute in numeric order: 42 -> 43 -> 44 -> 45 -> 46 -> 47

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 41. Tour Infrastructure | v3.6 | 4/4 | Complete | 2026-01-28 |
| 42. Student-Friendly Slides | v3.7 | 2/2 | Complete | 2026-01-29 |
| 43. Types and File Upload | v3.7 | 2/2 | Complete | 2026-01-29 |
| 44. AI Document Analysis | v3.7 | 0/TBD | Not started | - |
| 45. Enhancement with Lesson Context | v3.7 | 0/TBD | Not started | - |
| 46. Preview, Edit, and Trust UI | v3.7 | 0/TBD | Not started | - |
| 47. Export and Persistence | v3.7 | 0/TBD | Not started | - |

## Coverage Validation

| Requirement | Phase | Verified |
|-------------|-------|----------|
| SLIDE-01 | 42 | Yes |
| SLIDE-02 | 42 | Yes |
| SLIDE-03 | 42 | Yes |
| UPLOAD-01 | 43 | Yes |
| UPLOAD-02 | 43 | Yes |
| UPLOAD-03 | 43 | Yes |
| UPLOAD-04 | 43 | Yes |
| UPLOAD-05 | 43 | Yes |
| ENHANCE-01 | 45 | Yes |
| ENHANCE-02 | 45 | Yes |
| ENHANCE-03 | 45 | Yes |
| ENHANCE-04 | 45 | Yes |
| ENHANCE-05 | 45 | Yes |
| ENHANCE-06 | 45 | Yes |
| PREVIEW-01 | 46 | Yes |
| PREVIEW-02 | 46 | Yes |
| PREVIEW-03 | 46 | Yes |
| PREVIEW-04 | 46 | Yes |
| EXPORT-01 | 47 | Yes |
| EXPORT-02 | 47 | Yes |
| EXPORT-03 | 47 | Yes |

**Coverage:** 21/21 requirements mapped (100%)

---
*Roadmap created: 2026-01-27*
*Last updated: 2026-01-29 - Phase 43 complete (2 plans)*
