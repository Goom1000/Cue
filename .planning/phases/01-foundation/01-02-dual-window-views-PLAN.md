---
phase: 01-foundation
plan: 02
type: execute
wave: 2
depends_on: ["01-01"]
files_modified:
  - components/StudentView.tsx
  - App.tsx
  - components/PresentationView.tsx
autonomous: true

must_haves:
  truths:
    - "Teacher clicks Student View button and a new window opens reliably"
    - "Navigating slides in teacher view instantly updates the student window"
    - "Student window shows only slide content (no teleprompter, no controls)"
    - "Student view works as standalone /#/student route that can be opened manually"
    - "If popup is blocked, fallback UI shows the manual URL to copy"
  artifacts:
    - path: "components/StudentView.tsx"
      provides: "Standalone student view component with BroadcastChannel sync"
      exports: ["StudentView"]
    - path: "App.tsx"
      provides: "Hash routing to switch between main app and student view"
      contains: "useHashRoute"
    - path: "components/PresentationView.tsx"
      provides: "Refactored teacher view with BroadcastChannel sync and popup detection"
      contains: "useBroadcastSync"
  key_links:
    - from: "components/StudentView.tsx"
      to: "BROADCAST_CHANNEL_NAME"
      via: "useBroadcastSync import"
      pattern: "useBroadcastSync.*BROADCAST_CHANNEL_NAME"
    - from: "components/PresentationView.tsx"
      to: "/#/student"
      via: "window.open call"
      pattern: "window\\.open.*#/student"
    - from: "App.tsx"
      to: "components/StudentView.tsx"
      via: "conditional render on hash route"
      pattern: "route.*student.*StudentView"
---

<objective>
Implement the dual-window presentation system with reliable popup launch and BroadcastChannel synchronization.

Purpose: Replace the broken StudentWindow portal approach with a robust architecture where the student view is a standalone route that syncs state via BroadcastChannel.

Output: StudentView component, hash routing in App.tsx, and refactored PresentationView with popup detection.
</objective>

<context>
@.planning/phases/01-foundation/01-RESEARCH.md
@types.ts (after Plan 01 modifications)
@hooks/useBroadcastSync.ts (created in Plan 01)
@hooks/useHashRoute.ts (created in Plan 01)

Key patterns from research:
- window.open() MUST be called synchronously in click handler (not in useEffect)
- Check return value for popup blocked detection
- Student requests STATE_REQUEST on mount, teacher responds with current state
- SlideContentRenderer component already exists for rendering slides

Current broken approach in PresentationView.tsx (lines 10-64):
- StudentWindow component uses createPortal with useEffect window.open() - causes popup blocking
- Manual style copying is fragile
- Will be completely removed and replaced with BroadcastChannel approach
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create StudentView component</name>
  <files>components/StudentView.tsx</files>
  <action>
Create new file `components/StudentView.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Slide, PresentationMessage, PresentationState, BROADCAST_CHANNEL_NAME } from '../types';
import useBroadcastSync from '../hooks/useBroadcastSync';
import { SlideContentRenderer } from './SlideRenderers';

/**
 * Standalone student view component.
 * Receives state updates via BroadcastChannel from teacher view.
 * Shows ONLY slide content - no controls, no teleprompter.
 */
const StudentView: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleBullets, setVisibleBullets] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [connected, setConnected] = useState(false);

  const { lastMessage, postMessage } = useBroadcastSync<PresentationMessage>(BROADCAST_CHANNEL_NAME);

  // Request current state on mount
  useEffect(() => {
    postMessage({ type: 'STATE_REQUEST' });
  }, [postMessage]);

  // Handle incoming messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'STATE_UPDATE') {
      setCurrentIndex(lastMessage.payload.currentIndex);
      setVisibleBullets(lastMessage.payload.visibleBullets);
      setSlides(lastMessage.payload.slides);
      setConnected(true);
    }
  }, [lastMessage]);

  const currentSlide = slides[currentIndex];

  // Waiting for connection
  if (!connected || !currentSlide) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-white text-2xl font-semibold mb-2">Waiting for Presentation</h2>
          <p className="text-white/60">Open the teacher view to begin</p>
        </div>
      </div>
    );
  }

  // Render slide content only - no controls
  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-[1920px] max-h-[1080px] aspect-video bg-white">
        <SlideContentRenderer slide={currentSlide} visibleBullets={visibleBullets} />
      </div>
    </div>
  );
};

export default StudentView;
```

