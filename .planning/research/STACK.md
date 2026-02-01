# Technology Stack: Delay Answer Reveal

**Feature:** Delay Answer Reveal with Scaffolding Strategies
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

**No new dependencies required.** Delay Answer Reveal is a prompt engineering and data structure task, not a library task. The existing Cue stack provides everything needed.

## Current Stack (Unchanged)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| React | 19.2.0 | UI framework | Keep |
| Vite | 6.2.0 | Build tool | Keep |
| TypeScript | 5.8.2 | Type safety | Keep |
| @google/genai | 1.30.0 | Gemini API client | Keep |
| @floating-ui/react | 0.27.17 | Tooltips | Keep |
| driver.js | 1.4.0 | Onboarding tours | Keep |
| Tailwind CSS | (implicit) | Styling | Keep |

## Stack Additions: NONE

This feature requires **zero npm additions** because:

### 1. Content Detection Already Exists

The codebase has a mature content detection system:

```
services/contentPreservation/
  detector.ts     - Pattern detection (questions, activities)
  types.ts        - DetectedContent, ConfidenceLevel types
```

Delay Answer Reveal extends this pattern:
- Add a new `ContentType: 'teachable-moment'`
- Extend detection patterns for problem/answer pairs
- Same confidence levels (high/medium/low)

### 2. Prompt Engineering Framework Exists

The codebase has established prompt injection patterns:

```
services/prompts/
  contentPreservationRules.ts  - XML-tagged content preservation
  studentFriendlyRules.ts      - Grade-level language rules
```

Delay Answer Reveal adds new prompt sections:
- `TEACHABLE_MOMENT_RULES` - How to detect and structure
- `SCAFFOLDING_STRATEGY_RULES` - What to include in teleprompter

### 3. Slide Data Structure Supports Progressive Disclosure

Current `Slide` interface (from `types.ts`):

```typescript
interface Slide {
  id: string;
  title: string;
  content: string[];        // Progressive bullets - ALREADY SUPPORTS reveal
  speakerNotes: string;     // Uses pointing emoji delimiter for segments
  // ... other fields
}
```

The existing progressive disclosure already works:
- `visibleBullets` state in `PresentationView.tsx`
- Broadcast sync to student view
- Teleprompter segments aligned to bullet reveals

### 4. AI Provider Abstraction Ready

The `AIProviderInterface` pattern (from `services/aiProvider.ts`) abstracts all AI calls:

```typescript
interface AIProviderInterface {
  generateLessonSlides(...): Promise<Slide[]>;
  regenerateTeleprompter(...): Promise<string>;
  // ... all AI operations
}
```

No interface changes needed - existing methods handle generation.

## Data Structure Recommendations

### Option A: Separate Field (Recommended)

Add optional field to `Slide` interface:

```typescript
interface Slide {
  // ... existing fields
  delayedContent?: {
    type: 'problem-answer' | 'question-answer' | 'reveal-sequence';
    answer: string;              // The content to delay
    scaffoldingHint?: string;    // Hint for teleprompter
  };
}
```

**Pros:**
- Explicit, type-safe
- Easy to check in UI: `if (slide.delayedContent)`
- Clear semantics for progressive reveal

**Cons:**
- Requires schema migration for existing files
- Small type system addition

### Option B: Convention in Content Array (Alternative)

Use content array position as semantic marker:
- Last bullet is always the "answer" to reveal
- Detection heuristics mark it automatically

**Pros:**
- No type changes
- Works with existing system

**Cons:**
- Implicit, harder to reason about
- Detection may have false positives/negatives

**Recommendation:** Option A - explicit is better for this semantic.

## Integration Points

### 1. Slide Generation

Modify `geminiService.ts`:

```
generateLessonSlides()
  |-- System prompt += TEACHABLE_MOMENT_RULES
  |-- Response schema += delayedContent field (optional)
```

### 2. Teleprompter Generation

Modify teleprompter rules:

```
TELEPROMPTER_RULES += SCAFFOLDING_STRATEGY_RULES
  - When slide has delayedContent:
    - Add scaffolding prompts before reveal
    - Include wait cues: "[Let students think]"
    - Provide answer hints for teacher
```

### 3. Presentation View

Modify `PresentationView.tsx`:

```
- Track delayedContent reveal state separately from bullet reveals
- Add "Reveal Answer" button/trigger
- Sync reveal state to student view via broadcast
```

### 4. Content Detection

Extend `detector.ts`:

```
detectTeachableMoments(text: string): DetectedContent[]
  - Pattern: "What is X?" followed by answer
  - Pattern: "Calculate..." followed by numeric answer
  - Pattern: Problem statement with solution
```

## What NOT to Add

| Considered | Why Not |
|------------|---------|
| Animation library | CSS animations sufficient for reveal effects |
| State management (Redux, Zustand) | React useState + context sufficient |
| Timer library | setTimeout/setInterval sufficient for delays |
| NLP library | AI handles semantic understanding; regex patterns for detection |
| Rich text editor | Plain markdown + arrays sufficient |

## Implementation Order

1. **Types first** - Add `delayedContent` to `Slide` interface
2. **Detection second** - Extend content detector for teachable moments
3. **Prompts third** - Add scaffolding rules to system prompts
4. **UI fourth** - Add reveal controls to PresentationView

## Migration Considerations

- **File format:** Current version is 4 (`CURRENT_FILE_VERSION`)
- **Backward compatible:** `delayedContent` is optional, so existing files load fine
- **No breaking changes:** All changes are additive

## Sources

All findings based on codebase analysis:
- `/types.ts` - Slide interface definition
- `/services/aiProvider.ts` - AI abstraction layer
- `/services/geminiService.ts` - Prompt templates
- `/services/contentPreservation/` - Detection patterns
- `/services/prompts/` - Prompt injection framework
- `/components/PresentationView.tsx` - Progressive disclosure implementation

No external research needed - this is an internal architecture extension.
