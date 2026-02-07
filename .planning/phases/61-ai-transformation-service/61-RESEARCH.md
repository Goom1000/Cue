# Phase 61: AI Transformation Service - Research

**Researched:** 2026-02-08
**Domain:** AI text transformation, LLM prompt engineering, structured output
**Confidence:** HIGH

## Summary

Phase 61 builds a service that transforms teleprompter scripts (speaker notes formatted with emoji delimiters for progressive disclosure) into expanded, self-contained talking-point bullets that a colleague can read aloud to deliver the lesson. The transformation is purely a service layer -- no UI, no export. It consumes existing slide data (including verbosity cache resolution) and produces a new data structure of transformed bullets per slide.

The codebase already has a robust `AIProviderInterface` pattern with Gemini and Claude implementations, shared prompt infrastructure in `services/prompts/`, and a well-established pattern for adding new AI methods (system prompt + structured output schema + implementation in both providers). The prior milestone research (`STACK-v4.1-script-mode-export.md`) already identified the architecture: a `transformForScriptMode` method on the provider interface, single batched call per deck, and a `ScriptModeSlide` output type. This phase implements exactly that.

The key complexity is not in the AI integration (which is well-trodden ground) but in the prompt engineering: ensuring the transformation produces student-facing delivery text (not teacher notes), handles special slide types correctly (pasted-image, work-together, class-challenge), resolves the right verbosity cache entry as input, and maintains narrative coherence across slides without repetition.

**Primary recommendation:** Add a `transformForColleague` method to `AIProviderInterface`, implement in both providers using the established patterns (Gemini: `responseSchema` + `responseMimeType: 'application/json'`; Claude: `tools` + `tool_choice`), with a shared prompt module in `services/prompts/transformationPrompts.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Bullet Output Shape
- Bullet count is flexible by content -- AI decides based on how much material the slide has (some slides get 3, others get 7)
- Tone must be student-facing and deliverable -- these are the actual words the colleague says to students, matching the tone of the current app slides (not teacher notes *about* teaching)
- Each bullet should be 2-4 sentences -- enough context that the colleague doesn't need to improvise
- Interaction cues (e.g., "Ask students what they think") should be converted to hints like "[Discussion point: X]" -- signal the activity without prescribing how to run it

#### Teaching Content Fidelity
- Slides with no teleprompter content at all are skipped entirely -- not included in the transformation output

#### Verbosity Resolution
- Always use the deck's active verbosity setting as input for transformation
- Use the deck's current AI provider (same one that generates teleprompter content)

### Claude's Discretion
- Whether to bold key terms or use sub-bullets (pick formatting that works well in both PPTX and PDF export)
- Whether to preserve examples/analogies verbatim or rephrase for clarity in bullet form
- Whether thin-content slides should be expanded or kept brief (judge intent)
- Whether to add light transitions between slides or just avoid repetition (pick what reads best)
- How to handle Work Together and Class Challenge slides (make activities deliverable by a colleague)
- How to handle answer-reveal slides (combine question+answer or keep as separate slide bullets)
- Fallback chain when the active verbosity level hasn't been generated yet for a slide
- Whether the service should be level-aware (adjusting expansion based on input verbosity) or treat text as opaque input

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `AIProviderInterface` | Existing | Provider abstraction for Gemini/Claude | Already implements 15+ AI methods; adding one more follows established pattern |
| `@google/genai` | Existing (npm) | Gemini API client with structured output (`responseSchema`) | Used by GeminiProvider for all structured AI operations |
| Anthropic Messages API | v2023-06-01 | Claude API with tool_use for structured output | Used by ClaudeProvider for all structured AI operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Shared prompt modules (`services/prompts/`) | N/A | System prompts, context builders, schema definitions | Reuse pattern from `condensationPrompts.ts`, `gapAnalysisPrompts.ts` |
| `buildDeckContextForCohesion()` | Existing | Serializes slides into text context for AI consumption | Provides deck-level context for narrative coherence |
| `VerbosityLevel` type | Existing | `'concise' | 'standard' | 'detailed'` | Determines which teleprompter text to extract as input |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single batched call | Per-slide calls | Per-slide loses cross-slide context for coherence, costs more, slower. Single call is correct. |
| Adding to AIProviderInterface | Standalone service function | Standalone breaks the provider abstraction. Both providers need it, interface method is cleaner. |
| Shared prompt module | Inline prompts in providers | Inline duplicates prompt logic. `services/prompts/` pattern keeps prompts in one place for both providers. |

**Installation:**
```bash
# No new packages needed. All dependencies already present.
```

## Architecture Patterns

### Recommended Project Structure
```
services/
  prompts/
    transformationPrompts.ts    # NEW: system prompt, context builder, schemas
  providers/
    geminiProvider.ts           # MODIFY: add transformForColleague()
    claudeProvider.ts           # MODIFY: add transformForColleague()
  aiProvider.ts                 # MODIFY: add to AIProviderInterface + types
