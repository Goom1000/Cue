# PiPi (Presentation Intelligence)

## What This Is

A presentation tool for teachers that transforms PDF lesson plans into interactive slideshows with AI-generated content, a teleprompter script for the teacher, and progressive bullet reveal. Teachers upload their existing lesson plans, select student age/grade level, and the AI creates an engaging presentation with speaker notes that guide the teacher through natural, conversational delivery.

**v2.4 shipped:** Teachers can call on specific students by ability level with AI-generated questions that show answers in the teleprompter, fair student cycling, and student name banners on the projector.

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
- ✓ Draggable preview window — v1.1
- ✓ Resizable preview window (corner drag with aspect ratio lock) — v1.1
- ✓ Snap-to-grid toggle (50px invisible grid) — v1.1
- ✓ Preview position/size/snap persistence (localStorage) — v1.1
- ✓ Preview floats above all UI (portal, z-index 9999) — v1.1
- ✓ Permission state loading gates UI (race condition fixed) — v1.2
- ✓ Dynamic button labels for auto-placement status — v1.2
- ✓ Inline permission request link — v1.2
- ✓ Browser-specific recovery guidance for denied permissions — v1.2
- ✓ Save presentation to downloadable .pipi file — v2.0
- ✓ Load presentation from .pipi file (file picker + drag-drop) — v2.0
- ✓ Multi-provider AI support (Gemini, Claude) — v2.0
- ✓ API key settings UI with local storage — v2.0
- ✓ AI features disabled state when no API key — v2.0
- ✓ Provider setup instructions with cost information — v2.0
- ✓ GitHub Pages deployment (auto-deploy on push) — v2.0
- ✓ Auto-save to localStorage with crash recovery — v2.0
- ✓ "Load Presentation" button on landing page alongside PDF upload — v2.1
- ✓ Drag-and-drop .pipi files on landing page → auto-loads to editor — v2.1
- ✓ PiPi branding (styled header, browser tab, favicon, watermark) — v2.1
- ✓ Dark mode as default theme — v2.1
- ✓ Dual PDF upload zones (lesson plan + existing presentation) — v2.2
- ✓ AI Fresh mode (lesson PDF only generates slides) — v2.2
- ✓ AI Refine mode (adapts existing PPT to PiPi format with content preservation) — v2.2
- ✓ AI Blend mode (combines lesson content with existing slides) — v2.2
- ✓ Save student list as named class — v2.2
- ✓ Load saved class into any presentation — v2.2
- ✓ Class bank localStorage persistence — v2.2
- ✓ Class management (view, rename, edit students, delete with undo) — v2.2
- ✓ Game activity displays in student view during presentation — v2.3
- ✓ Slide preview fits correctly in teacher view (no cutoff) — v2.3
- ✓ AI slide revision feature works without errors — v2.3
- ✓ Flowchart layout has centered arrows and fills whitespace — v2.3
- ✓ Question + answer display in teleprompter — v2.4
- ✓ Student grade level assignment (A/B/C/D/E) in class bank — v2.4
- ✓ 5 difficulty buttons (A through E) in teleprompter — v2.4
- ✓ Manual vs Targeted questioning mode toggle — v2.4
- ✓ Student cycling with randomized order per grade level — v2.4
- ✓ Student name overlay banner on student view — v2.4
- ✓ Infinite randomized cycling (reshuffle when all asked) — v2.4

### Active

(None — define requirements for next milestone with /gsd:new-milestone)

### Deferred (v2.5+)

- [ ] Elapsed time display showing presentation duration
- [ ] Fullscreen recovery (auto re-enter if exited)
- [ ] Setup wizard with screenshots
- [ ] Video walkthrough for API key setup
- [ ] API calls this session counter
- [ ] Auto-save indicator in header
- [ ] Model selection dropdown in settings

### Out of Scope

- Real-time student device sync (each student on their own device) — high complexity, not needed for classroom projector setup
- Cloud storage/authentication — file-based sharing is sufficient for team of 5
- Mobile app — web-first
- Annotation tools / laser pointer — scope creep, PiPi is teleprompter-focused
- Slide transitions / animations — not core to teleprompter value
- Video embedding — storage/bandwidth concerns
- User accounts / login system — colleagues load shared files, no auth needed
- Desktop installer (Electron/Tauri) — GitHub Pages simpler, free, auto-updates
- OpenAI provider support — browser CORS blocked, no workaround without backend

## Context

### Current State

Shipped v2.4 with ~9,400 LOC TypeScript.
Tech stack: React 19, Vite, Gemini/Claude API, Tailwind CSS, react-rnd.
Client-side only (no backend).
Deployed at: https://goom1000.github.io/PiPi/

v2.4 delivered Targeted Questioning:
- Grade assignment (A-E) for students in class bank with localStorage persistence
- AI question + answer generation with Bloom's taxonomy mapping (5 difficulty levels)
- Manual vs Targeted mode toggle with fair Fisher-Yates shuffle cycling
- Student name banner overlay on student view via BroadcastChannel
- Progress counter with expandable student list showing who's been asked
- Export/import grade preservation in .pipi files

