# Requirements: Cue v3.6 Tooltips & Onboarding

**Defined:** 2026-01-27
**Core Value:** Help users discover and understand Cue's features through contextual tooltips and per-screen walkthrough tours.

## v3.6 Requirements

### Tour Infrastructure

- [ ] **TOUR-01**: User can trigger walkthrough tour via button on each screen
- [ ] **TOUR-02**: User can skip/dismiss tour at any step
- [ ] **TOUR-03**: Tour state persists (completed tours don't replay on next visit)
- [ ] **TOUR-04**: Progress indicator shows current step and total steps
- [ ] **TOUR-05**: Tour overlay appears above all existing UI (z-index 10000+)

### Landing Page Tour

- [ ] **LAND-01**: Tour covers PDF upload zone (lesson plan + existing presentation)
- [ ] **LAND-02**: Tour covers settings button and API key setup
- [ ] **LAND-03**: Tour covers generation options (verbosity selector)
- [ ] **LAND-04**: Tour is 3-5 steps maximum
- [ ] **LAND-05**: Tour button visible in header/footer area

### Editor Tour

- [ ] **EDIT-01**: Tour covers slide thumbnail navigation
- [ ] **EDIT-02**: Tour covers Insert menu (+ button with slide types)
- [ ] **EDIT-03**: Tour covers slide editing (content, teleprompter)
- [ ] **EDIT-04**: Tour covers Class Bank feature
- [ ] **EDIT-05**: Tour is 3-5 steps maximum
- [ ] **EDIT-06**: Tour button visible in editor header

### Presentation Mode Tour

- [ ] **PRES-01**: Tour covers teleprompter panel
- [ ] **PRES-02**: Tour covers student window launch button
- [ ] **PRES-03**: Tour covers Targeted Questioning controls
- [ ] **PRES-04**: Tour covers Ask AI feature
- [ ] **PRES-05**: Tour is 3-5 steps maximum
- [ ] **PRES-06**: Tour button visible in teleprompter header
- [ ] **PRES-07**: Tour does not interrupt live teaching (manual trigger only)

### Info Tooltips

- [ ] **TIP-01**: Info icon (i) appears next to complex features
- [ ] **TIP-02**: Clicking info icon shows tooltip with explanation
- [ ] **TIP-03**: Tooltip explains feature purpose (why, not just what)
- [ ] **TIP-04**: Tooltips on Landing: Upload zones, Settings, Verbosity
- [ ] **TIP-05**: Tooltips on Editor: Insert menu options, Class Bank, Export
- [ ] **TIP-06**: Tooltips on Presentation: Targeted Mode, Verbosity toggle, Ask AI

### Accessibility

- [ ] **A11Y-01**: Tours navigable via keyboard (Tab, Enter, Escape)
- [ ] **A11Y-02**: Tooltips accessible via keyboard focus (not just hover)
- [ ] **A11Y-03**: ARIA labels on tour dialog and tooltip content
- [ ] **A11Y-04**: Visible focus indicators on interactive elements
- [ ] **A11Y-05**: Escape key dismisses tooltips and tours

## Future Requirements (v3.7+)

### Advanced Feature Discovery

- **DISC-01**: Hotspot indicators (pulsing dots) for new features
- **DISC-02**: Onboarding checklist tracking first-time actions
- **DISC-03**: "What's new" highlights after updates
- **DISC-04**: Interactive walkthrough (user performs actions during tour)

### Analytics

- **ANLY-01**: Tour completion rate tracking
- **ANLY-02**: Step abandonment tracking
- **ANLY-03**: Tooltip engagement metrics

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-play tours on first visit | Manual trigger preferred (less intrusive) |
| Video tutorials | Users ignore videos; doesn't teach muscle memory |
| Keyboard shortcuts in tooltips | User requested no shortcuts |
| Mobile-specific tours | Cue primarily desktop; defer if needed |
| Localization (i18n) | English-only for v3.6 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TOUR-01 | Phase 41 | Pending |
| TOUR-02 | Phase 41 | Pending |
| TOUR-03 | Phase 41 | Pending |
| TOUR-04 | Phase 41 | Pending |
| TOUR-05 | Phase 41 | Pending |
| LAND-01 | Phase 42 | Pending |
| LAND-02 | Phase 42 | Pending |
| LAND-03 | Phase 42 | Pending |
| LAND-04 | Phase 42 | Pending |
| LAND-05 | Phase 42 | Pending |
| EDIT-01 | Phase 43 | Pending |
| EDIT-02 | Phase 43 | Pending |
| EDIT-03 | Phase 43 | Pending |
| EDIT-04 | Phase 43 | Pending |
| EDIT-05 | Phase 43 | Pending |
| EDIT-06 | Phase 43 | Pending |
| PRES-01 | Phase 44 | Pending |
| PRES-02 | Phase 44 | Pending |
| PRES-03 | Phase 44 | Pending |
| PRES-04 | Phase 44 | Pending |
| PRES-05 | Phase 44 | Pending |
| PRES-06 | Phase 44 | Pending |
| PRES-07 | Phase 44 | Pending |
| TIP-01 | Phase 41 | Pending |
| TIP-02 | Phase 41 | Pending |
| TIP-03 | Phase 41 | Pending |
| TIP-04 | Phase 42 | Pending |
| TIP-05 | Phase 43 | Pending |
| TIP-06 | Phase 44 | Pending |
| A11Y-01 | Phase 41 | Pending |
| A11Y-02 | Phase 41 | Pending |
| A11Y-03 | Phase 41 | Pending |
| A11Y-04 | Phase 41 | Pending |
| A11Y-05 | Phase 41 | Pending |

**Coverage:**
- v3.6 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 after roadmap creation*
