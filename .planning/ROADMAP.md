# Roadmap: Cue v5.0 Smart Generation

## Overview

Cue v5.0 transforms slide generation from a single-pass AI call into a self-refining pipeline that automatically evaluates and fills content gaps, accepts supplementary teaching resources during generation, and tags slides with lesson phase metadata (Hook, I Do, We Do, We Do Together, You Do, Plenary). The work proceeds in four phases: foundation types and phase detection first (referenced by everything else), resource processing infrastructure second (pipeline needs it), the multi-pass pipeline orchestrator third (core value), and finally the visible UI layer that surfaces phase badges, resource injection, coverage scores, and provider parity.

## Milestones

<details>
<summary>Shipped milestones: v1.0 through v4.1 (Phases 1-64, 215 plans)</summary>

See MILESTONES.md for full history.

</details>

### v5.0 Smart Generation (In Progress)

**Milestone Goal:** Produce 80% complete slide decks on the first generation by auto-filling gaps, integrating uploaded resources, and tagging lesson phases -- so teachers rarely need manual fixes.

## Phases

- [x] **Phase 65: Foundation Types + Phase Detection** - Add LessonPhase type to Slide, build regex-based phase detection module, wire persistence
- [x] **Phase 66: Resource Processing + Upload** - Build PPTX processor, extend landing page with supplementary resource upload, wire persistence
- [ ] **Phase 67: Generation Pipeline** - Orchestrate multi-pass generation (generate, check coverage, fill gaps) with progress UI and graceful degradation
- [ ] **Phase 68: Phase-Aware UI + Resource Injection** - Surface phase badges, balance indicator, coverage score; inject resource content into generation prompts; dual-provider parity

## Phase Details

### Phase 65: Foundation Types + Phase Detection
**Goal**: Slides carry lesson phase metadata that persists across save/load and only applies to pedagogically structured decks
**Depends on**: Nothing (first phase)
**Requirements**: PHASE-01, PHASE-02, PHASE-06, PHASE-07
**Success Criteria** (what must be TRUE):
  1. After generation in Fresh or Blend mode, each slide has a lesson phase label (Hook, I Do, We Do, We Do Together, You Do, or Plenary)
  2. Phase detection correctly identifies phases using UK/Australian teaching terminology (e.g., "Modelled Practice" maps to I Do, "Independent Practice" maps to You Do)
  3. Generating in Refine mode produces slides with no phase labels (phase detection skipped)
  4. Saving a deck with phase labels and reloading it preserves all labels exactly
**Plans:** 2 plans

Plans:
- [x] 65-01-PLAN.md -- Types, phase patterns dictionary, and phase detector module (TDD)
- [x] 65-02-PLAN.md -- Wire phase detection into generation flow for both providers

### Phase 66: Resource Processing + Upload
**Goal**: Teachers can upload supplementary resources alongside their lesson plan and those resources are processed, stored, and ready for the generation pipeline to consume
**Depends on**: Phase 65
**Requirements**: RES-01, RES-02, RES-03, RES-05, RES-07
**Success Criteria** (what must be TRUE):
  1. Teacher can upload PDF, images, DOCX, and PPTX files as supplementary resources on the landing page alongside the lesson plan
  2. Uploaded PPTX files are parsed for text and images without any new npm dependencies (JSZip + DOMParser)
  3. Each resource's extracted content is capped at 2,000 characters (6,000 total across all resources) to prevent token overflow
  4. Resources persist in the .cue save file and are fully restored on reload
**Plans:** 2 plans

Plans:
- [x] 66-01-PLAN.md -- PPTX processor, upload service extension, content-capping utility
- [x] 66-02-PLAN.md -- Landing page UI, persistence (save/load v5), App state wiring

### Phase 67: Generation Pipeline
**Goal**: Slide generation automatically evaluates coverage against the lesson plan and fills gaps in a single flow, so teachers receive near-complete decks without manual gap checking
**Depends on**: Phase 66
**Requirements**: PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06, PIPE-07
**Success Criteria** (what must be TRUE):
  1. After clicking Generate, the pipeline runs three passes (generate slides, check coverage, fill gaps) and delivers a deck with critical and recommended gaps already filled
  2. A multi-stage progress indicator shows which pass is active (Generating, Checking Coverage, Filling Gaps) with a progress bar
  3. If gap analysis or gap filling fails mid-pipeline, the teacher still receives the Pass 1 slides with a warning toast -- no blank screen or error state
  4. Remaining nice-to-have gaps appear in the existing gap analysis panel for optional manual addition
  5. Gap slides insert at correct positions without corrupting existing slide order, and the teacher can cancel the pipeline at any point with partial results preserved
**Plans**: TBD

### Phase 68: Phase-Aware UI + Resource Injection
**Goal**: Phase labels, coverage scores, and resource content are visible and actionable in the editor -- teachers see what phase each slide belongs to, how complete their deck is, and resource content woven into generated slides
**Depends on**: Phase 67
**Requirements**: PHASE-03, PHASE-04, PHASE-05, RES-04, RES-06, PROV-01, PROV-02
**Success Criteria** (what must be TRUE):
  1. Each slide card in the editor sidebar shows a color-coded phase badge (e.g., green for Hook, blue for I Do) that the teacher can click to override via dropdown
  2. A phase balance indicator shows distribution across phases and flags any phase with 0% coverage
  3. Resources uploaded on the landing page appear pre-populated in ResourceHub without re-uploading
  4. AI weaves resource content into relevant slides with callout references (e.g., "[See: Case Study]") using the same prompt structure for both Gemini and Claude
  5. All pipeline features (coverage score, gap filling, phase detection, resource injection) produce identical results on both Gemini and Claude providers

## Progress

**Execution Order:** 65 -> 66 -> 67 -> 68

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 65. Foundation Types + Phase Detection | 2/2 | ✓ Complete | 2026-02-14 |
| 66. Resource Processing + Upload | 2/2 | ✓ Complete | 2026-02-14 |
| 67. Generation Pipeline | 0/TBD | Not started | - |
| 68. Phase-Aware UI + Resource Injection | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-14*
*Last updated: 2026-02-14 -- Phase 66 complete*
