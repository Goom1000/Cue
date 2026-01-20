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
      // Student connected, send current state
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

---

# Bug Fix Architecture Analysis (v2.3)

**Milestone:** v2.3 Bug Fixes
**Researched:** 2026-01-20
**Scope:** Integration points and component relationships for 4 bugs

## Bug Overview

| Bug | Category | Complexity |
|-----|----------|------------|
| Game activity not showing in student view | BroadcastChannel sync | Medium |
| Slide preview cutoff in teacher view | CSS scaling | Low |
| AI slide revision error | API handler flow | Medium |
| Flowchart layout issues | CSS flexbox | Low |

---

## Bug 1: Game Activity Not Showing in Student View

### Problem Analysis

The QuizOverlay (game activity) renders as a portal in PresentationView but is NOT synchronized to StudentView via BroadcastChannel. The student window only receives `STATE_UPDATE` messages containing `{ currentIndex, visibleBullets, slides }`.

### Integration Points

```
PresentationView.tsx
    |
    +-- QuizOverlay (portal to document.body)
    |       |
    |       +-- isQuizModalOpen state (local to teacher)
    |       +-- questions, qIndex, reveal (local quiz state)
    |
    +-- useBroadcastSync hook
            |
            +-- posts: STATE_UPDATE, HEARTBEAT, CLOSE_STUDENT
            +-- receives: STATE_REQUEST, HEARTBEAT_ACK
```

### Files Involved

| File | Role | Changes Needed |
|------|------|----------------|
| `/types.ts` | Message type definitions | Add game state message types |
| `/hooks/useBroadcastSync.ts` | Channel communication | No changes (generic) |
| `/components/PresentationView.tsx` | Teacher view with QuizOverlay | Broadcast game state changes |
| `/components/StudentView.tsx` | Student display | Render QuizOverlay based on received state |

### Data Flow (Current)

```
Teacher                          Student
[QuizOverlay]                    [Nothing]
     |                                |
     +-- isQuizModalOpen=true         |
     |                                |
     +-- STATE_UPDATE                 |
         { currentIndex,      ------> (no game info)
           visibleBullets,            |
           slides }                   |
```

### Data Flow (Required)

```
Teacher                          Student
[QuizOverlay]                    [QuizOverlay]
     |                                |
     +-- GAME_STATE_UPDATE    ------> |
         { isPlaying: true,           +-- renders game UI
           mode: 'play',              +-- display only (no controls)
           questions,                 |
           currentQuestion,           |
           reveal }                   |
```

### Key Considerations

1. **One-way sync:** Student view is display-only. Teacher controls quiz progression.
2. **Message types to add:**
   - `GAME_START` - Opens quiz overlay in student view
   - `GAME_UPDATE` - Updates question index, reveal state
   - `GAME_END` - Closes quiz overlay
3. **QuizOverlay refactor:** Extract display-only version for student (no buttons except maybe visual feedback)

### Estimated Complexity

MEDIUM - Requires:
- New message type definitions
- State sync logic in PresentationView
- Message handling in StudentView
- Possibly a separate `QuizStudentView` component (simplified QuizOverlay)

---

## Bug 2: Slide Preview Cutoff in Teacher View

### Problem Analysis

In PresentationView, the slide preview on the left side uses a container that doesn't properly scale the slide content to fit. The `SlideContentRenderer` renders at full slide dimensions but the container clips overflow.

### Integration Points

```
PresentationView.tsx (line 619-624)
    |
    +-- flex container (flex-1 bg-black)
            |
            +-- div (w-full h-full max-w-[1600px] aspect-video)
                    |
                    +-- SlideContentRenderer
                            |
                            +-- DefaultLayout, FlowchartLayout, etc.
                            +-- These layouts assume FULL viewport
```

### Files Involved

| File | Role | Changes Needed |
|------|------|----------------|
| `/components/PresentationView.tsx` | Teacher view layout | Add scaling wrapper for preview |
| `/components/SlideRenderers.tsx` | Slide layouts | Potentially no changes (already responsive) |

### Current CSS Structure (PresentationView lines 619-624)

```tsx
<div className="flex-1 bg-black relative flex items-center justify-center p-4 min-w-0 min-h-0">
  <div className="w-full h-full max-w-[1600px] aspect-video bg-white rounded-lg overflow-hidden shadow-2xl relative">
    <SlideContentRenderer slide={currentSlide} visibleBullets={visibleBullets} />
  </div>
</div>
```

### Problem

- `aspect-video` maintains 16:9 ratio
- But if parent container is shorter than aspect-video height, content overflows
- `overflow-hidden` clips the overflow, causing cutoff
- No CSS transform scaling to fit content within bounds

### Solution Approach

Add CSS scaling (transform: scale) or use a container query approach:

