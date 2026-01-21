# Phase 17: Targeting Mode - Research

**Researched:** 2026-01-22
**Domain:** React component state management, student cycling algorithms, teleprompter UI
**Confidence:** HIGH

## Summary

Phase 17 implements a targeting mode feature in the teleprompter that allows teachers to switch between Manual mode (current behavior: 5 difficulty buttons A-E) and Targeted mode (single Question button that cycles through students). The core technical challenges are:

1. **Mode toggle UI** - A toggle switch in the teleprompter panel to switch between Manual/Targeted modes
2. **Student cycling algorithm** - Fair randomized cycling through all students in the class
3. **State management** - Tracking which students have been asked, with reset on slide navigation
4. **UI transitions** - Conditionally showing different button sets based on mode

The codebase already has established patterns for toggle switches (peer checkbox with Tailwind styling), existing question generation logic (`handleGenerateQuestion`), and student data structures with grades (`studentData` in class bank).

**Primary recommendation:** Use component-local state management with `useState` for mode toggle and cycling state. Implement Fisher-Yates shuffle for fair randomization. Reset tracking state via `useEffect` when `currentIndex` changes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.x | UI framework | Already in use |
| Tailwind CSS | 3.x | Styling (toggle switch) | Already in use, has established toggle pattern in codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Built-in Math.random | N/A | Random number generation | Fisher-Yates shuffle |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useState | useReducer | useReducer better for complex interdependent state, but useState sufficient here since cycling state is relatively simple (array + index) |
| Component state | Context API | Overkill for state contained within PresentationView |
| Custom toggle | react-switch | Adding dependency for component already implemented in codebase |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Recommended State Structure
```typescript
// Cycling state - lives in PresentationView
interface CyclingState {
  // Map of grade level -> shuffled student order
  shuffledStudents: Map<GradeLevel, string[]>;
  // Map of grade level -> index into shuffled array (how many asked)
  currentIndex: Map<GradeLevel, number>;
}

// For Targeted mode (all students, no grade filtering)
interface TargetedCyclingState {
  shuffledOrder: string[];     // All students in random order
  currentIndex: number;        // Index of next student
  askedStudents: Set<string>;  // Track who's been asked (for manual marking)
}
```

### Pattern 1: Toggle Switch (Existing Pattern)
**What:** Peer checkbox with screen-reader-only input and visual div
**When to use:** Binary mode selection with visual feedback
**Example:**
```tsx
// Source: App.tsx lines 984-991 (existing pattern in codebase)
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    className="sr-only peer"
    checked={isTargetedMode}
    onChange={() => setIsTargetedMode(!isTargetedMode)}
  />
  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-amber-500"></div>
</label>
```

