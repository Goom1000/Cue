# Phase 71: AI Image Prompts + Layout Assignment - Research

**Researched:** 2026-02-21
**Domain:** Batch AI enrichment of scripted slides with image prompts and layout assignments, graceful fallback on failure
**Confidence:** HIGH

## Summary

Phase 71 adds a single AI batch call within the scripted import pipeline to enrich slides with `imagePrompt` and `layout` values. Currently, the scripted mapper (`scriptedMapper.ts`) produces slides with `imagePrompt: ''` and `layout: 'split'` (or `'work-together'` for activity slides). After this phase, each slide will have a descriptive image prompt for the downstream image generator (`generateSlideImage`) and an appropriate layout assignment chosen from a curated subset (`split`, `full-image`, `center-text`).

The entire codebase architecture already supports this cleanly. The scripted mode early-return in `generationPipeline.ts` (lines 111-130) is the insertion point: after `mapBlocksToSlides()` produces slides, a new enrichment step calls the user's configured AI provider, receives batch results, and merges them onto the slides before returning. Both providers (Gemini and Claude) have well-established patterns for structured JSON batch calls -- Gemini uses `responseSchema` with `responseMimeType: 'application/json'`, Claude uses `tool_use` with `input_schema` or `output_format` with `json_schema`. The ~700 token budget means this is a trivially small call with sub-second latency.

The critical design constraint is graceful fallback (PIPE-04): if the AI call fails for any reason, the pipeline must still return valid slides. The CONTEXT.md specifies richer fallback prompts than the existing gap analysis pattern: `"Educational illustration: {title} -- {first bullet}"` leverages the parsed content that scripted slides already have. Fallback layout stays as `split` (the mapper default). This means the enrichment step wraps in a try/catch with no rethrow -- failure just applies fallback values.

**Primary recommendation:** Add a new `enrichScriptedSlides` function in `generationPipeline.ts` (or a co-located module) that takes the mapped slides, calls the provider's new `enrichScriptedSlides` method, and merges results. The provider method is a single API call with a compact prompt listing slide titles, first bullets, `hasQuestionFlag`, and `lessonPhase` as context. Each provider implements this as a new method on `AIProviderInterface`. Fallback logic lives in the pipeline, not the providers.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- AI only assigns layouts to slides that have the default `split` from the scripted mapper
- Mapper-assigned layouts (`work-together`, `class-challenge`) are locked and not overridden by AI
- AI chooses from a curated subset of 3 visual layouts: `split`, `full-image`, `center-text`
  - `flowchart`, `grid`, `tile-overlap` excluded -- these need content structured specifically for them, which scripted slides don't have
- AI receives `hasQuestionFlag` as a hint (question slides may suit `center-text`)
- AI receives `lessonPhase` (Starter/Main/Plenary) as context for layout decisions
- Both hints are lightweight signals, not hard constraints -- AI can override
- Fallback image prompts use a richer pattern than the existing gap analysis fallback: `"Educational illustration: {title} -- {first bullet}"` (leverages the parsed content scripted slides already have)
- Fallback layout stays as `split` (mapper default) -- no heuristic logic, just the reliable universal layout
- Synchronous execution -- batch call blocks import until complete (latency is minimal at ~700 tokens)
- Uses the user's configured AI provider (Claude/Gemini) -- consistent with all other AI calls in the app

### Claude's Discretion
- Image prompt detail level and style (match existing pipeline vs richer prompts leveraging scripted context)
- Whether prompts should be age/audience-aware based on year group context
- Whether slides can share image prompts across a topic sequence or each gets a unique one
- Whether to generate image prompts for work-together/class-challenge slides (layout is locked, but they still need images)
- Whether to include theme (color) assignment in the batch call alongside imagePrompt + layout
- Whether to allow minor title cleanup or keep the call strictly metadata-only
- Notification strategy when fallback kicks in (silent vs subtle toast)
- Partial success strategy (use valid enrichments + fallback for bad ones, or all-or-nothing)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-03 | Scripted mode calls AI only for batch image prompt generation and layout assignment (~700 tokens) | The scripted early-return in `generationPipeline.ts:111-130` is the insertion point. After `mapBlocksToSlides()` produces slides, a new enrichment call generates `imagePrompt` and `layout` for each slide in a single batch API call. Both providers support structured JSON output (Gemini: `responseSchema`, Claude: `tool_use`/`output_format`). The prompt sends compact slide metadata (title, first bullet, hasQuestionFlag, lessonPhase) and receives an array of `{imagePrompt, layout}` objects. Total token budget is ~700 (input + output) given 10-15 slides with minimal context per slide. |
| PIPE-04 | AI image prompt failure does not block slide import (fallback: synthesized prompts from slide titles) | The enrichment step wraps in try/catch with no rethrow. On failure, each slide receives a synthesized fallback: `imagePrompt: "Educational illustration: {title} -- {first bullet}"` and `layout: 'split'` (mapper default, unchanged). This matches the CONTEXT.md decision for richer fallback prompts. The existing gap analysis fallback pattern (`"Educational illustration: ${gap.topic}"` at `geminiProvider.ts:665` and `claudeProvider.ts:2112`) validates this approach. A warning is pushed to `PipelineResult.warnings[]` for toast display. |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.2 | Type-safe enrichment result interface, provider method signatures | Already in project; all AI calls are typed |
| @google/genai | (existing) | Gemini structured JSON output via `responseSchema` | Already in project; used by all Gemini provider methods |
| Claude Messages API | v2023-06-01 | Claude structured output via `tool_use` or `output_format` | Already in project; used by all Claude provider methods |

