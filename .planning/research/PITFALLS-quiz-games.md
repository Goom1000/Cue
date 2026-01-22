# Domain Pitfalls: Adding Quiz Game Formats to Presentation App

**Domain:** TV show-style quiz games (The Chase, Beat the Chaser, Who Wants to Be a Millionaire)
**Context:** Adding to existing classroom presentation app with client-side sync
**Researched:** 2026-01-22
**Confidence:** HIGH (based on existing system architecture + WebSearch patterns)

## Executive Summary

Adding multiple game formats to an existing educational app presents unique integration challenges beyond building games from scratch. The critical pitfalls center on:

1. **State management complexity** - Each game has different state models, but they must coexist without conflicts
2. **BroadcastChannel sync fragility** - Game state transitions are more complex than slide navigation
3. **Code duplication trap** - Three similar games invite copy-paste anti-patterns
4. **Feature creep risk** - TV show mechanics can explode scope if not bounded
5. **Integration blind spots** - Existing features (grade levels, student lists, AI generation) must work with all games

Most teams underestimate integration complexity and overestimate the similarity between game formats.

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Isolated Game State Silos

**What goes wrong:**

Each game manages its state independently without considering:
- How states transition between games (Chase → Millionaire mid-session)
- How existing app state (current slide, student list, grade levels) interacts with game state
- How BroadcastChannel messages distinguish between game types
- What happens when game state exists but the teacher changes slides

This leads to state corruption when:
- Teacher starts Chase game, goes back to presentation, then starts Millionaire
- BroadcastChannel receives Chase messages while Millionaire is active
- localStorage contains stale game state from previous session
- Student view shows remnants of previous game

**Why it happens:**

Developers build each game in isolation (like building three separate apps) instead of designing a unified game state architecture first. The pattern "let's get Chase working, then add Millionaire" creates technical debt that's expensive to refactor.

**Consequences:**
- Student views desync from teacher view
- Game crashes when switching between formats
- Race conditions between competing game states
- Debug nightmares ("it works in Chase but breaks in Millionaire")

**Prevention:**

Design unified game state architecture BEFORE implementing first game:

```typescript
// Unified game state model
type GameState = {
  type: 'chase' | 'beat-the-chaser' | 'millionaire' | null;
  active: boolean;
  sessionId: string; // Prevents stale messages
  // Game-specific state in discriminated union
  state: ChaseState | BeatTheChaserState | MillionaireState | null;
};

// BroadcastChannel message protocol
type GameMessage = {
  sessionId: string; // Ignore messages from old sessions
  gameType: 'chase' | 'beat-the-chaser' | 'millionaire';
  action: string;
  payload: unknown;
};
```

**Key principles:**
- Single source of truth for active game
- Session IDs prevent cross-contamination
- Explicit cleanup when switching games
- Game state transitions as state machine

**Detection warning signs:**
- Each game has separate `useState` hooks at root level
- No `sessionId` or game-type checking in BroadcastChannel handler
- Copy-pasted sync logic in each game component
- No cleanup function when unmounting games

**Phase to address:** Phase 1 (Foundation) — before implementing any game

---

### Pitfall 2: BroadcastChannel Message Ordering Assumptions

**What goes wrong:**

Game implementations assume BroadcastChannel messages arrive:
- In the order they were sent
- Without duplicates
- Before UI updates
- Only to the intended game

But BroadcastChannel in multi-process browsers (Chrome, Edge) does NOT guarantee ordering across processes. This causes:

**Chase game example:**
```
Teacher sends: QUESTION_START → ANSWER_REVEAL → CHASER_CATCHES
Student receives: QUESTION_START → CHASER_CATCHES → ANSWER_REVEAL
Result: Game shows answer after player already caught
```

**Millionaire game example:**
```
Teacher sends: USE_5050 → ANSWER_A_REMOVED → ANSWER_C_REMOVED
Student receives: ANSWER_A_REMOVED → USE_5050 → ANSWER_C_REMOVED
Result: First answer disappears before lifeline animation plays
```

**Why it happens:**

