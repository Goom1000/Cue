# Project Research Summary

**Project:** Cue v2.6 Quiz Game Variety
**Domain:** TV show-style quiz games for classroom presentation tool
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

Adding The Chase, Beat the Chaser, and Who Wants to Be a Millionaire to Cue presents a significant integration challenge that goes beyond building games from scratch. The research reveals three key insights:

**First, the existing stack is sufficient.** Zero new runtime dependencies are required. React 19's state management, the existing BroadcastChannel sync infrastructure, Tailwind CSS via CDN, and CSS animations handle all three game formats. The temptation to add Framer Motion, Zustand, or specialized timer libraries should be resisted—they add bundle size without educational value.

**Second, integration complexity exceeds game complexity.** The critical pitfalls center on state management across multiple games, BroadcastChannel message ordering (which isn't guaranteed across browser processes), code duplication patterns, and grade-level integration with the existing A-E difficulty system. Teams typically underestimate these integration challenges and overestimate game similarity, leading to technical debt that's expensive to refactor.

**Third, TV show authenticity must be balanced with classroom practicality.** Each game has "table stakes" features (7-step Chase board, money ladder, lifelines) that define its identity, but feature parity obsession leads to scope creep. The MVP strategy focuses on core gameplay mechanics while deferring decorative features like multiple chaser personalities, phone-a-friend lifelines, and team relay modes until teacher feedback validates their value.

## Key Findings

### Recommended Stack

**Core finding: Zero new dependencies needed.** The existing stack (React 19, Vite, Tailwind CDN, BroadcastChannel) is sufficient for all three game formats.

**Core technologies:**
- **React 19 useState/useReducer**: Game flow state machines and position tracking—no Zustand or Redux needed for localized game state
- **BroadcastChannel API**: Existing sync infrastructure extends to game states with no modifications required
- **Tailwind CSS (CDN)**: Grid utilities handle Chase board (7-step ladder) and Millionaire question tree layouts
- **CSS custom animations**: Player movement, lifeline activations, and answer reveals use existing keyframes in index.html
- **Existing AIProviderInterface**: Question generation already integrated; needs extension for difficulty-aware generation only

**What NOT to add:**
- ❌ Framer Motion (~30kb): Simple state transitions don't need complex animation library
- ❌ Zustand/XState: Game state is localized, not global; linear flows don't require state machines
- ❌ react-countdown-circle-timer: useEffect + setInterval = 15 lines for basic countdown
- ❌ use-sound: Optional for post-MVP sound effects only; native Audio API sufficient for MVP

**Optional post-MVP:**
- use-sound (^5.0.0): Sound effect hooks if advanced audio features needed—start with native Audio API first

### Expected Features

**Must have (table stakes):**

**The Chase:**
- Cash Builder Round (60-second rapid-fire with timer and score tracking)
- 7-Step Chase Board (visual centerpiece showing contestant vs Chaser positions)
- Three Offer System (high/medium/low risk with position tradeoffs)
- Question-by-Question Movement (correct = move forward, wrong = opponent moves)
- Final Chase Format (team answers for 2 minutes, then Chaser chases)

**Who Wants to Be a Millionaire:**
- 15-Question Money Tree (iconic vertical progression from Q1 to Q15)
- Safe Havens (Q5, Q10, Q15 guaranteed fall-back amounts)
- 50:50 Lifeline (removes 2 wrong answers)
- Ask the Audience Lifeline (simulated or real class voting)
- Phone a Friend Lifeline (simulated expert opinion with 30s timer)
- Final Answer Lock (two-step confirmation prevents accidental submissions)

**Beat the Chaser:**
- Cash Builder (5 questions maximum, first miss ends round)
- Offer Selection Screen (2-5 Chasers with increasing stakes/decreasing time)
- Dual Timer Display (contestant 60s vs Chasers' reduced time)
- Clock Toggle (correct answer stops your clock, starts opponent's)

**Should have (competitive/classroom-specific):**
- **Difficulty-Based Offers**: High offer = harder questions from A-E system
- **Class Strategy Voting**: Whole-class engagement during offer selection
- **Educational Explain Mode**: Review missed questions with AI-generated explanations
- **Class-Wide Lifelines**: Actual student voting for Ask the Audience (not just simulation)
- **Progressive Difficulty**: Millionaire questions map to A-E system (Q1-5=E, Q6-10=D, Q11-15=A)
- **Multiple Friend Pool**: Phone a Friend selects from pre-designated expert students

**Defer (v2.7+):**
- AI Chaser Personality selection (strict/encouraging/humorous)
- Multiple Teams Mode (split class into 2-3 competing teams)
- Team Relay Mode (multiple students each answer 3 questions, hand off)
- Super Offer Mode (Face all 6 Chasers challenge for perfect Cash Builder)
- Dynamic Question Difficulty (Chaser questions slightly harder for balance)

**Anti-features (explicitly avoid):**
- Individual student buzzers (device-per-student adds complexity, not needed)
- Real money display (inappropriate for classroom context)
- Chaser video/avatar (high production cost, minimal educational value)
- Complex calculations (focus on knowledge recall, not computational skills)
- Time pressure in Millionaire (iconic format has no time limit)

### Architecture Approach

**Unified game framework over isolated implementations.** The recommended architecture introduces a shared game framework with game-specific UI components rather than duplicating infrastructure for each format. This maximizes code reuse while allowing each game show format to maintain its unique mechanics and visual identity.

**Major components:**

1. **GameSelectionModal** — Presents 4 game cards (The Chase, Beat the Chaser, Millionaire, Quick Quiz), launches selected game component

2. **Shared Game Framework (BaseGame pattern)** — All games follow common lifecycle (setup → loading → play → summary) with shared abstractions:
   - GameEngine interface for common behaviors (displayQuestion, revealAnswer, updateScore, syncToStudentView)
   - GameRules interface for game-specific logic (calculateScore, getNextQuestion, checkWinCondition)
   - Shared components: QuestionDisplay, AnswerGrid, ScoreTracker, GameTimer

3. **Game-Specific Components** — Each game implements BaseGameProps + unique state:
   - TheChaseGame.tsx: Cash Builder → Head-to-Head phases, position tracking, 3-offer system
   - BeatTheChaserGame.tsx: Dual timer system, Chaser selection, clock toggle
   - MillionaireGame.tsx: Money ladder progression, lifeline state machine, confirmation flow
   - QuickQuizGame.tsx (refactored from QuizOverlay): Existing Kahoot-style game for backward compatibility

4. **Extended Type System** — Discriminated union for type-safe game routing:
   - `type GameType = 'quick-quiz' | 'chase' | 'beat-chaser' | 'millionaire'`
   - BaseGameSyncState extended by ChaseGameState, ChaserGameState, MillionaireGameState
   - PresentationMessage updated for GAME_STATE_UPDATE with all game types

5. **Student View Routing** — StudentGameView refactored to route based on gameType discriminant:
   - StudentChaseView, StudentChaserView, StudentMillionaireView, StudentQuickQuizView
   - Switch statement with TypeScript exhaustiveness checking

6. **AI Question Generation Extension** — Shared generation with difficulty targeting:
   - generateQuizWithDifficulty() accepts DifficultyLevel[] for progressive difficulty
   - MILLIONAIRE_DIFFICULTY preset: ['E', 'E', 'D', 'D', 'C', 'C', 'B', 'B', 'A', 'A']
   - CHASE_DIFFICULTY preset: 'C' (medium) for all questions

### Critical Pitfalls

**Top 5 from research (prioritized by impact):**

1. **Isolated Game State Silos** — Building each game independently without unified state architecture leads to corruption when switching between games, BroadcastChannel message cross-contamination, and debug nightmares. **Prevention:** Design unified game state architecture BEFORE implementing first game, with sessionId to prevent stale messages and explicit cleanup on game transitions.

2. **BroadcastChannel Message Ordering Assumptions** — Chrome's multi-process architecture does NOT guarantee message ordering across processes. Teacher sends QUESTION_START → ANSWER_REVEAL → CHASER_CATCHES, but student may receive them out of order. **Prevention:** Use atomic state snapshots (send complete state, not incremental actions) or implement sequence numbers with buffering. Atomic state recommended for simplicity.

3. **Game Format Code Duplication Trap** — All three games have similar patterns (question display, timer countdown, score tracking). Copying code creates 3x maintenance burden with inconsistent bug fixes. **Prevention:** Design shared abstractions (GameEngine, QuestionDisplay component, BroadcastChannel sync protocol) before implementing games. Extract shared components to /components/game-ui/ folder.

4. **AI Question Generation Quality Blindness** — Generic prompts produce ambiguous questions that ruin game experience. Millionaire needs 15 questions with progressive difficulty, plausible wrong answers, and unambiguous phrasing. **Prevention:** Game-aware prompts with explicit difficulty instructions, quality validation before game starts, teacher question review UI, graceful degradation with skip button during live game.

5. **Lifeline Implementation Complexity Underestimation** — Millionaire lifelines seem simple but have deceptive complexity: 50:50 must remove answers deterministically (not randomly) to avoid desync, Ask the Audience needs realistic distribution generation, Phone-a-Friend requires AI response generation. **Prevention:** Implement lifeline state machine upfront, simplify for MVP (50:50 + simulated Ask the Audience only), defer Phone-a-Friend to post-MVP.

**Additional critical pitfalls:**

6. **Accessibility as Afterthought** — Games rely on visual cues (timers, colors) without screen reader support or keyboard navigation. WCAG 2.1 AA compliance deadline April 24, 2026. **Prevention:** Keyboard shortcuts from day one, screen reader live regions, color + icon + text indicators, prefers-reduced-motion support.

7. **Student View Testing Neglect** — Development happens on teacher view only; student view bugs discovered during live classroom demo. **Prevention:** Always-on student view preview panel in teacher UI, two-window development setup, automated Cypress tests for both views.

8. **Timer Synchronization Drift** — Independent JavaScript timers on teacher/student views drift over time (Q1: 0.1s, Q15: 3.2s difference). **Prevention:** Teacher-authoritative timing with absolute timestamps in BroadcastChannel messages, periodic sync points at question boundaries, visual tolerance (round to whole seconds).

9. **Grade Level Integration Fragmentation** — Unclear how A-E grade system maps to game difficulty leads to inconsistent question generation. **Prevention:** Unified difficulty mapping defined at project start (DIFFICULTY_MAPPING constant), shared AI generation function used by all games, teacher control over grade level in game setup.

10. **Feature Parity Obsession** — Attempting to replicate every TV show feature (multiple chasers, commercial breaks, celebrity voices) leads to scope creep and delayed MVP. **Prevention:** Define MVP per game with core loop + format identity only, defer decorative features, use "essentiality test" before adding features (Can game be played without it? Will students notice? Does it affect learning?).

## Implications for Roadmap

Based on research, suggested phase structure prioritizes foundation before implementation, proves patterns with simplest game, then extends to complex games:

### Phase 1: Foundation & Type System
**Rationale:** Establish shared architecture before building any game to prevent isolated state silos and code duplication
**Delivers:**
- Unified game state architecture with sessionId and discriminated unions
- Extended type system (GameType, BaseGameSyncState, ChaseGameState, MillionaireGameState, ChaserGameState)
- Atomic state snapshot sync protocol for BroadcastChannel
- BaseGameProps pattern and shared component hierarchy
**Addresses:**
- Must-have: Foundation for all game formats
**Avoids:**
- Pitfall #1 (Isolated game state silos)
- Pitfall #2 (BroadcastChannel message ordering)
- Pitfall #3 (Code duplication trap)

### Phase 2: Game Selection & Quick Quiz Refactor
**Rationale:** Prove framework works by refactoring existing game before building new ones
**Delivers:**
- GameSelectionModal component (4 game cards UI)
- QuizOverlay renamed to QuickQuizGame with gameType integration
- StudentGameView refactored to routing component
- StudentQuickQuizView extracted from current logic
**Uses:**
- Existing QuizOverlay patterns
- Existing BroadcastChannel sync
**Addresses:**
- Must-have: Game selection menu
**Avoids:**
- Framework validation before complex games

### Phase 3: Millionaire Game (MVP)
**Rationale:** Simplest new game format—no timers, linear progression, proves lifeline mechanics
**Delivers:**
- MillionaireGame component (setup → loading → play → summary)
- Money ladder UI (15 questions vertical display)
- 50:50 lifeline with deterministic answer removal
- Ask the Audience lifeline with simulated distribution
- Safe havens at Q5, Q10, Q15
- Final Answer confirmation flow
- StudentMillionaireView component
**Uses:**
- DifficultyLevel type system
- MILLIONAIRE_DIFFICULTY progression
- Existing A-E grade difficulty mapping
**Implements:**
- Lifeline state machine pattern
- Progressive difficulty AI generation
**Addresses:**
- Must-have: Millionaire with functional lifelines
**Avoids:**
- Pitfall #5 (Lifeline complexity underestimation)—defer Phone-a-Friend

### Phase 4: AI Generation Extension
**Rationale:** Extend AI providers with game-aware generation before implementing timer-based games
**Delivers:**
- generateQuizWithDifficulty() method on AIProviderInterface
- Game-aware prompt templates (Millionaire progressive, Chase rapid-fire)
- Question quality validation before game starts
- Teacher question review UI with regenerate button
- Difficulty progression presets (MILLIONAIRE_DIFFICULTY, CHASE_DIFFICULTY)
**Uses:**
- Existing Gemini/Claude provider abstraction
- Bloom's taxonomy mapping from v2.4
**Addresses:**
- Must-have: AI question generation integrated with A-E system
**Avoids:**
- Pitfall #4 (AI question quality blindness)
- Pitfall #9 (Grade level integration fragmentation)

### Phase 5: The Chase Game
**Rationale:** Most complex game with multi-phase flow, timer logic, and position tracking
**Delivers:**
- TheChaseGame component (Cash Builder → Head-to-Head phases)
- Cash Builder round with 60-second timer and score tracking
- 7-step Chase board visualization
- Three offer system (high/medium/low with position shifts)
- Player vs Chaser position tracking
- Basic Final Chase (team + head start vs Chaser)
- StudentChaseView component
- Teacher-authoritative timer sync with absolute timestamps
**Uses:**
- Shared GameTimer component
- Shared QuestionDisplay component
- Existing BroadcastChannel atomic state sync
**Implements:**
- Timer synchronization pattern (prevention for Pitfall #8)
- Multi-phase game state machine
**Addresses:**
- Must-have: The Chase game format
**Avoids:**
- Pitfall #8 (Timer synchronization drift)
- Defer: AI Chaser personality, Multiple Teams Mode

### Phase 6: Beat the Chaser Game
**Rationale:** After proving timer logic with Chase, extend to dual-timer system
**Delivers:**
- BeatTheChaserGame component (Cash Builder → Difficulty Select → Timed Battle)
- Dual timer display (contestant 60s vs Chasers' reduced time)
- Offer selection screen (Easy/Medium/Hard difficulty)
- Clock toggle logic (correct answer switches active clock)
- StudentChaserView component
**Uses:**
- Timer patterns from Chase game
- Shared GameTimer component
- Difficulty mapping from Phase 4
**Addresses:**
- Must-have: Beat the Chaser game format
**Avoids:**
- Defer: Multiple chaser selection (2-5 Chasers), Super Offer Mode

### Phase 7: Polish & Teacher Controls
**Rationale:** Enhance UX after core mechanics proven
**Delivers:**
- Educational Explain Mode (show correct answer + reasoning after wrong)
- Teacher question skip button for bad questions
- Pause/resume functionality for all games
- Mid-game difficulty adjustment
- Class-wide lifelines (real student voting for Ask the Audience)
- Classroom display optimizations (large text, high contrast)
**Uses:**
- AI generation for explanations
- Existing class bank integration
**Addresses:**
- Should-have: Educational features, classroom-specific adaptations
**Avoids:**
- Pitfall #10 (Feature parity obsession)—focus on classroom needs, not TV authenticity

### Phase 8: Accessibility & Cross-Device Testing
**Rationale:** Ensure compliance and inclusive design before shipping
**Delivers:**
- Keyboard navigation for all games (Space/Enter/1-4/L/Escape)
- Screen reader live regions for game state announcements
- Visual alternatives to color-only information (icons + text)
- Reduced motion support (prefers-reduced-motion)
- Student view testing on iPad/projectors/ultra-wide monitors
- WCAG 2.1 AA compliance verification
**Uses:**
- Accessibility patterns from existing slide components
**Addresses:**
- Compliance: WCAG 2.1 AA deadline April 24, 2026
**Avoids:**
- Pitfall #6 (Accessibility as afterthought)
- Pitfall #7 (Student view testing neglect)

### Phase Ordering Rationale

- **Foundation first** (Phase 1) prevents architectural rework later—unified state model and type system established before any game implementation
- **Prove patterns** (Phase 2-3) by refactoring existing game and building simplest new format validates framework before complex games
- **AI integration** (Phase 4) before timer-based games ensures question quality doesn't block gameplay testing
- **Progressive complexity** (Phases 5-6): Single timer → Dual timer, Simple phase → Multi-phase
- **Polish after mechanics** (Phase 7) avoids feature creep during core development
- **Accessibility throughout** (Phase 8 dedicated, but built into earlier phases) ensures compliance without retrofitting

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 5 (The Chase):** Timer synchronization patterns across browser processes—existing research covers strategy, but implementation may reveal edge cases with BroadcastChannel + requestAnimationFrame timing
- **Phase 7 (Explain Mode):** AI-generated explanations quality control—may need iteration on prompt engineering and validation logic

**Phases with standard patterns (skip research-phase):**

- **Phase 2 (Game Selection):** Modal UI pattern well-documented, existing SettingsModal provides template
- **Phase 3 (Millionaire):** Linear progression is simplest game state machine, no novel patterns
- **Phase 4 (AI Generation):** Extension of existing provider interface, Bloom's taxonomy mapping already validated in v2.4
- **Phase 6 (Beat the Chaser):** Reuses timer patterns from Phase 5
- **Phase 8 (Accessibility):** WCAG guidelines well-documented, implementation patterns established

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified existing capabilities sufficient; no new runtime dependencies needed based on component analysis and technical requirements |
| Features | HIGH | Game show mechanics verified from official rules; classroom adaptations surveyed from educational implementations; table stakes vs differentiators clearly defined |
| Architecture | HIGH | Integration patterns match existing system (BroadcastChannel, state machines, AI generation); shared framework approach validated by code reuse research |
| Pitfalls | HIGH | State management, sync fragility, code duplication, and AI quality issues documented from classroom quiz app research and game implementation case studies |

**Overall confidence:** HIGH

### Gaps to Address

- **Timer precision at scale:** Research covers timer sync strategy (teacher-authoritative with absolute timestamps), but needs validation over 15+ question sequences with external projector (different process). Test during Phase 5 implementation with actual hardware setup.

- **Lifeline UX timing:** Ask the Audience animation duration and Phone-a-Friend countdown need classroom testing to validate dramatic pacing doesn't slow game flow. Teacher feedback in Phase 7 will inform timing adjustments.

- **Grade-level calibration accuracy:** Mapping A-E grades to question difficulty relies on Bloom's taxonomy alignment from v2.4, but game formats may reveal different calibration needs (Chase rapid-fire vs Millionaire deliberate thinking). Monitor during Phase 4 AI extension and adjust prompts based on teacher feedback.

- **Student view performance on low-powered devices:** BroadcastChannel sync with animations may cause jank on older iPads or Chromebooks. Test during Phase 8 cross-device validation; optimize with reduced-motion and frame throttling if needed.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [React 19 features and updates](https://react.dev/blog/2024/12/05/react-19) — State management capabilities
- [MDN: Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API) — BroadcastChannel sync patterns
- [Tailwind CSS animations documentation](https://tailwindcss.com/docs/animation) — CSS animation capabilities
- [Tailwind grid documentation](https://tailwindcss.com/docs/grid-template-columns) — Game board layouts

**Game Show Formats:**
- [The Chase (British game show) - Wikipedia](https://en.wikipedia.org/wiki/The_Chase_(British_game_show)) — Official rules and mechanics
- [Beat the Chasers - Wikipedia](https://en.wikipedia.org/wiki/Beat_the_Chasers) — Format variations
- [Who Wants to Be a Millionaire Rules](https://wwbm.com/rules) — Official US version rules
- [Lifelines | Who Wants To Be A Millionaire Wiki](https://millionaire.fandom.com/wiki/Lifeline) — Lifeline mechanics documented

**State Management Patterns:**
- [State management in React without libraries](https://coderpad.io/blog/development/global-state-management-react/) — React 19 patterns
- [useState vs useReducer comparison](https://tkdodo.eu/blog/use-state-vs-use-reducer) — Game state machines

### Secondary (MEDIUM confidence)

**Integration Pitfalls:**
- [BroadcastChannel spec asynchronous nature (GitHub WHATWG Issue #7267)](https://github.com/whatwg/html/issues/7267) — Message ordering not guaranteed
- [React Multi-Tab Desync with BroadcastChannel API](https://dev.to/idanshalem/the-forgotten-problem-why-your-app-breaks-when-you-open-a-second-tab-911) — Sync patterns
- [What Is Code Duplication? Best Tools to Detect & Fix It in 2026](https://www.codeant.ai/blogs/stop-code-duplication-developers-guide) — Anti-patterns
- [How Feature Creep Is Ruining Software, Gadgets, and Video Games](https://www.howtogeek.com/how-feature-creep-is-ruining-software-gadgets-and-video-games/) — Scope management

**Educational Adaptations:**
- [The Chase - H5P Educational Platform](https://library.daytonastate.edu/blogs/academic-innovation/the-chase-h5p) — Classroom implementations
- [Who Wants to Be a Millionaire PowerPoint Templates](https://pptvba.com/powerpoint-who-wants-to-be-a-millionaire/) — Teacher resources
- [Game Show Classroom Comparison](https://ditchthattextbook.com/game-show-classroom-comparing-the-big-5/) — Feature analysis

**AI Question Generation:**
- [Best AI Quiz Makers for Teachers to Use in 2026](https://www.edcafe.ai/blog/free-ai-quiz-makers) — Quality validation patterns
- [The 12 Best AI Quiz Generators & Test Makers in 2026](https://www.ispringsolutions.com/blog/ai-quiz-generators) — Prompt engineering

**Accessibility:**
- [Building Accessible Educational Games: Lessons from the Front Lines](https://www.filamentgames.com/blog/building-accessible-educational-games-lessons-from-the-front-lines/) — WCAG compliance
- [New Federal Digital Accessibility Requirements (April 24, 2026 deadline)](https://onlinelearningconsortium.org/olc-insights/2025/09/federal-digital-a11y-requirements/) — Compliance requirements

### Tertiary (LOW confidence - implementation references)

- [Who Wants to Be a Millionaire Web App GitHub](https://github.com/michael-rutledge/millionaire) — Implementation patterns
- [Technology requirements for your own gameshow](https://www.quizshow.io/technology) — Timer synchronization
- [How do Multiplayer Games sync their state? Part 2](https://medium.com/@qingweilim/how-do-multiplayer-game-sync-their-state-part-2-d746fa303950) — State sync patterns

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