```

### Pattern 1: Shared Prompt Module (Established Pattern)
**What:** System prompts, context builders, and output schemas live in `services/prompts/` and are imported by both providers.
**When to use:** Every time a new AI method needs consistent behavior across Gemini and Claude.
**Example from codebase:**
```typescript
// services/prompts/condensationPrompts.ts (existing pattern)
export const CONDENSATION_SYSTEM_PROMPT = `...`;
export function buildCondensationUserPrompt(gradeLevel: string): string { ... }
export function buildCondensationContext(slides: Slide[], lessonPlanText: string): string { ... }
export const CONDENSATION_RESPONSE_SCHEMA = { ... };  // For Gemini
export const CONDENSATION_TOOL = { ... };              // For Claude
```

### Pattern 2: Provider Implementation (Gemini vs Claude)
**What:** Gemini uses `responseSchema` + `responseMimeType: 'application/json'` for structured output. Claude uses `tools` + `tool_choice` for the same result.
**When to use:** Every structured AI response.
**Gemini pattern:**
```typescript
const response = await ai.models.generateContent({
  model: this.model,
  contents,
  config: {
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: 'application/json',
    responseSchema: RESPONSE_SCHEMA,   // Gemini Type.OBJECT schema
    temperature: 0.5,
    maxOutputTokens: 8192
  }
});
const result = JSON.parse(response.text || '{}');
```
**Claude pattern:**
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { /* standard headers + anthropic-dangerous-direct-browser-access */ },
  body: JSON.stringify({
    model: this.model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'tool', name: 'tool_name' },
    messages: [{ role: 'user', content: contentArray }]
  })
});
const data = await response.json();
const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
const result = toolUse?.input;
```

### Pattern 3: Verbosity Cache Resolution
**What:** The app stores teleprompter text at three verbosity levels. `speakerNotes` is always the "standard" text. `verbosityCache.concise` and `verbosityCache.detailed` store regenerated versions.
**Resolution logic (from PresentationView.tsx line 1310-1317):**
```typescript
let rawScript: string;
if (deckVerbosity === 'standard') {
    rawScript = currentSlide.speakerNotes || "";
} else {
    rawScript = currentSlide.verbosityCache?.[deckVerbosity] || currentSlide.speakerNotes || "";
}
```
**For transformation service:** Extract the active teleprompter text using this same resolution pattern before sending to AI.

### Pattern 4: Deck Context for Coherence
**What:** Serialize all slides into a text summary the AI can reference for narrative flow.
**Existing function:** `buildDeckContextForCohesion()` in `services/prompts/cohesionPrompts.ts` -- serializes up to 20 slides with title, content, speaker notes preview, layout, source label.
**For transformation:** Can reuse or build a similar but customized serializer that emphasizes the resolved teleprompter text over slide content bullets.

