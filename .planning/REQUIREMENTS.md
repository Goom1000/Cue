# Requirements: Cue v3.0 Quiz Game Variety

**Defined:** 2026-01-22
**Core Value:** Students see engaging TV show-style quiz games on the projector; teachers control gameplay from their view

## v3.0 Requirements

Requirements for the Quiz Game Variety milestone. Each maps to roadmap phases.

### Game Foundation

- [x] **FOUND-01**: Game selection menu replaces current quiz button with all game options
- [x] **FOUND-02**: Unified game state architecture with discriminated unions per game type
- [x] **FOUND-03**: BroadcastChannel sync works for all game types (atomic state snapshots)
- [x] **FOUND-04**: Teacher controls answer reveals for all games
- [x] **FOUND-05**: Existing Kahoot-style quiz remains functional as "Quick Quiz" option

### Who Wants to Be a Millionaire

- [ ] **MILL-01**: 15-question vertical progression with increasing difficulty
- [ ] **MILL-02**: Money tree display showing current position and prize amounts
- [ ] **MILL-03**: Safe havens at questions 5 and 10 (guaranteed minimum if wrong after)
- [ ] **MILL-04**: 50:50 lifeline removes 2 wrong answers from display
- [ ] **MILL-05**: Ask the Audience lifeline shows simulated poll percentages
- [ ] **MILL-06**: Phone-a-Friend lifeline shows AI-generated hint text
- [ ] **MILL-07**: Game ends on wrong answer (falls to last safe haven)
- [ ] **MILL-08**: Victory screen when all 15 questions answered correctly

### The Chase

- [ ] **CHASE-01**: Cash Builder round with quick-fire questions and running score
- [ ] **CHASE-02**: 7-step game board showing contestant and chaser positions
- [ ] **CHASE-03**: Three-offer system (higher/lower risk position choices)
- [ ] **CHASE-04**: Head-to-Head round with countdown timer
- [ ] **CHASE-05**: Contestant moves down one step on correct answer
- [ ] **CHASE-06**: Chaser moves down one step on correct answer
- [ ] **CHASE-07**: Contestant caught if chaser reaches same position
- [ ] **CHASE-08**: Contestant wins if they reach home before being caught
- [ ] **CHASE-09**: Chaser can be AI-controlled (answers based on difficulty) or teacher-controlled
- [ ] **CHASE-10**: Final Chase round with pushback mechanic (correct answers push chaser back)

### Beat the Chaser

- [ ] **BEAT-01**: Difficulty selection screen (Easy/Medium/Hard affects chaser timer allocation)
- [ ] **BEAT-02**: Cash Builder phase to accumulate time on contestant's clock
- [ ] **BEAT-03**: Timed battle with dual independent countdown timers displayed
- [ ] **BEAT-04**: Contestant's timer runs during their turn answering
- [ ] **BEAT-05**: Chaser's timer runs during their turn answering
- [ ] **BEAT-06**: Catch-up mechanic: correct answer during chaser's turn adds time to contestant
- [ ] **BEAT-07**: Contestant wins if chaser's timer expires first
- [ ] **BEAT-08**: Chaser wins if contestant's timer expires first

### Competition Modes

- [ ] **COMP-01**: Individual student mode (single player represents class)
- [ ] **COMP-02**: Team competition mode (class split into teams, scores tracked)
- [ ] **COMP-03**: Teacher selects competition mode before starting game
- [ ] **COMP-04**: Score display appropriate to mode (individual name or team names)

### AI Integration

- [ ] **AI-01**: Questions generated from current lesson/slide content
- [ ] **AI-02**: A-E grade difficulty system integrated (teacher can target difficulty)
- [ ] **AI-03**: Game-specific question prompts (Millionaire needs 15 increasing difficulty, Chase needs quick-fire)
- [ ] **AI-04**: Questions include correct answer and 3 plausible distractors

### Student View

- [ ] **VIEW-01**: Game board displays on student view (projector) via BroadcastChannel
- [ ] **VIEW-02**: Answer options hidden until teacher reveals
- [ ] **VIEW-03**: Timer displays visible on student view
- [ ] **VIEW-04**: Current game state clear (whose turn, scores, positions)

## Future Requirements (v3.1+)

Deferred to future milestone. Tracked but not in current roadmap.

### Enhanced Features

- **ENH-01**: Sound effects and music for dramatic moments
- **ENH-02**: Multiple Chasers in Beat the Chaser (2-5 options like TV show)
- **ENH-03**: Team Relay mode in The Chase (multiple contestants)
- **ENH-04**: Custom question bank entry (teacher pre-defines questions)
- **ENH-05**: Game session history/replay

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time student device participation | High complexity, not needed for projector setup |
| Actual monetary prizes display | Inappropriate for classroom; use points/stars |
| TV show intro animations/videos | Storage concerns, copyright issues |
| Sound effects | Teacher provides drama verbally per user request |
| Leaderboard persistence across sessions | File-based sharing sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 20 | Complete |
| FOUND-02 | Phase 20 | Complete |
| FOUND-03 | Phase 20 | Complete |
| FOUND-04 | Phase 20 | Complete |
| FOUND-05 | Phase 20 | Complete |
| MILL-01 | Phase 21 | Pending |
| MILL-02 | Phase 21 | Pending |
| MILL-03 | Phase 21 | Pending |
| MILL-04 | Phase 21 | Pending |
| MILL-05 | Phase 21 | Pending |
| MILL-06 | Phase 21 | Pending |
| MILL-07 | Phase 21 | Pending |
| MILL-08 | Phase 21 | Pending |
| AI-01 | Phase 22 | Pending |
| AI-02 | Phase 22 | Pending |
| AI-03 | Phase 22 | Pending |
| AI-04 | Phase 22 | Pending |
| CHASE-01 | Phase 23 | Pending |
| CHASE-02 | Phase 23 | Pending |
| CHASE-03 | Phase 23 | Pending |
| CHASE-04 | Phase 23 | Pending |
| CHASE-05 | Phase 23 | Pending |
| CHASE-06 | Phase 23 | Pending |
| CHASE-07 | Phase 23 | Pending |
| CHASE-08 | Phase 23 | Pending |
| CHASE-09 | Phase 23 | Pending |
| CHASE-10 | Phase 23 | Pending |
| BEAT-01 | Phase 24 | Pending |
| BEAT-02 | Phase 24 | Pending |
| BEAT-03 | Phase 24 | Pending |
| BEAT-04 | Phase 24 | Pending |
| BEAT-05 | Phase 24 | Pending |
| BEAT-06 | Phase 24 | Pending |
| BEAT-07 | Phase 24 | Pending |
| BEAT-08 | Phase 24 | Pending |
| COMP-01 | Phase 25 | Pending |
| COMP-02 | Phase 25 | Pending |
| COMP-03 | Phase 25 | Pending |
| COMP-04 | Phase 25 | Pending |
| VIEW-01 | Phase 26 | Pending |
| VIEW-02 | Phase 26 | Pending |
| VIEW-03 | Phase 26 | Pending |
| VIEW-04 | Phase 26 | Pending |

**Coverage:**
- v3.0 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-23 after roadmap creation*