From research: "Chrome's implementation is based on the assertion that BC ordering is only guaranteed within a single thread" ([GitHub WHATWG HTML Issue #7267](https://github.com/whatwg/html/issues/7267)). Multi-process browser architecture requires asynchronous IPC, breaking ordering guarantees.

Developers test on single-monitor setup (same process) where ordering appears reliable, then deploy to classrooms with external projectors (different processes) where it breaks.

**Consequences:**
- Game animations play out of sequence
- Student view shows spoilers (answers revealed before question)
- Game logic breaks (score calculated before answer revealed)
- Intermittent bugs that "only happen sometimes"

**Prevention:**

**Strategy 1: Sequence numbers with buffering**

```typescript
type GameMessage = {
  sessionId: string;
  sequence: number; // Monotonically increasing
  gameType: string;
  action: string;
  payload: unknown;
};

// Student view buffers out-of-order messages
const messageBuffer: GameMessage[] = [];
let expectedSequence = 0;

function handleMessage(msg: GameMessage) {
  if (msg.sequence === expectedSequence) {
    processMessage(msg);
    expectedSequence++;

    // Process any buffered messages now in order
    while (true) {
      const next = messageBuffer.find(m => m.sequence === expectedSequence);
      if (!next) break;
      processMessage(next);
      expectedSequence++;
      messageBuffer.splice(messageBuffer.indexOf(next), 1);
    }
  } else if (msg.sequence > expectedSequence) {
    messageBuffer.push(msg); // Buffer future message
  }
  // Ignore msg.sequence < expectedSequence (duplicate)
}
```

**Strategy 2: Atomic state snapshots (simpler)**

Instead of sending incremental actions, send complete state:

```typescript
// DON'T: Send individual actions
channel.postMessage({ action: 'REMOVE_ANSWER_A' });
channel.postMessage({ action: 'REMOVE_ANSWER_C' });

// DO: Send complete state snapshot
channel.postMessage({
  action: 'GAME_STATE_UPDATE',
  state: {
    lifelines: { fiftyFifty: 'used' },
    visibleAnswers: ['B', 'D'], // Complete current state
    currentQuestion: 7
  }
});
```

**Recommendation:** Use atomic state snapshots for simplicity. Game state is small (<1KB), so bandwidth isn't a concern.

**Detection warning signs:**
- Separate messages for related state changes
- No sequence numbers in messages
- Logic depends on message arrival order
- Student view has race conditions with teacher actions

**Phase to address:** Phase 1 (Foundation) — establish sync protocol before game logic

---

### Pitfall 3: Game Format Code Duplication Trap

**What goes wrong:**

All three games have similar patterns:
- Question display
- Answer option UI
- Timer countdown
- Score tracking
- Win/loss states

The temptation: Build Chase game, then copy-paste to create Millionaire and Beat the Chaser, changing the specific mechanics.

This creates [the worst anti-pattern in software engineering](https://www.codeant.ai/blogs/stop-code-duplication-developers-guide):
- Bug fix in Chase doesn't apply to Millionaire
- UI improvement in one game inconsistent in others
- Student view sync logic duplicated 3x with subtle differences
- Accessibility fixes must be applied separately to each game

**Why it happens:**

"Let's get it working first, then refactor later." But "later" never comes because:
- Each game "works" so there's pressure to move on
- Refactoring requires touching all three games (risky)
- Team assumes games are too different to share code

Research shows [code duplication leads to buggy and unmaintainable systems](https://medium.com/@kooliahmd/code-duplication-anti-pattern-diagnosis-and-treatment-44f8c1555382), with vulnerabilities persisting in duplicates even after fixes.

**Consequences:**
- 3x maintenance burden
- Inconsistent UX across games
- Bug fixes miss some games
- Accessibility compliance gaps
- Difficult to add 4th game format later

**Prevention:**

**Design shared abstractions before implementing games:**

```typescript
// Shared game framework
interface GameEngine {
  // All games share these
  displayQuestion(q: Question): void;
  revealAnswer(correct: boolean): void;
  updateScore(points: number): void;
  handleTimeout(): void;
  syncToStudentView(state: GameState): void;
}

// Game-specific behavior
interface GameRules {
  calculateScore(timeRemaining: number, streak: number): number;
  getNextQuestion(difficulty: GradeLevel): Question;
  checkWinCondition(state: GameState): boolean;
  getEndGameMessage(won: boolean): string;
}

// Concrete implementations
class ChaseRules implements GameRules { /* ... */ }
class MillionaireRules implements GameRules { /* ... */ }
class BeatTheChaserRules implements GameRules { /* ... */ }
```

**Shared components hierarchy:**

```
GameContainer (handles sync, layout, timing)
├── QuestionDisplay (reusable across games)
├── AnswerGrid (configurable for 4-choice vs 2-choice)
├── ScoreTracker (different displays, same logic)
├── GameTimer (shared countdown with game-specific styling)
└── GameBoard (game-specific layout)
    ├── ChaseBoard (linear track)
    ├── MillionaireBoard (money ladder)
    └── BeatTheChaserBoard (multiple chasers)
```

**What to share:**
- Question/answer display components
- Timer logic (different visuals, same countdown)
- BroadcastChannel sync protocol
- Accessibility features (keyboard nav, screen readers)
- Student view wrapper (same border/banner, different content)

**What NOT to share:**
- Game-specific scoring rules
- Win/loss condition logic
- Board/track visualization
- Lifeline mechanics (Millionaire-specific)

**Detection warning signs:**
- Same TypeScript interfaces copied across game files
- Copy-pasted BroadcastChannel message handlers
- Similar JSX with minor differences
- Three separate `GameContainer.tsx` files

**Phase to address:** Phase 1 (Foundation) — architect shared framework before first game

---

### Pitfall 4: AI Question Generation Quality Blindness

**What goes wrong:**

AI generates questions from lesson content, but game formats have specific requirements:

**The Chase:**
- Requires rapid-fire questions (5 seconds each)
- Mix of easy and hard creates game balance
- Questions should be general knowledge + lesson content blend

**Who Wants to Be a Millionaire:**
- Progressive difficulty (questions 1-5 easy, 6-10 medium, 11-15 hard)
- Higher-value questions need unambiguous answers
- Wrong answers must be plausible (not obviously wrong)

**Beat the Chaser:**
- Needs large question pool (different from The Chase)
- Must avoid duplicates within a session

The pitfall: Treating AI question generation as "one-size-fits-all" without game-specific validation or teacher review.

From research on [AI quiz generators in 2026](https://www.edcafe.ai/blog/free-ai-quiz-makers): "Educators are advised to give final approval on AI-generated quizzes, fact-check questions, change phrasing, edit design, and take creative control."

**Why it happens:**

Team assumes AI will "just work" because it works for existing Kahoot-style quiz. But TV show games expose quality issues:
- Millionaire needs 15 questions per game (vs 5-10 for Kahoot)
- Ambiguous questions ruin game experience ("The answer is technically both A and C")
- Plausibility matters more in high-stakes Millionaire format

**Consequences:**
- Teacher must skip bad questions during live game (embarrassing)
- Students dispute answers, disrupting game flow
- AI generates duplicate questions in same session
- Difficulty progression feels random, not calibrated
- Games feel "cheap" compared to real TV shows

**Prevention:**

**Strategy 1: Game-aware question prompts**

```typescript
// DON'T: Generic prompt
const prompt = `Generate 15 questions about ${lessonTopic}`;

// DO: Game-specific prompts
const millionairePrompt = `
Generate 15 questions for Who Wants to Be a Millionaire format:
- Questions 1-5: Easy recall (90% students should know)
- Questions 6-10: Medium analysis (50% students should know)
- Questions 11-15: Hard synthesis (10% students should know)

For each question:
- Provide 4 answers where wrong answers are plausible but clearly incorrect
- Avoid ambiguous phrasing
- Include mix of lesson content and related general knowledge
- Progressive difficulty (later questions harder than earlier)

Format: { question, answers: [A, B, C, D], correct: 'A'|'B'|'C'|'D', difficulty: 1-15 }
`;

const chasePrompt = `
Generate 30 rapid-fire questions (20 for player, 10 for chaser):
- 50% easy recall, 30% medium, 20% hard
- Should be answerable in 5 seconds
- Mix lesson content with general knowledge
- Vary topics within lesson scope to keep game dynamic
`;
```

**Strategy 2: Quality validation before game starts**

```typescript
function validateMillionaireQuestions(questions: Question[]): ValidationResult {
  const issues: string[] = [];

  // Check difficulty progression
  if (!isDifficultyIncreasing(questions)) {
    issues.push("Questions don't progress from easy to hard");
  }

  // Check answer plausibility
  questions.forEach((q, i) => {
    const wrongAnswers = q.answers.filter(a => a.letter !== q.correct);
    if (wrongAnswers.some(a => isObviouslyWrong(a.text, q.question))) {
      issues.push(`Question ${i+1}: Wrong answers too obviously incorrect`);
    }
  });

  // Check for duplicates
  const duplicates = findDuplicates(questions.map(q => q.question));
  if (duplicates.length > 0) {
    issues.push(`Duplicate questions: ${duplicates.join(', ')}`);
  }

  return { valid: issues.length === 0, issues };
}
```

**Strategy 3: Teacher question review UI**

Before starting game, show teacher:
- Question preview list
- Regenerate individual question button
- Adjust difficulty slider
- "These look good, start game" confirmation

**Strategy 4: Graceful degradation during game**

```typescript
// Teacher can skip to next question if current one is bad
<button onClick={skipQuestion}>Skip This Question</button>

// Student view shows "Question skipped by teacher" briefly, then next question
```

**Detection warning signs:**
- No game-specific prompts for AI question generation
- No validation of question quality before game starts
- Teacher has no way to review/edit questions
- No skip/next question option during live game
- Same AI prompt used for Kahoot, Chase, and Millionaire

**Phase to address:**
- Phase 2 (AI Integration) — game-specific prompts and validation
- Phase 3 (Polish) — teacher review UI

---

### Pitfall 5: Lifeline Implementation Complexity Underestimation

**What goes wrong:**

Who Wants to Be a Millionaire lifelines seem simple ("just hide two wrong answers") but are deceptively complex:

**50:50 Lifeline:**
- Which two answers to remove? (Random? Always keep 2nd-best answer for drama?)
- Animation timing (answers fade out in sequence, not simultaneously)
- Student view must sync with exact same removed answers
- What if AI only provided 3 answers for a question?

**Ask the Audience Lifeline:**
- In client-side app with no backend, where does "audience" data come from?
- If simulated: How to make percentages realistic? (Correct answer should win, but not 100%)
- If using real students: How do they submit votes? (Same BroadcastChannel? Separate?)
- Display timing: Show poll results gradually or all at once?

**Phone-a-Friend Lifeline:**
- Who does teacher call? (Another teacher? Simulated AI?)
- Timer countdown (30 seconds) while teacher talks?
- If simulated: AI generates "friend" response based on question
- Student view shows what during phone call?

From research on [Millionaire implementations](https://github.com/michael-rutledge/millionaire), lifeline mechanics vary significantly, with some using AI audiences or polling contestants.

**Why it happens:**

Team looks at TV show and sees "teacher clicks button, two answers disappear" without considering:
- Edge cases (what if student already used 50:50 earlier?)
- Sync complexity (student must see exact same disappearing answers)
- UX timing (lifeline should feel dramatic, not instant)
- Data requirements (Ask the Audience needs voting mechanism or simulation)

**Consequences:**
- Lifelines feel janky compared to TV show
- Implementation takes 3x longer than estimated
- Edge cases cause crashes mid-game
- Student view shows different removed answers than teacher (desync)
- Phone-a-Friend lifeline cut from MVP because "too hard"

**Prevention:**

**Strategy 1: Design lifeline state machine upfront**

```typescript
type LifelineState = {
  fiftyFifty: 'available' | 'used' | 'unavailable';
  askTheAudience: 'available' | 'used' | 'unavailable';
  phoneAFriend: 'available' | 'used' | 'unavailable';
};

// State transitions are explicit
function useFiftyFifty(state: LifelineState, question: Question): {
  newState: LifelineState;
  removedAnswers: [string, string]; // Deterministic removal
  syncMessage: GameMessage; // Exact message to send to student view
}
```

**Strategy 2: Simplify complex lifelines for MVP**

**50:50:** Easy to implement, include in MVP
- Remove two answers deterministically (not randomly)
- E.g., if correct is 'B', remove 'A' and 'D' (alphabetically furthest)
- Sync via atomic state message showing remaining answers

**Ask the Audience:** Simulated only, MVP-friendly
- Generate realistic distribution: Correct answer 60-80%, distributed among others
- Display as bar chart (reuse chart component if exists)
- No student voting in v1 (requires complex orchestration)

**Phone-a-Friend:** Defer to post-MVP
- Requires audio or text chat simulation
- Complex UX (teacher must role-play or read AI suggestion)
- Low pedagogical value compared to other lifelines

**Strategy 3: Deterministic answer removal (avoid desync)**

```typescript
// DON'T: Random removal (desync risk)
function remove50_50(question: Question): Question {
  const wrongAnswers = question.answers.filter(a => !a.correct);
  const toRemove = randomSample(wrongAnswers, 2); // Different on teacher vs student!
  return { ...question, answers: question.answers.filter(a => !toRemove.includes(a)) };
}

// DO: Deterministic removal
function remove50_50(question: Question): Question {
  const wrongAnswers = question.answers.filter(a => !a.correct);
  const toRemove = [wrongAnswers[0], wrongAnswers[2]]; // Always remove 1st and 3rd wrong answer
  return { ...question, answers: question.answers.filter(a => !toRemove.includes(a)) };
}
```

**Strategy 4: Lifeline UI state management**

```typescript
// Lifeline buttons disabled after use
<button
  disabled={lifelines.fiftyFifty !== 'available'}
  onClick={handleFiftyFifty}
>
  50:50 {lifelines.fiftyFifty === 'used' && '(USED)'}
</button>

// Student view shows lifeline animation synchronized
useEffect(() => {
  if (gameMessage.action === 'FIFTY_FIFTY_USED') {
    playFiftyFiftyAnimation(gameMessage.removedAnswers);
  }
}, [gameMessage]);
```

**Detection warning signs:**
- Lifelines implemented as "TODO: add later"
- No state machine for lifeline availability
- Random answer removal without seed
- No lifeline button disabled states
- Ask the Audience requires real student votes in MVP
- Phone-a-Friend has no design spec

**Phase to address:**
- Phase 2 (Millionaire Game) — 50:50 and simulated Ask the Audience only
- Phase 4 (Polish) — Phone-a-Friend or real student voting (if time allows)

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 6: Accessibility as Afterthought

**What goes wrong:**

Games rely heavily on visual cues (timers, score displays, answer reveals) without considering:
- Screen reader users (how do they know time is running out?)
- Keyboard-only navigation (can teacher control game without mouse?)
- Color contrast (red/green for correct/wrong in dark mode?)
- Cognitive load (too much animation distracts from learning?)

From research on [educational game accessibility](https://www.filamentgames.com/blog/building-accessible-educational-games-lessons-from-the-front-lines): "There's no exemption in WCAG guidelines for educational intent. Full compliance can be incompatible with some core learning mechanics."

Higher education faces [WCAG 2.1 AA compliance deadline of April 24, 2026](https://onlinelearningconsortium.org/olc-insights/2025/09/federal-digital-a11y-requirements/). Game mechanics must not create accessibility barriers.

**Why it happens:**

Team focuses on making games "look cool" like TV shows, prioritizing animations and visual polish over inclusive design. Accessibility testing happens only after games are built, when fixes are expensive.

**Consequences:**
- Students with visual impairments can't participate
- Teacher with motor impairment struggles with mouse-heavy controls
- Color-blind students miss visual cues (red vs green answers)
- Compliance issues if deployed in public schools
- Expensive retrofitting of accessibility after games built

**Prevention:**

**Strategy 1: Keyboard navigation from day one**

Every teacher control must work with keyboard:
- Space/Enter: Select answer, advance to next question
- Number keys 1-4: Select answer A-D
- L: Use 50:50 lifeline
- Escape: Exit game

**Strategy 2: Screen reader announcements**

```typescript
// Live region for dynamic updates
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {gameAnnouncement}
</div>

// Update announcement on state changes
useEffect(() => {
  if (gameState.phase === 'question') {
    setGameAnnouncement(`Question ${gameState.currentQuestion}: ${gameState.question.text}`);
  } else if (gameState.phase === 'answer_revealed') {
    setGameAnnouncement(`${gameState.answeredCorrectly ? 'Correct!' : 'Incorrect.'} ${gameState.explanation}`);
  }
}, [gameState]);
```

**Strategy 3: Visual alternatives to color-only information**

```typescript
// DON'T: Color-only indicators
<div className={correct ? "bg-green-500" : "bg-red-500"}>
  {answerText}
</div>

// DO: Color + icon + text
<div className={correct ? "bg-green-500" : "bg-red-500"}>
  <Icon name={correct ? "check" : "x"} aria-hidden="true" />
  <span className="sr-only">{correct ? "Correct" : "Incorrect"}</span>
  {answerText}
</div>
```

**Strategy 4: Reduced motion support**

```typescript
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const animationClass = prefersReducedMotion
  ? 'transition-none'
  : 'animate-slide-in duration-500';
```

**Strategy 5: Game accessibility checklist**

Before shipping each game:
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces game state changes
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Visual information has non-visual alternative
- [ ] Animations respect prefers-reduced-motion
- [ ] Timer countdown has audio or haptic cue (optional)

**Detection warning signs:**
- No ARIA labels on game controls
- No keyboard shortcuts documented
- Color-only coding for correct/wrong answers
- Animations play regardless of prefers-reduced-motion
- No screen reader testing during development

**Phase to address:** Every phase — accessibility is not a feature, it's a requirement

---

### Pitfall 7: Student View Testing Neglect

**What goes wrong:**

Development and testing happen exclusively on teacher view because:
- It's easier to test (no need to open two windows)
- Teacher view has all the controls
- Student view is "just display" (seems simple)

But student view has unique failure modes:
- BroadcastChannel messages arrive in wrong order
- Student laptop/tablet has different screen size
- Projector has ultra-wide aspect ratio, content gets cut off
- Student view doesn't respond to game state changes
- Animations jank on lower-powered devices

**Why it happens:**

Developer workflow: Edit code → Save → Hot reload teacher view → "Looks good!" → Move on.

Opening student window adds friction:
1. Click "Launch Student View"
2. Drag window to projector
3. Test interaction
4. Close student view
5. Repeat for next change

So developers skip it, assuming "if BroadcastChannel sends message, student view will work."

**Consequences:**
- Student view bugs discovered during live classroom demo
- Teacher embarrassment during lesson
- Last-minute "it works on my machine" debugging
- Rollback to previous version mid-class
- Lost trust in new game features

**Prevention:**

**Strategy 1: Always-on student view preview**

Add small student view preview panel in teacher view (like existing slide preview):
```
┌─────────────────────────────┐
│ Teacher Controls            │
│ [Start Game] [Next Q]       │
├─────────────────────────────┤
│ Student View Preview        │
│ ┌─────────────────────────┐ │
│ │ [Miniature student view]│ │
│ │ Updates in real-time    │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Strategy 2: Two-window development setup**

Document standard development workflow:
1. Open teacher view in left monitor
2. Open student view in right monitor (or second browser window)
3. Use React DevTools to inspect both simultaneously
4. Every code change tested in both views before committing

**Strategy 3: Automated student view testing**

```typescript
// Cypress test opens two windows
it('student view syncs with teacher game actions', () => {
  cy.visit('/'); // Teacher view
  cy.window().then(win => {
    const studentWindow = win.open('/', '_blank'); // Student view

    // Teacher starts game
    cy.contains('Start The Chase').click();

    // Verify student view receives message
    cy.wrap(studentWindow).its('document').contains('The Chase: Round 1');
  });
});
```

**Strategy 4: Device testing matrix**

Test student view on:
- [ ] Chrome on MacBook (developer machine)
- [ ] Chrome on Windows laptop (common student device)
- [ ] Safari on iPad (common classroom tablet)
- [ ] Projector at 1920x1080 (classroom display)
- [ ] Projector at 1280x720 (older classroom display)
- [ ] Ultra-wide monitor 21:9 aspect ratio

**Detection warning signs:**
- PRs with game changes but no student view screenshots
- Bug reports starting with "Student view doesn't show..."
- No student view in development screenshots
- Testing notes only mention teacher view
- Student view has different aspect ratio handling than main slides

**Phase to address:**
- Phase 1 (Foundation) — establish student view preview panel
- Every phase — always test student view for every game interaction

---

### Pitfall 8: Grade Level Integration Fragmentation

**What goes wrong:**

Existing app has A-E grade levels for differentiated questioning. New games must integrate with this system, but it's unclear how:

**The Chase:**
- Does chaser get harder questions for higher-grade students?
- Or does chaser always get same difficulty?
- Do A-students get harder questions in chase round?

**Millionaire:**
- Questions 1-5 easy regardless of grade level?
- Or for A-students, question 1 is their "medium" difficulty?
- How does difficulty progression work per grade?

**Beat the Chaser:**
- Each chaser has different difficulty level?
- Or all chasers ask student's grade-level questions?

The pitfall: Building games without clear grade-level integration strategy, leading to:
- Inconsistent difficulty across game formats
- Teacher confusion ("Why is Chase easier than Kahoot for A-students?")
- Duplicate AI generation logic per game
- Difficulty feels arbitrary within same game

**Why it happens:**

Team assumes "we'll figure out grade levels later" and builds games with hardcoded "easy/medium/hard" instead of integrating with existing A-E system. When integration happens, it's bolted on inconsistently per game.

**Consequences:**
- A-students find all games too easy
- E-students can't participate (questions too hard)
- AI generates questions without considering student grade context
- Teacher must manually adjust difficulty mid-game (poor UX)
- Games feel disconnected from classroom differentiation strategy

**Prevention:**

**Strategy 1: Unified difficulty mapping**

Define how A-E grades map to game difficulty at project start:

```typescript
type GradeLevel = 'A' | 'B' | 'C' | 'D' | 'E';

// Grade-to-difficulty mapping (consistent across all games)
const DIFFICULTY_MAPPING: Record<GradeLevel, {
  chase: { player: string; chaser: string };
  millionaire: { early: string; mid: string; late: string };
  beatTheChaser: string;
}> = {
  'A': {
    chase: { player: 'hard', chaser: 'hard' }, // Both at same high level
    millionaire: { early: 'medium', mid: 'hard', late: 'expert' },
    beatTheChaser: 'hard'
  },
  'E': {
    chase: { player: 'easy', chaser: 'medium' }, // Chaser slightly harder
    millionaire: { early: 'easy', mid: 'easy', late: 'medium' },
    beatTheChaser: 'easy'
  },
  // ... B, C, D mappings
};
```

**Strategy 2: Shared AI question generation**

```typescript
// Single function used by all games
async function generateGameQuestions(
  game: 'chase' | 'millionaire' | 'beat-the-chaser',
  studentGrade: GradeLevel,
  lessonContent: string,
  count: number
): Promise<Question[]> {
  const difficultyMapping = DIFFICULTY_MAPPING[studentGrade][game];

  // Generate questions with grade-aware prompts
  const prompt = buildPrompt(game, difficultyMapping, lessonContent, count);
  return await aiService.generateQuestions(prompt);
}
```

**Strategy 3: Teacher control over difficulty**

```typescript
// Before starting game, teacher can adjust difficulty
<div>
  <label>Student Grade Level:</label>
  <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
    <option value="A">A (Analysis/Advanced)</option>
    <option value="B">B (Application)</option>
    <option value="C">C (Understanding)</option>
    <option value="D">D (Knowledge)</option>
    <option value="E">E (Recall/Basic)</option>
  </select>

  <label>
    <input type="checkbox" checked={autoAdjust} onChange={...} />
    Auto-adjust per student (uses class list grades)
  </label>
</div>
```

**Strategy 4: Individual vs class mode**

- **Individual mode:** Each student gets questions for their personal grade level (from class list)
- **Class mode:** Teacher selects one grade level, all students get same questions

**Detection warning signs:**
- Each game has separate difficulty constants
- No reference to existing A-E grade system in game code
- AI prompts hardcode "easy/medium/hard" instead of using grade levels
- Teacher can't see/control grade level during game setup
- Games don't use existing class list with student grades

**Phase to address:**
- Phase 1 (Foundation) — define unified difficulty mapping
- Phase 2 (AI Integration) — grade-aware question generation
- Phase 3 (Polish) — teacher grade control UI

---

### Pitfall 9: Timer Synchronization Drift

**What goes wrong:**

Games use JavaScript timers (`setTimeout`, `setInterval`) for:
- Question countdown (5-30 seconds)
- Lifeline phone-a-friend timer (30 seconds)
- Chase round time pressure

But teacher and student views run independent timers, leading to drift:
- Teacher timer shows 0:03 remaining
- Student view shows 0:00 (already timed out)
- Answer revealed at different times on each screen

Drift compounds over multiple questions:
- Question 1: 0.1s difference
- Question 10: 1.5s difference
- Question 15: 3.2s difference (very noticeable)

From research on [game timing synchronization](https://www.quizshow.io/technology): "When the user submits a question, the time is also submitted to the controller so when the next question is shown, the correct remaining time is displayed."

**Why it happens:**

Each window runs its own `setInterval(1000)` assuming 1000ms = 1 second. But JavaScript timers are not precise:
- Browser throttles background tabs (student view may be 5+ FPS)
- Event loop busy with animations delays timer callbacks
- Different devices have different performance characteristics

Developers test on same machine (minimal drift) and miss the issue until deployed to classroom with student view on different hardware.

**Consequences:**
- Student view timer runs faster/slower than teacher view
- Timeout events trigger at different times
- Game feels "broken" when timers desync
- Drama of countdown ruined by mismatched displays
- Teacher forced to manually end questions early/late

**Prevention:**

**Strategy 1: Teacher-authoritative timing**

Teacher view is source of truth for time:
```typescript
// Teacher view
const startTime = Date.now();
const QUESTION_DURATION = 30000; // 30 seconds

setInterval(() => {
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, QUESTION_DURATION - elapsed);

  // Broadcast remaining time (not countdown delta)
  channel.postMessage({
    action: 'TIMER_UPDATE',
    remaining: remaining,
    startTime: startTime // Student can compute local offset
  });
}, 100); // Update 10x per second for smooth display
```

```typescript
// Student view
let timeOffset = 0; // Computed from teacher's startTime

function handleTimerUpdate(msg: GameMessage) {
  // Sync with teacher's clock
  const teacherElapsed = Date.now() - msg.startTime;
  const expectedRemaining = QUESTION_DURATION - teacherElapsed;
  const actualRemaining = msg.remaining;

  // Correct local timer if drift exceeds threshold
  if (Math.abs(expectedRemaining - actualRemaining) > 500) {
    timeOffset = expectedRemaining - actualRemaining;
  }

  displayRemainingTime(msg.remaining + timeOffset);
}
```

**Strategy 2: Milestone sync points**

```typescript
// Re-sync at key moments to prevent drift accumulation
function startNewQuestion(question: Question) {
  // Hard reset: Teacher sends absolute start time
  channel.postMessage({
    action: 'NEW_QUESTION',
    question: question,
    startTime: Date.now(), // Absolute timestamp
    duration: 30000
  });

  // Student resets local timer to match
}
```

**Strategy 3: Visual tolerance**

Make timer display forgiving:
```typescript
// DON'T: Show every 0.1 second (amplifies drift perception)
<div>{remainingTime.toFixed(1)}s</div>

// DO: Round to whole seconds (hides minor drift)
<div>{Math.ceil(remainingTime)}s</div>

// BEST: Show segments instead of precise countdown
<div className="timer-bar" style={{ width: `${(remainingTime / 30) * 100}%` }} />
```

**Detection warning signs:**
- Student and teacher views run independent `setInterval` timers
- No periodic sync messages for timer state
- Timer drift increases over multiple questions
- No absolute timestamps in timer messages
- Student view timer runs in background tab without visibility check

**Phase to address:**
- Phase 1 (Foundation) — establish teacher-authoritative timer sync
- Phase 2 (Games) — test timer accuracy over 15+ question sequences

---

### Pitfall 10: Feature Parity Obsession

**What goes wrong:**

Team attempts to perfectly replicate TV show features:
- The Chase: Must have multiple chasers with different personalities
- Millionaire: Must have dramatic lighting, sound effects, commercial break mechanics
- Beat the Chaser: Must have complex multi-chaser selection logic

This leads to [feature creep](https://medium.com/@bjr29/avoiding-feature-creep-in-game-development-a292f006688a), defined as "excessive ongoing expansion or addition of new features in a product."

From research: "Many games attempt to replicate more popular titles by adopting recognizable mechanics, but these mechanics aren't always well implemented, resulting in bloated experiences full of long-winded tutorials, half-baked systems, and crowded user interfaces."

**Why it happens:**

Team loves TV shows and wants educational version to feel "authentic." Each feature seems "essential" when proposed:
- "The Chase needs 6 different chasers or it's not really The Chase"
- "Millionaire needs audience clapping sounds or it won't feel right"
- "We should add Ask the Expert lifeline from British version"

But each feature adds complexity, testing burden, and maintenance cost.

**Consequences:**
- Development drags on, MVP never ships
- Core mechanics (question/answer flow) neglected for polish
- Games break because too many features interact
- Student view becomes cluttered with decorative elements
- Teacher overwhelmed by options ("Which chaser? Which lifeline?")

**Prevention:**

**Strategy 1: Define MVP game mechanics**

For each game, identify:
- **Core loop** (must have): Question → Answer → Score → Next Question
- **Format identity** (makes it recognizable): The Chase has catching mechanic, Millionaire has money ladder
- **Decorative** (nice to have): Sound effects, multiple chasers, celebrity voices

**MVP scope per game:**

**The Chase MVP:**
- [x] Single chaser (teacher or AI-controlled)
- [x] Cash builder round (rapid questions)
- [x] Head-to-head chase (player vs chaser on 7-step board)
- [ ] ~~Multiple chasers~~ (defer to v2)
- [ ] ~~Team mode~~ (defer to v2)
- [ ] ~~Final chase~~ (defer to v2)

**Millionaire MVP:**
- [x] 15 questions with progressive difficulty
- [x] Money ladder display
- [x] 50:50 lifeline
- [x] Ask the Audience lifeline (simulated)
- [ ] ~~Phone-a-Friend~~ (defer to v2)
- [ ] ~~Commercial break pause~~ (not needed)
- [ ] ~~Walking away mechanic~~ (defer to v2)

**Beat the Chaser MVP:**
- [x] Single chaser vs student
- [x] Offer mechanic (more time vs less money)
- [ ] ~~Multiple chaser selection~~ (defer to v2)
- [ ] ~~Head start mechanic~~ (defer to v2)

**Strategy 2: "Essentiality test" for features**

Before adding feature, ask:
1. **Can the game be played without it?** → YES = Defer
2. **Will students notice if it's missing?** → NO = Defer
3. **Does it affect learning outcomes?** → NO = Defer
4. **Is it technically complex?** → YES = Defer

Example:
- "Multiple chasers in The Chase": Not essential, students won't notice, doesn't affect learning, moderately complex → **Defer**
- "Answer reveal animation": Essential to game flow, students will notice, doesn't affect learning, low complexity → **Include**

**Strategy 3: Teacher feedback prioritization**

After MVP ships, let teachers request features:
- "We never use Phone-a-Friend, can we get team mode instead?"
- "Students love Beat the Chaser, can we get more chasers?"
- "Millionaire takes too long, can we do 10 questions instead of 15?"

Build what's actually used, not what seems authentic to TV show.

**Detection warning signs:**
- Roadmap includes TV show features not needed for education
- Features estimated but no "defer" column in planning
- Team debates TV show accuracy more than educational value
- Student view cluttered with decorative elements
- Teachers confused by feature options during pilot testing

**Phase to address:**
- Phase 0 (Planning) — define MVP per game, defer rest
- Phase 5 (Post-MVP) — add features based on teacher feedback

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 11: Hardcoded Game Strings

**What goes wrong:**

Game text hardcoded in components:
```typescript
<h1>The Chase</h1>
<button>Use 50:50</button>
<div>Congratulations! You won $1,000,000!</div>
```

Later, teacher requests:
- Change "The Chase" to "Knowledge Chase" (school branding)
- Change "$1,000,000" to "1000 points" (no money in classroom)
- Change "Use 50:50" to "50:50 Lifeline" (clearer for students)

Each change requires code edit, testing, deployment.

**Prevention:**

```typescript
// Game configuration
const GAME_CONFIG = {
  theChase: {
    title: 'The Chase',
    roles: { player: 'Contestant', opponent: 'Chaser' },
    winMessage: 'You escaped the Chaser!',
    loseMessage: 'The Chaser caught you!'
  },
  millionaire: {
    title: 'Who Wants to Be a Millionaire',
    currency: 'points', // or '$'
    amounts: [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000],
    lifelines: {
      fiftyFifty: '50:50',
      askAudience: 'Ask the Audience',
      phoneAFriend: 'Phone a Friend'
    }
  }
};
```

Teachers can customize via settings UI without code changes.

**Detection:** Search codebase for strings like "Chase", "Millionaire", "$" outside of config files.

**Phase to address:** Phase 3 (Polish)

---

### Pitfall 12: No Game State Debugging

**What goes wrong:**

During development, game state becomes corrupted:
- Teacher view shows question 7, student view shows question 5
- Lifeline used but still available
- Score incorrect

Debugging requires:
- Adding `console.log` statements
- Refreshing both windows
- Reproducing bug
- Guessing where state went wrong

**Prevention:**

Add debug panel (dev mode only):
```typescript
{process.env.NODE_ENV === 'development' && (
  <div className="fixed bottom-0 right-0 bg-black/80 text-white p-4 max-w-md overflow-auto">
    <h3>Game State Debug</h3>
    <pre>{JSON.stringify(gameState, null, 2)}</pre>

    <h3>Last 10 Messages</h3>
    {messageLog.map((msg, i) => (
      <div key={i}>{msg.action}: {JSON.stringify(msg.payload)}</div>
    ))}

    <button onClick={resetGameState}>Reset State</button>
    <button onClick={downloadStateDump}>Download State Dump</button>
  </div>
)}
```

**Detection:** No debug tooling visible in development screenshots.

**Phase to address:** Phase 1 (Foundation)

---

### Pitfall 13: Mobile Student View Neglect

**What goes wrong:**

Student view designed for projector (landscape, 16:9) doesn't work on tablets (portrait, 4:3):
- UI elements cut off
- Text too small
- Touch targets too small

**Prevention:**

Responsive design for student view:
```typescript
// Detect orientation
const isPortrait = window.innerHeight > window.innerWidth;

// Adjust layout
<div className={isPortrait ? 'flex-col' : 'flex-row'}>
  {/* Game content */}
</div>
```

Test on iPad in both orientations during development.

**Detection:** No tablet screenshots in testing notes.

**Phase to address:** Phase 3 (Polish)

---

### Pitfall 14: No Game Session Recovery

**What goes wrong:**

Browser crashes or teacher accidentally closes tab mid-game. When reopened:
- Game state lost
- Students still see game on projector
- Teacher must start game over from beginning

**Prevention:**

```typescript
// Auto-save game state to localStorage
useEffect(() => {
  localStorage.setItem('game-state', JSON.stringify(gameState));
}, [gameState]);

// On mount, check for saved game
useEffect(() => {
  const saved = localStorage.getItem('game-state');
  if (saved) {
    const savedState = JSON.parse(saved);
    if (savedState.active && Date.now() - savedState.timestamp < 3600000) {
      // Game was active within last hour
      if (confirm('Resume previous game?')) {
        setGameState(savedState);
      }
    }
  }
}, []);
```

**Detection:** No localStorage persistence for game state.

**Phase to address:** Phase 3 (Polish)

---

## Phase-Specific Warnings

| Phase | Likely Pitfalls | Priority |
|-------|----------------|----------|
| **Phase 1: Foundation** | #1 (Isolated game state silos), #2 (BroadcastChannel ordering), #3 (Code duplication), #8 (Grade level fragmentation) | CRITICAL |
| **Phase 2: Game Implementation** | #4 (AI question quality), #5 (Lifeline complexity), #7 (Student view testing), #9 (Timer drift) | HIGH |
| **Phase 3: Integration** | #6 (Accessibility), #8 (Grade level integration), #10 (Feature parity obsession) | MEDIUM |
| **Phase 4: Polish** | #11 (Hardcoded strings), #12 (Debug tooling), #13 (Mobile support), #14 (Session recovery) | LOW |

---

## Sources

### State Management & Synchronization
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [React Multi-Tab Desync: The Forgotten Problem with BroadcastChannel API](https://dev.to/idanshalem/the-forgotten-problem-why-your-app-breaks-when-you-open-a-second-tab-911)
- [BroadcastChannel spec is vague about asynchronous nature of global list management (GitHub WHATWG Issue #7267)](https://github.com/whatwg/html/issues/7267)
- [How do Multiplayer Game sync their state? Part 2](https://medium.com/@qingweilim/how-do-multiplayer-game-sync-their-state-part-2-d746fa303950)

### Code Quality & Anti-Patterns
- [What Is Code Duplication? Best Tools to Detect & Fix It in 2026](https://www.codeant.ai/blogs/stop-code-duplication-developers-guide)
- [Code duplication anti-pattern, Diagnosis and remediation](https://medium.com/@kooliahmd/code-duplication-anti-pattern-diagnosis-and-treatment-44f8c1555382)
- [How Feature Creep Is Ruining Software, Gadgets, and Video Games](https://www.howtogeek.com/how-feature-creep-is-ruining-software-gadgets-and-video-games/)
- [Avoiding Feature Creep in Game Development](https://medium.com/@bjr29/avoiding-feature-creep-in-game-development-a292f006688a)

### Educational Games & AI
- [Best AI Quiz Makers for Teachers to Use in 2026](https://www.edcafe.ai/blog/free-ai-quiz-makers)
- [The 12 Best AI Quiz Generators & Test Makers in 2026](https://www.ispringsolutions.com/blog/ai-quiz-generators)
- [Blooket vs Gimkit vs Kahoot: Which is Best for Your Classroom?](https://triviamaker.com/blooket-vs-gimkit-vs-kahoot/)

### Game Show Implementations
- [Who Wants to Be a Millionaire Web App GitHub](https://github.com/michael-rutledge/millionaire)
- [The Millionaire Game GitHub](https://github.com/Macronair/TheMillionaireGame)
- [Technology, browser compatibility and requirements for your own gameshow](https://www.quizshow.io/technology)

### Accessibility
- [Building Accessible Educational Games: Lessons from the Front Lines](https://www.filamentgames.com/blog/building-accessible-educational-games-lessons-from-the-front-lines/)
- [New Federal Digital Accessibility Requirements: What Higher Ed Needs to Know (April 24, 2026 deadline)](https://onlinelearningconsortium.org/olc-insights/2025/09/federal-digital-a11y-requirements/)
- [Game Accessibility Guidelines and WCAG 2.0 – A Gap Analysis](https://www.researchgate.net/publication/325978045_Game_Accessibility_Guidelines_and_WCAG_20_-_A_Gap_Analysis)

### Quiz Game Security
- [How to Stop Foul Play: 5 Ways to Prevent Cheating in Quizzes](https://pointerpro.com/blog/how-to-stop-foul-play-5-ways-to-prevent-cheating-in-quizzes/)
- [Top 9 Ways to Prevent Cheating in Online Assessments in 2025](https://www.thetalentgames.com/prevent-cheating-in-online-assessments/)

---

*Research completed: 2026-01-22*
*Confidence: HIGH (existing system architecture) + MEDIUM (game-specific patterns from WebSearch)*
