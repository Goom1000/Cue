# Roadmap: Cue v2.5

**Milestone:** v2.5 Rebrand to Cue
**Created:** 2026-01-22
**Phases:** 1 (Phase 19)

## Phase Overview

| Phase | Name | Goal | Requirements | Status |
|-------|------|------|--------------|--------|
| 19 | Rebrand to Cue | Replace all PiPi branding with Cue across UI, files, and repo | BRAND-01 through BRAND-05, FILE-01 through FILE-03, REPO-01, REPO-02 | Pending |

## Phase 19: Rebrand to Cue

**Goal:** Replace all PiPi branding with Cue across UI, file format, and GitHub repository.

**Requirements covered:**
- BRAND-01: App header displays "Cue"
- BRAND-02: Browser tab title shows "Cue"
- BRAND-03: Favicon updated to Cue branding
- BRAND-04: Landing page logo updated to Cue
- BRAND-05: Any UI text referencing "PiPi" changed to "Cue"
- FILE-01: Save files use `.cue` extension
- FILE-02: Backward compatibility for `.pipi` files
- FILE-03: File picker shows "Cue Presentation (*.cue)"
- REPO-01: GitHub repository renamed
- REPO-02: GitHub Pages URL reflects new name

**Success criteria:**
1. User sees "Cue" in header, browser tab, and landing page
2. User can save presentations as `.cue` files
3. User can load existing `.pipi` files without issues
4. App is accessible at new GitHub Pages URL
5. All references to "PiPi" eliminated from visible UI

**Technical approach:**
1. Search codebase for "PiPi", "pipi", "PIPI" references
2. Update constants, strings, file extensions
3. Update/create favicon and logo assets
4. Rename GitHub repo via GitHub settings
5. Update vite.config.ts base path for new repo name
6. Verify GitHub Actions deploy to new URL

**Dependencies:** None (fresh milestone)

---
*Roadmap created: 2026-01-22*
*Last updated: 2026-01-22*
