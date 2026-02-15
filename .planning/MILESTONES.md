# Project Milestones: Cue

## v5.0 Smart Generation (Shipped: 2026-02-16)

**Delivered:** Slide generation now runs a three-pass pipeline (generate → check coverage → fill gaps) that automatically produces near-complete decks, accepts supplementary resources (PDF, PPTX, DOCX, images) for AI to weave into slides, and tags every slide with its lesson phase (Hook, I Do, We Do, We Do Together, You Do, Plenary) — so teachers rarely need manual fixes after generation.

**Phases completed:** 65-68 (10 plans total)

**Key accomplishments:**

- Lesson phase detection with regex-based UK/Australian terminology matching, wired into both Gemini and Claude providers
- Supplementary resource upload (PDF, images, DOCX, PPTX) with PPTX text extraction via JSZip/DOMParser and content-capping (2000/6000 chars)
- Three-pass generation pipeline (Generate → Check Coverage → Fill Gaps) with AbortController cancellation and graceful degradation
- Phase-aware UI with color-coded badges, balance indicator, and manual override dropdown on sidebar thumbnails
- Resource injection into AI prompts with system prompt directives for dual-provider parity
- Multi-stage progress UI with pipeline stage dots, cancel support, and coverage score toast

**Stats:**

- 54 files created/modified (+7,703 lines)
- ~36,860 lines of TypeScript (project total)
- 4 phases, 10 plans, 23 requirements
- 3 days (2026-02-14 → 2026-02-16)

**Git range:** `feat(65-01)` → `feat(68-03)`

**What's next:** TBD with /gsd:new-milestone

---

## v4.1 Script Mode (Shipped: 2026-02-08)

**Delivered:** Teachers can now export any Cue deck as a self-contained presentation for colleagues — AI transforms teleprompter scripts into expanded talking-point bullets, exports as PPTX or PDF with images, via a share dialog with progress tracking and preview.

**Phases completed:** 61-64 (5 plans total)

**Key accomplishments:**

- AI transformation service converts teleprompter scripts into expanded talking-point bullets with batched processing and cross-slide context coherence
- Dual-provider support (Gemini + Claude) for script transformation with real-time progress callbacks
- Script-mode PPTX export with dedicated layout (16-18pt text, image thumbnails, shrink-to-fit overflow handling)
- ShareModal component with 4-phase state machine (transform → preview → export → download)
- PDF export with jsPDF vector text rendering, cue marker styling (italic indigo), and print-friendly A4 layout
- End-to-end "Share with colleague" workflow from button click to file download with no cloud dependencies

**Stats:**

- 23 files created/modified (+4,308 lines)
- ~35,000 lines of TypeScript (project total)
- 4 phases, 5 plans, 20 requirements
- 1 day (2026-02-08)

**Git range:** `feat(61-01)` → `feat(64-01)`

**What's next:** TBD with /gsd:new-milestone

---

## v4.0 Clipboard Builder (Shipped: 2026-02-07)

**Delivered:** Teachers can now build slide decks via copy-paste from PowerPoint, paste images directly, condense bloated decks with AI-powered lesson-plan-aware analysis, and fill content gaps against lesson plans — transforming Cue from a PDF-first tool into a flexible deck builder.

**Phases completed:** 55-60 (18 plans total)

**Key accomplishments:**

- Copy-paste from PowerPoint with clipboard event handling, content provenance tracking, and cross-browser support
- AI slide analysis on both Gemini and Claude — pasted slides preserve original visuals full-screen, AI-extracted content drives teleprompter only
- Image paste with canvas compression, drag-drop onto slides, Full Image layout, and AI captioning
- Lesson plan gap analysis with severity-ranked gaps (critical/recommended/nice-to-have) and one-click AI slide generation
- Lesson-plan-aware deck condensation with four-action model (keep/edit/remove/merge) replacing basic cohesion
- Full dual-provider parity: 5 new AI methods on both Gemini and Claude (analyzePastedSlide, analyzeImage, condenseDeck, analyzeGaps, generateSlideFromGap)

**Stats:**

- 15 files created/modified (+3,344 lines)
- ~30,600 lines of TypeScript (project total)
- 6 phases, 18 plans, 26 requirements (21 original + 5 COND)
- 21 days (2026-01-18 → 2026-02-07)

**Git range:** `feat(55-01)` → `feat(59-03)`

**What's next:** TBD with /gsd:new-milestone

---

## v3.9 Delay Answer Reveal (Shipped: 2026-02-01)

