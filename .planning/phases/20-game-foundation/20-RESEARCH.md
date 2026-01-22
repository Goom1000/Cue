# Phase 20: Game Foundation & Type System - Research

**Researched:** 2026-01-23
**Domain:** TypeScript discriminated unions, React state management, BroadcastChannel sync
**Confidence:** HIGH

## Summary

This phase establishes the unified game architecture for 4 game types (Quick Quiz, Millionaire, The Chase, Beat the Chaser). The core challenge is designing a type system that:
1. Makes invalid game states impossible at compile time
2. Ensures clean state isolation between game types
3. Syncs game state atomically to student view via BroadcastChannel
4. Refactors existing Quick Quiz to prove the framework

The standard approach uses **TypeScript discriminated unions** with a `gameType` discriminant property. Each game type gets its own state shape, and TypeScript's type narrowing handles the rest. The existing `GameSyncState` in `types.ts` already uses this pattern partially but needs expansion for multi-game support.

**Primary recommendation:** Create a unified `GameState` discriminated union type with `gameType` as the discriminant, implement an exhaustive switch pattern in both teacher and student views, and use atomic state snapshots for BroadcastChannel sync.

## Standard Stack

The phase uses the existing stack per v3.0 decision: **zero new runtime dependencies**.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | UI rendering | Already in project |
| TypeScript | 5.8.2 | Type system | Already in project |
| BroadcastChannel API | Native | Cross-window sync | Already implemented in `useBroadcastSync.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | CDN | Styling | All UI components |
| Custom CSS | N/A | Animations | Crossfade transitions, flash reveals |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw discriminated unions | XState | Overkill for this use case; adds dependency |
| Custom dropdown | Headless UI | Adds dependency; custom is sufficient |
| BroadcastChannel | SharedWorker | More complex, less browser support |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Type Structure

```typescript
// types.ts - Discriminated union for game state
type GameType = 'quick-quiz' | 'millionaire' | 'the-chase' | 'beat-the-chaser';

// Base properties shared across all games
interface BaseGameState {
  gameType: GameType;  // The discriminant
  status: 'loading' | 'splash' | 'playing' | 'reveal' | 'result';
  questions: QuizQuestion[];
  currentQuestionIndex: number;
}

// Quick Quiz specific state
interface QuickQuizState extends BaseGameState {
  gameType: 'quick-quiz';
  isAnswerRevealed: boolean;
}

// Millionaire specific state (phase 21)
interface MillionaireState extends BaseGameState {
  gameType: 'millionaire';
  selectedOption: number | null;
  lifelines: {
    fiftyFifty: boolean;
    phoneAFriend: boolean;
    askTheAudience: boolean;
  };
  prizeLadder: number[];
  currentPrize: number;
}

// The Chase specific state (phase 22)
interface TheChaseState extends BaseGameState {
  gameType: 'the-chase';
  chaserPosition: number;
  contestantPosition: number;
  isChasing: boolean;
}

// Beat the Chaser specific state (phase 23)
interface BeatTheChaserState extends BaseGameState {
  gameType: 'beat-the-chaser';
  teamScore: number;
  chaserScore: number;
  timeRemaining: number;
}

// The unified type - use this everywhere
type GameState =
  | QuickQuizState
  | MillionaireState
  | TheChaseState
  | BeatTheChaserState;

// Null means no game active (presentation mode)
type ActiveGameState = GameState | null;
```

### Recommended Project Structure
```
components/
  games/
    GameMenu.tsx           # Toolbar dropdown for game selection
    GameContainer.tsx      # Wrapper that routes to correct game view
    QuickQuizGame.tsx      # Refactored from QuizOverlay
    MillionaireGame.tsx    # Placeholder (phase 21)
    TheChaseGame.tsx       # Placeholder (phase 22)
    BeatTheChaserGame.tsx  # Placeholder (phase 23)
    shared/
      GameSplash.tsx       # Game logo/branding splash screen
      QuestionDisplay.tsx  # Shared question rendering
      AnswerReveal.tsx     # Dramatic reveal animation
      ResultScreen.tsx     # End-of-game screen
