# Phase 25: Competition Modes - Research

**Researched:** 2026-01-24
**Domain:** React form state management, TypeScript discriminated unions, UI patterns for dynamic configuration
**Confidence:** HIGH

## Summary

Competition Modes extends the existing game architecture to support individual player mode (single student represents class) and team competition mode (class splits into teams with score tracking). This is a pure feature addition that integrates with the existing discriminated union game state system without modifying core game logic.

The standard approach involves extending the base game state with competition configuration, adding collapsible setup sections to existing game modals, and conditionally rendering score displays based on competition mode. The codebase already demonstrates robust patterns for form state management, localStorage persistence, and modal-based configuration that can be directly applied.

**Primary recommendation:** Extend GameState discriminated unions with competition fields, add a shared CompetitionModeSection component that all game setup modals can use, implement team name generation with in-memory word lists (zero dependencies), and overlay score badges using absolute positioning with Tailwind ring animations.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.x | UI framework | Already in use, hooks-based state management ideal for forms |
| TypeScript | 5.x | Type safety | Existing discriminated unions pattern proven in game state |
| Tailwind CSS | 3.x | Styling | Zero-dependency animations, ring utilities for active indicators |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | No new dependencies | Follow "zero new runtime dependencies" decision from v3.0 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory word lists | random-words npm package | Package adds 1MB+ of word data; unnecessary for ~20 adjectives + 20 nouns |
| In-memory word lists | AI-generated names | API latency unacceptable for instant regeneration UX |
| Custom localStorage hook | Third-party state library | useSettings pattern already proven; no value in external dependency |

**Installation:**
```bash
# No new dependencies required
# All functionality achievable with existing React 19, TypeScript, Tailwind stack
```

## Architecture Patterns

### Recommended Type Structure
```
types.ts (extend existing)
├── CompetitionMode (discriminated union)
├── IndividualModeConfig (player name optional)
├── TeamModeConfig (team array, name generation)
└── Extend all game states with competitionMode field
```

### Pattern 1: Discriminated Union for Competition Mode
**What:** Type-safe competition configuration using TypeScript discriminated unions
**When to use:** Exactly matches existing GameState pattern (gameType discriminant)
**Example:**
```typescript
// Source: Existing codebase pattern from types.ts
export type CompetitionMode =
  | { mode: 'individual'; playerName: string }
  | { mode: 'team'; teams: Array<{ name: string; score: number }> };

// Extend base game state (same pattern as MillionaireState, TheChaseState)
export interface BaseGameState {
  gameType: GameType;
  status: GameStatus;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  competitionMode: CompetitionMode; // Add to existing base
}
```

### Pattern 2: Collapsible Form Sections with Local State
**What:** Self-contained collapsible sections using useState for open/closed state
**When to use:** Configuration sections that don't affect game state until "Start" clicked
**Example:**
```typescript
// Source: React form patterns + existing SetupModal.tsx structure
const CompetitionModeSection: React.FC<Props> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'individual' | 'team'>('individual');

  return (
    <div className="mb-6">
      <button onClick={() => setIsOpen(!isOpen)}>
        Competition Mode {isOpen ? '▼' : '▶'}
      </button>
      {isOpen && (
        <div className="mt-3">
          {/* Mode selection buttons */}
          {/* Conditional content based on mode */}
        </div>
      )}
    </div>
  );
};
```

### Pattern 3: Dynamic Form Arrays (Teams)
**What:** Array of editable team names using map + controlled inputs
**When to use:** User needs to add/remove/edit variable number of items
**Example:**
```typescript
// Source: React dynamic forms best practices
const [teams, setTeams] = useState<Array<{ name: string }>>([]);

const updateTeamName = (index: number, name: string) => {
  setTeams(prev => prev.map((team, i) =>
    i === index ? { ...team, name } : team
  ));
};

// Render
{teams.map((team, idx) => (
  <input
    key={idx}
    value={team.name}
    onChange={(e) => updateTeamName(idx, e.target.value)}
  />
))}
```