**Delivered:** AI-generated slides now separate problems from answers, creating deliberate "thinking pauses" for students. Teachers see scaffolding strategies in the teleprompter to guide students through productive struggle before revealing answers.

**Phases completed:** 51-54 (8 plans total)

**Key accomplishments:**

- Teachable moment detection system with proximity-based Q&A pairing and 30% throttling to preserve lesson flow
- 5 content-specific scaffolding templates (math, vocabulary, comprehension, science, general) with word count constraints (<20 words)
- Bullet structure rules preventing answer leakage (problem first, answer as next progressive reveal)
- Integrated detection into both Gemini and Claude providers for consistent behavior
- 353 tests validating leakage prevention, format diversity across 8 teacher styles, and provider parity

**Stats:**

- 45 files modified
- ~29,000 lines of TypeScript (project total)
- 4 phases, 8 plans, 16 requirements
- 14 days (2026-01-18 → 2026-02-01)

**Git range:** `feat(51-01)` → `feat(scaffolding)`

**What's next:** TBD with /gsd:new-milestone

---

## v3.8 Preserve Teacher Content (Shipped: 2026-02-01)

**Delivered:** AI-generated slides now preserve specific questions, activities, and instructions from lesson plans verbatim rather than generalizing them. Teachers' exact wording ("What is 3/4 of 12?") appears on slides and in teleprompter scripts with delivery context.

**Phases completed:** 48-50 (7 plans total)

**Key accomplishments:**

