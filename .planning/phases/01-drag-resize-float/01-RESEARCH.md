# Phase 1: Drag, Resize & Float - Research

**Researched:** 2026-01-18
**Domain:** React draggable/resizable UI components
**Confidence:** HIGH

## Summary

This phase transforms the existing `NextSlidePreview` component into a freely movable and resizable floating window. The research evaluated library-based vs. custom implementations for drag/resize functionality with aspect ratio locking, viewport constraints, and custom styling.

**react-rnd** emerged as the standard library for this exact use case - it combines both drag AND resize in a single component with built-in aspect ratio locking, min/max constraints, and customizable resize handles. The library has 464K weekly downloads and is actively maintained (v10.4.13 released September 2025).

The main gap in react-rnd is automatic repositioning when the viewport shrinks - this requires a custom `useWindowSize` hook + effect to push the element back into bounds.

**Primary recommendation:** Use react-rnd with a custom viewport resize handler and hover-based handle visibility.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-rnd | ^10.4.13 | Drag + resize component | Only library that combines both drag AND resize with aspect ratio lock |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | - | react-rnd handles everything required |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-rnd | react-draggable + react-resizable | Two libraries, more integration work, less cohesive API |
| react-rnd | @dnd-kit | Better for sorting/lists, overkill for single element, no resize |
| react-rnd | Custom vanilla JS | More code, more bugs, maintenance burden |
| react-rnd | interact.js | Framework-agnostic, more setup required, no React bindings |

**Installation:**
```bash
npm install react-rnd
```

## Architecture Patterns

### Recommended Component Structure
```
components/
├── NextSlidePreview.tsx      # Existing - wrap content with FloatingWindow
└── FloatingWindow.tsx        # NEW - generic draggable/resizable container
    └── hooks/
        └── useViewportBounds.ts  # NEW - keeps element in viewport on resize
```

### Pattern 1: Wrapper Component
**What:** Create a generic `FloatingWindow` component that wraps any content
**When to use:** When you want reusable drag/resize behavior
**Example:**
```typescript
// Source: Based on react-rnd API
import { Rnd } from 'react-rnd';

interface FloatingWindowProps {
  children: React.ReactNode;
  defaultPosition: { x: number; y: number };
  defaultSize: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number | boolean;
}

const FloatingWindow: React.FC<FloatingWindowProps> = ({
  children,
  defaultPosition,
  defaultSize,
  minWidth = 200,
  minHeight = 150,
  aspectRatio = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Rnd
      default={{
        x: defaultPosition.x,
        y: defaultPosition.y,
        width: defaultSize.width,
        height: defaultSize.height,
      }}
      minWidth={minWidth}
      minHeight={minHeight}
      lockAspectRatio={aspectRatio}
      bounds="window"
      enableResizing={{
        top: false,
        right: false,
        bottom: false,
        left: false,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      onDragStart={() => setIsDragging(true)}
      onDragStop={() => setIsDragging(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: 'move',
        opacity: isDragging ? 0.8 : 1,
        zIndex: 9999,
      }}
    >
      {children}
      {/* Corner handles visible on hover */}
      {isHovered && <CornerHandles />}
    </Rnd>
  );
};
```

### Pattern 2: Viewport Bounds Enforcement Hook
**What:** Custom hook to keep element within viewport when window resizes
**When to use:** Required - react-rnd doesn't auto-reposition on viewport shrink
**Example:**
```typescript
// Source: Community pattern from react-rnd issues
import { useState, useEffect, useRef } from 'react';

interface Position { x: number; y: number }
interface Size { width: number; height: number }

function useViewportBounds(
  position: Position,
  size: Size,
  padding: number = 0
) {
  const rndRef = useRef<any>(null);

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Push back if right edge is past viewport
      if (position.x + size.width > vw - padding) {
        newX = Math.max(padding, vw - size.width - padding);
      }
      // Push back if bottom edge is past viewport
      if (position.y + size.height > vh - padding) {
        newY = Math.max(padding, vh - size.height - padding);
      }

      if (newX !== position.x || newY !== position.y) {
        rndRef.current?.updatePosition({ x: newX, y: newY });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, size, padding]);

  return rndRef;
}
```

