# Project Research Summary

**Project:** PiPi - AI-powered presentation tool for teachers
**Domain:** Browser-based dual-monitor presentation system
**Researched:** 2026-01-18
**Confidence:** HIGH

## Executive Summary

Building a reliable dual-monitor presentation system in a browser requires solving three problems: (1) launching a second window without triggering popup blockers, (2) synchronizing state between windows, and (3) optionally placing the window on the correct display. The current PiPi implementation's popup issues stem from calling `window.open()` inside a `useEffect` rather than directly in a click handler, causing browsers to block it as an untrusted popup. This is fixable without major architectural changes.

The recommended approach is **progressive enhancement**: build a robust BroadcastChannel-based sync system that works everywhere, then add Window Management API features for Chromium users (~30% of users get automatic display targeting). The student view should be a standalone route (`/student`) that loads its own styles, not an injected portal. This architecture avoids popup blockers entirely when users manually open the URL, and survives window refreshes.

The primary risks are: (1) popup blockers silently breaking the feature if user activation is lost, (2) non-Chromium users cannot auto-target displays so manual positioning is required, and (3) teachers may deny permission prompts without understanding them. Mitigation requires synchronous window opening in click handlers, graceful fallbacks with clear instructions, and permission priming UI before browser prompts.

## Key Findings

### Recommended Stack

No additional packages are needed—all required functionality uses native browser APIs. The stack consists of three complementary technologies that provide full browser coverage through progressive enhancement.

**Core technologies:**
- **Window Management API**: Auto-detect displays and position windows — Chromium only (Chrome 111+, Edge 111+), provides the "magic" experience
- **BroadcastChannel API**: Cross-window state synchronization — 95.8% browser support (Baseline 2022), simple and reliable
- **window.open() with user gesture**: Universal window creation — 100% browser support, but requires manual positioning as fallback

**Critical requirement:** `window.open()` MUST be called synchronously within a click handler. The current `useEffect`-based approach loses user activation context and will be blocked by Arc, Safari, and privacy-focused browsers.

### Expected Features

**Must have (table stakes):**
- Separate teacher/student displays that sync reliably
- Speaker notes visible to presenter only
- Current and next slide preview in presenter view
- Keyboard navigation (arrows, space, Page Up/Down for clickers)
- Progressive bullet reveal synchronized across windows
- Timer/clock display in presenter view (MISSING)
- Graceful exit without losing state

**Should have (competitive):**
- Auto display detection for Chromium users
- One-click "Present on [Display Name]" when API available
- Presenter remote/clicker support (Page Up/Down)
- Recovery when student window is closed and reopened

**Defer (v2+):**
- Annotation/drawing tools (anti-feature, PowerPoint territory)
- Video/audio embedding (scope creep)
- Custom transitions/animations (diminishing returns)
- Session recording (other tools do this better)

### Architecture Approach

The architecture should use a hybrid Portal + BroadcastChannel pattern. React Portal provides automatic state sharing through the component tree during normal operation, while BroadcastChannel provides resilience for reconnection scenarios and works even if the window reference is lost. The student view should be a standalone route (`/student`) that loads its own CSS, eliminating style injection complexity.

**Major components:**
1. **PresentationController** — Owns state (currentIndex, visibleBullets), orchestrates sync via BroadcastChannel
2. **StudentWindowManager** — Handles window lifecycle, style sync, display detection with graceful fallback
3. **TeacherView** — Controls, notes, previews in main window
4. **StudentView** — Pure presentation component, receives state via props/channel

### Critical Pitfalls

1. **Popup blockers silently block window.open()** — Call `window.open()` synchronously in click handler, never in `useEffect`. Detect `null` return and show instructions.

2. **Window reference lost after open** — Use BroadcastChannel for all communication instead of relying on window references. Implement heartbeat/ping to detect disconnection.

3. **Window Management API only works in Chromium** — Feature-detect with `'getScreenDetails' in window`, provide manual positioning fallback for Firefox/Safari with clear "drag to projector" instructions.

4. **Teachers confused by permission prompts** — Show explanation UI ("permission priming") before browser prompt. Provide recovery instructions when permission denied.

