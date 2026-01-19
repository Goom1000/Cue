# Requirements: PiPi

**Defined:** 2026-01-19
**Core Value:** Students see only the presentation; teachers see the teleprompter script

## v2.1 Requirements

Requirements for v2.1 Landing Page & Branding milestone.

### Landing Page

- [ ] **LAND-01**: User can click "Load Presentation" button on landing page to open .pipi file
- [ ] **LAND-02**: User can drag .pipi file onto landing page to auto-load presentation
- [ ] **LAND-03**: Loading a .pipi file from landing page transitions directly to editor

### Branding

- [ ] **BRND-01**: Header displays PNG logo instead of "L" icon + "LessonLens" text
- [ ] **BRND-02**: Browser tab title shows "PiPi"
- [ ] **BRND-03**: ResourceHub footer/watermark shows "PiPi" instead of "LessonLens"

## v2.2+ Requirements

Deferred to future release.

- Elapsed time display showing presentation duration
- Fullscreen recovery (auto re-enter if exited)
- Setup wizard with screenshots
- Video walkthrough for API key setup
- API calls this session counter
- Auto-save indicator in header
- Model selection dropdown in settings

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time student device sync | High complexity, not needed for classroom projector setup |
| Cloud storage/authentication | File-based sharing is sufficient for team of 5 |
| Mobile app | Web-first |
| Annotation tools / laser pointer | Scope creep, PiPi is teleprompter-focused |
| Slide transitions / animations | Not core to teleprompter value |
| Video embedding | Storage/bandwidth concerns |
| User accounts / login system | Colleagues load shared files, no auth needed |
| Desktop installer | GitHub Pages simpler, free, auto-updates |
| OpenAI provider support | Browser CORS blocked, no workaround without backend |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAND-01 | Phase 6 | Pending |
| LAND-02 | Phase 6 | Pending |
| LAND-03 | Phase 6 | Pending |
| BRND-01 | Phase 7 | Pending |
| BRND-02 | Phase 7 | Pending |
| BRND-03 | Phase 7 | Pending |

**Coverage:**
- v2.1 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-19 — v2.1 roadmap phase mapping*