Key implementation notes:
- Sends STATE_REQUEST immediately on mount to get current state
- Receives STATE_UPDATE messages with full presentation state
- Uses existing SlideContentRenderer (no need to reimplement slide rendering)
- Shows loading state until connected to teacher view
- Full-screen black background with centered slide (projector-ready)
- NO controls, NO teleprompter - students see only the slide
  </action>
  <verify>
Run: `grep -c "STATE_REQUEST\|STATE_UPDATE" components/StudentView.tsx`
Should return 2 (both message types handled).

Run: `grep "SlideContentRenderer" components/StudentView.tsx`
Should show the import and usage.
  </verify>
  <done>
StudentView component exists, requests state on mount, handles STATE_UPDATE messages, renders only slide content.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add hash routing to App.tsx</name>
  <files>App.tsx</files>
  <action>
Modify App.tsx to add hash-based routing:

1. Add imports at the top (after existing imports):
```typescript
import useHashRoute from './hooks/useHashRoute';
import StudentView from './components/StudentView';
```

2. Inside the App function, BEFORE any state declarations, add:
```typescript
// Hash-based routing for student view
const route = useHashRoute();

// If on student route, render StudentView directly (no other app chrome)
if (route === '/student') {
  return <StudentView />;
}
```

This means the first lines inside `function App() {` should be:
```typescript
function App() {
  // Hash-based routing for student view
  const route = useHashRoute();

  // If on student route, render StudentView directly (no other app chrome)
  if (route === '/student') {
    return <StudentView />;
  }

  // ... rest of existing App code (all the useState declarations, etc.)
```

DO NOT modify anything else in App.tsx - the existing app logic remains unchanged for the default route.
  </action>
  <verify>
Run: `head -30 App.tsx | grep -E "useHashRoute|StudentView|route.*student"`
Should show the import and route check.

Run: `grep -n "if (route === '/student')" App.tsx`
Should show the conditional render.
  </verify>
  <done>
App.tsx routes to StudentView when URL hash is /#/student, otherwise renders normal app.
  </done>
</task>

<task type="auto">
  <name>Task 3: Refactor PresentationView with BroadcastChannel sync</name>
  <files>components/PresentationView.tsx</files>
  <action>
Refactor PresentationView.tsx to use BroadcastChannel instead of the broken StudentWindow portal.

1. REMOVE the entire StudentWindow component (lines 9-64, the whole component including the comment).

2. ADD new imports at the top (with existing imports):
```typescript
import useBroadcastSync from '../hooks/useBroadcastSync';
import { PresentationMessage, BROADCAST_CHANNEL_NAME } from '../types';
```

3. REMOVE the createPortal import from react-dom (line 2) - it's no longer needed. The import line should just be:
```typescript
import React, { useState, useEffect, useMemo, useRef } from 'react';
```

4. Inside PresentationView component, AFTER the existing state declarations (around line 258), ADD:
```typescript
// BroadcastChannel sync
const { lastMessage, postMessage } = useBroadcastSync<PresentationMessage>(BROADCAST_CHANNEL_NAME);
const [popupBlocked, setPopupBlocked] = useState(false);

// Handle incoming messages (student requesting state)
useEffect(() => {
  if (lastMessage?.type === 'STATE_REQUEST') {
    // Student connected, send current state
    postMessage({
      type: 'STATE_UPDATE',
      payload: { currentIndex, visibleBullets, slides }
    });
  }
}, [lastMessage, currentIndex, visibleBullets, slides, postMessage]);

// Broadcast state changes to student window
useEffect(() => {
  postMessage({
    type: 'STATE_UPDATE',
    payload: { currentIndex, visibleBullets, slides }
  });
}, [currentIndex, visibleBullets, slides, postMessage]);
```

5. REPLACE the handleLaunchStudent toggle approach. Find the button onClick (around line 413):
```typescript
<button onClick={() => setIsStudentWindowOpen(!isStudentWindowOpen)}
```

