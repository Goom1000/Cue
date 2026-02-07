# Phase 58: Deck Cohesion - Research

**Researched:** 2026-02-07
**Domain:** AI-powered deck-wide text harmonization, preview/apply UI pattern
**Confidence:** HIGH

## Summary

Deck Cohesion allows a teacher to unify mismatched slides -- built from a mix of AI generation, clipboard paste, image paste, and manual editing -- into a coherent deck with consistent tone and flow. The AI analyzes all slides in the deck, proposes revised `content[]` and `speakerNotes` for slides that need changes, and the teacher previews then applies or cancels.

The codebase already has every building block needed. The `AIProviderInterface` pattern (Gemini + Claude dual-provider) supports structured JSON output for slide data. The `Slide` type includes `source?: SlideSource` for provenance tracking. The `react-diff-viewer-continued` library is already installed (used in `EnhancementPanel`). The top bar in the editor has space for a new button. The `handleUpdateSlide` function batch-updates individual slides by ID.

**Primary recommendation:** Add a `makeDeckCohesive` method to `AIProviderInterface` that accepts the full slide array and returns an array of proposed changes (slide ID + updated fields). Build a modal/panel preview UI using `react-diff-viewer-continued` for before/after comparison, with Apply All and Cancel buttons.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/genai` | ^1.30.0 | Gemini structured output (responseSchema) | Already in project; supports JSON schema enforcement |
| Claude API (fetch) | anthropic-version 2023-06-01 | Claude structured output (extractJSON) | Already in project; direct fetch with CORS header |
| `react-diff-viewer-continued` | ^3.4.0 | Visual diff of before/after text | Already installed and used in EnhancementPanel |
| React 19 | ^19.2.0 | UI components | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Toast system (`useToast`) | built-in | Progress/error feedback | During AI analysis, on apply/cancel |
| `AIProviderError` | built-in | Unified error handling with retry | All AI calls |
| `withRetry` | built-in | Exponential backoff | Wrapping the cohesion API call |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Full modal overlay | Inline panel below slides | Modal is better: cohesion is a deliberate batch operation, not an inline edit. Modal focuses attention on reviewing all changes. |
| Per-slide diff viewer | Simple text comparison | Diff viewer is better: already installed, shows exact changes clearly, teacher can read what changed at a glance |
| Streaming response | Single batch response | Batch is simpler: the entire deck context must be analyzed holistically. Streaming would complicate the preview-before-apply pattern. |

**Installation:** No new dependencies needed. Everything is already in the project.

## Architecture Patterns

### Recommended Project Structure

```
services/
  providers/
    geminiProvider.ts    # Add makeDeckCohesive method
    claudeProvider.ts    # Add makeDeckCohesive method
  aiProvider.ts          # Add method to AIProviderInterface + CohesionResult type
  prompts/
    cohesionPrompts.ts   # NEW: system prompt, schemas, tool definitions

components/
  CohesionPreview.tsx    # NEW: modal showing proposed changes with diff view

App.tsx                  # Add "Make Cohesive" button to top bar, handler function
```

### Pattern 1: Cohesion Result Type

**What:** A structured return type that maps each changed slide to its proposed updates.
**When to use:** The AI returns only slides that need changes, with both old and new values for diff display.

```typescript
// In services/aiProvider.ts
export interface CohesionChange {
  slideIndex: number;           // 0-indexed position in deck
  slideId: string;              // For applying via handleUpdateSlide
  originalTitle: string;        // For diff display
  proposedTitle?: string;       // Only if title changes
  originalContent: string[];    // For diff display
  proposedContent?: string[];   // Only if content changes
  originalSpeakerNotes: string; // For diff display
  proposedSpeakerNotes?: string;// Only if notes change
  reason: string;               // Why this slide was changed (for teacher understanding)
}

