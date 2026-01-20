# Phase 14: Game Sync - Research

**Researched:** 2026-01-20
**Domain:** Real-time game state synchronization via BroadcastChannel
**Confidence:** HIGH

## Summary

This phase extends the existing BroadcastChannel infrastructure to synchronize game activity from teacher view to student view. The codebase already has a working BroadcastChannel sync system for slides (`useBroadcastSync` hook, `PresentationMessage` types, `StudentView` component). The game feature (`QuizOverlay` component) renders as a React Portal in `PresentationView.tsx` but is not currently synced to the student view.

The implementation requires:
1. Extending `PresentationMessage` discriminated union with game-related message types
2. Broadcasting game state changes from `QuizOverlay` (or parent `PresentationView`)
3. Receiving and rendering game display in `StudentView`

**Primary recommendation:** Extend existing `useBroadcastSync` infrastructure with new message types for game state. Do not build a separate sync mechanism.

## Standard Stack

The phase uses existing codebase infrastructure - no new libraries needed.

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component framework | Already used throughout |
| BroadcastChannel API | Native | Cross-window sync | 95.8% browser support, already implemented |
| TypeScript | 5.x | Type safety | Discriminated unions for message handling |

### Supporting (Already in Codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-dom/createPortal | 18.x | Portal rendering | Already used for QuizOverlay |
| Tailwind CSS | 3.x (CDN) | Styling | Already used for UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BroadcastChannel | Firebase Realtime | Overkill - existing sync works, adds dependency |
| BroadcastChannel | localStorage + events | Less reliable, not real-time |
| Manual window.postMessage | BroadcastChannel | BC is already implemented, cleaner API |

**Installation:** None required - uses existing dependencies.

## Architecture Patterns

### Current Slide Sync Architecture (Reference)

The existing sync flow works as follows:

```
Teacher (PresentationView.tsx)              Student (StudentView.tsx)
            |                                         |
            |------ STATE_UPDATE ------------------>  |
            |       {currentIndex, visibleBullets,   |
            |        slides}                          |
            |                                         |
            |<----- STATE_REQUEST ------------------  |
            |       (on mount)                        |
            |                                         |
            |------ HEARTBEAT --------------------->  |
            |<----- HEARTBEAT_ACK -----------------  |
```

### Recommended Game Sync Architecture

Extend the existing pattern to include game state:

```
PresentationView.tsx
    |
    +-- QuizOverlay (existing)
    |       |
    |       +-- mode: 'setup' | 'loading' | 'play' | 'summary'
    |       +-- questions: QuizQuestion[]
    |       +-- qIndex: number
    |       +-- reveal: boolean
    |
    |-- useBroadcastSync<PresentationMessage>
            |
            +-- GAME_START {questions, numQuestions}
            +-- GAME_STATE_UPDATE {mode, qIndex, reveal, currentQuestion}
            +-- GAME_CLOSE
            |
            v
StudentView.tsx
    |
    +-- useBroadcastSync<PresentationMessage>
    |       |
    |       +-- Listen for GAME_* messages
    |
    +-- StudentGameView (new component)
            |
            +-- Renders game content identically to teacher view
            +-- Read-only (no controls)
```

### Data Flow Pattern

```typescript
// Teacher initiates game
QuizOverlay: mode changes to 'play'
    |
    v
PresentationView: detects game active, broadcasts GAME_STATE_UPDATE
    |
    v
BroadcastChannel: delivers message to all listeners
    |
    v
StudentView: receives GAME_STATE_UPDATE
    |
    v
StudentView: renders StudentGameView with game content
```

### Recommended Project Structure
```
components/
  StudentView.tsx            # Extend to handle game state
  StudentGameView.tsx        # NEW: Game display for student view
  PresentationView.tsx       # Extend to broadcast game state
types.ts                     # Extend PresentationMessage union
```

### Pattern 1: Discriminated Union Message Extension

**What:** Add new message types to existing `PresentationMessage` union
**When to use:** Adding new sync functionality to existing channel
**Example:**
```typescript
// Source: types.ts (existing pattern)
export type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'STATE_REQUEST' }
  | { type: 'HEARTBEAT'; timestamp: number }
  | { type: 'HEARTBEAT_ACK'; timestamp: number }
  | { type: 'CLOSE_STUDENT' }
  // NEW game messages
  | { type: 'GAME_START'; payload: GameSyncState }
  | { type: 'GAME_STATE_UPDATE'; payload: GameSyncState }
  | { type: 'GAME_CLOSE' };

export interface GameSyncState {
  mode: 'loading' | 'play' | 'summary';
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  isAnswerRevealed: boolean;
}
```

### Pattern 2: State Lifting for Broadcast Access

