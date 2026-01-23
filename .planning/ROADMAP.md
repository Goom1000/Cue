# Roadmap: Cue v3.0 Quiz Game Variety

## Milestones

- ✅ **v2.5 Rebrand to Cue** - Phases 1-19 (shipped 2026-01-23)
- 🚧 **v3.0 Quiz Game Variety** - Phases 20-26 (in progress)

## Overview

v3.0 transforms Cue from a single-game quiz tool into a multi-game platform with TV show-style formats. The journey starts by establishing a unified game architecture that prevents state silos and code duplication, then proves the framework by refactoring the existing quiz and building the simplest new game (Millionaire). Once patterns are validated, we extend AI generation for game-specific question needs, implement timer-based games (The Chase, Beat the Chaser), add competition modes, and ensure seamless synchronization across teacher and student views.

<details>
<summary>✅ v2.5 Rebrand to Cue (Phases 1-19) - SHIPPED 2026-01-23</summary>

### Phase 19: Rebrand to Cue
**Goal**: Complete rebrand from PiPi to Cue with backward compatibility
**Plans**: 2 plans

Plans:
- [x] 19-01: UI rebrand and file format migration
- [x] 19-02: Repository rename and deployment

</details>

## 🚧 v3.0 Quiz Game Variety (In Progress)

**Milestone Goal:** Add The Chase, Beat the Chaser, and Who Wants to Be a Millionaire game formats with unified architecture, AI-generated questions, and competition modes.

### Phase 20: Game Foundation & Type System

**Goal**: Establish unified game architecture that prevents state silos and enables all game formats
**Depends on**: Phase 19
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. Teacher can select from game menu showing all 4 game options (Quick Quiz, Millionaire, The Chase, Beat the Chaser)
  2. Existing Quick Quiz works identically to before using new unified architecture
  3. Game state syncs correctly to student view without cross-contamination between game types
  4. Teacher can reveal/hide answers consistently across all game types
  5. Switching between games clears previous state completely
**Plans**: 3 plans

Plans:
- [x] 20-01-PLAN.md — Type system & game menu dropdown
- [x] 20-02-PLAN.md — Game container & Quick Quiz refactor
- [x] 20-03-PLAN.md — Integration & CSS animations

### Phase 21: Millionaire Game

**Goal**: Students play Who Wants to Be a Millionaire with configurable question count (3, 5, or 10) and functional lifelines
**Depends on**: Phase 20
**Requirements**: MILL-01, MILL-02, MILL-03, MILL-04, MILL-05, MILL-06, MILL-07, MILL-08
**Success Criteria** (what must be TRUE):
  1. Teacher launches Millionaire game with selectable question count (3, 5, or 10)
  2. Student view shows money tree with current position and prize amounts
  3. Student can see safe havens at appropriate positions (e.g., questions 3 and 5 for 5-question game)
  4. Teacher activates 50:50 lifeline and 2 wrong answers disappear
  5. Teacher activates Ask the Audience lifeline and poll percentages display
  6. Teacher activates Phone-a-Friend lifeline and AI hint appears
  7. Game ends on wrong answer, falling back to last safe haven amount
  8. Victory screen displays when all questions answered correctly
**Plans**: 4 plans

Plans:
- [x] 21-01-PLAN.md — Type extensions & money tree component
- [x] 21-02-PLAN.md — Question display & game flow
- [x] 21-03-PLAN.md — Lifeline system with AI phone-a-friend
- [x] 21-04-PLAN.md — Student view & celebration animations

### Phase 22: AI Integration

**Goal**: AI generates game-specific questions with appropriate difficulty progression
**Depends on**: Phase 21
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. Teacher generates questions from current lesson slide content
  2. Teacher selects target difficulty (Easy/Medium/Hard presets) and questions match that difficulty
  3. Millionaire game receives questions with progressive difficulty (easy to hard)
  4. Chase game receives rapid-fire questions at consistent selected difficulty
  5. All questions include 1 correct answer and 3 plausible wrong answers
