# Phase 23: The Chase - Research

**Researched:** 2026-01-23
**Domain:** Multi-phase quiz game with timer-based rounds, AI opponent, game board position tracking, and class voting
**Confidence:** HIGH

## Summary

Phase 23 implements "The Chase" game format within the established game architecture from Phase 20. The Chase is the most complex game format to date, featuring four distinct phases (Cash Builder, Offer Selection, Head-to-Head, Final Chase), timer-based gameplay, a 7-step game board with position tracking, and an AI-controlled opponent with adjustable accuracy.

The existing architecture provides the foundation: discriminated unions for game state (TheChaseState already defined in types.ts), BroadcastChannel sync for teacher-student windows, and AI question generation infrastructure. The main technical challenges are:

1. **Multi-phase state machine** - Managing transitions between Cash Builder → Offer Selection → Head-to-Head → Final Chase with distinct UI and rules per phase
2. **Timer management** - 60-second Cash Builder countdown, 2-minute Final Chase rounds with pause/resume
3. **Game board mechanics** - 7-step vertical board with contestant/chaser positions, collision detection (caught vs. home safe), smooth slide animations
4. **AI opponent behavior** - Configurable accuracy (60%/75%/90% for Easy/Medium/Hard), delayed response with "thinking" pause
5. **Class voting system** - Collect student votes on three offers, determine majority winner
6. **Pushback mechanics** - In Final Chase, wrong chaser answers become pushback opportunities if contestant answers correctly

Based on TV show format research, The Chase uses a 7-step board where contestants need 5 correct answers from the middle starting position to reach home, while the chaser starts at the top and pursues. The Cash Builder determines the prize money (not the starting position). The Final Chase features a clever pushback mechanic where the team can push the chaser back one step by correctly answering questions the chaser missed.

**Primary recommendation:** Build in phases matching game flow: (1) Cash Builder with countdown timer and running score, (2) Offer selection with voting UI, (3) Head-to-Head chase on game board, (4) Final Chase with pushback mechanic. Use useReducer for phase transitions as a lightweight FSM. No new dependencies needed - timers use setInterval, AI uses existing generateGameQuestions, animations use CSS transform/translate.

## Standard Stack

Per Phase 20 and v3.0 decisions: **zero new runtime dependencies**.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | UI rendering | Already in project |
| TypeScript | 5.8.2 | Type system | Already in project |
| Tailwind CSS | CDN | Styling | Already configured |
| Native BroadcastChannel | Built-in | Teacher-student sync | Already used in useBroadcastSync hook |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| useReducer | React built-in | Phase state machine | Multi-phase game transitions |
| setInterval | Native JS | Countdown timers | Cash Builder 60s, Final Chase 2min |
| CSS Transforms | Native | Position animations | Smooth board movement (300-500ms slide) |
| Math.random() | Native JS | AI accuracy simulation | Weighted random for chaser answers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useReducer FSM | XState library | Adds ~30kb dependency; useReducer sufficient for linear phase flow |
| setInterval | react-timer-hook | Adds dependency; native timer is 20 lines of code |
| CSS animations | Framer Motion | Adds ~40kb dependency; CSS transitions adequate for slide movement |
| Inline randomness | Weighted-random library | Adds dependency; weighted random is 10 lines of code |

**Installation:**
```bash
# No new dependencies needed - everything uses React built-ins or native APIs
```

## Architecture Patterns

### Recommended Project Structure
```
components/
  games/
    TheChaseGame.tsx              # Main game orchestrator (teacher view)
    the-chase/
      CashBuilderRound.tsx        # 60-second rapid-fire with countdown timer
      OfferSelection.tsx          # Three offers with voting UI
      GameBoard.tsx               # 7-step vertical board with positions
      HeadToHeadRound.tsx         # Question display with board updates
      FinalChaseRound.tsx         # Timed round with pushback mechanic
      ChaserThinking.tsx          # Pause overlay before chaser reveals answer
      GameOutcome.tsx             # "Caught" or "Home Safe" celebration
      VotingWidget.tsx            # Class vote collection and display
    shared/
      GameSplash.tsx              # Already exists
      Timer.tsx                   # Reusable countdown timer component
hooks/
  useTimer.ts                     # Custom hook for countdown with pause/resume
  useChaserAI.ts                  # AI answer selection with accuracy weighting
  useVoting.ts                    # Vote collection via BroadcastChannel
types.ts                          # TheChaseState already defined, add phase subtypes
services/
  aiProvider.ts                   # Already has generateGameQuestions
```

