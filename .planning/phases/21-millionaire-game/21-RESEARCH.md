# Phase 21: Millionaire Game - Research

**Researched:** 2026-01-23
**Domain:** Game UI components, CSS animations, audio management, AI hint generation
**Confidence:** HIGH

## Summary

This phase implements the "Who Wants to Be a Millionaire" game format within the established game foundation from Phase 20. The existing architecture provides discriminated unions for game state, BroadcastChannel sync, and component routing patterns. The main challenges are:

1. **Money Tree UI** - Classic vertical prize display with configurable question counts (3, 5, 10)
2. **Lifeline System** - Three distinct lifeline behaviors (50:50, Ask the Audience, Phone-a-Friend)
3. **Dramatic Pacing** - Sequential answer reveals, safe haven celebrations, wrong answer drama
4. **Optional Audio** - Sound effects that are OFF by default, using native Web Audio API

The codebase already has the MillionaireState type defined with lifelines, prizeLadder, and currentPrize properties. The main work is replacing the placeholder MillionaireGame component with the full implementation and updating PresentationView with the launchMillionaire function.

**Primary recommendation:** Build the game in layers - (1) Money Tree + question display, (2) Answer selection and progression, (3) Lifeline system, (4) Audio and visual polish. Use existing CSS animation patterns (flashReveal, crossfade) and extend with Millionaire-specific effects.

## Standard Stack

Per Phase 20 and v3.0 decisions: **zero new runtime dependencies**.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | UI rendering | Already in project |
| TypeScript | 5.8.2 | Type system | Already in project |
| Tailwind CSS | CDN | Styling | Already configured |
| Web Audio API | Native | Sound effects | Browser native, no dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Custom CSS | N/A | Animations | Millionaire-specific effects (glow, pulse, confetti) |
| HTMLAudioElement | Native | Simple audio | Fallback for Web Audio API edge cases |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Web Audio API | Howler.js | Adds ~10kb dependency; project constraint is zero new deps |
| CSS confetti | canvas-confetti | JavaScript dependency; CSS-only is sufficient for simple effects |
| Custom slider | Question count dropdown | Dropdown simpler for 3 options; slider overkill |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
components/
  games/
    MillionaireGame.tsx           # Main game component (teacher view)
    millionaire/
      MoneyTree.tsx               # Vertical prize ladder display
      MillionaireQuestion.tsx     # Question + answer hexagons
      LifelinePanel.tsx           # Row of lifeline buttons
      FiftyFiftyOverlay.tsx       # 50:50 result display
      AudiencePollOverlay.tsx     # Bar chart of audience votes
      PhoneAFriendOverlay.tsx     # AI hint display
      SafeHavenCelebration.tsx    # Safe haven reached animation
      WrongAnswerReveal.tsx       # Drama on wrong answer
      VictoryCelebration.tsx      # All questions answered correctly
    shared/
      GameSplash.tsx              # Already exists
      ResultScreen.tsx            # Already exists, may need customization
  StudentGameView.tsx             # Add MillionaireStudentView
hooks/
  useSound.ts                     # Custom hook for audio (no dependencies)
  useMillionaireGame.ts           # Optional: encapsulate Millionaire logic
types.ts                          # MillionaireState already defined
services/
  geminiService.ts                # Already has quiz generation, add Phone-a-Friend hint
```

### Pattern 1: Money Tree Configuration by Question Count
**What:** Scale prize amounts and safe havens based on selected question count
**When to use:** Game launch and display
**Example:**
```typescript
// Source: TV show format adapted for classroom use
interface MoneyTreeConfig {
  questionCount: 3 | 5 | 10;
  prizes: number[];
  safeHavens: number[]; // Question indices (0-based)
}

const MONEY_TREE_CONFIGS: Record<3 | 5 | 10, MoneyTreeConfig> = {
  3: {
    questionCount: 3,
    prizes: [500, 2000, 10000],
    safeHavens: [2], // Question 3 is safe haven (index 2)
  },
  5: {
    questionCount: 5,
    prizes: [200, 500, 1000, 5000, 25000],
    safeHavens: [2, 4], // Questions 3 and 5 are safe havens
  },
  10: {
    questionCount: 10,
    prizes: [100, 200, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000],
    safeHavens: [4, 9], // Questions 5 and 10 are safe havens
  },
};

