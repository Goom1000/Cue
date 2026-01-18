# Technology Stack: Dual-Monitor Presentation System

**Project:** PiPi - AI-powered presentation tool for teachers
**Researched:** 2026-01-18
**Research Focus:** Browser APIs for dual-monitor presenter/student view

---

## Executive Summary

Browser-based dual-monitor presentation is a **partially solved problem** in 2025/2026. The ideal solution (Window Management API) exists but has **Chromium-only support (~30% of users)**. A production-ready implementation requires a **progressive enhancement strategy**: use advanced APIs when available, fall back gracefully when not.

**Key finding:** The current `window.open()` approach in PresentationView.tsx is not fundamentally broken---it works when called with user gesture. The "popup blocker" issue likely stems from timing (async operations consuming user activation) or missing user gesture context.

---

## Recommended Stack

### Primary API: Window Management API (Chromium)

| Property | Value |
|----------|-------|
| **API** | Window Management API |
| **Key Methods** | `getScreenDetails()`, `window.open()` with screen coords, `requestFullscreen({ screen })` |
| **Permission** | `window-management` |
| **Browser Support** | Chrome 111+, Edge 111+, Opera 97+ |
| **Global Coverage** | ~30% |
| **Confidence** | HIGH (verified via [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API), [Can I Use](https://caniuse.com/mdn-api_permissions_permission_window-management)) |

**Why use it:**
- Purpose-built for this exact use case (slideshow presenter views)
- Enumerate all connected displays with position/size
- Open windows on specific screens automatically
- Fullscreen on secondary monitor with one API call
- Event-based detection when screens connect/disconnect

**Implementation pattern:**
```typescript
// Feature detection
if ('getScreenDetails' in window) {
  // Request permission and get screen info
  const screenDetails = await window.getScreenDetails();
  const secondaryScreen = screenDetails.screens.find(s => !s.isPrimary);

  if (secondaryScreen) {
    // Open student window on secondary monitor
    const studentWindow = window.open(
      '/student-view',
      'student',
      `left=${secondaryScreen.availLeft},top=${secondaryScreen.availTop},width=${secondaryScreen.availWidth},height=${secondaryScreen.availHeight}`
    );

    // Or go fullscreen on secondary
    await document.body.requestFullscreen({ screen: secondaryScreen });
  }
}
```

### Fallback API: Enhanced window.open() (All Browsers)

| Property | Value |
|----------|-------|
| **API** | `window.open()` with user gesture |
| **Browser Support** | All browsers (96%+) |
| **Constraint** | Must be called within 5 seconds of user click |
| **Constraint** | Cannot auto-detect secondary monitor |
| **Confidence** | HIGH (verified via [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)) |

**Why this is the universal fallback:**
- Works in ALL browsers
- User manually drags window to secondary monitor
- Still enables presenter/student split---just with manual positioning

**Critical: User Activation Requirements**

The popup blocker blocks `window.open()` when called:
1. Without any user gesture (automatic)
2. More than 5 seconds after user gesture (Chrome/Firefox)
3. More than 1 second after user gesture (Safari---stricter)
4. After another "activation-consuming API" was called (e.g., `navigator.share()`)

**Current code issue identified:**
```typescript
// Current PresentationView.tsx line 15
const win = window.open('', '', 'width=800,height=600,left=200,top=200');
```

This is called inside `useEffect` which runs AFTER render---potentially losing user activation context. The fix is to open the window synchronously in the click handler, then populate it.

### Cross-Window Communication: BroadcastChannel API

| Property | Value |
|----------|-------|
| **API** | BroadcastChannel API |
| **Browser Support** | Baseline since March 2022 (all modern browsers) |
| **Constraint** | Same-origin only |
| **Confidence** | HIGH (verified via [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)) |

**Why use it over postMessage:**
- Simpler API (no need to maintain window references)
- Works across any number of windows/tabs
- Automatic cleanup when channel closed
- Structured clone for complex data

**Implementation pattern:**
```typescript
// In presenter window
const channel = new BroadcastChannel('pipi-presentation');
channel.postMessage({
  type: 'SLIDE_CHANGE',
  slideIndex: 5,
  visibleBullets: 2
});

// In student window
const channel = new BroadcastChannel('pipi-presentation');
channel.onmessage = (event) => {
  if (event.data.type === 'SLIDE_CHANGE') {
    setCurrentSlide(event.data.slideIndex);
    setVisibleBullets(event.data.visibleBullets);
  }
};
```

### Alternative Considered: Document Picture-in-Picture API

| Property | Value |
|----------|-------|
| **API** | Document Picture-in-Picture API |
| **Key Method** | `documentPictureInPicture.requestWindow()` |
| **Browser Support** | Chrome 116+ only |
| **Global Coverage** | ~25% |
| **Confidence** | MEDIUM |

**Why NOT recommended as primary:**
- Even narrower browser support than Window Management
- Creates small floating window, not full secondary display
- Cannot be positioned or navigated by website
- Better suited for video players, not full presentation views

**Potential use case:** Teacher's floating mini-preview of student view while working in other apps.

### Alternative Considered: Presentation API

| Property | Value |
|----------|-------|
| **API** | Presentation API |
| **Browser Support** | Chromium only, primarily for Cast/wireless displays |
| **Confidence** | LOW |

**Why NOT recommended:**
- Designed for wireless displays (Chromecast, Miracast)
- Not for wired secondary monitors
- Complex setup for simple dual-monitor use case
- Cast receivers often have limited web capabilities

---

## Browser Compatibility Matrix

| API | Chrome | Edge | Firefox | Safari | Use Case |
|-----|--------|------|---------|--------|----------|
| Window Management | 111+ | 111+ | NO | NO | Auto-detect screens, place windows |
| window.open() | Yes | Yes | Yes | Yes | Manual dual-window (fallback) |
| BroadcastChannel | Yes | Yes | Yes (38+) | Yes (15.4+) | Window sync |
| Fullscreen | 71+ | 79+ | 64+ | 16.4+ | Student view fullscreen |
| postMessage | Yes | Yes | Yes | Yes | Window communication (alt) |
| Doc PiP | 116+ | 116+ | NO | NO | Floating preview |

**Source:** [Can I Use](https://caniuse.com), [MDN](https://developer.mozilla.org)

---

## What NOT to Use

### 1. Synchronous window.open() in useEffect

**Why:** Loses user activation context, triggers popup blocker.

**Instead:** Open window in click handler, populate content after.

### 2. React Portal to external window (current approach)

**Why:** Creates DOM directly in `window.open()` result. Fragile, loses styles, complex lifecycle.

**Instead:** Open student view as separate route (`/student`), sync via BroadcastChannel.

### 3. localStorage for cross-window sync

**Why:** Storage events don't fire in the same tab, requires workarounds. Synchronous, can block UI.

**Instead:** BroadcastChannel is purpose-built for this.

### 4. Presentation API for wired monitors

**Why:** Designed for wireless casting (Chromecast/AirPlay), not HDMI/DisplayPort.

**Instead:** Window Management API or window.open().

---

## Installation

No additional packages required---all APIs are native browser APIs.

**Optional helper libraries:**

```bash
# If you want React hooks for BroadcastChannel
npm install react-broadcast-channel
# or
npm install @broadcaster/react
```

**Recommendation:** Write custom hooks. The API is simple enough that third-party libraries add more complexity than value.

---

## Confidence Assessment

| Recommendation | Confidence | Basis |
|----------------|------------|-------|
| BroadcastChannel for sync | HIGH | MDN, widely supported since 2022 |
| Window Management API for Chromium | HIGH | MDN, Chrome DevRel docs, Can I Use |
| window.open() fallback | HIGH | Universal browser support, well-documented |
| User activation timing fix | HIGH | MDN User Activation docs, Chrome DevRel |
| Avoid Presentation API | MEDIUM | Limited to wireless displays per spec |
| Avoid Doc PiP for main view | MEDIUM | Wrong UX pattern for full-screen presenter |

---

## Sources

### Official Documentation (HIGH confidence)
- [MDN: Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API)
- [MDN: Using the Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API/Using)
- [MDN: Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [MDN: User Activation](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation)
- [MDN: Transient Activation](https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation)
- [MDN: window.open()](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)
- [Chrome for Developers: Window Management](https://developer.chrome.com/docs/capabilities/web-apis/window-management)

### Browser Compatibility (HIGH confidence)
- [Can I Use: window-management permission](https://caniuse.com/mdn-api_permissions_permission_window-management)
- [Can I Use: Fullscreen API](https://caniuse.com/fullscreen)

### Community Resources (MEDIUM confidence)
- [DEV.to: BroadcastChannel in React](https://dev.to/sachinchaurasiya/how-to-use-broadcast-channel-api-in-react-5eec)
- [Medium: Popup Blocking Solutions](https://muhammadamas.medium.com/javascript-solution-overcoming-popup-blocking-issues-in-browser-ea1b7c21aaad)

---

# Addendum: Async Permission State Patterns (v1.2)

**Added:** 2026-01-18
**Focus:** React patterns for reliable async permission state initialization
**Milestone:** v1.2 Permission Flow Fix

---

## Problem Statement

The current `useWindowManagement` hook has a race condition:
1. `permissionState` initializes as `'unavailable'`
2. `useEffect` runs async permission query
3. By the time permission query resolves to `'prompt'`, the consumer's `useEffect` that should show `PermissionExplainer` may have already run with stale state

**Root cause:** useEffect runs after render, but the initial render happens with placeholder state values before async initialization completes.

**Code demonstrating the bug (PresentationView.tsx lines 243-247):**
```typescript
useEffect(() => {
  // BUG: Runs on first render when permissionState is 'unavailable'
  // The async query hasn't completed yet
  if (isSupported && hasMultipleScreens && permissionState === 'prompt') {
    setShowPermissionExplainer(true);
  }
}, [isSupported, hasMultipleScreens, permissionState]);
```

---

## Recommended Pattern: Explicit Loading State

| Aspect | Recommendation | Confidence |
|--------|---------------|------------|
| Primary Pattern | Discriminated union with `'loading'` state | HIGH |
| Alternative | `useSyncExternalStore` | MEDIUM |
| Not Recommended | React 19 `use()` hook | LOW - wrong fit |

### Why Discriminated Union

**HIGH Confidence** - Based on [React official docs](https://react.dev/reference/react/useState), [TkDodo's useState guide](https://tkdodo.eu/blog/things-to-know-about-use-state), and [Steve Kinney's TypeScript patterns](https://stevekinney.com/courses/react-typescript/loading-states-error-handling).

The core insight: "TypeScript's discriminated unions let us model these states in a way that makes bugs literally impossible to write."

**Current problematic type:**
```typescript
// BAD: Allows impossible/ambiguous states
type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';
```

The problem: `'unavailable'` means two things:
1. "API not supported" (permanent)
2. "Haven't checked yet" (temporary)

Consumer code cannot distinguish these, causing the race condition.

---

## Recommended Implementation

### Pattern 1: Five-State Discriminated Union (Recommended)

```typescript
type PermissionState =
  | 'loading'      // Async check in progress
  | 'prompt'       // Permission available to request
  | 'granted'      // Permission granted
  | 'denied'       // Permission denied
  | 'unavailable'; // API not supported (permanent)

// Initialize based on synchronous feature detection
const [permissionState, setPermissionState] = useState<PermissionState>(
  'getScreenDetails' in window ? 'loading' : 'unavailable'
);
```

**Why this works:**
- `'loading'` is immediately distinguishable from `'unavailable'`
- Consumer can show nothing/spinner during `'loading'`
- Consumer only shows `PermissionExplainer` when state is definitively `'prompt'`
- No race condition because initial `'loading'` prevents premature decisions

### Pattern 2: Separate Loading Flag

```typescript
interface UseWindowManagementResult {
  isLoading: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable';
  // ... other fields
}
```

**Pros:** Explicit loading state, backward-compatible type
**Cons:** `permissionState` value during loading is technically meaningless

### Why NOT Other Patterns

#### useSyncExternalStore

**MEDIUM Confidence** - Based on [React useSyncExternalStore docs](https://react.dev/reference/react/useSyncExternalStore).

```typescript
function usePermissionState(name: PermissionName) {
  const getSnapshot = useCallback(() => {
    return permissionCache.get(name) ?? 'loading';
  }, [name]);

  const subscribe = useCallback((callback: () => void) => {
    navigator.permissions.query({ name }).then(status => {
      permissionCache.set(name, status.state);
      callback();
      status.addEventListener('change', callback);
    });
    return () => {/* cleanup */};
  }, [name]);

  return useSyncExternalStore(subscribe, getSnapshot, () => 'loading');
}
```

**Why not primary recommendation:**
- Adds complexity for marginal benefit
- Permission state changes are rare (only user action in browser settings)
- Requires external cache to make getSnapshot work
- The simple five-state pattern solves the actual problem more directly

#### React 19 `use()` Hook

**NOT Recommended** for this use case.

Per [React use() documentation](https://react.dev/reference/react/use):
- `use()` is designed for Server Component -> Client Component promise streaming
- "Promises created in Client Components are recreated on every render"
- Would require lifting permission query to a stable promise outside component
- Suspense fallback would show loading UI, but:
  - We need granular loading state, not full component suspension
  - Permission check is fast; Suspense overhead is overkill
  - Can't show partial UI while permission loads

---

## Consumer Pattern Fix

### Current (Buggy)

```typescript
// In PresentationView.tsx
const { permissionState } = useWindowManagement();

useEffect(() => {
  // BUG: Runs on first render when permissionState is 'unavailable'
  // By the time permissionState becomes 'prompt', this already ran
  if (isSupported && hasMultipleScreens && permissionState === 'prompt') {
    setShowPermissionExplainer(true);
  }
}, [isSupported, hasMultipleScreens, permissionState]);
```

### Fixed (With Loading State in Union)

```typescript
const { permissionState } = useWindowManagement();

useEffect(() => {
  // Skip during loading - wait for definitive state
  if (permissionState === 'loading') return;

  if (isSupported && hasMultipleScreens && permissionState === 'prompt') {
    setShowPermissionExplainer(true);
  }
}, [isSupported, hasMultipleScreens, permissionState]);
```

### Fixed (With Separate Loading Flag)

```typescript
const { isLoading, permissionState } = useWindowManagement();

useEffect(() => {
  if (isLoading) return;

  if (isSupported && hasMultipleScreens && permissionState === 'prompt') {
    setShowPermissionExplainer(true);
  }
}, [isLoading, isSupported, hasMultipleScreens, permissionState]);
```

---

## Additional Patterns Considered

### AbortController for Race Conditions

**Not needed here.** Per [Max Rozen's race condition guide](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect):

AbortController is for canceling network requests when component unmounts or deps change. Our permission query is:
1. Single query per mount (not re-fetched on dep change)
2. No network request to abort (browser-internal API)
3. Fast enough that cancellation isn't needed

### Boolean Flag Pattern

```typescript
useEffect(() => {
  let active = true;

  checkPermission().then(state => {
    if (active) setPermissionState(state);
  });

  return () => { active = false; };
}, []);
```

**Already implemented** in current hook via `mountedRef`. This prevents state updates after unmount but doesn't solve the "initial render with placeholder state" problem.

---

## Recommended Changes Summary

### Hook Changes (useWindowManagement.ts)

| Change | Purpose |
|--------|---------|
| Add `'loading'` to PermissionState union | Distinguish pending from unavailable |
| Initialize to `'loading'` when API supported | Enable consumers to wait for definitive state |
| Optionally export `isLoading` derived boolean | Convenience for consumers |

### Consumer Changes (PresentationView.tsx)

| Change | Purpose |
|--------|---------|
| Check for `'loading'` state before showing UI | Prevent race condition |
| Early return from useEffect while loading | Ensure UI decisions use final state |

---

## v1.2 Addendum Sources

### HIGH Confidence (Official Documentation)
- [React useState documentation](https://react.dev/reference/react/useState)
- [React useSyncExternalStore documentation](https://react.dev/reference/react/useSyncExternalStore)
- [React use() hook documentation](https://react.dev/reference/react/use)
- [React useEffect documentation](https://react.dev/reference/react/useEffect)

### MEDIUM Confidence (Community Best Practices)
- [Max Rozen - Fixing Race Conditions in React with useEffect](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect)
- [TkDodo - Things to know about useState](https://tkdodo.eu/blog/things-to-know-about-use-state)
- [Steve Kinney - Loading States and Error Handling](https://stevekinney.com/courses/react-typescript/loading-states-error-handling)
- [LogRocket - How to initialize state using React Hooks](https://blog.logrocket.com/initialize-state-react-hooks/)
- [Kent C. Dodds - useState lazy initialization](https://kentcdodds.com/blog/use-state-lazy-initialization-and-function-updates)
- [Medium - Race conditions in useEffect with async: modern patterns for ReactJS 2025](https://medium.com/@sureshdotariya/race-conditions-in-useeffect-with-async-modern-patterns-for-reactjs-2025-9efe12d727b0)

### LOW Confidence (Reference Only)
- [Epic React - useSyncExternalStore demystified](https://www.epicreact.dev/use-sync-external-store-demystified-for-practical-react-development-w5ac0)
- [GitHub - react-use-navigator-permissions](https://github.com/JamesIves/react-use-navigator-permissions)

---

## Summary

The fix is conceptually simple: **distinguish "haven't checked yet" from "checked and not available"** by adding a `'loading'` state to the discriminated union. This allows consumers to wait for the definitive permission state before making UI decisions, eliminating the race condition.

No new dependencies required. This is a pattern change within existing React 19 codebase.
