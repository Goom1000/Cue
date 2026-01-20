# Feature Behavior Research: Bug Fix Milestone

**Project:** PiPi - Teacher Presentation Tool
**Researched:** 2026-01-20
**Purpose:** Define expected behavior and acceptance criteria for 4 bugs

---

## Bug 1: Game Activity Not Syncing to Student View

### Current Behavior (Bug)

When teacher opens the Quiz Game modal in PresentationView, students viewing the projector (StudentView) continue to see the static slide content. The game activity is not broadcast to the student window.

### Expected Behavior

When teacher opens a game/quiz activity, the student view should:
1. **Immediately display the game UI** - Students see the same quiz interface as teacher
2. **Sync game state in real-time** - Question number, options, reveal state all synchronized
3. **Show interactive elements read-only** - Students see questions/answers but cannot interact (teacher controls progression)

### Standard Patterns

**Observer Synchronization Pattern** (Martin Fowler):
- Single shared state broadcasts to all observers
- Changes in one view propagate to domain state, then to other views
- Each view is an observer of the shared data

**BroadcastChannel API** (already used in codebase):
- Teacher sends `STATE_UPDATE` messages
- Student listens and updates local state
- Pattern supports extending payload for game state

### Root Cause Analysis

Looking at `PresentationView.tsx`:
- QuizOverlay renders as a portal (`createPortal(..., document.body)`)
- Game state (`isQuizModalOpen`, `mode`, `questions`, etc.) is local to PresentationView
- `STATE_UPDATE` messages only include `{ currentIndex, visibleBullets, slides }`
- **Missing:** Game state is not included in broadcast messages

Looking at `StudentView.tsx`:
- Only handles `STATE_UPDATE` with slide state
- **Missing:** No game UI component or game state handling

### Fix Requirements

1. Extend `PresentationMessage` type to include game state:
   ```typescript
   | { type: 'GAME_START'; payload: { mode: 'quiz'; numQuestions: number } }
   | { type: 'GAME_UPDATE'; payload: GameState }
   | { type: 'GAME_END' }
   ```

2. Broadcast game state changes from PresentationView
3. Add game rendering to StudentView
4. Student view renders read-only game UI (no interaction buttons)

### Acceptance Criteria

| Criterion | Test Method |
|-----------|-------------|
| Opening game modal broadcasts to student | Open game in teacher view, verify student view changes |
| Quiz questions appear on student view | Compare question text visible on both screens |
| Answer reveal syncs to student view | Click "Reveal Answer" in teacher, verify student sees highlight |
| Closing game returns student to slide | Close quiz, verify student shows current slide |
| Game works with fresh student connection | Open student view AFTER game started, verify catches up |

---

## Bug 2: Slide Preview Not Scaling to Fit Container

### Current Behavior (Bug)

The NextSlidePreview floating window shows slide content that overflows or doesn't scale to fit the container. The preview should show a miniature of the full slide, but instead shows it at a fixed size that may be cropped.

### Expected Behavior

The slide preview should:
1. **Scale entire slide to fit container** - Like "Fit to window" in presentation apps
2. **Maintain aspect ratio** - 16:9 ratio preserved
3. **Show complete slide content** - No cropping, all content visible
4. **Resize dynamically** - When floating window resizes, preview scales with it

### Standard Patterns

**CSS `object-fit: contain`** - Scales content to fit within container without cropping
- Preserves aspect ratio
- May leave empty space (letterboxing)
- Appropriate when full visibility matters over visual impact

**CSS `aspect-ratio` property** - Maintains width-to-height ratio
- Modern approach: `aspect-ratio: 16 / 9`
- Browser adjusts dimensions to preserve ratio regardless of container size

**Transform Scale Pattern** - Scale down content to fit:
```css
.preview-container {
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
.preview-content {
  transform: scale(var(--scale-factor));
  transform-origin: top left;
}
```

### Root Cause Analysis

Looking at `NextSlidePreview.tsx` lines 72-105:
```tsx
<div className="w-full h-full bg-slate-800">
  <div className="aspect-video">  // <- Sets 16:9 ratio
    {nextSlide ? (
      <div className="h-full w-full bg-white p-2 overflow-hidden">
        <div className="text-[10px] font-bold ...">  // <- Fixed tiny text
          {nextSlide.title}
        </div>
        <div className="space-y-0.5">
          {nextSlide.content.slice(0, 3).map(...)}  // <- Shows first 3 bullets only
        </div>
      </div>
    )}
  </div>
</div>
```

