# Phase 1: Permission State Loading - Research

**Researched:** 2026-01-18
**Domain:** React hook async initialization with Window Management API permission detection
**Confidence:** HIGH

## Summary

This phase addresses the race condition in `useWindowManagement` where the permission state is not yet known when the UI first renders. The current hook initializes `permissionState` to `'unavailable'` and updates it asynchronously, causing the PermissionExplainer to either not appear or flash incorrectly.

The fix is straightforward: add an `isLoading` state that starts `true` and becomes `false` only after the initial permission check completes. The UI should show "Checking displays..." during this loading phase and defer all permission-dependent UI until the state is definitively known.

**Primary recommendation:** Add `isLoading: boolean` to the hook's return type, default to `true`, set to `false` after `navigator.permissions.query()` resolves, and block permission-related UI until `isLoading === false`.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | Already in use | Project requirement |
| Window Management API | N/A (browser) | Permission detection | Chromium-only, already integrated |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | This is pure React state management, no additional libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual loading state | React 19 `use()` + Suspense | Overkill for single permission check; Suspense boundary adds complexity |
| Manual loading state | `useTransition` | Designed for transitions, not initial load; permission check isn't a "transition" |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Hook State Structure
```typescript
interface UseWindowManagementResult {
  isSupported: boolean;
  hasMultipleScreens: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unavailable';
  secondaryScreen: ScreenTarget | null;
  requestPermission: () => Promise<boolean>;
  isLoading: boolean;  // NEW: true until initial permission check completes
}
```

### Pattern 1: Loading State Before Async Check
**What:** Initialize `isLoading: true` and set to `false` only after the async permission check completes.
**When to use:** Any hook that performs async initialization that affects UI rendering.
**Example:**
```typescript
// Source: https://react.dev/reference/react/useEffect (React cleanup patterns)
function useWindowManagement(): UseWindowManagementResult {
  const [isLoading, setIsLoading] = useState(true);
  const [permissionState, setPermissionState] =
    useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('unavailable');

  useEffect(() => {
    if (!isSupported || !hasMultipleScreens) {
      setIsLoading(false);  // No permission check needed
      return;
    }

    let isMounted = true;

    const checkPermission = async () => {
      try {
        const status = await navigator.permissions.query({
          name: 'window-management' as PermissionName
        });

        if (isMounted) {
          setPermissionState(status.state as 'prompt' | 'granted' | 'denied');
          setIsLoading(false);  // Permission known, loading complete

          status.addEventListener('change', () => {
            if (isMounted) {
              setPermissionState(status.state as 'prompt' | 'granted' | 'denied');
            }
          });
        }
      } catch {
        if (isMounted) {
          setPermissionState('prompt');  // Assume prompt if query fails
          setIsLoading(false);
        }
      }
    };

    checkPermission();
    return () => { isMounted = false; };
  }, [isSupported, hasMultipleScreens]);

  return { /* ... */ isLoading };
}
```

### Pattern 2: Consumer Loading Check
**What:** UI components check `isLoading` before rendering permission-dependent elements.
**When to use:** In PresentationView.tsx where the launch button and PermissionExplainer live.
**Example:**
```typescript
// Source: Current PresentationView.tsx pattern (lines 224-231)
const {
  isSupported,
  hasMultipleScreens,
  permissionState,
  secondaryScreen,
  requestPermission,
  isLoading  // NEW
} = useWindowManagement();

// In JSX:
{isLoading ? (
  <button disabled className="...">
    Checking displays...
  </button>
) : (
  <>
    <button onClick={handleLaunch}>
      {secondaryScreen ? `Launch on ${secondaryScreen.label}` : 'Launch Student'}
    </button>
    {showPermissionExplainer && permissionState === 'prompt' && (
      <PermissionExplainer ... />
    )}
  </>
)}
```

### Anti-Patterns to Avoid
- **Rendering permission UI before isLoading is false:** Shows incorrect state, causes flicker.
- **Using permissionState without checking isLoading:** The initial 'unavailable' value is a placeholder, not the truth.
- **Setting isLoading = false before permission check:** Defeats the purpose; must be set AFTER async resolves.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mounted check | Custom ref pattern | `useRef(true)` with cleanup | Standard React pattern, prevents state updates after unmount |
| Permission name compatibility | Try-catch both names | Single 'window-management' name | Chrome has aliased 'window-placement' to 'window-management' since Chrome 100 |
| Complex async state | Custom state machine | Simple `isLoading` boolean | Permission check is a single async call, not a complex flow |

**Key insight:** This is a minimal change to an existing, working hook. The pattern is well-established (loading state for async init) and requires no new libraries or complex abstractions.

## Common Pitfalls

### Pitfall 1: useEffect Runs After First Paint
**What goes wrong:** The permission check in `useEffect` runs AFTER the component renders, so the first render sees stale state.
**Why it happens:** React's design - effects run after paint to avoid blocking.
**How to avoid:** Accept this timing; show loading UI until async completes. Don't try to block render.
**Warning signs:** PermissionExplainer flashes briefly or never appears.

