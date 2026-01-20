# Debugging Stack for Bug Fix Milestone

**Project:** PiPi v2.3 Bug Fixes
**Researched:** 2026-01-20
**Mode:** Bug Fix Research (No new dependencies)

## Bug Overview

| Bug | Category | Core Technology | Primary Debug Approach |
|-----|----------|-----------------|----------------------|
| Game activity not showing in student view | State Sync | BroadcastChannel API | Message tracing, type coverage |
| Slide preview cutoff in teacher view | Layout | CSS scaling, overflow | DevTools element inspection |
| AI slide revision error | API/Handler | Gemini API, error handling | Network tab, try/catch flow |
| Flowchart arrows misaligned | Layout | CSS flexbox, positioning | DevTools layout overlay |

---

## Bug 1: BroadcastChannel Sync Issue (Game Activity Not Showing)

### Problem Context

From code analysis:
- `useBroadcastSync.ts` manages channel lifecycle and heartbeat
- `StudentView.tsx` listens for `STATE_UPDATE` messages
- `PresentationView.tsx` broadcasts state changes
- Game activity (Quiz) is rendered via `QuizOverlay` component in `PresentationView.tsx`

**Hypothesis:** Game state changes are not being broadcast to student view, OR student view is not receiving/rendering game-related messages.

### Root Cause Analysis

Current `PresentationMessage` union in `types.ts`:
```typescript
export type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'STATE_REQUEST' }
  | { type: 'HEARTBEAT'; timestamp: number }
  | { type: 'HEARTBEAT_ACK'; timestamp: number }
  | { type: 'CLOSE_STUDENT' };
```

The `STATE_UPDATE` payload contains:
```typescript
export interface PresentationState {
  currentIndex: number;
  visibleBullets: number;
  slides: Slide[];
}
```

**Finding:** No game/quiz state in the payload. Quiz modal state (`isQuizModalOpen` in PresentationView.tsx line 226) is local to `PresentationView` and never broadcast.

### Debugging Techniques

#### 1. BroadcastChannel Message Tracing

Add temporary console logs to trace message flow:

```typescript
// In useBroadcastSync.ts - onmessage handler (line 42)
channelRef.current.onmessage = (event: MessageEvent<T>) => {
  console.log('[BC] Received:', event.data.type, event.data);
  // ... existing logic
};

// In postMessage wrapper (line 98)
const postMessage = useCallback((message: T) => {
  console.log('[BC] Sending:', message.type, message);
  channelRef.current?.postMessage(message);
}, []);
```

**What to look for:**
- Is any game-related message being broadcast when quiz starts?
- What messages does StudentView receive during quiz?

#### 2. Browser DevTools: Application Tab

1. Open both teacher and student windows
2. Chrome DevTools > Application > Storage
3. Console test: `new BroadcastChannel('pipi-presentation').postMessage({type: 'TEST'})`
4. Verify channel connectivity manually

#### 3. Message Type Completeness Check

Run in console:
```javascript
// List all message types being sent
// Set breakpoint in useBroadcastSync postMessage
```

### Likely Fix Pattern

Add game state to the broadcast payload OR add new message type:

**Option A: Extend STATE_UPDATE payload**
```typescript
export interface PresentationState {
  currentIndex: number;
  visibleBullets: number;
  slides: Slide[];
  gameState?: { isActive: boolean; mode: 'quiz' | null };  // NEW
}
```

**Option B: Add new message type**
```typescript
// Add to PresentationMessage union
| { type: 'GAME_STATE'; payload: { isActive: boolean; mode: 'quiz' | null } }

// Broadcast when quiz opens/closes in PresentationView
useEffect(() => {
  postMessage({
    type: 'GAME_STATE',
    payload: { isActive: isQuizModalOpen, mode: isQuizModalOpen ? 'quiz' : null }
  });
}, [isQuizModalOpen, postMessage]);
```

---

## Bug 2: Slide Preview Cutoff

### Problem Context

From code analysis:
- `NextSlidePreview.tsx` renders preview in a `FloatingWindow` (line 56)
- Uses `aspect-video` class on inner div (line 73)
- Content has fixed `p-2` padding and `truncate` classes
- `FloatingWindow.tsx` uses `react-rnd` with `lockAspectRatio={16/9}` (line 221)

