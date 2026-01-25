# Requirements: Cue v3.3

**Defined:** 2026-01-25
**Core Value:** Students see only the presentation; teachers see the teleprompter script

## v3.3 Requirements

Requirements for deck-wide verbosity. Extends v3.1 per-slide verbosity to apply across entire presentations.

### Upfront Selection

- [ ] **UPFR-01**: User can select verbosity level (Concise/Standard/Detailed) on landing page during upload
- [ ] **UPFR-02**: Selected verbosity level is used for initial slide generation
- [ ] **UPFR-03**: Default verbosity is Standard when no selection made

### Deck-wide Toggle

- [ ] **DECK-01**: Verbosity selector in presentation mode changes deck-wide level (not per-slide)
- [ ] **DECK-02**: Changing verbosity shows confirmation dialog with regeneration warning
- [ ] **DECK-03**: After confirmation, all slides regenerate at new verbosity level
- [ ] **DECK-04**: All per-slide caches are cleared when deck verbosity changes
- [ ] **DECK-05**: Loading indicator shows regeneration progress across all slides

### Persistence

- [ ] **PERS-01**: Deck verbosity level persists in .cue save file
- [ ] **PERS-02**: Loading a .cue file restores the saved verbosity level
- [ ] **PERS-03**: Backward compatibility with v2 files (default to Standard)

## Future Requirements

Deferred to later milestones.

### Student Assistance

- **STUD-01**: Teacher can type student question and get AI-generated answer in teleprompter
- **STUD-02**: AI answer uses slide context and age-appropriate language

### Onboarding

- **ONBR-01**: Guided walkthrough on first app launch
- **ONBR-02**: Contextual tooltips on major features

## Out of Scope

| Feature | Reason |
|---------|--------|
| Per-slide verbosity override | Complicates UX, deck-wide is simpler |
| Verbosity affects slide content | Only teleprompter changes, not student-visible content |
| Auto-regeneration without confirmation | Cost concerns, explicit user consent required |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UPFR-01 | 33 | Pending |
| UPFR-02 | 33 | Pending |
| UPFR-03 | 33 | Pending |
| DECK-01 | 34 | Pending |
| DECK-02 | 34 | Pending |
| DECK-03 | 34 | Pending |
| DECK-04 | 34 | Pending |
| DECK-05 | 34 | Pending |
| PERS-01 | 35 | Pending |
| PERS-02 | 35 | Pending |
| PERS-03 | 35 | Pending |

**Coverage:**
- v3.3 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-25 after roadmap creation*
