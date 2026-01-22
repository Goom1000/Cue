# Technology Stack: TV Show-Style Quiz Games

**Project:** Cue - Adding The Chase, Beat the Chaser, and Who Wants to Be a Millionaire
**Researched:** 2026-01-22
**Scope:** Stack additions/changes for new game formats ONLY

## Executive Summary

**Recommendation: Zero new runtime dependencies required.** The existing stack (React 19, Tailwind CDN, BroadcastChannel) is sufficient for all three game formats. Add one optional dev-time audio library only if sound effects are desired.

The TV show-style quiz games can be implemented using:
- React 19's built-in state management (useState, useReducer)
- Existing BroadcastChannel sync infrastructure
- Tailwind CSS (via CDN) for game boards and animations
- CSS custom animations (already present in index.html)
- Web Audio API (native browser) for optional sound effects

## Validated Existing Capabilities

These capabilities are already implemented and require no additional libraries:

| Capability | Current Implementation | Sufficient For |
|------------|----------------------|----------------|
| **State Management** | React 19 useState/useReducer | Game flow, player positions, lifeline states |
| **View Sync** | BroadcastChannel API | Syncing game boards to student view |
| **Grid Layouts** | Tailwind CSS grid utilities | The Chase board (7-step ladder), Millionaire question tree |
| **Animations** | Custom CSS keyframes + Tailwind | Answer reveals, player movement, lifeline activations |
| **UI Components** | React functional components | All game-specific UI (boards, timers, controls) |
| **AI Integration** | Existing Gemini/Claude providers | Question generation for all game types |

## No New Dependencies Needed

### Why Existing Stack is Sufficient

**1. Game State Management**
- The Chase: 7-step board position = `useState<number>`
- Millionaire: 15 questions progress = `useState<number>`, 3 lifelines = `useState<{fiftyFifty: boolean, askAudience: boolean, phoneAFriend: boolean}>`
- Beat the Chaser: Similar to The Chase with timer state
- **No Zustand/Redux needed:** Game state is localized, not global

**2. Animations**
- Player movement on The Chase board: CSS transitions with Tailwind
- Lifeline activation effects: Existing `animate-fade-in` keyframes
- Answer reveal sequences: Stagger with `animation-delay` utilities
- **No Framer Motion needed:** Simple state-driven CSS animations sufficient

**3. Timers**
- Countdown timers: `useEffect` + `setInterval` pattern (already used in existing quiz)
- **No react-timer-hook needed:** Simple countdown is <20 lines of code

**4. Game Flow**
- Setup → Playing → Result states managed with `useState<'setup' | 'playing' | 'result'>`
- Similar to existing QuizOverlay mode management
- **No XState needed:** Linear game flows don't require state machines

## Optional: Sound Effects (If Desired)

Sound effects are NOT required for MVP but would enhance UX.

### Recommended: use-sound

| Library | Version | Purpose | Bundle Size |
|---------|---------|---------|-------------|
| **use-sound** | ^5.0.0 | Sound effect hooks | ~1kb + 9kb async |

**Installation:**
```bash
npm install use-sound
npm install -D @types/howler  # TypeScript only
```