```css
/* Option 1: CSS transform scaling */
.slide-preview-wrapper {
  transform: scale(var(--scale-factor));
  transform-origin: center;
}

/* Option 2: object-fit analogy for divs */
/* Calculate scale based on container vs content dimensions */
```

### Estimated Complexity

LOW - CSS-only fix:
- Calculate available space
- Apply transform: scale() to fit content
- No component logic changes needed

---

## Bug 3: AI Slide Revision Error

### Problem Analysis

The "revise slide using AI" feature in SlideCard triggers an error. Need to trace the data flow from button click through provider to API call.

### Integration Points

```
SlideCard.tsx (line 42-52)
    |
    +-- handleMagicEdit()
            |
            +-- onRevise(slide.id, revisionInput)  // prop from App.tsx
                    |
App.tsx (line 328-350)
    |
    +-- handleReviseSlide(id, instruction)
            |
            +-- provider.reviseSlide(target, instruction)
                    |
GeminiProvider / ClaudeProvider
    |
    +-- reviseSlide() implementation
            |
            +-- API call to Gemini/Claude
```

### Files Involved

| File | Role | Potential Issue |
|------|------|-----------------|
| `/components/SlideCard.tsx` | UI trigger | Error state not shown to user |
| `/App.tsx` | Handler orchestration | Error handling may swallow details |
| `/services/providers/geminiProvider.ts` | Gemini wrapper | Wraps error as UNKNOWN_ERROR |
| `/services/providers/claudeProvider.ts` | Claude implementation | JSON extraction may fail |
| `/services/geminiService.ts` | Raw Gemini call | JSON parsing may fail on partial response |

### Current Flow Analysis

**SlideCard.tsx:**
```tsx
const handleMagicEdit = async () => {
  if (!revisionInput.trim()) return;
  if (!isAIAvailable) {
    onRequestAI('refine this slide with AI');
    return;
  }
  setIsRevising(true);
  await onRevise(slide.id, revisionInput);  // Errors not caught here!
  setRevisionInput('');
  setIsRevising(false);
};
```

**App.tsx:**
```tsx
const handleReviseSlide = async (id: string, instruction: string) => {
  // ... provider check ...
  handleUpdateSlide(id, { isGeneratingImage: true });  // Uses wrong flag name
  try {
    const updates = await provider.reviseSlide(target, instruction);
    handleUpdateSlide(id, { ...updates, isGeneratingImage: false });
    // ... image regen logic ...
  } catch (err) {
    handleUpdateSlide(id, { isGeneratingImage: false });
    if (err instanceof AIProviderError) {
      setErrorModal({ title: 'Revision Failed', message: err.userMessage });
    }
    // Note: non-AIProviderError errors are silently swallowed!
  }
};
```

**Gemini reviseSlide (geminiService.ts):**
```typescript
export const reviseSlide = async (apiKey: string, slide: Slide, instruction: string): Promise<Partial<Slide>> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  const prompt = `
    Current Slide: ${JSON.stringify(slide)}
    Edit Instruction: "${instruction}"
    Return ONLY JSON with updated fields.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "{}");  // No error handling!
};
```

### Likely Issues

1. **No responseSchema:** Unlike `generateLessonSlides`, `reviseSlide` doesn't use a schema, so Gemini may return malformed JSON
2. **No try-catch in geminiService:** Raw JSON.parse can throw on invalid response
3. **Silent error swallowing:** Non-AIProviderError errors in App.tsx aren't displayed
4. **Wrong loading indicator:** Uses `isGeneratingImage` instead of a revision-specific flag

### Estimated Complexity

MEDIUM - Requires:
- Add responseSchema to reviseSlide in geminiService
- Wrap JSON.parse in try-catch with proper error
- Ensure all errors bubble up as AIProviderError
- Possibly add revision-specific loading state

---

## Bug 4: Flowchart Layout Issues

### Problem Analysis

The FlowchartLayout has two visual issues:
1. Arrows align to bottom of boxes instead of center
2. Whitespace not filled - boxes don't expand vertically

### Integration Points

```
SlideRenderers.tsx
    |
    +-- FlowchartLayout (line 113-164)
            |
            +-- Container div (flex, items-start)
            |       |
            |       +-- Arrow SVG divs (flex, items-center, pb-20)
            |       +-- Card divs (flex-1, aspect-[4/3])
            |
            +-- Arrows and cards in horizontal flex row
```

### Files Involved

| File | Role | Changes Needed |
|------|------|----------------|
| `/components/SlideRenderers.tsx` | FlowchartLayout component | CSS adjustments |

### Current CSS Structure (FlowchartLayout)

```tsx
// Container
<div className="flex w-full px-4 gap-4 md:gap-6 flex-1 items-start justify-center">

// Arrow
<div className="... flex items-center justify-center h-full pb-20 px-2 ...">
  <svg className="w-8 h-8 md:w-16 md:h-16" .../>