### Supporting

No new dependencies. This phase adds a single new method to each provider class and a new enrichment step in the pipeline. All infrastructure exists.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single batch call | Per-slide calls | Batch is more efficient (~700 tokens total vs ~100 tokens x N slides with per-call overhead). Single call also reduces rate limit risk. |
| Provider method on AIProviderInterface | Standalone function with raw API calls | Provider method follows established pattern and gets provider-specific error handling, model selection, and CORS headers for free |
| Structured JSON output | Free-text JSON parsing | Structured output (Gemini `responseSchema`, Claude `tool_use`) guarantees valid JSON shape and eliminates parse errors. Already used for gap analysis, condensation, transformation |

## Architecture Patterns

### Recommended Project Structure

No new files needed beyond potentially a prompt module. The enrichment logic fits within existing files:

```
services/
├── generationPipeline.ts        # Add enrichment step in scripted early-return
├── aiProvider.ts                 # Add enrichScriptedSlides to AIProviderInterface
├── providers/
│   ├── geminiProvider.ts         # Implement enrichScriptedSlides with responseSchema
│   └── claudeProvider.ts         # Implement enrichScriptedSlides with tool_use
└── prompts/
    └── scriptedEnrichmentPrompts.ts  # (optional) Prompt + schema constants
```

### Pattern 1: Enrichment in Pipeline Early-Return

**What:** After `mapBlocksToSlides()` produces slides, call the provider to enrich them, then return the enriched slides. If enrichment fails, apply fallback values.

**When to use:** When post-processing mapped slides with a single AI call before returning from the pipeline.

**Example:**

```typescript
// In generationPipeline.ts, inside the scripted mode block
if (input.mode === 'scripted') {
  onProgress?.({
    stage: 'generating',
    stageIndex: 0,
    totalStages: 1,
  });

  const parseResult = parseScriptedLessonPlan(lessonPlanText);
  const allBlocks = parseResult.days.flatMap(day => day.blocks);
  const slides = mapBlocksToSlides(allBlocks);

  // Enrich slides with AI-generated image prompts and layouts
  const enrichedSlides = await enrichScriptedSlides(provider, slides, gradeLevel);

  return {
    slides: enrichedSlides.slides,
    coveragePercentage: null,
    remainingGaps: [],
    warnings: [...parseResult.warnings, ...enrichedSlides.warnings],
    wasPartial: false,
  };
}
```

### Pattern 2: Provider Method with Structured Output

**What:** A new `enrichScriptedSlides` method on `AIProviderInterface` that accepts slide metadata and returns enrichment results as structured JSON.

**When to use:** For the batch AI call that generates image prompts and layout assignments.

**Gemini example:**

```typescript
// In geminiProvider.ts
async enrichScriptedSlides(
  slides: SlideEnrichmentInput[],
  gradeLevel: string
): Promise<SlideEnrichmentResult[]> {
  const ai = new GoogleGenAI({ apiKey: this.apiKey });
  const prompt = buildEnrichmentPrompt(slides, gradeLevel);

  const response = await ai.models.generateContent({
    model: this.model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: ENRICHMENT_RESPONSE_SCHEMA,
      temperature: 0.7,
    },
  });

  const text = response.text || '[]';
  return JSON.parse(text);
}
```

**Claude example:**

```typescript
// In claudeProvider.ts
async enrichScriptedSlides(
  slides: SlideEnrichmentInput[],
  gradeLevel: string
): Promise<SlideEnrichmentResult[]> {
  const prompt = buildEnrichmentPrompt(slides, gradeLevel);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: this.model,
      max_tokens: 2048,
      system: ENRICHMENT_SYSTEM_PROMPT,
      tools: [ENRICHMENT_TOOL],
      tool_choice: { type: 'tool', name: 'enrich_slides' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
  return toolUse?.input?.slides || [];
}
```