### Pattern 3: Edge Magnetism
**What:** Slight "snap" when near viewport edges
**When to use:** Per CONTEXT.md - "Slight resistance/magnetism near viewport edges"
**Example:**
```typescript
// Source: Custom implementation based on Magnet.js concepts
const MAGNET_THRESHOLD = 20; // pixels

function applyEdgeMagnetism(
  x: number,
  y: number,
  width: number,
  height: number,
  vw: number,
  vh: number
): { x: number; y: number } {
  let newX = x;
  let newY = y;

  // Snap to left edge
  if (x < MAGNET_THRESHOLD) newX = 0;
  // Snap to right edge
  if (vw - (x + width) < MAGNET_THRESHOLD) newX = vw - width;
  // Snap to top edge
  if (y < MAGNET_THRESHOLD) newY = 0;
  // Snap to bottom edge (account for header)
  if (vh - (y + height) < MAGNET_THRESHOLD) newY = vh - height;

  return { x: newX, y: newY };
}
```

### Anti-Patterns to Avoid
- **Don't use CSS transform for positioning during drag:** react-rnd handles this; overriding breaks the library
- **Don't set bounds="parent" for floating windows:** Use "window" to allow placement anywhere
- **Don't put drag state in global store:** Local component state is sufficient for visual feedback
- **Don't skip the viewport resize handler:** Users will lose the window when browser shrinks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Combined drag + resize | Separate mouse event handlers | react-rnd | Edge cases with resize handles overlapping drag area |
| Aspect ratio locking | Manual math during resize | react-rnd `lockAspectRatio` | Off-by-one errors, floating point issues |
| Boundary constraints | Manual position clamping | react-rnd `bounds="window"` | Touch events, scroll position, edge cases |
| Resize handles | Custom positioned divs | react-rnd `enableResizing` | Cursor management, event propagation |

**Key insight:** Drag and resize interactions have many subtle edge cases (touch vs mouse, event propagation, cursor state, momentum) that libraries have debugged over years. Custom implementations inevitably miss edge cases.

## Common Pitfalls

### Pitfall 1: Floating element gets "lost" when viewport shrinks
**What goes wrong:** User resizes browser smaller, preview window ends up off-screen
**Why it happens:** react-rnd `bounds` only constrains during drag/resize, not on viewport change
**How to avoid:** Implement `useViewportBounds` hook that repositions on window resize
**Warning signs:** Element invisible after browser window resize

### Pitfall 2: z-index wars with other positioned elements
**What goes wrong:** Preview appears behind other UI elements (modals, tooltips)
**Why it happens:** Stacking context isolation from parent transforms
**How to avoid:** Use React Portal to render at document.body level; use z-index: 9999
**Warning signs:** Preview disappears behind quiz overlay or other modals

### Pitfall 3: Resize handles interfere with drag
**What goes wrong:** User tries to drag from corner, accidentally resizes
**Why it happens:** Resize handle areas overlap with drag area
**How to avoid:** Use react-rnd's built-in handle zones; they handle event routing
**Warning signs:** Unexpected resize when user meant to drag

### Pitfall 4: Aspect ratio breaks during rapid resize
**What goes wrong:** Preview gets squished or stretched
**Why it happens:** Not using react-rnd's lockAspectRatio, or fighting it with CSS
**How to avoid:** Let react-rnd control dimensions; don't add competing CSS sizing
**Warning signs:** Content looks distorted after resize

### Pitfall 5: Performance issues from excessive re-renders
**What goes wrong:** Laggy drag/resize interaction
**Why it happens:** Storing position in parent state causes re-render cascade
**How to avoid:** Keep position state local to FloatingWindow component; use uncontrolled mode
**Warning signs:** Choppy movement, CPU spike during drag

## Code Examples

Verified patterns from official sources:

### Basic react-rnd Setup with Corner Handles Only
```typescript
// Source: react-rnd GitHub documentation
import { Rnd } from 'react-rnd';

<Rnd
  default={{
    x: window.innerWidth - 220,  // Default to bottom-right area
    y: window.innerHeight - 180,
    width: 200,
    height: 150,
  }}
  minWidth={200}
  minHeight={150}
  lockAspectRatio={16/9}  // Match slide aspect ratio
  bounds="window"
  enableResizing={{
    top: false,
    right: false,
    bottom: false,
    left: false,
    topRight: true,
    bottomRight: true,
    bottomLeft: true,
    topLeft: true,
  }}
  resizeHandleStyles={{
    topRight: { cursor: 'nesw-resize' },
    bottomRight: { cursor: 'nwse-resize' },
    bottomLeft: { cursor: 'nesw-resize' },
    topLeft: { cursor: 'nwse-resize' },
  }}
>
  <div style={{ width: '100%', height: '100%' }}>
    {/* Preview content */}
  </div>
</Rnd>
```

