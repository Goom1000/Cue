# Roadmap: PiPi v2.0 Shareable Presentations

## Overview

Transform PiPi from a personal tool into a shareable application colleagues can use. Users configure their own AI provider and API key in a settings panel, save/load presentations as portable `.pipi` files, and access the app via GitHub Pages. AI features work with any supported provider, and the app remains fully functional even without AI configured.

## Milestones

- v1.0 MVP - Shipped 2026-01-18 (see milestones/v1.0-ROADMAP.md)
- v1.1 Draggable Preview - Shipped 2026-01-18 (see milestones/v1.1-ROADMAP.md)
- v1.2 Permission UX - Shipped 2026-01-18 (see milestones/v1.2-ROADMAP.md)
- **v2.0 Shareable Presentations** - Phases 1-5 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Settings & API Key UI** - User can configure AI provider and API key
- [x] **Phase 2: Multi-Provider AI** - App works with Gemini or Claude (OpenAI removed)
- [x] **Phase 3: Disabled AI State** - Graceful degradation when no API key configured
- [x] **Phase 4: Save/Load System** - Export and import presentations as .pipi files
- [ ] **Phase 5: GitHub Pages Deployment** - App accessible via public URL

## Phase Details

### Phase 1: Settings & API Key UI
**Goal**: User can configure their AI provider and API key with clear setup guidance
**Depends on**: Nothing (first phase)
**Requirements**: SETT-01, SETT-02, SETT-03, SETT-04, SETT-05, SETT-06, SETT-07, INST-01, INST-02, INST-03
**Success Criteria** (what must be TRUE):
  1. User can open settings panel via gear icon in header
  2. User can select AI provider (Gemini, Claude, or OpenAI) from dropdown
  3. User can enter, view (toggle), and test their API key
  4. User sees "stored locally only" security notice and can clear all data
  5. Settings include step-by-step instructions with cost info and direct links to provider API pages
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md - Settings infrastructure (types, useSettings hook, API validation)
- [x] 01-02-PLAN.md - SettingsModal UI and header integration

### Phase 2: Multi-Provider AI
**Goal**: AI features work with user's chosen provider and handle errors gracefully
**Depends on**: Phase 1 (needs API key from settings)
**Requirements**: PROV-01, PROV-02, PROV-04, PROV-05, PROV-06, PROV-07
**Success Criteria** (what must be TRUE):
  1. User can generate slides using Gemini or Claude (whichever they configured)
  2. User selecting OpenAI sees a clear error message explaining browser CORS limitations
  3. User can switch providers in settings without losing their current presentation
  4. User sees compatibility warning when switching between providers
  5. API errors display user-friendly messages explaining what went wrong
  6. Rate limit and quota errors include specific guidance (wait/retry or check billing)
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md - Provider abstraction layer (interface, error types, factory)
- [x] 02-02-PLAN.md - Claude provider implementation
- [x] 02-03-PLAN.md - Wire provider to app (settings integration, error modal, loading states, provider-switch warning)

### Phase 3: Disabled AI State
**Goal**: App is fully usable without API key, with clear path to enable AI features
**Depends on**: Phase 2 (needs provider system to know what to disable)
**Requirements**: DISB-01, DISB-02, DISB-03, DISB-04, DISB-05
**Success Criteria** (what must be TRUE):
  1. AI features (generate slides, generate quiz) appear grayed out with lock icon when no API key
  2. Clicking disabled AI feature shows modal pointing to Settings panel
  3. User can create, edit, and present slides without any API key configured
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md - EnableAIModal component, SettingsModal auto-focus, App.tsx integration
- [x] 03-02-PLAN.md - Disabled state for SlideCard, ResourceHub, and PresentationView

### Phase 4: Save/Load System
**Goal**: User can export presentations to files and load them back
**Depends on**: Phase 1 (settings panel exists for consistent UI patterns)
**Requirements**: SAVE-01, SAVE-02, SAVE-03, SAVE-04, SAVE-05, SAVE-06, SAVE-07, SAVE-08
**Success Criteria** (what must be TRUE):
  1. User can save current presentation to downloadable .pipi file (filename auto-suggested)
  2. User can load presentation via file picker or drag-and-drop
  3. App shows success/error toast after save/load operations
  4. App warns before saving if presentation exceeds 50MB
  5. App auto-saves to localStorage and recovers after browser crash
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md - File format types and save/load services
- [x] 04-02-PLAN.md - Toast variants and auto-save with recovery
- [x] 04-03-PLAN.md - UI integration (header buttons, drag-drop, wiring)

### Phase 5: GitHub Pages Deployment
**Goal**: App accessible via public URL that colleagues can visit
**Depends on**: Phases 1-4 (deploy after features complete)
**Requirements**: DEPL-01, DEPL-02, DEPL-03
**Success Criteria** (what must be TRUE):
  1. App loads successfully on GitHub Pages URL (no blank page)
  2. Pushing to main branch triggers automatic deployment
  3. All features work identically on deployed version as local dev
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Settings & API Key UI | 2/2 | Complete | 2026-01-19 |
| 2. Multi-Provider AI | 3/3 | Complete | 2026-01-19 |
| 3. Disabled AI State | 2/2 | Complete | 2026-01-19 |
| 4. Save/Load System | 3/3 | Complete | 2026-01-19 |
| 5. GitHub Pages Deployment | 0/? | Not started | - |

---
*Roadmap created: 2026-01-19*
*Last updated: 2026-01-19 - Phase 4 complete (Save/Load System)*
