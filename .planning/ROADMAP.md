# Roadmap: Cue v3.2 Pedagogical Slide Types

## Overview

v3.2 extends Cue's AI generation capabilities with four pedagogical slide features: Single Teleprompter Regeneration (updating one slide's script after manual edits), Elaborate slides (AI-generated deeper content with examples), Work Together slides (collaborative activities), and Class Challenge slides (live interactive student contribution capture). All features leverage existing React 19 + Gemini/Claude architecture with zero new dependencies.

## Milestones

- ✅ **v3.1 Teleprompter Verbosity** - Phases 27-28 (shipped 2026-01-25)
- 🚧 **v3.2 Pedagogical Slide Types** - Phases 29-32 (in progress)

## Phases

<details>
<summary>✅ v3.1 Teleprompter Verbosity (Phases 27-28) - SHIPPED 2026-01-25</summary>

### Phase 27: Verbosity UI & Cache Foundation
**Goal**: Enable verbosity selection with immediate visual feedback
**Plans**: 1 plan

Plans:
- [x] 27-01: Verbosity selector UI with cache structure

### Phase 28: Caching & Backward Compatibility
**Goal**: Persist verbosity cache and support v1 files
**Plans**: 1 plan

Plans:
- [x] 28-01: File format v2 with cache persistence and backward compatibility

</details>

### 🚧 v3.2 Pedagogical Slide Types (In Progress)

**Milestone Goal:** Extend Cue's pedagogical capabilities with AI-generated Elaborate/Work Together slides, live Class Challenge input, and single-slide script regeneration.

#### Phase 29: Single Teleprompter Regeneration
**Goal**: Teachers can regenerate script for one slide after manual edits
**Depends on**: Phase 28 (verbosity caching system)
**Requirements**: REGEN-01, REGEN-02, REGEN-03
**Success Criteria** (what must be TRUE):
  1. Teacher clicks button in teleprompter panel to regenerate current slide's script
  2. Regenerated script respects current verbosity level (Concise/Standard/Detailed)
  3. Regeneration uses surrounding slides for context coherence
  4. Cache updates without losing existing verbosity levels
**Plans**: 1 plan

Plans:
- [x] 29-01: Extend AI provider signature and add Regen button UI

#### Phase 30: Elaborate Slide Insertion
**Goal**: Teachers can insert AI-generated depth content expanding on current slide
**Depends on**: Phase 29 (validates AI provider extension pattern)
**Requirements**: ELAB-01, ELAB-02, ELAB-03, ELAB-04
**Success Criteria** (what must be TRUE):
  1. Teacher clicks "Elaborate" in + menu to insert slide
  2. AI generates 3-5 paragraphs with examples and context
  3. Generated content provides deeper understanding than original slide
  4. Teleprompter provides delivery guidance for detailed content
**Plans**: 1 plan

Plans:
- [ ] 30-01: Extend AI providers with generateElaborateSlide and add Elaborate button to InsertPoint

#### Phase 31: Work Together Slide Insertion
**Goal**: Teachers can insert AI-generated collaborative activities
**Depends on**: Phase 30 (same insertion pattern)
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04
**Success Criteria** (what must be TRUE):
  1. Teacher clicks "Work Together" in + menu to insert slide
  2. AI generates activity instructions for pairs with group-of-3 alternative
  3. Activity uses only basic classroom resources (pen, paper, whiteboard)
  4. Teleprompter shows facilitation notes for teacher
**Plans**: TBD

Plans:
- [ ] 31-01: [TBD during phase planning]

#### Phase 32: Class Challenge Interactive Slides
**Goal**: Teachers can capture live student contributions visible to projector
**Depends on**: Phase 31 (extends slide type system)
**Requirements**: CHAL-01, CHAL-02, CHAL-03, CHAL-04, CHAL-05, CHAL-06
**Success Criteria** (what must be TRUE):
  1. Teacher clicks "Class Challenge" in + menu to insert slide
  2. Teacher edits prompt/question at top of slide
  3. Teacher inputs student contributions during presentation
  4. Contributions display as styled cards on slide
  5. Contributions sync to student view in real-time
  6. Contributions become read-only when navigating away
**Plans**: TBD

Plans:
- [ ] 32-01: [TBD during phase planning]

## Progress

**Execution Order:**
Phases execute in numeric order: 29 → 30 → 31 → 32

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 27. Verbosity UI | 1/1 | Complete | 2026-01-24 |
| 28. Caching | 1/1 | Complete | 2026-01-25 |
| 29. Single Regeneration | 1/1 | Complete | 2026-01-25 |
| 30. Elaborate Slides | 0/1 | Not started | - |
| 31. Work Together Slides | 0/? | Not started | - |
| 32. Class Challenge Slides | 0/? | Not started | - |

---

**Phase Numbering:**
- Integer phases (29, 30, 31, 32): Planned milestone work
- Decimal phases (29.1, 29.2): Urgent insertions via `/gsd:insert-phase`

Decimal phases execute between their surrounding integers (e.g., 29 → 29.1 → 29.2 → 30).