### Pattern 4: Controlled Input with localStorage Persistence
**What:** Optional fields persist across sessions using useSettings pattern
**When to use:** User preferences like default player name
**Example:**
```typescript
// Source: hooks/useSettings.ts
const STORAGE_KEY = 'cue-competition-prefs';

export function useCompetitionPrefs() {
  const [prefs, setPrefs] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { lastPlayerName: '' };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  return [prefs, setPrefs];
}
```

### Pattern 5: Floating Score Badges with Active Indicator
**What:** Absolutely positioned score displays with ring animation for active player/team
**When to use:** Non-intrusive score display during gameplay
**Example:**
```typescript
// Source: Tailwind CSS ring animations + existing overlay patterns
<div className="fixed top-4 right-4 flex gap-4">
  {teams.map((team, idx) => (
    <div
      key={idx}
      className={`
        px-6 py-3 rounded-2xl bg-slate-900/80 backdrop-blur-sm
        border-2 transition-all
        ${isActiveTeam(idx)
          ? 'border-amber-400 ring-4 ring-amber-400/50 scale-110'
          : 'border-slate-600'}
      `}
    >
      <div className="text-xs text-slate-400">{team.name}</div>
      <div className="text-2xl font-bold text-white">{team.score}</div>
    </div>
  ))}
</div>
```

### Anti-Patterns to Avoid
- **Mutating state arrays directly:** Use immutable updates (map, filter, concat) to ensure React detects changes
- **Using array indices as React keys:** Team order may change; use stable IDs instead
- **Form libraries for simple forms:** react-hook-form adds complexity for 2-3 input fields
- **External animation libraries:** Tailwind's transition utilities sufficient for ring/scale effects

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Word list generation | Fetch from API, complex grammar rules | In-memory arrays of adjectives/nouns | ~20 words each = 400 combinations, instant regeneration, kid-appropriate curation |
| Form validation | Custom validation logic | TypeScript + controlled inputs | Type safety catches mode mismatches at compile time, required fields enforced by button disable state |
| State persistence | Custom storage wrapper | Existing useSettings pattern | Already proven in codebase (hooks/useSettings.ts), handles JSON serialization + error recovery |
| Score display positioning | Manual position calculations | Tailwind fixed positioning + flex | Responsive, theme-consistent, zero JavaScript calculations |

**Key insight:** Competition mode is configuration data (extends game state) + UI presentation (score badges), not complex game logic. Use React's built-in form handling and TypeScript's discriminated unions rather than introducing libraries.

## Common Pitfalls

### Pitfall 1: Modifying Game Logic for Competition Modes
**What goes wrong:** Attempt to add competition-specific code to individual game components (MillionaireGame, TheChaseGame, etc.)
**Why it happens:** Competition modes appear to require game-aware logic for scoring
**How to avoid:** Competition mode is purely presentational. Games produce results (correct/incorrect), orchestrator updates scores. Game components remain unaware of competition mode.
**Warning signs:** Import of CompetitionMode types in game-specific components, conditional rendering based on mode inside game logic

### Pitfall 2: Complex State for Simple Configuration
**What goes wrong:** Using refs, context, or state management libraries for setup modal state
**Why it happens:** Assumption that multi-step forms require complex patterns
**How to avoid:** Setup modal state is ephemeral (destroyed when modal closes). Use local useState for mode selection, only pass final configuration to game state on "Start" click.
**Warning signs:** useRef for form inputs, context providers wrapping modals, external state libraries mentioned

### Pitfall 3: Team Name Generation Blocking UI
**What goes wrong:** Calling AI API to generate team names causes 1-2 second wait on "Generate Names" click
**Why it happens:** Assumption that creative names require AI
**How to avoid:** Use Fisher-Yates shuffle on predefined word arrays for instant results. Curate kid-friendly lists once, shuffle on each regeneration.
**Warning signs:** Async function for name generation, loading states in name generator, API calls in modal

### Pitfall 4: Score State in Multiple Locations
**What goes wrong:** Storing team scores in component state AND game state causes desyncs
**Why it happens:** Confusion about where competition data lives
**How to avoid:** Single source of truth: competitionMode field in game state. All score updates flow through onStateUpdate callbacks to App.tsx, broadcast via BroadcastChannel.
**Warning signs:** Multiple useState for scores, score calculations in child components, "score drift" bugs