### Pattern 2: Fisher-Yates Shuffle
**What:** In-place O(n) unbiased shuffle algorithm
**When to use:** Creating randomized student order
**Example:**
```typescript
// Source: Wikipedia Fisher-Yates, verified pattern
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]; // Don't mutate original
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### Pattern 3: Conditional Button Rendering
**What:** Show different UI based on mode state
**When to use:** Toggle between Manual (5 buttons) and Targeted (1 button + preview)
**Example:**
```tsx
{isTargetedMode ? (
  <TargetedModeUI
    nextStudent={nextStudent}
    onQuestion={handleTargetedQuestion}
    onSkip={handleSkip}
  />
) : (
  <ManualModeUI onQuestion={handleGenerateQuestion} />
)}
```

### Pattern 4: Effect-Based Reset
**What:** Reset state when slide changes
**When to use:** CYCL-04 requirement - reset tracking on slide navigation
**Example:**
```tsx
// Reset cycling state when slide changes
useEffect(() => {
  if (isTargetedMode) {
    // Reshuffle and reset index
    setCyclingState(initializeCycling(studentData));
  }
}, [currentIndex]); // Dependency on slide index
```

### Anti-Patterns to Avoid
- **Mutating arrays directly:** Always create new array with spread or map for React state
- **Using sort with random comparator:** `arr.sort(() => Math.random() - 0.5)` is biased - use Fisher-Yates
- **Storing derived state:** Don't store "isAllAsked" - compute from index vs array length
- **Global state for local concern:** Cycling state is scoped to PresentationView, don't lift to App

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shuffle algorithm | Custom random selection | Fisher-Yates | Naive approaches have statistical bias |
| Toggle switch styling | Custom CSS from scratch | Existing peer checkbox pattern | Already proven in codebase (App.tsx) |
| Unique student detection | Manual duplicate check | `Set<string>` | Built-in deduplication |

**Key insight:** The existing codebase has a shuffle implementation in PresentationView (`studentAssignments` useMemo, lines 394-411). The pattern works but should be extracted to a reusable utility.

## Common Pitfalls

### Pitfall 1: Stale Closure in Callbacks
**What goes wrong:** Skip/Question handlers capture old cycling state
**Why it happens:** Callback closures created on first render don't see updated state
**How to avoid:** Use functional updates: `setCyclingState(prev => ...)` or ensure handlers recreate with proper deps
**Warning signs:** Clicking buttons seems to skip students or select wrong ones

### Pitfall 2: Race Condition on Mode Toggle
**What goes wrong:** Toggle during active question generation causes inconsistent state
**Why it happens:** Async question generation completes after mode changed
**How to avoid:** Either disable toggle during generation, or check mode in callback before applying result
**Warning signs:** Question appears with wrong student name after quick toggle

### Pitfall 3: Empty Student Array Edge Case
**What goes wrong:** Division by zero or undefined access when no students loaded
**Why it happens:** Cycling logic assumes students exist
**How to avoid:** Guard with early return or disabled state when `studentData.length === 0`
**Warning signs:** Crash or blank state when no class loaded

### Pitfall 4: Missing Grade Assignment
**What goes wrong:** Targeted mode breaks when student has no grade assigned
**Why it happens:** `studentData.grade` can be `null`
**How to avoid:** Per CONTEXT.md decision: "Prompt to assign grades before using Targeted mode"
**Warning signs:** Unable to determine question difficulty for student

### Pitfall 5: Cycle Completion Edge Case
**What goes wrong:** Single student repeated immediately after "reshuffle"
**Why it happens:** Reshuffle of 1-element array is same order
**How to avoid:** Per CONTEXT.md: "Single student: Works normally (same student shown every time)" - this is expected behavior
**Warning signs:** None - this is acceptable per requirements

## Code Examples

Verified patterns from official sources:

### Initializing Cycling State
```typescript
// Initialize shuffled order from student data
function initializeCycling(studentData: StudentWithGrade[]): TargetedCyclingState {
  const studentsWithGrades = studentData.filter(s => s.grade !== null);

  if (studentsWithGrades.length === 0) {
    return { shuffledOrder: [], currentIndex: 0, askedStudents: new Set() };
  }

  return {
    shuffledOrder: shuffleArray(studentsWithGrades.map(s => s.name)),
    currentIndex: 0,
    askedStudents: new Set(),
  };
}
```

### Getting Next Student
```typescript
// Get next student and their grade
function getNextStudent(
  cyclingState: TargetedCyclingState,
  studentData: StudentWithGrade[]
): { name: string; grade: GradeLevel } | null {
  const { shuffledOrder, currentIndex } = cyclingState;

  if (shuffledOrder.length === 0 || currentIndex >= shuffledOrder.length) {
    return null;
  }

  const name = shuffledOrder[currentIndex];
  const student = studentData.find(s => s.name === name);

  return student && student.grade ? { name, grade: student.grade } : null;
}
```

### Advancing to Next Student (with auto-reshuffle)
```typescript
// Advance cycling state, reshuffle if cycle complete
function advanceCycling(
  prev: TargetedCyclingState,
  studentData: StudentWithGrade[]
): TargetedCyclingState {
  const newIndex = prev.currentIndex + 1;

  // If we've asked everyone, reshuffle and restart
  if (newIndex >= prev.shuffledOrder.length) {
    return initializeCycling(studentData);
  }

  return {
    ...prev,
    currentIndex: newIndex,
    askedStudents: new Set([...prev.askedStudents, prev.shuffledOrder[prev.currentIndex]]),
  };
}
```

### Skip Student Handler
```typescript
// Skip marks student as asked but doesn't generate question
const handleSkip = () => {
  setCyclingState(prev => advanceCycling(prev, studentData));
};
```

### Tappable Counter with Expand
```typescript
// Counter that expands to show student list
const [isCounterExpanded, setIsCounterExpanded] = useState(false);

<button
  onClick={() => setIsCounterExpanded(!isCounterExpanded)}
  className="text-xs text-slate-400 hover:text-slate-300"
>
  {cyclingState.currentIndex} of {cyclingState.shuffledOrder.length} students asked
</button>

{isCounterExpanded && (
  <div className="mt-2 p-2 bg-slate-800 rounded-lg max-h-40 overflow-y-auto">
    {cyclingState.shuffledOrder.map((name, idx) => (
      <div key={name} className="flex items-center gap-2 text-xs">
        {idx < cyclingState.currentIndex ? '✓' : '○'}
        <span>{name}</span>
      </div>
    ))}
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Array.sort(() => Math.random() - 0.5) | Fisher-Yates shuffle | Always better | Unbiased randomization |
| Multiple useState | Single useState with object | React 18+ | Batched updates, cleaner code |
| Prop drilling | Component composition | React patterns | Simpler state flow |

**Deprecated/outdated:**
- None identified - patterns used are current React 19 best practices

## Open Questions

Things that couldn't be fully resolved:

1. **Toggle placement in UI**
   - What we know: Should be in teleprompter panel, per CONTEXT.md is Claude's discretion
   - What's unclear: Exact positioning - above buttons? In header?
   - Recommendation: Place between "Presenter Console" label and button grid, with labels "Manual" and "Targeted"

2. **Progress counter styling**
   - What we know: Should be visible, tappable to expand
   - What's unclear: Exact visual treatment to match existing UI
   - Recommendation: Use slate-400 text styling consistent with existing teleprompter elements

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis (PresentationView.tsx, App.tsx, types.ts, useClassBank.ts)
- React 19 documentation (useState, useEffect patterns)
- Phase 17 CONTEXT.md (locked decisions)

### Secondary (MEDIUM confidence)
- [Fisher-Yates Shuffle - Wikipedia](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle) - Algorithm correctness
- [Radix UI Primitives - Accordion](https://www.radix-ui.com/primitives/docs/components/accordion) - Expandable panel patterns
- [Kent C. Dodds - useState vs useReducer](https://kentcdodds.com/blog/should-i-usestate-or-usereducer) - State management decision

### Tertiary (LOW confidence)
- [ReactScript - Toggle Switch Components](https://reactscript.com/best-toggle-switch/) - General patterns (codebase already has proven pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, using existing patterns
- Architecture: HIGH - Patterns exist in codebase, well-understood React patterns
- Pitfalls: HIGH - Based on direct code analysis and common React gotchas
- Code examples: HIGH - Derived from existing codebase patterns and verified algorithms

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (stable patterns, no external API changes expected)
