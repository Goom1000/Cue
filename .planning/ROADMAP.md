# Roadmap: Cue v3.3 Deck-wide Verbosity

## Overview

v3.3 extends the per-slide verbosity toggle from v3.1 to work deck-wide. Users select verbosity upfront during upload, can change it globally during presentation mode (with confirmation and full regeneration), and the setting persists in save files with backward compatibility.

## Milestones

- v1.0 through v3.2: Shipped (phases 1-32)
- **v3.3 Deck-wide Verbosity** - Phases 33-35 (in progress)

## Phases

- [x] **Phase 33: Upfront Verbosity Selection** - Verbosity selector on landing page during upload
- [x] **Phase 34: Deck-wide Verbosity Toggle** - Change verbosity for entire deck with confirmation
- [ ] **Phase 35: Persistence** - Save/load deck verbosity level with backward compatibility

## Phase Details

### Phase 33: Upfront Verbosity Selection
**Goal**: Users can choose their preferred verbosity level before generating slides
**Depends on**: Nothing (first phase of milestone)
**Requirements**: UPFR-01, UPFR-02, UPFR-03
**Success Criteria** (what must be TRUE):
  1. User sees verbosity selector (Concise/Standard/Detailed) on landing page near upload zones
  2. Selected verbosity level is passed to AI generation and used for initial teleprompter content
  3. When no selection is made, slides generate with Standard verbosity by default
**Plans**: 1 plan

Plans:
- [x] 33-01-PLAN.md — Extend AI pipeline with verbosity + add landing page selector UI

### Phase 34: Deck-wide Verbosity Toggle
**Goal**: Users can change verbosity for entire presentation with controlled regeneration
**Depends on**: Phase 33 (verbosity selection UI patterns)
**Requirements**: DECK-01, DECK-02, DECK-03, DECK-04, DECK-05
**Success Criteria** (what must be TRUE):
  1. Verbosity selector in teleprompter panel changes deck-wide level (not per-slide)
  2. Changing verbosity shows confirmation dialog warning about regeneration cost
  3. After confirmation, loading indicator shows regeneration progress across all slides
  4. All slides contain new teleprompter content at selected verbosity level
  5. Per-slide verbosity caches are cleared (fresh content only)
**Plans**: 1 plan

Plans:
- [x] 34-01-PLAN.md — Replace per-slide verbosity with deck-wide toggle + batch regeneration

### Phase 35: Persistence
**Goal**: Deck verbosity level survives save/load cycles
**Depends on**: Phase 34 (deck-wide verbosity must exist to persist)
**Requirements**: PERS-01, PERS-02, PERS-03
**Success Criteria** (what must be TRUE):
  1. Saving presentation includes deck verbosity level in .cue file
  2. Loading a .cue file with verbosity level restores that level
  3. Loading a v2 .cue file (no deck verbosity) defaults to Standard verbosity
**Plans**: 1 plan

Plans:
- [ ] 35-01-PLAN.md — Extend file format to v3 with deckVerbosity + wire save/load

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 33. Upfront Verbosity Selection | v3.3 | 1/1 | ✓ Complete | 2026-01-25 |
| 34. Deck-wide Verbosity Toggle | v3.3 | 1/1 | ✓ Complete | 2026-01-25 |
| 35. Persistence | v3.3 | 0/1 | Not started | - |

---
*Created: 2026-01-25*
*Last updated: 2026-01-25 — Phase 35 planned*
