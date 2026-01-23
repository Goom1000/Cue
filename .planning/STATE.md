# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Students see only the presentation; teachers see the teleprompter script
**Current focus:** Phase 24 - Beat the Chaser

## Current Position

Phase: 24 of 26 (Beat the Chaser)
Plan: 3 of 4 complete
Status: In progress
Last activity: 2026-01-23 - Completed 24-03-PLAN.md (Timed Battle phase)

Progress: █████░░░░░░░░░░░░░░░░ 25% (v3.0 Quiz Game Variety)

## Performance Metrics

**Velocity:**
- v1.0: 6 plans, 1 day
- v1.1: 3 plans, 8 hours
- v1.2: 5 plans, 1 day
- v2.0: 11 plans, 1 day
- v2.1: 2 plans, 4 hours
- v2.2: 8 plans, 1 day
- v2.3: 4 plans, 2 days
- v2.4: 9 plans, 2 days
- v2.5: 2 plans, 1 day
- v3.0: Phase 20 complete (3 plans, 43min), Phase 21 complete (4 plans, 15min), Phase 22 complete (4 plans: 01=4min, 02=2min, 03=4min, 04=2min), Phase 23 complete (01=2min, 02=2min, 03=1min, 04=1.5min, 05=2.9min, 06=2min, 07=3.8min, 08=2min), Phase 24 in progress (01=3min, 02=1min, 03=2min)

**Project Totals:**
- Milestones shipped: 9 (v1.0, v1.1, v1.2, v2.0, v2.1, v2.2, v2.3, v2.4, v2.5)
- Total phases: 23 completed (phase 24 in progress)
- Total plans: 96 complete
- Total LOC: ~13,625 TypeScript

## Completed Milestones

- v2.5 Rebrand to Cue (2026-01-22) - 1 phase, 2 plans
- v2.4 Targeted Questioning (2026-01-22) - 4 phases, 9 plans
- v2.3 Bug Fixes (2026-01-21) - 3 phases, 4 plans
- v2.2 Flexible Upload & Class Bank (2026-01-20) - 4 phases, 8 plans
- v2.1 Landing Page & Branding (2026-01-19) - 2 phases, 2 plans
- v2.0 Shareable Presentations (2026-01-19) - 5 phases, 11 plans
- v1.2 Permission Flow Fix (2026-01-18) - 2 phases, 5 plans
- v1.1 Draggable Preview Window (2026-01-18) - 2 phases, 3 plans
- v1.0 Dual-Monitor Student View (2026-01-18) - 3 phases, 6 plans

## Accumulated Context

### Decisions

v3.0 key decisions:
- Unified game architecture to prevent state silos (discriminated unions)
- Build Millionaire first (simplest, proves framework)
- Atomic BroadcastChannel state snapshots (no incremental actions)
- Zero new runtime dependencies (React 19, Vite, Tailwind sufficient)

20-01 decisions (Game type system):
- Use discriminated unions with gameType literal for type-safe game state handling
- Keep GameSyncState for backward compatibility until Plan 02 refactoring
- PresentationMessage GAME_STATE_UPDATE now uses unified GameState type
- Discriminated unions pattern: Each game state extends BaseGameState with unique gameType literal for exhaustive type narrowing
- assertNever helper for compile-time exhaustiveness checking in switch statements

20-02 decisions (GameContainer router):
- GameContainer uses exhaustive switch without assertNever in default case (TypeScript non-strict mode limitation)
- QuickQuizGame preserves exact UI from QuizOverlay play mode (Kahoot-style)
- Placeholder games show specific phase numbers ("Coming in Phase N") for clarity
- Shared GameSplash and ResultScreen components serve all game types

20-03 decisions (Game system integration):
- Removed QuizOverlay component entirely, replaced with GameContainer architecture
- Quick Quiz launches with loading state before question generation completes
- Placeholder games show splash screen immediately (no generation needed)
- Confirmation dialog prevents accidental mid-game switches
- Game state factories (createQuickQuizState, createPlaceholderState) ensure consistent initial states