// Get current safe haven amount (fall back to this on wrong answer)
const getSafeHavenAmount = (
  currentQuestionIndex: number,
  config: MoneyTreeConfig
): number => {
  // Find the highest safe haven index that's less than current question
  const passedSafeHavens = config.safeHavens.filter(sh => sh < currentQuestionIndex);
  if (passedSafeHavens.length === 0) return 0;
  const lastSafeHaven = Math.max(...passedSafeHavens);
  return config.prizes[lastSafeHaven];
};
```

### Pattern 2: Lifeline State Management
**What:** Track lifeline usage and apply effects
**When to use:** Managing 50:50, Ask the Audience, Phone-a-Friend
**Example:**
```typescript
// Source: CONTEXT.md decisions
interface LifelineResult {
  type: '50:50' | 'audience' | 'phone';
  data: FiftyFiftyResult | AudienceResult | PhoneResult;
}

interface FiftyFiftyResult {
  eliminatedIndices: [number, number]; // Two wrong answers to hide
}

interface AudienceResult {
  percentages: [number, number, number, number]; // A, B, C, D
}

interface PhoneResult {
  confidence: 'high' | 'medium' | 'low';
  response: string; // AI-generated hint text
}

// 50:50: Randomly eliminate 2 of 3 wrong answers
const apply5050 = (correctIndex: number): FiftyFiftyResult => {
  const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIndex);
  // Shuffle and take 2
  const shuffled = wrongIndices.sort(() => Math.random() - 0.5);
  return { eliminatedIndices: [shuffled[0], shuffled[1]] as [number, number] };
};

// Ask the Audience: Difficulty-based distribution
const applyAskTheAudience = (
  correctIndex: number,
  difficulty: 'easy' | 'medium' | 'hard'
): AudienceResult => {
  // Easy: strong signal (60-80% on correct)
  // Medium: moderate signal (40-55% on correct)
  // Hard: scattered (25-35% on correct)
  const correctRange = difficulty === 'easy' ? [60, 80]
    : difficulty === 'medium' ? [40, 55]
    : [25, 35];

  const correctPercent = Math.floor(
    Math.random() * (correctRange[1] - correctRange[0]) + correctRange[0]
  );
  const remaining = 100 - correctPercent;

  // Distribute remaining among wrong answers
  const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIndex);
  const wrongSplit = distributeRemaining(remaining, 3);

  const percentages: [number, number, number, number] = [0, 0, 0, 0];
  percentages[correctIndex] = correctPercent;
  wrongIndices.forEach((idx, i) => {
    percentages[idx] = wrongSplit[i];
  });

  return { percentages };
};

function distributeRemaining(total: number, count: number): number[] {
  const result: number[] = [];
  let remaining = total;
  for (let i = 0; i < count - 1; i++) {
    const portion = Math.floor(Math.random() * remaining * 0.6);
    result.push(portion);
    remaining -= portion;
  }
  result.push(remaining);
  return result;
}
```

### Pattern 3: Sequential Answer Reveal Animation
**What:** Dramatic A -> B -> C -> D reveal with timing
**When to use:** After teacher locks in answer, before showing correct
**Example:**
```typescript
// Source: CONTEXT.md decisions - sequential reveal with dramatic timing
interface RevealState {
  revealedCount: number; // 0-4 (A, B, C, D)
  isRevealing: boolean;
  finalAnswer: number | null;
}

// CSS classes for each reveal stage
const getRevealClass = (optionIndex: number, revealedCount: number, isCorrect: boolean, isFinalAnswer: boolean) => {
  if (optionIndex >= revealedCount) return 'opacity-60'; // Not yet revealed
  if (isFinalAnswer && !isCorrect) return 'animate-wrong-answer bg-red-600'; // Player's wrong choice
  if (isCorrect && revealedCount === 4) return 'animate-flash-correct'; // Correct answer revealed
  return 'opacity-100'; // Revealed but not answer
};

// Reveal sequence: 300ms between each, then 800ms pause before correct
const REVEAL_TIMING = {
  betweenOptions: 300,
  beforeCorrect: 800,
  wrongAnswerFlash: 1500,
};
```

### Pattern 4: Custom useSound Hook (Zero Dependencies)
**What:** Lightweight audio hook using Web Audio API
**When to use:** Playing sound effects for game events
**Example:**
```typescript
// Source: Frontend.fyi pattern adapted - no external dependencies
// Reference: https://www.frontend.fyi/recipes/react/playing-a-sound

import { useCallback, useRef, useState } from 'react';

interface UseSoundOptions {
  volume?: number; // 0-1
  enabled?: boolean;
}