types.ts                   # Add GameState types
hooks/
  useGameState.ts          # Optional: encapsulate game state logic
```

### Pattern 1: Exhaustive Switch with `never` Guard
**What:** Type-safe handler that ensures all game types are handled
**When to use:** Rendering game views, handling game actions
**Example:**
```typescript
// Source: TypeScript handbook - exhaustiveness checking pattern
function assertNever(x: never): never {
  throw new Error(`Unexpected game type: ${x}`);
}

function renderGameView(state: GameState): JSX.Element {
  switch (state.gameType) {
    case 'quick-quiz':
      return <QuickQuizGame state={state} />;
    case 'millionaire':
      return <MillionaireGame state={state} />;
    case 'the-chase':
      return <TheChaseGame state={state} />;
    case 'beat-the-chaser':
      return <BeatTheChaserGame state={state} />;
    default:
      return assertNever(state); // TypeScript error if case missed
  }
}
```

### Pattern 2: Atomic State Snapshots for BroadcastChannel
**What:** Send complete state object, not incremental updates
**When to use:** All game state synchronization
**Example:**
```typescript
// Source: v3.0 decision - atomic state snapshots
// In teacher view:
useEffect(() => {
  if (gameState) {
    postMessage({
      type: 'GAME_STATE_UPDATE',
      payload: gameState  // Complete state snapshot
    });
  } else {
    postMessage({ type: 'GAME_CLOSE' });
  }
}, [gameState, postMessage]);

// In student view:
useEffect(() => {
  if (lastMessage?.type === 'GAME_STATE_UPDATE') {
    setGameState(lastMessage.payload);  // Replace entire state
  }
  if (lastMessage?.type === 'GAME_CLOSE') {
    setGameState(null);
  }
}, [lastMessage]);
```

### Pattern 3: State Machine Status Transitions
**What:** Explicit status field for game phases
**When to use:** Controlling UI transitions and animations
**Example:**
```typescript
// Valid status transitions
// loading -> splash -> playing -> reveal -> playing -> ... -> result
type GameStatus = 'loading' | 'splash' | 'playing' | 'reveal' | 'result';

// Teacher controls transitions
const advanceGame = (currentState: QuickQuizState): QuickQuizState => {
  switch (currentState.status) {
    case 'loading':
      return { ...currentState, status: 'splash' };
    case 'splash':
      return { ...currentState, status: 'playing' };
    case 'playing':
      return { ...currentState, status: 'reveal', isAnswerRevealed: true };
    case 'reveal':
      if (currentState.currentQuestionIndex < currentState.questions.length - 1) {
        return {
          ...currentState,
          status: 'playing',
          currentQuestionIndex: currentState.currentQuestionIndex + 1,
          isAnswerRevealed: false
        };
      }
      return { ...currentState, status: 'result' };
    case 'result':
      return currentState; // No transition from result
  }
};
```

### Anti-Patterns to Avoid
- **State silos:** Don't create separate useState for each game type. Use single `GameState | null`.
- **Incremental sync:** Don't send individual property updates over BroadcastChannel. Always send complete state.
- **Type assertions:** Don't use `as GameType`. Let discriminated unions narrow naturally.
- **Shared mutable state:** Don't try to share objects between windows. Clone everything.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown menu | Custom click-outside detection | Existing Tailwind patterns in codebase | Already have working dropdowns in ClassBankDropdown |
| Animation timing | Manual setTimeout chains | CSS keyframes with animation-delay | More reliable, GPU accelerated |
| State reset | Manual property-by-property clear | Factory function returning fresh state | Guarantees no stale properties |
| Cross-window sync | Custom postMessage wrapper | Existing `useBroadcastSync` hook | Already handles lifecycle, heartbeat |

**Key insight:** The codebase already has working patterns for dropdowns, animations, and BroadcastChannel sync. Reuse these patterns rather than inventing new approaches.

## Common Pitfalls

### Pitfall 1: State Contamination Between Game Types
**What goes wrong:** Properties from previous game type leak into new game
**Why it happens:** Spreading old state into new state without type checking
**How to avoid:** Create factory functions that return fresh typed state
**Warning signs:** TypeScript not catching property access errors
```typescript
// BAD: May carry over stale properties
const switchGame = (newType: GameType, oldState: GameState) => {
  return { ...oldState, gameType: newType }; // WRONG
};

