# Requirements: PiPi v2.0 Shareable Presentations

**Defined:** 2026-01-19
**Core Value:** Colleagues can use presentations you create, with optional AI features via their own API keys

## v2.0 Requirements

Requirements for shareable presentations milestone.

### Save/Load

- [ ] **SAVE-01**: User can export current presentation to downloadable `.pipi` file
- [ ] **SAVE-02**: User can import presentation from `.pipi` file via file picker
- [ ] **SAVE-03**: User can drag-and-drop `.pipi` file onto app to load
- [ ] **SAVE-04**: App shows success toast after save completes
- [ ] **SAVE-05**: App shows error toast with explanation if save/load fails
- [ ] **SAVE-06**: App warns user if presentation exceeds 50MB before saving
- [ ] **SAVE-07**: App auto-saves to localStorage for crash recovery
- [ ] **SAVE-08**: Filename auto-suggests from presentation title

### Settings

- [ ] **SETT-01**: User can open settings panel via gear icon
- [ ] **SETT-02**: User can select AI provider (Gemini, Claude, or OpenAI)
- [ ] **SETT-03**: User can enter API key (masked input with show/hide toggle)
- [ ] **SETT-04**: User can verify API key with test connection button
- [ ] **SETT-05**: Settings display "Stored locally only" security notice
- [ ] **SETT-06**: User can clear all stored data (API keys, preferences)
- [ ] **SETT-07**: Settings persist in localStorage across sessions

### AI Provider Abstraction

- [ ] **PROV-01**: App supports Google Gemini API
- [ ] **PROV-02**: App supports Anthropic Claude API
- [ ] **PROV-03**: App supports OpenAI API
- [ ] **PROV-04**: User can switch providers without losing presentation
- [ ] **PROV-05**: API errors show user-friendly messages (not raw error codes)
- [ ] **PROV-06**: Rate limit errors show "wait and retry" guidance
- [ ] **PROV-07**: Quota errors show "check billing" guidance with provider link

### Disabled AI State

- [ ] **DISB-01**: AI features visible but grayed out when no API key configured
- [ ] **DISB-02**: Disabled AI buttons show lock icon
- [ ] **DISB-03**: Clicking disabled AI feature shows setup modal
- [ ] **DISB-04**: Setup modal points to Settings panel
- [ ] **DISB-05**: App fully functional without API key (create, edit, present work)

### Setup Instructions

- [ ] **INST-01**: Settings panel includes text guide for getting API keys
- [ ] **INST-02**: Instructions include cost information ($0.01-0.10 per request)
- [ ] **INST-03**: Instructions link directly to provider API key pages

### Deployment

- [ ] **DEPL-01**: App deploys to GitHub Pages
- [ ] **DEPL-02**: App auto-deploys when main branch is pushed
- [ ] **DEPL-03**: Deployed app loads without blank page (base path correct)

## v2.1 Requirements

Deferred to future release.

### Enhanced Instructions

- **INST-04**: Setup wizard with screenshots
- **INST-05**: Video walkthrough for API key setup

### Usage Tracking

- **USAG-01**: Settings show "API calls this session" counter
- **USAG-02**: Link to provider billing dashboard

### Auto-save Enhancements

- **SAVE-09**: Auto-save indicator in header
- **SAVE-10**: Restore from auto-save prompt on app load

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud storage | File-based sharing sufficient for 5-person team |
| User accounts | No auth needed — colleagues load shared files |
| Desktop installer | GitHub Pages simpler, free, auto-updates |
| Real-time collaboration | Overkill for small team |
| Sharing class lists in .pipi files | Each teacher enters own students |
| Image generation with Claude | Claude doesn't support image gen — falls back to Gemini |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SAVE-01 | 4 | Pending |
| SAVE-02 | 4 | Pending |
| SAVE-03 | 4 | Pending |
| SAVE-04 | 4 | Pending |
| SAVE-05 | 4 | Pending |
| SAVE-06 | 4 | Pending |
| SAVE-07 | 4 | Pending |
| SAVE-08 | 4 | Pending |
| SETT-01 | 1 | Complete |
| SETT-02 | 1 | Complete |
| SETT-03 | 1 | Complete |
| SETT-04 | 1 | Complete |
| SETT-05 | 1 | Complete |
| SETT-06 | 1 | Complete |
| SETT-07 | 1 | Complete |
| PROV-01 | 2 | Complete |
| PROV-02 | 2 | Complete |
| PROV-03 | 2 | Removed (OpenAI has no browser CORS) |
| PROV-04 | 2 | Complete |
| PROV-05 | 2 | Complete |
| PROV-06 | 2 | Complete |
| PROV-07 | 2 | Complete |
| DISB-01 | 3 | Pending |
| DISB-02 | 3 | Pending |
| DISB-03 | 3 | Pending |
| DISB-04 | 3 | Pending |
| DISB-05 | 3 | Pending |
| INST-01 | 1 | Complete |
| INST-02 | 1 | Complete |
| INST-03 | 1 | Complete |
| DEPL-01 | 5 | Pending |
| DEPL-02 | 5 | Pending |
| DEPL-03 | 5 | Pending |

**Coverage:**
- v2.0 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 — Phase 2 requirements complete (PROV-03 removed: OpenAI lacks browser CORS)*
