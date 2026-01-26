# Phase 37: History & Keyboard - Research

**Researched:** 2026-01-26
**Domain:** React keyboard shortcuts, focus management, session state management
**Confidence:** HIGH

## Summary

Phase 37 adds session history tracking and keyboard shortcuts to the existing Ask AI feature in PresentationView. The current implementation already has the foundation: Ask AI state in PresentationView, dropdown UI in the header, and existing arrow key handling that blurs the input to allow slide navigation.

Research reveals three key areas:
1. **Keyboard Shortcuts**: React useEffect + addEventListener pattern is standard, with careful dependency management and cleanup
2. **Focus Management**: useRef<HTMLInputElement> + focus() is the established pattern already used throughout this codebase
3. **Session History**: Simple useState array for Q&A pairs, with clear button - no persistence needed

The codebase already demonstrates best practices for keyboard handling in game components (CashBuilderRound, FinalChaseRound, TimedBattlePhase) and focus management in modals (ClassBankSaveModal, StudentListModal, ClassManagementModal). Arrow key handling for slide navigation already exists - the input currently blurs itself when arrow keys are pressed.

**Primary recommendation:** Follow existing codebase patterns for keyboard event listeners and focus management. Add history state array to PresentationView alongside existing Ask AI state, and implement Cmd/Ctrl+K shortcut with conditional logic to only focus when dropdown is open.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React useEffect | 18.x | Global keyboard listener setup/cleanup | Standard React pattern for DOM event listeners |
| React useRef | 18.x | Input focus management | Type-safe DOM element reference |
| React useState | 18.x | Session history array management | Simple array state for Q&A entries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| KeyboardEvent.metaKey | Native | Detect Cmd (Mac) key | Cross-platform Cmd+K detection |
| KeyboardEvent.ctrlKey | Native | Detect Ctrl (Windows/Linux) key | Cross-platform Cmd+K detection |
| HTMLElement.focus() | Native | Programmatic focus control | Focus input on keyboard shortcut |
| HTMLElement.blur() | Native | Remove focus from element | Return focus to presentation for arrow keys |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom hook | Inline useEffect | Custom hook adds abstraction for single use case - inline is clearer |
| react-hotkeys-hook | Native addEventListener | Adds 5KB dependency for simple Cmd+K - overkill for one shortcut |
| sessionStorage | useState array | History should clear on window close - useState is simpler and matches requirement |

**Installation:**
No new dependencies needed - all patterns use existing React hooks and native browser APIs.

## Architecture Patterns

### Recommended State Structure
Add to PresentationView state section (around line 179-189):

```typescript
// Ask AI state (existing)
const [askAIPanelOpen, setAskAIPanelOpen] = useState(false);
const [askAIInput, setAskAIInput] = useState('');
const [askAIResponse, setAskAIResponse] = useState('');
// ... other Ask AI state ...

// NEW: Ask AI history state
const [askAIHistory, setAskAIHistory] = useState<Array<{
  question: string;
  answer: string;
  timestamp: number;
}>>([]);
const askAIInputRef = useRef<HTMLInputElement>(null);
```

### Pattern 1: Global Keyboard Shortcut Listener
**What:** useEffect with document.addEventListener for global shortcuts
**When to use:** Keyboard shortcuts that work anywhere in the component
**Example:**
```typescript
// Source: Codebase pattern from ClassManagementModal.tsx, GameMenu.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd+K or Ctrl+K to focus Ask AI input
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (!askAIPanelOpen) {
        setAskAIPanelOpen(true);
        // Focus will happen in separate useEffect after panel opens
      } else {
        askAIInputRef.current?.focus();
      }
    }

    // Escape to blur input and return focus to presentation
    if (e.key === 'Escape' && askAIPanelOpen) {
      askAIInputRef.current?.blur();
      // Don't close panel - just remove focus for arrow key navigation
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [askAIPanelOpen]);
```

### Pattern 2: Auto-focus on Panel Open
**What:** useEffect that focuses input when dropdown opens
**When to use:** Focus input automatically when panel becomes visible
**Example:**
```typescript
// Source: Codebase pattern from ClassBankSaveModal.tsx (line 44-46)
useEffect(() => {
  if (askAIPanelOpen && askAIInputRef.current) {
    askAIInputRef.current.focus();
  }
}, [askAIPanelOpen]);
```

