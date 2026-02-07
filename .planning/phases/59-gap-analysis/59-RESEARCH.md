# Phase 59: Gap Analysis - Research

**Researched:** 2026-02-07
**Domain:** AI-powered deck-vs-lesson-plan comparison, gap identification, slide generation from gaps
**Confidence:** HIGH

## Summary

Gap Analysis allows a teacher to upload a lesson plan PDF **after** their deck is already built (from any combination of AI generation, clipboard paste, image paste, and manual editing) and have the AI identify missing topics. The AI compares the deck's content against the lesson plan, produces a ranked list of gaps (critical / recommended / nice-to-have), suggests slide content for each gap, and lets the teacher one-click generate slides to fill them. The gap list updates live as slides are added.

This feature has two distinct phases of AI interaction: (1) an analysis phase that compares the deck against the uploaded lesson plan and produces a structured gap list, and (2) a generation phase that creates individual slides from selected gaps. Phase 1 is architecturally similar to `makeDeckCohesive` (send deck context + lesson plan text to AI, get structured result). Phase 2 is architecturally similar to `handleInsertElaborateSlide` (create temp placeholder slide, call AI to generate, replace placeholder with result).

The codebase already has every building block: PDF processing via pdf.js (both text extraction and page-image rendering), the dual-provider AI pattern (Gemini structured output via `responseSchema` + Claude structured output via `tool_choice`), the `buildDeckContextForCohesion` serializer, the `react-diff-viewer-continued` library (though diffs aren't needed here -- this is a list UI), the temp-slide-then-replace insertion pattern, and the modal/panel UI patterns from Phase 58.

**Primary recommendation:** Add an `analyzeGaps` method to `AIProviderInterface` that accepts the serialized deck + lesson plan text and returns a structured `GapAnalysisResult` with typed gaps. Build a side panel (not a modal) for the gap list since the teacher needs to see their deck alongside the gaps. Add a `generateSlideFromGap` method (or reuse `generateContextualSlide` with a gap-specific prompt) for one-click slide generation.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/genai` | ^1.30.0 | Gemini structured output (responseSchema) | Already in project; schema enforcement for gap list |
| Claude API (fetch) | anthropic-version 2023-06-01 | Claude structured output (tool_choice) | Already in project; direct fetch with CORS header |
| pdf.js | 3.11.174 (CDN) | PDF text extraction + page rendering | Already loaded via CDN in index.html; used by `processPdf` in App.tsx |
| React 19 | ^19.2.0 | UI components | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Toast system (`useToast`) | built-in | Progress/error feedback | During PDF processing, AI analysis, slide generation |
| `AIProviderError` | built-in | Unified error handling with retry | All AI calls |
| `withRetry` | built-in | Exponential backoff | Wrapping both gap analysis and slide generation calls |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Side panel for gap list | Full-screen modal (like CohesionPreview) | Side panel is better: teacher needs to see their deck while reviewing gaps. Cohesion used a modal because the action was "review all then apply all." Gaps are one-at-a-time actions. |
| Reusing `processPdf` from App.tsx | Using `processPdf` from `documentProcessors/pdfProcessor.ts` | App.tsx has its own inline `processPdf` that extracts text + page images. The `documentProcessors/pdfProcessor.ts` version does the same but with different constants (MAX_PAGES=10, scale=1.5). Either works; for consistency with the existing lesson plan upload flow, reuse the App.tsx `processPdf` pattern. |
| Single AI call (analysis + slide suggestions) | Two-step: analysis first, then generate per gap | Single call is simpler but token-heavy if including full slide content for suggestions. Two-step is more responsive: show gap list fast, generate slides on demand. |
| Generating full Slide objects in the gap list | Showing text previews only, generating full slides on click | Previews are lighter: the gap list only needs topic + suggested bullets for the teacher to decide. Full generation (with speakerNotes, imagePrompt, layout) happens on "Add Slide" click. |

**Installation:** No new dependencies needed. Everything is already in the project.

## Architecture Patterns

### Recommended Project Structure

```
services/
  providers/
    geminiProvider.ts    # Add analyzeGaps + generateSlideFromGap methods
    claudeProvider.ts    # Add analyzeGaps + generateSlideFromGap methods
  aiProvider.ts          # Add methods to AIProviderInterface + GapAnalysis types
  prompts/
    gapAnalysisPrompts.ts   # NEW: system prompt, schemas, tool definitions

components/
  GapAnalysisPanel.tsx      # NEW: side panel showing gap list with severity badges

App.tsx                     # Add "Check for Gaps" button, gap panel state, PDF upload handler
```

### Pattern 1: Gap Analysis Result Type

**What:** A structured return type for the AI gap analysis, containing the list of identified gaps with severity and suggested content.
**When to use:** Returned from the `analyzeGaps` AI method.

```typescript
// In services/aiProvider.ts

export type GapSeverity = 'critical' | 'recommended' | 'nice-to-have';

export interface IdentifiedGap {
  id: string;                    // Unique ID for tracking (e.g., "gap-1")
  topic: string;                 // What's missing (e.g., "Fractions on a number line")
  description: string;           // Why it matters / what the lesson plan says
  severity: GapSeverity;         // critical / recommended / nice-to-have
  suggestedTitle: string;        // Proposed slide title
  suggestedContent: string[];    // Proposed bullet points (3-5)
  suggestedPosition: number;     // 0-indexed: where in the deck this slide should go
  relatedLessonPlanExcerpt: string; // Brief quote from lesson plan for context
}

export interface GapAnalysisResult {
  gaps: IdentifiedGap[];
  summary: string;               // Overall coverage assessment
  coveragePercentage: number;    // Estimated % of lesson plan covered by deck (0-100)
}
```

### Pattern 2: AI Provider Method Signatures

**What:** Two new methods added to `AIProviderInterface` following existing patterns.
**When to use:** Both Gemini and Claude providers implement these.

```typescript
// Added to AIProviderInterface

// Phase 1: Analyze gaps between deck and lesson plan
analyzeGaps(
  slides: Slide[],
  lessonPlanText: string,
  lessonPlanImages: string[],   // Base64 page images for visual content
  gradeLevel: string
): Promise<GapAnalysisResult>;

// Phase 2: Generate a full slide from a gap (reuses generateContextualSlide pattern)
generateSlideFromGap(
  gap: IdentifiedGap,
  slides: Slide[],               // Current deck for context
  lessonTopic: string,
  verbosity: VerbosityLevel
): Promise<Slide>;
```

### Pattern 3: Deck Serializer for Gap Analysis

**What:** Reuse `buildDeckContextForCohesion` from `cohesionPrompts.ts` to serialize the deck. The same 20-slide cap with 200-char speaker notes truncation applies.
**When to use:** Building the AI prompt for gap analysis.

```typescript
// Reuse from services/prompts/cohesionPrompts.ts
import { buildDeckContextForCohesion } from './cohesionPrompts';

// The lesson plan text comes directly from PDF extraction
// Page images are base64 strings from pdf.js rendering
```

### Pattern 4: PDF Upload in Editor (Hidden File Input)

**What:** A hidden `<input type="file" accept=".pdf">` triggered by a button click, identical to the pattern in the INPUT screen.
**When to use:** The "Check for Gaps" button opens a file picker for the lesson plan PDF.

```typescript
// In App.tsx
const gapFileInputRef = useRef<HTMLInputElement>(null);

// Hidden input
<input
  type="file"
  ref={gapFileInputRef}
  onChange={handleGapPdfUpload}
  className="hidden"
  accept=".pdf"
/>

// Button triggers it
<button onClick={() => gapFileInputRef.current?.click()}>
  Check for Gaps
</button>
```

### Pattern 5: Side Panel with Gap List

**What:** A panel component (not a modal) that slides in from the right side, showing the gap list while the teacher can still see their deck.
**When to use:** After AI gap analysis completes.

The panel should:
1. Show a summary banner (e.g., "Your deck covers ~70% of the lesson plan. 5 gaps identified.")
2. List gaps sorted by severity (critical first, then recommended, then nice-to-have)
3. Each gap shows: severity badge (red/yellow/gray), topic title, description, suggested content preview
4. Each gap has an "Add Slide" button that generates and inserts the slide
5. Filled gaps (after adding slides) disappear or get a checkmark
6. A "Re-analyze" button to re-run the comparison after adding slides
7. A "Close" button to dismiss the panel

### Pattern 6: Slide Generation from Gap (Temp Slide Pattern)

**What:** Follows the exact same pattern as `handleInsertElaborateSlide` -- insert a temp placeholder, call AI, replace with result.
**When to use:** When teacher clicks "Add Slide" on a gap.

```typescript
const handleAddSlideFromGap = async (gap: IdentifiedGap) => {
  if (!provider) return;

  const tempId = `gap-slide-${Date.now()}`;
  const tempSlide: Slide = {
    id: tempId,
    title: `Generating: ${gap.suggestedTitle}`,
    content: ["Generating content from gap analysis..."],
    speakerNotes: "",
    imagePrompt: "",
    isGeneratingImage: true,
    layout: 'split'
  };

  // Insert at suggested position
  const insertIndex = Math.min(gap.suggestedPosition, slides.length);
  const newSlides = [...slides];
  newSlides.splice(insertIndex, 0, tempSlide);
  setSlides(newSlides);
  setActiveSlideIndex(insertIndex);

  try {
    const generated = await provider.generateSlideFromGap(gap, slides, lessonTitle, deckVerbosity);
    setSlides(curr => curr.map(s => s.id === tempId
      ? { ...generated, id: tempId, isGeneratingImage: autoGenerateImages }
      : s
    ));

    // Mark gap as filled in local state
    setGapResult(prev => prev ? {
      ...prev,
      gaps: prev.gaps.filter(g => g.id !== gap.id)
    } : null);

    if (autoGenerateImages) {
      const img = await provider.generateSlideImage(generated.imagePrompt, generated.layout);
      setSlides(curr => curr.map(s => s.id === tempId ? { ...s, imageUrl: img, isGeneratingImage: false } : s));
    }
  } catch (err) {
    // Fallback: leave temp slide as blank
    setSlides(curr => curr.map(s => s.id === tempId
      ? { ...tempSlide, title: gap.suggestedTitle, isGeneratingImage: false }
      : s
    ));
    if (err instanceof AIProviderError) {
      setErrorModal({ title: 'Gap Slide Generation Failed', message: err.userMessage });
    }
  }
};
```

### Pattern 7: Button Placement in Top Bar

**What:** The "Check for Gaps" button goes in the top bar alongside the "Make Cohesive" button.
**When to use:** Only visible when deck has 1+ slides and an AI provider is configured.

```
TOP BAR layout:
[Edit Class List] | [graded count] | [slide selection controls] | [Export] | ... spacer ... | [Check for Gaps] [Make Cohesive]
```

The button should appear to the left of "Make Cohesive" in the right-aligned section. It should use a distinct color/icon to differentiate it from cohesion (e.g., a magnifying glass or checklist icon, with a complementary gradient).

### Anti-Patterns to Avoid

- **Using a modal for the gap list:** The teacher needs to see their deck while deciding which gaps to fill. A modal hides the deck and forces an all-or-nothing decision (like cohesion). Gaps are individual actions.
- **Generating full slides in the analysis phase:** The analysis should be lightweight -- return topics and suggested bullets only. Full slide generation (with speakerNotes, imagePrompt, etc.) happens on demand when the teacher clicks "Add Slide."
- **Not passing page images to the AI:** Lesson plan PDFs often contain diagrams, tables, and visual content that pdf.js text extraction misses. Sending both text AND page images gives the AI full context.
- **Hardcoding slide insertion position:** The AI should suggest where each gap slide belongs (based on lesson flow), but the teacher should be able to override this in future iterations.
- **Re-running full analysis after each slide addition:** Instead, remove the filled gap from the local `gaps` array. Provide a manual "Re-analyze" button if the teacher wants a fresh comparison.
- **Sending the lesson plan PDF to the AI as-is:** PDF binary data cannot be sent to the API. Use the existing pdf.js pipeline to extract text + page images first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | pdf.js (already loaded via CDN) | pdf.js handles font encoding, page layout, rotated text -- all edge cases |
| PDF page rendering | Server-side rendering | pdf.js canvas rendering (existing pattern) | Already works in the browser, used in both App.tsx and pdfProcessor.ts |
| Retry with backoff | Custom retry loop | `withRetry()` from `aiProvider.ts` | Already handles retryable error codes |
| Error classification | Custom HTTP status parsing | `AIProviderError` + error code mapping | Already maps all status codes to user-friendly messages |
| JSON extraction (Claude) | Custom regex parsing | `extractJSON<T>()` in claudeProvider | Already handles markdown code block wrapping |
| Structured output (Gemini) | Free-text JSON parsing | `responseSchema` with `Type` enums | Gemini enforces schema at generation time |
| Deck serialization | Custom slide formatter | `buildDeckContextForCohesion` from cohesionPrompts.ts | Already handles slide cap, notes truncation, source labeling |

**Key insight:** The analysis AI call is structurally identical to `makeDeckCohesive` (deck context + extra context -> structured result). The slide generation is structurally identical to `generateElaborateSlide` (context -> single slide). Almost zero new infrastructure is needed.

## Common Pitfalls

### Pitfall 1: Token Limits with Deck + Lesson Plan Combined

**What goes wrong:** Sending the full deck serialization (up to 20 slides) PLUS the full lesson plan text (potentially thousands of words) PLUS page images exceeds input token limits.
**Why it happens:** Lesson plan PDFs can be 5-20 pages of dense text. Combined with the deck context, this can be enormous.
**How to avoid:** Cap lesson plan text at a reasonable limit (e.g., first 5 pages, ~5000 chars). Use the existing deck serializer with its 20-slide/200-char-notes cap. Send page images only for the first 3-5 pages. If the lesson plan is very long, truncate with a note to the AI.
**Warning signs:** API 400 errors, truncated responses, or the AI only finding gaps from the first few pages.

### Pitfall 2: PDF Text Extraction Yields Empty or Garbage Text

**What goes wrong:** Some PDFs (especially scanned documents or image-based PDFs) yield no text from pdf.js text extraction.
**Why it happens:** pdf.js `getTextContent()` only extracts actual text objects, not OCR from images.
**How to avoid:** Always send both text AND page images to the AI. The AI can "read" the page images even when text extraction fails. If text is empty, rely entirely on page images. Show a toast if text extraction yields very little ("PDF appears to be image-based -- using visual analysis").
**Warning signs:** `lessonPlanText` is empty or very short despite a multi-page PDF.

### Pitfall 3: Gap Positions Become Invalid After Adding Slides

**What goes wrong:** The AI suggests `suggestedPosition: 5` for a gap, but after the teacher adds a slide from another gap, position 5 now refers to a different slide.
**Why it happens:** Inserting slides shifts all subsequent indices.
**How to avoid:** When inserting a slide from a gap, update the `suggestedPosition` of all remaining gaps that have a position >= the insertion point (increment by 1). Alternatively, treat `suggestedPosition` as approximate and insert after the closest matching slide title.
**Warning signs:** Slides being inserted in wrong positions after the first gap is filled.

### Pitfall 4: Over-Fragmented Gap List

**What goes wrong:** The AI returns 15+ gaps for a 10-slide deck, including extremely granular items like "mention the word 'denominator'" as separate gaps.
**Why it happens:** Without explicit guidance, the AI finds every minor detail in the lesson plan that isn't verbatim in the deck.
**How to avoid:** In the prompt, instruct the AI to focus on topic-level gaps (concepts, skills, activities) not word-level gaps. Limit the response to a maximum of 10 gaps. The severity ranking helps: "critical" = major missing concept, "recommended" = supporting topic, "nice-to-have" = minor detail.
**Warning signs:** Gap list is overwhelming and most items are trivial.

### Pitfall 5: Suggested Position for Very Different Deck Structures

**What goes wrong:** The lesson plan follows a different pedagogical sequence than the deck, so suggested positions don't make sense.
**Why it happens:** The deck may have been built from a different source (e.g., pasted slides from a colleague) and follows a different flow than the uploaded lesson plan.
**How to avoid:** Make `suggestedPosition` a best-guess, not a hard constraint. In the prompt, instruct the AI: "suggest where this slide would fit best in the EXISTING deck flow, not where it appears in the lesson plan." The teacher can always drag-reorder after insertion.
**Warning signs:** AI always suggests position 0 or position N (beginning/end) because it can't find a natural fit.

### Pitfall 6: Teleprompter Segment Count on Generated Gap Slides

**What goes wrong:** Generated gap slides have incorrect speaker notes segment count (must be `content.length + 1` segments delimited by the pointer emoji).
**Why it happens:** The `generateSlideFromGap` prompt may not include the teleprompter rules.
**How to avoid:** Include the standard teleprompter format rules in the gap slide generation prompt. Validate segment count post-generation (same approach as cohesion). Reuse existing prompt fragments from `cohesionPrompts.ts` or `slideAnalysisPrompts.ts`.
**Warning signs:** Presenting gap-generated slides causes misaligned bullet reveals.

### Pitfall 7: Panel State Not Reset on Deck Change

**What goes wrong:** The gap panel shows stale results after the teacher makes significant deck changes (adding/removing/reordering slides) outside of the gap flow.
**Why it happens:** The gap result state is not cleared when slides change.
**How to avoid:** Clear `gapResult` state whenever `slides` array length changes or when the teacher navigates away from the editor. Alternatively, show a "Results may be outdated -- Re-analyze?" banner if slides have changed since the last analysis.
**Warning signs:** Gap list references slides that no longer exist or are in different positions.

## Code Examples

### Example 1: Gap Analysis System Prompt

```typescript
// services/prompts/gapAnalysisPrompts.ts

export const GAP_ANALYSIS_SYSTEM_PROMPT = `
You are an expert educational content analyst for Cue, a presentation app for primary school teachers (Year 6, ages 10-11, Australian curriculum).

YOUR TASK:
Compare an existing slide deck against a lesson plan to identify missing topics, concepts, and activities.

ANALYSIS RULES:
1. Focus on TOPIC-LEVEL gaps, not word-level differences
2. A "gap" is a concept, skill, activity, or objective in the lesson plan that has NO corresponding slide
3. If a deck slide partially covers a lesson plan topic, it is NOT a gap (note partial coverage in the summary instead)
4. Maximum 10 gaps -- prioritize by educational importance

SEVERITY CLASSIFICATION:
- "critical": Core learning objective or key concept that the lesson plan explicitly requires. Missing this would leave a major hole in the lesson.
- "recommended": Supporting concept, example, or activity that strengthens the lesson. The lesson still works without it but would be weaker.
- "nice-to-have": Enrichment activity, extension task, or supplementary detail. Useful but not essential.

SUGGESTED POSITION:
- For each gap, suggest where in the EXISTING deck it would fit best (0-indexed)
- Place it after the most related existing slide
- If no good fit, suggest the end of the deck (index = total slides)

SUGGESTED CONTENT:
- Provide a title and 3-5 bullet points for each gap
- Content should match the deck's existing tone and complexity level
- Do NOT generate speaker notes or image prompts in this phase (those come later during full slide generation)
`.trim();
```

### Example 2: Gemini Response Schema for Gap Analysis

```typescript
// services/prompts/gapAnalysisPrompts.ts

import { Type } from '@google/genai';

export const GAP_ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'Overall coverage assessment (1-2 sentences)'
    },
    coveragePercentage: {
      type: Type.NUMBER,
      description: 'Estimated percentage of lesson plan covered by the deck (0-100)'
    },
    gaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique gap identifier (e.g., "gap-1")'
          },
          topic: {
            type: Type.STRING,
            description: 'Missing topic name (concise, 3-8 words)'
          },
          description: {
            type: Type.STRING,
            description: 'Why this is missing and why it matters (1-2 sentences)'
          },
          severity: {
            type: Type.STRING,
            enum: ['critical', 'recommended', 'nice-to-have'],
            description: 'Gap severity level'
          },
          suggestedTitle: {
            type: Type.STRING,
            description: 'Proposed slide title (max 10 words)'
          },
          suggestedContent: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Proposed bullet points for the slide (3-5 items)'
          },
          suggestedPosition: {
            type: Type.NUMBER,
            description: '0-indexed position in deck where this slide should be inserted'
          },
          relatedLessonPlanExcerpt: {
            type: Type.STRING,
            description: 'Brief quote or reference from the lesson plan (for teacher context)'
          }
        },
        required: ['id', 'topic', 'description', 'severity', 'suggestedTitle', 'suggestedContent', 'suggestedPosition', 'relatedLessonPlanExcerpt']
      }
    }
  },
  required: ['summary', 'coveragePercentage', 'gaps']
};
```

### Example 3: Claude Tool Schema for Gap Analysis

```typescript
export const GAP_ANALYSIS_TOOL = {
  name: 'analyze_gaps',
  description: 'Compare a slide deck against a lesson plan and identify missing topics',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: { type: 'string', description: 'Overall coverage assessment' },
      coveragePercentage: { type: 'number', description: 'Estimated coverage percentage (0-100)' },
      gaps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            topic: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'recommended', 'nice-to-have'] },
            suggestedTitle: { type: 'string' },
            suggestedContent: { type: 'array', items: { type: 'string' } },
            suggestedPosition: { type: 'number' },
            relatedLessonPlanExcerpt: { type: 'string' }
          },
          required: ['id', 'topic', 'description', 'severity', 'suggestedTitle', 'suggestedContent', 'suggestedPosition', 'relatedLessonPlanExcerpt']
        }
      }
    },
    required: ['summary', 'coveragePercentage', 'gaps']
  }
};
```

### Example 4: User Prompt Builder for Gap Analysis

```typescript
export function buildGapAnalysisUserPrompt(gradeLevel: string): string {
  return `Compare the following slide deck against the provided lesson plan. Identify topics, concepts, or activities from the lesson plan that are NOT covered by any existing slide.

TARGET AUDIENCE: ${gradeLevel} students

INSTRUCTIONS:
1. Read the lesson plan carefully -- identify all key concepts, learning objectives, and activities
2. Read each slide in the deck -- note what topics are already covered
3. Identify gaps: lesson plan topics with NO corresponding slide coverage
4. Rank each gap by severity (critical / recommended / nice-to-have)
5. Suggest where each gap slide would fit best in the existing deck order
6. Suggest a title and 3-5 bullet points for each missing slide

Return a JSON object with summary, coveragePercentage, and an array of gaps.`;
}
```

### Example 5: Lesson Plan + Deck Context for AI

```typescript
// Build the combined context for the AI call
function buildGapAnalysisContext(
  slides: Slide[],
  lessonPlanText: string
): string {
  const deckContext = buildDeckContextForCohesion(slides);

  return `=== EXISTING SLIDE DECK ===

${deckContext}

=== LESSON PLAN ===

${lessonPlanText.slice(0, 8000)}${lessonPlanText.length > 8000 ? '\n\n[Lesson plan truncated -- showing first 8000 characters]' : ''}`;
}
```

### Example 6: Severity Badge Styling

```typescript
// In GapAnalysisPanel.tsx
const severityConfig: Record<GapSeverity, { label: string; bg: string; text: string }> = {
  'critical': {
    label: 'Critical',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400'
  },
  'recommended': {
    label: 'Recommended',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400'
  },
  'nice-to-have': {
    label: 'Nice to Have',
    bg: 'bg-slate-100 dark:bg-slate-700',
    text: 'text-slate-500 dark:text-slate-400'
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Free-text JSON from Gemini | `responseSchema` with Type enums | @google/genai 1.x | No parse errors, guaranteed structure |
| Single provider | Dual provider (Gemini + Claude) | v3.x | Must implement in both providers |
| No source tracking | `SlideSource` type on each slide | Phase 55 | Can mark generated gap slides with source |
| Modal for all AI results | Mixed: modals for batch (cohesion), panels for interactive (gaps) | Phase 59 | Better UX for one-at-a-time workflows |

**Deprecated/outdated:**
- The old `responseMimeType: "application/json"` without `responseSchema` is still used in some legacy methods. Gap analysis should use the full schema approach (like cohesion).

## Open Questions

1. **Should gap analysis send page images or just text?**
   - What we know: The existing `processPdf` in App.tsx extracts both text and page images (base64 JPEG). Gemini accepts multimodal input (text + images). Claude also accepts images.
   - What's unclear: Whether sending 3-5 page images significantly improves gap detection vs. text-only. Images add token cost.
   - Recommendation: Send both text and page images (first 5 pages max). Many lesson plans have tables, diagrams, and formatting that text extraction misses. The AI can identify topics from visual content that text extraction garbles. Mark the image-sending as a performance optimization to revisit if token costs are too high.

2. **Should the gap panel be a side panel or a bottom panel?**
   - What we know: The editor already has a left sidebar (slide thumbnails) and a main stage area. CohesionPreview used a centered modal.
   - What's unclear: Whether a right-side panel would feel cramped on smaller screens.
   - Recommendation: Use a right-side panel (similar width to the thumbnail sidebar, ~300-320px) that overlays the main stage area. This keeps the slide thumbnails visible while showing gaps. On narrow screens, it could go full-width as a modal fallback. The panel pattern is more natural for an "action list" UX.

3. **Should `generateSlideFromGap` be a new method or reuse `generateContextualSlide`?**
   - What we know: `generateContextualSlide` takes `lessonTopic`, `userInstruction`, `prevSlide`, `nextSlide`. The gap has `suggestedTitle`, `suggestedContent`, `description`.
   - What's unclear: Whether the gap-specific context (description, lesson plan excerpt, severity) needs a dedicated prompt.
   - Recommendation: Create a new `generateSlideFromGap` method. The prompt needs gap-specific context (the lesson plan excerpt, the suggested content, the surrounding deck context) that doesn't fit cleanly into `generateContextualSlide`'s generic interface. This also allows the prompt to include teleprompter rules and verbosity settings specific to the deck.

4. **How should "Re-analyze" work after adding slides?**
   - What we know: The success criteria says "Gap list updates after adding slides (filled gaps disappear)."
   - What's unclear: Whether local removal of filled gaps is sufficient or if a full re-analysis is needed.
   - Recommendation: Local removal (filter out the gap from the array) is the primary behavior. Provide a "Re-analyze" button that re-runs the full AI comparison. This is an explicit teacher action, not automatic (to avoid unexpected AI calls and cost).

5. **Should the panel persist across sessions (saved in .cue file)?**
   - What we know: The gap analysis result is transient -- it depends on the lesson plan PDF which is uploaded ad-hoc.
   - What's unclear: Whether teachers expect to save/reopen gap analysis results.
   - Recommendation: Do NOT persist gap analysis results in the .cue file. The analysis is a one-time comparison tool. If the teacher closes the panel, they can re-upload and re-analyze. This keeps the .cue file format unchanged.

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection: `types.ts` (Slide interface, SlideSource, UploadedResource, LessonPlan)
- Codebase direct inspection: `services/aiProvider.ts` (AIProviderInterface, CohesionResult, all method signatures)
- Codebase direct inspection: `services/providers/claudeProvider.ts` (callClaude, extractJSON, tool_choice pattern, generateContextualSlide, generateElaborateSlide, makeDeckCohesive)
- Codebase direct inspection: `services/providers/geminiProvider.ts` (responseSchema pattern, makeDeckCohesive, generateElaborateSlide)
- Codebase direct inspection: `services/prompts/cohesionPrompts.ts` (buildDeckContextForCohesion, COHESION_RESPONSE_SCHEMA, COHESION_TOOL, deck serializer)
- Codebase direct inspection: `services/slideAnalysis/slideAnalysisPrompts.ts` (dual-schema pattern: Gemini Type + Claude tool)
- Codebase direct inspection: `services/documentProcessors/pdfProcessor.ts` (processPdf, PdfProcessResult)
- Codebase direct inspection: `services/uploadService.ts` (file validation, processing orchestration)
- Codebase direct inspection: `components/CohesionPreview.tsx` (modal UI pattern, diff viewer usage, apply/cancel pattern)
- Codebase direct inspection: `App.tsx` (processPdf inline, handleFileChange, handleInsertElaborateSlide, handleMakeCohesive, top bar layout, toast system, provider usage)
- Codebase direct inspection: `package.json` (all dependencies confirmed)
- `.planning/phases/58-deck-cohesion/58-RESEARCH.md` (cohesion research for architectural patterns)
- `.planning/ROADMAP.md` (Phase 59 requirements GAP-01 through GAP-06, success criteria)
- `.planning/STATE.md` (project state, accumulated decisions)

### Secondary (MEDIUM confidence)
- None. All findings based on direct codebase inspection.

### Tertiary (LOW confidence)
- None. All findings based on direct codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in the project; no new dependencies
- Architecture: HIGH - Follows exact patterns already established (dual-provider, structured output, deck serializer, temp-slide insertion)
- Pitfalls: HIGH - Based on direct analysis of PDF processing, token limits, position tracking, and teleprompter rules
- Code examples: HIGH - Modeled directly on existing patterns (cohesionPrompts.ts, claudeProvider.ts, geminiProvider.ts, App.tsx handlers)

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable -- all patterns are internal to this codebase)
