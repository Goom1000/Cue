# Domain Pitfalls: Browser Permission Request UX

**Domain:** Browser permission request UX for Window Management API
**Project:** PiPi v1.2 - Permission Flow Fix
**Researched:** 2026-01-18
**Confidence:** HIGH (verified against MDN, Chrome DevDocs, W3C, and web.dev best practices)

---

## Executive Summary

This research identifies pitfalls specific to browser permission request UX, with focus on the Window Management API and classroom/SmartBoard environments. The four issues identified in PiPi (race condition, visibility, feedback, recovery) are common patterns with well-documented solutions.

**Key insight:** Chrome data shows 77% of permission prompts shown without user interaction result in only 12% acceptance. With user interaction, acceptance rises to 30%. Timing is critical.

---

## Critical Pitfalls

Mistakes that cause the permission flow to fail or leave users unable to use the feature.

---

### Pitfall 1: Permission Check Race Condition on Initial Render

**What goes wrong:**
Permission status check completes AFTER the initial React render. The UI renders with stale state (assuming "prompt" or unknown), then the async permission check returns, but by then:
- The component has already rendered without the permission-aware UI
- State updates trigger a re-render, but the permission priming UI moment is lost
- User sees a flash of incorrect UI or nothing at all

**Your current code vulnerability:**
```typescript
// Likely pattern in Dashboard.tsx
useEffect(() => {
  // This runs AFTER first render
  navigator.permissions.query({ name: 'window-management' })
    .then(status => setPermissionState(status.state));
}, []);

// First render: permissionState is undefined/null
// Second render: permissionState is 'prompt'|'granted'|'denied'
// But user already saw the first render!
```

**Why it happens:**
- `useEffect` runs after paint, not before
- `navigator.permissions.query()` is async
- React's default behavior is to render immediately, update later
- No loading state means stale UI is shown

**Consequences:**
- Permission priming UI never appears (user sees launch button immediately)
- "Auto-Place on Projector" popup appears after user has already mentally moved on
- Teachers miss the permission opportunity entirely
- Feature appears broken ("it used to work, now it doesn't")

**Warning signs in code review:**
- Permission check in `useEffect` without loading state
- No `isLoading` or `isCheckingPermission` state
- Permission-dependent UI renders before permission state is known
- Missing dependency array or stale closure issues

**Prevention strategy:**
```typescript
// 1. Start with explicit loading state
const [permissionStatus, setPermissionStatus] = useState<{
  state: PermissionState | null;
  isLoading: boolean;
}>({ state: null, isLoading: true });

// 2. Check permission before first meaningful render
useEffect(() => {
  let isMounted = true;

  const checkPermission = async () => {
    try {
      const status = await navigator.permissions.query({
        name: 'window-management' as PermissionName
      });
      if (isMounted) {
        setPermissionStatus({ state: status.state, isLoading: false });

        // Subscribe to changes
        status.onchange = () => {
          if (isMounted) {
            setPermissionStatus({ state: status.state, isLoading: false });
          }
        };
      }
    } catch (e) {
      // API not supported (Firefox/Safari)
      if (isMounted) {
        setPermissionStatus({ state: null, isLoading: false });
      }
    }
  };

  checkPermission();
  return () => { isMounted = false; };
}, []);

// 3. Don't render permission-dependent UI until state is known
if (permissionStatus.isLoading) {
  return <LoadingState />; // Or skeleton
}
```

**Which requirement should address this:** PERM-01 (Fix permission detection race condition)