### Pattern 3: Arrow Key Passthrough (Already Implemented)
**What:** Input onKeyDown that blurs on arrow keys to allow slide navigation
**When to use:** Prevent input from capturing navigation keys
**Example (existing code at line 1544-1554):**
```typescript
onKeyDown={(e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAskAISend();
  }
  // Allow arrow keys to bubble up for slide navigation
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'PageUp' || e.key === 'PageDown') {
    e.currentTarget.blur();
  }
}}
```

### Pattern 4: Session History Management
**What:** Save Q&A pairs to array on successful response, clear array on demand
**When to use:** Track conversation history during session
**Example:**
```typescript
// In handleAskAISend callback - add after successful response:
if (askAIMountedRef.current) {
  setAskAIHistory(prev => [...prev, {
    question: message,
    answer: fullResponse,
    timestamp: Date.now()
  }]);
  setAskAIIsLoading(false);
  setAskAIIsStreaming(false);
}

// Clear history handler:
const handleClearHistory = useCallback(() => {
  setAskAIHistory([]);
}, []);
```

### Anti-Patterns to Avoid
- **Don't use window.addEventListener**: Use document.addEventListener for consistency with codebase (see ClassManagementModal.tsx line 80)
- **Don't prevent arrow key default**: The current pattern of blurring the input is correct - prevents input capture without preventing slide navigation
- **Don't persist history to localStorage/sessionStorage**: Requirement explicitly states session-only history that clears on close
- **Don't add keyboard shortcuts when panel is closed**: Check panel state to avoid capturing shortcuts when feature not visible

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform Cmd/Ctrl detection | String checking platform | `e.metaKey \|\| e.ctrlKey` | Native KeyboardEvent properties handle Mac/Windows/Linux correctly |
| Focus management library | Custom focus system | `useRef<HTMLInputElement>` + `.focus()` | Native DOM API is sufficient, already used throughout codebase |
| Keyboard shortcut registry | Custom shortcut manager | Inline useEffect with dependencies | Single shortcut doesn't justify abstraction layer |
| History persistence | Custom storage wrapper | `useState<HistoryEntry[]>([])` | Requirement: session-only history, clears on window close |

**Key insight:** This codebase already demonstrates correct patterns for keyboard handling and focus management in 8+ components. Follow established patterns rather than introducing new abstractions.

## Common Pitfalls

### Pitfall 1: Keyboard Listener Dependency Array
**What goes wrong:** Forgetting to include state variables in useEffect dependency array causes stale closures - handler references old state values
**Why it happens:** ESLint exhaustive-deps rule catches this, but developers sometimes disable it
**How to avoid:** Always include state variables referenced in the handler in the dependency array (see Pattern 1 example)
**Warning signs:** Keyboard shortcut doesn't see updated panel state, focuses wrong element

### Pitfall 2: Focus Timing with Conditional Rendering
**What goes wrong:** Trying to focus an element before it renders returns silently - no error, just no focus
**Why it happens:** React batches state updates, so panel may not be in DOM when focus() is called
**How to avoid:** Use separate useEffect that triggers after panel state changes (see Pattern 2)
**Warning signs:** Cmd+K opens panel but doesn't focus input, setTimeout "fixes" it (wrong solution)

### Pitfall 3: Arrow Key Event Propagation
**What goes wrong:** Calling e.stopPropagation() on arrow keys prevents slide navigation entirely
**Why it happens:** Developer thinks they need to stop propagation to handle keys in input
**How to avoid:** Use blur() instead - removes focus so slide navigation listener receives event (already implemented correctly)
**Warning signs:** Arrow keys work in input but don't navigate slides

### Pitfall 4: Keyboard Shortcut Collision
**What goes wrong:** Cmd+K triggers browser search bar or other browser shortcuts
**Why it happens:** Browser shortcuts take precedence unless preventDefault is called
**How to avoid:** Always call `e.preventDefault()` after detecting Cmd+K (see Pattern 1)
**Warning signs:** Browser search opens instead of focusing input