21-01 decisions (Millionaire game foundation):
- Money tree prizes and safe havens configured as data structures for 3/5/10 question variants
- MoneyTree component uses flex-col-reverse to display highest prize at top (classic Millionaire layout)
- Safe haven amounts calculated dynamically based on current position

21-02 decisions (Millionaire question display and core game flow):
- Sequential reveal animation uses nested setTimeout pattern for dramatic timing (300ms between options, 800ms before result)
- Question count selection (3/5/10) happens before question generation in modal
- GameContainer extended with Millionaire-specific props for proper handler routing
- Victory detection: currentQuestionIndex === questions.length - 1 AND correct answer
- Game over shows safe haven amount (calculated from passed safe havens)

21-03 decisions (Millionaire lifeline implementations):
- 50:50 eliminates exactly 2 of 3 wrong answers randomly (preserves correct answer)
- Audience poll percentages scale with difficulty: 60-80% correct for early questions, 25-35% for late questions
- Phone-a-Friend AI genuinely reasons about questions (not given correct answer) for realistic gameplay
- AI response varies style randomly (confident, reasoning, elimination, uncertain) with ~15% intentional errors
- Lifeline data persists in state after overlay dismissal for student view synchronization

21-04 decisions (Millionaire student view and celebrations):
- Safe haven celebrations trigger on entering next question after passing safe haven position (avoids disrupting reveal)
- Audio defaults to OFF with visible mute/unmute toggle per classroom needs
- Confetti implemented with CSS animations (zero dependencies, performant, sufficient visual impact)
- Wrong answer shows dramatic overlay with correct answer reveal before dismissing to result screen

22-01 decisions (Game question type system):
- GameDifficulty type uses simple presets (easy/medium/hard) mapping to Bloom's taxonomy levels
- SlideContext captures both cumulative lesson content and current slide for question context
- Stub implementations throw 'not yet implemented' errors for type-safe provider contracts
- Bloom's difficulty mapping: easy=Remember/Understand, medium=Apply/Analyze, hard=Evaluate/Create

22-02 decisions (Gemini game question generation):
- Millionaire uses Bloom's taxonomy for progressive difficulty across question count
- 3-question: 1 easy, 1 medium, 1 hard; 5-question: 2 easy, 2 medium, 1 hard; 10-question: 3 easy, 3 medium, 4 hard
- Chase/Beat the Chaser uses consistent difficulty from BLOOM_DIFFICULTY_MAP
- Content constraint in prompts prevents hallucination (questions only from slides)
- Returns empty array on error - caller (Plan 04) handles retries

22-03 decisions (Claude game question generation):
- Uses tool_use pattern with forced tool_choice for reliable structured JSON output
- Millionaire progression rules match GeminiProvider exactly for consistent cross-provider behavior
- Fallback text parsing if tool_use unexpectedly returns text block
- Private helper methods (getErrorMessage, getErrorCode) for error handling consistency

22-04 decisions (Game question integration):
- withRetry only retries NETWORK_ERROR, RATE_LIMIT, SERVER_ERROR (not AUTH_ERROR, PARSE_ERROR)
- buildSlideContext uses all slides up to and including current index for cumulative content
- Millionaire passes difficulty='medium' to generateGameQuestions but it's ignored (progressive handled internally)
- Empty questions array throws PARSE_ERROR to trigger user-friendly error message

23-01 decisions (The Chase type system and timer):
- ChasePhase union type covers all game phases including game-over state
- Timer hook supports both internal and external control for flexibility
- Urgency threshold defaults to 10 seconds with red pulsing animation
- Kept legacy isChasing field for backward compatibility

23-02 decisions (Game board and chaser AI):
- Use translateY CSS transform for smooth 500ms position animations (GPU-accelerated)
- AI accuracy based on weighted random Math.random() < accuracy threshold
- 1500ms default thinking delay for dramatic tension before chaser answer reveal
- Game board vertical orientation: chaser at top (position 0), home at bottom (position 6)

