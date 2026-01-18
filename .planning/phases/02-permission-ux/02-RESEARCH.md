# Phase 2: Permission UX - Research

**Researched:** 2026-01-18
**Domain:** React UI patterns, browser permission UX, toast notifications
**Confidence:** HIGH

## Summary

This phase implements UI that communicates permission state to teachers through button labels, toast feedback, and recovery guidance. Research confirms the existing codebase has most infrastructure needed:

1. **Toast system exists** - The project already has a `Toast.tsx` component with `useToast` hook, auto-dismiss, and fade animations. This matches the 5-second auto-dismiss requirement exactly.

2. **Permission hook ready** - The `useWindowManagement` hook from Phase 1 exposes `permissionState`, `secondaryScreen` (with label), and `isLoading` - all needed data points.

3. **UI patterns established** - Existing `PermissionExplainer` and `ManualPlacementGuide` components show the pattern for inline permission UI with consistent styling.

**Primary recommendation:** Extend existing components rather than building new ones. The button label logic, toast messages, and recovery UI are straightforward React patterns using existing infrastructure.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.0 | UI framework | Already the project's foundation |
| TailwindCSS | CDN | Utility styling | Already used throughout project |

### Supporting (Already in Project)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `Toast.tsx` + `useToast` | Toast notifications | For launch feedback |
| `useWindowManagement` | Permission state | For button labels and recovery triggers |

### Not Needed
| Category | Library | Reason Not Needed |
|----------|---------|-------------------|
| Toast library | Sonner, react-hot-toast | Project already has custom Toast system |
| Browser detection | UAParser.js | Simple user agent checks sufficient for guidance text |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
components/
  PresentationView.tsx    # Modify: button labels, toast on launch
  Toast.tsx               # Existing: maybe add variants
  PermissionExplainer.tsx # Modify: rename to inline link style
  ManualPlacementGuide.tsx # Modify: add denied-specific recovery
  PermissionRecovery.tsx  # NEW: modal with browser-specific instructions
```

### Pattern 1: Conditional Button Labels
**What:** Button text computed from permission state
**When to use:** Launch button rendering
**Example:**
```typescript
// Compute label based on permission state
const getLaunchButtonLabel = () => {
  if (isLoading) return 'Checking displays...';
  if (isConnected) return 'Student Active';

  switch (permissionState) {
    case 'granted':
      return `Launch \u2192 External Display`; // Arrow: →
    case 'denied':
      return 'Launch Student'; // Same as prompt, warning shown elsewhere
    case 'prompt':
    case 'unavailable':
    default:
      return 'Launch Student';
  }
};
```

### Pattern 2: Toast on Launch with Placement Context
**What:** Show toast after window.open indicating where window opened
**When to use:** After successful window launch
**Example:**
```typescript
const handleLaunch = () => {
  const studentWindow = window.open(url, 'pipi-student', features);

  if (studentWindow && !studentWindow.closed) {
    // Show placement feedback
    if (secondaryScreen) {
      addToast('Opened on External Display', 5000);
    } else {
      addToast('Opened on this screen', 5000);
    }
  }
};
```

### Pattern 3: Browser Detection for Recovery Guidance
**What:** Detect browser to show relevant permission reset instructions
**When to use:** Recovery modal content
**Example:**
```typescript
// Source: MDN User Agent guidance + project requirements
type BrowserType = 'chrome' | 'edge' | 'unknown';

const detectBrowser = (): BrowserType => {
  const ua = navigator.userAgent;

  // Edge must be checked before Chrome (Edge includes 'Chrome' in UA)
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Chrome/') && !ua.includes('Chromium/')) return 'chrome';

  return 'unknown';
};

// Note: Safari/Firefox don't support Window Management API
// so recovery instructions only needed for Chrome/Edge
```

### Pattern 4: Inline Permission Request Link
**What:** Text link style for "Enable auto-placement"
**When to use:** Near launch button when permission is 'prompt'
**Example:**
```typescript
// Per CONTEXT.md: "Styled as text link: Enable auto-placement"
{permissionState === 'prompt' && hasMultipleScreens && !isConnected && (
  <button
    onClick={requestPermission}
    className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
  >
    Enable auto-placement
  </button>
)}
```

### Anti-Patterns to Avoid
- **Polling permission state:** Permission API supports change events - use them
- **Raw display names in UI:** Always use "External Display" per CONTEXT.md decisions
- **Blocking modals for recovery:** Use inline text + link, not interrupting modal (modal is for help, not blocking)
- **Custom toast library:** Project already has Toast.tsx - don't add Sonner/react-hot-toast

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | Existing `Toast.tsx` | Already handles auto-dismiss, fade, positioning |
| Permission state | Manual permission queries | `useWindowManagement` hook | Already tracks state, listens for changes |
| Fade animations | Custom animation code | Tailwind `animate-fade-in` | Already defined in project |

**Key insight:** This phase is mostly about wiring existing infrastructure to new UI states, not building new systems.

## Common Pitfalls

### Pitfall 1: Racing Button Label and Permission State
**What goes wrong:** Button shows wrong label before permission state resolves
**Why it happens:** isLoading exists but UI doesn't wait for it
**How to avoid:** Always check `isLoading` first in label computation
**Warning signs:** Flash of wrong button text on initial load

### Pitfall 2: Toast Shown When Popup Blocked
**What goes wrong:** "Opened on External Display" toast shows even when popup was blocked
**Why it happens:** Toast fires before popup block detection
**How to avoid:** Check `studentWindow && !studentWindow.closed` before showing toast
**Warning signs:** Confusing feedback when browser blocks popup

### Pitfall 3: Recovery Modal for Wrong Browser
**What goes wrong:** Chrome instructions shown to Edge user (or vice versa)
**Why it happens:** Edge UA includes "Chrome" - must check Edg/ first
**How to avoid:** Check `Edg/` before checking `Chrome/` in detection logic
**Warning signs:** Users can't find described settings location

### Pitfall 4: Permission Link Visible After Grant
**What goes wrong:** "Enable auto-placement" link stays visible after permission granted
**Why it happens:** UI doesn't re-render on permission state change
**How to avoid:** Link visibility keyed on `permissionState === 'prompt'` directly
**Warning signs:** Redundant UI element after successful permission grant

### Pitfall 5: Warning Icon Without Context
**What goes wrong:** Button has warning icon but user doesn't know why or what to do
**Why it happens:** Icon added without accompanying recovery guidance
**How to avoid:** Always pair warning icon with visible recovery text/link nearby
**Warning signs:** Teacher sees warning but has no action path

## Code Examples

Verified patterns from existing codebase and requirements:

### Existing Toast Usage (from PresentationView.tsx)
```typescript
// Source: components/PresentationView.tsx lines 222, 277
const { toasts, addToast, removeToast } = useToast();