### Pitfall 2: Setting isLoading = false in Wrong Location
**What goes wrong:** Loading state ends before permission state is actually known.
**Why it happens:** Developer sets `isLoading = false` outside the try-catch or before the query resolves.
**How to avoid:** Set `isLoading = false` only inside the callback AFTER `setPermissionState()`.
**Warning signs:** Button shows wrong label immediately, then changes.

### Pitfall 3: State Updates After Unmount
**What goes wrong:** Component unmounts during async check, setState is called on unmounted component.
**Why it happens:** User navigates away or exits presentation before permission check completes.
**How to avoid:** Use `isMounted` ref pattern (already in current hook code).
**Warning signs:** React warning about state update on unmounted component.

### Pitfall 4: Missing Dependency Array Items
**What goes wrong:** Effect doesn't re-run when `isSupported` or `hasMultipleScreens` changes.
**Why it happens:** Developer forgets to include all dependencies.
**How to avoid:** Include `[isSupported, hasMultipleScreens]` in dependency array.
**Warning signs:** Hook doesn't react to screen changes.

## Code Examples

Verified patterns from official sources:

### Loading State in Custom Hook (Core Pattern)
```typescript
// Source: https://react.dev/reference/react/useEffect
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query
function useWindowManagement(): UseWindowManagementResult {
  const [isLoading, setIsLoading] = useState(true);
  // ... other state

  useEffect(() => {
    if (!isSupported || !hasMultipleScreens) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    navigator.permissions.query({ name: 'window-management' as PermissionName })
      .then(status => {
        if (!isMounted) return;
        setPermissionState(status.state as 'prompt' | 'granted' | 'denied');
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setPermissionState('prompt');
        setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [isSupported, hasMultipleScreens]);

  return { isLoading, /* ... */ };
}
```

### Consumer Button Pattern
```typescript
// Source: Current PresentationView.tsx pattern
<button
  disabled={isLoading || isConnected}
  className={`px-3 py-1.5 rounded-lg text-xs font-bold ...`}
>
  {isLoading
    ? 'Checking displays...'
    : secondaryScreen
      ? `Launch on ${secondaryScreen.label}`
      : 'Launch Student'}
</button>
```

### PermissionExplainer Gate
```typescript
// Source: Current PresentationView.tsx lines 243-247
useEffect(() => {
  // Only show explainer when NOT loading AND state is definitively 'prompt'
  if (!isLoading && isSupported && hasMultipleScreens && permissionState === 'prompt') {
    setShowPermissionExplainer(true);
  }
}, [isLoading, isSupported, hasMultipleScreens, permissionState]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Assume permission state immediately | Wait for async check with loading state | Standard React pattern | Prevents race condition, shows correct UI |
| Permission name 'window-placement' | Permission name 'window-management' | Chrome 100 (2022) | Use 'window-management' as canonical name |
| useEffect with fetch | React 19 `use()` with Suspense | React 19 (2024) | Optional; classic pattern still valid for hooks |

**Deprecated/outdated:**
- None relevant to this change. The loading state pattern is evergreen.

## Open Questions

Things that couldn't be fully resolved:

1. **Edge case: What if permission query never resolves?**
   - What we know: In practice, `navigator.permissions.query()` resolves quickly (< 100ms).
   - What's unclear: No timeout handling in current design.
   - Recommendation: Accept this risk for v1.2; add timeout if real-world issues emerge.

2. **Transition from loading to loaded - any animation needed?**
   - What we know: Current design has no transition animation.
   - What's unclear: Whether "Checking displays..." to actual button should fade/transition.
   - Recommendation: Claude's discretion - simple state swap is acceptable.

## Sources

### Primary (HIGH confidence)
- [MDN: Using the Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API/Using) - Permission query pattern, isExtended property
- [MDN: Permissions.query()](https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query) - Standard permission query API
- [Chrome Developers: Window Management API](https://developer.chrome.com/docs/capabilities/web-apis/window-management) - Defensive permission checking, screenschange events
- [React useEffect Documentation](https://react.dev/reference/react/useEffect) - Cleanup patterns, async in effects

### Secondary (MEDIUM confidence)
- [Ultimate Courses: Async in useEffect](https://ultimatecourses.com/blog/using-async-await-inside-react-use-effect-hook) - IIFE pattern, mounted ref pattern
- [Devtrium: Async Functions in useEffect](https://devtrium.com/posts/async-functions-useeffect) - Loading state management

### Tertiary (LOW confidence)
- None - all patterns verified with official documentation.

### Project Context (HIGH confidence)
- `.planning/research/PITFALLS.md` - Comprehensive prior research on permission UX pitfalls (Pitfall 1 directly addresses this phase)
- `hooks/useWindowManagement.ts` - Current implementation to modify
- `components/PresentationView.tsx` - Consumer of the hook

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, pure React patterns
- Architecture: HIGH - Loading state pattern is well-documented and already partially used in project
- Pitfalls: HIGH - Prior research in PITFALLS.md is comprehensive

**Research date:** 2026-01-18
**Valid until:** Indefinite - these are stable React and Web API patterns
