# Architecture Patterns: Browser-Based Dual-Monitor Presentation System

**Domain:** Multi-window state synchronization for presentation apps
**Researched:** 2026-01-18
**Confidence:** HIGH (BroadcastChannel, React Portals) | MEDIUM (Window Management API - experimental)

## Executive Summary

Building a dual-monitor presentation system in a browser-based React app requires solving three core problems: (1) state synchronization between teacher and student windows, (2) window lifecycle management, and (3) cross-window styling. The current PiPi implementation uses `window.open()` + `createPortal()` which provides shared state but has CSS injection issues and no display targeting. The recommended architecture uses **BroadcastChannel for state sync** with the existing portal pattern, plus graceful enhancement with the **Window Management API** for display placement.

## Current Architecture Analysis

### What PiPi Has Today

```
App.tsx (centralized state)
    |
    +-- PresentationView.tsx
            |
            +-- Teacher View (main window)
            |       - Slide preview
            |       - Speaker notes
            |       - Controls
            |
            +-- StudentWindow (createPortal to window.open)
                    - SlideContentRenderer
                    - Shares state via React tree
```

**Strengths:**
- State is already centralized in PresentationView
- `createPortal` means child window IS part of React tree - props flow naturally
- `currentIndex` and `visibleBullets` already control both views

**Weaknesses:**
1. CSS injection is manual and fragile (copying stylesheets in useEffect)
2. No awareness of which monitor to place student window on
3. Window positioning uses hardcoded `width=800,height=600,left=200,top=200`
4. If student window is opened before styles load, rendering breaks
5. No recovery if student window is accidentally closed and reopened

## Recommended Architecture

### Component Boundaries

```
+------------------------------------------+
|              App.tsx                      |
|  (Global state: slides, lessonTitle)     |
+------------------------------------------+
              |
              v
+------------------------------------------+
|       PresentationController.tsx         |  <-- NEW: Orchestrates presentation
|  - Owns: currentIndex, visibleBullets    |
|  - Owns: BroadcastChannel                |
|  - Owns: Window lifecycle                |
+------------------------------------------+
       |                    |
       v                    v
+----------------+  +------------------------+
| TeacherView    |  | StudentWindowManager   |  <-- NEW: Window lifecycle
|  (same window) |  |  - Opens/manages window|
|  - Controls    |  |  - Injects styles      |
|  - Notes       |  |  - Handles close/reopen|
+----------------+  +------------------------+
                              |
                              v (createPortal)
                    +------------------------+
                    | StudentView            |
                    |  - SlideContentRenderer|
                    |  - Pure presentation   |
                    +------------------------+
```

### State Synchronization: BroadcastChannel

**Why BroadcastChannel over alternatives:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| React Portal (current) | Shared state automatically | CSS issues, tight coupling | Keep for rendering |
| BroadcastChannel | 95.8% browser support, simple API, real-time | No state persistence | **Use for sync** |
| SharedWorker | Centralized state, WebSocket sharing | No Safari iOS, complex | Overkill for this |
| localStorage events | Universal support | Disk I/O, hacky, not real-time | Fallback only |

**Recommended Pattern: Portal + BroadcastChannel hybrid**

```typescript
// PresentationController.tsx
const channel = useRef<BroadcastChannel | null>(null);

useEffect(() => {
  channel.current = new BroadcastChannel('pipi-presentation');

  // Listen for messages (for recovery/reconnection)
  channel.current.onmessage = (event) => {
    if (event.data.type === 'STUDENT_READY') {
      // Student window reconnected, send current state
      channel.current?.postMessage({
        type: 'STATE_SYNC',
        payload: { currentIndex, visibleBullets }
      });
    }
  };

  return () => channel.current?.close();
}, []);

// Broadcast state changes
useEffect(() => {
  channel.current?.postMessage({
    type: 'STATE_UPDATE',
    payload: { currentIndex, visibleBullets }
  });
}, [currentIndex, visibleBullets]);
```