### Anti-Patterns to Avoid
- **Per-slide API calls:** Loses cross-slide context, causes tone inconsistency, slow, expensive. Always batch.
- **Duplicating prompts in both providers:** Use shared prompt module. Both providers must produce identical output quality.
- **Using slide content bullets as primary input:** The teleprompter script is the teacher's voice -- that is the source material. Slide bullets are visual anchors, not the delivery content.
- **Hardcoding verbosity resolution:** Use the same fallback logic the app uses. Don't assume `speakerNotes` is always the right input.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured AI output | Custom JSON parsing with regex | Gemini `responseSchema` / Claude `tool_use` | Both providers have native structured output. Regex parsing is fragile. |
| Deck serialization | Custom slide-to-text serializer | Adapt `buildDeckContextForCohesion()` or create similar shared function | Existing serializer handles edge cases (pasted slides, truncation, special sources) |
| Error handling | Custom error classes | Existing `AIProviderError` + `USER_ERROR_MESSAGES` + error code mapping | Unified error handling already works across all AI operations |
| Retry logic | Custom retry | Existing `withRetry()` in `aiProvider.ts` | Handles exponential backoff, retryable vs non-retryable errors |

**Key insight:** This phase adds one new AI method to a well-established pattern. The infrastructure (error handling, retries, provider abstraction, structured output) is fully built. The work is prompt engineering + wiring.

## Common Pitfalls

### Pitfall 1: Token Truncation on Large Decks
**What goes wrong:** AI cuts off output mid-JSON for decks with 25+ slides, producing invalid JSON.
**Why it happens:** Even with large context windows (1M for Gemini, 200K for Claude), LLMs struggle generating very long structured outputs.
**How to avoid:** Implement chunking fallback: if slide count > 20, chunk into groups of 10 slides per call. The prior research recommends this threshold at 25, but 20 is safer given 2-4 sentence bullets per slide.
**Warning signs:** `PARSE_ERROR` exceptions from `JSON.parse`, incomplete `transformedSlides` arrays shorter than input.

### Pitfall 2: Confusing Teacher Notes with Student Delivery
**What goes wrong:** AI produces bullets that read like teacher planning notes ("Explain to students that...") instead of student-facing delivery text ("Today we're looking at...").
**Why it happens:** The system prompt doesn't clearly enough distinguish between "notes about teaching" and "words to say to students."
**How to avoid:** System prompt must include explicit examples of WRONG output (teacher-notes style) vs RIGHT output (delivery style). Include the existing `TELEPROMPTER_RULES` pattern of providing anti-examples.
**Warning signs:** Bullets containing phrases like "Explain to the class", "The teacher should", "Students need to understand".

### Pitfall 3: Pasted Slides with No Teleprompter Content
**What goes wrong:** Pasted slides often have content array populated (from AI image analysis) but may have minimal/no speakerNotes if the teacher didn't generate teleprompter for them.
**Why it happens:** Pasted slides are image-first. The `originalPastedImage` field marks them. Content is extracted by AI, but speakerNotes may not be generated.
**How to avoid:** The user decision says "skip slides with no teleprompter content at all." Check for both `speakerNotes` being empty AND `verbosityCache` being empty. If a pasted slide has content bullets but no teleprompter, it should still be skipped per the user's decision.
**Warning signs:** Empty `expandedBullets` arrays, error responses about missing content.

### Pitfall 4: Inconsistent Tone Across Chunked Calls
**What goes wrong:** When chunking large decks, each chunk may produce a slightly different tone, making the full output feel disjointed.
**Why it happens:** Each API call has its own context window. Without instructions about the surrounding chunks, tone drifts.
**How to avoid:** For chunked calls, include a brief summary of previous chunks in subsequent calls: "The previous slides covered [topics]. Maintain the same tone and avoid repeating [key points]."
**Warning signs:** Abrupt tone shifts at chunk boundaries, repeated examples across chunks.

### Pitfall 5: Gemini JSON Sanitization
**What goes wrong:** Gemini sometimes emits raw control characters (newlines, tabs) inside JSON string values, causing `JSON.parse` to fail.
**Why it happens:** Known Gemini behavior documented in the existing codebase (see `geminiProvider.ts` condenseDeck sanitization at line 519-535).
**How to avoid:** Apply the same JSON sanitization logic used in `geminiProvider.ts` condenseDeck: walk the raw string, escape control characters only inside quoted strings.
**Warning signs:** `SyntaxError: Unexpected token` from `JSON.parse`.

