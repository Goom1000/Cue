# Requirements: Cue v3.8 Preserve Teacher Content

**Defined:** 2026-02-01
**Core Value:** Teachers' specific questions and activities appear verbatim in generated slides and teleprompter

## v3.8 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Detection

- [x] **DET-01**: Detect questions by punctuation (sentences ending with `?`)
- [x] **DET-02**: Detect questions by context ("Ask:", "Ask students:", question-related headings)
- [x] **DET-03**: Detect activities by instructional language (action verbs like "list", "discuss", "complete")
- [x] **DET-04**: Detection works on lesson plan PDF input
- [x] **DET-05**: Detection works on PowerPoint input (Refine/Blend modes)

### Preservation

- [x] **PRES-01**: Preserved questions appear verbatim on slides
- [x] **PRES-02**: Preserved questions appear in teleprompter with delivery context
- [x] **PRES-03**: Preserved activities appear verbatim on slides
- [x] **PRES-04**: Preserved activities appear in teleprompter with delivery context
- [x] **PRES-05**: Preservation works in Fresh mode (lesson plan only)
- [x] **PRES-06**: Preservation works in Refine mode (existing presentation)
- [x] **PRES-07**: Preservation works in Blend mode (lesson + presentation)

### Quality

- [x] **QUAL-01**: Non-preserved content maintains student-friendly language
- [x] **QUAL-02**: Slide flow remains coherent around preserved elements
- [x] **QUAL-03**: Teleprompter quality does not degrade
- [x] **QUAL-04**: Existing slide layouts continue to work correctly

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Differentiators

- **DIFF-01**: Verbosity independence — preserved content stays fixed while surrounding content adapts to verbosity level
- **DIFF-02**: Detection of math problems and formulas for preservation
- **DIFF-03**: Detection of resource references for preservation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Manual markup syntax | Teachers shouldn't need to tag their content — automatic detection is the value |
| Visual preservation indicators | Added UI complexity with unclear value — may revisit based on feedback |
| Blocking validation | Shouldn't prevent generation if preservation fails — just best-effort |
| Answer key generation | Separate feature, not part of preservation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DET-01 | Phase 48 | Complete |
| DET-02 | Phase 48 | Complete |
| DET-03 | Phase 48 | Complete |
| DET-04 | Phase 48 | Complete |
| DET-05 | Phase 48 | Complete |
| PRES-01 | Phase 49 | Complete |
| PRES-02 | Phase 49 | Complete |
| PRES-03 | Phase 49 | Complete |
| PRES-04 | Phase 49 | Complete |
| PRES-05 | Phase 49 | Complete |
| PRES-06 | Phase 49 | Complete |
| PRES-07 | Phase 49 | Complete |
| QUAL-01 | Phase 50 | Complete |
| QUAL-02 | Phase 50 | Complete |
| QUAL-03 | Phase 50 | Complete |
| QUAL-04 | Phase 50 | Complete |

**Coverage:**
- v3.8 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 — All requirements complete, v3.8 milestone complete*