- Detection module with regex-based pattern matching for questions (punctuation + context) and activities (60+ Bloom's taxonomy verbs)
- XML-tagged prompt rules with few-shot examples and confidence-based filtering
- 102 unit tests with Jest infrastructure (ES Module support for project)
- Claude and Gemini provider integration with mode-specific detection (Fresh, Refine, Blend)
- Quality assurance with 3 test fixtures all passing human review without prompt refinements

**Stats:**

- 40 commits
- ~26,500 lines of TypeScript (project total)
- 3 phases, 7 plans, 16 requirements
- 14 days (2026-01-18 → 2026-02-01)

**Git range:** `docs(48)` → `docs(50)`

**What's next:** TBD with /gsd:new-milestone

---

## v3.7 AI Resource Enhancement (Shipped: 2026-01-31)

**Delivered:** Teachers can upload existing worksheets and handouts (PDF, images, Word), have AI enhance them with lesson context awareness and 3 differentiation levels, preview changes with visual diff, edit inline, and export as print-ready PDFs—all persisting in .cue files.

**Phases completed:** 42-47 (12 plans total)

**Key accomplishments:**

- Student-friendly slide content across all AI providers with grade-level language adaptation
- Resource upload supporting PDF, images (PNG/JPG), and Word documents with drag-drop UI
- AI document analysis using multimodal vision for structure detection
- AI enhancement pipeline with lesson context awareness and 3 differentiation levels (simple/standard/detailed)
- Trust UI with visual diff highlighting, inline editing, and per-element regeneration
- Export to print-ready PDF with zip bundling and full .cue file persistence (v4 format)

**Stats:**

- 30 feat commits
- ~24,747 lines of TypeScript (project total)
- 6 phases, 12 plans, 21 requirements
- 3 days (2026-01-29 → 2026-01-31)

**Git range:** `feat(42-01)` → `feat(47-02)`

**What's next:** TBD with /gsd:new-milestone

---

## v3.5 Working Wall Export (Shipped: 2026-01-27)

**Delivered:** Teachers can export selected slides as printable A4 PDFs for classroom "Working Wall" displays, with optional AI poster enhancement that transforms raw class notes into polished educational reference materials.

**Phases completed:** 38-40 (4 plans total)

**Key accomplishments:**

- Multi-select slide UI with Set-based selection, Shift+click range, Cmd/Ctrl+click toggle
- Export modal with preview grid and mode selection (Quick Export vs AI Poster)
- Quick Export PDF generation (A4 landscape, exact slide content preservation at 150+ DPI)
- AI Poster Mode using Claude structured outputs for educational poster layouts
- Subject-aware color schemes and Year 6 content transformation for wall display
- Per-poster regenerate button for individual poster refinement

**Stats:**

- 8 files created/modified
- ~20,083 lines of TypeScript (project total)
- 3 phases, 4 plans, 17 requirements
- 1 day (2026-01-27)

**Git range:** `a2b2916` → `79fe32a`

**What's next:** TBD with /gsd:new-milestone

---

## v3.4 Ask AI (Shipped: 2026-01-26)

**Delivered:** Teachers can ask AI anything during a presentation without leaving the app. In-presentation AI assistant with streaming responses, lesson context awareness, quick action buttons, and session history.

**Phases completed:** 36-37 (5 plans total)

**Key accomplishments:**

- Streaming AI chat interface with character-by-character display animation (200 chars/sec)
- Multi-provider support (Gemini and Claude) with age-appropriate responses based on grade level
- Lesson context injection (AI receives current slide content, topic, and cumulative lesson context)
- Header dropdown UI with quick action buttons ("Get 3 facts", "Explain simply", "Answer question")
- Copy to clipboard with toast feedback and error handling with retry
- Session history with Cmd/Ctrl+K quick access and Escape to return focus to slides

**Stats:**

- 22 files created/modified
- ~18,420 lines of TypeScript (project total)
- 2 phases, 5 plans, 17 requirements
- 8 days (2026-01-18 → 2026-01-26)

**Git range:** `cf5a02b` → `f065ea3`

**What's next:** TBD with /gsd:new-milestone

---

## v3.3 Deck-wide Verbosity (Shipped: 2026-01-26)

**Delivered:** Extended v3.1's per-slide verbosity to work deck-wide. Teachers select verbosity upfront during upload, can change it globally during presentation mode (with confirmation and batch regeneration), and the setting persists in save files with backward compatibility.

**Phases completed:** 33-35 (3 plans total)

**Key accomplishments:**

- Upfront verbosity selection on landing page — teachers choose Concise/Standard/Detailed before generating slides
- Deck-wide verbosity toggle in teleprompter panel replaces per-slide selector
- Confirmation dialog warns about regeneration cost before batch processing
- Progress overlay shows "slide X of Y" with cancel button and rollback capability
- File format v3 with deckVerbosity field and backward-compatible v2 migration

**Stats:**

- 26 files created/modified
- ~18,345 lines of TypeScript (project total)
- 3 phases, 3 plans, 11 requirements
- 1 day (2026-01-25 → 2026-01-26)

**Git range:** `feat(33-01)` → `feat(35-01)`

**What's next:** TBD with /gsd:new-milestone

---

## v3.2 Pedagogical Slide Types (Shipped: 2026-01-25)

**Delivered:** Extended Cue's AI capabilities with three new slide types (Elaborate for deeper content, Work Together for collaborative activities, Class Challenge for live student input) plus single-slide teleprompter regeneration with context awareness.

**Phases completed:** 29-32 (4 plans total)

**Key accomplishments:**

- Single teleprompter regeneration with surrounding slide context for natural script flow
- Elaborate slide insertion via purple + menu button generating 3-5 paragraphs with examples
- Work Together slides with Fisher-Yates shuffled student pairs and teal-themed layout
- Class Challenge slides with live contribution input and real-time sync to student view
- All new slide types support verbosity levels and integrate with existing teleprompter system
- AI providers (Gemini and Claude) extended with 3 new generation methods

**Stats:**

- 31 files created/modified
- ~18,100 lines of TypeScript (project total)
- 4 phases, 4 plans, 17 requirements
- 1 day (2026-01-25)

**Git range:** `feat(29-01)` → `feat(32-01)`

**What's next:** TBD with /gsd:new-milestone

---

## v3.1 Teleprompter Verbosity (Shipped: 2026-01-25)

**Delivered:** Three-level verbosity toggle in teleprompter panel allowing teachers to switch between Concise, Standard, and Detailed scripts mid-lesson with per-slide caching for instant switch-back.

**Phases completed:** 27-28 (3 plans total)

**Key accomplishments:**

- Verbosity selector UI with three buttons (Concise/Standard/Detailed) in teleprompter panel
- AI regeneration support for both Gemini and Claude providers with verbosity-specific rules
- Per-slide verbosity caching with instant switch-back (no re-generation needed)
- Cache persistence in .cue file format (v2) surviving browser refresh
- Backward compatibility with v1 files (defaults to Standard verbosity)
- Navigation persistence (verbosity selection survives slide changes)

**Stats:**

- 18 files created/modified
- ~17,000 lines of TypeScript (project total)
- 2 phases, 3 plans
- 1 day (2026-01-24)

**Git range:** `feat(27-01)` → `feat(28-01)`

**What's next:** TBD with /gsd:new-milestone

---

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

## v5.0 Smart Generation (Shipped: 2026-02-15)

**Phases completed:** 75 phases, 166 plans, 19 tasks

**Key accomplishments:**
- (none recorded)

---