export function useSound(src: string, options: UseSoundOptions = {}) {
  const { volume = 1, enabled = true } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(() => {
    if (!enabled) return;

    // Create or reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
    }

    const audio = audioRef.current;
    audio.volume = volume;
    audio.currentTime = 0;

    audio.play()
      .then(() => setIsPlaying(true))
      .catch(err => console.warn('Audio play failed:', err));

    audio.onended = () => setIsPlaying(false);
  }, [src, volume, enabled]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return { play, stop, isPlaying };
}

// Usage in component:
// const { play: playCorrect } = useSound('/sounds/correct.mp3', { enabled: soundEnabled });
```

### Pattern 5: Phone-a-Friend AI Hint Generation
**What:** Generate varied responses from AI that feel like a phone call
**When to use:** Phone-a-Friend lifeline activation
**Example:**
```typescript
// Source: CONTEXT.md - unpredictable responses, varied confidence
// Add to geminiService.ts

export interface PhoneAFriendResponse {
  confidence: 'high' | 'medium' | 'low';
  response: string;
}

export const generatePhoneAFriendHint = async (
  apiKey: string,
  question: string,
  options: string[],
  correctIndex: number
): Promise<PhoneAFriendResponse> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const systemInstruction = `
    You are a helpful friend receiving a phone call on "Who Wants to Be a Millionaire."
    You have 30 seconds to help.

    IMPORTANT: Vary your response style randomly. Pick ONE of these approaches:
    1. CONFIDENT: "I'm pretty sure it's [X] because..."
    2. REASONING: "Well, I know that [fact], so it might be..."
    3. ELIMINATION: "I don't think it's [X] or [Y], so maybe..."
    4. UNCERTAIN: "Hmm, this is tricky. My best guess would be..."

    RULES:
    - Keep response under 50 words (it's a timed call!)
    - Sound natural, like a real phone conversation
    - Never say "I am an AI" or break character
    - Sometimes be wrong (maybe 15% of the time for realism)
    - Match response style to confidence level randomly
  `;

  const prompt = `
    Question: ${question}
    Options:
    A) ${options[0]}
    B) ${options[1]}
    C) ${options[2]}
    D) ${options[3]}

    Provide your phone-a-friend response.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
            response: { type: Type.STRING, description: "Natural phone conversation response, under 50 words" }
          },
          required: ['confidence', 'response']
        }
      }
    });

    return JSON.parse(response.text || '{"confidence":"low","response":"Sorry, I\'m not sure on this one."}');
  } catch (e) {
    return { confidence: 'low', response: "The connection cut out! I couldn't hear the question properly." };
  }
};
```

### Anti-Patterns to Avoid
- **Hardcoding 15 questions:** User decided 3/5/10 options, not classic 15
- **Adding Howler.js:** Zero new dependencies constraint
- **Complex state machines:** Keep state in MillionaireState type, use simple status values
- **Lifeline restrictions:** Per CONTEXT.md, all lifelines available at any time before answering
- **Walk away option:** Not included per CONTEXT.md decision

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Answer selection UI | Custom radio buttons | Styled div with click handlers | Consistent with Quick Quiz pattern |
| Confetti effect | canvas-confetti library | CSS keyframes animation | Zero dependencies, simpler |
| Sound management | Full audio engine | Custom useSound hook | HTMLAudioElement is sufficient |
| Poll chart | D3.js or Chart.js | CSS flex bars with percentages | Simple horizontal bars work |
| Timer display | setTimeout chains | CSS animation-duration | GPU accelerated, cleaner |

**Key insight:** The existing Quick Quiz provides patterns for answer display, reveal animations, and student sync. Extend these patterns rather than creating new paradigms.

## Common Pitfalls

### Pitfall 1: Lifeline State Not Syncing to Student View
**What goes wrong:** Teacher activates 50:50, student view doesn't update
**Why it happens:** Forgetting to include lifeline results in the BroadcastChannel payload
**How to avoid:** Add lifeline result fields to MillionaireState and sync atomically
**Warning signs:** Teacher sees 2 answers eliminated, student still sees 4

### Pitfall 2: Prize Ladder Misalignment with Question Count
**What goes wrong:** 10-question game shows 15-level money tree
**Why it happens:** Using hardcoded classic format instead of configurable
**How to avoid:** Use MONEY_TREE_CONFIGS pattern, derive from questionCount
**Warning signs:** Money tree doesn't match number of questions

### Pitfall 3: Sound Plays Before User Interaction
**What goes wrong:** Browser blocks audio, console shows autoplay error
**Why it happens:** Web Audio autoplay policy requires user gesture first
**How to avoid:** Sound is OFF by default; first user interaction enables audio context
**Warning signs:** "DOMException: play() failed because the user didn't interact"

