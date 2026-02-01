# Requirements: Cue v3.9 Delay Answer Reveal

**Defined:** 2026-02-01
**Core Value:** Students see only the presentation; teachers see the teleprompter script with scaffolding guidance

## v3.9 Requirements

Requirements for Delay Answer Reveal milestone. AI-generated slides separate problems from answers with scaffolding strategies in the teleprompter.

### Detection

- [x] **DET-01**: Detect teachable moments by pattern (Q&A pairs, definitions, math with results, cause-effect conclusions)
- [x] **DET-02**: Conservative detection threshold (<30% of bullets flagged to preserve lesson flow)
- [x] **DET-03**: Classify content type (math, vocabulary, comprehension, science) for scaffolding selection
- [x] **DET-04**: Pair problems with their answers (within proximity threshold)

### Restructuring

- [x] **RST-01**: Split problem/answer into separate progressive bullets during generation
- [x] **RST-02**: Problem bullet appears first with no answer leakage
- [x] **RST-03**: Answer bullet appears as next progressive reveal
- [x] **RST-04**: Maintain natural lesson flow (no awkward transitions)

### Scaffolding

- [x] **SCF-01**: Generate strategy steps in teleprompter between problem and answer
- [x] **SCF-02**: Include 2-3 question prompts per delayed answer
- [x] **SCF-03**: Scaffolding matches content complexity (not generic "What do you think?")
- [x] **SCF-04**: Subject-specific scaffolding templates (math decomposition, vocabulary context, reading evidence)
- [x] **SCF-05**: Scaffolding is verbally deliverable (<20 words per prompt)

### Quality

- [ ] **QUA-01**: No answer leakage in problem statement or scaffolding
- [ ] **QUA-02**: Detection works across lesson plan formats (various teachers' styles)
- [ ] **QUA-03**: Works with both Gemini and Claude providers

## Future Requirements

Deferred to later milestones.

### Pedagogical Phase Awareness

- **PED-01**: Heavier scaffolding in "I Do" sections, lighter in "You Do"
- **PED-02**: Graduated intensity (full scaffolding early, minimal late)

### Hint Progression

- **HNT-01**: Gentle -> medium -> strong hint sequence option
- **HNT-02**: Teacher controls hint reveal timing

## Out of Scope

Explicitly excluded from v3.9.

| Feature | Reason |
|---------|--------|
| Timer/countdown on student screen | Creates anxiety, removes teacher control |
| Automated reveal after N seconds | Teacher must control pacing |
| Per-student tracking during presentation | Over-engineering for classroom use |
| Complex branching paths | Adds complexity without clear value |
| Retrofit existing presentations | New generations only per user scope |
| Visual badges in editor | Nice-to-have, not core functionality |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status | Notes |
|-------------|-------|--------|-------|
| DET-01 | Phase 51 | Complete | |
| DET-02 | Phase 51 | Complete | |
| DET-03 | Phase 51 | Complete | |
| DET-04 | Phase 51 | Complete | |
| RST-01 | Phase 52 | Complete | |
| RST-02 | Phase 52 | Complete | |
| RST-03 | Phase 52 | Complete | |
| RST-04 | Phase 52 | Complete | |
| SCF-01 | Phase 52 | Complete | |
| SCF-02 | Phase 52 | Complete | |
| SCF-03 | Phase 52 | Complete | |
| SCF-04 | Phase 52 | Complete | 5 content-specific templates (math, vocabulary, comprehension, science, general) |
| SCF-05 | Phase 53 | Complete | Word count constraints (<20 words) added to all templates |
| QUA-01 | Phase 54 | Pending | |
| QUA-02 | Phase 54 | Pending | |
| QUA-03 | Phase 54 | Pending | |

**Coverage:**
- v3.9 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 - Phase 53 requirements marked Complete*