### Pattern 3: Fallback with Synthesized Prompts

**What:** When the AI enrichment call fails, generate fallback values from existing slide data rather than failing the import.

**When to use:** For PIPE-04 graceful degradation.

**Example:**

```typescript
function synthesizeFallbackEnrichment(slides: Slide[]): Slide[] {
  return slides.map(slide => ({
    ...slide,
    imagePrompt: slide.imagePrompt ||
      `Educational illustration: ${slide.title}${slide.content[0] ? ' \u2014 ' + slide.content[0] : ''}`,
    // layout stays as mapper default (split or work-together)
  }));
}
```

### Anti-Patterns to Avoid

- **Per-slide AI calls:** Making individual API calls per slide wastes tokens on repeated system prompts and increases latency and rate limit risk. Use a single batch call.
- **Modifying slide content/title/speakerNotes in the enrichment call:** The CONTEXT.md explicitly states this phase only adds metadata fields (imagePrompt, layout). Prompt must not instruct the AI to modify existing content.
- **Overriding mapper-assigned layouts:** `work-together` and `class-challenge` layouts are authoritative from the mapper. The AI should only assign layouts to slides that have the default `split`.
- **Throwing on enrichment failure:** The pipeline must return valid slides regardless of AI enrichment success. Never rethrow from the enrichment step.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured JSON from AI | Manual JSON parsing with regex | Gemini `responseSchema` / Claude `tool_use` | Eliminates parse errors, guarantees valid schema |
| Provider-specific API calls | Raw fetch in pipeline | Provider method on `AIProviderInterface` | Gets error wrapping, model selection, CORS headers, retry logic for free |
| Layout heuristics as fallback | Rule-based layout assignment (if question then center-text, etc.) | Keep `split` as universal fallback | Per CONTEXT.md: no heuristic logic, just the reliable universal layout |

**Key insight:** The enrichment call is tiny (~700 tokens), so the main engineering challenge is not optimization but graceful degradation. The fallback path matters more than the happy path.

## Common Pitfalls

### Pitfall 1: Array Length Mismatch

**What goes wrong:** AI returns fewer or more enrichment results than slides sent.
**Why it happens:** AI may merge similar slides or skip some. Structured schema with `minItems`/`maxItems` helps but isn't foolproof.
**How to avoid:** Validate result array length matches input. If mismatched, fall back to synthesized prompts for all slides. Include slide count in the prompt ("You will receive exactly N slides. Return exactly N results.").
**Warning signs:** `result.length !== slides.length` after parsing.

### Pitfall 2: Overwriting Locked Layouts

**What goes wrong:** AI returns `layout: 'center-text'` for a `work-together` slide, overriding the mapper's authoritative layout.
**Why it happens:** AI doesn't know which layouts are locked.
**How to avoid:** Two strategies (both recommended): (1) In the prompt, tell the AI which slides have locked layouts and to return `null`/`split` for those. (2) In the merge logic, skip layout assignment for slides where the mapper already set a non-`split` layout. Defense in depth.
**Warning signs:** Work-together slides rendering with wrong layout after enrichment.

### Pitfall 3: Enrichment Blocking Pipeline on Slow/Failed AI

**What goes wrong:** AI call takes 10+ seconds or hangs, making the "instant" scripted import feel slow.
**Why it happens:** Rate limits, network issues, or provider outages.
**How to avoid:** Set a reasonable timeout (e.g., 10 seconds). Use `withRetry` with limited retries (1 retry, not 3). On timeout, apply fallback immediately. The user decision says synchronous is fine for ~700 tokens, but timeout protection is still prudent.
**Warning signs:** Scripted import taking noticeably longer than expected.

### Pitfall 4: Including Too Much Context in the Batch Prompt

**What goes wrong:** Token budget exceeds ~700 tokens, causing unnecessary cost and latency.
**Why it happens:** Sending full slide content, speaker notes, or too many bullets.
**How to avoid:** Send only: slide index, title, first content bullet (truncated to ~50 chars), `hasQuestionFlag`, `lessonPhase`. Skip `speakerNotes` entirely. Skip activity/work-together slides if they don't need image prompts (per discretion).
**Warning signs:** AI response taking longer than expected, or token usage exceeding estimates.

### Pitfall 5: callClaude Standalone Function Bug