**Why keep createPortal too:**
- Portal gives you automatic React tree benefits (context, event bubbling)
- BroadcastChannel provides recovery when window reopens
- Belt-and-suspenders approach: Portal for normal operation, BroadcastChannel for resilience

### Window Management: Display Detection

**Browser Support Reality:**
- Window Management API (`getScreenDetails`): 80% support (Chromium only - no Firefox, no Safari)
- Fallback to basic `window.open()` with user-positioned window

**Recommended: Progressive Enhancement**

```typescript
// StudentWindowManager.tsx
interface ScreenPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
}

async function getStudentWindowPlacement(): Promise<ScreenPlacement> {
  // Feature detect
  if ('getScreenDetails' in window) {
    try {
      const screenDetails = await window.getScreenDetails();

      // Find non-primary screen (external monitor)
      const externalScreen = screenDetails.screens.find(s => !s.isPrimary);

      if (externalScreen) {
        return {
          left: externalScreen.left,
          top: externalScreen.top,
          width: externalScreen.availWidth,
          height: externalScreen.availHeight
        };
      }
    } catch (err) {
      console.warn('Window Management permission denied:', err);
    }
  }

  // Fallback: position to the right of current window
  return {
    left: window.screenX + window.outerWidth + 50,
    top: window.screenY,
    width: 1280,
    height: 720
  };
}
```

### CSS Injection Strategy

**Current Problem:** StyleSheets are copied once at window open, but:
1. Tailwind CDN may not be loaded yet
2. Dynamic styles (CSS-in-JS, Tailwind JIT) aren't captured
3. No mechanism to update styles after initial copy

**Recommended: Style Observer Pattern**

```typescript
// StudentWindowManager.tsx
function useStyleSync(externalWindow: Window | null) {
  useEffect(() => {
    if (!externalWindow) return;

    // 1. Copy existing styles
    copyStylesToWindow(externalWindow);

    // 2. Watch for new style additions
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'STYLE' || node.nodeName === 'LINK') {
            copyNodeToWindow(node, externalWindow);
          }
        });
      });
    });

    observer.observe(document.head, { childList: true });

    return () => observer.disconnect();
  }, [externalWindow]);
}

function copyStylesToWindow(targetWindow: Window) {
  // Copy link tags (external stylesheets)
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    const clone = targetWindow.document.createElement('link');
    clone.rel = 'stylesheet';
    clone.href = (link as HTMLLinkElement).href;
    targetWindow.document.head.appendChild(clone);
  });

  // Copy inline style tags
  document.querySelectorAll('style').forEach(style => {
    const clone = targetWindow.document.createElement('style');
    clone.textContent = style.textContent;
    targetWindow.document.head.appendChild(clone);
  });

  // Inject Tailwind CDN explicitly
  const tailwind = targetWindow.document.createElement('script');
  tailwind.src = 'https://cdn.tailwindcss.com';
  targetWindow.document.head.appendChild(tailwind);
}
```

## Data Flow Diagram

```
User Input (keyboard/click)
        |
        v
+-------------------+
| PresentationController |
|   currentIndex    |-----> BroadcastChannel.postMessage()
|   visibleBullets  |              |
+-------------------+              |
   |          |                    |
   |          |                    v
   |          |         +-------------------+
   |          |         | StudentWindow     |
   |          |         | (reconnection     |
   |          |         |  recovery only)   |
   |          |         +-------------------+
   |          |
   v          v (createPortal)
+-------+  +-------------+
|Teacher|  | Student     |
| View  |  | View        |
+-------+  +-------------+
```

**Normal flow:** State changes -> React re-render -> Both views update via React tree
**Recovery flow:** Student window reopens -> sends STUDENT_READY -> receives STATE_SYNC

## Build Order (Dependencies)

The components should be built in this order due to dependencies:

### Phase 1: Foundation
1. **BroadcastChannel service** - No dependencies, can be unit tested in isolation
   - Message types definition
   - Channel creation/cleanup
   - Message serialization

2. **Style injection utilities** - No dependencies
   - copyStylesToWindow function
   - MutationObserver setup

