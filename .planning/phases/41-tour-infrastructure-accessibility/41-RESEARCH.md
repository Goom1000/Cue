# Phase 41: Tour Infrastructure & Accessibility - Research

**Researched:** 2026-01-27
**Domain:** Product tours, tooltips, and accessibility (driver.js, Floating UI, WCAG 2.1)
**Confidence:** HIGH

## Summary

Phase 41 establishes the foundational tour and tooltip infrastructure for Cue's onboarding system. The standard stack uses **driver.js 1.4.0** (~5kb gzipped) for product tours and **@floating-ui/react** (~3kb gzipped) for accessible tooltips. Both libraries are well-suited for React integration despite driver.js being vanilla TypeScript.

The key architectural decision is separating concerns: driver.js handles multi-step tours with highlighting overlays, while Floating UI handles individual info tooltips with proper positioning. Tour state persistence uses localStorage following the existing `useSettings` pattern. Accessibility is achievable but requires explicit implementation - driver.js provides keyboard navigation by default, but ARIA labels and focus management need manual attention.

**Primary recommendation:** Install both libraries, create a `useTourState` hook for localStorage persistence, and wrap driver.js in a React-friendly `TourProvider` component that manages lifecycle and accessibility enhancements.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| driver.js | ^1.4.0 | Multi-step product tours with element highlighting | 5kb gzipped, zero dependencies, TypeScript, extensive callbacks |
| @floating-ui/react | ^0.26.x | Tooltip positioning with collision detection | 3kb gzipped, React-native, built-in accessibility hooks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @floating-ui/react-dom | ^0.26.x | Positioning-only (lighter) | If interaction hooks not needed (but we need them for accessibility) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| driver.js | react-joyride | Heavier (12kb+), less customizable, but React-specific |
| driver.js | intro.js | Older, paid for commercial, less maintained |
| Floating UI | tippy.js | More opinionated, includes styling (we want Tailwind control) |
| Floating UI | Popper.js | Floating UI is Popper's successor, use the modern one |

**Installation:**
```bash
npm install driver.js @floating-ui/react
```

## Architecture Patterns

### Recommended Project Structure
```
hooks/
├── useTourState.ts         # Tour completion persistence (localStorage)
components/
├── TourProvider.tsx        # Context + driver.js lifecycle wrapper (optional)
├── InfoTooltip.tsx         # Reusable tooltip with Floating UI
├── TourButton.tsx          # Trigger button for manual tour start
```

### Pattern 1: Driver.js React Integration
**What:** Wrap driver.js in useEffect with proper cleanup
**When to use:** Every tour implementation
**Example:**
```typescript
// Source: driver.js docs + React patterns
import { driver, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useEffect, useCallback } from 'react';

function useTour(config: Config) {
  useEffect(() => {
    // Driver instance created once
    const driverObj = driver(config);

    return () => {
      // Cleanup on unmount
      driverObj.destroy();
    };
  }, [/* stable config ref */]);

  const startTour = useCallback(() => {
    const driverObj = driver(config);
    driverObj.drive();
  }, [config]);

  return { startTour };
}
```

### Pattern 2: Floating UI Tooltip with Accessibility
**What:** Tooltip component using all required interaction hooks
**When to use:** Every info tooltip (TIP-01 through TIP-06)
**Example:**
```typescript
// Source: floating-ui.com/docs/tooltip
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  offset,
  flip,
  shift,
  FloatingPortal,
} from '@floating-ui/react';
import { useState } from 'react';

function InfoTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  // Accessibility hooks
  const hover = useHover(context, { delay: { open: 200, close: 0 } });
  const focus = useFocus(context); // A11Y-02: keyboard focus triggers tooltip
  const dismiss = useDismiss(context); // A11Y-05: Escape dismisses
  const role = useRole(context, { role: 'tooltip' }); // A11Y-03: ARIA labels

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover, focus, dismiss, role
  ]);

  return (
    <>
      <button ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </button>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[10001] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 rounded-lg text-sm max-w-xs shadow-lg"
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
```