5. **Fullscreen exits unexpectedly** — Design student view to look good at any size, not just fullscreen. Add "restore fullscreen" button that appears when fullscreen is lost.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Popup Fix + Communication)
**Rationale:** The popup blocker issue is blocking all dual-window functionality. This must be fixed first. BroadcastChannel communication provides the foundation for everything else.
**Delivers:** Working dual-window with reliable sync
**Addresses:** Table stakes—separate teacher/student displays, sync between windows
**Avoids:** Pitfalls 1 (popup blockers), 2 (lost window reference), 11 (BroadcastChannel memory leaks), 12 (style copying fails)

Key tasks:
- Move `window.open()` into click handler (synchronous)
- Create `/student` route as standalone view with its own CSS
- Implement BroadcastChannel sync service with proper cleanup
- Add popup blocked detection with user-friendly fallback (show URL to open manually)
- Add heartbeat mechanism for connection status

### Phase 2: Window Management Enhancement
**Rationale:** After basic dual-window works everywhere, add Chromium-only enhancements for automatic display targeting. Non-Chromium users continue using Phase 1 functionality.
**Delivers:** Auto-detect projector, one-click display targeting for Chrome/Edge users
**Uses:** Window Management API with feature detection
**Avoids:** Pitfall 3 (browser support gap), 4 (permission confusion), 8 (screen position unreliability)

Key tasks:
- Add feature detection for Window Management API
- Create permission priming UI explaining why permission is needed
- Implement `getScreenDetails()` to find secondary displays
- Add display picker UI when multiple externals detected
- Graceful fallback with "drag to projector" instructions

### Phase 3: UX Polish
**Rationale:** With reliable dual-window working, add quality-of-life features that teachers expect from presentation tools.
**Delivers:** Timer, clicker support, fullscreen management, next slide preview
**Addresses:** Missing table stakes (timer), should-haves (clicker, preview)
**Avoids:** Pitfall 5 (fullscreen exit), 9 (resolution mismatch), 10 (focus stealing)

Key tasks:
- Add elapsed timer to presenter view header
- Add Page Up/Down keyboard support for presenter remotes
- Add next slide visual preview thumbnail
- Add "restore fullscreen" button when fullscreen exits
- Design student view responsively for various projector resolutions

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Window Management API is useless if the basic popup doesn't work. Fix the foundation first.
- **Phase 2 before Phase 3:** Display targeting improves the core dual-window experience; timer/clicker are conveniences.
- **BroadcastChannel in Phase 1:** This is the communication backbone. Everything else depends on reliable cross-window sync.
- **Standalone student route in Phase 1:** Eliminates multiple pitfalls (style copying, popup recovery) and enables manual URL fallback when popups blocked.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** BroadcastChannel message protocol design—define message types and state recovery flow before implementation
- **Phase 2:** Window Management API permission flow—test actual browser behavior for permission priming

Phases with standard patterns (skip research-phase):
- **Phase 3:** Timer, keyboard shortcuts, fullscreen handling—all well-documented, established patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All APIs verified via MDN, Chrome DevDocs, Can I Use |
| Features | HIGH | Verified against PowerPoint, Google Slides, reveal.js documentation |
| Architecture | HIGH | BroadcastChannel well-documented; Portal pattern established; Window Management API has Chrome DevRel examples |
| Pitfalls | HIGH | Root cause of popup issue identified via MDN User Activation docs; all pitfalls sourced from official documentation |

**Overall confidence:** HIGH

### Gaps to Address

- **Safari user activation timing:** Safari has stricter ~1 second window vs Chrome/Firefox ~5 seconds. May need testing on actual Safari to validate timing assumptions.
- **React 18+ portal quirks:** Some community reports of undocumented behavior with portals to external windows. Monitor during implementation.
- **CSS-in-JS edge cases:** Current app uses Tailwind CDN which simplifies style handling, but if build tooling changes, style injection may need revisiting.

## Sources