### Phase 2: Window Lifecycle
3. **StudentWindowManager** - Depends on: Style injection
   - Window open/close
   - Lifecycle events (beforeunload)
   - Style sync activation

4. **Display detection service** - Independent, can parallel with #3
   - Feature detection
   - Permission handling
   - Fallback calculations

### Phase 3: Integration
5. **PresentationController** - Depends on: BroadcastChannel, StudentWindowManager
   - State management
   - Event handling
   - Channel integration

6. **StudentView** - Depends on: None (pure presentation)
   - Receives props only
   - No internal state

### Phase 4: Enhancement
7. **Display picker UI** - Depends on: Display detection
   - User selects target screen
   - Permission request flow

8. **Recovery mechanisms** - Depends on: All above
   - Reconnection handling
   - State resync

## Component Interface Specifications

### BroadcastChannel Messages

```typescript
type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: { currentIndex: number; visibleBullets: number } }
  | { type: 'STUDENT_READY' }
  | { type: 'STATE_SYNC'; payload: { currentIndex: number; visibleBullets: number } }
  | { type: 'WINDOW_CLOSING' };
```

### StudentWindowManager Props

```typescript
interface StudentWindowManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onReady: () => void;
  children: React.ReactNode;
  targetScreen?: 'auto' | 'primary' | 'secondary';
}
```

### PresentationController Props

```typescript
interface PresentationControllerProps {
  slides: Slide[];
  initialSlideIndex: number;
  studentNames: string[];
  onExit: () => void;
}

// Internal state
interface PresentationState {
  currentIndex: number;
  visibleBullets: number;
  isStudentWindowOpen: boolean;
  windowStatus: 'closed' | 'opening' | 'open' | 'reconnecting';
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Window Manipulation from Child
**Problem:** StudentView directly calling `window.close()` or manipulating parent state
**Why bad:** Breaks unidirectional data flow, makes debugging hard
**Instead:** Emit events up through BroadcastChannel or callbacks

### Anti-Pattern 2: Storing State in Both Windows
**Problem:** Duplicating currentIndex in student window's local state
**Why bad:** State divergence, sync bugs
**Instead:** Single source of truth in PresentationController, portal passes props

### Anti-Pattern 3: Synchronous Style Copying
**Problem:** Copying styles synchronously in window.open callback
**Why bad:** Styles may not be loaded yet, race conditions
**Instead:** Use MutationObserver, wait for DOMContentLoaded

### Anti-Pattern 4: Relying Only on Window Management API
**Problem:** Building display selection that requires the API
**Why bad:** 20% of users (Firefox, Safari) get broken experience
**Instead:** Progressive enhancement with graceful fallback

## Patterns to Follow

### Pattern 1: Event-Driven State Updates
```typescript
// Good: Single handler, broadcasts to all consumers
const handleNext = useCallback(() => {
  const newState = calculateNextState(currentIndex, visibleBullets, totalBullets);
  setCurrentIndex(newState.currentIndex);
  setVisibleBullets(newState.visibleBullets);
  // BroadcastChannel handles sync automatically via useEffect
}, [currentIndex, visibleBullets, totalBullets]);
```

### Pattern 2: Defensive Window References
```typescript
// Good: Always check window validity
const postToStudent = useCallback((message: PresentationMessage) => {
  if (studentWindow && !studentWindow.closed) {
    channel.current?.postMessage(message);
  }
}, [studentWindow]);
```

### Pattern 3: Graceful Degradation
```typescript
// Good: Feature detect and provide alternatives
const canTargetDisplay = 'getScreenDetails' in window;