### Pitfall 6: Verbosity Fallback Creates Wrong Input
**What goes wrong:** Active verbosity is "detailed" but no detailed cache exists, so fallback uses "standard" speakerNotes -- producing a transformation based on shorter input than expected.
**Why it happens:** Verbosity cache is populated lazily (only when teacher switches verbosity during presentation). Many slides may never have non-standard cache entries.
**How to avoid:** Document this as expected behavior. The fallback chain is: `verbosityCache[level] -> speakerNotes -> skip`. This matches what the app itself shows the teacher. Transformation should use whatever text the teacher would see.
**Warning signs:** None -- this is correct behavior, not a bug.

## Code Examples

Verified patterns from the existing codebase:

### Verbosity Resolution (for extracting input text)
```typescript
// Source: PresentationView.tsx lines 1310-1317
function resolveTeleprompterText(slide: Slide, deckVerbosity: VerbosityLevel): string {
  if (deckVerbosity === 'standard') {
    return slide.speakerNotes || '';
  }
  return slide.verbosityCache?.[deckVerbosity] || slide.speakerNotes || '';
}
```

### Slide Filtering (skip slides with no teleprompter)
```typescript
// Based on user decision: "Slides with no teleprompter content at all are skipped entirely"
function hasTransformableContent(slide: Slide, deckVerbosity: VerbosityLevel): boolean {
  const text = resolveTeleprompterText(slide, deckVerbosity);
  return text.trim().length > 0;
}
```

### Adding a Method to AIProviderInterface
```typescript
// Source: services/aiProvider.ts (existing pattern)
export interface AIProviderInterface {
  // ... existing methods ...

  // Transform teleprompter scripts into colleague-deliverable bullets (Phase 61)
  transformForColleague(
    slides: Slide[],
    deckVerbosity: VerbosityLevel,
    gradeLevel: string
  ): Promise<TransformedSlide[]>;
}
```

### Output Type
```typescript
// New type for transformation results
export interface TransformedSlide {
  slideIndex: number;           // 0-based index into original slides array
  originalTitle: string;        // Preserved from source slide
  expandedBullets: string[];    // 3-7 talking-point bullets, each 2-4 sentences
  slideType: string;            // 'standard' | 'work-together' | 'class-challenge' | 'pasted'
}
```

### Gemini Implementation Pattern (structured output)
```typescript
// Source: geminiProvider.ts condenseDeck pattern
async transformForColleague(
  slides: Slide[],
  deckVerbosity: VerbosityLevel,
  gradeLevel: string
): Promise<TransformedSlide[]> {
  const ai = new GoogleGenAI({ apiKey: this.apiKey });
  const context = buildTransformationContext(slides, deckVerbosity);
  const userPrompt = buildTransformationUserPrompt(gradeLevel);

  const response = await ai.models.generateContent({
    model: this.model,
    contents: `${userPrompt}\n\n${context}`,
    config: {
      systemInstruction: TRANSFORMATION_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: TRANSFORMATION_RESPONSE_SCHEMA,
      temperature: 0.5,
      maxOutputTokens: 8192
    }
  });

  // Apply Gemini JSON sanitization (control character escaping)
  const sanitized = sanitizeGeminiJson(response.text || '{}');
  const parsed = JSON.parse(sanitized);
  return parsed.transformedSlides || [];
}
```

### Claude Implementation Pattern (tool_use)
```typescript
// Source: claudeProvider.ts condenseDeck pattern
async transformForColleague(
  slides: Slide[],
  deckVerbosity: VerbosityLevel,
  gradeLevel: string
): Promise<TransformedSlide[]> {
  const context = buildTransformationContext(slides, deckVerbosity);
  const userPrompt = buildTransformationUserPrompt(gradeLevel);

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
      max_tokens: 8192,
      system: TRANSFORMATION_SYSTEM_PROMPT,
      tools: [TRANSFORMATION_TOOL],
      tool_choice: { type: 'tool', name: 'deliver_transformation' },
      messages: [{ role: 'user', content: userPrompt + '\n\n' + context }]
    })
  });

  const data = await response.json();
  const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
  return toolUse?.input?.transformedSlides || [];
}
```