**Why use-sound:**
- React hook designed for game/UI sound effects
- Built on Howler.js (battle-tested audio library)
- Simple API: `const [play] = useSound('/correct.mp3')`
- Lazy-loads audio library (doesn't block initial render)
- Perfect for: correct/incorrect answer chimes, lifeline activation sounds, The Chase "caught" effect

**When NOT to use:**
- If shipping to schools with strict bandwidth limits (adds 10kb)
- If no sound effects are planned (don't add for future-proofing)

### Alternative: Native Web Audio API

If bundle size is critical, use native browser APIs:

```typescript
// Zero-dependency sound effect (25 lines)
const playSound = (url: string) => {
  const audio = new Audio(url);
  audio.play();
};
```

**Trade-offs:**
- Native: 0kb bundle, but no preloading, sprite support, or volume control
- use-sound: 10kb bundle, full audio features

**Recommendation:** Start with native Audio API, add use-sound only if advanced features needed.

## Existing Infrastructure Integration Points

### 1. BroadcastChannel Sync (No Changes)

Current `GameSyncState` type already supports the pattern:

```typescript
// Existing type from types.ts
export interface GameSyncState {
  mode: 'loading' | 'play' | 'summary';
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  isAnswerRevealed: boolean;
}
```

**For new games, extend with:**
```typescript
// Add to types.ts (no new libraries)
export interface ChaseGameState extends GameSyncState {
  playerPosition: number;    // 0-6 on the board
  chaserPosition: number;    // 0-6 on the board
  isPlayerTurn: boolean;     // Who answers next
}

export interface MillionaireGameState extends GameSyncState {
  lifelines: {
    fiftyFifty: boolean;     // false = used
    askAudience: boolean;
    phoneAFriend: boolean;
  };
  currentWinnings: number;   // 0, 100, 200, ..., 1000000
}
```

**Broadcast unchanged:** Same `postMessage` pattern from PresentationView.tsx

### 2. Tailwind CSS Grid for Game Boards

Tailwind via CDN (already loaded) provides all grid utilities needed:

**The Chase 7-Step Board:**
```tsx
<div className="grid grid-rows-7 gap-2 h-screen">
  {[0,1,2,3,4,5,6].map(step => (
    <div key={step} className={`
      flex items-center justify-between p-4 rounded-lg
      ${playerPosition === step ? 'bg-blue-500' : 'bg-slate-700'}
      ${chaserPosition === step ? 'ring-4 ring-red-500' : ''}
      transition-all duration-500
    `}>
      {/* Step content */}
    </div>
  ))}
</div>
```

**Millionaire Question Ladder:**
```tsx
<div className="space-y-2">
  {questionValues.map((value, idx) => (
    <div key={idx} className={`
      p-3 rounded-lg text-center font-bold
      ${currentQuestionIndex === idx ? 'bg-amber-500 text-black scale-105' : 'bg-slate-800 text-slate-400'}
      transition-all duration-300
    `}>
      ${value.toLocaleString()}
    </div>
  ))}
</div>
```

**No additional CSS framework needed.**

### 3. AI Question Generation (No Changes)

Existing `AIProviderInterface` already has `generateQuestionWithAnswer`:

```typescript
// From geminiService.ts - already implemented
async generateQuestionWithAnswer(
  title: string,
  content: string[],
  difficulty: 'A' | 'B' | 'C' | 'D' | 'E'
): Promise<{ question: string; answer: string }>
```

**For new games:**
- The Chase: Generate A-E questions based on lesson content (existing)
- Millionaire: Generate 15 questions with increasing difficulty (same API, loop 15 times)
- Beat the Chaser: Same as The Chase

**No new AI integration needed.**

### 4. Custom Animations (Already Present)

The index.html already defines:

```css
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
.animate-slide-down { animation: slideDown 0.4s ease-out forwards; }
.animate-fade-out { animation: fadeOut 0.5s ease-in forwards; }
```

**For game-specific animations, add to index.html:**

```css
/* Player movement on Chase board */
.animate-step-move {
  animation: stepMove 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
@keyframes stepMove {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.05); }
  100% { transform: translateY(0) scale(1); }
}

/* Lifeline activation pulse */
.animate-lifeline-active {
  animation: lifelinePulse 0.5s ease-out forwards;
}
@keyframes lifelinePulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 0.3; }
}
```

**Result:** Rich game animations with zero bundle size.

## What NOT to Add

### ❌ Framer Motion (12.27.0)
**Why NOT:**
- Adds ~30kb to bundle for animations achievable in CSS
- The Chase/Millionaire use simple state transitions, not complex gesture interactions
- Tailwind + CSS keyframes handle all required animations
- **Overkill for:** Linear player movement, lifeline toggles, answer reveals

**When to reconsider:** If adding drag-and-drop game elements (not in current spec)

### ❌ Zustand (5.0.10) / XState
**Why NOT:**
- Game state is localized to game component (not global)
- State machines unnecessary for linear game flows (setup → play → summary)
- React 19's `useReducer` handles complex state transitions elegantly
- **Overkill for:** 7-step board positions, 3 boolean lifelines, question progression

**When to reconsider:** If building 10+ interconnected game modes (not in current spec)

### ❌ react-countdown-circle-timer
**Why NOT:**
- Beat the Chaser timer is simple countdown (useEffect + setInterval = 15 lines)
- Visual timer is CSS progress bar driven by state
- **Overkill for:** Basic countdown display

**When to reconsider:** If requiring complex circular progress animations (not in current spec)

### ❌ Tailwind CSS npm package (v4.0)
**Why NOT:**
- CDN approach already works (loaded in index.html line 9)
- No custom Tailwind configuration needed for game boards
- Zero build step required
- **Keep CDN:** Simplicity > marginal performance gains for this use case

**When to reconsider:** If requiring custom Tailwind plugins or JIT-only features (not needed)

## Implementation Approach

### Phase 1: The Chase Game

**State Management:**
```typescript
const [playerPos, setPlayerPos] = useState(0);
const [chaserPos, setChaserPos] = useState(0);
const [gameMode, setGameMode] = useState<'setup' | 'playing' | 'caught' | 'won'>('setup');
```

**UI Components:**
- `ChaseBoard.tsx`: 7-row grid with player/chaser positions
- `ChaseQuestion.tsx`: Reuse existing quiz question component
- `ChaseOverlay.tsx`: Game container (similar to QuizOverlay.tsx)

**No new libraries.**

### Phase 2: Who Wants to Be a Millionaire

**State Management:**
```typescript
const [questionIndex, setQuestionIndex] = useState(0);
const [lifelines, setLifelines] = useState({
  fiftyFifty: true,
  askAudience: true,
  phoneAFriend: true
});
```

**Lifeline Implementation:**
- 50:50: Filter question.options to show only correct + 1 random incorrect
- Ask Audience: Generate percentage distribution (correct answer weighted 60-80%)
- Phone a Friend: Display AI-generated hint

**No new libraries.**

### Phase 3: Beat the Chaser

**Additional State:**
```typescript
const [timeRemaining, setTimeRemaining] = useState(60); // seconds
```

**Timer Implementation:**
```typescript
useEffect(() => {
  if (gameMode === 'playing' && timeRemaining > 0) {
    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }
}, [gameMode, timeRemaining]);
```

**No new libraries.**

## Migration Notes

### From Existing Kahoot-Style Quiz

All three new games follow the same pattern as `QuizOverlay.tsx`:

1. **Setup screen** (teacher-only, not synced)
2. **Loading screen** (AI generating questions)
3. **Play screen** (synced to student view via BroadcastChannel)
4. **Summary screen** (game complete)

**Reusable patterns:**
- Question rendering (StudentGameView.tsx renderShape function)
- BroadcastChannel sync (PresentationView.tsx postMessage logic)
- AI error handling (AIProviderError pattern)

**New patterns:**
- Game-specific boards (The Chase ladder, Millionaire question tree)
- Lifeline mechanics (Millionaire only)
- Dual-player positioning (The Chase player vs chaser)

## Version Specifications

### Production Dependencies

| Package | Current | Required | Notes |
|---------|---------|----------|-------|
| react | 19.2.3 | 19.2.0+ | Already satisfied |
| react-dom | 19.2.3 | 19.2.0+ | Already satisfied |
| @google/genai | 1.37.0 | 1.30.0+ | Already satisfied |
| react-rnd | 10.5.2 | 10.5.2 | Not used in games |

### Optional Dependencies

| Package | Version | Purpose | Install Command |
|---------|---------|---------|----------------|
| use-sound | ^5.0.0 | Sound effects (optional) | `npm install use-sound` |
| @types/howler | latest | TypeScript types (if using use-sound) | `npm install -D @types/howler` |

### No Changes to Dev Dependencies

| Package | Current | Status |
|---------|---------|--------|
| vite | 6.4.1 | Sufficient |
| @vitejs/plugin-react | 5.1.2 | Sufficient |
| typescript | 5.8.3 | Sufficient |
| @types/node | 22.19.7 | Sufficient |

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| React 19 state management | HIGH | [Official React 19 docs](https://react.dev/blog/2024/12/05/react-19), existing QuizOverlay implementation |
| Tailwind CSS grid capabilities | HIGH | [Official Tailwind grid docs](https://tailwindcss.com/docs/grid-template-columns), existing component usage |
| BroadcastChannel sync | HIGH | Verified working in current codebase (PresentationView.tsx) |
| CSS animations sufficiency | HIGH | [Tailwind animation docs](https://tailwindcss.com/docs/animation), existing custom keyframes |
| use-sound optional recommendation | MEDIUM | [npm package](https://www.npmjs.com/package/use-sound) at v5.0.0, [Josh Comeau's blog](https://www.joshwcomeau.com/react/announcing-use-sound-react-hook/) |
| No state machine library needed | HIGH | Game flows are linear (setup → play → end), React useReducer handles complex state |

## Installation Script

**For MVP (no sound):**
```bash
# No installation needed - existing stack sufficient
```

**If adding sound effects:**
```bash
npm install use-sound
npm install -D @types/howler  # TypeScript projects only
```

## Sources

### State Management
- [React 19 features and updates](https://react.dev/blog/2024/12/05/react-19)
- [useState vs useReducer comparison](https://tkdodo.eu/blog/use-state-vs-use-reducer)
- [State management in React without libraries](https://coderpad.io/blog/development/global-state-management-react/)

### Animation Libraries
- [Motion (Framer Motion) official site](https://motion.dev/)
- [Top React animation libraries 2026](https://www.syncfusion.com/blogs/post/top-react-animation-libraries)
- [Tailwind CSS animations documentation](https://tailwindcss.com/docs/animation)

### Audio
- [use-sound React hook](https://www.npmjs.com/package/use-sound)
- [use-sound announcement by Josh Comeau](https://www.joshwcomeau.com/react/announcing-use-sound-react-hook/)

### Tailwind CSS
- [Tailwind CSS v4.0 release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind grid documentation](https://tailwindcss.com/docs/grid-template-columns)
- [Responsive grid layouts with Tailwind](https://refine.dev/blog/tailwind-grid/)

### Game Show Mechanics
- [The Chase game show mechanics](https://en.wikipedia.org/wiki/The_Chase_(British_game_show))
- [Who Wants to Be a Millionaire rules](https://wwbm.com/rules)
- [Millionaire lifelines documentation](https://millionaire.fandom.com/wiki/Lifeline)
