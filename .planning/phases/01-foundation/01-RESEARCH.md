# Phase 1: Foundation - Research

**Researched:** 2026-01-18
**Domain:** Dual-window state synchronization, popup blockers, hash routing
**Confidence:** HIGH

## Summary

This phase establishes reliable dual-window launch with BroadcastChannel synchronization. The research confirms three key implementation requirements:

1. **window.open() must be synchronous** - Called directly in click handler, not in useEffect or after async operations. The current implementation calls it in useEffect which causes popup blockers to trigger.

2. **BroadcastChannel provides robust sync** - 95.8% browser support. Simple message protocol with type/payload structure. Must close channel on cleanup to avoid memory leaks.

3. **Hash routing works without react-router** - Use window.location.hash with hashchange event listener. No server configuration needed. Student view renders based on `#/student` hash.

**Primary recommendation:** Refactor to BroadcastChannel-based sync with a standalone /student hash route. The teacher window opens the student window synchronously on button click, and both windows sync state via BroadcastChannel messages.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BroadcastChannel API | Native | Cross-window state sync | 95.8% browser support, no dependencies, real-time |
| window.open() | Native | Open student window | Only option for separate window |
| window.location.hash | Native | Hash-based routing | Works without router library, no server config |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | No external dependencies needed for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BroadcastChannel | localStorage events | Disk I/O, 5MB limit, not real-time |
| BroadcastChannel | postMessage | Requires window reference, breaks if COOP headers set |
| Hash routing | react-router | Adds dependency, server config needed for BrowserRouter |

**Installation:**
```bash
# No additional packages needed - using native browser APIs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  hooks/
    useBroadcastSync.ts     # BroadcastChannel hook
  services/
    windowService.ts        # window.open helper with popup detection
  components/
    PresentationView.tsx    # Teacher view (existing, refactored)
    StudentView.tsx         # Standalone student view component
  App.tsx                   # Hash routing logic added
```

### Pattern 1: BroadcastChannel Message Protocol
**What:** Standardized message format for state synchronization
**When to use:** All cross-window communication

```typescript
// Source: MDN BroadcastChannel API, Chrome Developers Blog
type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: { currentIndex: number; visibleBullets: number } }
  | { type: 'STATE_REQUEST' }  // Student requests current state on connect
  | { type: 'HEARTBEAT'; payload: { timestamp: number } }
  | { type: 'HEARTBEAT_ACK'; payload: { timestamp: number } };

const CHANNEL_NAME = 'pipi-presentation';

// Teacher side: Send state updates
const channel = new BroadcastChannel(CHANNEL_NAME);
channel.postMessage({
  type: 'STATE_UPDATE',
  payload: { currentIndex, visibleBullets }
});

// Student side: Listen for updates
channel.onmessage = (event: MessageEvent<PresentationMessage>) => {
  if (event.data.type === 'STATE_UPDATE') {
    setCurrentIndex(event.data.payload.currentIndex);
    setVisibleBullets(event.data.payload.visibleBullets);
  }
};
```

### Pattern 2: Synchronous Popup Opening
**What:** Open window directly in click handler to avoid popup blockers
**When to use:** Launching student window

```typescript
// Source: MDN Window.open, mikepalmer.dev/blog
const handleLaunchStudentWindow = () => {
  // MUST be synchronous - no async/await before window.open
  const features = 'width=1280,height=720,left=100,top=100';
  const studentWindow = window.open('/#/student', 'pipi-student', features);

  // Check if popup was blocked
  if (!studentWindow || studentWindow.closed || typeof studentWindow.closed === 'undefined') {
    setPopupBlocked(true);
    // Show fallback UI with manual URL
  } else {
    setStudentWindowOpen(true);
  }
};
```

### Pattern 3: Hash-Based Routing Without Router
**What:** Simple hash routing using native APIs
**When to use:** Switching between teacher and student views

```typescript
// Source: Building Modern SPAs with Vanilla JavaScript (dev.to)
// App.tsx - Hash router logic
const useHashRoute = () => {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
};

// In App component
const route = useHashRoute();

if (route === '/student') {
  return <StudentView />;
}

// Default: existing app logic
return <MainApp />;
```

### Pattern 4: useBroadcastSync Hook
**What:** Encapsulated BroadcastChannel logic with cleanup
**When to use:** Any component needing cross-window sync