return (
  <Button onClick={openStudentWindow}>
    {canTargetDisplay ? 'Open on External Display' : 'Open Student Window'}
  </Button>
);
```

## Testing Considerations

### Unit Testable Components
- BroadcastChannel service (mock channel)
- Style injection utilities (mock DOM)
- Display detection (mock window.getScreenDetails)
- State calculations (pure functions)

### Integration Test Scenarios
1. Open student window -> verify styles present
2. Navigate slides -> verify both views update
3. Close student window -> verify cleanup
4. Reopen student window -> verify state recovery
5. Navigate while window opening -> verify no race condition

### Manual Test Scenarios
1. Single monitor: Student window positions correctly
2. Dual monitor: Student window targets external (when API supported)
3. Permission denied: Falls back gracefully
4. Rapid navigation: No state desync

---

# Permission Flow Architecture (v1.2 Focus)

**Updated:** 2026-01-18
**Confidence:** HIGH (patterns verified against MDN documentation and React best practices)

## Problem Analysis

### Current Flow (Race Condition)

```
+-------------------------------------------------------------------------+
| CURRENT ARCHITECTURE (Problematic)                                       |
+-------------------------------------------------------------------------+
|                                                                          |
|  PresentationView mounts                                                 |
|         |                                                                |
|         v                                                                |
|  useWindowManagement() called                                            |
|         |                                                                |
|         +---> screen.isExtended check (SYNC) ---> hasMultipleScreens=true|
|         |                                                                |
|         +---> navigator.permissions.query() (ASYNC) ------------+        |
|                                                                 |        |
|  useEffect in PresentationView runs                            |        |
|         |                                                       |        |
|         v                                                       |        |
|  Checks: isSupported && hasMultipleScreens && permissionState  |        |
|         |                                                       |        |
|         v                                                       |        |
|  permissionState is STILL 'unavailable' (initial value)        |        |
|         |                                                       |        |
|         v                                                       |        |
|  Condition FALSE ---> PermissionExplainer NOT shown            |        |
|                                                                 |        |
|                     ... async query completes ...               <--------+
|                                                                 |
|                     permissionState becomes 'prompt'            |
|                                                                 |
|                     BUT useEffect already ran!                  |
|                     UI never shows PermissionExplainer          |
|                                                                 |
+-------------------------------------------------------------------------+
```

### Root Cause

The race condition occurs because:

1. **Initial state is misleading**: `permissionState` starts as `'unavailable'`, which is a valid terminal state (API not supported). The useEffect cannot distinguish between "still loading" and "actually unavailable".

2. **No loading state**: There is no explicit "loading" or "pending" state to gate UI decisions.

3. **Effect runs too early**: The useEffect in PresentationView fires on mount, before the async permission query completes.

4. **No re-run trigger**: When `permissionState` updates from `'unavailable'` to `'prompt'`, the useEffect does run again, but by that time the user may have already clicked "Launch Student" (the button is enabled immediately).

## Recommended Architecture

### Pattern: Explicit Loading State with Gated Interaction

The fix requires introducing an explicit loading state that gates user interaction until permission status is known.

```
+-------------------------------------------------------------------------+
| RECOMMENDED ARCHITECTURE                                                 |
+-------------------------------------------------------------------------+
|                                                                          |
|  +---------------------------------------------------------------+      |
|  | useWindowManagement Hook                                       |      |
|  |                                                                |      |
|  |  States:                                                       |      |
|  |    isLoading: boolean      <-- NEW: true until async completes |      |
|  |    permissionState: 'prompt' | 'granted' | 'denied' | null    |      |
|  |                            <-- CHANGED: null = not yet known   |      |
|  |    hasMultipleScreens: boolean                                 |      |
|  |    secondaryScreen: ScreenTarget | null                        |      |
|  |                                                                |      |
|  |  Initialization:                                               |      |
|  |    isLoading = true                                            |      |
|  |    permissionState = null                                      |      |
|  |                                                                |      |
|  |  After async query:                                            |      |
|  |    isLoading = false                                           |      |
|  |    permissionState = result.state                              |      |
|  |                                                                |      |
|  +---------------------------------------------------------------+      |
|                                                                          |
|  +---------------------------------------------------------------+      |
|  | PresentationView Component                                     |      |
|  |                                                                |      |
|  |  Decision Logic:                                               |      |
|  |                                                                |      |
|  |  if (isLoading) {                                              |      |
|  |    // Don't show permission UI yet                             |      |
|  |    // BUT also don't enable "Launch Student" yet               |      |
|  |  }                                                             |      |
|  |                                                                |      |
|  |  if (!isLoading && hasMultipleScreens &&                       |      |
|  |      permissionState === 'prompt') {                           |      |
|  |    // NOW safe to show PermissionExplainer                     |      |
|  |  }                                                             |      |
|  |                                                                |      |
|  |  "Launch Student" button:                                      |      |
|  |    disabled={isLoading || isConnected}                         |      |
|  |                                                                |      |
|  +---------------------------------------------------------------+      |
|                                                                          |
+-------------------------------------------------------------------------+
```

## Component Structure

### Option A: Gated Loading in Hook (Recommended)

**Modify `useWindowManagement` hook to expose loading state.**

```typescript
export interface UseWindowManagementResult {
  isSupported: boolean;
  hasMultipleScreens: boolean;
  isLoading: boolean;  // NEW: true until permission query completes
  permissionState: 'prompt' | 'granted' | 'denied' | null;  // null = unknown
  secondaryScreen: ScreenTarget | null;
  requestPermission: () => Promise<boolean>;
}
```

**Advantages:**
- Single source of truth for permission state
- Encapsulates async complexity in the hook
- Consumers don't need to understand the async timing

**Hook internal changes:**

```typescript
function useWindowManagement(): UseWindowManagementResult {
  const [isSupported] = useState(() => 'getScreenDetails' in window);
  const [hasMultipleScreens, setHasMultipleScreens] = useState(false);
  const [isLoading, setIsLoading] = useState(true);  // Start loading
  const [permissionState, setPermissionState] =
    useState<'prompt' | 'granted' | 'denied' | null>(null);  // null = unknown

  // ... existing screen detection logic ...

  useEffect(() => {
    if (!isSupported) {
      setIsLoading(false);
      setPermissionState(null);  // null indicates "not applicable"
      return;
    }

    if (!hasMultipleScreens) {
      setIsLoading(false);
      setPermissionState(null);
      return;
    }

    // Query permission state
    const checkPermission = async () => {
      try {
        const status = await navigator.permissions.query({
          name: 'window-management' as PermissionName
        });

        if (!mountedRef.current) return;

        setPermissionState(status.state as 'prompt' | 'granted' | 'denied');
        setIsLoading(false);  // Loading complete

        // Listen for changes
        status.addEventListener('change', () => {
          if (mountedRef.current) {
            setPermissionState(status.state as 'prompt' | 'granted' | 'denied');
          }
        });
      } catch {
        if (mountedRef.current) {
          setPermissionState('prompt');  // Assume prompt if query fails
          setIsLoading(false);
        }
      }
    };

    checkPermission();
  }, [isSupported, hasMultipleScreens]);

  // ...
}
```

### Option B: Derived Loading State in Component

**Keep hook unchanged, derive loading state in PresentationView.**

```typescript
// In PresentationView
const { isSupported, hasMultipleScreens, permissionState, ... } = useWindowManagement();