23-03 decisions (Cash Builder round):
- $1000 per correct answer for Cash Builder prize pot
- 300ms feedback delay before next question auto-advance
- Keyboard shortcuts (1-4) for rapid answer selection
- Timer urgency styling activates at 10 seconds (red, pulse)
- Full-screen green/red flash animations for answer feedback

23-04 decisions (Offer selection and voting):
- Teacher manually edits offer amounts and positions before starting vote
- Vote tallies calculated on-demand via getVoteCount(index) filtering votes Map
- Majority winner via tallies.indexOf(Math.max(...tallies)) - ties go to first offer
- VotingWidget hidden (returns null) when not in voting mode
- Optional name input on VotingWidget if studentName prop not provided

23-05 decisions (Head-to-Head chase phase):
- Turn phases use sequential state machine for clear gameplay flow control
- Game end detection uses nested setState callbacks to ensure position updates complete
- 600ms delay after position changes allows CSS animations to complete before checking game end
- Victory/defeat overlays use 2-second delay before calling onComplete for celebration visibility
- Turn indicator uses color-coded dots with pulse animation for active player clarity

23-06 decisions (Final Chase round):
- FinalPhase type is component-local for internal UI state management (separate from global ChasePhase)
- Pushbacks increase effective lead by 1 - chaser must beat (contestantScore + pushbacksEarned) to win
- 2-minute timers for both contestant and chaser phases with 10-second urgency threshold
- Pushback opportunity pauses chaser timer until resolved
- Contestant phase has keyboard shortcuts (1-4) for rapid answering
- Auto-triggers AI chaser answers when entering chaser-round phase

23-07 decisions (Chase orchestrator integration):
- TheChaseGame orchestrator uses local phase state management for teacher-side phase tracking
- Setup modal combines difficulty selection with AI/manual control toggle in single UI
- Generate 40 questions for complete Chase game (Cash Builder + Head-to-Head + Final Chase)
- Control mode toggle defaults to AI-Controlled for automated gameplay

23-08 decisions (Chase student view):
- Cash Builder displays timer with urgency styling at 10s threshold
- Offer Selection shows VotingWidget when voting open, offer display when waiting
- Head-to-Head shows GameBoard scaled up with current question sidebar
- Final Chase shows dual timers/scores with phase-specific highlighting
- Game Over calculates win/loss from final scores and displays prize if won

24-01 decisions (Beat the Chaser setup):
- BeatTheChaserPhase includes setup phase before Cash Builder (unlike Chase which starts at cash-builder)
- Difficulty affects both time ratio (0.8/1.0/1.2) and AI accuracy ranges for balanced gameplay
- Cash Builder awards 5 seconds per correct answer with 60-second cap
- Setup modal defaults to Medium difficulty and AI-Controlled for optimal classroom experience

24-02 decisions (Cash Builder phase):
- Green color scheme for time bank (vs amber for money in The Chase)
- No countdown timer - phase ends after 10 questions exhausted
- Progress dots show full answer history (green=correct, red=incorrect, blue=current)

24-03 decisions (Timed Battle phase):
- Turn-based mechanics: contestant answers first, then chaser on same question (sequential play)
- Only active player's timer counts down - timers pause during answer feedback
- Catch-up mechanic: +5s added to contestant timer when chaser answers incorrectly (capped at 120s)
- Instant loss: Timer reaching 0 immediately triggers game over for that player
- End condition: Timer expiry OR questions exhausted (winner = most time remaining)

All decisions logged in PROJECT.md Key Decisions table.

### Pending Todos

Check `.planning/todos/pending/` for ideas captured during development.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-23 16:45:44 UTC
Stopped at: Completed 24-03-PLAN.md (Timed Battle phase)
Resume file: None
Next: 24-04-PLAN.md (Result Screen)

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-23 - Phase 24 plan 03 complete (Timed Battle phase)*
