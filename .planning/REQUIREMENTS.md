# Requirements: PiPi v2.4 Targeted Questioning

**Defined:** 2026-01-21
**Core Value:** Teachers can call on specific students by ability level with AI-generated questions and answers

## v2.4 Requirements

Requirements for targeted questioning milestone. Each maps to roadmap phases.

### Question Generation

- [x] **QGEN-01**: AI generates question + expected answer for teleprompter
- [x] **QGEN-02**: Five difficulty levels (A/B/C/D/E) available as buttons
- [x] **QGEN-03**: Question difficulty matches selected grade level

### Student Grades

- [x] **GRAD-01**: Teacher can assign grade level (A/B/C/D/E) to each student in class bank
- [x] **GRAD-02**: Grade assignments persist in localStorage with class data
- [x] **GRAD-03**: Modal UI to view and edit student grade assignments

### Targeting Mode

- [ ] **TARG-01**: Toggle switch in teleprompter: Manual vs Targeted mode
- [ ] **TARG-02**: Manual mode: click grade -> generate question (current behavior)
- [ ] **TARG-03**: Targeted mode: click grade -> generate question + select student at that level

### Student Display

- [ ] **DISP-01**: Student name appears as overlay banner on student view
- [ ] **DISP-02**: Banner shows "Question for [Name]" format
- [ ] **DISP-03**: Banner synced to student view via BroadcastChannel

### Cycling Logic

- [ ] **CYCL-01**: Students at each grade level cycled in randomized order
- [ ] **CYCL-02**: Track which students have been asked per grade level
- [ ] **CYCL-03**: Auto-reshuffle and restart cycle when all students at level asked
- [ ] **CYCL-04**: Reset tracking when navigating to a new slide

## Future Requirements

Deferred to later milestones. Not in current roadmap.

### Elapsed Time & Presentation Controls

- **TIME-01**: Elapsed time display showing presentation duration
- **TIME-02**: Fullscreen recovery (auto re-enter if exited)

### Settings Enhancements

- **SETT-01**: Model selection dropdown in settings
- **SETT-02**: API calls this session counter
- **SETT-03**: Auto-save indicator in header

### Onboarding

- **ONBR-01**: Setup wizard with screenshots
- **ONBR-02**: Video walkthrough for API key setup

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Student self-identification on devices | Not needed for projector setup |
| Question history / analytics | Adds complexity, not core to v2.4 |
| Custom question bank | AI generation is sufficient |
| Voice-based student selection | Scope creep |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| QGEN-01 | Phase 16 | Complete |
| QGEN-02 | Phase 16 | Complete |
| QGEN-03 | Phase 16 | Complete |
| GRAD-01 | Phase 15 | Complete |
| GRAD-02 | Phase 15 | Complete |
| GRAD-03 | Phase 15 | Complete |
| TARG-01 | Phase 17 | Pending |
| TARG-02 | Phase 17 | Pending |
| TARG-03 | Phase 17 | Pending |
| DISP-01 | Phase 18 | Pending |
| DISP-02 | Phase 18 | Pending |
| DISP-03 | Phase 18 | Pending |
| CYCL-01 | Phase 17 | Pending |
| CYCL-02 | Phase 17 | Pending |
| CYCL-03 | Phase 17 | Pending |
| CYCL-04 | Phase 17 | Pending |

**Coverage:**
- v2.4 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-22 after Phase 16 complete*