### Pattern 1: Multi-Phase State Machine with useReducer
**What:** Linear phase progression with distinct states and transitions
**When to use:** Games with sequential phases that can't be skipped
**Example:**
```typescript
// Source: React useReducer FSM pattern from web research (2026)
// https://kyleshevlin.com/how-to-use-usereducer-as-a-finite-state-machine/

type ChasePhase =
  | 'cash-builder'
  | 'offer-selection'
  | 'head-to-head'
  | 'final-chase'
  | 'game-over';

interface ChaseGameState {
  phase: ChasePhase;
  cashBuilderScore: number;
  cashBuilderTimeRemaining: number;
  selectedOffer: number | null;
  contestantPosition: number;
  chaserPosition: number;
  finalChaseScore: number;
  finalChaseTimeRemaining: number;
  // ... other state
}

type ChaseAction =
  | { type: 'CASH_BUILDER_COMPLETE'; score: number }
  | { type: 'OFFER_SELECTED'; offerIndex: number }
  | { type: 'HEAD_TO_HEAD_COMPLETE'; outcome: 'caught' | 'safe' }
  | { type: 'FINAL_CHASE_COMPLETE' }
  | { type: 'TIMER_TICK' }
  | { type: 'CONTESTANT_CORRECT' }
  | { type: 'CHASER_CORRECT' };

function chaseReducer(state: ChaseGameState, action: ChaseAction): ChaseGameState {
  // State-first approach: check current phase before processing action
  switch (state.phase) {
    case 'cash-builder':
      if (action.type === 'CASH_BUILDER_COMPLETE') {
        return { ...state, phase: 'offer-selection', cashBuilderScore: action.score };
      }
      if (action.type === 'TIMER_TICK' && state.cashBuilderTimeRemaining > 0) {
        return { ...state, cashBuilderTimeRemaining: state.cashBuilderTimeRemaining - 1 };
      }
      break;

    case 'offer-selection':
      if (action.type === 'OFFER_SELECTED') {
        return { ...state, phase: 'head-to-head', selectedOffer: action.offerIndex };
      }
      break;

    case 'head-to-head':
      if (action.type === 'CONTESTANT_CORRECT') {
        const newPos = state.contestantPosition + 1;
        // Check if reached home (position 7)
        if (newPos === 7) {
          return { ...state, phase: 'final-chase', contestantPosition: newPos };
        }
        return { ...state, contestantPosition: newPos };
      }
      if (action.type === 'CHASER_CORRECT') {
        const newPos = state.chaserPosition + 1;
        // Check if caught (chaser position >= contestant position)
        if (newPos >= state.contestantPosition) {
          return { ...state, phase: 'game-over', chaserPosition: newPos };
        }
        return { ...state, chaserPosition: newPos };
      }
      break;

    case 'final-chase':
      if (action.type === 'FINAL_CHASE_COMPLETE') {
        return { ...state, phase: 'game-over' };
      }
      // ... handle timer ticks and pushback
      break;
  }

  return state;
}
```

### Pattern 2: Countdown Timer with useEffect + setInterval
**What:** Reusable timer hook with pause/resume capability
**When to use:** Cash Builder (60s), Final Chase (2min each), any timed round
**Example:**
```typescript
// Source: React countdown timer best practices (2026)
// https://www.digitalocean.com/community/tutorials/react-countdown-timer-react-hooks

interface TimerConfig {
  initialSeconds: number;
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
}

function useTimer({ initialSeconds, onComplete, onTick }: TimerConfig) {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1;
        onTick?.(next);

        if (next <= 0) {
          setIsRunning(false);
          onComplete?.();
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, onComplete, onTick]);

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = (seconds?: number) => {
    setTimeRemaining(seconds ?? initialSeconds);
    setIsRunning(false);
  };

  return {
    timeRemaining,
    isRunning,
    start,
    pause,
    reset,
    formattedTime: formatTime(timeRemaining)
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Usage in CashBuilderRound:
const timer = useTimer({
  initialSeconds: 60,
  onComplete: () => dispatch({ type: 'CASH_BUILDER_COMPLETE', score: currentScore }),
  onTick: (remaining) => {
    if (remaining <= 10) {
      // Play urgency sound or change UI color
    }
  }
});
```

