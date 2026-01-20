# Bug Fix Research Summary: v2.3

**Project:** PiPi v2.3 Bug Fixes
**Domain:** CSS layout, BroadcastChannel sync, API error handling
**Researched:** 2026-01-20
**Confidence:** HIGH

## Executive Summary

Four bugs have been analyzed with root causes identified:

1. **Game activity not showing in student view** — `PresentationMessage` type lacks game state; `StudentView` only renders slides, not game UI
2. **Slide preview cutoff** — Double `aspect-ratio` constraint (FloatingWindow + inner div) conflicts when container is constrained
3. **AI slide revision error** — Missing try/catch around `JSON.parse()` in `geminiService.ts reviseSlide()`; malformed AI responses throw unhandled errors
4. **Flowchart arrows misaligned** — `items-start` on flex container + `pb-20` padding hack on arrows causes misalignment

All fixes are localized changes requiring no new dependencies and minimal architectural changes.

## Key Findings

### Root Causes Identified

| Bug | Root Cause | File | Line |
|-----|-----------|------|------|
| Game sync | Missing game state in broadcast + no game UI in StudentView | `types.ts`, `StudentView.tsx` | — |
| Preview cutoff | `aspect-video` inside FloatingWindow creates double 16:9 constraint | `NextSlidePreview.tsx` | 73 |
| AI revision | `JSON.parse(response.text || "{}")` without try/catch | `geminiService.ts` | 307 |
| Flowchart | `items-start` + `pb-20` hack misaligns arrows | `SlideRenderers.tsx` | 135, 139 |

### Recommended Fix Order

1. **Bug 4 (Flowchart)** — Simplest CSS fix, low regression risk
2. **Bug 2 (Preview cutoff)** — CSS-only, isolated component
3. **Bug 3 (AI revision)** — Error handling, needs testing with both providers
4. **Bug 1 (Game sync)** — Most complex, requires TypeScript type changes and StudentView modifications

### Fix Patterns

**Bug 1: Add game state to broadcast**
```typescript
// Option A: Extend STATE_UPDATE payload
interface PresentationState {
  currentIndex: number;
  visibleBullets: number;
  slides: Slide[];
  gameState?: { isActive: boolean; mode: 'quiz' | null };
}

// Option B: Add new message type
| { type: 'GAME_STATE'; payload: { isActive: boolean; ... } }
```

**Bug 2: Remove nested aspect-ratio**
```tsx
// Before (conflict)
<FloatingWindow aspectRatio={16/9}>
  <div className="aspect-video">

// After (let FloatingWindow handle it)
<FloatingWindow aspectRatio={16/9}>
  <div className="w-full h-full">
```

**Bug 3: Add error handling**
```typescript
try {
  return JSON.parse(response.text || "{}");
} catch (error) {
  throw new AIProviderError('Failed to revise slide', 'PARSE_ERROR', error);
}
```

**Bug 4: Fix flexbox alignment**
```tsx
// Before
<div className="flex ... items-start ...">
  <div className="... pb-20 ...">

// After
<div className="flex ... items-center ...">
  <div className="... ">  // Remove pb-20
```

## Critical Pitfalls to Avoid

| Bug | Pitfall | Prevention |
|-----|---------|------------|
| 1 | Missing message handler in StudentView | Add handler AND component, not just one |
| 1 | State payload incomplete | Include ALL game state fields in broadcast |
| 2 | Transform without explicit dimensions | Set width/height before applying scale |
| 3 | Not catching all error types | Wrap ALL errors in AIProviderError |
| 3 | Malformed AI response | Sanitize JSON, handle markdown code blocks |
| 4 | Fixed aspect-ratio preventing fill | Choose ONE: aspect ratio OR fill space |

## Files Quick Reference

| Bug | Primary Files | Changes |
|-----|---------------|---------|
| 1 | `types.ts`, `StudentView.tsx`, `PresentationView.tsx` | Add message types, game state broadcast, game UI |
| 2 | `NextSlidePreview.tsx` | Remove inner `aspect-video`, use `w-full h-full` |
| 3 | `geminiService.ts`, possibly `App.tsx` | Add try/catch, wrap errors |
| 4 | `SlideRenderers.tsx` | `items-start` → `items-center`, remove `pb-20` |

## Confidence Assessment

| Bug | Confidence | Basis |
|-----|------------|-------|
| 1 (Game sync) | HIGH | Direct code analysis of message types and components |
| 2 (Preview) | HIGH | Identified conflicting aspect-ratio classes |
| 3 (AI revision) | HIGH | Missing try/catch visible in geminiService.ts |
| 4 (Flowchart) | HIGH | Code shows flex issues, standard CSS patterns |

**Overall confidence:** HIGH — All bugs have clear root causes identified through code analysis.

## Testing Requirements

### Bug 1 (Game Sync)
- Open teacher + student views
- Start game → student shows game UI
- Navigate questions → both sync
- End game → student returns to slides

### Bug 2 (Preview Cutoff)
- Create slide with 4+ bullets
- Enter presentation mode
- All content visible in preview (no cutoff)

### Bug 3 (AI Revision)
- Edit slide, enter revision instruction
- Click Revise → slide updates
- Test with invalid API key → shows error (not crash)

### Bug 4 (Flowchart)
- Create flowchart slide
- Arrows centered on boxes
- Boxes fill vertical space
- Test with 2, 3, 4 items

---
*Research completed: 2026-01-20*
*Ready for requirements: yes*
