# Roadmap: Cue v4.0 Clipboard Builder

**Created:** 2026-02-02
**Milestone:** v4.0 Clipboard Builder
**Depth:** Comprehensive
**Phases:** 55-59 (5 phases)
**Requirements:** 21 mapped

## Overview

v4.0 enables teachers to build slide decks via copy-paste from PowerPoint, paste images directly, and then unify mismatched content with AI-powered cohesion. After building, teachers can upload a lesson plan to identify gaps and generate missing slides. This milestone transforms Cue from a PDF-first tool to a flexible deck builder.

## Phases

### Phase 55: Paste Infrastructure

**Goal:** Users can paste slide content from PowerPoint and have it appear as a new slide in Cue

**Dependencies:** None (foundation phase)

**Requirements:**
- CLIP-01: User can paste slide content from PowerPoint via Ctrl+V/Cmd+V
- CLIP-03: User can paste into specific position in deck (not just append)
- CLIP-04: Visual loading indicator shows during paste processing
- CLIP-05: "Paste Slide" button available for discoverability

**Success Criteria:**
1. User presses Cmd+V after copying a slide from PowerPoint and a new slide appears in Cue
2. User can paste at current selection position (between slides, not just at end)
3. Loading spinner shows while paste is being processed
4. "Paste Slide" button in toolbar provides discoverable alternative to keyboard shortcut
5. Paste works in Chrome, Safari, and Firefox browsers

**Plans:** 3 plans

Plans:
- [x] 55-01-PLAN.md — Types and usePaste hook foundation
- [x] 55-02-PLAN.md — handlePasteSlide handler and UI integration
- [x] 55-03-PLAN.md — Cross-browser verification checkpoint

**Status:** Complete (2026-02-07)
**Note:** PowerPoint slides paste as images due to browser clipboard limitations. Phase 56 will add AI text extraction.

---

### Phase 56: AI Slide Analysis

**Goal:** Pasted slides are automatically improved by AI to match Cue's presentation style

**Dependencies:** Phase 55 (paste must work before AI can enhance)

**Requirements:**
- CLIP-02: AI analyzes pasted content and generates improved Cue-style slide
- CLIP-06: Before/after comparison shows what AI changed from pasted content

**Success Criteria:**
1. After paste, AI restructures content into proper Cue layouts (title/bullets, two-column, etc.)
2. AI generates teleprompter notes for the pasted slide
3. User sees before/after diff showing original paste vs AI-improved version
4. AI improvement works with both Gemini and Claude providers
5. User can skip AI improvement if they prefer raw paste

**Plans:** 2 plans

Plans:
- [x] 56-01-PLAN.md — AI analysis provider infrastructure (prompts, schemas, both providers)
- [x] 56-02-PLAN.md — Paste flow integration and before/after comparison UI

**Status:** Complete (2026-02-07)
**Note:** Design refined during testing — pasted slides display original image full-screen, AI-extracted content drives teleprompter only. Original visuals preserved for functional teaching content.

---

### Phase 57: Image Paste

**Goal:** Users can paste images directly and have them display as full-slide visuals

**Dependencies:** Phase 55 (uses paste infrastructure patterns)

**Requirements:**
- IMG-01: User can paste images from clipboard (screenshots, copied images)
- IMG-02: "Full Image" layout option in tile selector (image only, no text)
- IMG-03: Pasted image displays as slide background/full bleed
- IMG-04: User can drag-drop images onto existing slides
- IMG-05: AI can generate caption for pasted/dropped images

**Success Criteria:**
1. User pastes screenshot (Cmd+Shift+4 on Mac) and it becomes a new slide
2. Tile selector includes "Full Image" layout that displays image without text overlay
3. Pasted images fill the slide canvas edge-to-edge
4. User can drag image file from Finder onto a slide to replace its visual
5. Optional AI caption appears in teleprompter notes for image-only slides

**Plans:** 4 plans

Plans:
- [x] 57-01-PLAN.md — Image paste routing and compression (IMG-01, IMG-03)
- [x] 57-02-PLAN.md — AI image caption infrastructure (IMG-05 backend)
- [x] 57-03-PLAN.md — Drag-drop, Full Image layout, and AI caption UI (IMG-02, IMG-04, IMG-05 UI)
- [x] 57-04-PLAN.md — Visual verification checkpoint