### Pitfall 4: Animation State Stored in GameState
**What goes wrong:** Reveal animations restart on unrelated state changes
**Why it happens:** Putting `isRevealing` or `revealedCount` in synced state
**How to avoid:** Keep animation state local to component, derive from game status
**Warning signs:** Animations restart mid-sequence

### Pitfall 5: Safe Haven Logic Off-by-One
**What goes wrong:** Wrong answer on question 5 returns $0 instead of safe haven
**Why it happens:** Comparing currentQuestionIndex incorrectly (0-based vs 1-based)
**How to avoid:** Use explicit getSafeHavenAmount function, test edge cases
**Warning signs:** Player loses all money when they should keep safe haven

### Pitfall 6: Phone-a-Friend AI Always Correct
**What goes wrong:** Students learn it always gives right answer, removes tension
**Why it happens:** AI naturally tends toward accuracy
**How to avoid:** Prompt explicitly allows ~15% incorrect responses, varied confidence
**Warning signs:** Students always trust the phone without thinking

## Code Examples

### Money Tree Component
```typescript
// Source: Classic Millionaire UI adapted for configurable question counts
interface MoneyTreeProps {
  config: MoneyTreeConfig;
  currentQuestionIndex: number;
  answeredCorrectly: boolean[];
}

const MoneyTree: React.FC<MoneyTreeProps> = ({ config, currentQuestionIndex, answeredCorrectly }) => {
  return (
    <div className="flex flex-col-reverse gap-1 bg-blue-950/80 p-3 rounded-xl border border-blue-400/30">
      {config.prizes.map((prize, idx) => {
        const isCurrent = idx === currentQuestionIndex;
        const isAnswered = idx < currentQuestionIndex;
        const isSafeHaven = config.safeHavens.includes(idx);

        return (
          <div
            key={idx}
            className={`
              flex items-center justify-between px-3 py-1.5 rounded-lg text-sm font-bold
              transition-all duration-300
              ${isCurrent ? 'bg-amber-500 text-amber-950 scale-105 shadow-lg shadow-amber-500/50' : ''}
              ${isAnswered ? 'text-green-400' : 'text-white/70'}
              ${isSafeHaven && !isAnswered ? 'text-amber-400 border border-amber-500/50' : ''}
            `}
          >
            <span className="w-6 text-center">{idx + 1}</span>
            <span className={isSafeHaven ? 'font-black' : ''}>
              ${prize.toLocaleString()}
            </span>
            {isAnswered && (
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### CSS Animations for Millionaire Theme
```css
/* Add to index.html */

/* Millionaire classic blue/purple glow */
@keyframes millionaireGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.8); }
}

.animate-millionaire-glow {
  animation: millionaireGlow 2s ease-in-out infinite;
}

