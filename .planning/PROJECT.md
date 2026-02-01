# Cue (Presentation Intelligence)

## What This Is

A presentation tool for teachers that transforms PDF lesson plans into interactive slideshows with AI-generated content, a teleprompter script for the teacher, and progressive bullet reveal. Teachers upload their existing lesson plans, select student age/grade level, and the AI creates an engaging presentation with speaker notes that guide the teacher through natural, conversational delivery.

**v3.9 shipped:** Delay Answer Reveal — AI-generated slides now separate problems from answers, creating deliberate "thinking pauses" for students with scaffolding strategies in the teleprompter. Deployed at https://goom1000.github.io/Cue/

## Current Milestone: v4.0 Clipboard Builder

**Goal:** Enable slide-by-slide deck construction via copy-paste from PowerPoint, with granular control over what gets included and AI cohesion at the end.

**Target features:**
- Copy slide from PowerPoint → paste into Cue → AI analyzes and improves
- Paste images directly into slides (teacher-created visuals)
- "Full image, no text" layout option in tile selector
- "Make Cohesive" button to unify deck flow after building
- Upload lesson plan after → AI checks for gaps, suggests slides to fill

## Current State

Shipped v3.9 with ~29,000 LOC TypeScript. v3.9 delivered Delay Answer Reveal: AI detects teachable moments (Q&A pairs, math problems, definitions) and splits them across progressive bullets. Teachers see scaffolding strategies (math decomposition, vocabulary context, reading evidence) in the teleprompter to guide students through productive struggle before revealing answers. 353 tests validate leakage prevention, format diversity, and provider parity.

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

### Active

- [ ] Copy slide from PowerPoint and paste into Cue
- [ ] AI analyzes pasted slide and improves it
- [ ] Paste images directly into slides
- [ ] "Full image, no text" layout option
- [ ] "Make Cohesive" button for deck-wide flow review
- [ ] Upload lesson plan after deck built → gap analysis
- [ ] AI suggests slides to fill identified gaps

### Deferred (v4.0+)

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

Shipped v3.9 with ~29,000 LOC TypeScript.
Tech stack: React 19, Vite, Gemini/Claude API, Tailwind CSS, react-rnd, jsPDF, html2canvas, mammoth.js, react-diff-viewer-continued, JSZip, Jest 30.
Client-side only (no backend).
Deployed at: https://goom1000.github.io/Cue/

v3.9 delivered Delay Answer Reveal:
- Teachable moment detection with proximity-based Q&A pairing (200 char threshold)
- 30% throttling to preserve lesson flow
- 5 content-specific scaffolding templates (math, vocabulary, comprehension, science, general)
- Word count constraints (<20 words per prompt) for verbal deliverability
- 353 tests covering leakage prevention, format diversity (8 teacher styles), and provider parity

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

---
*Last updated: 2026-02-02 after v4.0 milestone started*