**Key code in NextSlidePreview.tsx (lines 71-105):**
```tsx
<div className="w-full h-full bg-slate-800">
  <div className="aspect-video">  {/* THIS IS THE ISSUE */}
    {nextSlide ? (
      <div className="h-full w-full bg-white p-2 overflow-hidden">
```

**Hypothesis:** Double aspect ratio constraint (FloatingWindow + inner div) causes height calculation issues.

### Debugging Techniques

#### 1. DevTools Element Inspection

1. Open Presentation View
2. Toggle preview visible
3. DevTools > Elements > Select the FloatingWindow container
4. Check computed styles for:
   - `overflow: hidden` on nested containers
   - `aspect-ratio` conflicts between FloatingWindow and inner `.aspect-video`
   - Height calculation differences

**Look for:**
```
- FloatingWindow sets lockAspectRatio={16/9} on react-rnd
- Inner div also has aspect-video (aspect-ratio: 16/9)
- These may conflict when container height is constrained
```

#### 2. Box Model Analysis

In DevTools:
1. Select `.aspect-video` div inside `FloatingWindow`
2. Check "Box Model" panel
3. Compare:
   - Container computed height
   - Content height needed
   - Whether padding pushes content outside

#### 3. Console Dimension Check

```javascript
// Select the preview element
const fw = document.querySelector('[class*="react-rnd"]');
fw.getBoundingClientRect()
// Compare to inner aspect-video div
fw.querySelector('.aspect-video').getBoundingClientRect()
```

### Likely Fix Pattern

**Pattern A: Remove nested aspect-ratio (RECOMMENDED)**
```tsx
// Before: Double aspect ratio constraint
<FloatingWindow aspectRatio={16/9}>
  <div className="aspect-video">  {/* CONFLICT */}

// After: Let FloatingWindow handle aspect ratio alone
<FloatingWindow aspectRatio={16/9}>
  <div className="w-full h-full">  {/* Fill parent */}
```

**Pattern B: Use overflow-y-auto instead of hidden**
```tsx
<div className="h-full w-full bg-white p-2 overflow-y-auto">
```

---

## Bug 3: AI Slide Revision Error

### Problem Context

From code analysis:
- `reviseSlide` in `geminiService.ts` (lines 291-308) calls Gemini API
- Wrapped by `GeminiProvider.reviseSlide` (lines 64-70) with error handling
- Returns `Partial<Slide>` from JSON response