### Pitfall 5: Memory Leak from Missing Cleanup
**What goes wrong:** Event listeners accumulate on every re-render, causing multiple handler invocations
**Why it happens:** Forgetting return cleanup function in useEffect
**How to avoid:** Always return cleanup function that removes listener (see Pattern 1)
**Warning signs:** Shortcut triggers multiple times, memory usage grows over time

### Pitfall 6: History Grows Unbounded
**What goes wrong:** Long presentation sessions accumulate thousands of history entries, causing memory issues
**Why it happens:** No limit on history array size
**How to avoid:** Not a concern for v1 (history clears on session end), but could limit to last 50 entries if needed
**Warning signs:** Presentation becomes sluggish after many Q&A interactions

## Code Examples

### Complete Keyboard Shortcut Implementation
```typescript
// Source: Adapted from ClassManagementModal.tsx and GameMenu.tsx patterns
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd+K or Ctrl+K to focus Ask AI input
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (!askAIPanelOpen) {
        setAskAIPanelOpen(true);
      } else {
        askAIInputRef.current?.focus();
      }
    }

    // Escape to blur input (allows arrow keys to navigate slides)
    if (e.key === 'Escape' && document.activeElement === askAIInputRef.current) {
      askAIInputRef.current?.blur();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [askAIPanelOpen]);
```

### Auto-focus Input on Panel Open
```typescript
// Source: ClassBankSaveModal.tsx line 44-46
useEffect(() => {
  if (askAIPanelOpen && askAIInputRef.current) {
    askAIInputRef.current.focus();
  }
}, [askAIPanelOpen]);
```

### History State and Handlers
```typescript
// State definition (add to PresentationView state section)
const [askAIHistory, setAskAIHistory] = useState<Array<{
  question: string;
  answer: string;
  timestamp: number;
}>>([]);
const askAIInputRef = useRef<HTMLInputElement>(null);

// Add to handleAskAISend (after successful streaming completes)
if (askAIMountedRef.current) {
  setAskAIHistory(prev => [...prev, {
    question: message,
    answer: fullResponse,
    timestamp: Date.now()
  }]);
  setAskAIIsLoading(false);
  setAskAIIsStreaming(false);
}

// Clear history handler
const handleClearHistory = useCallback(() => {
  setAskAIHistory([]);
}, []);
```

### History UI Component
```typescript
// Add to Ask AI dropdown panel (after response display)
{askAIHistory.length > 0 && (
  <div className="mt-3 border-t border-slate-700 pt-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        History ({askAIHistory.length})
      </span>
      <button
        onClick={handleClearHistory}
        className="text-xs text-slate-400 hover:text-white"
      >
        Clear
      </button>
    </div>
    <div className="max-h-64 overflow-y-auto space-y-2">
      {askAIHistory.map((entry, idx) => (
        <div key={entry.timestamp} className="bg-slate-700/30 rounded p-2 text-xs">
          <div className="text-slate-300 font-medium mb-1">Q: {entry.question}</div>
          <div className="text-slate-400 line-clamp-2">A: {entry.answer}</div>
        </div>
      ))}
    </div>
  </div>
)}
```