// Derive "is still initializing"
const permissionIsLoading = isSupported &&
                            hasMultipleScreens &&
                            permissionState === 'unavailable';
```

**Disadvantages:**
- Requires consumer to understand internal timing
- `'unavailable'` is overloaded (means both "not applicable" and "still loading")
- Less explicit, more error-prone

**Recommendation: Option A is strongly preferred.**

## State Flow Diagram

```
+----------------------------------------------------------------------------+
|                         STATE FLOW DIAGRAM                                  |
+----------------------------------------------------------------------------+
|                                                                             |
|  MOUNT                                                                      |
|    |                                                                        |
|    v                                                                        |
|  +-----------------------------------------------------------+             |
|  | isLoading: true                                            |             |
|  | permissionState: null                                      |             |
|  | hasMultipleScreens: false                                  |             |
|  +-----------------------------------------------------------+             |
|    |                                                                        |
|    | screen.isExtended check (sync)                                         |
|    v                                                                        |
|  +------------------------+    +--------------------------------+           |
|  | Single Screen          |    | Multiple Screens               |           |
|  |                        |    |                                |           |
|  | isLoading: false       |    | isLoading: true (still)        |           |
|  | permissionState: null  |    | permissionState: null          |           |
|  | hasMultipleScreens:    |    | hasMultipleScreens: true       |           |
|  |   false                |    |                                |           |
|  |                        |    | ---> Query permissions         |           |
|  | ---> DONE              |    +----------------+---------------+           |
|  +------------------------+                     |                           |
|                                   navigator.permissions.query()             |
|                                                 |                           |
|                   +-----------------------------+------------------------+  |
|                   |                             |                        |  |
|                   v                             v                        v  |
|  +-------------------+   +---------------------+   +--------------------+   |
|  | PROMPT            |   | GRANTED             |   | DENIED             |   |
|  |                   |   |                     |   |                    |   |
|  | isLoading: false  |   | isLoading: false    |   | isLoading: false   |   |
|  | state: 'prompt'   |   | state: 'granted'    |   | state: 'denied'    |   |
|  |                   |   |                     |   |                    |   |
|  | Show Explainer UI |   | Fetch screen coords |   | Show Manual        |   |
|  | Gate "Launch" btn |   | Enable "Launch"     |   | Placement Guide    |   |
|  +-------------------+   +---------------------+   +--------------------+   |
|                                                                             |
+----------------------------------------------------------------------------+
```

## UI Gating Strategy

### Before Permission Status Known (isLoading = true)

| Element | State | Reason |
|---------|-------|--------|
| "Launch Student" button | Disabled OR Shows "Checking..." | Prevents user action before we know if we should prompt |
| PermissionExplainer | Hidden | Don't know if needed yet |
| ManualPlacementGuide | Hidden | Don't know if needed yet |

### After Permission Status Known (isLoading = false)

| permissionState | Launch Button | PermissionExplainer | ManualPlacementGuide |
|-----------------|---------------|---------------------|----------------------|
| null (single screen) | Enabled, normal text | Hidden | Hidden |
| 'prompt' | Enabled, shows target | **Visible** | Hidden |
| 'granted' | Enabled, shows screen name | Hidden | Hidden |
| 'denied' | Enabled, normal text | Hidden | **Visible** |

## Inline vs Upfront Permission Request

### Option 1: Upfront Permission (Current Approach)
- Show PermissionExplainer as soon as multi-screen detected + state is 'prompt'
- User grants/denies before clicking "Launch Student"

**Pros:**
- User understands what will happen before action
- Permission is cached for future launches
- No surprise browser dialogs mid-action

**Cons:**
- Requires extra user interaction
- User might skip, then get confused

### Option 2: Inline Permission (On Button Click)
- Don't show PermissionExplainer automatically
- When user clicks "Launch Student", call `getScreenDetails()` which triggers prompt
- Handle result in the same click handler

**Pros:**
- Fewer steps for user
- Permission request tied to specific action

**Cons:**
- Browser might block popup if permission prompt is async
- User might be surprised by permission dialog
- Current button handler is synchronous (critical for popup blocker avoidance)

### Recommendation: Upfront with Improved Gating

Keep the upfront approach but fix the race condition:

1. Gate the "Launch Student" button while `isLoading` is true
2. Show PermissionExplainer reliably when `!isLoading && permissionState === 'prompt'`
3. Allow user to skip (they can still launch, just won't auto-place on secondary screen)

This preserves the current user-friendly flow while eliminating the race condition.

## Implementation Checklist

### Hook Changes (`useWindowManagement.ts`)

- [ ] Add `isLoading` state, initialize to `true`
- [ ] Change `permissionState` initial value from `'unavailable'` to `null`
- [ ] Set `isLoading = false` after:
  - API not supported (immediately)
  - Single screen detected (immediately)
  - Permission query completes (after async)
  - Permission query fails (catch block)
- [ ] Return `isLoading` in hook result

### Component Changes (`PresentationView.tsx`)

- [ ] Destructure `isLoading` from `useWindowManagement()`
- [ ] Update PermissionExplainer condition:
  ```typescript
  {!isLoading && isSupported && hasMultipleScreens && permissionState === 'prompt' && (
    <PermissionExplainer ... />
  )}
  ```
- [ ] Consider disabling "Launch Student" while `isLoading`:
  ```typescript
  disabled={isLoading || isConnected}
  ```
- [ ] Update button text to show loading state:
  ```typescript
  {isLoading ? 'Checking displays...' : secondaryScreen ? `Launch on ${secondaryScreen.label}` : ...}
  ```

### Remove Race Condition useEffect

The current useEffect that shows PermissionExplainer based on state changes is unnecessary once the hook properly gates loading state. The conditional render directly in JSX is sufficient:

```typescript
// REMOVE this useEffect:
useEffect(() => {
  if (isSupported && hasMultipleScreens && permissionState === 'prompt') {
    setShowPermissionExplainer(true);
  }
}, [isSupported, hasMultipleScreens, permissionState]);