### Custom Resize Handle Components (Visible on Hover)
```typescript
// Source: react-rnd resizeHandleComponent API
const CornerHandle: React.FC<{ visible: boolean }> = ({ visible }) => (
  <div
    style={{
      width: 12,
      height: 12,
      backgroundColor: 'rgba(99, 102, 241, 0.8)', // Accent color
      borderRadius: 2,
      opacity: visible ? 1 : 0,
      transition: 'opacity 150ms ease',
    }}
  />
);

// Usage in Rnd
<Rnd
  resizeHandleComponent={{
    topRight: <CornerHandle visible={isHovered} />,
    bottomRight: <CornerHandle visible={isHovered} />,
    bottomLeft: <CornerHandle visible={isHovered} />,
    topLeft: <CornerHandle visible={isHovered} />,
  }}
>
```

### Portal-Based Floating Layer
```typescript
// Source: React Portal pattern for z-index isolation
import { createPortal } from 'react-dom';

const FloatingPreviewPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      {children}
    </div>,
    document.body
  );
};
```

### Opacity Change During Drag
```typescript
// Source: react-rnd event handlers
const [isDragging, setIsDragging] = useState(false);

<Rnd
  onDragStart={() => setIsDragging(true)}
  onDragStop={() => setIsDragging(false)}
  style={{
    opacity: isDragging ? 0.8 : 1,
    transition: isDragging ? 'none' : 'opacity 150ms ease',
  }}
>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jQuery UI draggable/resizable | react-rnd | 2018+ | React-native, no jQuery dependency |
| Separate drag + resize libs | Combined libraries | 2020+ | Better DX, fewer conflicts |
| Pointer event polyfills | Native pointer events | 2022+ | Touch/mouse unified handling |

**Deprecated/outdated:**
- react-draggable alone: Doesn't handle resize; need additional library
- jQuery-based solutions: Don't integrate well with React state
- react-beautiful-dnd: Designed for lists/sorting, not free-form drag

## Open Questions

Things that couldn't be fully resolved:

1. **React 19 Compatibility Verification**
   - What we know: react-rnd v10.4.13 is latest, project is actively maintained
   - What's unclear: Explicit React 19 peerDependency version
   - Recommendation: Install and test; fallback to vanilla implementation if issues

2. **Exact Magnetism Threshold**
   - What we know: User wants "slight resistance/magnetism near viewport edges"
   - What's unclear: Optimal pixel threshold (10px? 20px? 30px?)
   - Recommendation: Start with 20px, make configurable via constant

3. **Animation Timing for Push-Back**
   - What we know: Element should animate back into view when viewport shrinks
   - What's unclear: Ideal duration and easing
   - Recommendation: 150-200ms ease-out transition

## Sources

### Primary (HIGH confidence)
- [react-rnd GitHub](https://github.com/bokuweb/react-rnd) - Full API documentation, examples, issues
- [react-rnd npm](https://www.npmjs.com/package/react-rnd) - Package info, weekly downloads (464K)

### Secondary (MEDIUM confidence)
- [react-rnd Issue #700](https://github.com/bokuweb/react-rnd/issues/700) - Bounds + window resize behavior
- [react-rnd Issue #714](https://github.com/bokuweb/react-rnd/issues/714) - Parent bounds + screen resize
- [Pluralsight - Re-render on Window Resize](https://www.pluralsight.com/resources/blog/guides/re-render-react-component-on-window-resize) - useWindowSize patterns
- [useHooks - useWindowSize](https://usehooks.com/usewindowsize) - Standard hook implementation

### Tertiary (LOW confidence)
- [npm-compare React drag libraries](https://npm-compare.com/react-draggable,react-grid-layout,react-resizable,react-rnd) - Library comparison statistics
- [DEV Community - Top React DnD Libraries 2026](https://dev.to/puckeditor/top-5-drag-and-drop-libraries-for-react-24lb) - Ecosystem overview

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-rnd is the established solution for drag+resize combined
- Architecture: HIGH - Patterns are well-documented in library issues and community
- Pitfalls: HIGH - Common issues are documented in GitHub issues
- React 19 compat: MEDIUM - Not explicitly verified, but library is actively maintained

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable domain)
