# Project Milestones: Cue

## v3.0 Quiz Game Variety (Shipped: 2026-01-24)

**Delivered:** Transformed Cue from a single-game quiz tool into a multi-game platform with TV show-style formats (Who Wants to Be a Millionaire, Beat the Chaser), unified game architecture, AI-generated questions from lesson content, and individual/team competition modes.

**Phases completed:** 20-26 (33 plans total)

**Key accomplishments:**

- Unified game architecture with discriminated union types enabling 4 game formats without state silos
- Who Wants to Be a Millionaire with 3/5/10 question variants, money tree, safe havens, and 3 functional lifelines (50:50, Audience Poll, AI Phone-a-Friend)
- Beat the Chaser with dual independent countdown timers, catch-up mechanics, and AI-controlled chaser
- AI question generation from lesson content with progressive difficulty (Bloom's taxonomy mapping)
- Competition modes (individual/team) with score tracking and auto-generated team names
- Student view synchronization with classroom-optimized display (large timers, phase banners, urgency effects)

**Stats:**

- 132 files created/modified
- ~27,000 lines added (net)
- 7 phases, 33 plans
- 2 days (2026-01-23 → 2026-01-24)

**Git range:** `bd38f2f` → `fc39bd4`

**What's next:** TBD with /gsd:new-milestone

---

## v2.5 Rebrand to Cue (Shipped: 2026-01-22)

**Delivered:** Complete rebrand from PiPi to Cue across UI, file format (.cue extension with .pipi backward compatibility), and GitHub repository with deployment at https://goom1000.github.io/Cue/

**Phases completed:** 19 (2 plans total)

**Key accomplishments:**

- Complete UI rebrand (header, browser tab, landing page, footer) from "PiPi" to "Cue"
- File format migration to `.cue` extension with backward compatibility for `.pipi` files
- TypeScript types renamed from PiPi* to Cue* (CueFile, CueFileContent, etc.)
- AI prompts updated to reference "Cue-style"
- GitHub repository renamed to "Cue"
- GitHub Pages deployment live at https://goom1000.github.io/Cue/

**Stats:**

- 19 files created/modified
- ~9,400 lines of TypeScript (project total)
- 1 phase, 2 plans, 10 requirements
- 1 day (2026-01-22)

**Git range:** `84eb233` → `ab14dda`

**What's next:** TBD with /gsd:new-milestone

---

## v2.4 Targeted Questioning (Shipped: 2026-01-22)

**Delivered:** Enabled teachers to call on specific students by ability level with AI-generated questions that show answers in the teleprompter, fair student cycling, and student name banners on the projector.

**Phases completed:** 15-18 (9 plans total)

**Key accomplishments:**

- Grade assignment (A-E) for students in class bank with localStorage persistence
- AI question + answer generation with Bloom's taxonomy mapping (5 difficulty levels)
- Manual vs Targeted mode toggle with fair Fisher-Yates shuffle cycling
- Student name banner overlay on student view via BroadcastChannel
- Progress counter with expandable student list showing who's been asked
- Export/import grade preservation in .pipi files

**Stats:**

- 12 files created/modified
- ~9,400 lines of TypeScript (project total)
- 4 phases, 9 plans, 16 requirements
- 2 days (2026-01-21 -> 2026-01-22)

**Git range:** `feat(15-01)` -> `docs(18)`

**What's next:** TBD with /gsd:new-milestone

---

## v2.3 Bug Fixes (Shipped: 2026-01-21)

**Delivered:** Fixed critical UI/sync bugs affecting presentation experience: flowchart layout, teacher view slide display, AI revision error handling, and game activity not syncing to student view.

**Phases completed:** 12-14 (4 plans total)

**Key accomplishments:**

- Fixed flowchart layout with centered arrows and equal-height boxes
- Fixed teacher view slide display (no more cutoff/cropping)
- Added graceful AI error handling with retry logic and toast notifications
- Real-time game sync from teacher to student view via BroadcastChannel
- Created StudentGameView component for read-only quiz display
- 100% requirement coverage (8/8) with no tech debt

**Stats:**

- 28 files created/modified
- ~8,000 lines of TypeScript (project total)
- 3 phases, 4 plans
- 2 days (2026-01-20 → 2026-01-21)

**Git range:** `fix(12-01)` → `test(14)`

**What's next:** TBD with /gsd:new-milestone

---

## v2.2 Flexible Upload & Class Bank (Shipped: 2026-01-20)

**Delivered:** Added flexible PDF upload (lesson plans, existing presentations, or both) with AI adaptation modes, plus a class bank for saving/loading student lists across presentations.

**Phases completed:** 8-11 (8 plans total)

**Key accomplishments:**

- Dual PDF upload zones with automatic mode detection (Fresh/Refine/Blend)
- AI adaptation logic with mode-specific prompts for Claude and Gemini
- Content preservation in refine mode (restructures without omitting)
- Class bank with save/load functionality persisting in localStorage
- Full class management UI with inline rename, student editing, delete with undo

**Stats:**

- 49 files created/modified
- ~7,800 lines of TypeScript (project total)
- 4 phases, 8 plans
- 1 day (2026-01-19 → 2026-01-20)

**Git range:** `feat(08-01)` → `feat(11-02)`

**What's next:** TBD with /gsd:new-milestone

---

## v2.1 Landing Page & Branding (Shipped: 2026-01-19)

**Delivered:** Added landing page entry point for existing presentations (Load button + drag-drop) and rebranded the app from LessonLens to PiPi with styled text header, illustrated logo, and dark mode default.

**Phases completed:** 6-7 (2 plans total)

**Key accomplishments:**

- "Load Presentation" button on landing page alongside PDF upload
- Drag-and-drop .pipi files on landing page for instant loading
- Styled "PiPi" header branding with whiteboard icon (violet/amber theme)
- Illustrated landing page logo with whiteboard screen and PiPi text
- Dark mode as default theme, subtle violet tint in light mode
- Browser tab title, favicon, and ResourceHub watermark updated to PiPi

**Stats:**

- 18 files created/modified
- 6,993 lines of TypeScript (project total)
- 2 phases, 2 plans
- Same day (2026-01-19, ~4 hours)

**Git range:** `feat(06-01)` → `docs(07)`

**What's next:** TBD with /gsd:new-milestone

---

## v2.0 Shareable Presentations (Shipped: 2026-01-19)

**Delivered:** Transformed PiPi from a personal tool into a shareable application with save/load functionality, multi-provider AI support (Gemini/Claude), and public deployment to GitHub Pages.

**Phases completed:** 1-5 (11 plans total)

**Key accomplishments:**

- Settings panel with API key management, provider selection, and step-by-step setup instructions
- Multi-provider AI abstraction supporting Gemini and Claude (OpenAI removed due to CORS)
- Graceful AI degradation with lock icons and EnableAIModal for unconfigured users
- Save/load system with .pipi file format, drag-drop, auto-save, and crash recovery
- GitHub Pages deployment with automatic CI/CD at goom1000.github.io/PiPi

**Stats:**

- 71 files created/modified
- 6,956 lines of TypeScript (project total)
- 5 phases, 11 plans
- 1 day (2026-01-19)

**Git range:** `feat(01-01)` → `docs(05)`

**What's next:** TBD with /gsd:new-milestone

---

## v1.2 Permission Flow Fix (Shipped: 2026-01-18)

**Delivered:** Fixed permission detection race condition and improved permission UX with dynamic button labels, inline permission requests, and browser-specific recovery guidance.

**Phases completed:** 1-2 (5 plans total)

**Key accomplishments:**

- Fixed race condition with isLoading state pattern (loading gates all permission UI)
- Dynamic button labels reflect auto-placement capability ("Launch → External Display")
- Inline permission request link replaces popup-based PermissionExplainer
- Browser-specific recovery modal (Chrome/Edge instructions for denied permissions)
- Warning icon for denied state with recovery guidance

**Stats:**

- 11 files created/modified
- 4,499 lines of TypeScript (project total)
- 2 phases, 5 plans
- Same day (2026-01-18)

**Git range:** `cf7c6a6` → `599ffaf`

**What's next:** TBD with /gsd:new-milestone

---

## v1.1 Draggable Preview Window (Shipped: 2026-01-18)

**Delivered:** Fully interactive floating preview window with drag, resize, snap-to-grid, and session persistence.

**Phases completed:** 1-2 (3 plans total)

**Key accomplishments:**

- FloatingWindow component with react-rnd for drag + resize with aspect ratio lock
- Corner-only resize handles with hover reveal and 80% drag opacity feedback
- Edge magnetism (20px threshold) snaps preview to viewport edges
- useViewportBounds hook keeps preview visible when browser resizes
- Per-presentation localStorage persistence (position, size, snap state)
- Snap-to-grid toggle with 50px invisible grid for precise positioning

**Stats:**

- 20 files created/modified
- 4,361 lines of TypeScript (project total)
- 2 phases, 3 plans
- Same day (8 hours from milestone start to ship)

**Git range:** `cbf9aa5` → `469168f`

**What's next:** v2 enhancements (elapsed time display, fullscreen recovery) or new features

---

## v1.0 Dual-Monitor Student View (Shipped: 2026-01-18)

**Delivered:** Rock-solid dual-monitor presentation mode where students see only slides on a projector while teachers see slides plus teleprompter on their laptop.

**Phases completed:** 1-3 (6 plans total)

**Key accomplishments:**

- BroadcastChannel sync infrastructure for type-safe cross-window messaging
- Reliable popup launch with fallback UI for manual projector setup
- Auto projector placement via Window Management API on Chromium browsers
- Connection monitoring with heartbeat status and reconnection toasts
- Presenter remote support (Page Up/Down, Arrow keys, Space, Escape)
- Next slide preview thumbnail in teacher view

**Stats:**

- 32 files created/modified
- 3,803 lines of TypeScript
- 3 phases, 6 plans
- 1 day from start to ship

**Git range:** `94aa4ac` → `c83bd70`

**What's next:** v2 enhancements (elapsed time, fullscreen recovery) or new features

---
