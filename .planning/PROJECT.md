# Cue (Presentation Intelligence)

## What This Is

A presentation tool for teachers that transforms PDF lesson plans into interactive slideshows with AI-generated content, a teleprompter script for the teacher, and progressive bullet reveal. Teachers upload their existing lesson plans, select student age/grade level, and the AI creates an engaging presentation with speaker notes that guide the teacher through natural, conversational delivery.

**v6.0 shipped:** Scripted Import — Teachers can import pre-scripted lesson plans with marker annotations (Say:/Ask:/Write on board:/Activity:) directly into Cue. The parser preserves the teacher's exact words as the teleprompter script, maps markers to slide structure, and adds AI-generated image prompts with graceful fallback. Multi-day lesson plans split into selectable days via day picker. Claude Chat Tips page provides copyable prompt templates. Deployed at https://goom1000.github.io/Cue/

## Current State

Shipped v6.0 with ~39,847 LOC TypeScript. v6.0 delivered Scripted Import: marker-annotated lesson plan parser (Say/Ask/Write on board/Activity), positional segment mapper enforcing teleprompter invariant, scripted pipeline mode bypassing AI with early-return, batch AI enrichment for image prompts/layouts with three-tier fallback, multi-day day picker UI with auto-detection banner, multi-format upload (PDF/DOCX/TXT), and Claude Chat Tips with copyable prompt templates. 25 milestones shipped, 73 phases completed, 232 plans executed.

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
- ✓ App header, browser tab, favicon show "Cue" branding — v2.5
- ✓ Save files use `.cue` extension (backward compatible with `.pipi`) — v2.5
- ✓ GitHub repo renamed with deployment at https://goom1000.github.io/Cue/ — v2.5
- ✓ Game selection menu with all quiz game options — v3.0
- ✓ Who Wants to Be a Millionaire with functional lifelines (50:50, Audience, Phone-a-Friend) — v3.0
- ✓ Beat the Chaser with dual independent timers and catch-up mechanics — v3.0
- ✓ The Chase game format (AI or teacher-controlled chaser) — v3.0 (disabled in UI, code preserved)
- ✓ Individual vs team competition modes with score tracking — v3.0
- ✓ AI question generation integrated with Bloom's taxonomy difficulty — v3.0
- ✓ Game board synced to student view with answer reveal control — v3.0
- ✓ Three-level verbosity toggle (Concise / Standard / Detailed) — v3.1
- ✓ Verbosity selector in teleprompter panel header — v3.1
- ✓ On-demand regeneration when verbosity changed — v3.1
- ✓ Per-slide verbosity caching (instant switch-back) — v3.1
- ✓ Loading indicator during regeneration — v3.1
- ✓ Cache persistence in presentation state (survives refresh) — v3.1
- ✓ Backward compatibility for v1 files (defaults to Standard) — v3.1
- ✓ Single teleprompter regeneration with context awareness — v3.2
- ✓ Elaborate slide insertion (AI-generated deeper content) — v3.2
- ✓ Work Together slide insertion (collaborative pair activities) — v3.2
- ✓ Class Challenge slide (live contribution capture with real-time sync) — v3.2
- ✓ Upfront verbosity selection on landing page during upload — v3.3
- ✓ Deck-wide verbosity toggle in presentation mode with confirmation dialog — v3.3
- ✓ Full regeneration of all slides when verbosity changes — v3.3
- ✓ Clear all per-slide caches on deck-wide verbosity change — v3.3
- ✓ Persist deck verbosity level in .cue save file (file format v3) — v3.3
- ✓ Ask AI text input in teleprompter panel (header dropdown) — v3.4
- ✓ Streaming AI response display with character animation — v3.4
- ✓ Lesson context injection for AI queries (topic, slide, grade level) — v3.4
- ✓ Quick action buttons for common queries — v3.4
- ✓ Copy response to clipboard with toast feedback — v3.4
- ✓ Teacher-only visibility (no student sync) — v3.4
- ✓ Session history with scrollable view and clear button — v3.4
- ✓ Keyboard shortcut (Cmd+K) to focus input, Escape to blur — v3.4
- ✓ Multi-select slides in thumbnail sidebar (Set-based, Shift+click, Cmd/Ctrl+click) — v3.5
- ✓ "Export for Working Wall" button appears when slides selected — v3.5
- ✓ Quick export of selected slides as-is to A4 PDF (150+ DPI print quality) — v3.5
- ✓ AI Poster Mode transforms selected slides into classroom wall posters — v3.5
- ✓ Poster aesthetic with larger text, clearer hierarchy, subject-aware colors — v3.5
- ✓ AI uses slide context (current + surrounding slides) for coherent poster content — v3.5
- ✓ Student-friendly slide content with grade-level language adaptation — v3.7
- ✓ Upload existing resources (images, PDF, Word/Docs) for AI enhancement — v3.7
- ✓ AI document analysis with multimodal vision for structure detection — v3.7
- ✓ AI enhancement with lesson context awareness — v3.7
- ✓ Differentiation output (simple/standard/detailed versions) — v3.7
- ✓ Visual diff showing what AI changed from original — v3.7
- ✓ In-app preview and inline edit before export — v3.7
- ✓ Per-element AI regeneration for targeted improvements — v3.7
- ✓ Export enhanced resources as print-ready PDF with zip bundling — v3.7
- ✓ Persist enhanced resources in .cue save file (v4 format) — v3.7
- ✓ Detect questions by punctuation (?) and context ("Ask:", headings) — v3.8
- ✓ Detect activities by Bloom's taxonomy action verbs — v3.8
- ✓ Preserve questions and activities verbatim on slides — v3.8
- ✓ Preserve questions and activities in teleprompter with delivery context — v3.8
- ✓ Preservation works in Fresh, Refine, and Blend modes — v3.8
- ✓ Non-preserved content maintains student-friendly language — v3.8
- ✓ Detect teachable moments by pattern (Q&A pairs, definitions, math with results) — v3.9
- ✓ Conservative detection threshold (<30% of bullets flagged) — v3.9
- ✓ Classify content type (math, vocabulary, comprehension, science) — v3.9
- ✓ Pair problems with their answers (within proximity threshold) — v3.9
- ✓ Split problem/answer into separate progressive bullets — v3.9
- ✓ Problem bullet first with no answer leakage — v3.9
- ✓ Answer bullet as next progressive reveal — v3.9
- ✓ Maintain natural lesson flow (no awkward transitions) — v3.9
- ✓ Generate strategy steps in teleprompter between problem and answer — v3.9
- ✓ Include 2-3 question prompts per delayed answer — v3.9
- ✓ Scaffolding matches content complexity — v3.9
- ✓ Subject-specific scaffolding templates (math, vocabulary, comprehension, science, general) — v3.9
- ✓ Scaffolding verbally deliverable (<20 words per prompt) — v3.9
- ✓ No answer leakage in problem statement or scaffolding — v3.9
- ✓ Detection works across lesson plan formats — v3.9
- ✓ Works with both Gemini and Claude providers — v3.9
- ✓ Copy slide from PowerPoint and paste into Cue — v4.0
- ✓ AI analyzes pasted slide content for teleprompter — v4.0
- ✓ Paste images directly into slides with AI captioning — v4.0
- ✓ "Full Image" layout option in tile selector — v4.0
- ✓ Drag-drop images onto existing slides — v4.0
- ✓ Lesson-plan-aware deck condensation (replaces cohesion) — v4.0
- ✓ Upload lesson plan after deck built for gap analysis — v4.0
- ✓ One-click AI slide generation from identified gaps — v4.0
- ✓ AI transforms teleprompter scripts into expanded talking-point bullets for colleague delivery — v4.1
- ✓ "Share with colleague" button with export dialog (PPTX / PDF format choice) — v4.1
- ✓ Exported deck includes images alongside expanded text — v4.1
- ✓ Optional preview of script version before download — v4.1
- ✓ Three-pass generation pipeline (generate → check coverage → fill gaps) for near-complete decks — v5.0
- ✓ Coverage score display after generation — v5.0
- ✓ Multi-stage progress UI with pipeline stage dots and cancel support — v5.0
- ✓ Graceful pipeline degradation (Pass 2/3 failure → Pass 1 slides with warning) — v5.0
- ✓ Position-aware gap slide insertion without corrupting slide order — v5.0
- ✓ AbortController cancellation with partial results preserved — v5.0
- ✓ Supplementary resource upload (PDF, images, DOCX, PPTX) on landing page — v5.0
- ✓ PPTX text extraction via JSZip + DOMParser (no new dependencies) — v5.0
- ✓ Content capping (2000 chars/resource, 6000 total) for token safety — v5.0
- ✓ AI resource injection with callout references woven into slides — v5.0
- ✓ ResourceHub pre-population from landing page uploads — v5.0
- ✓ Resource persistence in .cue save file (v5 format) — v5.0
- ✓ Lesson phase detection (Hook, I Do, We Do, We Do Together, You Do, Plenary) — v5.0
- ✓ Regex-based phase patterns with UK/Australian teaching terminology — v5.0
- ✓ Color-coded phase badges on sidebar slide cards — v5.0
- ✓ Phase balance indicator with distribution visualization — v5.0
- ✓ Manual phase override via badge dropdown — v5.0
- ✓ Phase label persistence in .cue save file — v5.0
- ✓ Phase detection scoped to Fresh/Blend modes only — v5.0
- ✓ Dual-provider parity for all pipeline features (Gemini + Claude) — v5.0
- ✓ Resource injection uses same prompt structure for both providers — v5.0
- ✓ Scripted lesson plan parser with 4 marker types (Say/Ask/Write on board/Activity) — v6.0
- ✓ Multi-day lesson plan splitting and day selection — v6.0
- ✓ Scripted mode bypasses AI generation, preserving teacher's exact words — v6.0
- ✓ Batch AI enrichment for image prompts and layouts with three-tier fallback — v6.0
- ✓ Auto-detection banner and mode toggle for scripted import — v6.0
- ✓ Multi-format upload (PDF, DOCX, TXT) for lesson plans — v6.0
- ✓ Claude Chat Tips with copyable prompt template and shared SUPPORTED_MARKERS constant — v6.0