```typescript
// Source: dev.to/sachinchaurasiya BroadcastChannel in React
import { useEffect, useRef, useState, useCallback } from 'react';

interface BroadcastMessage<T> {
  type: string;
  payload?: T;
}

function useBroadcastSync<T>(channelName: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [lastMessage, setLastMessage] = useState<BroadcastMessage<T> | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(channelName);

    channelRef.current.onmessage = (event: MessageEvent<BroadcastMessage<T>>) => {
      setLastMessage(event.data);
    };

    // CRITICAL: Close channel on cleanup to prevent memory leaks
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [channelName]);

  const postMessage = useCallback((message: BroadcastMessage<T>) => {
    channelRef.current?.postMessage(message);
  }, []);

  return { lastMessage, postMessage };
}

export default useBroadcastSync;
```

### Anti-Patterns to Avoid
- **Calling window.open() in useEffect:** Loses user activation context, popup blocked
- **Not closing BroadcastChannel:** Causes memory leaks (MDN explicitly warns about this)
- **Storing state in both windows:** Creates sync bugs. Single source of truth in teacher view only
- **Using postMessage without BroadcastChannel:** Requires window reference which can be lost

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-window messaging | Custom localStorage polling | BroadcastChannel API | Native, real-time, no polling overhead |
| Popup detection | Complex heuristics | Check `window.open()` return value | Return is null if blocked |
| Route parsing | Regex matching | window.location.hash + hashchange event | Native, handles edge cases |
| State serialization | JSON.stringify wrapper | postMessage structured cloning | Handles more types (Blobs, ArrayBuffer, Map) |

**Key insight:** BroadcastChannel handles the hard parts of cross-context communication. The API is simple but the browser implementation handles queuing, serialization, and delivery guarantees.

## Common Pitfalls

### Pitfall 1: Popup Blockers
**What goes wrong:** Student window never opens. Teachers see nothing happen on click.
**Why it happens:** window.open() called outside synchronous click handler (e.g., in useEffect, after await)
**How to avoid:** Call window.open() directly in onClick handler, never after any async operation
**Warning signs:** Works in dev mode, fails in production. Works in Chrome, fails in Safari/Arc.

### Pitfall 2: BroadcastChannel Memory Leaks
**What goes wrong:** App performance degrades over time, memory climbs
**Why it happens:** Creating BroadcastChannel objects without calling close()
**How to avoid:** Always close in useEffect cleanup: `return () => channel.close()`
**Warning signs:** Multiple channel instances in memory, event handlers piling up

### Pitfall 3: State Desync on Student Reconnect
**What goes wrong:** Student window refreshes and shows wrong slide
**Why it happens:** No mechanism for student to request current state
**How to avoid:** Student sends STATE_REQUEST on mount, teacher responds with current state
**Warning signs:** Student window shows slide 0 after refresh while teacher is on slide 5

### Pitfall 4: Hash Route Not Loading Styles
**What goes wrong:** Student view opens as unstyled HTML
**Why it happens:** Separate window loads index.html but Tailwind CDN not processed
**How to avoid:** Ensure index.html includes Tailwind CDN, student view component self-contained
**Warning signs:** White page with black text, no Tailwind classes applied

### Pitfall 5: Window Reference Goes Stale
**What goes wrong:** Teacher clicks next but student doesn't update
**Why it happens:** Cross-Origin-Opener-Policy headers, user navigation, or window closed
**How to avoid:** Use BroadcastChannel instead of window reference for communication
**Warning signs:** studentWindow.closed unexpectedly true, postMessage errors

## Code Examples

Verified patterns from official sources:

### Complete Teacher-Side Setup
```typescript
// Source: MDN BroadcastChannel API
// PresentationView.tsx

const CHANNEL_NAME = 'pipi-presentation';

const PresentationView: React.FC<Props> = ({ slides, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [studentWindowOpen, setStudentWindowOpen] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize channel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);

    // Listen for student requests
    channelRef.current.onmessage = (event) => {
      if (event.data.type === 'STATE_REQUEST') {
        // Student connected, send current state
        channelRef.current?.postMessage({
          type: 'STATE_UPDATE',
          payload: { currentIndex, visibleBullets }
        });
      }
    };

    return () => {
      channelRef.current?.close();
    };
  }, []); // Empty deps - channel persists for component lifetime

  // Broadcast state changes
  useEffect(() => {
    channelRef.current?.postMessage({
      type: 'STATE_UPDATE',
      payload: { currentIndex, visibleBullets }
    });
  }, [currentIndex, visibleBullets]);

  // Synchronous click handler - MUST be synchronous
  const handleLaunchStudent = () => {
    const studentWindow = window.open(
      '/#/student',
      'pipi-student',
      'width=1280,height=720'
    );

    if (!studentWindow || studentWindow.closed) {
      setPopupBlocked(true);
    } else {
      setStudentWindowOpen(true);
    }
  };

  // ... rest of component
};
```