**Key code in geminiService.ts (lines 291-308):**
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

  return JSON.parse(response.text || "{}");  // NO TRY/CATCH HERE
};
```

**Hypothesis:**
1. API call fails (network, rate limit, auth)
2. JSON parsing fails (malformed response)
3. Error propagates but is not properly surfaced to user

### Debugging Techniques

#### 1. Network Tab Analysis

1. Open DevTools > Network
2. Filter by "Fetch/XHR"
3. Trigger the AI revision action in the app
4. Check for:
   - Request sent? (If not: call site issue)
   - Response status (200, 429, 401, 500?)
   - Response body (valid JSON? empty? error message?)

**Common Gemini error responses:**
- 429: Rate limit / quota exceeded
- 401/403: Invalid API key
- 500/503: Server error
- Empty text: Model didn't generate content

#### 2. Error Propagation Tracing

Add console.error at each layer:

```typescript
// In geminiService.ts reviseSlide (around line 301)
try {
  const response = await ai.models.generateContent({ ... });
  console.log('[reviseSlide] Raw response:', response.text);
  const result = JSON.parse(response.text || "{}");
  console.log('[reviseSlide] Parsed:', result);
  return result;
} catch (error) {
  console.error('[reviseSlide] Error:', error);
  throw error;
}
```

#### 3. Find Caller and Check Error Handling

Search for where `reviseSlide` is called (likely in App.tsx or a slide editing component):
```bash
grep -r "reviseSlide" --include="*.tsx" --include="*.ts" .
```

Verify the caller:
- Has try/catch around the call
- Displays error to user via toast/modal
- Doesn't silently fail

### Likely Fix Patterns

**Pattern A: Add try/catch to base function with AIProviderError**
```typescript
export const reviseSlide = async (...): Promise<Partial<Slide>> => {
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";

  try {
    const response = await ai.models.generateContent({...});
    const text = response.text;
    if (!text) {
      throw new Error('Empty response from AI');
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('[reviseSlide] Failed:', error);
    // Import AIProviderError from aiProvider.ts
    throw new AIProviderError(
      'Failed to revise slide. Please try again.',
      'PARSE_ERROR',
      error
    );
  }
};
```

**Pattern B: Validate response structure**
```typescript
const data = JSON.parse(response.text || "{}");
if (!data || typeof data !== 'object') {
  throw new AIProviderError('Invalid response format', 'PARSE_ERROR');
}
// Optionally validate expected fields exist
if (!data.title && !data.content && !data.speakerNotes) {
  console.warn('[reviseSlide] Response has no recognized fields:', data);
}
return data;
```

---

## Bug 4: Flowchart Layout Arrows Misaligned

### Problem Context

From code analysis in `SlideRenderers.tsx` (lines 113-164):

```tsx
<div className="flex w-full px-4 gap-4 md:gap-6 flex-1 items-start justify-center">
  {slide.content.map((point, idx) => (
    <React.Fragment key={idx}>
      {idx > 0 && (
        <div className="... shrink-0 flex items-center justify-center h-full pb-20 px-2 ...">
          <svg ...> {/* Arrow */} </svg>
        </div>
      )}
      <div className="flex-1 min-w-0 ...">
        <div className="aspect-[4/3] rounded-3xl ..."> {/* Card */}
```

**Issues identified:**
1. `pb-20` (padding-bottom: 5rem) on arrow container - arbitrary offset hack
2. `h-full` on arrow container but parent has `items-start` - height isn't full
3. `items-start` means arrows align to top, not center of cards
4. Cards use `aspect-[4/3]` which sets height based on width
5. Arrow container doesn't match card height dynamically

### Debugging Techniques

#### 1. DevTools Flexbox Overlay

1. Open Presentation View with a flowchart slide
2. DevTools > Elements > Select the flex container (`.flex.w-full.px-4...`)
3. Click "flex" badge to toggle Flexbox overlay
4. Observe:
   - How space is distributed between cards and arrows
   - Whether arrows are actually centering within their allocated space
   - Item heights compared to each other

#### 2. Computed Height Check

```javascript
// In console, select arrow container
const arrow = document.querySelector('.shrink-0.flex.items-center');
arrow.offsetHeight  // Actual arrow container height
arrow.parentElement.offsetHeight  // Parent height

// Select card container
const card = document.querySelector('[class*="aspect-"]');
card.offsetHeight  // Card height
```

**Compare:** Arrow container height should match card container height for proper centering.

#### 3. Remove pb-20 Test

Temporarily remove `pb-20` from arrow container in DevTools:
1. Select arrow container div
2. In Styles panel, uncheck `padding-bottom: 5rem`
3. Does arrow center correctly now? Or does it go to top?

#### 4. Change items-start to items-center Test

In DevTools:
1. Select parent flex container
2. Change `items-start` to `items-center` in Styles
3. Observe if arrows now center with cards

### Whitespace Not Filled Issue

The `justify-center` on parent centers the group, potentially leaving edges empty.

Check:
1. Is there a max-width constraint on parent?
2. Are cards not filling available space?

### Likely Fix Patterns

**Pattern A: Use items-center for vertical alignment (SIMPLEST)**
```tsx
// Before
<div className="flex ... items-start justify-center">

// After
<div className="flex ... items-center justify-between">
```

**Pattern B: Remove pb-20 hack, let flexbox center naturally**
```tsx
// Before
<div className="shrink-0 flex items-center justify-center h-full pb-20 px-2">

// After (if parent uses items-center)
<div className="shrink-0 flex items-center justify-center">
```

**Pattern C: Use CSS Grid for precise alignment**
```tsx
// Instead of flex with interleaved elements
<div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4">
  <Card />
  <Arrow />
  <Card />
  <Arrow />
  <Card />
</div>
```

**Pattern D: Match arrow height to sibling card**
```tsx
// Use self-stretch to match sibling heights
<div className="shrink-0 flex items-center justify-center self-stretch">
  <svg .../>
</div>
```

---

## React 19 Specific Debugging Notes

### DevTools Version

Ensure React DevTools extension supports React 19:
- Chrome: React Developer Tools v4.28+ (as of Jan 2026)
- Check for "Fiber architecture" support in Components tab

### Component Inspection

1. DevTools > Components tab
2. Select component (StudentView, PresentationView, etc.)
3. Check props and state in right panel
4. Use "Highlight updates" to see unnecessary re-renders

### Hooks Inspection

For hooks-based state (useBroadcastSync):
1. Select component using the hook in Components tab
2. Hooks panel shows: useState, useRef, useCallback values
3. Check if `lastMessage` is updating when expected
4. Verify `isConnected` state reflects reality

### BroadcastChannel in React 19

BroadcastChannel works identically in React 19. Key debugging points:
- Check that channel cleanup runs on unmount (return function in useEffect)
- Verify channel name matches between windows (`'pipi-presentation'`)
- Confirm message handlers are registered before messages are sent

---

## Tailwind CSS Debugging

### Class Inspector

1. DevTools > Elements
2. Select element
3. Computed tab shows resolved CSS values
4. Check for class conflicts (multiple classes setting same property)

### Responsive Classes

Flowchart uses `md:` prefixes. Test at different viewport widths:
- Under 768px: mobile classes apply
- 768px+: `md:` classes apply

### Common Tailwind Pitfalls in This Codebase

1. **`aspect-video` inside `aspect-[4/3]`**: Conflicting aspect ratios
2. **`h-full` with parent not having explicit height**: h-full becomes 0
3. **`truncate` with `flex-1`**: Text may overflow unexpectedly
4. **`overflow-hidden` on multiple ancestors**: Stacking issues

---

## Summary: Debug Priority Order

| Bug | First Step | Tool | Time Estimate |
|-----|-----------|------|---------------|
| BroadcastChannel | Check message types in types.ts | Code review | 5 min to identify root cause |
| Slide Preview | Remove inner aspect-video in DevTools | Elements panel | 10 min to identify |
| AI Revision | Check Network tab for failed request | Network panel | 10 min to identify |
| Flowchart Arrows | Toggle flexbox overlay, test items-center | Elements panel | 10 min to identify |

**No new dependencies required.** All debugging uses browser DevTools and strategic console.log placement.

---

## Confidence Assessment

| Finding | Confidence | Basis |
|---------|------------|-------|
| BroadcastChannel missing game state | HIGH | Direct code analysis of types.ts and PresentationView.tsx |
| Preview aspect ratio conflict | HIGH | Direct code analysis, FloatingWindow + NextSlidePreview |
| reviseSlide missing try/catch | HIGH | Direct code analysis of geminiService.ts line 307 |
| Flowchart pb-20 hack causing misalignment | MEDIUM | Code shows arbitrary offset, needs DevTools verification |
| items-start causing arrow misalignment | HIGH | Flexbox behavior is well-documented |

---

## Sources

- React DevTools documentation (training data - HIGH confidence)
- Chrome DevTools CSS debugging (training data - HIGH confidence)
- BroadcastChannel API (MDN, verified via codebase usage - HIGH confidence)
- Flexbox debugging techniques (training data - HIGH confidence)
- Tailwind CSS documentation (training data - HIGH confidence)
- **Codebase files analyzed:**
  - `/hooks/useBroadcastSync.ts`
  - `/components/StudentView.tsx`
  - `/components/PresentationView.tsx`
  - `/components/SlideRenderers.tsx` (FlowchartLayout lines 113-164)
  - `/components/NextSlidePreview.tsx`
  - `/components/FloatingWindow.tsx`
  - `/services/geminiService.ts` (reviseSlide lines 291-308)
  - `/services/providers/geminiProvider.ts`
  - `/types.ts` (PresentationMessage, PresentationState)
