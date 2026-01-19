# Project Milestones: PiPi

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