**What:** Lift game state to PresentationView to enable broadcasting
**When to use:** When child component (QuizOverlay) state needs to sync
**Example:**
```typescript
// PresentationView.tsx - lift game state for broadcast access
const [gameState, setGameState] = useState<GameSyncState | null>(null);

// Broadcast when game state changes
useEffect(() => {
  if (gameState) {
    postMessage({ type: 'GAME_STATE_UPDATE', payload: gameState });
  } else {
    postMessage({ type: 'GAME_CLOSE' });
  }
}, [gameState, postMessage]);

// Pass setters to QuizOverlay
<QuizOverlay
  onStateChange={setGameState}
  onClose={() => setGameState(null)}
  // ... existing props
/>
```

### Pattern 3: Conditional Rendering in StudentView

**What:** Render game or slide based on received state
**When to use:** Student view needs to switch display modes
**Example:**
```typescript
// StudentView.tsx
const [gameState, setGameState] = useState<GameSyncState | null>(null);

useEffect(() => {
  if (lastMessage?.type === 'GAME_START' || lastMessage?.type === 'GAME_STATE_UPDATE') {
    setGameState(lastMessage.payload);
  }
  if (lastMessage?.type === 'GAME_CLOSE') {
    setGameState(null);
  }
}, [lastMessage]);

// Render
if (gameState) {
  return <StudentGameView gameState={gameState} />;
}
return <SlideContentRenderer slide={currentSlide} visibleBullets={visibleBullets} />;
```

### Anti-Patterns to Avoid

- **Creating a second BroadcastChannel:** The existing channel handles all sync. Adding game-specific channel creates complexity without benefit.
- **Storing full question text in every message:** Send once on GAME_START, then only indices for updates.
- **Syncing setup mode:** Only sync 'loading', 'play', 'summary' - setup is teacher-only.
- **Two-way game sync:** Student view is read-only, no need for student-to-teacher messages.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-window messaging | Custom postMessage | Existing `useBroadcastSync` hook | Already handles lifecycle, cleanup, heartbeat |
| Type-safe messages | Untyped message passing | Existing discriminated union pattern | TypeScript catches missing handlers |
| Connection monitoring | Poll-based checking | Existing heartbeat mechanism | Already implemented, proven reliable |
| Window lifecycle | Manual tracking | Fire-and-forget pattern | BroadcastChannel handles reconnection |

**Key insight:** The existing infrastructure is well-designed. This phase extends it, not replaces it.

## Common Pitfalls

### Pitfall 1: Stale Closure in Broadcast Callback
**What goes wrong:** Game state broadcasts old values due to React closure over stale state
**Why it happens:** useEffect dependencies not including all state values
**How to avoid:** Include all synced state in useEffect dependencies, or use ref for frequently-changing values
**Warning signs:** Student view shows old question after teacher advances

### Pitfall 2: Race Condition on Game Start
**What goes wrong:** Student joins mid-game, misses GAME_START with questions array
**Why it happens:** Questions only sent once; late-joining student has no data
**How to avoid:** Include full state in GAME_STATE_UPDATE, or send full state on STATE_REQUEST
**Warning signs:** Student sees "Loading game..." forever after teacher already playing

### Pitfall 3: Forgetting to Sync on Close
**What goes wrong:** Student stuck showing game after teacher closes it
**Why it happens:** Only syncing during game, not the close event
**How to avoid:** Explicitly broadcast GAME_CLOSE when exiting game
**Warning signs:** Student view stays on game while teacher returns to slide

### Pitfall 4: Layout Mismatch Between Views
**What goes wrong:** Game looks different on student view than teacher view
**Why it happens:** Copying styles instead of extracting shared component
**How to avoid:** Extract game display into reusable component used by both views
**Warning signs:** Visual differences in spacing, colors, or animations

### Pitfall 5: Memory Leak on Rapid Mode Switching
**What goes wrong:** Multiple message listeners accumulate
**Why it happens:** Not cleaning up effects when switching between game/slide
**How to avoid:** Ensure cleanup functions run, use single message handler
**Warning signs:** Console warnings, performance degradation

## Code Examples

Verified patterns based on existing codebase:

### Message Type Extension (types.ts)
```typescript
// Source: Existing types.ts pattern (lines 27-32)
// Extend with game messages

import { QuizQuestion } from './services/geminiService';

export interface GameSyncState {
  mode: 'loading' | 'play' | 'summary';
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  isAnswerRevealed: boolean;
}

export type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'STATE_REQUEST' }
  | { type: 'HEARTBEAT'; timestamp: number }
  | { type: 'HEARTBEAT_ACK'; timestamp: number }
  | { type: 'CLOSE_STUDENT' }
  | { type: 'GAME_STATE_UPDATE'; payload: GameSyncState }
  | { type: 'GAME_CLOSE' };
```

### Broadcasting Game State (PresentationView.tsx)
```typescript
// Source: Existing broadcast pattern (lines 282-287)
// Extend for game state

// State tracking
const [gameState, setGameState] = useState<GameSyncState | null>(null);

// Broadcast game state changes
useEffect(() => {
  if (gameState) {
    postMessage({
      type: 'GAME_STATE_UPDATE',
      payload: gameState
    });
  } else {
    // Game closed - send close message
    postMessage({ type: 'GAME_CLOSE' });
  }
}, [gameState, postMessage]);
```

