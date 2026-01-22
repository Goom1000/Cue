# Architecture Patterns: Quiz Game Show Integration

**Domain:** Educational quiz game formats for classroom presentation apps
**Researched:** 2026-01-22
**Confidence:** HIGH (Integration patterns, React architecture) | MEDIUM (Game mechanics simplification for classroom)

## Executive Summary

Adding The Chase, Beat the Chaser, and Who Wants to Be a Millionaire quiz games to the existing Cue presentation app requires a modular game architecture that reuses existing sync patterns (BroadcastChannel), AI question generation, and teacher/student view separation. The recommended approach introduces a **Game Selection Menu** that launches individual game components, each following the established QuizOverlay pattern for state management and synchronization.

**Key architectural decision:** Use a **shared game framework** with game-specific UI components rather than duplicating the entire game infrastructure for each format. This maximizes code reuse while allowing each game show format to maintain its unique gameplay mechanics and visual identity.

---

## Current Architecture Analysis

### Existing Quiz System (Kahoot-style)

```
PresentationView.tsx
    |
    +-- QuizOverlay Component (modal)
            |
            +-- Mode State Machine: setup → loading → play → summary
            +-- AI Question Generation (via AIProviderInterface)
            +-- BroadcastChannel Sync (GAME_STATE_UPDATE, GAME_CLOSE)
            +-- Teacher Controls (reveal answer, next question)
            +-- Visual: 4-option grid with shapes (triangle, diamond, circle, square)
            |
            v (synced via BroadcastChannel)
            |
StudentGameView.tsx (read-only display)
    +-- Receives GameSyncState
    +-- Renders identical visual without controls
```

### Existing Integration Points

| Component | Purpose | Game Relevance |
|-----------|---------|----------------|
| **PresentationView.tsx** | Main teacher interface with presentation controls | Launch point for all games |
| **QuizOverlay** | Modal game component with state machine | Pattern to replicate for new games |
| **StudentGameView.tsx** | Read-only game display for projector | Must support multiple game formats |
| **GameSyncState** (types.ts) | Sync structure for game state | Needs extension for new game types |
| **BroadcastChannel** | Real-time teacher→student sync | Reuse for all games |
| **AIProviderInterface** | Question generation abstraction | Extend for difficulty-aware generation |
| **generateImpromptuQuiz()** | Current quiz generator | Template for game-specific generators |

### Existing State Flow

```
Teacher Action (PresentationView)
    ↓
QuizOverlay updates internal state
    ↓
useEffect triggers onGameStateChange callback
    ↓
PresentationView broadcasts via BroadcastChannel
    ↓
StudentView receives broadcast and updates display
```

**Strengths:**
- Clean separation between teacher controls and student display
- AI question generation already integrated with lesson content
- BroadcastChannel provides reliable one-way sync (teacher → student)
- Mode state machine prevents invalid state transitions

**Current Limitations:**
1. Single game format hardcoded (Kahoot-style 4-option grid)
2. No game selection mechanism
3. GameSyncState assumes one question structure
4. No difficulty/grade level integration with AI generation
5. No per-game question format customization

---

## Game Show Format Requirements

### The Chase

**Game Mechanics:**
- **Cash Builder** (Round 1): Rapid-fire questions, 60 seconds, accumulate money per correct answer
- **Head-to-Head Chase** (Round 2): Player vs Chaser, board-based with position tracking, offer selection (high/medium/low risk)
- **Final Chase** (Round 3): Team answers questions, Chaser attempts to catch up with time limit

**Educational Adaptation:**
- Single contestant or whole-class team mode
- Simplify to 2 rounds: Cash Builder + Head-to-Head
- Teacher plays "Chaser" role (controls Chaser answers)
- Visual: Linear board with player/chaser positions, step-by-step movement

**Technical Requirements:**
- Position state tracking (player position, chaser position)
- Timer state (60-second cash builder)
- Risk selection (high/medium/low offer with different start positions)
- Sequential question flow (must answer to advance)