// REPLACE with direct conditional render:
{!isLoading && isSupported && hasMultipleScreens && permissionState === 'prompt' && !showPermissionExplainerDismissed && (
  <PermissionExplainer ... />
)}
```

Note: You'll need a `showPermissionExplainerDismissed` state to track if user clicked "Skip".

## Anti-Patterns to Avoid (Permission Flow)

### 1. Checking `permissionState === 'unavailable'` as Loading Indicator

**Why bad:** Overloads meaning. Can't distinguish "still loading" from "API not supported".

### 2. Using `setTimeout` to "Wait for State"

**Why bad:** Arbitrary timing, doesn't work reliably across devices/networks.

### 3. Multiple useEffects with Cascading State Updates

**Why bad:** Creates race conditions and makes flow hard to reason about.

### 4. Triggering Permission in Async Handler Before `window.open`

**Why bad:** Breaks popup blocker exception (user activation consumed by permission dialog).

## Sources

### HIGH Confidence (Official Documentation)
- [BroadcastChannel API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [Window Management API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API)
- [createPortal - React](https://react.dev/reference/react-dom/createPortal)
- [Window Management - Chrome Developers](https://developer.chrome.com/docs/capabilities/web-apis/window-management)
- [MDN: Using the Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API/Using_the_Permissions_API) - Official pattern for querying and listening to permission state changes

### MEDIUM Confidence (Browser Support Data)
- [BroadcastChannel - Can I Use](https://caniuse.com/broadcastchannel) - 95.8% global support
- [getScreenDetails - Can I Use](https://caniuse.com/mdn-api_window_getscreendetails) - 80.11% global support (Chromium only)

### MEDIUM Confidence (Community Patterns)
- [Popout Windows in React - Scott Logic](https://blog.scottlogic.com/2019/10/29/popout-windows-in-react.html)
- [react-new-window - GitHub](https://github.com/rmariuzzo/react-new-window)
- [How to Manage State Across Multiple Tabs](https://blog.pixelfreestudio.com/how-to-manage-state-across-multiple-tabs-and-windows/)
- [Fixing Race Conditions in React with useEffect](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect) - Boolean flag pattern for preventing stale state updates
- [Race conditions in useEffect with async: modern patterns for ReactJS 2025](https://medium.com/@sureshdotariya/race-conditions-in-useeffect-with-async-modern-patterns-for-reactjs-2025-9efe12d727b0) - Modern patterns including AbortController
- [UI best practices for loading, error, and empty states in React](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/) - Loading state patterns for async operations
- [Handling API request race conditions in React](https://sebastienlorber.com/handling-api-request-race-conditions-in-react) - Comprehensive overview of race condition issues and solutions

### LOW Confidence (Needs Validation)
- CSS-in-JS injection patterns may vary by library (current PiPi uses Tailwind CDN)
- React 18+ portal behavior in new windows may have undocumented quirks