REPLACE that button with this new implementation:
```typescript
<button
  onClick={() => {
    // MUST be synchronous - no async/await before window.open
    // This preserves user activation context to avoid popup blockers
    const studentWindow = window.open(
      `${window.location.origin}${window.location.pathname}#/student`,
      'pipi-student',
      'width=1280,height=720'
    );

    // Check if popup was blocked
    if (!studentWindow || studentWindow.closed || typeof studentWindow.closed === 'undefined') {
      setPopupBlocked(true);
      setIsStudentWindowOpen(false);
    } else {
      setPopupBlocked(false);
      setIsStudentWindowOpen(true);
      // Note: We don't need to track the window reference for communication
      // BroadcastChannel handles all sync - the window is fire-and-forget
    }
  }}
  disabled={isStudentWindowOpen}
  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border ${
    isStudentWindowOpen
      ? 'bg-green-900/40 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)] cursor-not-allowed'
      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'
  }`}
>
  {isStudentWindowOpen ? 'Student Active' : 'Launch Student'}
</button>
```

6. ADD popup blocked fallback UI right after the button (still in the header div):
```typescript
{popupBlocked && (
  <div className="fixed top-16 right-4 z-50 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-xl max-w-sm animate-fade-in">
    <div className="flex items-start gap-3">
      <div className="text-amber-600 text-xl">!</div>
      <div>
        <h3 className="font-bold text-amber-800 text-sm">Popup Blocked</h3>
        <p className="text-amber-700 text-xs mt-1">
          Your browser blocked the student window.
        </p>
        <p className="text-amber-700 text-xs mt-2 font-medium">
          Open this URL on the projector:
        </p>
        <code className="block bg-white px-2 py-1 rounded mt-1 text-xs font-mono text-amber-900 break-all">
          {window.location.origin}{window.location.pathname}#/student
        </code>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/student`);
            }}
            className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
          >
            Copy URL
          </button>
          <button
            onClick={() => setPopupBlocked(false)}
            className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium hover:bg-amber-200"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

7. REMOVE the old StudentWindow portal rendering at the bottom of the component (around line 532-538):
```typescript
{isStudentWindowOpen && (
    <StudentWindow onClose={() => setIsStudentWindowOpen(false)}>
        <div className="h-full w-full bg-white">
            <SlideContentRenderer slide={currentSlide} visibleBullets={visibleBullets} />
        </div>
    </StudentWindow>
)}
```
DELETE this entire block - it's replaced by the BroadcastChannel approach.
  </action>
  <verify>
Run: `grep -c "StudentWindow" components/PresentationView.tsx`
Should return 0 (old component completely removed).

Run: `grep "useBroadcastSync" components/PresentationView.tsx`
Should show the import and usage.

Run: `grep "window.open" components/PresentationView.tsx`
Should show the synchronous call in click handler.

Run: `grep "popupBlocked" components/PresentationView.tsx`
Should show state and UI handling.
  </verify>
  <done>
PresentationView uses BroadcastChannel for sync, opens student window synchronously on click, shows fallback UI if popup blocked, removes old StudentWindow portal approach.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:

1. Hash routing test:
Open browser to `http://localhost:5173/#/student`
Should show "Waiting for Presentation" loading state (not the main app).

2. Popup launch test:
- Start presentation in teacher view
- Click "Launch Student" button
- New window should open at /#/student route
- No popup blocker should trigger (if it does, fallback UI should appear)

3. Sync test:
- With both windows open, navigate slides in teacher view
- Student window should update instantly (same slide, same bullet reveal)

4. Student view content test:
- Student window should show ONLY slide content
- No teleprompter text visible
- No navigation controls visible
- No header bar visible

5. Manual URL test:
- Close student window
- Manually open new tab to /#/student
- Should show waiting state, then sync when teacher navigates
</verification>

<success_criteria>
1. Teacher clicks "Student View" button and new window opens at /#/student
2. Window opens reliably without popup blocker (synchronous window.open in click handler)
3. If popup IS blocked, fallback UI shows with copyable URL
4. Student window shows only slide content (SlideContentRenderer, no controls)
5. Navigating in teacher view instantly updates student window via BroadcastChannel
6. Student can manually open /#/student and it syncs when teacher is presenting
7. Old StudentWindow component completely removed from codebase
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-02-SUMMARY.md`
</output>