export interface CohesionResult {
  changes: CohesionChange[];
  summary: string;              // Overall description of what was harmonized
  toneDescription: string;      // The unified tone that was applied
}
```

### Pattern 2: AI Provider Method Signature

**What:** Method added to `AIProviderInterface` following existing patterns.
**When to use:** Both Gemini and Claude providers implement this.

```typescript
// Added to AIProviderInterface
makeDeckCohesive(
  slides: Slide[],
  gradeLevel: string,
  verbosity: VerbosityLevel
): Promise<CohesionResult>;
```

### Pattern 3: Serializing Deck for AI Context

**What:** Converting the full slide array into a compact representation for the AI prompt, similar to `buildSlideContextForEnhancement`.
**When to use:** Building the user message for the cohesion API call.

```typescript
function buildDeckContextForCohesion(slides: Slide[]): string {
  return slides.map((slide, i) => {
    const source = slide.source?.type || 'ai-generated';
    return [
      `--- Slide ${i + 1} [${source}] ---`,
      `Title: ${slide.title}`,
      `Content: ${slide.content.join(' | ')}`,
      `Speaker Notes: ${slide.speakerNotes}`,
      `Layout: ${slide.layout || 'split'}`,
    ].join('\n');
  }).join('\n\n');
}
```

### Pattern 4: Preview Modal with Diff

**What:** A modal component showing before/after for each changed slide, with Apply All and Cancel.
**When to use:** After AI returns `CohesionResult`, before applying changes.

The modal should:
1. Show a summary banner at top ("3 of 8 slides will be updated")
2. List each changed slide with expandable diff view (using `react-diff-viewer-continued`)
3. Show the `reason` for each change
4. Have "Apply All" (primary) and "Cancel" (secondary) buttons at the bottom
5. Apply = loop through `changes` and call `handleUpdateSlide(change.slideId, { ...proposedFields })`

### Pattern 5: Top Bar Button Placement

**What:** The "Make Cohesive" button goes in the editor top bar alongside "Edit Class List" and slide selection controls.
**When to use:** Only visible when the deck has 2+ slides.

```
TOP BAR layout:
[Edit Class List] | [graded count] | [slide selection controls] | ... spacer ... | [Make Cohesive]
```

The button should be positioned on the right side of the top bar (using `ml-auto`) to separate it from the selection/export controls. It should use a distinct style to indicate it is a deck-wide AI operation.

### Anti-Patterns to Avoid

- **Modifying slides without preview:** The entire point of COHE-03 and COHE-04 is that changes are previewed first. Never apply cohesion changes directly.
- **Re-generating images during cohesion:** Cohesion is about text tone and flow, not visual changes. Do not trigger image regeneration.
- **Sending image data to the AI:** Only text fields (title, content, speakerNotes) need to be sent. Sending imageUrl/imagePrompt wastes tokens.
- **Editing slides with `originalPastedImage`:** Pasted image slides display the original image full-screen. Cohesion should only modify their speakerNotes (teleprompter), not their content array (which is hidden anyway).
- **Losing the source field:** When applying cohesion updates, do not overwrite `slide.source`. The provenance tracking must be preserved.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text diffing | Custom string comparison | `react-diff-viewer-continued` (already installed) | Handles word-level diffs, syntax highlighting, side-by-side vs inline views |
| Retry with backoff | Custom retry loop | `withRetry()` from `aiProvider.ts` | Already handles retryable error codes (NETWORK_ERROR, RATE_LIMIT, SERVER_ERROR) |
| Error classification | Custom HTTP status parsing | `AIProviderError` + `mapHttpToErrorCode` | Already maps all status codes to user-friendly messages |
| JSON extraction | Custom regex parsing | `extractJSON<T>()` in claudeProvider | Already handles markdown code block wrapping |
| Structured output (Gemini) | Free-text JSON parsing | `responseSchema` with `Type` enums | Gemini enforces schema at generation time, no parse errors |

**Key insight:** This feature is primarily a new AI prompt + a preview UI. Almost zero infrastructure needs to be built.

## Common Pitfalls

### Pitfall 1: Token Limits with Large Decks

**What goes wrong:** A deck with 15+ slides, each with 5 bullets and full speakerNotes, can easily exceed input token limits.
**Why it happens:** Speaker notes are verbose (especially in detailed mode). The full deck serialized can be 10,000+ tokens.
**How to avoid:** Cap at ~15-20 slides for the context (like `buildSlideContextForEnhancement` does). For the cohesion output, use a structured schema that only includes changed fields, not the full slide. Send a compact representation: title, content bullets (short), and a truncated version of speakerNotes (first 200 chars per slide for tone detection, let the AI regenerate full notes).
**Warning signs:** API errors with 400 status, truncated responses, or slides at the end of the deck being ignored.

### Pitfall 2: Clobbering Pasted Image Slides

**What goes wrong:** Cohesion rewrites the `content[]` of a pasted-image slide, but that content is hidden in the UI (full-image layout shows the original pasted image).
**Why it happens:** The AI treats all slides equally and rewrites content that is never displayed.
**How to avoid:** In the prompt, mark pasted-image slides (those with `originalPastedImage`) as "teleprompter-only" -- the AI should only harmonize their `speakerNotes`, not their `content[]` or `title`.
**Warning signs:** Preview diff shows content changes for slides that display as full-screen images.

### Pitfall 3: Destroying Teleprompter Segment Count

**What goes wrong:** The AI rewrites speakerNotes but produces the wrong number of segments (delimited by the pointing right hand emoji). The progressive disclosure system requires exactly `content.length + 1` segments.
**Why it happens:** The AI is focused on tone consistency and forgets the structural constraint.
**How to avoid:** Include the teleprompter rules in the cohesion prompt. After receiving the result, validate that each changed slide's `proposedSpeakerNotes` has the correct segment count. If not, either reject that slide's changes or fix programmatically.
**Warning signs:** Presenting after cohesion causes misaligned bullet reveals.

### Pitfall 4: Overwriting User Edits

**What goes wrong:** A teacher manually fine-tuned a slide's content, then runs "Make Cohesive" which overwrites their edits.
**Why it happens:** The AI sees inconsistency and rewrites manually-edited slides.
**How to avoid:** The preview panel is the safeguard here (COHE-03). The teacher sees exactly what will change and can cancel. Additionally, the `reason` field helps teachers understand why each slide is being changed. Future COHE-06 (per-slide accept/reject) would make this even safer, but it is explicitly out of scope.
**Warning signs:** Teacher frustration after applying cohesion.

### Pitfall 5: Inconsistent Verbosity After Cohesion

**What goes wrong:** The deck has `deckVerbosity` set to 'concise', but cohesion rewrites speakerNotes in 'standard' or 'detailed' style.
**Why it happens:** The cohesion prompt does not account for the deck's verbosity setting.
**How to avoid:** Pass `deckVerbosity` to the `makeDeckCohesive` method and include verbosity rules in the prompt.
**Warning signs:** Speaker notes suddenly become much longer or shorter after cohesion.

### Pitfall 6: `callClaude` uses `this.model` but is a standalone function

**What goes wrong:** The `callClaude` function in `claudeProvider.ts` references `this.model` but is defined as a standalone `async function`, not a method.
**Why it happens:** This is an existing pattern in the codebase -- the function uses `this` but is called from class methods that bind the correct context.
**How to avoid:** Follow the existing pattern: define the new method as a class method on `ClaudeProvider` that calls `callClaude` with `this.apiKey` (same as `reviseSlide`, `generateContextualSlide`, etc.). The `model` is accessed via `this.model` in the class context.
**Warning signs:** `this.model` being undefined at runtime.

## Code Examples

### Example 1: Cohesion System Prompt

```typescript
// services/prompts/cohesionPrompts.ts