### Pitfall 5: Hardcoded Team Limits
**What goes wrong:** UI only allows 2-4 teams, teacher requests 6 teams for their class layout
**Why it happens:** Assumption about "normal" class size
**How to avoid:** User requirement explicitly states "any number of teams." Use dynamic array with add/remove buttons. UI scales via flex-wrap or scroll for 5+ teams.
**Warning signs:** Fixed-length arrays, grid-cols-3 without responsive variants, max team validation

## Code Examples

Verified patterns from codebase analysis:

### Extending Game State (BaseGameState)
```typescript
// Source: types.ts (existing pattern)
export type CompetitionMode =
  | { mode: 'individual'; playerName: string }
  | { mode: 'team'; teams: Array<{ id: string; name: string; score: number }> };

export interface BaseGameState {
  gameType: GameType;
  status: GameStatus;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  competitionMode: CompetitionMode; // Add this field
}
```

### Modal Pattern (Existing SetupModal.tsx)
```typescript
// Source: components/games/beat-the-chaser/SetupModal.tsx
const SetupModal: React.FC<Props> = ({ onStart, onCancel }) => {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [competitionMode, setCompetitionMode] = useState<CompetitionMode>({
    mode: 'individual',
    playerName: ''
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-8 rounded-2xl max-w-2xl">
        {/* Existing difficulty selection */}

        {/* NEW: Competition Mode Section */}
        <CompetitionModeSection
          value={competitionMode}
          onChange={setCompetitionMode}
        />

        <button onClick={() => onStart(difficulty, competitionMode)}>
          Start Game
        </button>
      </div>
    </div>
  );
};
```

### Team Name Generation (Zero Dependencies)
```typescript
// Source: In-memory arrays, Fisher-Yates shuffle algorithm
const ADJECTIVES = [
  'Awesome', 'Brilliant', 'Clever', 'Daring', 'Epic',
  'Fearless', 'Gigantic', 'Happy', 'Incredible', 'Jolly',
  'Keen', 'Lively', 'Mighty', 'Noble', 'Outstanding',
  'Powerful', 'Quick', 'Radiant', 'Super', 'Terrific'
];

const NOUNS = [
  'Dragons', 'Eagles', 'Falcons', 'Griffins', 'Hawks',
  'Jaguars', 'Knights', 'Lions', 'Meteors', 'Ninjas',
  'Owls', 'Panthers', 'Phoenixes', 'Rockets', 'Sharks',
  'Tigers', 'Unicorns', 'Vikings', 'Wizards', 'Wolves'
];

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateTeamNames(count: number): string[] {
  const shuffledAdj = shuffle(ADJECTIVES);
  const shuffledNouns = shuffle(NOUNS);
  return Array.from({ length: count }, (_, i) =>
    `${shuffledAdj[i % shuffledAdj.length]} ${shuffledNouns[i % shuffledNouns.length]}`
  );
}
```

### Score Badge Display (Student View)
```typescript
// Source: Tailwind positioning + ring utilities
const ScoreDisplay: React.FC<{ mode: CompetitionMode; activeIndex?: number }> = ({
  mode,
  activeIndex
}) => {
  if (mode.mode === 'individual') {
    return (
      <div className="fixed top-4 right-4 px-6 py-3 rounded-2xl bg-slate-900/80 backdrop-blur-sm border-2 border-amber-400">
        <div className="text-xs text-slate-400">
          {mode.playerName || 'Player'}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 flex flex-wrap gap-3 max-w-md">
      {mode.teams.map((team, idx) => (
        <div
          key={team.id}
          className={`
            px-4 py-2 rounded-xl bg-slate-900/80 backdrop-blur-sm
            border-2 transition-all duration-300
            ${idx === activeIndex
              ? 'border-amber-400 ring-4 ring-amber-400/50 scale-110 shadow-lg shadow-amber-400/30'
              : 'border-slate-600'}
          `}
        >
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">
            {team.name}
          </div>
          <div className="text-xl font-bold text-white">{team.score}</div>
        </div>
      ))}
    </div>
  );
};
```

