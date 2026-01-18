# PiPi (Presentation Intelligence)

## What This Is

A presentation tool for teachers that transforms PDF lesson plans into interactive slideshows with AI-generated content, a teleprompter script for the teacher, and progressive bullet reveal. Teachers upload their existing lesson plans, select student age/grade level, and the AI creates an engaging presentation with speaker notes that guide the teacher through natural, conversational delivery.

**v1.0 shipped:** Dual-monitor presentation mode where students see only slides on a projector while teachers see slides plus teleprompter on their laptop — works like PowerPoint Presenter View.

## Current Milestone: v1.1 Draggable Preview Window

**Goal:** Make the next slide preview window draggable, resizable, and add snap-to-grid for neat positioning.

**Target features:**
- Draggable preview window (click center to move anywhere on screen)
- Resizable preview window (drag corners to adjust size)
- Snap-to-grid toggle button on the window itself
- Position/size persistence (remembers settings between sessions)
- Preview floats over presentation area (teacher-only layer, never visible to students)

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
- ✓ Student window launches reliably (no popup blocker issues) — v1.0
- ✓ Teacher/student views perfectly synchronized — v1.0
- ✓ Student window shows only slides (no controls) — v1.0
- ✓ Auto projector placement on Chromium — v1.0
- ✓ Manual placement instructions on Firefox/Safari — v1.0
- ✓ Presenter remote navigation (Page Up/Down) — v1.0
- ✓ Next slide preview thumbnail — v1.0
- ✓ Window recovery (button re-enables on close) — v1.0
- ✓ Connection status indicator — v1.0
- ✓ Session persistence (survives refresh) — v1.0

### Active

- [ ] Draggable preview window — move anywhere on teacher screen
- [ ] Resizable preview window — drag corners to adjust
- [ ] Snap-to-grid toggle — button on window for neat alignment
- [ ] Preview position/size persistence — remembers settings
- [ ] Elapsed time display showing presentation duration (PRES-03)
- [ ] Fullscreen recovery (auto re-enter if exited) (PRES-04)

### Out of Scope

- Real-time student device sync (each student on their own device) — high complexity, not needed for classroom projector setup
- Cloud storage/authentication — local-first for now
- Mobile app — web-first
- Annotation tools / laser pointer — scope creep, PiPi is teleprompter-focused
- Slide transitions / animations — not core to teleprompter value
- Video embedding — storage/bandwidth concerns

## Context

### Current State

Shipped v1.0 with 3,803 LOC TypeScript.
Tech stack: React 19, Vite, Gemini API, Tailwind CSS.
Client-side only (no backend).

v1.0 delivered rock-solid dual-monitor presentation:
- BroadcastChannel cross-window sync
- Window Management API for auto projector placement
- Heartbeat-based connection monitoring
- Keyboard navigation for presenter remotes

### Technical Environment

- React 19 SPA with Vite
- Gemini API for AI generation
- Tailwind CSS for styling
- No backend — client-side only
- CDN-loaded dependencies (PDF.js, PptxGenJS, html2pdf)

## Constraints

- **Tech stack**: Must remain a client-side SPA (no server). React + Vite.
- **Browser APIs**: Limited to what modern browsers provide (Window Management API, Presentation API, or fullscreen heuristics)
- **Backward compatibility**: Must not break existing functionality (editing, presenting, quizzes)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BroadcastChannel for sync | Cross-window messaging without server | ✓ Good — reliable, fast |
| Hash-based routing | No react-router dependency | ✓ Good — simple, works |
| Synchronous window.open | Preserve user activation for popup | ✓ Good — bypasses blockers |
| Fire-and-forget popup | BroadcastChannel handles all sync | ✓ Good — no window tracking needed |
| Heartbeat for connection | Detect closed windows reliably | ✓ Good — survives refresh |
| Window Management API | Auto projector placement | ✓ Good — works on Chromium |
| Escape closes student | Safer than exiting presentation | ✓ Good — prevents accidents |

---
*Last updated: 2026-01-18 after v1.1 milestone started*