**Sources:**
- [The Chase Game Show Rules - Wordiply](https://wordiplypro.com/the-chase-game-show-rules-and-history/)
- [The Chase (British game show) - Wikipedia](https://en.wikipedia.org/wiki/The_Chase_(British_game_show))

### Beat the Chaser

**Game Mechanics:**
- **Cash Builder** (Round 1): 5 questions maximum, stop on first miss
- **The Choice** (Round 2): Select 2-5 Chasers to face, each with time offer
- **Timed Battle** (Round 3): Clock-based - contestant gets 60s, Chasers get less (e.g., 40s for 3 Chasers)

**Educational Adaptation:**
- Simplify to single "mega Chaser" with difficulty selection (Easy/Medium/Hard)
- Difficulty determines Chaser time advantage (Easy: 50s, Medium: 40s, Hard: 30s)
- Visual: Dual timer display, dramatic countdown

**Technical Requirements:**
- Dual timer state (contestant clock, Chaser clock)
- Active timer toggle (who's currently answering)
- Difficulty selection affects time allocation
- Win condition: Contestant clock survives vs Chaser clock reaches zero

**Sources:**
- [Beat the Chasers - Wikipedia](https://en.wikipedia.org/wiki/Beat_the_Chasers)

### Who Wants to Be a Millionaire

**Game Mechanics:**
- **Money Ladder**: 15 questions with increasing value/difficulty
- **Lifelines**: 50:50, Phone a Friend, Ask the Audience (used once each)
- **Safety Nets**: Walk away option at any point
- **Question Progression**: Linear, no time limit, deliberate decision-making

**Educational Adaptation:**
- Simplify to 10 questions (instead of 15)
- Classroom lifelines:
  - **50:50**: Teacher removes two wrong answers
  - **Phone a Friend**: Ask one classmate
  - **Ask the Audience**: Class vote display
- Visual: Money ladder sidebar, lifeline icons, dramatic question reveal

**Technical Requirements:**
- Lifeline state tracking (used/available)
- Money ladder position state
- Lifeline activation modes (pause question to activate)
- Progressive difficulty integration with AI (questions get harder as player advances)

**Sources:**
- [Who Wants to Be a Millionaire Rules - US version](https://wwbm.com/rules)
- [Lifeline - Who Wants To Be A Millionaire Wiki](https://millionaire.fandom.com/wiki/Lifeline)
- [Who Wants to Be a Millionaire Classroom Game Template](https://up2dateskills.com/blog/up2date-english/who-wants-to-be-a-millionaire-game-template-and-instructions-for-the-classroom/)

---

## Recommended Architecture

### High-Level Component Structure

```
PresentationView.tsx
    |
    +-- GameSelectionModal (NEW)
            |
            +-- Game Cards: "The Chase", "Beat the Chaser", "Millionaire", "Quick Quiz"
            +-- Launches selected game component
            |
            v
    +-- Game Components (NEW - shared base, game-specific UI)
            |
            +-- TheChaseGame.tsx
            |       - Phases: cash-builder → head-to-head
            |       - State: positions, offers, timer
            |       - UI: Board view, position markers
            |
            +-- BeatTheChaserGame.tsx
            |       - Phases: cash-builder → difficulty-select → timed-battle
            |       - State: dual timers, active clock
            |       - UI: Timer displays, difficulty selector
            |
            +-- MillionaireGame.tsx
            |       - Phases: question progression (1-10)
            |       - State: money ladder, lifelines
            |       - UI: Money ladder, lifeline buttons, 4-option display
            |
            +-- QuizOverlay.tsx (RENAME to QuickQuizGame.tsx)
                    - Keep existing Kahoot-style game as "Quick Quiz"
                    - Maintains backward compatibility
            |
            v (all games sync via BroadcastChannel)
            |
StudentGameView.tsx (EXTEND with game format routing)
    |
    +-- Receives: { gameType, mode, gameSpecificState }
    +-- Renders appropriate game display component
            |
            +-- StudentChaseView.tsx (NEW)
            +-- StudentChaserView.tsx (NEW)
            +-- StudentMillionaireView.tsx (NEW)
            +-- StudentQuickQuizView.tsx (existing StudentGameView refactored)
```

### Shared Game Framework

Create **BaseGame.tsx** - abstract component/pattern that all games follow:

```typescript
// Base game lifecycle
interface GameLifecycle {
  setup: () => void;           // Initial configuration screen
  loading: () => void;         // AI generating questions
  play: () => void;            // Active gameplay
  summary: () => void;         // Results/completion screen
}

// Base game props (all games receive these)
interface BaseGameProps {
  slides: Slide[];
  currentIndex: number;
  onClose: () => void;
  provider: AIProviderInterface | null;
  onError: (title: string, message: string) => void;
  onRequestAI: (featureName: string) => void;
  onGameStateChange: (state: GameSyncState | null) => void;
}

// Each game component implements BaseGameProps + game-specific state
```

### Extended Type System

```typescript
// types.ts - EXTEND existing types

// Discriminated union for game types
export type GameType = 'quick-quiz' | 'chase' | 'beat-chaser' | 'millionaire';

// Extended game sync state (replaces current GameSyncState)
export interface BaseGameSyncState {
  gameType: GameType;
  mode: 'loading' | 'play' | 'summary';
  questions: QuizQuestion[];
  currentQuestionIndex: number;
}

// Game-specific state extensions
export interface ChaseGameState extends BaseGameSyncState {
  gameType: 'chase';
  phase: 'cash-builder' | 'head-to-head';
  playerPosition: number;
  chaserPosition: number;
  cashBuilt: number;
  selectedOffer: 'high' | 'medium' | 'low' | null;
  timerSeconds: number;
}

export interface ChaserGameState extends BaseGameSyncState {
  gameType: 'beat-chaser';
  phase: 'cash-builder' | 'difficulty-select' | 'timed-battle';
  contestantTimeRemaining: number;
  chaserTimeRemaining: number;
  activeClock: 'contestant' | 'chaser';
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

export interface MillionaireGameState extends BaseGameSyncState {
  gameType: 'millionaire';
  moneyLadderPosition: number;  // 0-9 (10 questions)
  lifelines: {
    fiftyFifty: 'available' | 'used';
    phoneAFriend: 'available' | 'used';
    askAudience: 'available' | 'used';
  };
  lifelineActive: string | null;  // Which lifeline is currently in use
  eliminatedOptions?: number[];   // For 50:50 display
}

export interface QuickQuizGameState extends BaseGameSyncState {
  gameType: 'quick-quiz';
  isAnswerRevealed: boolean;
}

// Union type for type-safe game state
export type GameSyncState =
  | ChaseGameState
  | ChaserGameState
  | MillionaireGameState
  | QuickQuizGameState;

// Updated message types
export type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'STATE_REQUEST' }
  | { type: 'HEARTBEAT'; timestamp: number }
  | { type: 'HEARTBEAT_ACK'; timestamp: number }
  | { type: 'CLOSE_STUDENT' }
  | { type: 'GAME_STATE_UPDATE'; payload: GameSyncState }  // Now accepts all game types
  | { type: 'GAME_CLOSE' }
  | { type: 'STUDENT_SELECT'; payload: { studentName: string } }
  | { type: 'STUDENT_CLEAR' };
```

### AI Question Generation Extension

```typescript
// services/aiProvider.ts - ADD to interface

export interface AIProviderInterface {
  // ... existing methods ...

  // NEW: Generate questions with difficulty targeting
  generateQuizWithDifficulty(
    slides: Slide[],
    currentIndex: number,
    numQuestions: number,
    difficultyProgression?: DifficultyLevel[]  // Optional difficulty curve
  ): Promise<QuizQuestion[]>;

  // NEW: Generate single question at specific difficulty
  generateSingleQuestion(
    slides: Slide[],
    currentIndex: number,
    difficulty: DifficultyLevel
  ): Promise<QuizQuestion>;
}

// Difficulty levels (align with grade system)
export type DifficultyLevel = 'E' | 'D' | 'C' | 'B' | 'A';

// Difficulty progression presets
export const MILLIONAIRE_DIFFICULTY: DifficultyLevel[] = [
  'E', 'E', 'D', 'D', 'C', 'C', 'B', 'B', 'A', 'A'  // 10 questions, progressive
];

export const CHASE_DIFFICULTY: DifficultyLevel = 'C';  // Medium difficulty for all
```

---

## Data Flow Architecture

### Game Launch Flow

```
1. Teacher clicks "Game" button in PresentationView
   ↓
2. GameSelectionModal opens with 4 game cards
   ↓
3. Teacher selects game type (e.g., "The Chase")
   ↓
4. PresentationView renders <TheChaseGame {...baseProps} />
   ↓
5. TheChaseGame enters 'setup' mode (configure options)
   ↓
6. Teacher clicks "Start" → mode becomes 'loading'
   ↓
7. AI generates questions via provider.generateQuizWithDifficulty()
   ↓
8. Mode becomes 'play', teacher controls game progression
   ↓
9. Game state changes trigger onGameStateChange(state)
   ↓
10. PresentationView broadcasts GAME_STATE_UPDATE to student view
   ↓
11. StudentGameView receives broadcast, routes to StudentChaseView
   ↓
12. Game ends, mode becomes 'summary', teacher closes game
```

### State Synchronization Pattern

```typescript
// Inside any game component (e.g., TheChaseGame.tsx)

const [mode, setMode] = useState<'setup' | 'loading' | 'play' | 'summary'>('setup');
const [playerPosition, setPlayerPosition] = useState(0);
const [chaserPosition, setChaserPosition] = useState(-3);
// ... other game-specific state

// Broadcast state changes to student view
useEffect(() => {
  if (mode === 'loading' || mode === 'play' || mode === 'summary') {
    onGameStateChange({
      gameType: 'chase',
      mode,
      questions,
      currentQuestionIndex,
      phase: currentPhase,
      playerPosition,
      chaserPosition,
      cashBuilt,
      selectedOffer,
      timerSeconds
    });
  }
}, [mode, playerPosition, chaserPosition, /* all sync-relevant state */]);

// Clean up on unmount
useEffect(() => {
  return () => onGameStateChange(null);
}, []);
```

### Student View Routing

```typescript
// StudentGameView.tsx - REFACTOR to handle multiple game types

const StudentGameView: React.FC<{ gameState: GameSyncState }> = ({ gameState }) => {
  // Type-safe routing based on discriminated union
  switch (gameState.gameType) {
    case 'chase':
      return <StudentChaseView state={gameState} />;

    case 'beat-chaser':
      return <StudentChaserView state={gameState} />;

    case 'millionaire':
      return <StudentMillionaireView state={gameState} />;

    case 'quick-quiz':
      return <StudentQuickQuizView state={gameState} />;

    default:
      // TypeScript exhaustiveness check ensures all cases covered
      const _exhaustive: never = gameState;
      return <div>Unknown game type</div>;
  }
};
```

---

## Component Structure Details

### GameSelectionModal.tsx (NEW)

**Purpose:** Present teacher with game format options

**Visual Design:**
- 2x2 grid of game cards
- Each card: Game title, icon, description, "Play" button
- Modal overlay (similar to SettingsModal pattern)

**State:**
- No internal state (stateless presentation)
- Callbacks: `onSelectGame(gameType: GameType)`, `onClose()`

**Integration:**
```typescript
// PresentationView.tsx
const [gameSelectionOpen, setGameSelectionOpen] = useState(false);
const [activeGame, setActiveGame] = useState<GameType | null>(null);

<button onClick={() => setGameSelectionOpen(true)}>🎮 Game</button>

{gameSelectionOpen && (
  <GameSelectionModal
    onSelectGame={(gameType) => {
      setActiveGame(gameType);
      setGameSelectionOpen(false);
    }}
    onClose={() => setGameSelectionOpen(false)}
  />
)}

{activeGame === 'chase' && <TheChaseGame {...baseGameProps} />}
{activeGame === 'beat-chaser' && <BeatTheChaserGame {...baseGameProps} />}
{activeGame === 'millionaire' && <MillionaireGame {...baseGameProps} />}
{activeGame === 'quick-quiz' && <QuickQuizGame {...baseGameProps} />}
```

### TheChaseGame.tsx (NEW)

**Phases:**
1. **Setup**: Configure number of questions, select offer risk level preview
2. **Cash Builder**: 60-second rapid-fire questions, money accumulation display
3. **Head-to-Head**: Board view (7 steps), player vs chaser, question-by-question movement

**State Machine:**
```
setup → loading → play:cash-builder → play:head-to-head → summary
```

**UI Components:**
- Cash Builder: Timer, question counter, money display, rapid question flow
- Head-to-Head: Linear board (7 positions), player icon, chaser icon, offer display
- Controls: Start, Reveal Answer, Player Correct/Wrong, Next Question

**Sync State:**
```typescript
{
  gameType: 'chase',
  mode: 'play',
  phase: 'head-to-head',
  questions: [...],
  currentQuestionIndex: 3,
  playerPosition: 4,      // Steps from start (0-6)
  chaserPosition: 2,      // Steps from start (starts at -3)
  cashBuilt: 4000,
  selectedOffer: 'medium',
  timerSeconds: 45        // Remaining time in cash builder
}
```

### BeatTheChaserGame.tsx (NEW)

**Phases:**
1. **Setup**: Preview difficulty options
2. **Cash Builder**: 5 questions maximum, first miss ends round
3. **Difficulty Select**: Choose Easy/Medium/Hard (affects Chaser time)
4. **Timed Battle**: Alternating questions, dual timer display

**State Machine:**
```
setup → loading → play:cash-builder → play:difficulty-select → play:timed-battle → summary
```

**UI Components:**
- Cash Builder: Question counter (max 5), stop on miss indicator
- Difficulty Select: 3 cards showing time allocations (Easy: 50s, Medium: 40s, Hard: 30s)
- Timed Battle: Dual timer display (contestant: 60s, chaser: selected time), active indicator
- Controls: Contestant Correct/Wrong, Chaser Correct/Wrong, Toggle Active Clock

**Sync State:**
```typescript
{
  gameType: 'beat-chaser',
  mode: 'play',
  phase: 'timed-battle',
  questions: [...],
  currentQuestionIndex: 7,
  contestantTimeRemaining: 23,  // Seconds left
  chaserTimeRemaining: 15,      // Seconds left
  activeClock: 'chaser',
  difficulty: 'medium'
}
```

### MillionaireGame.tsx (NEW)

**Phases:**
1. **Setup**: Preview money ladder (10 questions)
2. **Question Progression**: Linear advancement through ladder (1→10)
3. **Lifeline Activation**: Pause gameplay to use lifeline, resume after

**State Machine:**
```
setup → loading → play:question → play:lifeline-active → play:question → summary
```

**UI Components:**
- Money Ladder: Vertical sidebar (10 levels), current position highlighted
- Question Display: Single question, 4 options (A/B/C/D), dramatic reveal
- Lifeline Panel: 3 buttons (50:50, Phone Friend, Ask Audience), gray out when used
- Lifeline Views:
  - 50:50: Animate removal of 2 wrong answers
  - Phone Friend: Show "calling" overlay, teacher provides classmate input
  - Ask Audience: Bar chart showing class vote percentages
- Controls: Lock Answer, Use Lifeline, Next Question

**Sync State:**
```typescript
{
  gameType: 'millionaire',
  mode: 'play',
  questions: [...],
  currentQuestionIndex: 5,
  moneyLadderPosition: 5,      // 0-9 index
  lifelines: {
    fiftyFifty: 'used',
    phoneAFriend: 'available',
    askAudience: 'available'
  },
  lifelineActive: 'askAudience',  // Currently showing audience vote
  eliminatedOptions: [1, 3]       // For 50:50, which options removed (0-3 indexes)
}
```

### QuickQuizGame.tsx (REFACTOR from QuizOverlay)

**Changes:**
- Rename QuizOverlay → QuickQuizGame
- Update to use new BaseGameProps interface
- Add gameType: 'quick-quiz' to sync state
- Otherwise maintain existing behavior (Kahoot-style 4-option grid)

**Purpose:**
- Provide backward compatibility
- Keep existing "quick review" game format
- Acts as simplest game option for rapid lesson checks

---

## Integration Points & Modifications

### Existing Files to Modify

#### 1. types.ts
**Changes:**
- Add `GameType` type
- Replace `GameSyncState` with discriminated union (see Type System section)
- Update `PresentationMessage` type (already correct, just verify)

**Impact:** HIGH - affects all game components and sync logic

#### 2. PresentationView.tsx
**Changes:**
- Add GameSelectionModal import and state
- Add conditional rendering for all 4 game components
- Rename QuizOverlay to QuickQuizGame
- Update game button to open selection modal

**Lines to modify:** ~20-30 lines (mostly additions)

#### 3. StudentGameView.tsx
**Changes:**
- Refactor to routing component (switch statement on gameType)
- Extract current rendering logic into StudentQuickQuizView
- Add imports for new student view components

**Impact:** MEDIUM - complete refactor but straightforward routing logic

#### 4. services/aiProvider.ts
**Changes:**
- Add `DifficultyLevel` type
- Add `generateQuizWithDifficulty()` method to interface
- Add `generateSingleQuestion()` method to interface
- Add difficulty progression presets (MILLIONAIRE_DIFFICULTY, etc.)

**Impact:** MEDIUM - interface extension, implementations needed

#### 5. services/geminiService.ts (and providers/claudeProvider.ts)
**Changes:**
- Implement new difficulty-aware generation methods
- Extend system prompts to include Bloom's taxonomy difficulty levels
- Add difficulty progression logic

**Impact:** HIGH - core AI generation logic changes

---

## New Files to Create

### Critical Path (MVP)

1. **components/GameSelectionModal.tsx**
   - Game selection UI
   - Simple modal with 4 cards
   - ~100 lines

2. **components/games/QuickQuizGame.tsx**
   - Renamed/refactored from QuizOverlay
   - Add gameType to state
   - ~10 line change from existing

3. **components/games/MillionaireGame.tsx**
   - Simplest new game (no timers, linear progression)
   - ~300-400 lines
   - Single-phase gameplay

4. **components/student-views/StudentQuickQuizView.tsx**
   - Extract from current StudentGameView
   - ~130 lines (existing code)

5. **components/student-views/StudentMillionaireView.tsx**
   - Millionaire student display
   - ~200 lines

### Phase 2 (Chase Games)

6. **components/games/TheChaseGame.tsx**
   - Multi-phase (cash builder + head-to-head)
   - Timer logic
   - Position tracking
   - ~400-500 lines

7. **components/games/BeatTheChaserGame.tsx**
   - Multi-phase with difficulty selection
   - Dual timer logic
   - ~350-450 lines

8. **components/student-views/StudentChaseView.tsx**
   - Chase student display
   - ~250 lines

9. **components/student-views/StudentChaserView.tsx**
   - Beat the Chaser student display
   - ~200 lines

---

## Suggested Build Order

### Phase 1: Foundation & Millionaire (Milestone Start)
**Goal:** Prove game framework works with simplest new game

1. **Update Type System** (types.ts)
   - Add GameType union
   - Add discriminated GameSyncState union
   - Add DifficultyLevel types

2. **Create Game Framework**
   - GameSelectionModal component
   - BaseGameProps pattern established

3. **Refactor Existing Quiz**
   - Rename QuizOverlay → QuickQuizGame
   - Add gameType to state
   - Extract StudentQuickQuizView

4. **Integrate Millionaire**
   - MillionaireGame component (setup + play + summary)
   - StudentMillionaireView component
   - Test sync pattern with lifeline state

5. **Extend AI Generation**
   - Add generateQuizWithDifficulty() to providers
   - Implement MILLIONAIRE_DIFFICULTY progression
   - Test progressive difficulty questions

**Deliverable:** Working game selection menu with 2 games (Quick Quiz + Millionaire)

**Validation:**
- Game selection works
- Millionaire loads and syncs correctly
- Lifelines function properly
- Difficulty progression generates appropriate questions
- Student view displays correctly

### Phase 2: The Chase
**Goal:** Add multi-phase game with timer logic

1. **TheChaseGame Component**
   - Cash builder phase (timer implementation)
   - Head-to-head phase (position tracking)
   - Risk/offer selection

2. **StudentChaseView Component**
   - Cash builder display (timer, money)
   - Board visualization (player/chaser positions)

3. **Timer Hook**
   - Reusable countdown timer logic
   - Pause/resume functionality
   - Completion callbacks

**Deliverable:** 3 games available (Quick Quiz + Millionaire + Chase)

**Validation:**
- Timer works correctly in cash builder
- Position tracking accurate
- Offer selection affects starting positions
- Student view matches teacher game state

### Phase 3: Beat the Chaser
**Goal:** Add dual-timer gameplay and difficulty selection

1. **BeatTheChaserGame Component**
   - Cash builder (5 question max, stop on miss)
   - Difficulty selection screen
   - Dual timer battle phase

2. **StudentChaserView Component**
   - Dual timer display
   - Active clock indicator

3. **Dual Timer Logic**
   - Alternating clock activation
   - Win condition detection

**Deliverable:** All 4 games complete

**Validation:**
- Difficulty selection affects Chaser time
- Dual timers alternate correctly
- Win/loss detection accurate
- All game states sync to student view

### Phase 4: Polish & Enhancement
**Goal:** Improve UX and add advanced features

1. **Visual Enhancements**
   - Game-specific themes (Chase: blue/red, Millionaire: gold/purple)
   - Animations (timer countdowns, lifeline activations)
   - Sound effects (optional)

2. **Question Bank Optimization**
   - Cache questions to reduce AI calls
   - Pre-generate next question during gameplay
   - Fallback questions if AI fails

3. **Student Engagement Features**
   - Optional: Student answer input (not just display)
   - Optional: Scoreboard persistence
   - Optional: Class vs Teacher mode

---

## Architecture Patterns to Follow

### 1. State Machine Pattern (all games)

```typescript
// Each game follows strict mode progression
type GameMode = 'setup' | 'loading' | 'play' | 'summary';

// Valid transitions (enforced)
const validTransitions: Record<GameMode, GameMode[]> = {
  setup: ['loading'],
  loading: ['play', 'setup'],  // setup on error
  play: ['summary'],
  summary: []  // terminal state
};

function setGameMode(newMode: GameMode) {
  if (validTransitions[mode].includes(newMode)) {
    setMode(newMode);
  } else {
    console.error(`Invalid transition: ${mode} → ${newMode}`);
  }
}
```

**Why:** Prevents invalid state transitions, makes debugging easier, ensures sync state is always valid

### 2. Sync State Separation

```typescript
// SEPARATE: Internal game state vs sync state

// Internal state (teacher only)
const [numQuestions, setNumQuestions] = useState(10);  // Setup config
const [setupStep, setSetupStep] = useState(1);         // UI state

// Sync state (broadcast to student)
const [questions, setQuestions] = useState<QuizQuestion[]>([]);
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
const [moneyLadderPosition, setMoneyLadderPosition] = useState(0);

// Only sync state goes in useEffect broadcast
useEffect(() => {
  onGameStateChange({
    // Only include what student view needs
    gameType: 'millionaire',
    mode,
    questions,
    currentQuestionIndex,
    moneyLadderPosition,
    lifelines,
    // DO NOT include: numQuestions, setupStep, etc.
  });
}, [mode, questions, currentQuestionIndex, moneyLadderPosition, lifelines]);
```

**Why:** Reduces bandwidth, prevents student view from receiving irrelevant state, clearer data ownership

### 3. Component Composition Over Duplication

```typescript
// SHARED components used across games

// Shared: Question display (all games use this)
const QuestionDisplay: React.FC<{
  question: string;
  options: string[];
  optionDisplay: 'grid' | 'list' | 'buttons';
  highlightCorrect?: number;
  eliminatedOptions?: number[];
}> = ({ ... }) => { /* ... */ };

// Shared: Timer display
const TimerDisplay: React.FC<{
  seconds: number;
  label: string;
  color: string;
  isActive: boolean;
}> = ({ ... }) => { /* ... */ };

// Shared: Loading screen
const GameLoadingScreen: React.FC<{
  message: string;
}> = ({ message }) => { /* ... */ };

// Game-specific: Millionaire money ladder (unique to this game)
const MoneyLadder: React.FC<{
  currentPosition: number;
  totalSteps: number;
}> = ({ ... }) => { /* ... */ };
```

**Why:** Reduces code duplication, consistent UX across games, easier maintenance

### 4. Error Boundary Pattern

```typescript
// Wrap each game in error boundary to prevent full app crash

// components/games/GameErrorBoundary.tsx
class GameErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="game-error">
          <h2>Game Error</h2>
          <p>Something went wrong. Please close and try again.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage in PresentationView
{activeGame === 'millionaire' && (
  <GameErrorBoundary onError={(err) => setErrorModal({
    title: 'Game Error',
    message: err.message
  })}>
    <MillionaireGame {...baseGameProps} />
  </GameErrorBoundary>
)}
```

**Why:** Game crashes don't break presentation, graceful degradation, better error reporting

### 5. AI Generation Strategy Pattern

```typescript
// Different games may need different question generation strategies

interface QuestionGenerationStrategy {
  generateQuestions(
    slides: Slide[],
    currentIndex: number,
    count: number
  ): Promise<QuizQuestion[]>;
}

// Strategy 1: Progressive difficulty (Millionaire)
class ProgressiveDifficultyStrategy implements QuestionGenerationStrategy {
  async generateQuestions(slides, currentIndex, count) {
    const difficulties = MILLIONAIRE_DIFFICULTY.slice(0, count);
    const questions: QuizQuestion[] = [];
    for (const diff of difficulties) {
      const q = await provider.generateSingleQuestion(slides, currentIndex, diff);
      questions.push(q);
    }
    return questions;
  }
}

// Strategy 2: Uniform difficulty (Chase, Quick Quiz)
class UniformDifficultyStrategy implements QuestionGenerationStrategy {
  constructor(private difficulty: DifficultyLevel) {}

  async generateQuestions(slides, currentIndex, count) {
    return provider.generateQuizWithDifficulty(
      slides,
      currentIndex,
      count,
      Array(count).fill(this.difficulty)
    );
  }
}

// Strategy 3: Random difficulty (Beat the Chaser - based on selected difficulty)
class RandomDifficultyStrategy implements QuestionGenerationStrategy {
  constructor(private difficultyRange: DifficultyLevel[]) {}

  async generateQuestions(slides, currentIndex, count) {
    const difficulties = Array(count).fill(null).map(() =>
      this.difficultyRange[Math.floor(Math.random() * this.difficultyRange.length)]
    );
    return provider.generateQuizWithDifficulty(slides, currentIndex, count, difficulties);
  }
}
```

**Why:** Flexible question generation, easy to test different difficulty approaches, reusable across games

---

## Anti-Patterns to Avoid

### 1. Prop Drilling Through Game State

**Wrong:**
```typescript
// DON'T pass entire game state through multiple levels
<TheChaseGame>
  <CashBuilderPhase gameState={gameState}>
    <QuestionDisplay gameState={gameState}>
      <Option gameState={gameState} />
    </QuestionDisplay>
  </CashBuilderPhase>
</TheChaseGame>
```

**Right:**
```typescript
// DO use React Context for deep game state
const ChaseGameContext = createContext<ChaseGameState | null>(null);

<ChaseGameContext.Provider value={gameState}>
  <CashBuilderPhase>
    <QuestionDisplay />  {/* Uses useContext internally */}
  </CashBuilderPhase>
</ChaseGameContext.Provider>
```

### 2. Tight Coupling to Specific AI Provider

**Wrong:**
```typescript
// DON'T directly call Gemini service
import { generateImpromptuQuiz } from '../services/geminiService';

const questions = await generateImpromptuQuiz(apiKey, slides, index, count);
```

**Right:**
```typescript
// DO use abstracted provider interface
const questions = await provider.generateQuizWithDifficulty(
  slides,
  index,
  count,
  difficulties
);
```

**Why:** Provider abstraction already exists (Gemini/Claude), maintain consistency

### 3. Duplicating Student View Logic

**Wrong:**
```typescript
// DON'T copy-paste display logic between teacher and student views
// TheChaseGame.tsx - Teacher version
<div className="board">
  {positions.map((pos, i) => (
    <div className={`step ${playerPosition === i ? 'player' : ''}`} />
  ))}
</div>

// StudentChaseView.tsx - Student version (DUPLICATE CODE)
<div className="board">
  {positions.map((pos, i) => (
    <div className={`step ${playerPosition === i ? 'player' : ''}`} />
  ))}
</div>
```

**Right:**
```typescript
// DO extract shared display component
// components/shared/ChaseBoard.tsx
export const ChaseBoard: React.FC<{
  playerPosition: number;
  chaserPosition: number;
  totalSteps: number;
}> = ({ ... }) => { /* ... */ };

// Use in both teacher and student views
<ChaseBoard
  playerPosition={gameState.playerPosition}
  chaserPosition={gameState.chaserPosition}
  totalSteps={7}
/>
```

### 4. Ignoring Mode State Machine

**Wrong:**
```typescript
// DON'T allow direct jumps to any state
<button onClick={() => setMode('summary')}>Skip to End</button>
```

**Right:**
```typescript
// DO enforce valid transitions
function handleEndGame() {
  if (mode === 'play') {
    setMode('summary');  // Valid: play → summary
  } else {
    console.error('Cannot end game from current mode');
  }
}
```

### 5. Blocking UI During AI Generation

**Wrong:**
```typescript
// DON'T freeze UI while waiting for questions
const handleStart = async () => {
  const questions = await provider.generateQuestions(...);  // UI frozen
  setQuestions(questions);
  setMode('play');
};
```

**Right:**
```typescript
// DO show loading state immediately
const handleStart = async () => {
  setMode('loading');  // Student view sees "Generating questions..."
  try {
    const questions = await provider.generateQuestions(...);
    setQuestions(questions);
    setMode('play');
  } catch (error) {
    onError('Generation Failed', error.message);
    setMode('setup');  // Return to setup on error
  }
};
```

---

## Scalability Considerations

### At Launch (4 games)

**Concerns:**
- Code organization (multiple game files)
- Sync state type safety (discriminated unions)
- AI generation load (4 different question patterns)

**Solutions:**
- Organize games in `/components/games/` folder
- Use discriminated unions for exhaustive type checking
- Share AI generation logic where possible (uniform difficulty games)

### At 10 Games

**Concerns:**
- GameSelectionModal becomes crowded
- Sync state union becomes unwieldy
- Duplicated UI components (timers, question displays)

**Solutions:**
- Add category filtering to game selection ("Quick Games", "Challenge Games")
- Consider breaking GameSyncState into separate module
- Extract shared components to `/components/game-ui/` folder
- Add game search/filter functionality

### At Scale (20+ games, team collaborators)

**Concerns:**
- Merge conflicts on types.ts
- Testing individual games in isolation
- Performance (bundle size, sync overhead)

**Solutions:**
- Split game types into separate files (`types/games/millionaire.ts`, etc.)
- Create game development kit (GDK) with mocks for provider/sync
- Lazy load game components (React.lazy + Suspense)
- Implement game manifest system for dynamic registration

```typescript
// Future: Dynamic game registration
interface GameManifest {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  component: React.LazyExoticComponent<React.ComponentType<BaseGameProps>>;
  studentComponent: React.LazyExoticComponent<React.ComponentType<any>>;
}

const gameRegistry: GameManifest[] = [
  {
    id: 'millionaire',
    name: 'Who Wants to Be a Millionaire',
    description: 'Answer 10 questions with lifelines',
    icon: '💰',
    component: React.lazy(() => import('./games/MillionaireGame')),
    studentComponent: React.lazy(() => import('./student-views/StudentMillionaireView'))
  },
  // ... other games
];
```

---

## Testing Strategy

### Unit Tests (per game)

```typescript
// Example: MillionaireGame.test.tsx

describe('MillionaireGame', () => {
  it('starts in setup mode', () => {
    const { getByText } = render(<MillionaireGame {...mockProps} />);
    expect(getByText('Money Ladder')).toBeInTheDocument();
  });

  it('transitions to loading on start', async () => {
    const { getByText, findByText } = render(<MillionaireGame {...mockProps} />);
    fireEvent.click(getByText('Start Game'));
    expect(await findByText('Generating Questions...')).toBeInTheDocument();
  });

  it('disables lifeline after use', () => {
    const { getByText } = render(<MillionaireGame {...mockPropsInPlay} />);
    const fiftyFiftyButton = getByText('50:50');
    fireEvent.click(fiftyFiftyButton);
    expect(fiftyFiftyButton).toBeDisabled();
  });
});
```

### Integration Tests (sync flow)

```typescript
// Example: game-sync.test.tsx

describe('Game Sync Flow', () => {
  it('broadcasts game state changes to student view', async () => {
    const onGameStateChange = jest.fn();
    const { getByText } = render(
      <MillionaireGame
        {...mockProps}
        onGameStateChange={onGameStateChange}
      />
    );

    // Start game
    fireEvent.click(getByText('Start Game'));

    // Wait for loading state broadcast
    await waitFor(() => {
      expect(onGameStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'millionaire',
          mode: 'loading'
        })
      );
    });
  });
});
```

### E2E Tests (full game flow)

```typescript
// Example: millionaire-flow.e2e.test.tsx

describe('Millionaire Full Game Flow', () => {
  it('completes full game from setup to summary', async () => {
    // Mock AI provider
    const mockProvider = createMockProvider([
      { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0, explanation: 'E1' },
      // ... 10 questions
    ]);

    const { getByText, findByText } = render(
      <PresentationView
        slides={mockSlides}
        provider={mockProvider}
      />
    );

    // Open game selection
    fireEvent.click(getByText('🎮 Game'));
    fireEvent.click(getByText('Millionaire'));

    // Configure and start
    fireEvent.click(getByText('Start Game'));
    expect(await findByText('Q1')).toBeInTheDocument();

    // Answer all 10 questions
    for (let i = 0; i < 10; i++) {
      fireEvent.click(getByText('Lock Answer A'));
      fireEvent.click(getByText('Next Question'));
    }

    // Verify summary
    expect(await findByText('You Won!')).toBeInTheDocument();
  });
});
```

---

## Sources

**Game Show Mechanics:**
- [The Chase Game Show Rules - Wordiply](https://wordiplypro.com/the-chase-game-show-rules-and-history/)
- [The Chase (British game show) - Wikipedia](https://en.wikipedia.org/wiki/The_Chase_(British_game_show))
- [Beat the Chasers - Wikipedia](https://en.wikipedia.org/wiki/Beat_the_Chasers)
- [Who Wants to Be a Millionaire Rules - US version](https://wwbm.com/rules)
- [Lifeline - Who Wants To Be A Millionaire Wiki](https://millionaire.fandom.com/wiki/Lifeline)

**Educational Adaptations:**
- [Who Wants to Be a Millionaire Classroom Game Template](https://up2dateskills.com/blog/up2date-english/who-wants-to-be-a-millionaire-game-template-and-instructions-for-the-classroom/)
- [The Chase Classroom Quiz Resources - Just Family Fun](https://justfamilyfun.com/the-chase-questions-and-answers/)
- [Best Quiz and Game Show Apps for Classrooms - Common Sense Education](https://www.commonsense.org/education/best-in-class/the-best-quiz-and-game-show-apps-for-classrooms)

**React Architecture:**
- [State Management in 2026: Redux, Context API, and Modern Patterns - Nucamp](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [Game Show Classroom: Comparing Quiz Platforms - Ditch That Textbook](https://ditchthattextbook.com/game-show-classroom-comparing-the-big-5/)
