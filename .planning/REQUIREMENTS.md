# Requirements: Cue v3.8 Preserve Teacher Content

**Defined:** 2026-02-01
**Core Value:** Teachers' specific questions and activities appear verbatim in generated slides and teleprompter

## v3.8 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Detection

- [ ] **DET-01**: Detect questions by punctuation (sentences ending with `?`)
- [ ] **DET-02**: Detect questions by context ("Ask:", "Ask students:", question-related headings)
- [ ] **DET-03**: Detect activities by instructional language (action verbs like "list", "discuss", "complete")
- [ ] **DET-04**: Detection works on lesson plan PDF input
- [ ] **DET-05**: Detection works on PowerPoint input (Refine/Blend modes)

### Preservation

- [ ] **PRES-01**: Preserved questions appear verbatim on slides
- [ ] **PRES-02**: Preserved questions appear in teleprompter with delivery context
- [ ] **PRES-03**: Preserved activities appear verbatim on slides
- [ ] **PRES-04**: Preserved activities appear in teleprompter with delivery context
- [ ] **PRES-05**: Preservation works in Fresh mode (lesson plan only)
- [ ] **PRES-06**: Preservation works in Refine mode (existing presentation)
- [ ] **PRES-07**: Preservation works in Blend mode (lesson + presentation)

### Quality

- [ ] **QUAL-01**: Non-preserved content maintains student-friendly language
- [ ] **QUAL-02**: Slide flow remains coherent around preserved elements
- [ ] **QUAL-03**: Teleprompter quality does not degrade
- [ ] **QUAL-04**: Existing slide layouts continue to work correctly

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
| DET-01 | TBD | Pending |
| DET-02 | TBD | Pending |
| DET-03 | TBD | Pending |
| DET-04 | TBD | Pending |
| DET-05 | TBD | Pending |
| PRES-01 | TBD | Pending |
| PRES-02 | TBD | Pending |
| PRES-03 | TBD | Pending |
| PRES-04 | TBD | Pending |
| PRES-05 | TBD | Pending |
| PRES-06 | TBD | Pending |
| PRES-07 | TBD | Pending |
| QUAL-01 | TBD | Pending |
| QUAL-02 | TBD | Pending |
| QUAL-03 | TBD | Pending |
| QUAL-04 | TBD | Pending |

**Coverage:**
- v3.8 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after initial definition*