### Input with Ref
```typescript
// Modify existing input (around line 1540) to add ref
<input
  ref={askAIInputRef}  // NEW
  type="text"
  value={askAIInput}
  onChange={(e) => setAskAIInput(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAISend();
    }
    // Arrow key handling (existing - keep as-is)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'PageUp' || e.key === 'PageDown') {
      e.currentTarget.blur();
    }
  }}
  placeholder="Ask AI anything about this lesson..."
  disabled={askAIIsLoading || askAIIsStreaming}
  className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom keyboard hooks | Inline useEffect | 2024-2025 | Custom hooks fell out of favor for single-use cases - adds abstraction without reuse benefit |
| react-hotkeys library | Native addEventListener | 2025 | Modern React prioritizes fewer dependencies - native APIs sufficient for most use cases |
| Context for keyboard state | Local component state | 2024-2025 | Keyboard shortcuts are component-scoped - Context adds unnecessary complexity |
| stopPropagation() for inputs | blur() for navigation keys | 2024-2025 | Blur pattern is cleaner - explicitly yields control rather than blocking propagation |

**Deprecated/outdated:**
- **react-hotkeys (v2)**: No longer maintained, use react-hotkeys-hook or native addEventListener
- **Window.event**: Use event parameter in modern event handlers
- **event.keyCode**: Deprecated, use event.key (returns string like 'k', 'Escape', 'ArrowLeft')

## Open Questions

### Q1: Should history entries be expandable?
**What we know:** Current code example uses line-clamp-2 for answer preview
**What's unclear:** Whether teachers need to expand entries to see full answer or if preview is sufficient
**Recommendation:** Start with preview only (simpler UI). If user feedback requests expansion, add toggle in later iteration.

### Q2: Should Cmd+K work when panel is already open?
**What we know:** Pattern 1 focuses input when panel open, opens panel when closed
**What's unclear:** Expected behavior if input already focused
**Recommendation:** Make Cmd+K idempotent - always focuses input, opens panel if needed. Harmless to call focus() on already-focused element.

### Q3: Should Escape close the panel or just blur input?
**What we know:** Arrow key handling requires blurring input to enable slide navigation
**What's unclear:** User expectation for Escape key
**Recommendation:** Escape should blur input but NOT close panel. Teacher can still use mouse to close panel. This matches "quick access" use case - Cmd+K focuses, Escape returns to slides, panel stays visible.

### Q4: Should history be ordered newest-first or oldest-first?
**What we know:** Array.push adds to end (oldest-first rendering)
**What's unclear:** User preference for chronological order
**Recommendation:** Newest-first (reverse order in render). Most recent Q&A is most relevant for current slide context.

## Sources

### Primary (HIGH confidence)
- Codebase patterns:
  - `/Users/ricky/Documents/App_Projects/Education Apps/DEV - PiPi/components/PresentationView.tsx` (lines 179-189, 1544-1554) - Ask AI state and arrow key handling
  - `/Users/ricky/Documents/App_Projects/Education Apps/DEV - PiPi/components/ClassManagementModal.tsx` (lines 67-82) - Escape key pattern
  - `/Users/ricky/Documents/App_Projects/Education Apps/DEV - PiPi/components/ClassBankSaveModal.tsx` (lines 41-46) - Focus management pattern
  - `/Users/ricky/Documents/App_Projects/Education Apps/DEV - PiPi/components/games/the-chase/CashBuilderRound.tsx` (lines 60-68) - Global keyboard shortcut pattern
  - `/Users/ricky/Documents/App_Projects/Education Apps/DEV - PiPi/types.ts` - TypeScript type patterns

### Secondary (MEDIUM confidence)
- [Implementing Keyboard Shortcuts with React Hooks](https://www.fullstack.com/labs/resources/blog/keyboard-shortcuts-with-react-hooks) - useEffect + addEventListener pattern
- [How to autofocus using React Hooks - LogRocket](https://blog.logrocket.com/how-to-autofocus-using-react-hooks/) - useRef + useEffect focus management
- [React official docs - Responding to Events](https://react.dev/learn/responding-to-events) - Event handling best practices
- [State Management in 2026 - Nucamp](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - useState vs Context tradeoffs

### Tertiary (LOW confidence - general guidance only)
- [React useState with History - DEV Community](https://dev.to/zirkelc/react-usestate-with-history-2m5f) - History state patterns (custom hook approach not adopted)
- [Event bubbling and capturing in React - LogRocket](https://blog.logrocket.com/event-bubbling-capturing-react/) - stopPropagation vs blur tradeoffs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All patterns already used in codebase, no new dependencies
- Architecture: HIGH - Following established codebase patterns for keyboard and focus management
- Pitfalls: HIGH - Based on codebase review and verified web sources

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable React patterns, no fast-moving dependencies)

**Implementation notes:**
- Total additions: ~80 lines as estimated
  - State: 5 lines (history array + input ref)
  - Keyboard shortcut useEffect: 15 lines
  - Auto-focus useEffect: 5 lines
  - History handlers: 10 lines
  - History UI component: 35 lines
  - Input ref modification: 1 line
- No TypeScript type additions needed (inline object type for history entries)
- Follows all existing codebase conventions (spacing, naming, comment style)