export const COHESION_SYSTEM_PROMPT = `
You are an expert educational content editor for Cue, a presentation app for primary school teachers (Year 6, ages 10-11).

YOUR TASK:
Analyze an entire slide deck and propose changes to make it cohesive:
1. TONE: Ensure consistent language register across all slides (student-friendly, age-appropriate)
2. FLOW: Ensure logical progression -- each slide should build on the previous one
3. TERMINOLOGY: Standardize key vocabulary (if "fraction" is used in slide 2 but "fractional part" in slide 5, unify)
4. SPEAKER NOTES: Harmonize teleprompter scripts so the teacher's voice is consistent

RULES:
- Only propose changes for slides that NEED them. If a slide already fits, skip it.
- Preserve the educational content -- do not remove key concepts
- Maintain each slide's layout and structure (same number of bullets)
- For slides marked as [pasted-image], only modify speakerNotes (the content is hidden behind a full-screen image)

SPEAKER NOTES FORMAT:
- Use the emoji delimiter between segments
- Segment count MUST equal number of bullets + 1
- Segment 0 = intro before any bullet appears
- Each subsequent segment explains the bullet that was JUST revealed
- NEVER repeat slide text in speaker notes
- NEVER preview upcoming bullets
`;
```

### Example 2: Gemini Response Schema for Cohesion

```typescript
// services/prompts/cohesionPrompts.ts

import { Type } from '@google/genai';

export const COHESION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Brief description of what was harmonized across the deck'
    },
    toneDescription: {
      type: Type.STRING,
      description: 'The unified tone applied (e.g., "warm and encouraging, suitable for Year 6")'
    },
    changes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slideIndex: { type: Type.NUMBER, description: '0-indexed slide position' },
          proposedTitle: { type: Type.STRING, description: 'New title (omit if unchanged)' },
          proposedContent: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'New bullet points (omit if unchanged, MUST have same count as original)'
          },
          proposedSpeakerNotes: {
            type: Type.STRING,
            description: 'New speaker notes with emoji delimiters (omit if unchanged)'
          },
          reason: { type: Type.STRING, description: 'Why this slide needs changes' }
        },
        required: ['slideIndex', 'reason']
      }
    }
  },
  required: ['summary', 'toneDescription', 'changes']
};
```

### Example 3: Claude Tool Schema for Cohesion

```typescript
export const COHESION_TOOL = {
  name: 'propose_cohesion_changes',
  description: 'Propose changes to make a slide deck cohesive in tone and flow',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: 'Brief description of harmonization' },
      toneDescription: { type: 'string', description: 'The unified tone applied' },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slideIndex: { type: 'number' },
            proposedTitle: { type: 'string' },
            proposedContent: { type: 'array', items: { type: 'string' } },
            proposedSpeakerNotes: { type: 'string' },
            reason: { type: 'string' }
          },
          required: ['slideIndex', 'reason']
        }
      }
    },
    required: ['summary', 'toneDescription', 'changes']
  }
};
```

### Example 4: Applying Cohesion Changes

```typescript
// In App.tsx handler
const handleApplyCohesion = (result: CohesionResult) => {
  for (const change of result.changes) {
    const slide = slides[change.slideIndex];
    if (!slide) continue;

    const updates: Partial<Slide> = {};
    if (change.proposedTitle) updates.title = change.proposedTitle;
    if (change.proposedContent) updates.content = change.proposedContent;
    if (change.proposedSpeakerNotes) updates.speakerNotes = change.proposedSpeakerNotes;

    handleUpdateSlide(slide.id, updates);
  }
  addToast(`Deck cohesion applied to ${result.changes.length} slides`, 3000, 'success');
};
```

### Example 5: Using react-diff-viewer-continued (Existing Pattern)

```typescript
// From EnhancementPanel.tsx -- this exact pattern is already used in the codebase
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

