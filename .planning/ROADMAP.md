# Roadmap: PiPi v1.2 Permission Flow Fix

## Overview

This milestone fixes the race condition in Window Management API permission detection and improves the permission UX. Phase 1 fixes the hook to distinguish "loading" from "unavailable", eliminating the race condition. Phase 2 updates the UI to communicate permission state clearly through button labels, toasts, and recovery guidance.

## Phases

- [x] **Phase 1: Permission State Loading** - Add loading state to useWindowManagement hook
- [ ] **Phase 2: Permission UX** - Update UI to reflect permission state with clear feedback

## Phase Details

### Phase 1: Permission State Loading
**Goal**: Permission state resolves definitively before any UI decisions are made
**Depends on**: Nothing (first phase)
**Requirements**: PERM-01
**Success Criteria** (what must be TRUE):
  1. Launch button shows "Checking displays..." during initial permission query
  2. No permission-related UI appears until async check completes
  3. PermissionExplainer only appears when state is definitively 'prompt'
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md - Add isLoading state to hook and update consumer

### Phase 2: Permission UX
**Goal**: Teacher always knows the current auto-placement capability and can act on it
**Depends on**: Phase 1
**Requirements**: PERM-02, PERM-03, PERM-04, PERM-05, PERM-06
**Success Criteria** (what must be TRUE):
  1. Launch button label changes based on permission state ("Launch -> External Display" when granted)
  2. Teacher can request permission from a visible, persistent UI element (inline link, not popup)
  3. Toast appears after launch confirming where window opened (5 seconds, auto-dismiss)
  4. When permission was previously denied, teacher sees recovery guidance with browser-specific instructions
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md - Button labels + warning icon + launch toast
- [ ] 02-02-PLAN.md - Inline permission request link (replaces PermissionExplainer popup)
- [ ] 02-03-PLAN.md - Denied recovery UI with browser-specific modal
- [ ] 02-04-PLAN.md - Human verification of all permission UX

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Permission State Loading | 1/1 | Complete | 2026-01-18 |
| 2. Permission UX | 0/4 | Planned | - |

---
*Roadmap created: 2026-01-18*
*Milestone: v1.2 Permission Flow Fix*
