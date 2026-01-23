---
phase: 23
plan: 07
subsystem: game-orchestration
tags: [chase, game-flow, orchestration, difficulty-selection, ai-control]
requires: [23-03, 23-04, 23-05, 23-06]
provides:
  - TheChaseGame orchestrator with complete phase management
  - Chase game integration in GameContainer and PresentationView
  - Setup modal with difficulty and AI/manual control mode selection
affects: [23-08]
tech-stack:
  added: []
  patterns:
    - Phase-based game orchestration with callbacks
    - Discriminated union state management
    - Setup modal with dual configuration (difficulty + control mode)
key-files:
  created: []
  modified:
    - components/games/TheChaseGame.tsx
    - components/games/GameContainer.tsx
    - components/PresentationView.tsx
decisions:
  - id: CHASE-07-01
    decision: TheChaseGame orchestrator uses local phase state management
    rationale: Teacher-side phase tracking prevents race conditions during phase transitions while still broadcasting updates to student view
    date: 2026-01-23
  - id: CHASE-07-02
    decision: Setup modal combines difficulty selection with AI/manual control toggle
    rationale: Single modal reduces UI complexity, all game configuration happens in one place before launch
    date: 2026-01-23
  - id: CHASE-07-03
    decision: Generate 40 questions for complete Chase game
    rationale: Sufficient questions for all phases - Cash Builder (60s), Head-to-Head (~10-15 questions), Final Chase (2x 2-minute rounds)
    date: 2026-01-23
  - id: CHASE-07-04
    decision: Control mode toggle defaults to AI-Controlled
    rationale: Most users want automated gameplay, manual control is advanced feature for flexible teaching
    date: 2026-01-23
metrics:
  duration: 226s
  completed: 2026-01-23
---

# Phase 23 Plan 07: Game Orchestrator Integration Summary

**One-liner:** Complete Chase game orchestration with phase transitions, difficulty selection (Easy=60%/Medium=75%/Hard=90%), and AI/manual chaser control mode toggle

## What Was Built

### TheChaseGame Orchestrator Component
Replaced placeholder with full orchestrator managing all game phases:

**Phase Management:**
- Cash Builder → Offer Selection → Head-to-Head → Final Chase → Game Over
- Local phase state (`localPhase`) tracks current phase for rendering
- State merge pattern combines global and local state updates

**Transition Handlers:**
- `handleCashBuilderComplete`: Captures score, transitions to offer selection
- `handleOfferSelected`: Sets contestant start position, transitions to head-to-head
- `handleHeadToHeadComplete`: Routes to final chase (home-safe) or game over (caught)
- `handleFinalChaseComplete`: Transitions to game over with final scores

**State Broadcasting:**
- `onStateUpdate` callback propagates state changes to student view
- Partial state updates merged with existing state for efficiency

### GameContainer Integration
Extended routing to support Chase game with state update handler:

**Chase-Specific Props:**
- `onChaseStateUpdate?: (updates: Partial<TheChaseState>) => void`
- Passes handler to TheChaseGame for bidirectional state sync

### PresentationView Chase Launch
Complete Chase game setup and launch flow:

**Setup Modal:**
- Control mode toggle: AI-Controlled (default) / Manual Control
- Difficulty selection: Easy (60%), Medium (75%), Hard (90%)
- Each difficulty button shows accuracy percentage and description
- Modal closes automatically on difficulty selection

**State Factory:**
- `createChaseState(questions, difficulty, isAIControlled)` initializes all Chase state fields
- Generates 40 questions via AI provider for complete game flow
- Loading state shows during question generation

**State Update Handler:**
- `handleChaseStateUpdate` merges partial updates into active game state
- Preserves type safety with Chase state narrowing

## Verification Results

**Build verification:**
```bash
npm run build
✓ 122 modules transformed
✓ built in 938ms
```

**Type Safety:**
- All phase transitions type-checked via ChasePhase union
- State updates validated through Partial<TheChaseState>
- Discriminated union routing in orchestrator switch statement

## Task Breakdown