**Problem:** The preview renders a simplified text representation of the slide, not a scaled-down version of the actual slide renderer. This is a deliberate simplification but doesn't match expected "preview" behavior.

**Two possible fixes:**
1. **Quick fix:** Make the simplified preview actually fit properly (current approach but fixed)
2. **Full fix:** Render actual `SlideContentRenderer` scaled down using CSS transform

### Fix Requirements

**Option A: Fix simplified preview (minimal change)**
- Ensure container fills FloatingWindow content area
- Use proper overflow handling
- Scale text proportionally to container

**Option B: Render actual slide scaled (better UX)**
- Render `<SlideContentRenderer>` inside preview
- Apply CSS transform scale based on container vs slide dimensions
- Calculate scale factor: `min(containerWidth/1920, containerHeight/1080)`

### Acceptance Criteria

| Criterion | Test Method |
|-----------|-------------|
| Preview shows complete slide content | All visible bullets shown, not truncated |
| Preview maintains 16:9 aspect ratio | Measure dimensions in DevTools |
| Preview scales when window resizes | Drag FloatingWindow corner, verify preview adjusts |
| No content overflow/clipping | Visual inspection at various sizes |
| Preview matches actual slide appearance | Compare preview to main slide panel |

---

## Bug 3: AI Slide Revision Not Working

### Current Behavior (Bug)

User clicks "Revise" button after entering revision instructions, but the slide does not update. The revision may fail silently or not trigger the AI call properly.

### Expected Behavior

AI revision flow should:
1. **Accept natural language instruction** - "Simplify for 10 year olds", "Add real-world example"
2. **Show loading state** - Button shows "Thinking..." during API call
3. **Update slide content** - Title, content, speakerNotes, imagePrompt may all change
4. **Preserve unchanged fields** - Only modify what the instruction requires
5. **Handle errors gracefully** - Show error toast if API fails

### Standard Patterns

**Optimistic UI Pattern:**
- Show loading indicator immediately
- On success, update state with response
- On failure, show error and optionally revert

**Partial Update Pattern:**
- API returns only changed fields
- Merge response with existing slide: `{ ...existingSlide, ...revisions }`

### Root Cause Analysis

Looking at `SlideCard.tsx` lines 42-52:
```tsx
const handleMagicEdit = async () => {
  if (!revisionInput.trim()) return;
  if (!isAIAvailable) {
    onRequestAI('refine this slide with AI');
    return;
  }
  setIsRevising(true);
  await onRevise(slide.id, revisionInput);  // <- This should update slide
  setRevisionInput('');
  setIsRevising(false);
};
```