### Primary (HIGH confidence)
- [MDN: Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API)
- [MDN: BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
- [MDN: User Activation](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation)
- [MDN: window.open()](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)
- [Chrome Developers: Window Management](https://developer.chrome.com/docs/capabilities/web-apis/window-management)
- [Can I Use: BroadcastChannel](https://caniuse.com/broadcastchannel) — 95.8% global support
- [Can I Use: window-management](https://caniuse.com/mdn-api_permissions_permission_window-management) — ~30% global support

### Secondary (MEDIUM confidence)
- [Microsoft Support: PowerPoint Presenter View](https://support.microsoft.com/en-us/office/use-presenter-view-in-powerpoint-fe7638e4-76fb-4349-8d81-5eb6679f49d7)
- [Google Docs Editors Help: Present Slides](https://support.google.com/docs/answer/1696787)
- [reveal.js: Speaker View](https://revealjs.com/speaker-view/)
- [web.dev: Permission UX](https://web.dev/push-notifications-permissions-ux/)
- [React: createPortal](https://react.dev/reference/react-dom/createPortal)

### Tertiary (LOW confidence)
- Community reports of React 18 portal behavior in external windows — needs validation during implementation

---
*Research completed: 2026-01-18*
*Ready for roadmap: yes*

---

## v1.2 Permission Flow Fix Research

**Updated:** 2026-01-18
**Scope:** Fix race condition in Window Management API permission flow
**Confidence:** HIGH

### Executive Summary

The v1.2 milestone addresses a race condition in the permission flow for the Window Management API. The `useWindowManagement` hook initializes `permissionState` as `'unavailable'`, then runs an async permission query. By the time the query resolves to `'prompt'`, the consumer's useEffect in PresentationView has already run with the stale initial value, causing the `PermissionExplainer` component to never appear.

**The fix is conceptually simple:** distinguish "haven't checked yet" from "checked and not available" by adding explicit loading state. This allows consumers to wait for the definitive permission state before making UI decisions.

**No new dependencies required.** This is a pattern change within the existing React 19 codebase using discriminated unions for state management.

### Key Findings by Dimension

#### From STACK.md (Async Permission State Patterns)

**Recommended pattern: Five-state discriminated union**

```typescript
type PermissionState =
  | 'loading'      // Async check in progress
  | 'prompt'       // Permission available to request
  | 'granted'      // Permission granted
  | 'denied'       // Permission denied
  | 'unavailable'; // API not supported (permanent)
```

**Why this works:**
- `'loading'` is immediately distinguishable from `'unavailable'`
- Consumers can show spinner/nothing during `'loading'`
- PermissionExplainer only shows when state is definitively `'prompt'`
- No race condition because initial `'loading'` prevents premature decisions

**Alternatives considered:**
- `useSyncExternalStore`: MEDIUM confidence, adds complexity for marginal benefit
- React 19 `use()` hook: NOT recommended, wrong fit for this use case
- Separate `isLoading` boolean: Works but less explicit than union

#### From FEATURES.md (Permission UX)

**Current anti-patterns identified:**
| Anti-Feature | Why Bad | PiPi Status |
|--------------|---------|-------------|
| Prompt on page load | No context = 88%+ denial | DOING THIS |
| Permission without user activation | 3x lower accept rates | DOING THIS |
| Auto-dismissing permission UI | Users miss it if distracted | DOING THIS |

**Recommended flow:**
1. **Detection (Silent):** Check `screen.isExtended` and permission state on mount, DO NOT show any UI
2. **Action Initiation (User Click):** When user clicks "Launch Student", show PermissionExplainer if state is `'prompt'`
3. **Feedback (Post-Action):** Toast confirming where window opened

**Key insight from Chrome data:** 77% of permission prompts shown without user interaction result in only 12% acceptance. Timing matters.

#### From ARCHITECTURE.md (Component Structure)

**Recommended hook interface:**
```typescript
export interface UseWindowManagementResult {
  isSupported: boolean;
  hasMultipleScreens: boolean;
  isLoading: boolean;           // NEW: true until async completes
  permissionState: 'prompt' | 'granted' | 'denied' | null;  // null = not applicable
  secondaryScreen: ScreenTarget | null;
  requestPermission: () => Promise<boolean>;
}
```

**UI gating strategy:**

| isLoading | permissionState | Launch Button | PermissionExplainer |
|-----------|-----------------|---------------|---------------------|
| true | any | Disabled/"Checking..." | Hidden |
| false | null (single screen) | Enabled, normal | Hidden |
| false | 'prompt' | Enabled | Visible |
| false | 'granted' | Enabled, shows screen name | Hidden |
| false | 'denied' | Enabled | Hidden (show recovery hint) |

**Remove the race-condition useEffect:**
```typescript
// REMOVE this useEffect:
useEffect(() => {
  if (isSupported && hasMultipleScreens && permissionState === 'prompt') {
    setShowPermissionExplainer(true);
  }
}, [isSupported, hasMultipleScreens, permissionState]);

// REPLACE with direct conditional render:
{!isLoading && isSupported && hasMultipleScreens && permissionState === 'prompt' && (
  <PermissionExplainer ... />
)}
```

#### From PITFALLS.md (Permission-Specific Risks)

**Top 5 pitfalls for v1.2:**

| Priority | Pitfall | Impact | Mitigation |
|----------|---------|--------|------------|
| 1 | Race condition on initial render | Permission UI never appears | Add `isLoading` state, gate UI decisions |
| 2 | Chrome chip auto-dismisses (12s) | Teacher misses prompt entirely | In-page priming UI before browser prompt |
| 3 | No feedback on button | User doesn't know feature state | Dynamic button label reflecting permission |
| 4 | No recovery after dismiss | Feature appears permanently broken | Recovery instructions for denied state |
| 5 | User gesture required for getScreenDetails() | Silent failure | Call API synchronously in click handler |

**Critical code pattern:**
```typescript
// BAD: Called outside click handler
useEffect(() => {
  window.getScreenDetails(); // Will defer, not prompt
}, []);

// GOOD: Synchronous call in click handler
const handleClick = () => {
  window.getScreenDetails()
    .then(details => { /* use details */ })
    .catch(err => { /* handle denial */ });
};
```

### Recommended Implementation Approach

**Phase 1: Hook Changes (useWindowManagement.ts)**
1. Add `isLoading` state, initialize to `true`
2. Change `permissionState` initial value from `'unavailable'` to `'loading'` (or use union with null)
3. Set `isLoading = false` after:
   - API not supported (immediately)
   - Single screen detected (immediately)
   - Permission query completes (after async)
   - Permission query fails (catch block)
4. Return `isLoading` in hook result

**Phase 2: Consumer Changes (PresentationView.tsx)**
1. Destructure `isLoading` from `useWindowManagement()`
2. Remove the problematic useEffect that sets `showPermissionExplainer`
3. Replace with direct conditional render gated by `!isLoading`
4. Optionally disable "Launch Student" button while `isLoading`
5. Update button text to show loading state: "Checking displays..."

**Phase 3: Optional Enhancements**
- Track `showPermissionExplainerDismissed` state for "Skip" functionality
- Add dynamic button label reflecting permission state
- Add recovery hint link for denied state

### Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Root cause diagnosis | HIGH | Code paths traced, race condition clearly identified |
| Discriminated union pattern | HIGH | React official docs, TkDodo, Steve Kinney |
| Loading state approach | HIGH | Standard async React pattern, MDN verified |
| Consumer fix | HIGH | Direct conditional render eliminates race |

**Overall v1.2 confidence:** HIGH

### Gaps Remaining

1. **Exact timing of initial `isLoading` flip:** Should happen synchronously for unsupported browsers, need to verify feature detection is sync
2. **Permission change listener cleanup:** Ensure `status.onchange` is properly cleaned up on unmount
3. **Edge case: API supported but permission query throws:** Need defensive handling in catch block

### v1.2 Sources

**Official Documentation (HIGH):**
- [React useState documentation](https://react.dev/reference/react/useState)
- [React useEffect documentation](https://react.dev/reference/react/useEffect)
- [MDN: Using the Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API/Using_the_Permissions_API)

**Community Best Practices (MEDIUM):**
- [Max Rozen - Fixing Race Conditions in React](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect)
- [TkDodo - Things to know about useState](https://tkdodo.eu/blog/things-to-know-about-use-state)
- [Steve Kinney - Loading States and Error Handling](https://stevekinney.com/courses/react-typescript/loading-states-error-handling)
- [web.dev: Permissions Best Practices](https://web.dev/articles/permissions-best-practices)

---
*v1.2 research completed: 2026-01-18*
*Ready for requirements: yes*
