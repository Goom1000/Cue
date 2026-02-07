# Phase 57 Plan 01: Image Paste Routing and Compression Summary

**One-liner:** Image paste routing with HTML wrapper detection, canvas compression (1920px/JPEG 0.8), and toast-based replace action

---
phase: 57
plan: 01
subsystem: clipboard-paste
tags: [image-paste, compression, canvas-api, clipboard-routing, toast-action]
requires: [55, 56]
provides: [image-paste-routing, compress-image-utility, replace-slide-toast-flow]
affects: [57-02, 57-03, 57-04]
tech-stack:
  added: []
  patterns: [canvas-compression, html-wrapper-detection, toast-with-replace-action]
key-files:
  created: []
  modified: [hooks/usePaste.ts, App.tsx]
key-decisions:
  - decision: "Default action creates new slide; toast offers Replace instead"
    rationale: "Matches paste-first UX (immediate result) with non-blocking alternative via toast action"
  - decision: "HTML wrapper detection via DOMParser text extraction"
    rationale: "Web-copied images include HTML like <img src=...>; stripping tags and checking for empty text content reliably distinguishes image wrappers from rich content"
  - decision: "GIF images bypass compression to preserve animation"
    rationale: "Canvas toDataURL destroys GIF animation; GIF pastes should remain intact"
  - decision: "No originalPastedImage for Phase 57 image pastes"
    rationale: "originalPastedImage is Phase 56 PowerPoint-specific for before/after AI comparison; standalone image pastes don't need this"
  - decision: "8-second toast timeout for Replace action"
    rationale: "Replace is time-sensitive; standard 3s would expire before user reads the option"
duration: ~3 minutes
completed: 2026-02-07
---

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~3 minutes |
| Started | 2026-02-07T05:52:57Z |
| Completed | 2026-02-07T05:55:50Z |
| Tasks | 1/1 |
| Files modified | 2 |

## Accomplishments

### Image Routing in usePaste Hook
- Added `isImageOnly` boolean flag to `PasteResult` interface
- Pure image pastes (no HTML) detected as image-only
- Web-copied images with HTML wrappers (e.g., `<img src="...">`) detected via DOMParser text extraction
- PowerPoint pastes with real HTML content (titles, bullets, text) continue to route to existing HTML parsing flow

### compressImage Utility
- Canvas-based compression: scales down to 1920px max dimension, re-encodes as JPEG at 0.8 quality
- Images already within bounds still re-encode to JPEG for consistent compression
- GIF images returned as-is to preserve animation
- Graceful fallback to original data URL on image load error

### Image Paste Flow in handlePasteSlide
- Standalone image pastes create new `full-image` slides immediately (no loading state needed)
- Image compressed before storage to prevent .cue file bloat from Retina screenshots
- Toast displays "Image added as new slide" with "Replace current instead" action button
- Replace action removes the new slide and updates the original slide with the compressed image
- Active slide index correctly adjusted after replace operation

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add image routing to usePaste and compressImage utility | cce1d2b | hooks/usePaste.ts, App.tsx |

## Files Modified

| File | Changes |
|------|---------|
| `hooks/usePaste.ts` | Added `isImageOnly` to PasteResult, HTML wrapper detection via DOMParser |
| `App.tsx` | Added `compressImage` utility, Phase 57 image paste flow in `handlePasteSlide`, toast with replace action |

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Default action creates new slide; toast offers Replace instead | Matches paste-first UX with non-blocking alternative |
| 2 | HTML wrapper detection via DOMParser text extraction | Reliably distinguishes image wrappers from rich content |
| 3 | GIF images bypass compression | Canvas toDataURL destroys GIF animation |
| 4 | No originalPastedImage for Phase 57 image pastes | That field is Phase 56 PowerPoint-specific |
| 5 | 8-second toast timeout for Replace action | Replace is time-sensitive; standard 3s too short |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**57-02 (AI Image Caption Infrastructure):** Ready. The image paste flow creates slides without AI captions. Plan 02 will add an `analyzeImage()` method to the AI provider interface for lighter-weight caption generation on pasted images.

**57-03 (Drag-drop, Full Image layout, AI caption UI):** Ready. The `compressImage` utility and `full-image` slide creation pattern from this plan will be reused for drag-drop image handling.

**Blockers:** None.