**What goes wrong:** The `callClaude` function at `claudeProvider.ts:610` references `this.model` but is defined as a standalone function outside the class.
**Why it happens:** The function was likely extracted from the class but still references `this`.
**How to avoid:** For the enrichment method, use `fetch` directly within the class method (like `generateSlideFromGap` does at line 2060) rather than calling `callClaude`. This is the established pattern for Claude provider methods that need tool_use or structured output.
**Warning signs:** TypeScript error or runtime `undefined` for model when calling callClaude.

## Code Examples

### Enrichment Input/Output Types

```typescript
// Compact input for the batch prompt (minimal token usage)
interface SlideEnrichmentInput {
  index: number;
  title: string;
  firstBullet: string;       // First content bullet, truncated
  hasQuestion: boolean;
  lessonPhase?: string;       // 'hook' | 'i-do' | 'we-do' | 'you-do' | 'plenary'
  layoutLocked: boolean;      // true for work-together/class-challenge
}

// AI returns one of these per slide
interface SlideEnrichmentResult {
  index: number;
  imagePrompt: string;
  layout: 'split' | 'full-image' | 'center-text';
}
```

### Batch Prompt Structure (Compact)

```typescript
function buildEnrichmentPrompt(
  inputs: SlideEnrichmentInput[],
  gradeLevel: string
): string {
  const slideList = inputs.map(s => {
    const hints: string[] = [];
    if (s.hasQuestion) hints.push('QUESTION');
    if (s.lessonPhase) hints.push(s.lessonPhase);
    if (s.layoutLocked) hints.push('LAYOUT_LOCKED');
    const hintStr = hints.length > 0 ? ` [${hints.join(', ')}]` : '';
    return `${s.index}. "${s.title}" -- ${s.firstBullet}${hintStr}`;
  }).join('\n');

  return `Audience: ${gradeLevel}

For each slide below, generate:
1. imagePrompt: A concise description for an educational illustration (1-2 sentences)
2. layout: One of 'split', 'full-image', 'center-text'

Rules:
- Image prompts should be specific to the slide topic, suitable for educational digital art
- For LAYOUT_LOCKED slides, still generate an imagePrompt but set layout to 'split'
- QUESTION slides may suit 'center-text' (large text focus), but this is a suggestion not a rule
- Hook/plenary slides may suit 'full-image' for visual impact
- Return exactly ${inputs.length} results

SLIDES:
${slideList}`;
}
```

### Merge Logic with Layout Lock Protection

```typescript
function mergeEnrichmentResults(
  slides: Slide[],
  results: SlideEnrichmentResult[]
): Slide[] {
  // Build lookup for O(1) access
  const resultMap = new Map(results.map(r => [r.index, r]));

  return slides.map((slide, i) => {
    const enrichment = resultMap.get(i);
    if (!enrichment) return slide;

    // Layout lock: only override if mapper set default 'split'
    const layoutLocked = slide.layout !== 'split';
    const newLayout = layoutLocked ? slide.layout : enrichment.layout;

    return {
      ...slide,
      imagePrompt: enrichment.imagePrompt || slide.imagePrompt,
      layout: newLayout,
    };
  });
}
```

### Gemini Response Schema

```typescript
import { Type } from '@google/genai';

const ENRICHMENT_RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER },
      imagePrompt: { type: Type.STRING },
      layout: {
        type: Type.STRING,
        enum: ['split', 'full-image', 'center-text'],
      },
    },
    required: ['index', 'imagePrompt', 'layout'],
  },
};
```

### Claude Tool Schema

```typescript
const ENRICHMENT_TOOL = {
  name: 'enrich_slides',
  description: 'Assign image prompts and layouts to scripted slides',
  input_schema: {
    type: 'object' as const,
    properties: {
      slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer', description: 'Slide index' },
            imagePrompt: { type: 'string', description: 'Image generation prompt' },
            layout: {
              type: 'string',
              enum: ['split', 'full-image', 'center-text'],
              description: 'Visual layout type',
            },
          },
          required: ['index', 'imagePrompt', 'layout'],
        },
      },
    },
    required: ['slides'],
  },
};
```

## Discretion Recommendations

Based on codebase analysis, here are recommendations for the Claude's Discretion items:

### Image Prompt Detail Level
**Recommendation:** Match existing pipeline style. The AI-generated slides in `geminiService.ts` produce prompts like "Educational illustration of fractions with pizza slices" -- concise, topic-specific, 1-2 sentences. Scripted slides have richer context (parsed bullets, lesson phase) so prompts can be slightly more specific, but should stay concise for the image generator.