### Pattern 3: Smooth Board Position Animation with CSS Transform
**What:** Hardware-accelerated position changes using translate
**When to use:** Moving contestant/chaser icons down the 7-step board
**Example:**
```typescript
// Source: CSS animation best practices (2026)
// https://www.joshwcomeau.com/animation/css-transitions/
// https://openclassrooms.com/en/courses/5625816-create-modern-css-animations/5973616-use-the-transform-css-property-to-ensure-smooth-animations

interface GamePieceProps {
  position: number; // 0-6 (7 steps)
  type: 'contestant' | 'chaser';
}

const GamePiece: React.FC<GamePieceProps> = ({ position, type }) => {
  // Each step is ~14.28% of the board height (100% / 7 steps)
  const stepHeight = 14.28;
  const translateY = position * stepHeight;

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 w-16 h-16
        transition-transform duration-500 ease-out`}
      style={{
        transform: `translateX(-50%) translateY(${translateY}%)`,
      }}
    >
      {type === 'contestant' ? (
        <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center text-3xl">
          👤
        </div>
      ) : (
        <div className="w-full h-full bg-red-600 rounded-full flex items-center justify-center text-3xl">
          😈
        </div>
      )}
    </div>
  );
};

// GameBoard component
const GameBoard: React.FC<{ contestantPos: number; chaserPos: number }> = ({
  contestantPos,
  chaserPos
}) => {
  return (
    <div className="relative w-64 h-96 bg-slate-800 rounded-2xl border-4 border-slate-600">
      {/* Step markers */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 h-px bg-slate-600"
          style={{ top: `${i * 14.28}%` }}
        />
      ))}

      {/* Home indicator at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-green-600/20
        flex items-center justify-center text-white font-bold">
        HOME
      </div>

      {/* Game pieces - position managed via transform for smooth animation */}
      <GamePiece position={contestantPos} type="contestant" />
      <GamePiece position={chaserPos} type="chaser" />
    </div>
  );
};
```

### Pattern 4: AI Opponent with Weighted Random Accuracy
**What:** Chaser answers based on difficulty-based accuracy percentage
**When to use:** AI-controlled chaser mode (Easy=60%, Medium=75%, Hard=90%)
**Example:**
```typescript
// Source: Weighted random algorithm (2026)
// https://dev.to/trekhleb/weighted-random-algorithm-in-javascript-1pdc

type ChaserDifficulty = 'easy' | 'medium' | 'hard';

const CHASER_ACCURACY: Record<ChaserDifficulty, number> = {
  easy: 0.60,
  medium: 0.75,
  hard: 0.90
};

interface ChaserAIConfig {
  difficulty: ChaserDifficulty;
  thinkingDelayMs?: number; // Default 1500ms (1.5 seconds)
}

function useChaserAI({ difficulty, thinkingDelayMs = 1500 }: ChaserAIConfig) {
  const [isThinking, setIsThinking] = useState(false);

  const getChaserAnswer = async (
    question: QuizQuestion
  ): Promise<number> => {
    // Simulate thinking pause (adds tension)
    setIsThinking(true);
    await new Promise(resolve => setTimeout(resolve, thinkingDelayMs));
    setIsThinking(false);

    const accuracy = CHASER_ACCURACY[difficulty];
    const shouldAnswerCorrectly = Math.random() < accuracy;

    if (shouldAnswerCorrectly) {
      return question.correctAnswerIndex;
    } else {
      // Pick a random wrong answer
      const wrongIndices = [0, 1, 2, 3].filter(
        i => i !== question.correctAnswerIndex
      );
      return wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
    }
  };

  return { getChaserAnswer, isThinking };
}

// Usage in HeadToHeadRound:
const { getChaserAnswer, isThinking } = useChaserAI({
  difficulty: gameState.chaserDifficulty
});

const handleContestantAnswer = async (selectedIndex: number) => {
  // 1. Show contestant answer result
  const isCorrect = selectedIndex === currentQuestion.correctAnswerIndex;
  if (isCorrect) {
    dispatch({ type: 'CONTESTANT_CORRECT' });
  }

  // 2. Brief pause, then show "Chaser is thinking..."
  await new Promise(resolve => setTimeout(resolve, 800));

  // 3. Get chaser answer (includes thinking delay)
  const chaserIndex = await getChaserAnswer(currentQuestion);
  const chaserCorrect = chaserIndex === currentQuestion.correctAnswerIndex;

  if (chaserCorrect) {
    dispatch({ type: 'CHASER_CORRECT' });
  }

  // 4. Move to next question after brief celebration/reaction
  await new Promise(resolve => setTimeout(resolve, 1500));
  dispatch({ type: 'NEXT_QUESTION' });
};
```

### Pattern 5: Class Voting via BroadcastChannel
**What:** Collect votes from student windows, determine majority winner
**When to use:** Offer selection phase (three offers, class chooses one)
**Example:**
```typescript
// Source: BroadcastChannel sync pattern (existing in codebase)
// See: hooks/useBroadcastSync.ts

