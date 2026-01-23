# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Students see only the presentation; teachers see the teleprompter script
**Current focus:** Phase 23 - The Chase

## Current Position

Phase: 23 of 26 (The Chase) - IN PROGRESS
Plan: 4 of 7 complete
Status: In progress
Last activity: 2026-01-23 - Completed 23-04-PLAN.md (Offer selection and voting)

Progress: █████░░░░░░░░░░░░░░░░ 23% (v3.0 Quiz Game Variety)

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
- v3.0: Phase 20 complete (3 plans, 43min), Phase 21 complete (4 plans, 15min), Phase 22 complete (4 plans: 01=4min, 02=2min, 03=4min, 04=2min), Phase 23 in progress (01=2min, 02=2min, 03=1min)

**Project Totals:**
- Milestones shipped: 9 (v1.0, v1.1, v1.2, v2.0, v2.1, v2.2, v2.3, v2.4, v2.5)
- Total phases: 22 completed (phase 23 in progress, phases 24-26 planned)
- Total plans: 88 complete
- Total LOC: ~11,860 TypeScript

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

All decisions logged in PROJECT.md Key Decisions table.

### Pending Todos

Check `.planning/todos/pending/` for ideas captured during development.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-23 10:54:07 UTC
Stopped at: Completed 23-03-PLAN.md (Cash Builder round)
Resume file: None
Next: 23-04 - Offer selection phase

---
*State initialized: 2026-01-18*
*Last updated: 2026-01-23 - Phase 23 in progress (The Chase)*