**Sources:**
- [React useEffect documentation](https://react.dev/reference/react/useEffect) - cleanup and race conditions
- [MDN Permissions.query()](https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query)
- [Max Rozen: Fixing Race Conditions in React](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect)

---

### Pitfall 2: Chrome Permission Chip is Easy to Miss

**What goes wrong:**
Chrome's permission UI is a small "chip" in the address bar that auto-dismisses after 12 seconds. In a classroom with a teacher focused on their SmartBoard setup, this chip is:
- Tiny compared to the overall browser window
- Located away from the user's visual focus (address bar vs. page content)
- Auto-dismisses while teacher is looking at projector/students
- Provides no indication that anything important just happened

**Why it happens:**
Chrome intentionally made permission prompts less intrusive starting in Chrome 98. The goal was to reduce "prompt fatigue" and stop sites from spamming users. But for legitimate use cases like classroom multi-display, this creates problems:
- The chip collapses to a blocked icon after 4-12 seconds
- Non-gesture-triggered prompts auto-dismiss even faster
- Teachers looking at SmartBoard setup miss the address bar entirely

**Chrome's stated rationale:**
> "The request chip automatically collapses to a blocked icon after a 12-second delay, then disappears entirely—allowing users to ignore requests without forced interaction."

**Consequences:**
- Teacher never notices permission prompt
- Permission remains in "prompt" state (not denied, not granted)
- Auto-placement silently doesn't work
- Teacher thinks feature is broken
- Support burden: "Why doesn't auto-placement work?"

**Warning signs in code review:**
- No custom permission priming UI before browser prompt
- Relying solely on browser's built-in permission chip
- No visual indicator on the page that permission is needed
- No explanation of what the permission enables

**Prevention strategy:**
```typescript
// 1. NEVER rely on browser permission chip alone
// 2. Show in-page permission priming BEFORE triggering browser prompt

const PermissionPrimer = ({ onAccept, onDecline }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
    <div className="flex items-start gap-3">
      <MonitorIcon className="w-6 h-6 text-blue-600 mt-0.5" />
      <div>
        <h3 className="font-semibold text-blue-900">
          Enable Auto-Placement on SmartBoard?
        </h3>
        <p className="text-sm text-blue-700 mt-1">
          PiPi can automatically place the student view on your projector
          or SmartBoard. You'll see a browser prompt in the address bar.
        </p>
        <div className="flex gap-2 mt-3">
          <Button onClick={onAccept} variant="primary" size="sm">
            Enable Auto-Placement
          </Button>
          <Button onClick={onDecline} variant="ghost" size="sm">
            I'll Position Manually
          </Button>
        </div>
      </div>
    </div>
  </div>
);

// 3. Draw attention to address bar when browser prompt appears
const drawAttentionToAddressBar = () => {
  // Show arrow or highlight pointing to address bar
  // Pulse animation on page to draw eye up
};
```

**Which requirement should address this:** PERM-02 (Make auto-placement status visible on launch button)

**Sources:**
- [Chrome Developers: Permissions Request Chip](https://developer.chrome.com/blog/permissions-chip)
- [web.dev: Permissions Best Practices](https://web.dev/articles/permissions-best-practices) - "77% of prompts without user interaction result in only 12% acceptance"
- [gHacks: Chrome Permission Prompts](https://www.ghacks.net/2022/02/05/google-is-making-permission-prompts-in-chrome-less-annoying/)

---

### Pitfall 3: No Feedback When Permission Not Granted

**What goes wrong:**
Button says "Launch Student" regardless of permission state. User has no idea that:
- Auto-placement is available but not enabled
- Permission was denied so feature is degraded
- Permission is in "prompt" state and can be requested
- Manual placement is the current mode

**Why it happens:**
- Developers assume permission state is binary (works/doesn't)
- Button label written once, never updated based on state
- No distinction between "feature unavailable" vs "feature disabled by user choice"
- Missing permission state in component props/state

**Consequences:**
- Teacher expects auto-placement, window appears on wrong screen
- No explanation of why feature isn't working
- Teacher doesn't know they can enable it
- "This used to work" confusion when permission expires/resets

**Warning signs in code review:**
- Button label is static string, not computed from state
- No permission state prop passed to launch button component
- Missing conditional rendering based on `permissionStatus.state`
- No tooltip or secondary text explaining current mode

**Prevention strategy:**
```typescript
// 1. Compute button state from permission
const getLaunchButtonState = (permissionState: PermissionState | null) => {
  if (permissionState === 'granted') {
    return {
      label: 'Launch on SmartBoard',
      sublabel: 'Auto-placement enabled',
      icon: <MonitorCheckIcon />,
      variant: 'primary'
    };
  }
  if (permissionState === 'denied') {
    return {
      label: 'Launch Student View',
      sublabel: 'Manual placement (permission blocked)',
      icon: <MonitorIcon />,
      variant: 'secondary',
      showRecoveryHint: true
    };
  }
  // 'prompt' or null (unsupported)
  return {
    label: 'Launch Student View',
    sublabel: 'Enable auto-placement',
    icon: <MonitorIcon />,
    variant: 'secondary',
    showEnableAction: true
  };
};

// 2. Show inline status, not separate popup
<Button {...buttonState}>
  <span className="flex flex-col items-start">
    <span>{buttonState.label}</span>
    <span className="text-xs opacity-70">{buttonState.sublabel}</span>
  </span>
</Button>

// 3. If permission denied, show inline recovery hint
{buttonState.showRecoveryHint && (
  <div className="text-xs text-amber-600 mt-1">
    <a href="#" onClick={showRecoveryInstructions}>
      How to enable auto-placement
    </a>
  </div>
)}
```

**Which requirement should address this:** PERM-04 (Clear feedback for manual vs auto placement)

**Sources:**
- [web.dev: Permission UX](https://web.dev/articles/push-notifications-permissions-ux)
- [Adam Lynch: Improve Permissions UX](https://adamlynch.com/improve-permissions-ux/)

---

### Pitfall 4: No Recovery Path After Permission Dismissal

**What goes wrong:**
User dismisses browser permission prompt (clicks away, prompt auto-expires, or explicitly denies). Now:
- Permission state is "prompt" (dismissed) or "denied" (explicit deny)
- There's no obvious way to trigger the permission request again
- Feature appears permanently unavailable
- User must navigate browser settings to fix (they won't)

**Why it happens:**
- Browser permission model is "ask once, remember forever"
- Dismissal doesn't equal denial, but browsers don't re-prompt automatically
- No in-app mechanism to re-trigger permission request
- Developer assumes user will figure out browser settings

**Chrome's behavior:**
> "Once a user has decided to permanently not allow access to a permission-gated capability, browsers honor that decision. If it was possible to keep prompting for access, ill-meaning sites would continue bombarding users with prompts."

**But for dismissal (not explicit deny):**
> "Users can re-request temporarily blocked permissions within the same session, though repeated requests risk triggering auto-blocking."

**Consequences:**
- Teacher accidentally dismisses prompt during class setup
- Auto-placement never works for this teacher
- Teacher blames app, not browser
- 54% recovery rate possible with proper UI (Chrome's data on `<permission>` element)

**Warning signs in code review:**
- No way to trigger `getScreenDetails()` after initial component mount
- No "Enable Auto-Placement" action in settings or UI
- No detection of "prompt" state with recovery action
- No instructions for recovering from "denied" state

**Prevention strategy:**
```typescript
// 1. Provide explicit action to request permission
const RequestPermissionButton = () => {
  const handleClick = async () => {
    try {
      // This MUST be in a click handler (user gesture required)
      await window.getScreenDetails();
      // Success - permission granted
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        // User denied or dismissed
        showRecoveryInstructions();
      }
    }
  };

  return (
    <Button onClick={handleClick}>
      Enable Auto-Placement
    </Button>
  );
};

// 2. For 'denied' state, show browser-specific recovery instructions
const RecoveryInstructions = ({ browser }) => {
  const steps = {
    chrome: [
      'Click the lock/tune icon in the address bar',
      'Find "Window management" in the list',
      'Change from "Block" to "Allow"',
      'Refresh the page'
    ],
    edge: [
      'Click the lock icon in the address bar',
      'Click "Permissions for this site"',
      'Find "Window placement" and set to "Allow"',
      'Refresh the page'
    ]
  };

  return (
    <div className="text-sm">
      <h4 className="font-medium">To enable auto-placement:</h4>
      <ol className="list-decimal list-inside mt-2">
        {steps[browser].map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
};

// 3. Detect browser for correct instructions
const detectBrowser = () => {
  if (navigator.userAgent.includes('Edg/')) return 'edge';
  if (navigator.userAgent.includes('Chrome')) return 'chrome';
  return 'unknown';
};
```

**Which requirement should address this:** PERM-03 (Add reliable permission request trigger)

**Sources:**
- [web.dev: Permissions Best Practices](https://web.dev/articles/permissions-best-practices) - recovery from blocked state
- [Chrome: Rethinking Web Permissions](https://developer.chrome.com/blog/rethinking-web-permissions) - 54.4% recovery rate with proper UI
- [Google Chrome Help: Site Permissions](https://support.google.com/chrome/answer/114662?hl=en)

---

### Pitfall 5: User Gesture Requirement for getScreenDetails()

**What goes wrong:**
Calling `getScreenDetails()` outside of a user gesture (click, keypress) results in:
- `DOMException: Permission decision deferred`
- Permission prompt never appears
- Code appears to work but silently fails

**Why it happens:**
Chrome requires "transient user activation" for permission prompts. From W3C issue #135:
> "Chrome only shows a permission prompt if window.getScreenDetails() consumes a transient activation. Try calling it in response to a mouse click or key press."

**Your current code vulnerability:**
If calling `getScreenDetails()` in:
- `useEffect` on mount (no gesture)
- `setTimeout` or `setInterval` callback (gesture expired)
- Promise chain that lost activation context

**Consequences:**
- Permission state stays "prompt" forever
- No error in catch block (promise resolves, just deferred)
- Developer thinks code works, users see nothing
- Intermittent bug based on timing

**Warning signs in code review:**
- `getScreenDetails()` called outside click handler
- Async/await chain between click and API call
- `setTimeout` or debounce wrapping the permission request
- Error: "Permission decision deferred" in console

**Prevention strategy:**
```typescript
// BAD: Called in useEffect
useEffect(() => {
  window.getScreenDetails(); // Will defer, not prompt
}, []);

// BAD: Async delay loses activation
const handleClick = async () => {
  await someOtherAsyncWork();
  await window.getScreenDetails(); // May defer
};

// GOOD: Synchronous call in click handler
const handleClick = () => {
  window.getScreenDetails()
    .then(details => {
      // Use details
    })
    .catch(err => {
      // Handle denial
    });
};

// GOOD: Call first, then do other work
const handleClick = async () => {
  const detailsPromise = window.getScreenDetails(); // Consumes activation
  await someOtherAsyncWork();
  const details = await detailsPromise;
};
```

**Which requirement should address this:** PERM-01 (Fix permission detection race condition) and PERM-03 (Reliable permission request trigger)

**Sources:**
- [W3C Window Management Issue #135](https://github.com/w3c/window-management/issues/135) - exact error and solution
- [Chrome Developers: Window Management API](https://developer.chrome.com/docs/capabilities/web-apis/window-management)

---

## Moderate Pitfalls

Mistakes that cause degraded UX but don't completely break the feature.

---

### Pitfall 6: Permission Priming at Wrong Moment

**What goes wrong:**
Showing permission priming UI:
- On page load (annoying, no context)
- In a dismissible popup (easy to miss/dismiss)
- Before user has indicated intent to use the feature

**Why it happens:**
Developers want to "front-load" permission so it's ready when needed. But:
> "In terms of user experience, displaying a permission prompt on load is probably the best way to make a poor first impression, and in most cases an irreversible mistake."

**Chrome data:**
- 79% of permission prompts triggered without user gesture
- Only 12% acceptance rate for auto-triggered prompts
- 30% acceptance rate when prompted after user action

**Consequences:**
- Users deny permission reflexively
- "Why is this asking me stuff?" distrust
- Permission denied before user understands value
- Feature appears broken later

**Warning signs in code review:**
- Permission request in component mount (`useEffect` with `[]`)
- No user action required before permission prompt
- Permission priming shows regardless of user intent
- Popup/toast that can be dismissed without decision

**Prevention strategy:**
```typescript
// 1. Prime at the right moment: when user clicks "Launch"
const handleLaunchClick = async () => {
  if (permissionState === 'prompt') {
    // Show inline priming, wait for confirmation
    setShowPriming(true);
    return; // Don't launch yet
  }
  // Permission already granted or denied, proceed
  launchStudentView();
};

// 2. In priming UI, explain the benefit
<PermissionPrimer
  onEnable={() => {
    window.getScreenDetails()
      .then(() => launchStudentView())
      .catch(() => launchStudentView()); // Fallback to manual
  }}
  onSkip={() => launchStudentView()} // Manual placement
/>

// 3. Don't block the happy path
// If permission granted, go straight to launch
// If permission denied, still let them launch manually
```

**Which requirement should address this:** PERM-02 (Make status visible on button) and PERM-04 (Clear feedback)

**Sources:**
- [UX Planet: Right Ways to Ask for Permissions](https://uxplanet.org/mobile-ux-design-the-right-ways-to-ask-users-for-permissions-6cdd9ab25c27)
- [web.dev: Push Notifications Permissions UX](https://web.dev/articles/push-notifications-permissions-ux)

---

### Pitfall 7: Not Listening for Permission State Changes

**What goes wrong:**
Permission state changes (user grants/revokes in browser settings) but app doesn't update:
- User grants permission in site settings, but button still says "Manual Placement"
- User revokes permission, but app still tries auto-placement (and fails)
- Page refresh required to see current state

**Why it happens:**
- Initial permission check, but no `onchange` listener
- Stale closure captures initial state
- No reactive pattern for permission updates

**Consequences:**
- UI out of sync with reality
- User confusion: "I just enabled it, why doesn't it work?"
- Silent failures when permission revoked

**Warning signs in code review:**
- `navigator.permissions.query()` called once, result stored
- No `status.onchange` handler
- No polling fallback for browsers without `onchange` support

**Prevention strategy:**
```typescript
useEffect(() => {
  let status: PermissionStatus | null = null;

  const checkPermission = async () => {
    try {
      status = await navigator.permissions.query({
        name: 'window-management' as PermissionName
      });

      setPermissionState(status.state);

      // Subscribe to changes
      status.onchange = () => {
        setPermissionState(status!.state);
      };
    } catch (e) {
      // Not supported
    }
  };

  checkPermission();

  return () => {
    if (status) {
      status.onchange = null; // Cleanup listener
    }
  };
}, []);
```

**Which requirement should address this:** PERM-01 (Fix permission detection)

**Sources:**
- [MDN PermissionStatus.onchange](https://developer.mozilla.org/en-US/docs/Web/API/PermissionStatus/change_event)

---

### Pitfall 8: Classroom Environment: Teacher Focused on Students/Equipment

**What goes wrong:**
Permission prompts and UI designed for single-user desktop scenario. In classroom:
- Teacher is looking at SmartBoard, not laptop
- Teacher is managing 30 students, not watching browser
- Setup happens under time pressure (class starting)
- Small UI elements invisible from arm's length

**Why it happens:**
- Web UX assumes user is focused on screen
- Permission chips designed to be unobtrusive (too unobtrusive for classroom)
- No consideration for split-attention environments

**Consequences:**
- Teacher misses 12-second permission window entirely
- Small status indicators invisible from teaching position
- Setup takes multiple attempts
- Feature appears unreliable

**Warning signs in code review:**
- Small (text-xs, text-sm) status indicators
- Subtle color differentiation (light gray vs slightly lighter gray)
- Animations that complete quickly
- No persistent visual state indicator

**Prevention strategy:**
```typescript
// 1. Large, obvious status on the launch button itself
<Button size="lg" className="min-w-[200px]">
  <div className="flex flex-col items-center py-1">
    <span className="text-lg font-semibold">
      {permissionGranted ? 'Launch on SmartBoard' : 'Launch Student View'}
    </span>
    <span className={cn(
      "text-xs mt-0.5",
      permissionGranted ? "text-green-200" : "text-amber-200"
    )}>
      {permissionGranted ? 'Auto-placement enabled' : 'Manual placement'}
    </span>
  </div>
</Button>

// 2. Persistent indicator, not disappearing toast
// Show status badge/icon that doesn't auto-dismiss

// 3. Consider visual size for arm's-length viewing
// Minimum touch target 44x44px, larger for classroom

// 4. High contrast colors (not subtle pastels)
// Green/amber/red status, not slight shade variations
```

**Which requirement should address this:** PERM-02 (Make status visible on button) and PERM-04 (Clear feedback)

---

## Minor Pitfalls

Annoyances that are fixable but worth noting.

---

### Pitfall 9: Old vs New Permission Name

**What goes wrong:**
Code uses old permission name `window-placement` instead of `window-management`. Works in some Chrome versions, fails in others.

**Prevention:**
```typescript
// Defensive code for both names
async function getWindowManagementPermissionState() {
  let state;
  try {
    // Try new name first
    state = await navigator.permissions.query({
      name: 'window-management' as PermissionName
    });
  } catch {
    try {
      // Fallback to old name
      state = await navigator.permissions.query({
        name: 'window-placement' as PermissionName
      });
    } catch {
      return null; // Neither supported
    }
  }
  return state;
}
```

**Sources:**
- [Chrome Developers: Window Management](https://developer.chrome.com/docs/capabilities/web-apis/window-management) - mentions name change

---

### Pitfall 10: TypeScript Types for Permission Name

**What goes wrong:**
TypeScript complains that `'window-management'` is not assignable to `PermissionName` type because it's not in the standard type definitions yet.

**Prevention:**
```typescript
// Option 1: Type assertion
await navigator.permissions.query({
  name: 'window-management' as PermissionName
});

// Option 2: Extend types (in global.d.ts)
interface PermissionDescriptor {
  name: 'window-management' | PermissionName;
}
```

---

## Phase-Specific Risk Summary

| Requirement | Pitfall | Priority | Detection |
|-------------|---------|----------|-----------|
| PERM-01 | Pitfall 1: Race condition | CRITICAL | Permission UI never appears on first load |
| PERM-01 | Pitfall 5: User gesture required | CRITICAL | "Permission decision deferred" error |
| PERM-01 | Pitfall 7: No state change listener | MODERATE | UI doesn't update after settings change |
| PERM-02 | Pitfall 2: Chrome chip easy to miss | CRITICAL | Teacher doesn't notice address bar |
| PERM-02 | Pitfall 8: Classroom split attention | MODERATE | Small UI elements |
| PERM-03 | Pitfall 4: No recovery path | CRITICAL | No way to re-request after dismiss |
| PERM-03 | Pitfall 5: User gesture required | CRITICAL | Permission request fails silently |
| PERM-04 | Pitfall 3: No feedback | CRITICAL | Button always says "Launch Student" |
| PERM-04 | Pitfall 6: Wrong timing | MODERATE | Permission asked before user intent |

---

## Architecture Recommendation

Based on these pitfalls, the permission flow should be:

### 1. On Component Mount
```
Check permission state (with loading indicator)
  -> 'granted': Show "Launch on SmartBoard" button
  -> 'denied': Show "Launch Student View" + recovery hint
  -> 'prompt': Show "Launch Student View" + enable option
  -> null (unsupported): Show "Launch Student View" (manual only)
```

### 2. On Launch Button Click
```
If 'prompt':
  Show inline priming UI explaining benefit
  On "Enable" click: call getScreenDetails() in click handler
  On "Skip" click: launch with manual placement

If 'granted':
  Launch with auto-placement on external screen

If 'denied' or unsupported:
  Launch with manual placement
  Show inline tip about dragging to projector
```

### 3. State Display
```
Button label reflects current mode:
  - "Launch on SmartBoard" (granted)
  - "Launch Student View" (prompt/denied/unsupported)

Sublabel shows status:
  - "Auto-placement enabled" (granted)
  - "Enable auto-placement" (prompt)
  - "Manual placement" (denied/unsupported)
```

### 4. Recovery
```
Settings/gear icon opens modal with:
  - Current permission status
  - "Request Permission" button (if prompt)
  - Browser-specific recovery instructions (if denied)
```

---

## Summary: Top 5 Permission UX Pitfalls

| Priority | Pitfall | Impact | Requirement |
|----------|---------|--------|-------------|
| 1 | Race condition on initial render | Permission UI never appears | PERM-01 |
| 2 | Chrome chip auto-dismisses | Teacher misses prompt entirely | PERM-02, PERM-03 |
| 3 | No feedback on button | User doesn't know feature state | PERM-04 |
| 4 | No recovery after dismiss | Feature appears permanently broken | PERM-03 |
| 5 | User gesture required | Silent failure if called wrong | PERM-01, PERM-03 |

---

## Sources Summary

**Official Documentation:**
- [MDN: Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API)
- [MDN: Using the Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API/Using)
- [MDN: Permissions.query()](https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query)
- [Chrome Developers: Window Management API](https://developer.chrome.com/docs/capabilities/web-apis/window-management)
- [Chrome Developers: Permissions Request Chip](https://developer.chrome.com/blog/permissions-chip)

**Best Practices:**
- [web.dev: Permissions Best Practices](https://web.dev/articles/permissions-best-practices)
- [web.dev: Push Notifications Permissions UX](https://web.dev/articles/push-notifications-permissions-ux)
- [Adam Lynch: Improve Permissions UX](https://adamlynch.com/improve-permissions-ux/)

**Issue Discussions:**
- [W3C Window Management Issue #135](https://github.com/w3c/window-management/issues/135) - Permission popup not displaying
- [Chrome: Rethinking Web Permissions](https://developer.chrome.com/blog/rethinking-web-permissions)

**React Patterns:**
- [Max Rozen: Fixing Race Conditions in React](https://maxrozen.com/race-conditions-fetching-data-react-with-useeffect)
- [React useEffect Documentation](https://react.dev/reference/react/useEffect)