### Age/Audience Awareness
**Recommendation:** Yes, include `gradeLevel` in the prompt. The existing pipeline passes `gradeLevel: 'Year 6 (10-11 years old)'` to all AI calls. The enrichment prompt should include this so image prompts are age-appropriate (e.g., "cartoon-style" not "photorealistic diagram").

### Shared Image Prompts
**Recommendation:** Each slide gets a unique prompt. The image generator (`generateSlideImage`) is called per-slide after the pipeline returns (App.tsx:662), so each slide needs its own prompt. Sharing would require post-processing logic and yield minimal token savings.

### Image Prompts for Work-Together/Class-Challenge Slides
**Recommendation:** Yes, generate image prompts for all slides including layout-locked ones. The layout is locked but the image prompt field is empty and the image generator will still be called. The prompt should instruct the AI to provide imagePrompt but set layout to `split` for these slides (layout is ignored in the merge anyway).

### Theme Assignment
**Recommendation:** Include theme in the batch call. It adds ~10 tokens per slide to the output (one of 5 enum values) and the `theme` field exists on `Slide` but is currently `undefined` for scripted slides. Adding it in the same batch call is free in terms of latency. The theme choices (`default`, `purple`, `blue`, `green`, `warm`) are already in the schema at `geminiService.ts:419`.

### Title Cleanup
**Recommendation:** No. Keep the call strictly metadata-only per CONTEXT.md boundary ("This phase does NOT modify slide content, titles, or speaker notes -- only metadata fields"). Title cleanup can happen in a future phase.

### Notification on Fallback
**Recommendation:** Subtle toast warning. Push a message to `PipelineResult.warnings[]` like "Image prompts were auto-generated from slide titles (AI enrichment unavailable)". This follows the existing pattern where gap analysis failures produce warnings (generationPipeline.ts:224-226).

### Partial Success Strategy
**Recommendation:** Use valid enrichments + fallback for invalid ones. If the AI returns 7 valid results for 10 slides, apply the 7 and synthesize fallback for the 3 missing/invalid ones. This maximizes value from the AI call without requiring a retry. Validate each result individually: check `imagePrompt` is a non-empty string and `layout` is one of the 3 valid values.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Claude unstructured JSON | Claude tool_use structured output | 2024 | Guaranteed valid JSON shape for Claude provider |
| Gemini free-text JSON | Gemini `responseSchema` structured output | 2024 | Same guarantee for Gemini provider |
| Per-slide enrichment calls | Single batch call | N/A (new feature) | ~700 tokens vs N x ~100 tokens, single round-trip |

**Deprecated/outdated:**
- None relevant. Both provider APIs are current.

## Open Questions

1. **Should `enrichScriptedSlides` be on `AIProviderInterface` or a standalone utility?**
   - What we know: The established pattern puts every AI call behind the provider interface (25+ methods). This gives provider-specific error handling and model selection.
   - What's unclear: Adding to the interface means both providers MUST implement it, which is the correct approach since both are used.
   - Recommendation: Add to `AIProviderInterface`. Follows the established pattern.

2. **Should the pipeline pass `provider` to the enrichment function, or should enrichment be a pipeline-level concern?**
   - What we know: The pipeline currently only uses the provider for Pass 1/2/3 (all in the non-scripted path). The scripted early-return currently has no provider interaction.
   - What's unclear: Whether enrichment should be a provider method (like `analyzeGaps`) or a pipeline utility that happens to use the provider.
   - Recommendation: Provider method, called from the pipeline. Same pattern as `provider.analyzeGaps()` called from `runGenerationPipeline`.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct reading of `generationPipeline.ts`, `aiProvider.ts`, `geminiProvider.ts`, `claudeProvider.ts`, `scriptedMapper.ts`, `gapAnalysisPrompts.ts`, `geminiService.ts`, `types.ts`, `App.tsx`
- **CONTEXT.md** - User decisions from discussion phase
- **REQUIREMENTS.md** - PIPE-03 and PIPE-04 specifications

### Secondary (MEDIUM confidence)
- Gemini structured output pattern verified against existing codebase usage (16+ instances of `responseSchema`)
- Claude tool_use pattern verified against existing codebase usage (gap analysis, condensation, transformation tools)

### Tertiary (LOW confidence)
- None. All findings are based on direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies; all APIs already used extensively in the codebase
- Architecture: HIGH - Follows established provider method + pipeline orchestration pattern used for gap analysis, condensation, and transformation
- Pitfalls: HIGH - Based on direct analysis of existing batch call patterns and their failure modes

**Research date:** 2026-02-21
**Valid until:** 2026-03-21 (stable domain, no external dependencies)