</div>

// Card
<div className="flex-1 min-w-0 ...">
  <div className="aspect-[4/3] rounded-3xl p-4 md:p-8 flex items-center justify-center ...">
    ...
  </div>
</div>
```

### Problem Analysis

1. **Arrow alignment:** `pb-20` (padding-bottom: 5rem) pushes arrow up, but this is a static offset that doesn't center the arrow on the card. The `h-full` on the arrow container depends on flex parent height.

2. **Whitespace:** `items-start` on container aligns children to top. Cards have `aspect-[4/3]` which constrains height. No mechanism to fill remaining vertical space.

### Solution Approach

1. **Center arrows:** Remove `pb-20`, use `items-center` on both container and arrow wrapper
2. **Fill whitespace:** Consider removing `aspect-[4/3]` constraint or using grid layout instead of flex

```tsx
// Potential fix
<div className="flex w-full px-4 gap-4 md:gap-6 flex-1 items-center justify-center">
  // Arrow - no pb-20, already h-full and items-center
  <div className="... flex items-center justify-center h-full px-2 ...">

  // Card - consider flex-1 on both wrapper and inner, remove aspect ratio
  <div className="flex-1 min-w-0 h-full flex flex-col">
    <div className="flex-1 rounded-3xl p-4 md:p-8 flex items-center justify-center ...">
```

### Estimated Complexity

LOW - CSS-only fix:
- Change `items-start` to `items-center` on container
- Remove `pb-20` from arrow
- Adjust card height constraints to fill space

---

## Dependency Analysis

### No Cross-Bug Dependencies

Each bug is independent:
- Bug 1 (Game sync) - BroadcastChannel layer
- Bug 2 (Preview cutoff) - CSS in PresentationView
- Bug 3 (AI revision) - API handler layer
- Bug 4 (Flowchart) - CSS in SlideRenderers

### Recommended Fix Order

1. **Bug 4 (Flowchart)** - Simplest, CSS only, low risk
2. **Bug 2 (Preview cutoff)** - CSS only, low risk
3. **Bug 3 (AI revision)** - API layer, medium risk, needs testing
4. **Bug 1 (Game sync)** - Most complex, requires new message types and component changes

---

## Component Relationship Diagram

```
App.tsx
  |
  +-- Settings/Provider management
  |
  +-- handleReviseSlide() -----> provider.reviseSlide() [Bug 3]
  |
  +-- PresentationView
        |
        +-- Slide Preview Container [Bug 2]
        |     |
        |     +-- SlideContentRenderer
        |           |
        |           +-- FlowchartLayout [Bug 4]
        |
        +-- QuizOverlay (teacher only) [Bug 1]
        |
        +-- useBroadcastSync
              |
              +-- STATE_UPDATE ---> StudentView
                                      |
                                      +-- (No game state) [Bug 1]
```

---

## File Quick Reference

| Bug | Primary Files | Secondary Files |
|-----|---------------|-----------------|
| 1 | `StudentView.tsx`, `PresentationView.tsx` | `types.ts`, `useBroadcastSync.ts` |
| 2 | `PresentationView.tsx` | None |
| 3 | `geminiService.ts`, `App.tsx` | `geminiProvider.ts`, `claudeProvider.ts`, `SlideCard.tsx` |
| 4 | `SlideRenderers.tsx` | None |

---

## Testing Considerations

### Bug 1 (Game Sync)
- Open teacher view, launch student window
- Start quiz game, verify it appears in student view
- Progress through questions, verify sync
- End quiz, verify student view returns to slide

### Bug 2 (Preview Cutoff)
- Create slide with 4+ bullet points
- Enter presentation mode
- Verify all content visible in left preview

### Bug 3 (AI Revision)
- Edit a slide, enter revision instruction
- Click Revise, observe result
- Test with both Gemini and Claude providers
- Test edge cases: empty instruction, invalid API key

### Bug 4 (Flowchart)
- Create/load slide with flowchart layout
- Verify arrows centered on boxes
- Verify boxes fill vertical space
- Test with 2, 3, 4 content items

---

## Sources (v1.0-v2.0)

### HIGH Confidence (Official Documentation)
- [BroadcastChannel API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [Window Management API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API)
- [createPortal - React](https://react.dev/reference/react-dom/createPortal)
- [Window Management - Chrome Developers](https://developer.chrome.com/docs/capabilities/web-apis/window-management)
- [MDN: Using the Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API/Using_the_Permissions_API)

### MEDIUM Confidence (Browser Support Data)
- [BroadcastChannel - Can I Use](https://caniuse.com/broadcastchannel) - 95.8% global support
- [getScreenDetails - Can I Use](https://caniuse.com/mdn-api_window_getscreendetails) - 80.11% global support (Chromium only)