Looking at `geminiService.ts` `reviseSlide` function (lines 291-308):
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

  return JSON.parse(response.text || "{}");
};
```

**Potential issues:**
1. No error handling in `reviseSlide` - if JSON parse fails, throws
2. No response schema constraining output format
3. The `onRevise` callback in parent may not be merging response correctly
4. Missing try-catch in `handleMagicEdit` to handle errors

Need to trace `onRevise` callback implementation in `App.tsx` or parent component.

### Fix Requirements

1. Add response schema to `reviseSlide` to ensure valid Slide fields
2. Add try-catch with error handling in `handleMagicEdit`
3. Verify `onRevise` callback properly merges partial updates
4. Add error toast on failure

### Acceptance Criteria

| Criterion | Test Method |
|-----------|-------------|
| Loading state shows during revision | Enter text, click Revise, verify "Thinking..." |
| Slide updates after successful revision | Enter "Make shorter", verify content reduces |
| Partial updates preserve other fields | Revise title only, verify content unchanged |
| Error shows on API failure | Test with invalid API key or network off |
| Input clears after successful revision | Verify text input empties after update |

---

## Bug 4: Flowchart Layout Alignment Issues

### Current Behavior (Bug)

In the flowchart layout:
1. **Arrows not centered on boxes** - Connector arrows misaligned with box centers
2. **Boxes don't fill vertical space** - Cards appear smaller than available height

### Expected Behavior

Flowchart layout should:
1. **Center arrows vertically on boxes** - Arrow midpoint aligns with box midpoint
2. **Boxes fill available vertical space** - Use full height minus title/padding
3. **Equal spacing between elements** - Consistent gaps between box-arrow-box

### Standard Patterns

**Flexbox Centering:**
- `align-items: center` - Centers items on cross axis
- `justify-content: center` - Centers items on main axis
- For horizontal flowchart: main axis is row, cross axis is column

**Flowchart Arrow Patterns:**
- Arrows should be vertically centered with adjacent boxes
- Arrow wrapper uses `align-items: center` and `justify-content: center`
- Arrow height matches box height for alignment

**CSS Pseudo-elements for Connectors:**
- Use `::before`/`::after` for arrow heads
- Position relative to parent element
- Transforms for rotation (arrow direction)

### Root Cause Analysis

Looking at `SlideRenderers.tsx` `FlowchartLayout` (lines 113-164):

```tsx
<div className="flex w-full px-4 gap-4 md:gap-6 flex-1 items-start justify-center">
  {slide.content.map((point, idx) => (
    <React.Fragment key={idx}>
      {/* Arrow */}
      {idx > 0 && (
        <div className={`... shrink-0 flex items-center justify-center h-full pb-20 px-2 ...`}>
          <svg .../>
        </div>
      )}

      {/* Card */}
      <div className={`flex-1 min-w-0 ...`}>
        <div className={`aspect-[4/3] rounded-3xl p-4 md:p-8 flex items-center justify-center ... h-full w-full ...`}>
          ...
        </div>
      </div>
    </React.Fragment>
  ))}
</div>
```

**Issues identified:**
1. `items-start` on parent container - This aligns items to top, not center
2. `pb-20` on arrow wrapper - This bottom padding pushes arrow up, misaligning it
3. `aspect-[4/3]` on cards - Fixed aspect ratio prevents filling available height
4. Cards use `flex-1` but parent has `items-start`, so they don't stretch

### Fix Requirements

1. Change `items-start` to `items-stretch` or `items-center` on parent flex container
2. Remove `pb-20` from arrow wrapper (this was likely a hack)
3. Remove fixed `aspect-[4/3]` from cards OR use `min-h-full` instead
4. Ensure arrows use `h-full` with `flex items-center` to center within stretched container

### Acceptance Criteria

| Criterion | Test Method |
|-----------|-------------|
| Arrows vertically centered on boxes | Visual inspection, measure with DevTools |
| Boxes fill available vertical space | DevTools shows cards using full height |
| Consistent spacing between elements | Measure gaps, verify equal |
| Layout responsive at different widths | Resize window, verify no overflow |
| Works with 2, 3, and 4+ boxes | Test with different content lengths |

---

## Summary: Priority and Complexity

| Bug | Priority | Complexity | Risk |
|-----|----------|------------|------|
| 1. Game sync | HIGH | MEDIUM | Extends existing BroadcastChannel pattern |
| 2. Preview scaling | MEDIUM | LOW | CSS-only fix, isolated component |
| 3. AI revision | HIGH | LOW-MEDIUM | Need to trace callback chain |
| 4. Flowchart alignment | LOW | LOW | CSS-only fix, isolated layout |

### Recommended Fix Order

1. **Bug 4 (Flowchart)** - Quick CSS win, low risk
2. **Bug 2 (Preview)** - Quick CSS win, isolated
3. **Bug 3 (AI revision)** - Debug and fix, may reveal error handling gaps
4. **Bug 1 (Game sync)** - Largest scope, requires new message types and StudentView changes

---

## Sources

- [Observer Synchronization Pattern](https://martinfowler.com/eaaDev/MediatedSynchronization.html) - Martin Fowler on multi-view sync
- [CSS aspect-ratio property](https://web.dev/articles/aspect-ratio) - web.dev guide
- [CSS object-fit](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit) - MDN reference
- [Flexbox Alignment](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Aligning_items) - MDN flexbox guide
- [CSS Flowcharts Examples](https://freefrontend.com/css-flowcharts/) - Pattern reference
- [Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) - CSS-Tricks reference
