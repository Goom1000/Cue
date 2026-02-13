# Requirements: Cue v5.0 Smart Generation

**Defined:** 2026-02-08
**Core Value:** Students see only the presentation; teachers see the teleprompter script that lets them sound knowledgeable and natural.

## v5.0 Requirements

Requirements for v5.0 milestone. Each maps to roadmap phases.

### Generation Pipeline

- [ ] **PIPE-01**: Generation pipeline automatically cross-references slides against lesson plan and fills critical/recommended gaps without manual intervention
- [ ] **PIPE-02**: Coverage score displays after generation showing percentage of lesson plan covered (e.g., "87% covered")
- [ ] **PIPE-03**: Multi-pass progress feedback shows which pipeline stage is active (generating → checking coverage → filling gaps) with progress bar
- [ ] **PIPE-04**: Pipeline degrades gracefully — if gap analysis fails, teacher still receives Pass 1 slides with a warning
- [ ] **PIPE-05**: Remaining nice-to-have gaps are shown in the existing gap analysis panel for optional manual addition
- [ ] **PIPE-06**: Gap slides insert at correct positions without corrupting existing slide order (single-pass merge)
- [ ] **PIPE-07**: Pipeline supports cancellation via AbortController — partial results from completed passes are preserved

### Resource Integration

- [ ] **RES-01**: Teacher can upload supplementary resources (PDF, images, DOCX, PPTX) alongside lesson plan on landing page
- [ ] **RES-02**: Uploaded resources are processed to extract text and images using existing document processors
- [ ] **RES-03**: PPTX files are parsed for text and images via JSZip + DOMParser (no new dependencies)
- [ ] **RES-04**: AI weaves resource content into relevant slides with callout references (e.g., "[See: Case Study]")
- [ ] **RES-05**: Resource content is capped per resource (2,000 chars) and total (6,000 chars) to prevent token overflow
- [ ] **RES-06**: Resources uploaded on landing page pre-populate ResourceHub (no re-uploading needed)
- [ ] **RES-07**: Resource references persist in .cue save file and survive save/load cycle

### Lesson Phase Detection

- [ ] **PHASE-01**: Slides are tagged with lesson phase (Hook, I Do, We Do, We Do Together, You Do, Plenary) after generation
- [ ] **PHASE-02**: Phase detection uses regex pattern matching on lesson plan text with comprehensive synonym dictionary (UK/Australian terminology)
- [ ] **PHASE-03**: Color-coded phase badges display on slide cards in the editor sidebar
- [ ] **PHASE-04**: Phase balance indicator shows distribution across phases with suggestions if any phase is 0%
- [ ] **PHASE-05**: Teacher can manually override phase labels by clicking the badge (dropdown selector)
- [ ] **PHASE-06**: Phase labels persist in .cue save file and display correctly on reload
- [ ] **PHASE-07**: Phase detection only applies to Fresh and Blend modes (not Refine — arbitrary PPTs don't follow GRR model)

### Dual-Provider Parity

- [ ] **PROV-01**: All new generation pipeline features work identically on both Gemini and Claude providers
- [ ] **PROV-02**: Resource content injection uses the same prompt structure for both providers

## Future Requirements

Deferred to v5.1 or later.

### Generation Pipeline

- **PIPE-F01**: Early preview — show slides after Pass 1 while pipeline continues in background
- **PIPE-F02**: Resource-aware gap analysis (gaps consider uploaded resources as "covered" content)

### Lesson Phases

- **PHASE-F01**: Phase labels visible in teleprompter during presentation mode
- **PHASE-F02**: Phase-aware gap analysis (gap fill slides respect phase boundaries for insertion position)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full canvas slide editor | Too complex, risks destabilizing 35k LOC codebase (deferred as annotation layer todo) |
| Animation timeline | Disconnects from teleprompter model, massive scope |
| New npm dependencies | Research confirmed zero new packages needed |
| AI-based phase detection | Regex handles finite vocabulary in 0ms vs 3s AI call; not needed |
| Automatic resource enhancement during generation | Resource integration (context injection) is separate from resource enhancement (differentiation) |
| Resource upload in Refine mode | Refine mode works with arbitrary PPTs; resource context would conflict |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 67 | Pending |
| PIPE-02 | Phase 67 | Pending |
| PIPE-03 | Phase 67 | Pending |
| PIPE-04 | Phase 67 | Pending |
| PIPE-05 | Phase 67 | Pending |
| PIPE-06 | Phase 67 | Pending |
| PIPE-07 | Phase 67 | Pending |
| RES-01 | Phase 66 | Pending |
| RES-02 | Phase 66 | Pending |
| RES-03 | Phase 66 | Pending |
| RES-04 | Phase 68 | Pending |
| RES-05 | Phase 66 | Pending |
| RES-06 | Phase 68 | Pending |
| RES-07 | Phase 66 | Pending |
| PHASE-01 | Phase 65 | Pending |
| PHASE-02 | Phase 65 | Pending |
| PHASE-03 | Phase 68 | Pending |
| PHASE-04 | Phase 68 | Pending |
| PHASE-05 | Phase 68 | Pending |
| PHASE-06 | Phase 65 | Pending |
| PHASE-07 | Phase 65 | Pending |
| PROV-01 | Phase 68 | Pending |
| PROV-02 | Phase 68 | Pending |

**Coverage:**
- v5.0 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-14 after roadmap creation*