### Pattern 3: Tour State Persistence Hook
**What:** localStorage hook following existing `useSettings` pattern
**When to use:** Track completed tours (TOUR-03)
**Example:**
```typescript
// Source: Cue codebase pattern from hooks/useSettings.ts
const TOUR_STORAGE_KEY = 'pipi-tour-state';

interface TourState {
  completedTours: string[]; // ['landing', 'editor', 'presentation']
  lastDismissed: Record<string, number>; // timestamp for "remind me later"
}

const DEFAULT_TOUR_STATE: TourState = {
  completedTours: [],
  lastDismissed: {},
};

export function useTourState() {
  const [state, setState] = useState<TourState>(() => {
    try {
      const stored = localStorage.getItem(TOUR_STORAGE_KEY);
      return stored ? { ...DEFAULT_TOUR_STATE, ...JSON.parse(stored) } : DEFAULT_TOUR_STATE;
    } catch {
      return DEFAULT_TOUR_STATE;
    }
  });

  useEffect(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const markCompleted = useCallback((tourId: string) => {
    setState(prev => ({
      ...prev,
      completedTours: [...new Set([...prev.completedTours, tourId])],
    }));
  }, []);

  const isCompleted = useCallback((tourId: string) => {
    return state.completedTours.includes(tourId);
  }, [state.completedTours]);

  const resetTour = useCallback((tourId: string) => {
    setState(prev => ({
      ...prev,
      completedTours: prev.completedTours.filter(id => id !== tourId),
    }));
  }, []);

  return { isCompleted, markCompleted, resetTour };
}
```

### Anti-Patterns to Avoid
- **Creating driver instance on every render:** Always create in useEffect or useCallback, not in component body
- **Missing cleanup:** Always call `driverObj.destroy()` in useEffect cleanup
- **Hardcoding step elements:** Use data attributes (`data-tour="step-1"`) for maintainability
- **Z-index conflicts:** Always set driver.js z-index higher than app's highest (10000+)
- **Tooltip on hover only:** Must also trigger on focus for accessibility

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Element positioning | Custom positioning math | Floating UI `useFloating` | Handles viewport edges, scrolling, flipping |
| Keyboard nav in tours | Manual keydown listeners | driver.js `allowKeyboardControl: true` | Built-in, tested, handles edge cases |
| Tooltip ARIA | Manual aria-describedby | Floating UI `useRole` hook | Handles dynamic IDs, proper announcements |
| Focus trapping in tour | Manual focus management | driver.js handles this | Keeps focus within popover during tour |
| Dismiss on Escape | keydown listener | Floating UI `useDismiss` | Handles edge cases, cleanup |
| Scroll into view | scrollIntoView() | driver.js `scrollIntoViewOptions` | Smooth scroll, padding, offset support |

**Key insight:** Both driver.js and Floating UI solve positioning, collision, and accessibility problems that seem simple but have dozens of edge cases. Custom solutions will miss mobile viewports, RTL layouts, and nested scrolling containers.

## Common Pitfalls

### Pitfall 1: Z-Index Wars
**What goes wrong:** Tour overlay appears behind modals or FloatingWindow
**Why it happens:** Cue has z-50 modals, z-[100] permission overlays, z-[200] game overlays, z-9999 FloatingWindow
**How to avoid:** Set driver.js popover z-index to 1000000000 (their default) OR use CSS custom property
**Warning signs:** Tour highlight visible but popover hidden; clicking through overlay to modal below

```css
/* Override in driver.js custom CSS */
.driver-popover {
  z-index: 10001 !important; /* Above z-10000 requirement */
}
.driver-overlay {
  z-index: 10000 !important;
}
```

### Pitfall 2: Tour Blocks UI Permanently
**What goes wrong:** User can't interact with app after tour error or incomplete cleanup
**Why it happens:** Driver.js adds `driver-active` class to body, overlay persists
**How to avoid:** Always wrap in try/catch, call destroy() in finally, use onDestroyStarted callback
**Warning signs:** Overlay stuck after navigating away, can't click anything

```typescript
// Safe tour wrapper
const startTour = useCallback(() => {
  const driverObj = driver(config);
  try {
    driverObj.drive();
  } catch (e) {
    console.error('Tour error:', e);
    driverObj.destroy();
  }
}, [config]);
```

### Pitfall 3: Stale Element References
**What goes wrong:** Tour step points to wrong element or element not found
**Why it happens:** React re-renders, DOM elements recreated between steps
**How to avoid:** Use CSS selectors (`element: '#my-id'` or `element: '[data-tour="step-1"]'`) not refs
**Warning signs:** "Element not found" errors, highlight on wrong element