### Receiving Game State (StudentView.tsx)
```typescript
// Source: Existing message handling pattern (lines 25-44)
// Extend for game messages

const [gameState, setGameState] = useState<GameSyncState | null>(null);

useEffect(() => {
  if (!lastMessage) return;

  // Existing handlers...
  if (lastMessage.type === 'STATE_UPDATE') {
    // ... existing code
  }

  // NEW: Game state handling
  if (lastMessage.type === 'GAME_STATE_UPDATE') {
    setGameState(lastMessage.payload);
  }

  if (lastMessage.type === 'GAME_CLOSE') {
    setGameState(null);
  }
}, [lastMessage, postMessage]);

// Conditional render
if (gameState) {
  return <StudentGameView gameState={gameState} />;
}
// ... existing slide render
```

### StudentGameView Component (New)
```typescript
// Source: Based on QuizOverlay rendering (PresentationView.tsx lines 129-187)
// Read-only version for student display

interface StudentGameViewProps {
  gameState: GameSyncState;
}

const StudentGameView: React.FC<StudentGameViewProps> = ({ gameState }) => {
  const { mode, questions, currentQuestionIndex, isAnswerRevealed } = gameState;
  const currentQuestion = questions[currentQuestionIndex];

  if (mode === 'loading') {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 border-8 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-8" />
          <h2 className="text-white text-3xl font-bold">Loading Game...</h2>
        </div>
      </div>
    );
  }

  if (mode === 'summary') {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="text-8xl mb-6 animate-bounce">trophy emoji</div>
        <h2 className="text-white text-5xl font-bold">Quiz Complete!</h2>
      </div>
    );
  }

  // Play mode - render question and options
  // ... (use identical styling to QuizOverlay play mode)
};
```

### Loading State on Mode Transition
```typescript
// Source: Context requirement - show loading when switching modes

const [isTransitioning, setIsTransitioning] = useState(false);

useEffect(() => {
  if (lastMessage?.type === 'GAME_STATE_UPDATE' && !gameState) {
    // Entering game mode - show brief loading
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 500);
  }
  if (lastMessage?.type === 'GAME_CLOSE' && gameState) {
    // Exiting game mode - show brief loading
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 500);
  }
}, [lastMessage, gameState]);

if (isTransitioning) {
  return <TransitionLoadingScreen message="Switching modes..." />;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage + storage events | BroadcastChannel | Available since 2017, mature | Simpler, real-time, no serialization issues |
| Server-based sync | Client-side BroadcastChannel | N/A (this app is serverless) | Zero latency for same-origin windows |
| Full state on every message | Discriminated messages | Pattern in codebase | Efficient, type-safe |

**Note:** The BroadcastChannel approach is mature and well-supported. No paradigm shifts expected.

## Open Questions

Things that couldn't be fully resolved:

1. **Late-join behavior during quiz**
   - What we know: STATE_REQUEST pattern exists for slides
   - What's unclear: Should game state be included in STATE_UPDATE response, or separate GAME_STATE_UPDATE?
   - Recommendation: Include game state in STATE_UPDATE response if game is active, maintaining single source of truth

2. **Rapid teacher switching (debounce)**
   - What we know: User requirement allows Claude's discretion
   - What's unclear: Exact debounce timing for teacher rapidly toggling game/slides
   - Recommendation: 300ms debounce on game state changes, prevents flicker

3. **Error recovery if game data fails**
   - What we know: Show error message per context doc
   - What's unclear: Should student view show error, or just stay on slide?
   - Recommendation: Student view shows brief error then returns to slide (teacher handles retry)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `types.ts`, `hooks/useBroadcastSync.ts`, `components/StudentView.tsx`, `components/PresentationView.tsx`
- Existing todo: `.planning/todos/pending/2026-01-19-fix-game-activity-not-showing-in-student-view.md`
- Phase context: `.planning/phases/14-game-sync/14-CONTEXT.md`

### Secondary (MEDIUM confidence)
- [MDN BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) - API reference
- [DEV Community: Syncing React State Across Tabs](https://dev.to/franciscomendes10866/syncing-react-state-across-tabs-using-broadcast-channel-api-420k) - Pattern validation
- [12 Days of Web: BroadcastChannel API](https://12daysofweb.dev/2024/broadcastchannel-api) - Best practices

### Tertiary (LOW confidence)
- General web search for BroadcastChannel game sync patterns (2026)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - uses existing codebase infrastructure, no new dependencies
- Architecture: HIGH - clear extension of existing patterns
- Pitfalls: MEDIUM - based on common BroadcastChannel issues and codebase context

**Research date:** 2026-01-20
**Valid until:** N/A - uses stable, existing codebase patterns