### Deck Context Serialization (for transformation input)
```typescript
// Adapt existing buildDeckContextForCohesion pattern
// Key difference: include resolved teleprompter text instead of raw speakerNotes
function buildTransformationContext(
  slides: Slide[],
  deckVerbosity: VerbosityLevel
): string {
  return slides
    .map((slide, i) => {
      const teleprompterText = resolveTeleprompterText(slide, deckVerbosity);
      if (!teleprompterText.trim()) return null; // Will be filtered

      const slideTypeLabel = slide.slideType || 'standard';
      const isPasted = !!slide.originalPastedImage;

      return [
        `--- Slide ${i + 1} [${isPasted ? 'pasted' : slideTypeLabel}] ---`,
        `Title: ${slide.title}`,
        `Visual Bullets: ${slide.content.join(' | ')}`,
        `Teleprompter Script: ${teleprompterText}`,
        slide.challengePrompt ? `Challenge Prompt: ${slide.challengePrompt}` : '',
        `Layout: ${slide.layout || 'split'}`,
      ].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}
```

## Discretion Recommendations

Based on the user's "Claude's Discretion" items, here are recommendations:

### Formatting: Bold key terms, use sub-bullets
**Recommendation: Use bold for key terms, avoid sub-bullets.** Bold (`**term**`) renders well in both PPTX (PptxGenJS supports bold in `addText()`) and PDF (rendered via html2canvas which preserves visual styles). Sub-bullets add complexity to the export layout and may not render consistently across formats. Keep bullets flat.

### Examples/Analogies: Preserve verbatim or rephrase
**Recommendation: Preserve examples verbatim, rephrase surrounding context.** The teacher chose specific examples for a reason (cultural relevance, age-appropriateness). Rephrasing "like cutting a pizza into slices" into "like dividing a pie" loses the teacher's voice. Rephrase explanatory framing, keep concrete examples.

### Thin-content slides: Expand or keep brief
**Recommendation: Keep brief and signal intent.** If a slide's teleprompter is 1-2 short segments, the teacher intended it as a transition or visual pause. Expanding it with filler undermines the deck's pacing. Output 1-2 bullets that capture the key point. The AI should note the slide's likely purpose.

### Transitions between slides: Add or just avoid repetition
**Recommendation: Avoid repetition only, no explicit transitions.** The bullets are reading material, not a live script. Adding "Now let's move on to..." between slide sections feels artificial in a document. Instead, ensure the last bullet of slide N doesn't repeat the first bullet of slide N+1.

### Work Together and Class Challenge slides
**Recommendation: Transform into deliverable activity instructions.** For Work Together: convert the activity description into actionable steps the colleague can read aloud ("Ask students to work in pairs. Give them 3 minutes to..."). For Class Challenge: combine the `challengePrompt` with the `content` array into a clear activity flow. Include the `[Activity: ...]` cue format so the colleague knows this is an interactive moment.

### Answer-reveal slides (question + answer pairs)
**Recommendation: Combine into a single slide's bullets with clear separation.** If the deck has a question slide followed by an answer slide (from the teachable moments / delayed reveal feature), the transformation should combine them: first bullet states the question/problem, remaining bullets provide the answer/explanation. Mark with `[Question]` and `[Answer]` cues. This avoids the colleague awkwardly pausing between two slides that are one logical unit.

### Verbosity fallback chain
**Recommendation: Use the same chain the app uses.** `verbosityCache[activeLevel] -> speakerNotes -> skip`. This is already how the presentation mode resolves text (PresentationView.tsx line 1316). No special fallback needed.