**Plans**: 4 plans

Plans:
- [x] 22-01-PLAN.md — Game question types & interface extension
- [x] 22-02-PLAN.md — Gemini provider implementation
- [x] 22-03-PLAN.md — Claude provider implementation
- [x] 22-04-PLAN.md — Game launch integration with auto-retry

### Phase 23: The Chase

**Goal**: Students play The Chase with multi-phase gameplay and timer-based rounds
**Depends on**: Phase 22
**Requirements**: CHASE-01, CHASE-02, CHASE-03, CHASE-04, CHASE-05, CHASE-06, CHASE-07, CHASE-08, CHASE-09, CHASE-10
**Success Criteria** (what must be TRUE):
  1. Cash Builder round displays with 60-second countdown timer and running score
  2. Student view shows 7-step game board with contestant and chaser positions
  3. Teacher presents three offers (high/medium/low) with different starting positions
  4. Head-to-Head round timer counts down correctly
  5. Contestant moves down one step when answering correctly
  6. Chaser moves down one step when answering correctly (AI or teacher controlled)
  7. Game ends with "Caught" message if chaser reaches contestant position
  8. Game ends with "Home Safe" message if contestant reaches bottom first
  9. Teacher can choose AI-controlled chaser or manual control mode
  10. Final Chase round allows pushback mechanic with correct answers
**Plans**: TBD

Plans:
- [ ] 23-01: TBD
- [ ] 23-02: TBD

### Phase 24: Beat the Chaser

**Goal**: Students play Beat the Chaser with dual independent timers
**Depends on**: Phase 23
**Requirements**: BEAT-01, BEAT-02, BEAT-03, BEAT-04, BEAT-05, BEAT-06, BEAT-07, BEAT-08
**Success Criteria** (what must be TRUE):
  1. Teacher selects difficulty (Easy/Medium/Hard) affecting chaser timer allocation
  2. Cash Builder phase accumulates time on contestant's clock
  3. Timed battle displays two independent countdown timers simultaneously
  4. Contestant's timer runs only during their turn
  5. Chaser's timer runs only during their turn
  6. Correct answer during chaser's turn adds time to contestant's clock
  7. Contestant wins if chaser's timer expires first
  8. Chaser wins if contestant's timer expires first
**Plans**: TBD

Plans:
- [ ] 24-01: TBD
- [ ] 24-02: TBD

### Phase 25: Competition Modes

**Goal**: Teacher can choose individual or team competition for any game
**Depends on**: Phase 24
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. Teacher selects individual mode and single student represents class
  2. Teacher selects team mode and class splits into competing teams
  3. Competition mode selection appears before starting any game
  4. Score display shows individual student name in individual mode
  5. Score display shows team names and team scores in team mode
**Plans**: TBD

Plans:
- [ ] 25-01: TBD

### Phase 26: Student View Integration

**Goal**: All games display correctly on student view with proper synchronization
**Depends on**: Phase 25
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. Game boards for all formats display on student view via BroadcastChannel
  2. Answer options remain hidden until teacher clicks reveal button
  3. Timer displays are visible and synchronized on student view
  4. Current game state is always clear (whose turn, scores, positions displayed)
**Plans**: TBD

Plans:
- [ ] 26-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 20 → 21 → 22 → 23 → 24 → 25 → 26

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 20. Game Foundation & Type System | 3/3 | ✓ Complete | 2026-01-23 |
| 21. Millionaire Game | 4/4 | ✓ Complete | 2026-01-23 |
| 22. AI Integration | 4/4 | ✓ Complete | 2026-01-23 |
| 23. The Chase | 0/TBD | Not started | - |
| 24. Beat the Chaser | 0/TBD | Not started | - |
| 25. Competition Modes | 0/TBD | Not started | - |
| 26. Student View Integration | 0/TBD | Not started | - |
