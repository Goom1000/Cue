# PiPi (Presentation Intelligence)

## What This Is

A presentation tool for teachers that transforms PDF lesson plans into interactive slideshows with AI-generated content, a teleprompter script for the teacher, and progressive bullet reveal. Teachers upload their existing lesson plans, select student age/grade level, and the AI creates an engaging presentation with speaker notes that guide the teacher through natural, conversational delivery.

## Core Value

Students see only the presentation; teachers see the presentation plus a teleprompter script that lets them sound knowledgeable and natural without reading slides verbatim.

## Requirements

### Validated

- ✓ PDF lesson plan upload and parsing — existing
- ✓ AI-powered slide generation (Gemini) — existing
- ✓ Progressive bullet reveal during presentation — existing
- ✓ Teleprompter/speaker notes panel for teacher — existing
- ✓ Student name integration for reading assignments — existing
- ✓ Differentiated question generation (Grade A/B/C) — existing
- ✓ Kahoot-style quiz/game mode — existing
- ✓ PPTX export — existing
- ✓ Dark mode support — existing
- ✓ Slide editing capabilities — existing

### Active

- [ ] Rock-solid dual-monitor student view — students see only slides, synced with teacher view, works automatically with extended displays like PowerPoint Presenter View

### Out of Scope

- Real-time student device sync (each student on their own device) — high complexity, not needed for classroom projector setup
- Cloud storage/authentication — local-first for now
- Mobile app — web-first
- Other small feature additions — deferred until student view is complete

## Context

### Technical Environment
- React 19 SPA with Vite
- Gemini API for AI generation
- Tailwind CSS for styling
- No backend — client-side only
- CDN-loaded dependencies (PDF.js, PptxGenJS, html2pdf)

### Current State
- Core presentation functionality works well
- Student view exists as a popup window (`StudentWindow` component using `window.open()` + React portals)
- Student view button triggers popup but it flashes and closes immediately — likely due to Arc browser's aggressive popup blocking or style injection errors
- Current approach is fragile and requires users to allow popups

### Target State
- Dual-monitor detection like PowerPoint Presenter View
- Teacher view stays on laptop, student view automatically goes to projector
- No popup blockers to configure
- Perfect sync between views

## Constraints

- **Tech stack**: Must remain a client-side SPA (no server). React + Vite.
- **Browser APIs**: Limited to what modern browsers provide (Window Management API, Presentation API, or fullscreen heuristics)
- **Backward compatibility**: Must not break existing functionality (editing, presenting, quizzes)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Popup-based student window | Simple implementation using `window.open()` | ⚠️ Revisit — blocked by popup blockers, unreliable |

---
*Last updated: 2026-01-18 after initialization*