### Task 1: Create TheChaseGame Orchestrator Component
**Commit:** `52bd421` - feat(23-07): create TheChaseGame orchestrator component

**Changes:**
- Replaced 28-line placeholder with 171-line orchestrator
- Implemented phase-based routing with switch statement
- Added completion handlers for all 4 game phases
- Error fallback for unknown phases

**Key Implementation:**
```typescript
// Phase routing with proper state updates
case 'cash-builder':
  return <CashBuilderRound onComplete={handleCashBuilderComplete} />

case 'head-to-head':
  return <HeadToHeadRound
    startingPosition={currentState.contestantPosition}
    chaserDifficulty={currentState.chaserDifficulty}
    onComplete={handleHeadToHeadComplete}
  />
```

### Task 2: Update GameContainer and PresentationView
**Commit:** `62d3693` - feat(23-07): integrate Chase game with difficulty and control mode selection

**Changes:**
- GameContainer: Added `onChaseStateUpdate` prop and passed to TheChaseGame
- PresentationView: Added Chase setup modal, launchTheChase function, createChaseState factory
- Setup modal: 2 control modes × 3 difficulties = 6 launch configurations

**Setup Modal UI:**
- Control mode toggle uses data attributes for selected state
- Difficulty buttons color-coded (green=easy, amber=medium, red=hard)
- Accuracy percentages displayed prominently
- Descriptive text explains chaser behavior per difficulty

**Question Generation:**
- Requests 40 questions from AI provider
- Uses current slide context for content-grounded questions
- Retries up to 3 times with exponential backoff via `withRetry`

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Upstream Dependencies (requires):**
- 23-03: CashBuilderRound component
- 23-04: OfferSelection component
- 23-05: HeadToHeadRound and GameOutcome components
- 23-06: FinalChaseRound component

**Downstream Impact (affects):**
- 23-08: Student view orchestration can now receive Chase state updates

**Type System:**
- `ChasePhase` union type for exhaustive phase checking
- `TheChaseState` discriminated union member
- `GameDifficulty` type maps to chaser AI accuracy thresholds

## Testing Notes

**Manual Test Flow:**
1. Open PresentationView
2. Click game menu → Select "The Chase"
3. Setup modal appears with AI-Controlled selected by default
4. Toggle to Manual Control (optional)
5. Select difficulty (Easy/Medium/Hard)
6. Game launches with loading state
7. After questions generate, Cash Builder starts
8. Complete Cash Builder → Offer Selection appears
9. Vote and confirm offer → Head-to-Head starts
10. Win Head-to-Head → Final Chase starts
11. Complete Final Chase → Game Over screen

**Expected Behavior:**
- Loading state shows spinner during question generation
- Each phase transitions smoothly with proper state updates
- Student view receives all state updates via broadcast
- AI chaser respects difficulty accuracy percentages
- Manual control allows teacher to select chaser answers

## Next Phase Readiness

**Ready to proceed:** Yes

**Prerequisites for 23-08 (if not already complete):**
- Student view orchestration should mirror teacher phase routing
- Broadcast sync handles Chase state updates
- UI components display Chase game phases correctly

**Outstanding items:** None

## Documentation

**Files Modified:**
- `components/games/TheChaseGame.tsx`: 171 lines (was 28-line placeholder)
- `components/games/GameContainer.tsx`: Added Chase routing with handler
- `components/PresentationView.tsx`: Added setup modal (98 lines), launch function, state factory

**Public API:**
```typescript
interface TheChaseGameProps {
  state: TheChaseState;
  onClose: () => void;
  onStateUpdate?: (updates: Partial<TheChaseState>) => void;
}
```

**Setup Modal Configuration:**
- Control mode: 'AI-Controlled' (default) | 'Manual Control'
- Difficulty: 'easy' (60%) | 'medium' (75%) | 'hard' (90%)
- AI availability check prevents launch without provider

---

**Phase 23 Plan 07 complete.** The Chase game is fully integrated with proper orchestration, difficulty selection, and control mode configuration. Ready for student view integration (Plan 08).