// GOOD: Fresh state for each type
const createGameState = (type: GameType, questions: QuizQuestion[]): GameState => {
  const base = { questions, currentQuestionIndex: 0, status: 'loading' as const };
  switch (type) {
    case 'quick-quiz':
      return { ...base, gameType: 'quick-quiz', isAnswerRevealed: false };
    case 'millionaire':
      return { ...base, gameType: 'millionaire', selectedOption: null, /* ... */ };
    // ... etc
  }
};
```

### Pitfall 2: BroadcastChannel Message Ordering
**What goes wrong:** Student view shows stale state after rapid updates
**Why it happens:** Messages can arrive out of order or be dropped
**How to avoid:** Include version/timestamp, always send complete state
**Warning signs:** UI flickers, shows previous question briefly

### Pitfall 3: Animation State vs Game State Coupling
**What goes wrong:** Animation state stored in game state, causes re-syncs
**Why it happens:** Tempting to put `isAnimating` in shared state
**How to avoid:** Keep animation state local to component, derive from game state
**Warning signs:** Animations restart on unrelated state changes

### Pitfall 4: Escape Key Conflicts
**What goes wrong:** Escape closes game AND presentation simultaneously
**Why it happens:** Multiple event listeners, no stopPropagation
**How to avoid:** Game modal should capture Escape, show confirmation dialog per CONTEXT.md
**Warning signs:** User accidentally exits presentation when trying to close game

### Pitfall 5: Type Narrowing After Async
**What goes wrong:** TypeScript loses narrowing after await
**Why it happens:** State could have changed during async operation
**How to avoid:** Re-check discriminant after async operations
**Warning signs:** `Property does not exist on type` errors

## Code Examples

### Game Menu Component (Toolbar Dropdown)
```typescript
// Source: Existing ClassBankDropdown pattern + CONTEXT.md decisions
const GameMenu: React.FC<{
  onSelectGame: (type: GameType) => void;
  disabled?: boolean;
}> = ({ onSelectGame, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside (existing pattern from ClassBankDropdown)
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const games: { type: GameType; icon: string; name: string }[] = [
    { type: 'quick-quiz', icon: '🎯', name: 'Quick Quiz' },
    { type: 'millionaire', icon: '💰', name: 'Millionaire' },
    { type: 'the-chase', icon: '🏃', name: 'The Chase' },
    { type: 'beat-the-chaser', icon: '⚡', name: 'Beat the Chaser' },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider
          transition-colors border bg-indigo-600 border-indigo-500 hover:bg-indigo-500
          text-white shadow-lg shadow-indigo-500/30 flex items-center gap-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span>🎮</span> Game Mode
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800
          rounded-xl shadow-xl border border-slate-200 dark:border-slate-700
          overflow-hidden z-[100] animate-fade-in">
          {games.map(game => (
            <button
              key={game.type}
              onClick={() => { onSelectGame(game.type); setIsOpen(false); }}
              className="w-full px-4 py-3 text-left flex items-center gap-3
                hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-xl">{game.icon}</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{game.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

### Updated BroadcastChannel Message Types
```typescript
// types.ts - Extend existing PresentationMessage
export type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'STATE_REQUEST' }
  | { type: 'HEARTBEAT'; timestamp: number }
  | { type: 'HEARTBEAT_ACK'; timestamp: number }
  | { type: 'CLOSE_STUDENT' }
  | { type: 'GAME_STATE_UPDATE'; payload: GameState }  // Updated to use new type
  | { type: 'GAME_CLOSE' }
  | { type: 'STUDENT_SELECT'; payload: { studentName: string } }
  | { type: 'STUDENT_CLEAR' };
```

### Flash Animation for Answer Reveal (CSS)
```css
/* index.html - Add to existing styles */
@keyframes flashReveal {
  0% {
    background-color: inherit;
    transform: scale(1);
  }
  15% {
    background-color: white;
    transform: scale(1.02);
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.8);
  }
  30% {
    background-color: inherit;
    transform: scale(1);
  }
  45% {
    background-color: white;
    transform: scale(1.01);
  }
  60% {
    background-color: #22c55e; /* green-500 */
    transform: scale(1.05);
    box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);
  }
  100% {
    background-color: #22c55e;
    transform: scale(1);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
  }
}

.animate-flash-correct {
  animation: flashReveal 0.8s ease-out forwards;
}

/* Crossfade between game views */
@keyframes crossfadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes crossfadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

.animate-crossfade-in {
  animation: crossfadeIn 0.3s ease-out forwards;
}

.animate-crossfade-out {
  animation: crossfadeOut 0.3s ease-in forwards;
}
```

### Game Switching with Confirmation
```typescript
// Source: CONTEXT.md decision - confirmation dialog required
const handleGameSwitch = (newGameType: GameType, currentState: GameState | null) => {
  // If game is active (not null and not in result state), confirm
  if (currentState && currentState.status !== 'result') {
    const confirmed = window.confirm(
      'A game is in progress. Switch to a different game?'
    );
    if (!confirmed) return;
  }

  // Store slide position for return (per CONTEXT.md)
  const slidePositionBeforeGame = currentIndex;

  // Clear old state completely, create fresh state
  setGameState(createGameState(newGameType, questions));
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Boolean flags for state | Discriminated unions | TypeScript 2.0+ | Type-safe state machines |
| Redux for all state | Local state + context | React 16.8+ hooks | Simpler, less boilerplate |
| Manual message parsing | Typed BroadcastChannel | TypeScript generics | Compile-time message validation |
| Imperative animations | CSS keyframes | Modern browsers | GPU acceleration, smoother |

**Deprecated/outdated:**
- `componentWillReceiveProps` lifecycle: Use `useEffect` with deps array
- Manual type guards with `typeof`: Use discriminant property narrowing

## Open Questions

Things that couldn't be fully resolved:

1. **React 19 ViewTransition for crossfade?**
   - What we know: React 19 has `<ViewTransition>` component for animations
   - What's unclear: Whether it works well with conditional rendering patterns used here
   - Recommendation: Start with CSS animations (proven), consider ViewTransition as enhancement if time permits

2. **Question pre-generation for Millionaire ladder**
   - What we know: Millionaire needs 15 questions with increasing difficulty
   - What's unclear: Should we generate all 15 upfront or on-demand?
   - Recommendation: Defer to phase 21 research; for foundation, keep current pattern

## Sources

### Primary (HIGH confidence)
- TypeScript official documentation - Discriminated unions and narrowing
- Existing codebase patterns - `useBroadcastSync.ts`, `ClassBankDropdown.tsx`, `QuizOverlay` in `PresentationView.tsx`
- CONTEXT.md decisions for phase 20

### Secondary (MEDIUM confidence)
- [Steve Kinney - Discriminated Unions in React](https://stevekinney.com/courses/react-typescript/typescript-discriminated-unions) - Patterns for React state
- [TypeScript ESLint switch-exhaustiveness-check](https://typescript-eslint.io/rules/switch-exhaustiveness-check/) - Enforcement patterns
- [React ViewTransition docs](https://react.dev/reference/react/ViewTransition) - Animation patterns

### Tertiary (LOW confidence)
- WebSearch results on state machine patterns - General patterns, not codebase-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies only
- Architecture: HIGH - Discriminated unions are well-established TypeScript pattern
- Pitfalls: HIGH - Based on direct codebase analysis and TypeScript fundamentals
- Animation patterns: MEDIUM - CSS animations proven, React ViewTransition newer

**Research date:** 2026-01-23
**Valid until:** 60 days (TypeScript patterns are stable)
