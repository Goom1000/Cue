# Phase 57 Plan 03: Drag-drop, Full Image Layout, and AI Caption UI Summary

**One-liner:** Image drag-drop replaces active slide, FullImageLayout empty state with file picker, and "Generate AI Notes" button calling vision API for teaching talking points

---
phase: 57
plan: 03
subsystem: clipboard-paste
tags: [drag-drop, full-image-layout, ai-caption, vision-api, file-picker, image-slides]
requires: [57-01, 57-02]
provides: [image-drag-drop, full-image-empty-state, ai-caption-ui, image-file-picker]
affects: [57-04]
tech-stack:
  added: []
  patterns: [onImageFile-callback-routing, vision-api-caption-to-speaker-notes]
key-files:
  created: []
  modified: [hooks/useDragDrop.ts, components/SlideRenderers.tsx, components/SlideCard.tsx, App.tsx]
key-decisions:
  - decision: "Drag-drop replaces active slide; paste creates new slide"
    rationale: "Drag-drop has spatial intent (user targets visible slide); paste is ambient (no spatial target)"
  - decision: "FullImageLayout empty state in both presentation and editing contexts"
    rationale: "SlideRenderers used by presentation view; SlideCard sidebar for editing — both need empty states"
  - decision: "AI caption populates title + speakerNotes (caption + teachingNotes combined)"
    rationale: "speakerNotes drives teleprompter; title replaces placeholder 'Image Slide'"
  - decision: "Button shows 'Regenerate AI Notes' when speakerNotes already exist"
    rationale: "User might want to re-analyze after changing the image"
duration: ~5 minutes
completed: 2026-02-07
---

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~5 minutes |
| Started | 2026-02-07T05:58:53Z |
| Completed | 2026-02-07T06:04:23Z |
| Tasks | 2/2 |
| Files modified | 4 |

## Accomplishments

### Image Drag-Drop (IMG-04)
- Extended `useDragDrop` hook with `onImageFile` optional callback parameter
- Image MIME type check (`file.type.startsWith('image/')`) routes to dedicated handler before .cue check
- `handleImageDrop` in App.tsx reads file as data URL, compresses via canvas, replaces active slide image
- Empty deck fallback: creates new full-image slide and transitions to editing state
- Toast confirms action: "Image dropped -- replaced current slide"
- Existing .cue file drag-drop behavior completely unchanged

### Full Image Empty State (IMG-02)
- `FullImageLayout` shows dashed border placeholder with image icon and "Paste or drop an image" text
- Optional `onImageSelected` callback enables file picker (click to browse) in editing contexts
- Presentation view shows clean placeholder without file picker (no callback passed)
- SlideCard sidebar also upgraded: full-image slides without image show "Paste, drop, or click to add image"
- Hidden `<input type="file" accept="image/*">` opens native file browser on click
- Selected files read via FileReader and compressed before updating slide

### AI Caption UI (IMG-05)
- "Generate AI Notes" button appears on full-image slides with an image in SlideCard sidebar
- Button text changes to "Regenerate AI Notes" when speakerNotes already populated
- Loading state: spinner + "Generating..." text while API call in progress
- `handleGenerateImageCaption` extracts base64 from data URL, calls `provider.analyzeImage()`
- On success: updates slide title with `result.title`, speakerNotes with `result.caption + '\n\n' + result.teachingNotes`
- On error: toast with error message, slide unchanged
- AI availability gate: redirects to Enable AI modal if no provider configured

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Extend useDragDrop for image files and wire drop handler | 03ebd21 | hooks/useDragDrop.ts, App.tsx |
| 2 | Full Image empty state and AI caption button | 4bca867 | components/SlideRenderers.tsx, components/SlideCard.tsx, App.tsx |

## Files Modified

| File | Changes |
|------|---------|
| hooks/useDragDrop.ts | +12 lines: onImageFile parameter, image MIME type routing, dependency array update |
| components/SlideRenderers.tsx | +50 lines: FullImageLayout empty state with file picker, onImageSelected prop through SlideContentRenderer |
| components/SlideCard.tsx | +60 lines: onGenerateCaption/onImageSelected props, Generate AI Notes button, sidebar file picker for full-image |
| App.tsx | +75 lines: handleImageDrop, handleGenerateImageCaption, handleSlideImageSelected handlers, wired to useDragDrop and SlideCard |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Drag-drop replaces active slide; paste creates new slide | Drag-drop has spatial intent (user targets visible slide); paste is ambient (no spatial target) |
| FullImageLayout empty state in both SlideRenderers and SlideCard | SlideRenderers.tsx used by presentation view; SlideCard sidebar for editing -- both need appropriate empty states |
| AI caption populates title + speakerNotes | speakerNotes drives teleprompter; title replaces placeholder "Image Slide" with AI-generated description |
| Button shows "Regenerate AI Notes" when speakerNotes exist | Teacher may want to re-analyze after changing the image or refining |

## Deviations from Plan

### Auto-added (Rule 2 - Missing Critical)

**1. [Rule 2 - Missing Critical] Added file picker to SlideCard sidebar**
- **Found during:** Task 2
- **Issue:** Plan specified file picker only in FullImageLayout (SlideRenderers.tsx), but SlideCard has its own sidebar rendering and doesn't use SlideContentRenderer -- the editing experience would lack a file picker
- **Fix:** Added interactive file picker to SlideCard's "No Image Yet" placeholder for full-image slides with onImageSelected callback
- **Files modified:** components/SlideCard.tsx
- **Commit:** 4bca867

## Issues Encountered

None.

## Next Phase Readiness

- All five IMG requirements are now implemented across Plans 01-03:
  - IMG-01: Image paste routing (Plan 01)
  - IMG-02: Full Image layout with empty state (Plan 03)
  - IMG-03: Image compression (Plan 01)
  - IMG-04: Drag-drop images (Plan 03)
  - IMG-05: AI caption UI (Plan 03)
- Plan 04 (visual verification checkpoint) is the next step to validate end-to-end behavior
- No blockers for verification