### Level-aware transformation
**Recommendation: Treat text as opaque input.** The service should not try to detect whether input is concise/standard/detailed and adjust expansion accordingly. Just transform whatever text it receives into colleague-deliverable bullets. The verbosity of the input naturally affects the richness of the output -- concise input produces somewhat thinner bullets, detailed input produces richer bullets. This is expected and acceptable.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-slide AI calls | Batched deck-level calls | Phase 58+ | Required for narrative coherence. All new AI features use batched approach. |
| Raw JSON parsing | Gemini `responseSchema` / Claude `tool_use` | Phase 44+ | Structured output eliminates regex parsing. Follow this for the transformation. |
| `callClaude()` helper for structured output | Direct `fetch()` with `tools` + `tool_choice` | Phase 60 | Complex structured outputs use direct fetch to access tool_use. Simple text uses `callClaude()`. |

**Deprecated/outdated:**
- Using `callClaude()` for structured JSON: The helper returns `data.content?.[0]?.text` which is the text block, not the tool_use input. For structured output, use direct fetch with tool_choice (see condenseDeck pattern).

## Open Questions

1. **Max tokens for transformation output**
   - What we know: A 15-slide deck with 5 bullets per slide at 3 sentences each = ~75 bullets * 50 tokens = ~3,750 output tokens. 8192 should be sufficient.
   - What's unclear: Whether decks with 25+ slides need chunking to prevent output truncation even under 8192 tokens.
   - Recommendation: Start with 8192 max_tokens and a 20-slide chunking threshold. Monitor during testing.

2. **Gemini JSON sanitization reuse**
   - What we know: The `geminiProvider.ts` condenseDeck method has inline JSON sanitization (lines 519-535) that escapes control characters.
   - What's unclear: Whether this should be extracted into a shared utility or remain inline.
   - Recommendation: Extract into a shared `sanitizeGeminiJson()` utility in `geminiProvider.ts` (module-level, not class-level) so the new method can reuse it. Not a shared module across providers since only Gemini needs it.

3. **Method naming**
   - What we know: Prior research called it `transformForScriptMode`. Context suggests `transformForColleague` is more descriptive.
   - What's unclear: Which name the downstream phases (62/63/64) will prefer.
   - Recommendation: Use `transformForColleague` -- it communicates the intent (colleague delivery) rather than the feature name (script mode). The output type should be `TransformedSlide` (not `ScriptModeSlide` from prior research, since "script mode" is the feature name, not the data type).

## Sources

### Primary (HIGH confidence)
- **Codebase: `services/aiProvider.ts`** -- AIProviderInterface with 15+ methods, factory function, error handling, types
- **Codebase: `services/providers/claudeProvider.ts`** -- Claude tool_use pattern for structured output (condenseDeck lines 1806-1912)
- **Codebase: `services/providers/geminiProvider.ts`** -- Gemini responseSchema pattern (condenseDeck lines 479-571)
- **Codebase: `services/prompts/condensationPrompts.ts`** -- Shared prompt module pattern (system prompt, context builder, schemas for both providers)
- **Codebase: `services/prompts/cohesionPrompts.ts`** -- Deck serialization for AI context (buildDeckContextForCohesion)
- **Codebase: `types.ts`** -- Slide interface (lines 10-37), verbosityCache structure, slideType enum, CueFile with deckVerbosity
- **Codebase: `components/PresentationView.tsx` (lines 1310-1317)** -- Verbosity resolution logic
- **Codebase: `.planning/research/STACK-v4.1-script-mode-export.md`** -- Prior milestone research confirming architecture, cost estimates, chunking strategy

### Secondary (MEDIUM confidence)
- **Codebase: `services/geminiService.ts`** -- Teleprompter rules (TELEPROMPTER_RULES, TELEPROMPTER_RULES_CONCISE, TELEPROMPTER_RULES_DETAILED) showing the input format the transformation must handle

### Tertiary (LOW confidence)
- None -- all findings are from codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- uses only existing codebase patterns, no new dependencies
- Architecture: HIGH -- follows established `AIProviderInterface` + shared prompts pattern verified across 6+ existing methods
- Pitfalls: HIGH -- identified from known issues in existing provider implementations (JSON sanitization, token limits, chunking)

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable -- codebase patterns unlikely to change in 30 days)
