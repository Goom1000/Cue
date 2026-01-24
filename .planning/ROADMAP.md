# Roadmap: Cue v3.1 Teleprompter Verbosity

## Overview

Add a three-level verbosity toggle to the teleprompter panel, allowing teachers to switch between Concise, Standard, and Detailed scripts mid-lesson. Generated scripts are cached per slide for instant switching, with cache persistence in presentation state.

## Phases

### Phase 27: Verbosity UI & Generation

**Goal:** Teacher can select verbosity level and see appropriately styled teleprompter content

**Dependencies:** None (builds on existing teleprompter infrastructure)

**Requirements:**
- VERB-01: Teacher can see three verbosity levels (Concise / Standard / Detailed) in teleprompter panel
- VERB-02: Verbosity selector appears at top of teleprompter panel (below existing icons)
- VERB-03: Current verbosity level is visually highlighted
- VERB-04: Switching verbosity shows loading indicator while regenerating
- VERB-05: Concise mode produces very brief sentences (minimal guidance)
- VERB-06: Standard mode produces current balanced scripts (existing behavior, default)
- VERB-07: Detailed mode produces full sentences with transitions (script-like, read verbatim)
- VERB-08: Teleprompter regenerates on-demand when verbosity changed

**Success Criteria:**
1. Teacher sees three verbosity buttons (Concise / Standard / Detailed) at top of teleprompter panel
2. Clicking a verbosity level highlights it and shows loading indicator while content regenerates
3. Concise mode produces bullet-point-style minimal guidance (2-3 short phrases per slide)
4. Standard mode produces current balanced scripts (existing behavior, unchanged)
5. Detailed mode produces full script-like content with transitions ("Now let's move on to...")

---

### Phase 28: Caching & Backward Compatibility

**Goal:** Verbosity selections persist and switch instantly when previously generated

**Dependencies:** Phase 27 (UI and generation must work first)

**Requirements:**
- VERB-09: Generated versions are cached per slide (instant switch-back)
- VERB-10: Cache persists in presentation state (survives refresh)
- VERB-11: Existing presentations default to Standard verbosity
- VERB-12: .cue/.pipi file format supports verbosity cache storage

**Success Criteria:**
1. After generating Detailed, switching to Standard then back to Detailed is instant (no regeneration)
2. Refreshing browser preserves verbosity cache (previously generated levels load instantly)
3. Loading existing .cue/.pipi files without verbosity data defaults to Standard with no errors
4. Saved .cue files include verbosity cache; reloading restores instant switching capability

---

## Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 27 | Verbosity UI & Generation | Pending | 0/? |
| 28 | Caching & Backward Compatibility | Pending | 0/? |

**Milestone Progress:** 0/2 phases complete

---
*Roadmap created: 2026-01-24*
*Last updated: 2026-01-24*
