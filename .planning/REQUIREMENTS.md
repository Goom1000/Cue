# Requirements: PiPi v1.2

**Defined:** 2026-01-18
**Core Value:** Students see only slides; teachers see slides + teleprompter

## v1.2 Requirements

Requirements for Permission Flow Fix milestone.

### Permission Detection

- [ ] **PERM-01**: Permission state resolves before UI allows interaction (loading state prevents race condition)

### Button Status

- [ ] **PERM-02**: Launch button shows current auto-placement status based on permission state
- [ ] **PERM-05**: Display name shown on button when permission granted ("Launch on DELL U2718Q")

### Permission Request

- [ ] **PERM-03**: User can trigger permission request from visible, non-dismissible UI element

### Feedback

- [ ] **PERM-04**: Toast confirms where student window opened ("Opened on SmartBoard" vs "Opened on laptop")
- [ ] **PERM-06**: Recovery UI shown when permission previously denied (guidance to browser settings)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Inline permission on button click | Would break popup blocker exception (user gesture consumed by permission dialog) |
| Remember permission choice in localStorage | Browser already remembers; adding our own layer is confusing |
| Support for Firefox/Safari auto-placement | Window Management API is Chromium-only; manual fallback already exists |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PERM-01 | Phase 1 | Pending |
| PERM-02 | Phase 2 | Pending |
| PERM-03 | Phase 2 | Pending |
| PERM-04 | Phase 2 | Pending |
| PERM-05 | Phase 2 | Pending |
| PERM-06 | Phase 2 | Pending |

**Coverage:**
- v1.2 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-18*
*Last updated: 2026-01-18 after initial definition*