**Status:** Complete (2026-02-07)
**Note:** Two bugs fixed during verification — PowerPoint paste was misrouted to image-only path (fixed via HTML signature detection), and AI caption was one big block instead of teleprompter segments (fixed by returning talkingPoints[] array).

---

### Phase 58: Deck Cohesion

**Goal:** Users can unify mismatched slides into a coherent deck with consistent tone and flow

**Dependencies:** Phases 55-57 (needs slides to exist before unifying them)

**Requirements:**
- COHE-01: "Make Cohesive" button available in editor toolbar
- COHE-02: AI analyzes entire deck for tone and flow consistency
- COHE-03: Preview panel shows proposed changes before applying
- COHE-04: User can apply or cancel cohesion changes

**Success Criteria:**
1. "Make Cohesive" button appears in editor toolbar when deck has 2+ slides
2. Clicking button shows AI analyzing deck with progress indicator
3. Preview panel displays proposed changes with visual diff for each affected slide
4. User can review changes and click "Apply All" or "Cancel"
5. Manual edits (user-created content) are preserved unless user explicitly opts to include them

---

### Phase 59: Gap Analysis

**Goal:** Users can identify missing content by comparing their deck against a lesson plan

**Dependencies:** Phase 58 (uses cohesion UI patterns, builds on deck analysis)

**Requirements:**
- GAP-01: User can upload lesson plan PDF after deck is built
- GAP-02: AI compares deck content against lesson plan
- GAP-03: Gap list shows missing topics/content from lesson plan
- GAP-04: Each gap has severity ranking (critical, recommended, nice-to-have)
- GAP-05: AI suggests slide content for each identified gap
- GAP-06: One-click button generates suggested slide from gap

**Success Criteria:**
1. "Check for Gaps" button appears when deck exists (separate from initial lesson plan upload)
2. User uploads lesson plan PDF and AI compares it against existing slides
3. Gap panel lists missing topics with severity badges (red/yellow/gray)
4. Each gap shows suggested slide content preview
5. User clicks "Add Slide" on a gap and AI generates the slide at appropriate position
6. Gap list updates after adding slides (filled gaps disappear)

---

## Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 55 | Paste Infrastructure | ✓ Complete | 3/3 |
| 56 | AI Slide Analysis | ✓ Complete | 2/2 |
| 57 | Image Paste | ✓ Complete | 4/4 |
| 58 | Deck Cohesion | Pending | — |
| 59 | Gap Analysis | Pending | — |

**Total:** 3/5 phases complete | 11/21 requirements delivered (CLIP-01 through CLIP-06, IMG-01 through IMG-05)

## Coverage Validation

All 21 v4.0 requirements mapped:

| Requirement | Phase | Category |
|-------------|-------|----------|
| CLIP-01 | 55 | Clipboard Paste |
| CLIP-02 | 56 | Clipboard Paste |
| CLIP-03 | 55 | Clipboard Paste |
| CLIP-04 | 55 | Clipboard Paste |
| CLIP-05 | 55 | Clipboard Paste |
| CLIP-06 | 56 | Clipboard Paste |
| IMG-01 | 57 | Image Handling |
| IMG-02 | 57 | Image Handling |
| IMG-03 | 57 | Image Handling |
| IMG-04 | 57 | Image Handling |
| IMG-05 | 57 | Image Handling |
| COHE-01 | 58 | Deck Cohesion |
| COHE-02 | 58 | Deck Cohesion |
| COHE-03 | 58 | Deck Cohesion |
| COHE-04 | 58 | Deck Cohesion |
| GAP-01 | 59 | Gap Analysis |
| GAP-02 | 59 | Gap Analysis |
| GAP-03 | 59 | Gap Analysis |
| GAP-04 | 59 | Gap Analysis |
| GAP-05 | 59 | Gap Analysis |
| GAP-06 | 59 | Gap Analysis |

**Coverage:** 21/21 requirements (100%)

---
*Roadmap created: 2026-02-02*
*Last updated: 2026-02-07 - Phase 57 complete*