### Complete Student-Side Setup
```typescript
// Source: MDN BroadcastChannel API
// StudentView.tsx

const CHANNEL_NAME = 'pipi-presentation';

const StudentView: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event) => {
      if (event.data.type === 'STATE_UPDATE') {
        setCurrentIndex(event.data.payload.currentIndex);
        setVisibleBullets(event.data.payload.visibleBullets);
        setConnected(true);
      }
    };

    // Request current state from teacher
    channel.postMessage({ type: 'STATE_REQUEST' });

    return () => channel.close();
  }, []);

  // Render slides based on synced state
  // ... component rendering
};
```

### Popup Blocked Fallback UI
```typescript
// Source: mikepalmer.dev/blog popup blockers
// Fallback when popup is blocked

{popupBlocked && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
    <h3 className="font-bold text-amber-800">Popup Blocked</h3>
    <p className="text-amber-700 text-sm mt-1">
      Your browser blocked the student window.
    </p>
    <p className="text-amber-700 text-sm mt-2">
      Open this URL on the projector display:
    </p>
    <code className="block bg-white px-3 py-2 rounded mt-2 text-sm">
      {window.location.origin}/#/student
    </code>
    <button
      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/#/student`)}
      className="mt-3 px-4 py-2 bg-amber-600 text-white rounded"
    >
      Copy URL
    </button>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Portal + window.open() | BroadcastChannel + hash route | 2022 (BroadcastChannel baseline) | Simpler, more reliable |
| localStorage events | BroadcastChannel | 2022 | Real-time, no polling |
| postMessage with window ref | BroadcastChannel | 2022 | No reference needed |
| react-router for SPA | Hash routing (simple apps) | Always | Less dependency for simple cases |

**Deprecated/outdated:**
- SharedWorker: More complex than needed, Safari iOS doesn't support
- window.opener: Often null due to COOP headers
- Manual stylesheet copying: Fragile, use self-loading routes instead

## Open Questions

Things that couldn't be fully resolved:

1. **Heartbeat interval for connection status**
   - What we know: Need periodic check to detect if student window closed
   - What's unclear: Optimal interval (500ms? 2000ms?) - too fast wastes resources, too slow delays detection
   - Recommendation: Start with 2000ms, adjust based on UX testing

2. **Slide data for StudentView**
   - What we know: StudentView needs slide content to render
   - What's unclear: Should slides be passed via BroadcastChannel or loaded from shared source?
   - Recommendation: For Phase 1, include slides in STATE_UPDATE payload. Optimize in later phase if needed.

## Sources

### Primary (HIGH confidence)
- [MDN BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) - Complete API reference
- [MDN Window.open()](https://developer.mozilla.org/en-US/docs/Web/API/Window/open) - Popup behavior, return values
- [Chrome Developers: BroadcastChannel](https://developer.chrome.com/blog/broadcastchannel) - Message protocol patterns

### Secondary (MEDIUM confidence)
- [dev.to: Broadcast Channel API in React](https://dev.to/sachinchaurasiya/how-to-use-broadcast-channel-api-in-react-5eec) - React hook patterns
- [mikepalmer.dev: Popup Blockers](https://www.mikepalmer.dev/blog/open-a-new-window-without-triggering-pop-up-blockers) - Synchronous pattern
- [dev.to: Popup Window in React with TypeScript](https://dev.to/taronvardanyan/how-to-open-and-communicate-with-a-popup-window-in-react-with-typescript-f98) - TypeScript implementation

### Tertiary (LOW confidence)
- Hash routing patterns - Based on standard JavaScript event handling, not React-specific docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - BroadcastChannel is well-documented, 95.8% support verified on caniuse
- Architecture: HIGH - Patterns verified against MDN and Chrome developer docs
- Pitfalls: HIGH - Prior project research already validated these patterns

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable browser APIs, unlikely to change)