### Technical Environment

- React 19 SPA with Vite
- Gemini/Claude API for AI generation
- Tailwind CSS for styling
- No backend — client-side only
- CDN-loaded dependencies (PDF.js, PptxGenJS, html2pdf)
- GitHub Pages hosting with GitHub Actions CI/CD

## Constraints

- **Tech stack**: Must remain a client-side SPA (no server). React + Vite.
- **Browser APIs**: Limited to what modern browsers provide (Window Management API, Presentation API, or fullscreen heuristics)
- **Backward compatibility**: Must not break existing functionality (editing, presenting, quizzes)
- **API providers**: Limited to providers with browser CORS support (Gemini, Claude)

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
| react-rnd for drag+resize | Only library combining drag + resize with aspect ratio lock | ✓ Good — v1.1 |
| 20px edge magnetism | Snap preview to viewport edges for neat positioning | ✓ Good — v1.1 |
| Portal rendering | Float above all UI via document.body portal (z-index 9999) | ✓ Good — v1.1 |
| Corner-only resize handles | Clean appearance, handles appear on hover | ✓ Good — v1.1 |
| Per-presentation storage key | Uses first slide ID for storage key uniqueness | ✓ Good — v1.1 |
| 50px invisible grid | Precision snapping without visual clutter | ✓ Good — v1.1 |
| isLoading state pattern | Safe default prevents race condition | ✓ Good — v1.2 |
| Friendly display label | "External Display" instead of raw device name | ✓ Good — v1.2 |
| Inline permission link | Simpler than popup-based explainer | ✓ Good — v1.2 |
| Browser detection order | Check Edg/ before Chrome/ (Edge UA includes Chrome) | ✓ Good — v1.2 |
| Strategy pattern for providers | Clean abstraction for multi-provider AI | ✓ Good — v2.0 |
| OpenAI removed | Browser CORS blocked, confusing for users | ✓ Good — v2.0 |
| Settings sync on modal close | Prevents race condition with localStorage | ✓ Good — v2.0 |
| Lock icon overlay pattern | Consistent disabled AI appearance | ✓ Good — v2.0 |
| JSON pretty-print for .pipi | Human-readable file format | ✓ Good — v2.0 |
| 30s auto-save interval | Balances safety with performance | ✓ Good — v2.0 |
| GitHub Actions v4 | Stable action version, v6 doesn't exist | ✓ Good — v2.0 |
| Load button left of Generate | Secondary action left, primary right | ✓ Good — v2.1 |
| Styled text header branding | Better theming than logo image | ✓ Good — v2.1 |
| Dark mode default | Better visual experience for new users | ✓ Good — v2.1 |
| Upload mode via useMemo | Automatic detection based on files present | ✓ Good — v2.2 |
| Green/Blue upload zones | Visual distinction (green=lesson, blue=presentation) | ✓ Good — v2.2 |
| Backward compatible GenerationInput | string \| GenerationInput signature for providers | ✓ Good — v2.2 |
| Content preservation in Refine | AI restructures but never omits content | ✓ Good — v2.2 |
| Blend mode 5 images per source | Token safety (10 total images max) | ✓ Good — v2.2 |
| CLASS_BANK_KEY constant | Consistent localStorage key pattern | ✓ Good — v2.2 |
| Type guard for saved classes | Validates student array on load | ✓ Good — v2.2 |
| Inline edit for class rename | Click-to-edit with blur/Enter save | ✓ Good — v2.2 |
| Expand-in-place student editing | Avoids modal-within-modal complexity | ✓ Good — v2.2 |
| Toast undo for class delete | Reversible destructive operation | ✓ Good — v2.2 |
| Flexbox fill for slide layout | Remove transform scale; let slides fill space naturally | ✓ Good — v2.3 |
| Transient error retry only | Retry NETWORK_ERROR, RATE_LIMIT, SERVER_ERROR (not AUTH_ERROR, PARSE_ERROR) | ✓ Good — v2.3 |
| Exponential backoff 1s/2s | Max 2 retries with increasing delay before toast | ✓ Good — v2.3 |
| Exclude 'setup' mode from sync | Setup is teacher-only config screen with no content for students | ✓ Good — v2.3 |
| Ref-based game tracking | Prevent spurious GAME_CLOSE on mount when gameState is initially null | ✓ Good — v2.3 |
| Optional studentData migration | Backward-compatible grade storage with migration on read | ✓ Good — v2.4 |
| Bloom's taxonomy mapping | A-E difficulty levels map to cognitive depth (Analysis → Recall) | ✓ Good — v2.4 |
| Fisher-Yates shuffle | Unbiased O(n) randomization for fair student cycling | ✓ Good — v2.4 |
| STUDENT_SELECT/CLEAR messages | BroadcastChannel pattern for ephemeral banner state | ✓ Good — v2.4 |
| Targeted mode default | Teachers want targeted questioning as primary experience | ✓ Good — v2.4 |
| Cycling reset on slide change | Fair distribution per slide, students can be asked again | ✓ Good — v2.4 |

---
*Last updated: 2026-01-22 after v2.4 milestone completion*