// Later in effect:
addToast('Reconnected to student view', 3000);
```

### Existing Toast Component (from Toast.tsx)
```typescript
// Source: components/Toast.tsx
// Already supports: message, duration (ms), auto-dismiss, fade animation
// Duration: passed as second argument to addToast
addToast('Message here', 5000); // 5 seconds per PERM-04
```

### Launch Button Current Structure (from PresentationView.tsx)
```typescript
// Source: components/PresentationView.tsx lines 467-482
// This is the button to modify for PERM-02/PERM-05
<button
  onClick={() => { /* launch logic */ }}
  disabled={isLoading || isConnected}
  className={/* conditional classes */}
>
  {isLoading
    ? 'Checking displays...'
    : secondaryScreen
      ? `Launch on ${secondaryScreen.label}`  // PERM-05 target
      : isConnected
        ? 'Student Active'
        : 'Launch Student'}
</button>
```

### Browser Detection for Recovery Modal
```typescript
// Browser-specific reset instructions (PERM-06)
const browserInstructions: Record<BrowserType, { steps: string[]; link: string }> = {
  chrome: {
    steps: [
      'Click the lock icon in the address bar',
      'Select "Site settings"',
      'Find "Window management" under Permissions',
      'Change from "Block" to "Ask" or "Allow"',
      'Refresh this page'
    ],
    link: 'chrome://settings/content/windowManagement'
  },
  edge: {
    steps: [
      'Click the lock icon in the address bar',
      'Select "Permissions for this site"',
      'Find "Window management"',
      'Change from "Block" to "Ask" or "Allow"',
      'Refresh this page'
    ],
    link: 'edge://settings/content/windowManagement'
  },
  unknown: {
    steps: [
      'Open your browser settings',
      'Find Site permissions or Site settings',
      'Look for Window management',
      'Reset or allow permission for this site'
    ],
    link: ''
  }
};
```

### Warning Icon for Denied State
```typescript
// SVG warning/alert icon (consistent with existing project icons)
<svg
  className="w-4 h-4 text-amber-400"
  fill="currentColor"
  viewBox="0 0 20 20"
>
  <path
    fillRule="evenodd"
    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
    clipRule="evenodd"
  />
</svg>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pre-prompt explanation modal | Inline link, prompt on click | CONTEXT.md decision | Simpler UX, fewer clicks |
| Raw display names | Friendly "External Display" | CONTEXT.md decision | Cleaner UI |
| Dismissible recovery modal | Inline text + help link | CONTEXT.md decision | Less intrusive |

**Deprecated/outdated:**
- `PermissionExplainer` current button-heavy style: Replace with text link per CONTEXT.md
- Raw `secondaryScreen.label` display: Use "External Display" label per CONTEXT.md

## Open Questions

Things that couldn't be fully resolved:

1. **Toast differentiation for auto-placed vs manual**
   - What we know: CONTEXT.md says "Claude's discretion" on message wording
   - What's unclear: Whether to differentiate or use same message
   - Recommendation: Use same "Opened on External Display" / "Opened on this screen" for simplicity - placement method is internal detail

2. **Screenshots in recovery modal**
   - What we know: CONTEXT.md says "Claude's discretion"
   - What's unclear: Whether screenshots add value vs maintenance burden
   - Recommendation: Skip screenshots initially - text instructions are sufficient and don't require updates when browser UI changes

## Sources

### Primary (HIGH confidence)
- `/components/Toast.tsx` - Verified existing toast API and patterns
- `/components/PresentationView.tsx` - Verified launch button structure and toast usage
- `/hooks/useWindowManagement.ts` - Verified permission state API
- `02-CONTEXT.md` - User decisions on UI patterns

### Secondary (MEDIUM confidence)
- [MDN User Agent Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Browser_detection_using_the_user_agent) - Browser detection patterns
- [Google Chrome Help](https://support.google.com/chrome/answer/114662) - Permission reset instructions
- [LogRocket Toast Blog](https://blog.logrocket.com/react-toast-libraries-compared-2025/) - Toast library comparison (confirmed existing system is sufficient)

### Tertiary (LOW confidence - not used)
- WebSearch results for toast libraries - Not needed, project has custom solution

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct codebase verification
- Architecture: HIGH - Extends existing patterns
- Pitfalls: HIGH - Based on actual code and requirements

**Research date:** 2026-01-18
**Valid until:** 2026-03-18 (60 days - stable React patterns, no external dependencies)

---
*Phase: 02-permission-ux*
*Research completed: 2026-01-18*