/* Wrong answer dramatic flash */
@keyframes wrongAnswerFlash {
  0% { background-color: inherit; transform: scale(1); }
  20% { background-color: #dc2626; transform: scale(1.05); }
  40% { background-color: inherit; transform: scale(1); }
  60% { background-color: #dc2626; transform: scale(1.03); }
  100% { background-color: #dc2626; transform: scale(1); opacity: 0.6; }
}

.animate-wrong-answer {
  animation: wrongAnswerFlash 1.5s ease-out forwards;
}

/* Safe haven celebration */
@keyframes safeHavenCelebration {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 60px rgba(245, 158, 11, 0.9); }
  100% { transform: scale(1); opacity: 1; box-shadow: 0 0 30px rgba(245, 158, 11, 0.5); }
}

.animate-safe-haven {
  animation: safeHavenCelebration 2s ease-out forwards;
}

/* Simple CSS confetti */
@keyframes confettiFall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

.confetti-piece {
  position: fixed;
  width: 10px;
  height: 10px;
  top: 0;
  animation: confettiFall 3s ease-out forwards;
  pointer-events: none;
}

/* Sequential answer reveal pulse */
@keyframes answerRevealPulse {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.02); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-answer-reveal {
  animation: answerRevealPulse 0.3s ease-out forwards;
}
```

### MillionaireState Factory
```typescript
// Add to PresentationView.tsx alongside createQuickQuizState

const createMillionaireState = useCallback((
  questions: QuizQuestion[],
  questionCount: 3 | 5 | 10
): MillionaireState => {
  const config = MONEY_TREE_CONFIGS[questionCount];
  return {
    gameType: 'millionaire',
    status: 'playing',
    questions,
    currentQuestionIndex: 0,
    selectedOption: null,
    lifelines: {
      fiftyFifty: true,
      phoneAFriend: true,
      askTheAudience: true,
    },
    prizeLadder: config.prizes,
    currentPrize: 0,
    // Extended state for Millionaire-specific features
    eliminatedOptions: [], // From 50:50
    audiencePoll: null,    // From Ask the Audience
    phoneHint: null,       // From Phone-a-Friend
    safeHavenAmount: 0,    // Current guaranteed minimum
  };
}, []);
```

### Audience Poll Bar Chart (CSS-only)
```typescript
// Source: Simple CSS flex bars, no charting library needed
interface AudiencePollProps {
  percentages: [number, number, number, number];
}

const AudiencePoll: React.FC<AudiencePollProps> = ({ percentages }) => {
  const labels = ['A', 'B', 'C', 'D'];
  const maxPercent = Math.max(...percentages);

  return (
    <div className="bg-blue-950 p-6 rounded-xl border border-blue-400/30">
      <h3 className="text-white text-xl font-bold mb-4 text-center">Audience Poll</h3>
      <div className="flex justify-around items-end h-48 gap-4">
        {percentages.map((percent, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 flex-1">
            <span className="text-white font-bold">{percent}%</span>
            <div
              className={`w-full rounded-t-lg transition-all duration-1000 ${
                percent === maxPercent ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ height: `${(percent / 100) * 100}%` }}
            />
            <span className="text-white font-bold text-lg">{labels[idx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flash player games | HTML5/CSS/JS games | 2017+ | No plugins needed |
| Howler.js for all audio | Native Web Audio API | 2023+ | Zero dependencies for simple effects |
| canvas-confetti | CSS keyframe confetti | 2024+ | Lighter, no JS library |
| Complex state machines | Discriminated unions | TypeScript 2.0+ | Type-safe without libraries |

**Deprecated/outdated:**
- Flash-based Millionaire games (Flash EOL 2020)
- Sound sprites (single file) - better to use individual files with modern HTTP/2
- jQuery for animations - CSS animations are standard

## Open Questions

Things that couldn't be fully resolved:

1. **Sound file sources/hosting**
   - What we know: Need sounds for correct, wrong, lifeline activation, safe haven fanfare
   - What's unclear: Where to host audio files (local assets vs CDN?)
   - Recommendation: Create /public/sounds/ folder with .mp3 files; find royalty-free Millionaire-style sounds

2. **Question difficulty scaling for Millionaire**
   - What we know: TV show has increasing difficulty per question number
   - What's unclear: Should questions 8-10 be harder than 1-3? Current quiz generation doesn't differentiate
   - Recommendation: For classroom brain break, uniform difficulty is fine; can enhance later if needed

3. **Exact timing for sequential answer reveals**
   - What we know: CONTEXT.md says "dramatic timing" for A -> B -> C -> D
   - What's unclear: Exact milliseconds between reveals
   - Recommendation: Start with 300ms between options, 800ms before final reveal; tune based on feel

## Sources

### Primary (HIGH confidence)
- Existing codebase: `types.ts`, `PresentationView.tsx`, `QuickQuizGame.tsx`, `StudentGameView.tsx`
- Phase 20 Research and Implementation - Discriminated unions, BroadcastChannel patterns
- 21-CONTEXT.md - User decisions on lifelines, question counts, visual design

### Secondary (MEDIUM confidence)
- [Millionaire Wiki - Money Tree](https://millionaire.fandom.com/wiki/Money_Tree) - Classic prize ladder format
- [Frontend.fyi - useSound Hook](https://www.frontend.fyi/recipes/react/playing-a-sound) - Zero-dependency audio pattern
- [LogRocket - CSS Confetti](https://blog.logrocket.com/how-create-confetti-effect-css/) - Pure CSS celebration effects
- [Millionaire Wiki - Phone-a-Friend](https://millionaire.fandom.com/wiki/Phone-a-Friend) - Lifeline format reference

### Tertiary (LOW confidence)
- [GitHub - lequan81/altp](https://github.com/lequan81/altp) - Tailwind CSS Millionaire implementation example
- [GitHub - aaronnech/Who-Wants-to-Be-a-Millionaire](https://github.com/aaronnech/Who-Wants-to-Be-a-Millionaire) - HTML/CSS/JS implementation reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies only per v3.0 constraint
- Architecture: HIGH - Extends proven Phase 20 patterns
- Lifeline mechanics: HIGH - Well-documented in TV show format, adapted per CONTEXT.md
- Audio patterns: MEDIUM - Web Audio API is standard but implementation varies
- Visual polish (confetti, timing): MEDIUM - Subjective, may need iteration

**Research date:** 2026-01-23
**Valid until:** 60 days (game UI patterns are stable)