### Pitfall 4: Dark Mode Contrast Failure
**What goes wrong:** Tooltip text unreadable in dark mode
**Why it happens:** Forgot to style both light and dark variants
**How to avoid:** Use Tailwind dark: variants, test contrast with WebAIM checker
**Warning signs:** Light text on light background, contrast ratio below 4.5:1

```typescript
// Required contrast: 4.5:1 per WCAG 2.1 SC 1.4.3
// Cue patterns: bg-slate-900 + text-white (light), bg-slate-100 + text-slate-900 (dark)
className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
```

### Pitfall 5: Focus Not Visible
**What goes wrong:** Screen reader users can't see focus indicator on tour popover
**Why it happens:** Default browser focus outline hidden by CSS reset
**How to avoid:** Add explicit focus-visible ring to interactive elements
**Warning signs:** Tab through tour, no visible focus indication

```typescript
// A11Y-04: Visible focus indicators
className="focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-amber-500"
```

## Code Examples

Verified patterns from official sources:

### Driver.js Tour Configuration
```typescript
// Source: driverjs.com/docs/configuration
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

const tourConfig = {
  showProgress: true, // TOUR-04: Progress indicator
  allowClose: true, // TOUR-02: User can dismiss
  allowKeyboardControl: true, // A11Y-01: Keyboard navigation
  overlayColor: 'rgba(0, 0, 0, 0.75)',
  stagePadding: 10,
  stageRadius: 8,
  popoverClass: 'cue-tour-popover', // For dark mode styling

  // Callbacks for state management
  onDestroyStarted: () => {
    // Save state before destroy
  },
  onDestroyed: () => {
    // Mark tour complete
  },

  steps: [
    {
      element: '[data-tour="upload-zone"]',
      popover: {
        title: 'Upload Your Lesson',
        description: 'Drop a PDF of your lesson plan here to get started.',
        side: 'bottom',
        align: 'center',
      },
    },
    // ... more steps
  ],
};

const driverObj = driver(tourConfig);
driverObj.drive(); // Start tour
```

### Driver.js Dark Mode CSS Override
```css
/* Source: driverjs.com/docs/theming + Cue patterns */
.cue-tour-popover {
  /* Light mode (default) */
  --driver-popover-bg: #ffffff;
  --driver-popover-text: #1e293b; /* slate-800 */

  background: var(--driver-popover-bg) !important;
  color: var(--driver-popover-text) !important;
  border-radius: 16px !important;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25) !important;
}

.dark .cue-tour-popover {
  --driver-popover-bg: #1e293b; /* slate-800 */
  --driver-popover-text: #f8fafc; /* slate-50 */
}

/* Buttons follow Cue's primary colors */
.cue-tour-popover .driver-popover-next-btn {
  background: #4f46e5 !important; /* indigo-600 */
  border-radius: 12px !important;
}

.dark .cue-tour-popover .driver-popover-next-btn {
  background: #f59e0b !important; /* amber-500 */
  color: #0f172a !important; /* slate-900 */
}

/* Focus indicators for accessibility */
.cue-tour-popover button:focus-visible {
  outline: none !important;
  ring: 2px solid #4f46e5 !important;
}

.dark .cue-tour-popover button:focus-visible {
  ring: 2px solid #f59e0b !important;
}
```