type VoteMessage =
  | { type: 'VOTE_START'; options: OfferOption[] }
  | { type: 'VOTE_CAST'; studentName: string; optionIndex: number }
  | { type: 'VOTE_END'; winningIndex: number };

// Teacher view - collect votes
function OfferSelection() {
  const { postMessage, lastMessage } = useBroadcastSync<VoteMessage>('pipi-presentation');
  const [votes, setVotes] = useState<Map<string, number>>(new Map());
  const [isVoting, setIsVoting] = useState(false);

  const offers: OfferOption[] = [
    { amount: 5000, startPosition: 2, label: 'High Offer (+2 steps)' },
    { amount: 2000, startPosition: 3, label: 'Cash Builder' },
    { amount: 500, startPosition: 4, label: 'Low Offer (-1 step)' },
  ];

  const startVoting = () => {
    setVotes(new Map());
    setIsVoting(true);
    postMessage({ type: 'VOTE_START', options: offers });
  };

  useEffect(() => {
    if (lastMessage?.type === 'VOTE_CAST') {
      setVotes(prev => new Map(prev).set(
        lastMessage.studentName,
        lastMessage.optionIndex
      ));
    }
  }, [lastMessage]);

  const endVoting = () => {
    // Count votes
    const tallies = [0, 0, 0];
    votes.forEach(optionIndex => tallies[optionIndex]++);

    // Find majority winner
    const winningIndex = tallies.indexOf(Math.max(...tallies));

    postMessage({ type: 'VOTE_END', winningIndex });
    dispatch({ type: 'OFFER_SELECTED', offerIndex: winningIndex });
    setIsVoting(false);
  };

  return (
    <div>
      <h2>Class Vote: Choose Your Offer</h2>
      <div className="grid grid-cols-3 gap-4">
        {offers.map((offer, i) => {
          const voteCount = Array.from(votes.values()).filter(v => v === i).length;
          return (
            <div key={i} className="p-6 border rounded-lg">
              <div className="text-2xl font-bold">${offer.amount}</div>
              <div className="text-sm">{offer.label}</div>
              {isVoting && (
                <div className="mt-2 text-lg font-bold text-blue-600">
                  {voteCount} votes
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!isVoting ? (
        <button onClick={startVoting}>Start Class Vote</button>
      ) : (
        <button onClick={endVoting}>End Voting & Lock In</button>
      )}
    </div>
  );
}

// Student view - cast vote
function StudentVoting({ studentName }: { studentName: string }) {
  const { postMessage, lastMessage } = useBroadcastSync<VoteMessage>('pipi-presentation');
  const [options, setOptions] = useState<OfferOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (lastMessage?.type === 'VOTE_START') {
      setOptions(lastMessage.options);
      setSelectedIndex(null);
      setHasVoted(false);
    }
  }, [lastMessage]);

  const castVote = (index: number) => {
    setSelectedIndex(index);
    setHasVoted(true);
    postMessage({
      type: 'VOTE_CAST',
      studentName,
      optionIndex: index
    });
  };

  if (options.length === 0) return null;

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-4">Vote for an Offer</h2>
      <div className="grid grid-cols-1 gap-4">
        {options.map((offer, i) => (
          <button
            key={i}
            onClick={() => castVote(i)}
            disabled={hasVoted}
            className={`p-6 rounded-lg border-2 transition-all ${
              selectedIndex === i
                ? 'bg-blue-500 text-white border-blue-700'
                : 'bg-white border-gray-300 hover:border-blue-400'
            } ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-2xl font-bold">${offer.amount}</div>
            <div className="text-sm">{offer.label}</div>
          </button>
        ))}
      </div>
      {hasVoted && (
        <p className="mt-4 text-green-600 font-bold">
          Vote submitted! Waiting for class...
        </p>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid

**Anti-pattern 1: Treat phases as separate game states**
- Don't create separate TheChaseState types per phase
- DO use a discriminated union within TheChaseState for phase-specific data

**Anti-pattern 2: Update timer every render**
- Don't use Date.now() comparison in render function
- DO use setInterval in useEffect with cleanup

**Anti-pattern 3: Use top/left for position animation**
- Don't animate position with `top`, `left`, `margin`, or `padding` (causes reflows)
- DO use `transform: translate()` for GPU-accelerated animation

**Anti-pattern 4: Synchronous chaser answer**
- Don't immediately show chaser answer after contestant locks in
- DO add thinking delay (1-2s) to build tension

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State machine library | Custom phase manager | useReducer pattern | Built-in, zero deps, adequate for linear phases |
| Timer library | Custom countdown logic | useEffect + setInterval | 20 lines of code, no dependency needed |
| Weighted random | Complex probability system | Math.random() threshold | Simple accuracy check: `Math.random() < 0.75` |
| Animation library | JavaScript position updates | CSS transition + transform | GPU-accelerated, smoother, less code |
| Voting backend | Server-side vote tallying | BroadcastChannel | Already in codebase, real-time, no server |

**Key insight:** The Chase looks complex (4 phases, timers, AI, voting, animations) but every piece uses simple primitives. Don't over-engineer with libraries when React built-ins and native APIs suffice. The complexity is in the *orchestration*, not the primitives.

## Common Pitfalls

### Pitfall 1: Timer Doesn't Stop When Component Unmounts
**What goes wrong:** Timer keeps running after game ends, causing state updates on unmounted component
**Why it happens:** setInterval not cleared in cleanup function
**How to avoid:** Always return cleanup function from useEffect
**Warning signs:** "Can't perform React state update on unmounted component" console warning

```typescript
// BAD - no cleanup
useEffect(() => {
  const intervalId = setInterval(() => {
    setTimeRemaining(prev => prev - 1);
  }, 1000);
}, []);

// GOOD - cleanup clears interval
useEffect(() => {
  const intervalId = setInterval(() => {
    setTimeRemaining(prev => prev - 1);
  }, 1000);

  return () => clearInterval(intervalId); // ✓ Cleanup
}, []);
```

### Pitfall 2: Phase Transition Race Conditions
**What goes wrong:** User clicks "Next" during phase transition, triggers duplicate state updates
**Why it happens:** Action handlers don't check current phase before dispatching
**How to avoid:** Implement state-first FSM pattern in reducer, ignore invalid actions
**Warning signs:** Phases skip ahead or UI shows wrong phase briefly

```typescript
// BAD - no phase guard
const handleNextPhase = () => {
  dispatch({ type: 'CASH_BUILDER_COMPLETE', score });
  dispatch({ type: 'START_HEAD_TO_HEAD' }); // Can fire during wrong phase
};

// GOOD - reducer ignores invalid transitions
function chaseReducer(state: ChaseGameState, action: ChaseAction) {
  // State-first: only process actions valid for current phase
  if (state.phase === 'cash-builder' && action.type === 'CASH_BUILDER_COMPLETE') {
    return { ...state, phase: 'offer-selection', score: action.score };
  }
  // Invalid action for this phase - return unchanged state
  return state;
}
```

### Pitfall 3: Position Collision Detection Off By One
**What goes wrong:** Chaser doesn't catch contestant when positions match, or catches one step early
**Why it happens:** Comparing positions before or after increment, not at correct moment
**How to avoid:** Update position first, then check collision in same action
**Warning signs:** "Home safe" when chaser is on same step, or caught when chaser is one behind

```typescript
// BAD - check before update
if (state.chaserPosition >= state.contestantPosition) {
  // Caught!
}
return { ...state, chaserPosition: state.chaserPosition + 1 };

// GOOD - update then check
const newChaserPos = state.chaserPosition + 1;
if (newChaserPos >= state.contestantPosition) {
  return { ...state, phase: 'game-over', outcome: 'caught', chaserPosition: newChaserPos };
}
return { ...state, chaserPosition: newChaserPos };
```

### Pitfall 4: Vote Counting Doesn't Handle Duplicate Student Names
**What goes wrong:** Two students with same name (e.g., "Alex") vote for different offers, only last vote counts
**Why it happens:** Using student name as Map key without handling duplicates
**How to avoid:** Either enforce unique names at class setup, or append index for votes
**Warning signs:** Vote tallies don't match number of students, votes get overwritten

```typescript
// BAD - student name as key (breaks with duplicates)
const votes = new Map<string, number>();
votes.set(studentName, optionIndex); // Later "Alex" overwrites earlier "Alex"

// GOOD - enforce uniqueness at class setup
// In ClassManagementModal, validate:
const isDuplicate = studentNames.filter(n => n === newName).length > 1;
if (isDuplicate) {
  alert('Student names must be unique for voting games');
}

// ALTERNATIVE - use unique ID if available
const votes = new Map<string, number>();
votes.set(`${studentName}-${studentId}`, optionIndex);
```

### Pitfall 5: Chaser "Thinking" Pause Blocks Next Question
**What goes wrong:** UI freezes during chaser thinking delay, can't cancel or skip
**Why it happens:** Using blocking setTimeout, no escape hatch
**How to avoid:** Track thinking state separately, allow teacher to skip
**Warning signs:** Teacher complains game feels slow, can't advance when chaser is thinking

```typescript
// BAD - blocking delay
await new Promise(resolve => setTimeout(resolve, 2000));
// Can't skip, UI frozen

// GOOD - track thinking state, allow skip
const [isThinking, setIsThinking] = useState(false);
const thinkingTimeoutRef = useRef<number | null>(null);

const startThinking = (onComplete: () => void) => {
  setIsThinking(true);
  thinkingTimeoutRef.current = window.setTimeout(() => {
    setIsThinking(false);
    onComplete();
  }, 1500);
};

const skipThinking = () => {
  if (thinkingTimeoutRef.current) {
    clearTimeout(thinkingTimeoutRef.current);
    setIsThinking(false);
  }
};

// In UI:
{isThinking && (
  <div className="overlay">
    <p>Chaser is thinking...</p>
    <button onClick={skipThinking}>Skip</button>
  </div>
)}
```

### Pitfall 6: Final Chase Pushback Not Symmetric
**What goes wrong:** Pushback moves chaser back but doesn't move team forward from start
**Why it happens:** Misunderstanding TV show rules - pushback always moves chaser back
**How to avoid:** Clarify pushback logic: wrong chaser answer → team can answer → if correct, chaser moves back 1 step
**Warning signs:** Players confused why pushback doesn't help when chaser at position 0

```typescript
// CORRECT LOGIC (from TV show research):
// 1. Chaser answers question
// 2. If chaser WRONG or PASS:
//    a. Stop timer
//    b. Team gets chance to answer
//    c. If team CORRECT: chaser position -= 1 (pushback)
//    d. If team WRONG: no change
// 3. If chaser CORRECT: chaser position += 1

// Implementation:
case 'CHASER_ANSWER':
  if (action.isCorrect) {
    // Chaser correct - move forward
    return { ...state, chaserPosition: state.chaserPosition + 1 };
  } else {
    // Chaser wrong - enter pushback opportunity
    return { ...state, phase: 'pushback-opportunity', pausedAt: Date.now() };
  }

case 'TEAM_PUSHBACK_ANSWER':
  if (action.isCorrect && state.chaserPosition > 0) {
    // Push chaser back (but not below 0)
    return { ...state, chaserPosition: state.chaserPosition - 1, phase: 'final-chase' };
  } else {
    // No pushback, resume
    return { ...state, phase: 'final-chase' };
  }
```

## Code Examples

Verified patterns from research and codebase:

### Example 1: TheChaseState Type Definition
```typescript
// Source: types.ts (already defined in codebase)
// Extended with phase-specific subtypes

type ChasePhase =
  | 'cash-builder'
  | 'offer-selection'
  | 'head-to-head'
  | 'final-chase'
  | 'game-over';

interface TheChaseState extends BaseGameState {
  gameType: 'the-chase';

  // Phase management
  phase: ChasePhase;

  // Cash Builder data
  cashBuilderScore: number;
  cashBuilderTimeRemaining: number;

  // Offer selection
  offers: [OfferOption, OfferOption, OfferOption];
  selectedOffer: number | null;
  votes: Map<string, number>; // studentName -> offerIndex

  // Head-to-Head / Final Chase
  contestantPosition: number; // 0-6 (7 steps)
  chaserPosition: number;     // 0-6
  chaserDifficulty: 'easy' | 'medium' | 'hard';
  chaserMode: 'ai' | 'manual'; // AI-controlled or teacher-controlled

  // Final Chase specifics
  finalChaseTeamTime: number;    // 120 seconds
  finalChaseChaserTime: number;  // 120 seconds
  finalChaseActivePlayer: 'team' | 'chaser';
  pushbackOpportunity: boolean;

  // Outcome
  outcome: 'caught' | 'home-safe' | null;
}

interface OfferOption {
  amount: number;
  startPosition: number; // 2, 3, or 4 (high, middle, low offer)
  label: string;
}
```

### Example 2: Game Board with Smooth Position Animation
```typescript
// Source: CSS transform animation best practices
// https://www.joshwcomeau.com/animation/css-transitions/

interface GameBoardProps {
  contestantPosition: number;
  chaserPosition: number;
  outcome: 'caught' | 'home-safe' | null;
}

const GameBoard: React.FC<GameBoardProps> = ({
  contestantPosition,
  chaserPosition,
  outcome
}) => {
  const steps = Array.from({ length: 7 }, (_, i) => i);
  const stepHeight = 100 / 7; // Percentage per step

  return (
    <div className="relative w-80 h-[32rem] bg-gradient-to-b from-slate-900 to-slate-800
      rounded-3xl border-4 border-slate-700 shadow-2xl overflow-hidden">

      {/* Step lines */}
      {steps.map(i => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-slate-600/50"
          style={{ top: `${i * stepHeight}%` }}
        />
      ))}

      {/* Home zone at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-green-500/20
        flex items-center justify-center">
        <span className="text-2xl font-black text-green-400">HOME</span>
      </div>

      {/* Contestant piece */}
      <div
        className="absolute left-1/4 -translate-x-1/2 w-20 h-20
          transition-all duration-500 ease-out z-10"
        style={{
          top: `calc(${contestantPosition * stepHeight}% + 1rem)`,
        }}
      >
        <div className={`w-full h-full rounded-full flex items-center justify-center
          text-4xl shadow-lg ${
          outcome === 'home-safe'
            ? 'bg-green-500 animate-bounce'
            : 'bg-blue-500'
        }`}>
          👤
        </div>
      </div>

      {/* Chaser piece */}
      <div
        className="absolute right-1/4 translate-x-1/2 w-20 h-20
          transition-all duration-500 ease-out z-10"
        style={{
          top: `calc(${chaserPosition * stepHeight}% + 1rem)`,
        }}
      >
        <div className={`w-full h-full rounded-full flex items-center justify-center
          text-4xl shadow-lg ${
          outcome === 'caught'
            ? 'bg-red-700 animate-pulse'
            : 'bg-red-600'
        }`}>
          😈
        </div>
      </div>

      {/* Outcome overlay */}
      {outcome && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center
          backdrop-blur-sm animate-fade-in z-20">
          <div className="text-center">
            {outcome === 'home-safe' ? (
              <>
                <div className="text-8xl mb-4">🎉</div>
                <h2 className="text-5xl font-black text-green-400">HOME SAFE!</h2>
              </>
            ) : (
              <>
                <div className="text-8xl mb-4">😱</div>
                <h2 className="text-5xl font-black text-red-500">CAUGHT!</h2>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

### Example 3: Cash Builder Round with Countdown Timer
```typescript
// Source: useTimer hook pattern (see Pattern 2)

interface CashBuilderRoundProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

const CashBuilderRound: React.FC<CashBuilderRoundProps> = ({
  questions,
  onComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<boolean[]>(new Array(questions.length).fill(false));

  const timer = useTimer({
    initialSeconds: 60,
    onComplete: () => onComplete(score),
    onTick: (remaining) => {
      // Visual warning when time running out
      if (remaining === 10) {
        // Could play urgency sound or change UI color
      }
    }
  });

  useEffect(() => {
    timer.start();
  }, []);

  const handleAnswer = (selectedIndex: number) => {
    const current = questions[currentIndex];
    const isCorrect = selectedIndex === current.correctAnswerIndex;

    if (isCorrect) {
      setScore(prev => prev + 1000); // £1000 per correct answer (TV show format)
    }

    setAnswered(prev => {
      const next = [...prev];
      next[currentIndex] = true;
      return next;
    });

    // Brief pause to show result, then next question
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }, 800);
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-900
      flex flex-col items-center justify-center p-8">

      {/* Timer and Score Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="text-center">
          <div className="text-sm text-slate-400 uppercase tracking-wider mb-1">
            Time Remaining
          </div>
          <div className={`text-6xl font-black ${
            timer.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-white'
          }`}>
            {timer.formattedTime}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm text-slate-400 uppercase tracking-wider mb-1">
            Cash Builder
          </div>
          <div className="text-6xl font-black text-green-400">
            ${score.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="w-full max-w-4xl bg-slate-800/60 backdrop-blur-sm rounded-2xl p-8 mb-8">
        <h3 className="text-3xl font-bold text-white mb-8 text-center">
          {currentQuestion.question}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {currentQuestion.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answered[currentIndex]}
              className="p-6 bg-slate-700 hover:bg-slate-600 text-white text-xl font-bold
                rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {String.fromCharCode(65 + i)}. {option}
            </button>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${
              answered[i] ? 'bg-green-500' : 'bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External FSM libraries (XState) | useReducer pattern for linear phases | 2024-2025 | Simpler, zero deps, adequate for game phases |
| JavaScript animation (GSAP, Framer Motion) | CSS transform + transition | Ongoing | GPU-accelerated, smoother, less code |
| react-countdown library | Custom useTimer hook | 2025-2026 | 20 lines vs 10kb dependency, better control |
| Server-side voting | BroadcastChannel peer-to-peer | 2023+ | Real-time, no backend needed, works offline |
| Deterministic AI (always answers correctly) | Probability-based AI (adjustable accuracy) | Game design evolution | More realistic, adjustable difficulty |

**Deprecated/outdated:**
- **setInterval in render function:** Causes memory leaks, use useEffect with cleanup
- **Animating with top/left/margin:** Causes layout thrashing, use transform instead
- **Separate state per phase:** Harder to manage transitions, use phase property in unified state
- **Immediate chaser answer:** No tension, TV show has thinking pause for drama

## Open Questions

Things that couldn't be fully resolved:

1. **Final Chase head start calculation**
   - What we know: TV show gives 1 step per team member (3 members = 3 step head start)
   - What's unclear: How to adapt for classroom (1 contestant vs team of 30 students)
   - Recommendation: Make head start configurable in CONTEXT.md decisions, or base on Head-to-Head performance (e.g., reach home with 3+ steps lead = 3 step head start in Final Chase)

2. **Voting timeout handling**
   - What we know: Teacher can end voting manually
   - What's unclear: Should there be auto-timeout if X% of students have voted?
   - Recommendation: Start with manual only (simpler), add auto-timeout in future if teachers request it

3. **Chaser character/personality**
   - What we know: TV show has 6 distinct chasers with personalities
   - What's unclear: Should classroom version have selectable chaser "characters" (different icons, colors, names)?
   - Recommendation: Phase 23 uses single generic chaser (😈 icon), future phase could add character selection

4. **Question count per phase**
   - What we know: TV show has variable length based on time/performance
   - What's unclear: Fixed count (e.g., 10 questions) or variable based on timer?
   - Recommendation: Generate 15-20 questions, use as many as needed until time expires or outcome reached

## Sources

### Primary (HIGH confidence)
- [The Chase TV show rules - Wikipedia](https://en.wikipedia.org/wiki/The_Chase_(British_game_show)) - Official game format and mechanics
- [React useReducer as FSM - Kyle Shevlin](https://kyleshevlin.com/how-to-use-usereducer-as-a-finite-state-machine/) - useReducer state machine pattern
- [CSS Transitions Guide - Josh Comeau](https://www.joshwcomeau.com/animation/css-transitions/) - Transform animation best practices
- [Smooth CSS Animations - OpenClassrooms](https://openclassrooms.com/en/courses/5625816-create-modern-css-animations/5973616-use-the-transform-css-property-to-ensure-smooth-animations) - GPU-accelerated animations
- Existing codebase patterns: useBroadcastSync.ts, MillionaireGame.tsx, types.ts (TheChaseState)

### Secondary (MEDIUM confidence)
- [React Countdown Timer Tutorial - DigitalOcean](https://www.digitalocean.com/community/tutorials/react-countdown-timer-react-hooks) - Timer implementation pattern
- [Weighted Random Algorithm - DEV Community](https://dev.to/trekhleb/weighted-random-algorithm-in-javascript-1pdc) - AI accuracy probability
- [BroadcastChannel with React - DEV Community](https://dev.to/franciscomendes10866/syncing-react-state-across-tabs-using-broadcast-channel-api-420k) - Multi-window sync pattern
- [Real-time Voting with React - GeeksforGeeks](https://www.geeksforgeeks.org/mern/real-time-polling-app-with-node-and-react/) - Voting system patterns

### Tertiary (LOW confidence)
- [State Management in 2026 - Nucamp](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - General state management trends
- [React + AI Stack 2026 - Builder.io](https://www.builder.io/blog/react-ai-stack-2026) - Modern React development patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, uses existing React/TypeScript/Tailwind + native APIs
- Architecture: HIGH - Patterns verified in existing codebase (Millionaire, useBroadcastSync) and research sources
- Game mechanics: HIGH - TV show format well-documented, CONTEXT.md provides specific decisions
- Timer implementation: HIGH - Standard React pattern, verified in multiple sources
- AI opponent: HIGH - Simple weighted random, no complex ML needed
- Voting system: HIGH - BroadcastChannel pattern already used in codebase
- Pitfalls: MEDIUM - Based on common React mistakes and game development forums

**Research date:** 2026-01-23
**Valid until:** 30 days (stable technologies, React patterns don't change rapidly)
