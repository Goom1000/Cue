# Requirements: Cue

**Defined:** 2026-01-24
**Core Value:** Students see only the presentation; teachers see the teleprompter script

## v3.1 Requirements

Requirements for Teleprompter Verbosity milestone.

### UI/Controls

- [ ] **VERB-01**: Teacher can see three verbosity levels (Concise / Standard / Detailed) in teleprompter panel
- [ ] **VERB-02**: Verbosity selector appears at top of teleprompter panel (below existing icons)
- [ ] **VERB-03**: Current verbosity level is visually highlighted
- [ ] **VERB-04**: Switching verbosity shows loading indicator while regenerating

### Verbosity Levels

- [ ] **VERB-05**: Concise mode produces very brief sentences (minimal guidance)
- [ ] **VERB-06**: Standard mode produces current balanced scripts (existing behavior, default)
- [ ] **VERB-07**: Detailed mode produces full sentences with transitions (script-like, read verbatim)

### Generation & Caching

- [ ] **VERB-08**: Teleprompter regenerates on-demand when verbosity changed
- [ ] **VERB-09**: Generated versions are cached per slide (instant switch-back)
- [ ] **VERB-10**: Cache persists in presentation state (survives refresh)

### Backward Compatibility

- [ ] **VERB-11**: Existing presentations default to Standard verbosity
- [ ] **VERB-12**: .cue/.pipi file format supports verbosity cache storage

## Future Requirements

Deferred to later milestones.

### Teleprompter Enhancements

- **TELE-01**: Regenerate teleprompter for single slide after edit
- **TELE-02**: Script mode (teleprompter content as main slide content for sharing)

### Slide Editing

- **EDIT-01**: Multi-select slides to merge into one
- **EDIT-02**: Elaborate slide insertion (deeper explanation)
- **EDIT-03**: Work Together slide insertion (collaborative activity)

### Settings/UX

- **SET-01**: Model selection dropdown in settings
- **SET-02**: Tooltips and onboarding walkthrough

## Out of Scope

| Feature | Reason |
|---------|--------|
| Verbosity selection at generation time | Teacher prefers mid-lesson switching |
| All 3 versions generated upfront | Slower initial generation, on-demand is sufficient |
| Per-slide verbosity override | Complexity; global toggle covers use case |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VERB-01 | Phase 27 | Pending |
| VERB-02 | Phase 27 | Pending |
| VERB-03 | Phase 27 | Pending |
| VERB-04 | Phase 27 | Pending |
| VERB-05 | Phase 27 | Pending |
| VERB-06 | Phase 27 | Pending |
| VERB-07 | Phase 27 | Pending |
| VERB-08 | Phase 27 | Pending |
| VERB-09 | Phase 28 | Pending |
| VERB-10 | Phase 28 | Pending |
| VERB-11 | Phase 28 | Pending |
| VERB-12 | Phase 28 | Pending |

**Coverage:**
- v3.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-24 - Traceability updated with phase mappings*