### Floating UI Complete Tooltip
```typescript
// Source: floating-ui.com/docs/tooltip
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  arrow,
  FloatingArrow,
} from '@floating-ui/react';
import { useState, useRef } from 'react';

interface InfoTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function InfoTooltip({ content, children }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    whileElementsMounted: autoUpdate, // Reposition on scroll/resize
    middleware: [
      offset(10),
      flip({ fallbackPlacements: ['bottom', 'right', 'left'] }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
  });

  // A11Y-02: Focus triggers tooltip (not just hover)
  const hover = useHover(context, {
    move: false,
    delay: { open: 200, close: 0 },
  });
  const focus = useFocus(context);

  // A11Y-05: Escape dismisses
  const dismiss = useDismiss(context);

  // A11Y-03: Proper ARIA role
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover, focus, dismiss, role,
  ]);

  return (
    <>
      {/* Info icon button - TIP-01 */}
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-indigo-100 dark:hover:bg-amber-500/20 hover:text-indigo-600 dark:hover:text-amber-400 flex items-center justify-center text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-amber-500"
        aria-label="More information"
      >
        i
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[10001] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl text-sm max-w-xs shadow-xl"
          >
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="fill-slate-900 dark:fill-white"
            />
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| intro.js | driver.js | 2023 | Smaller bundle, better TypeScript, more hooks |
| Popper.js | Floating UI | 2022 | Modern architecture, React-specific package |
| aria-describedby manual | useRole hook | 2023 | Automatic ARIA, less boilerplate |
| focus-ring (global) | focus-visible | 2023+ | Only shows on keyboard, not click |

**Deprecated/outdated:**
- **intro.js:** Still works but less maintained, requires license for commercial use
- **Popper.js v1:** Replaced by Floating UI (same team, rewrite)
- **Manual tooltip positioning:** Too many edge cases, use Floating UI

## Open Questions

Things that couldn't be fully resolved:

1. **Driver.js explicit ARIA support**
   - What we know: Library provides keyboard navigation, but docs don't specify ARIA attributes
   - What's unclear: Whether popovers have role="dialog" or aria-live regions by default
   - Recommendation: Test with screen reader (VoiceOver), add explicit ARIA if missing via onPopoverRender callback

2. **Tour interruption during presentation**
   - What we know: PRES-07 requires tours don't interrupt teaching
   - What's unclear: Whether tour button should be hidden during active presentation or just disabled
   - Recommendation: Hide button when in active slideshow (not just PRESENTING state, but during actual teaching)

3. **Mobile/touch behavior**
   - What we know: Both libraries support touch, but Cue is desktop-primary
   - What's unclear: Whether we need touch-specific tour step adjustments
   - Recommendation: Test on iPad, adjust popover positions if needed (likely fine as-is)

## Sources

### Primary (HIGH confidence)
- [driverjs.com/docs/configuration](https://driverjs.com/docs/configuration) - Configuration options, hooks, callbacks
- [driverjs.com/docs/theming](https://driverjs.com/docs/theming) - CSS classes, styling customization
- [floating-ui.com/docs/tooltip](https://floating-ui.com/docs/tooltip) - Accessible tooltip implementation
- [floating-ui.com/docs/react](https://floating-ui.com/docs/react) - React-specific hooks and patterns
- [floating-ui.com/docs/useFloating](https://floating-ui.com/docs/useFloating) - Core positioning hook

### Secondary (MEDIUM confidence)
- [github.com/kamranahmedse/driver.js](https://github.com/kamranahmedse/driver.js) - Version info (1.4.0), TypeScript support, bundle size (~5kb)
- [accessiblyapp.com/blog/tooltip-accessibility](https://accessiblyapp.com/blog/tooltip-accessibility/) - WCAG tooltip requirements
- [w3.org/WAI/WCAG21/Understanding/contrast-minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) - 4.5:1 contrast requirement

### Tertiary (LOW confidence)
- WebSearch results for React state management patterns (2025) - Confirmed localStorage approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs verified, libraries widely used
- Architecture: HIGH - Based on Cue's existing patterns (useSettings) + official examples
- Pitfalls: HIGH - Documented in official sources, verified against Cue's z-index usage
- Accessibility: MEDIUM - Requirements verified in WCAG, but driver.js ARIA details need testing

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (stable libraries, 30-day validity)

---

## Appendix: Cue Z-Index Reference

Current z-index usage in Cue (from codebase grep):

| z-index | Component | Notes |
|---------|-----------|-------|
| z-0 | Insert line | Decorative |
| z-10 | Insert button | Above line |
| z-20 | Insert menu | Above button |
| z-30 | Urgency glow | Game timer |
| z-40 | Resource dropdown, teleprompter | Floating panels |
| z-50 | Header, modals, toasts | Standard overlay |
| z-[60] | Provider switch modal | Nested modal |
| z-[100] | Permission recovery, game menu | High-priority overlays |
| z-[200] | Game overlays (poll, phone) | Highest game UI |
| z-9999 | FloatingWindow | Preview window |
| z-[9999] | ClassBankDropdown | Match FloatingWindow |

**Recommendation for tours:**
- Tour overlay: z-[10000]
- Tour popover: z-[10001]
- Info tooltips: z-[10001] (same as popover, never conflict)
