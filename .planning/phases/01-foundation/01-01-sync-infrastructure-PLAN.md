---
phase: 01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - types.ts
  - hooks/useBroadcastSync.ts
  - hooks/useHashRoute.ts
autonomous: true

must_haves:
  truths:
    - "BroadcastChannel message types are defined and exported"
    - "useBroadcastSync hook provides postMessage and lastMessage functionality"
    - "useHashRoute hook returns current route from window.location.hash"
    - "Channel cleanup happens on unmount (no memory leaks)"
  artifacts:
    - path: "types.ts"
      provides: "PresentationMessage type union, CHANNEL_NAME constant"
      contains: "PresentationMessage"
    - path: "hooks/useBroadcastSync.ts"
      provides: "Generic broadcast sync hook with cleanup"
      exports: ["useBroadcastSync"]
    - path: "hooks/useHashRoute.ts"
      provides: "Hash-based routing hook"
      exports: ["useHashRoute"]
  key_links:
    - from: "hooks/useBroadcastSync.ts"
      to: "types.ts"
      via: "import PresentationMessage"
      pattern: "import.*PresentationMessage.*from.*types"
---

<objective>
Create the core synchronization infrastructure for dual-window presentation mode.

Purpose: Establish the foundational hooks and types that enable reliable cross-window state synchronization via BroadcastChannel, plus hash-based routing for the student view.

Output: Three artifacts - message type definitions in types.ts, useBroadcastSync hook, and useHashRoute hook.
</objective>

<context>
@.planning/phases/01-foundation/01-RESEARCH.md

Key patterns from research:
- BroadcastChannel API for cross-window sync (95.8% browser support)
- Must close channel on cleanup to prevent memory leaks
- Hash routing via window.location.hash + hashchange event listener
- Message protocol: STATE_UPDATE, STATE_REQUEST types

Existing codebase:
- types.ts already has Slide interface and AppState enum
- No hooks directory exists yet - must create it
- Current broken StudentWindow in PresentationView.tsx will be replaced in Plan 02
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add presentation sync types and constants</name>
  <files>types.ts</files>
  <action>
Add the following to the existing types.ts file (keep all existing content):

1. Add channel name constant:
```typescript
export const BROADCAST_CHANNEL_NAME = 'pipi-presentation';
```

2. Add presentation state type:
```typescript
export interface PresentationState {
  currentIndex: number;
  visibleBullets: number;
  slides: Slide[];
}
```

3. Add message type union (discriminated union for type safety):
```typescript
export type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'STATE_REQUEST' };
```

Place these additions AFTER the existing Slide interface but BEFORE the LessonResource interface.
  </action>
  <verify>
Run: `grep -n "PresentationMessage\|BROADCAST_CHANNEL_NAME\|PresentationState" types.ts`
Should show all three additions with line numbers.
  </verify>
  <done>
types.ts exports PresentationMessage type union, PresentationState interface, and BROADCAST_CHANNEL_NAME constant.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create useBroadcastSync hook</name>
  <files>hooks/useBroadcastSync.ts</files>
  <action>
Create new directory `hooks/` and file `hooks/useBroadcastSync.ts`:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Generic hook for BroadcastChannel communication.
 * Handles channel lifecycle and cleanup to prevent memory leaks.
 */
function useBroadcastSync<T>(channelName: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [lastMessage, setLastMessage] = useState<T | null>(null);

  useEffect(() => {
    // Create channel on mount
    channelRef.current = new BroadcastChannel(channelName);

    channelRef.current.onmessage = (event: MessageEvent<T>) => {
      setLastMessage(event.data);
    };

    // CRITICAL: Close channel on cleanup to prevent memory leaks
    // MDN explicitly warns about this - channels must be closed
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [channelName]);

  const postMessage = useCallback((message: T) => {
    channelRef.current?.postMessage(message);
  }, []);

  return { lastMessage, postMessage };
}

export default useBroadcastSync;
```

Key implementation notes:
- useRef for channel to persist across renders without triggering re-renders
- useCallback for postMessage to maintain stable reference
- Cleanup function MUST call close() - this prevents memory leaks
- Generic T allows type-safe usage with PresentationMessage
  </action>
  <verify>
Run: `cat hooks/useBroadcastSync.ts | grep -c "close()"`
Should return 1 (confirming cleanup exists).

Run: `cat hooks/useBroadcastSync.ts | grep "export default"`
Should show the export statement.
  </verify>
  <done>
useBroadcastSync hook exists, exports default function, includes channel cleanup on unmount.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create useHashRoute hook</name>
  <files>hooks/useHashRoute.ts</files>
  <action>
Create file `hooks/useHashRoute.ts`:

```typescript
import { useState, useEffect } from 'react';

/**
 * Simple hash-based routing hook.
 * Parses window.location.hash and updates on hashchange events.
 *
 * Returns the path portion after the hash, e.g.:
 * - URL: "http://localhost/#/student" -> returns "/student"
 * - URL: "http://localhost/#/" -> returns "/"
 * - URL: "http://localhost/" -> returns "/"
 */
function useHashRoute(): string {
  const getHashRoute = () => {
    const hash = window.location.hash;
    // Remove the leading # and return the path
    // If no hash or just "#", return "/"
    return hash.slice(1) || '/';
  };

  const [route, setRoute] = useState<string>(getHashRoute);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getHashRoute());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}

export default useHashRoute;
```

Implementation notes:
- Uses native hashchange event (no polling needed)
- Extracts path from hash (e.g., "#/student" -> "/student")
- Handles edge cases: no hash, empty hash, just "#"
- No external dependencies - pure browser APIs
  </action>
  <verify>
Run: `cat hooks/useHashRoute.ts | grep "hashchange"`
Should show both addEventListener and removeEventListener lines.

Run: `cat hooks/useHashRoute.ts | grep "export default"`
Should show the export statement.
  </verify>
  <done>
useHashRoute hook exists, handles hashchange events, properly cleans up listener on unmount.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:

1. File structure check:
```bash
ls -la hooks/
```
Should show: useBroadcastSync.ts, useHashRoute.ts

2. Type definitions check:
```bash
grep -E "PresentationMessage|BROADCAST_CHANNEL_NAME" types.ts
```
Should show both exports.

3. TypeScript compilation check:
```bash
npx tsc --noEmit types.ts hooks/useBroadcastSync.ts hooks/useHashRoute.ts 2>&1 | head -20
```
Should have no errors (or only React-related ambient type issues which are fine for CDN setup).
</verification>

<success_criteria>
1. types.ts contains PresentationMessage type union with STATE_UPDATE and STATE_REQUEST variants
2. types.ts contains PresentationState interface with currentIndex, visibleBullets, slides
3. types.ts contains BROADCAST_CHANNEL_NAME constant set to 'pipi-presentation'
4. hooks/useBroadcastSync.ts exports a generic hook that creates BroadcastChannel, handles messages, and cleans up
5. hooks/useHashRoute.ts exports a hook that tracks window.location.hash changes
6. All hooks properly clean up event listeners/channels on unmount
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-01-SUMMARY.md`
</output>