<ReactDiffViewer
  oldValue={originalText}
  newValue={proposedText}
  splitView={false}
  useDarkTheme={isDarkMode}
  compareMethod={DiffMethod.WORDS}
  hideLineNumbers={true}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Free-text JSON from Gemini | `responseSchema` with Type enums | @google/genai 1.x | No parse errors, guaranteed structure |
| Single provider | Dual provider (Gemini + Claude) | v3.x | Must implement in both providers |
| No source tracking | `SlideSource` type on each slide | Phase 55 | Cohesion can be smarter about what to change |

**Deprecated/outdated:**
- The old `responseMimeType: "application/json"` without `responseSchema` is still used for `reviseSlide` in geminiService.ts but newer methods use the full schema approach. Cohesion should use the full schema approach.

## Open Questions

1. **Should cohesion preserve layout and theme?**
   - What we know: The requirements say "tone and flow consistency." Layout and theme are visual, not textual.
   - What's unclear: A deck with 5 different themes looks incoherent visually, but COHE-02 says "tone and flow."
   - Recommendation: Keep scope to text only (title, content, speakerNotes). Theme/layout unification could be a separate future feature. This keeps the AI output smaller and the preview simpler.

2. **How to handle very large decks (20+ slides)?**
   - What we know: `buildSlideContextForEnhancement` caps at 15 slides. Gemini 2.0 Flash has ~1M token context. Claude Sonnet 4 has 200K.
   - What's unclear: Whether 20+ slides with full speakerNotes will exceed practical limits.
   - Recommendation: Cap at 20 slides with truncated speakerNotes (first 200 chars each for tone detection). If the deck is larger, show a toast explaining the limit. The AI regenerates full notes for changed slides based on the harmonized tone.

3. **Should the button disable during generation?**
   - What we know: Other AI operations (revise, exemplar) show loading states on individual slides.
   - What's unclear: How to show deck-wide progress.
   - Recommendation: Disable the button and show a spinner next to it while the AI is working. Use `isProcessing` state in App.tsx (existing pattern with `isProcessingFile`, `isProcessingPpt`).

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection: `types.ts` (Slide interface, SlideSource type)
- Codebase direct inspection: `services/aiProvider.ts` (AIProviderInterface, all method signatures)
- Codebase direct inspection: `services/providers/claudeProvider.ts` (callClaude pattern, extractJSON, reviseSlide)
- Codebase direct inspection: `services/providers/geminiProvider.ts` (responseSchema pattern, structured output)
- Codebase direct inspection: `services/prompts/` (prompt structure patterns)
- Codebase direct inspection: `services/slideAnalysis/slideAnalysisPrompts.ts` (dual-schema pattern: Gemini Type + Claude tool)
- Codebase direct inspection: `components/EnhancementPanel.tsx` (react-diff-viewer-continued usage)
- Codebase direct inspection: `components/PasteComparison.tsx` (preview/action UI pattern)
- Codebase direct inspection: `App.tsx` (top bar layout, handleUpdateSlide, toast system, provider usage)
- Codebase direct inspection: `package.json` (all dependencies confirmed)

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` - Phase 58 requirements and success criteria
- `.planning/REQUIREMENTS.md` - COHE-01 through COHE-04 specifications

### Tertiary (LOW confidence)
- None. All findings based on direct codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in the project
- Architecture: HIGH - Follows exact patterns already established in the codebase (AIProviderInterface, prompt files, dual-provider)
- Pitfalls: HIGH - Based on direct analysis of Slide type, teleprompter rules, and pasted-image behavior
- Code examples: HIGH - Modeled directly on existing code patterns (slideAnalysisPrompts.ts, claudeProvider.ts, EnhancementPanel.tsx)

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable -- all patterns are internal to this codebase)