### localStorage Persistence Pattern (Existing useSettings.ts)
```typescript
// Source: hooks/useSettings.ts
const STORAGE_KEY = 'cue-competition-prefs';

interface CompetitionPrefs {
  lastPlayerName: string;
  lastTeamCount: number;
}

export function useCompetitionPrefs() {
  const [prefs, setPrefs] = useState<CompetitionPrefs>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { lastPlayerName: '', lastTeamCount: 2, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse competition prefs:', e);
    }
    return { lastPlayerName: '', lastTeamCount: 2 };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save competition prefs:', e);
    }
  }, [prefs]);

  return [prefs, setPrefs] as const;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-hook-form for all forms | useState for simple forms | 2023-2024 | Reduced bundle size, simpler debugging for <5 field forms |
| Class-based modals | Function components + hooks | 2020-2021 | Cleaner code, easier state management |
| CSS-in-JS for animations | Tailwind utility classes | 2021-2023 | Zero runtime cost, better performance, smaller bundle |
| Context for modal state | Local useState | 2022-2024 | Simpler mental model, no provider nesting |

**Deprecated/outdated:**
- react-hook-form for setup modals: Overkill for 2-3 inputs, adds 40KB+ to bundle
- External animation libraries (Framer Motion): Tailwind transitions sufficient for 95% of UI animations
- Redux/Zustand for form state: Component-local state destroyed on modal close makes persistence libraries unnecessary

## Open Questions

Things that couldn't be fully resolved:

1. **Per-game vs cumulative team scoring**
   - What we know: CONTEXT.md marks this as "Claude's Discretion"
   - What's unclear: Whether teacher wants persistent leaderboard across multiple games in same session
   - Recommendation: Start with per-game scoring (simpler, matches existing game isolation). Add cumulative mode in v3.1 if requested.

2. **Team rotation mechanics**
   - What we know: CONTEXT.md mentions "teams rotate automatically per question"
   - What's unclear: Rotation logic for games with different turn structures (Chase head-to-head vs Millionaire sequential)
   - Recommendation: Define "active team" as index managed by game orchestrator, incremented on question complete. Each game type already has question flow logic.

3. **Manual score adjustment UI**
   - What we know: CONTEXT.md mentions "hybrid scoring: auto-score with manual correction option"
   - What's unclear: Where/when teacher adjusts scores (during game? after round? end of game?)
   - Recommendation: Add +/- buttons on teacher's score display (visible only to teacher, not student view). Update on click broadcasts to student view immediately.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `types.ts` - Discriminated union pattern (GameState, ChasePhase, BeatTheChaserPhase)
  - `hooks/useSettings.ts` - localStorage persistence pattern with validation
  - `components/games/beat-the-chaser/SetupModal.tsx` - Modal state management, button selection UI
  - `components/games/the-chase/VotingWidget.tsx` - Dynamic input, controlled components
  - `components/games/GameContainer.tsx` - Type-safe game routing with discriminated unions

### Secondary (MEDIUM confidence)
- [React State Management in 2025: What You Actually Need](https://www.developerway.com/posts/react-state-management-2025) - useState recommended for component-local form state
- [TypeScript: Documentation - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) - Official TypeScript discriminated unions documentation
- [Tailwind CSS Animations: Tutorial and 40+ Examples](https://prismic.io/blog/tailwind-animations) - Ring animations, glow effects with utility classes
- [Mastering State Persistence with Local Storage in React](https://medium.com/@roman_j/mastering-state-persistence-with-local-storage-in-react-a-complete-guide-1cf3f56ab15c) - localStorage best practices with useEffect pattern

### Tertiary (LOW confidence)
- [React | Floating UI](https://floating-ui.com/docs/react) - Overlay positioning library (not needed, Tailwind sufficient)
- [random-words npm package](https://www.npmjs.com/package/random-words) - Random word generation (too heavy, in-memory arrays preferred)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Existing codebase proves React 19 + TypeScript + Tailwind sufficient, v3.0 decision mandates zero new dependencies
- Architecture: HIGH - Discriminated union pattern already used for GameState, modal patterns established in 4 existing game setups
- Pitfalls: HIGH - Codebase analysis reveals proven patterns (useSettings, SetupModal, VotingWidget) that directly inform competition mode implementation

**Research date:** 2026-01-24
**Valid until:** 30 days (stable domain - React patterns, TypeScript features, Tailwind utilities unlikely to change significantly)
