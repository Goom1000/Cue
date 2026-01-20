# Requirements: PiPi v2.3 Bug Fixes

**Defined:** 2026-01-20
**Core Value:** Students see only the presentation; teachers see the teleprompter script

## v2.3 Requirements

Requirements for bug fix milestone. All are high-priority fixes for broken functionality.

### Layout Fixes

- [x] **LAYOUT-01**: Flowchart arrows are vertically centered with adjacent boxes
- [x] **LAYOUT-02**: Flowchart boxes fill available vertical space without large gaps below
- [x] **LAYOUT-03**: Slide preview in teacher view shows complete content (no cutoff)

### Sync Fixes

- [ ] **SYNC-01**: Game activity displays in student view when teacher opens game
- [ ] **SYNC-02**: Game state syncs in real-time (question number, reveal state)
- [ ] **SYNC-03**: Closing game in teacher view returns student view to slide

### Error Handling

- [ ] **ERROR-01**: AI slide revision shows user-friendly error on failure (not crash)
- [ ] **ERROR-02**: Malformed AI response shows parse error message

## Future Requirements

Deferred to later milestones.

### Presentation Enhancements (v2.4+)

- Elapsed time display showing presentation duration
- Fullscreen recovery (auto re-enter if exited)
- Model selection dropdown in settings

### UX Improvements (v2.4+)

- Setup wizard with screenshots
- Video walkthrough for API key setup
- API calls this session counter
- Auto-save indicator in header

## Out of Scope

| Feature | Reason |
|---------|--------|
| New game formats (The Chase, Millionaire) | v2.3 is bug fixes only |
| Script mode slides | Feature, not bug fix |
| Targeted questioning with grades | Feature, not bug fix |
| Multi-select slide merge | Feature, not bug fix |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 12 | Complete |
| LAYOUT-02 | Phase 12 | Complete |
| LAYOUT-03 | Phase 12 | Complete |
| SYNC-01 | Phase 14 | Pending |
| SYNC-02 | Phase 14 | Pending |
| SYNC-03 | Phase 14 | Pending |
| ERROR-01 | Phase 13 | Pending |
| ERROR-02 | Phase 13 | Pending |

**Coverage:**
- v2.3 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-01-20*
*Last updated: 2026-01-20 - Traceability updated with phase mappings*