### Active

(No active milestone — run `/gsd:new-milestone` to start next)

### Deferred

- [ ] Tooltips and onboarding walkthrough (v3.6 deferred — Phase 41 infrastructure complete)
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

Shipped v6.0 with ~39,847 LOC TypeScript.
Tech stack: React 19, Vite, Gemini/Claude API, Tailwind CSS, react-rnd, jsPDF, html2canvas, mammoth.js, react-diff-viewer-continued, JSZip, PptxGenJS, Jest 30.
Client-side only (no backend).
Deployed at: https://goom1000.github.io/Cue/

v6.0 delivered Scripted Import:
- Marker-annotated lesson plan parser (Say/Ask/Write on board/Activity) with multi-day splitting
- Positional segment mapper enforcing teleprompter segment count invariant
- Scripted pipeline mode bypassing all AI passes with early-return
- Batch AI enrichment for image prompts, layouts, and themes with three-tier fallback
- Auto-detection banner, day picker grid, multi-format upload (PDF/DOCX/TXT)
- Claude Chat Tips overlay with copyable prompt template sharing SUPPORTED_MARKERS constant

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

| Backward compatible file format | Accept both .cue and .pipi extensions | ✓ Good — v2.5 |
| Internal identifiers preserved | localStorage/BroadcastChannel keep pipi- prefix | ✓ Good — v2.5 |
| Repository name "Cue" | Simple, matches brand, short URL | ✓ Good — v2.5 |
| Discriminated union game state | Type-safe routing with exhaustive switch | ✓ Good — v3.0 |
| Game state factories | Consistent initial state creation per game type | ✓ Good — v3.0 |
| Atomic state snapshots | Full game state sync prevents race conditions | ✓ Good — v3.0 |
| Bloom's taxonomy difficulty | Maps easy/medium/hard to cognitive depth levels | ✓ Good — v3.0 |
| Fisher-Yates answer shuffle | Unbiased randomization of correct answer position | ✓ Good — v3.0 |
| useRef for shown-state tracking | Prevents re-render loops in overlay components | ✓ Good — v3.0 |
| Turn-based timer mechanics | Only active player's timer counts down | ✓ Good — v3.0 |
| The Chase disabled in UI | Code preserved but removed from menu per user preference | ✓ Good — v3.0 |
| Context-aware regeneration | Pass surrounding slides to AI for coherent flow | ✓ Good — v3.2 |
| Differential cache behavior | Standard clears cache, variants preserve | ✓ Good — v3.2 |
| Full presentation context in AI prompts | Prevents content repetition across slides | ✓ Good — v3.2 |
| slideType marker | Foundation for slide type badges (elaborate, work-together, class-challenge) | ✓ Good — v3.2 |
| Fisher-Yates pair generation | Unbiased randomization for student pairs | ✓ Good — v3.2 |
| StudentPair separate from content | Enables shuffle without AI regeneration | ✓ Good — v3.2 |
| Implicit locking via layout visibility | No explicit lock state needed for Class Challenge | ✓ Good — v3.2 |
| Contribution sync via STATE_UPDATE | Reuses existing BroadcastChannel message | ✓ Good — v3.2 |
| Optional verbosity in GenerationInput | Backward compatibility with existing callers | ✓ Good — v3.3 |
| Deck-wide replaces per-slide verbosity | Simpler UX, consistent deck experience | ✓ Good — v3.3 |
| AbortController for batch cancel | React-native pattern for cancellable async operations | ✓ Good — v3.3 |
| Snapshot rollback on cancel | Deep copy before batch allows full state restoration | ✓ Good — v3.3 |
| File format v3 with deckVerbosity | Persist deck-wide setting, omit 'standard' for clean files | ✓ Good — v3.3 |
| Lifted deckVerbosity to App.tsx | State at persistence boundary, controlled prop to PresentationView | ✓ Good — v3.3 |
| Header dropdown for Ask AI | User testing showed inline teleprompter placement too cluttered | ✓ Good — v3.4 |
| AsyncGenerator for streaming | Native TypeScript pattern, works with async/await | ✓ Good — v3.4 |
| ChatContext with gradeLevel | Enables age-appropriate AI responses | ✓ Good — v3.4 |
| Manual SSE parsing for Claude | EventSource doesn't support POST, implemented buffer strategy | ✓ Good — v3.4 |
| Character animation 200 chars/sec | requestAnimationFrame with dual-state pattern for smooth streaming | ✓ Good — v3.4 |
| Arrow keys blur input | Preserves slide navigation while Ask AI panel open | ✓ Good — v3.4 |
| History saved after stream completes | Only successful responses saved to history | ✓ Good — v3.4 |
| Timestamp as React key | Guaranteed unique for history entries | ✓ Good — v3.4 |
| Multimodal AI for document analysis | Gemini/Claude vision superior to OCR, avoids Tesseract.js bloat | ✓ Good — v3.7 |
| mammoth.js for Word support | Lightweight DOCX parsing, only new dependency needed | ✓ Good — v3.7 |
| Preserve mode as enhancement default | Prevents AI from hallucinating or removing original content | ✓ Good — v3.7 |
| Gemini responseSchema vs Claude tool_choice | Each provider's native structured output mechanism | ✓ Good — v3.7 |
| 15-slide context limit for enhancement | Prevents token overflow while maintaining lesson alignment | ✓ Good — v3.7 |
| contenteditable="plaintext-only" for editing | Security best practice, prevents XSS in inline editing | ✓ Good — v3.7 |
| Map-based edit state with tuple serialization | O(1) lookup, JSON-compatible via [number, string][] | ✓ Good — v3.7 |
| react-diff-viewer-continued | Word-level diff highlighting with dark mode support | ✓ Good — v3.7 |
| Diff and edit modes mutually exclusive | Prevents UI confusion, clear mental model | ✓ Good — v3.7 |
| jsPDF text API for export | Vector PDF output sharper than html2canvas rasterization | ✓ Good — v3.7 |
| A4 portrait with 25mm left margin | Print-ready with space for binding/hole-punching | ✓ Good — v3.7 |
| JSZip for multi-PDF bundling | Single download for teacher convenience | ✓ Good — v3.7 |
| CueFile v4 with enhancedResources | Full resource state persistence including edits | ✓ Good — v3.7 |
| v3→v4 migration defaults empty array | Backward compatible, no breaking changes | ✓ Good — v3.7 |
| Native RegExp for content detection | Built-in TypeScript RegExp sufficient for educational text patterns | ✓ Good — v3.8 |
| Rhetorical questions flagged low confidence | Detected but filtered by default; allows future UI to show if needed | ✓ Good — v3.8 |
| Bloom's taxonomy verb categorization | 60+ action verbs across 6 cognitive levels for activity detection | ✓ Good — v3.8 |
| XML tags with type/method attributes | Structured preservation instructions with detection metadata for AI reasoning | ✓ Good — v3.8 |
| Medium confidence default filter | Skip low-confidence detections to reduce false positives | ✓ Good — v3.8 |
| Mode-specific confidence thresholds | Fresh/Blend use medium, Refine requires high confidence | ✓ Good — v3.8 |
| Jest 30 with ES Module support | --experimental-vm-modules flag for type: "module" project | ✓ Good — v3.8 |
| SlideSource provenance tracking | Track origin (pasted, image, generated) per slide for routing decisions | ✓ Good — v4.0 |
| Pasted slides preserve original image | Teacher's visual content (diagrams, worksheets) displayed full-screen, AI drives teleprompter only | ✓ Good — v4.0 |
| HTML signature detection for paste routing | Distinguish PowerPoint paste (with HTML) from image-only paste (no HTML) | ✓ Good — v4.0 |
| Canvas compression for image paste | 1920px max width, JPEG 0.8 quality for reasonable file sizes | ✓ Good — v4.0 |
| Deck serializer 20-slide cap | Token safety with 200-char speaker notes truncation | ✓ Good — v4.0 |
| Condensation replaces cohesion | Four-action model (keep/edit/remove/merge) more powerful than tone-only cohesion | ✓ Good — v4.0 |
| Shared lesson plan state | gapLessonPlanText/Images shared between condensation and gap analysis, avoids re-upload | ✓ Good — v4.0 |
| Apply order: edits -> merges -> batch removal | Prevents index corruption during slide removal | ✓ Good — v4.0 |
| Temperature 0.5 for analytical AI calls | Consistent, deterministic analysis for condensation and gap analysis | ✓ Good — v4.0 |
| Position drift correction for gap slides | Track insertions to adjust target positions as slides are added | ✓ Good — v4.0 |
| Transform-then-export pipeline | Temporary ScriptSlide in memory, never mutate original deck | ✓ Good — v4.1 |
| Batched AI calls (5-8 slides) | Cross-slide context and token safety for transformation | ✓ Good — v4.1 |
| Separate exportScriptPptx function | Different layout concerns from standard PPTX export | ✓ Good — v4.1 |
| 4-phase ShareModal state machine | Clean transforming → preview → exporting → error flow | ✓ Good — v4.1 |
| jsPDF vector text for PDF export | Crisp readable text vs blurry rasterization | ✓ Good — v4.1 |
| Self-contained pdfService.ts | Avoid coupling to exportService.ts config | ✓ Good — v4.1 |
| Short "Share" toolbar label | Save toolbar space; modal title provides full context | ✓ Good — v4.1 |
| Text-based preview cards | Transformed data is bullets, not full Slide objects | ✓ Good — v4.1 |
| Temperature 0.7 for transformation | Creative delivery text, not analytical output | ✓ Good — v4.1 |
| Sequential chunk iteration | Cross-chunk context coherence over parallel speed | ✓ Good — v4.1 |
| Structural + content regex for phase detection | Structural patterns (headings) take priority, content patterns add coverage | ✓ Good — v5.0 |
| Case-sensitive structural, case-insensitive content | Short patterns like "I Do" need exact case; longer synonyms don't | ✓ Good — v5.0 |
| Client-side post-processing for phases | No AI prompt modification needed; regex runs in 0ms | ✓ Good — v5.0 |
| Explicit mode guard (fresh \|\| blend) | Safer than !refine against future mode additions | ✓ Good — v5.0 |
| PPTX text-only extraction | No images from ppt/media/ to avoid save file bloat | ✓ Good — v5.0 |
| Content capping at prompt time | Applied during construction, not upload — preserves original data | ✓ Good — v5.0 |
| DrawingML namespace URI (not prefix) | getElementsByTagNameNS with full URI for reliable XML parsing | ✓ Good — v5.0 |
| Auto-save excludes supplementary resources | Prevents localStorage overflow (~5MB limit) | ✓ Good — v5.0 |
| Three-pass pipeline with flat options | PipelineOptions interface separate from GenerationInput for clarity | ✓ Good — v5.0 |
| wasPartial flag for degraded results | Covers failed gaps, overflow gaps (>5), and AbortSignal cancellation | ✓ Good — v5.0 |
| Signal threads to generateLessonSlides only | Individual regeneration calls are fast (~2-3s), per-iteration check sufficient | ✓ Good — v5.0 |
| Phase percentages relative to assigned slides | Unassigned slides don't dilute distribution calculation | ✓ Good — v5.0 |
| Native select styled as phase badge | Accessible by default, no custom dropdown needed | ✓ Good — v5.0 |
| Resource injection in user prompt (not system) | AI sees resources as teacher-provided context, not system rules | ✓ Good — v5.0 |
| Shared buildResourceInjectionText | Single function ensures PROV-01/PROV-02 parity | ✓ Good — v5.0 |
| Copy-paste system prompt directives | Character-level parity between providers, no shared module abstraction | ✓ Good — v5.0 |
| Line-by-line state machine parser | 5-priority processing chain (day/section/marker/implicit/continuation) | ✓ Good — v6.0 |
| SUPPORTED_MARKERS longest-first | Prevents partial regex matches (Write on board before Say) | ✓ Good — v6.0 |
| Positional segment groups | Track Say blocks by position relative to content for correct teleprompter alignment | ✓ Good — v6.0 |
| Early-return before Pass 1 | Scripted mode bypasses all AI with zero regression risk on existing paths | ✓ Good — v6.0 |
| Shared buildEnrichmentPrompt | Single function in aiProvider.ts prevents prompt drift between providers | ✓ Good — v6.0 |
| Layout lock defense in depth | Check in both prompt hints and merge logic to prevent AI overriding mapper layouts | ✓ Good — v6.0 |
| Three-tier enrichment fallback | Full → partial merge → synthesized from titles ensures import never fails | ✓ Good — v6.0 |
| Nullable boolean for mode override | null = auto-detect, true/false = manual toggle, resets on new upload | ✓ Good — v6.0 |
| Set-based day filtering | O(1) lookup per day instead of array.includes() | ✓ Good — v6.0 |
| Tips link shown unconditionally | Teachers can read format before toggling scripted mode | ✓ Good — v6.0 |
| Shared SUPPORTED_MARKERS constant | Parser and tips page import same constant to prevent drift | ✓ Good — v6.0 |

---
*Last updated: 2026-02-22 after v6.0 milestone shipped*
