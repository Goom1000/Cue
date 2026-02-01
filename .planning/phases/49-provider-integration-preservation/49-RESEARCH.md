# Phase 49: Provider Integration and Preservation - Research

**Researched:** 2026-02-01
**Domain:** AI Provider Integration & Prompt Engineering
**Confidence:** HIGH

## Summary

Phase 49 is integration work, not library adoption. The foundation is already complete from Phase 48:
- Detection patterns identify questions/activities in lesson plans (`services/contentPreservation/detector.ts`)
- Preservation rules generate XML-tagged prompts (`services/prompts/contentPreservationRules.ts`)
- Type definitions exist for structured data flow (`services/contentPreservation/types.ts`)

Both providers (Claude and Gemini) follow identical architecture patterns:
- `getSystemPromptForMode()` / `getSystemInstructionForMode()` functions build mode-specific prompts
- `generateLessonSlides()` method accepts `GenerationInput` with `lessonText`, `presentationText`, and mode
- Teleprompter rules are already injected via helper functions (`getTeleprompterRulesForVerbosity()`)

**Primary recommendation:** Inject preservation rules into existing prompt construction functions at the system-level (not user-level) so they're always present when content is detected. No changes to GenerationInput interface required - detection runs on the text already present.

## Standard Stack

### Core Libraries (Already Integrated)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| N/A | N/A | Pure integration phase | Phase 48 detection complete |

### Detection and Rules (Phase 48 Output)

| Module | Location | Purpose | Integration Point |
|--------|----------|---------|-------------------|
| `detector.ts` | `services/contentPreservation/` | Detects questions/activities in text | Call before prompt construction |
| `contentPreservationRules.ts` | `services/prompts/` | Builds XML-tagged preservation prompt | Inject into system prompt |
| `types.ts` | `services/contentPreservation/` | Type definitions for detected content | Type-safe integration |

### Providers to Modify

| Provider | File | Key Functions | Notes |
|----------|------|---------------|-------|
| ClaudeProvider | `services/providers/claudeProvider.ts` | `getSystemPromptForMode()`, `generateLessonSlides()` | Lines 380-463 |
| GeminiService | `services/geminiService.ts` | `getSystemInstructionForMode()`, `generateLessonSlides()` | Lines 100-178 |

**Installation:** None required - all dependencies already present

## Architecture Patterns

### Current Prompt Construction Flow

Both providers follow this pattern:

```typescript
// 1. Mode-specific system prompt
const systemPrompt = getSystemPromptForMode(mode, verbosity, gradeLevel);

// 2. Build user message with text + images
const userMessage = buildUserMessage(lessonText, presentationText, images);

// 3. Call AI API
const response = await callAI(systemPrompt, userMessage);
```

### Recommended Preservation Integration Pattern

**Pattern 1: Detection at Entry Point**

Detect preservable content once at the beginning of `generateLessonSlides()`:

```typescript
async generateLessonSlides(input: GenerationInput): Promise<Slide[]> {
  // 1. Detect preservable content from the source text
  const detectedContent = detectPreservableContent(
    input.mode === 'fresh' ? input.lessonText :
    input.mode === 'refine' ? input.presentationText || '' :
    `${input.lessonText}\n\n${input.presentationText || ''}`
  );

  // 2. Build system prompt with preservation rules
  const systemPrompt = getSystemPromptForMode(
    input.mode,
    input.verbosity,
    input.gradeLevel,
    detectedContent  // Pass detected content
  );

  // 3. Continue with existing flow...
}
```

**Pattern 2: Inject Preservation Rules into System Prompt**

Modify prompt construction to conditionally include preservation rules:

```typescript
function getSystemPromptForMode(
  mode: GenerationMode,
  verbosity: VerbosityLevel = 'standard',
  gradeLevel: string = 'Year 6 (10-11 years old)',
  preservableContent?: PreservableContent  // Optional parameter
): string {
  const teleprompterRules = getTeleprompterRulesForVerbosity(verbosity);
  const studentFriendlyRules = getStudentFriendlyRules(gradeLevel);

  // Build preservation section if content detected
  const preservationRules = preservableContent
    ? getPreservationRules(preservableContent, 'medium')  // Skip low-confidence
    : '';

  const teleprompterPreservationRules = preservableContent
    ? getTeleprompterPreservationRules(preservableContent)
    : '';

  switch (mode) {
    case 'fresh':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform a formal lesson plan into a teaching slideshow.

${studentFriendlyRules}

${preservationRules}  // <-- Inject here

CRITICAL: You will be provided with text content from the document.
...

${teleprompterRules}

${teleprompterPreservationRules}  // <-- Inject delivery context

LAYOUTS: Use 'split' for content with images...
      `;
    // ... other modes
  }
}
```

**Pattern 3: Mode-Specific Detection Logic**

Different modes require different detection strategies:

```typescript
function getTextForDetection(input: GenerationInput): string {
  switch (input.mode) {
    case 'fresh':
      // Fresh mode: only lesson text
      return input.lessonText;

    case 'refine':
      // Refine mode: only presentation text (high-confidence only)
      return input.presentationText || '';

    case 'blend':
      // Blend mode: lesson plan wins, but detect from both
      // Lesson plan content takes precedence for preservation
      return input.lessonText;  // Lesson is authoritative source
  }
}
```

### Confidence Filtering by Mode

From CONTEXT.md: "In Refine mode, only preserve high-confidence detections"

```typescript
function getMinConfidenceForMode(mode: GenerationMode): ConfidenceLevel {
  switch (mode) {
    case 'refine':
      return 'high';  // Only clear-cut questions and activities
    case 'fresh':
    case 'blend':
      return 'medium';  // Default threshold
  }
}

// Usage in prompt construction
const minConfidence = getMinConfidenceForMode(input.mode);
const preservationRules = getPreservationRules(detectedContent, minConfidence);
```

### Anti-Patterns to Avoid

**Anti-Pattern 1: Adding to GenerationInput**
- Don't add `preservedContent` field to GenerationInput
- Detection should be internal to provider implementation
- Keeps interface clean and backward compatible

**Anti-Pattern 2: User-Message Injection**
- Don't put preservation rules in the user message
- System prompt is the correct place for behavioral instructions
- User message should contain only source content

**Anti-Pattern 3: Separate Preservation Pass**
- Don't generate slides first, then try to inject preserved content
- Single-pass generation ensures coherent slide structure
- AI needs preservation context upfront to make layout decisions

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML escaping for preserved text | Manual string replacement | `escapeXml()` from `contentPreservationRules.ts` | Already handles all edge cases (teachers write "Compare <plant> and <animal> cells") |
| Deduplication of overlapping detections | Custom overlap logic | `deduplicateOverlapping()` from `detector.ts` | Already handles startIndex/endIndex overlap detection |
| Confidence filtering | Multiple if/else conditions | `buildPreservationPrompt(items, minConfidence)` | Single function handles filtering and formatting |

**Key insight:** Phase 48 already built all the hard parts (detection patterns, XML escaping, deduplication). This phase is purely about calling those functions in the right places.

## Common Pitfalls

### Pitfall 1: Token Limit Overflow

**What goes wrong:**
- Preservation rules add ~500-1000 tokens to system prompt
- Multiple detected items (15+) create long XML tags
- Combined with images and existing prompts, can exceed context limits

**Why it happens:**
- Gemini 2.0 Flash: 1M token context, but structured output limits are lower
- Claude Sonnet 4.5: 200K context, but effective limit ~150K with structured output

**How to avoid:**
- CONTEXT decision: "When many items detected (15+), AI uses judgment to select best items"
- Filter by confidence threshold first (skip 'low' confidence)
- Limit preserved items to top 10-12 by position in text
- Track token usage during development with `console.log()`

**Warning signs:**
- API errors with "context_length_exceeded" or "max_tokens"
- Truncated responses or incomplete JSON
- Timeouts during generation

### Pitfall 2: Prompt Ordering Confusion

**What goes wrong:**
- Preservation rules placed after layout instructions
- AI treats preserved content as optional suggestion, not requirement
- Questions get paraphrased instead of preserved verbatim

**Why it happens:**
- Prompt ordering affects instruction priority
- Later instructions can override earlier ones
- AI prioritizes slide aesthetics over preservation if rules appear late

**How to avoid:**
- Place preservation rules BEFORE format/layout instructions
- Structure: Core identity → Student-friendly rules → **Preservation rules** → Teleprompter rules → Layout/format
- Use strong language: "MUST include EXACT text" not "Try to include"

**Warning signs:**
- Preserved questions appear as paraphrases
- Detection worked but content missing from slides
- Teleprompter lacks delivery context for preserved items

### Pitfall 3: Mode-Specific Detection Mismatches

**What goes wrong:**
- Blend mode detects from presentation text, but lesson plan version differs
- Refine mode preserves low-confidence items (contradicts requirement)
- Detection runs on wrong source text for the mode

**Why it happens:**
- CONTEXT says: "In Blend mode, lesson plan wins — it's authoritative source"
- CONTEXT says: "In Refine mode, only preserve high-confidence detections"
- Easy to forget these mode-specific rules

**How to avoid:**
- Encapsulate mode logic in helper functions:
  ```typescript
  function getTextForDetection(input: GenerationInput): string;
  function getMinConfidenceForMode(mode: GenerationMode): ConfidenceLevel;
  ```
- Add JSDoc comments reminding of mode-specific behavior
- Write unit tests for each mode's detection logic

**Warning signs:**
- Blend mode shows presentation version instead of lesson plan version
- Refine mode preserves ambiguous questions
- Test failures with mode-specific scenarios

### Pitfall 4: Teleprompter Context Loss

**What goes wrong:**
- Preserved questions appear on slides verbatim
- Teleprompter shows same text with no delivery guidance
- Teacher doesn't know how to introduce or frame the question

**Why it happens:**
- Easy to forget teleprompter needs DIFFERENT treatment than slides
- Slides show WHAT, teleprompter shows HOW
- Two different rule sets needed: slide preservation + teleprompter context

**How to avoid:**
- Always inject BOTH rule sets:
  ```typescript
  const preservationRules = getPreservationRules(content, minConfidence);
  const teleprompterRules = getTeleprompterPreservationRules(content);
  ```
- CONTEXT requirement: "Minimal cue before preserved questions: 'Ask the class:'"
- Remember: `getTeleprompterPreservationRules()` returns empty string if no questions/activities

**Warning signs:**
- Slides show preserved content but teleprompter doesn't mention it
- No "[Wait for responses]" or timing cues for preserved activities
- Teachers report not knowing how to deliver preserved questions

### Pitfall 5: Empty Detection Handling

**What goes wrong:**
- Detection finds nothing but preservation rules still added to prompt
- Wastes tokens on empty XML tags
- Confuses AI with contradictory instructions

**Why it happens:**
- Forget to check if `detectedContent.all.length === 0`
- Helper functions might return empty strings, but still called

**How to avoid:**
- Check before building rules:
  ```typescript
  const preservationRules = detectedContent.all.length > 0
    ? getPreservationRules(detectedContent, minConfidence)
    : '';  // Empty string if nothing detected
  ```
- Helper functions already handle this (return empty string if no items)
- But explicit check makes intent clearer

**Warning signs:**
- Prompts contain empty `<preservable_content></preservable_content>` sections
- Token usage higher than expected with simple lesson plans
- AI confused about whether preservation is required

## Code Examples

Verified patterns from the current codebase:

### Example 1: Detection at Entry Point (ClaudeProvider)

```typescript
// Source: services/providers/claudeProvider.ts (to be modified)
async generateLessonSlides(
  inputOrText: GenerationInput | string,
  pageImages?: string[]
): Promise<Slide[]> {
  // Normalize to GenerationInput for backward compatibility
  const input: GenerationInput = typeof inputOrText === 'string'
    ? { lessonText: inputOrText, lessonImages: pageImages, mode: 'fresh' }
    : inputOrText;

  // NEW: Detect preservable content from source text
  const sourceText = input.mode === 'fresh' ? input.lessonText :
                     input.mode === 'refine' ? (input.presentationText || '') :
                     input.lessonText; // Blend mode: lesson wins

  const detectedContent = detectPreservableContent(sourceText);

  // Pass detection results to system prompt builder
  const systemPrompt = getSystemPromptForMode(
    input.mode,
    input.verbosity,
    input.gradeLevel,
    detectedContent  // NEW parameter
  );

  // ... existing message building logic continues unchanged
}
```

### Example 2: System Prompt with Preservation (Pattern to Follow)

```typescript
// Source: services/providers/claudeProvider.ts (lines 380-407, to be modified)
function getSystemPromptForMode(
  mode: GenerationMode,
  verbosity: VerbosityLevel = 'standard',
  gradeLevel: string = 'Year 6 (10-11 years old)',
  preservableContent?: PreservableContent  // NEW optional parameter
): string {
  const teleprompterRules = getTeleprompterRulesForVerbosity(verbosity);
  const studentFriendlyRules = getStudentFriendlyRules(gradeLevel);

  // NEW: Build preservation rules if content detected
  const minConfidence = mode === 'refine' ? 'high' : 'medium';
  const preservationRules = preservableContent && preservableContent.all.length > 0
    ? getPreservationRules(preservableContent, minConfidence)
    : '';

  const teleprompterPreservationRules = preservableContent
    ? getTeleprompterPreservationRules(preservableContent)
    : '';

  switch (mode) {
    case 'fresh':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform a formal lesson plan into a teaching slideshow.

${studentFriendlyRules}

${preservationRules}

CRITICAL: You will be provided with text content from the document.
- Preserve the pedagogical structure: 'Hook', 'I Do', 'We Do', 'You Do'.
- **MANDATORY**: You MUST include distinct slides for **'Success Criteria'** and **'Differentiation'**...

${teleprompterRules}

${teleprompterPreservationRules}

LAYOUTS: Use 'split' for content with images, 'grid' or 'flowchart' for process stages...

${JSON_OUTPUT_FORMAT}
`;
    // Similar for 'refine' and 'blend' modes...
  }
}
```

### Example 3: GeminiService Integration (Same Pattern)

```typescript
// Source: services/geminiService.ts (lines 100-178, to be modified)
export const generateLessonSlides = async (
  apiKey: string,
  inputOrText: GenerationInput | string,
  pageImages: string[] = []
): Promise<Slide[]> => {
  const input: GenerationInput = typeof inputOrText === 'string'
    ? { lessonText: inputOrText, lessonImages: pageImages, mode: 'fresh' }
    : inputOrText;

  // NEW: Same detection logic as Claude
  const sourceText = input.mode === 'fresh' ? input.lessonText :
                     input.mode === 'refine' ? (input.presentationText || '') :
                     input.lessonText;

  const detectedContent = detectPreservableContent(sourceText);

  const systemInstruction = getSystemInstructionForMode(
    input.mode,
    input.verbosity,
    input.gradeLevel,
    detectedContent  // NEW parameter
  );

  // ... rest of function unchanged
};
```

### Example 4: Helper Function for Mode-Specific Logic

```typescript
// NEW helper function to encapsulate mode behavior
function getDetectionSource(input: GenerationInput): string {
  switch (input.mode) {
    case 'fresh':
      // Fresh: detect only from lesson plan
      return input.lessonText;

    case 'refine':
      // Refine: detect from existing presentation
      return input.presentationText || '';

    case 'blend':
      // Blend: lesson plan is authoritative (CONTEXT decision)
      return input.lessonText;
  }
}

function getMinConfidenceForMode(mode: GenerationMode): ConfidenceLevel {
  // Refine mode: only high-confidence (CONTEXT decision)
  return mode === 'refine' ? 'high' : 'medium';
}
```

### Example 5: Testing Detection Output

```typescript
// Verification pattern during development
const input: GenerationInput = {
  lessonText: "Ask students: What is 3/4 of 12? Then solve on board.",
  mode: 'fresh'
};

const sourceText = getDetectionSource(input);
const detected = detectPreservableContent(sourceText);

console.log('Detected questions:', detected.questions.length);
console.log('Detected activities:', detected.activities.length);
console.log('All items:', detected.all.map(item => ({
  type: item.type,
  confidence: item.confidence,
  text: item.text
})));

// Expected output:
// Detected questions: 1
// Detected activities: 1
// All items: [
//   { type: 'question', confidence: 'high', text: 'What is 3/4 of 12?' },
//   { type: 'activity', confidence: 'high', text: 'solve on board.' }
// ]
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| AI paraphrases everything | Selective preservation with XML tags | Teacher intent preserved exactly |
| No detection logic | Regex + Bloom's taxonomy patterns | Automatic identification |
| Generic teleprompter | Context-aware delivery instructions | Better classroom flow |

**Deprecated/outdated:**
- Manual preservation lists: Users don't mark content to preserve; detection is automatic
- Post-processing injection: Preservation happens during generation, not after

## Open Questions

Things that couldn't be fully resolved:

1. **When to preserve numbered lists as-is vs. converting to bullets**
   - What we know: CONTEXT says "Claude's Discretion: Format of structured content (numbered steps vs bullets)"
   - What's unclear: Specific heuristic for when to keep vs. convert
   - Recommendation: Let AI decide based on slide layout (numbered for processes, bullets for points)

2. **Handling extremely long preserved questions (3+ sentences)**
   - What we know: CONTEXT says "Keep preserved content verbatim even if long"
   - What's unclear: Does this create unreadable slides with paragraph-length questions?
   - Recommendation: Test with real lesson plans; if problematic, propose slide splitting in future phase

3. **Placeholder text in preserved content**
   - What we know: CONTEXT says "Claude's Discretion: Handling of placeholders like '[student name]'"
   - What's unclear: Should detection skip text with placeholders, or preserve and let AI handle?
   - Recommendation: Preserve and let AI contextually decide (e.g., generalize to "students" or keep)

4. **Overlapping high/medium confidence detections**
   - What we know: Deduplication exists, keeps highest confidence
   - What's unclear: Should medium-confidence override high if it captures more context?
   - Recommendation: Keep existing logic (high wins); can revisit if user reports miss-detections

## Sources

### Primary (HIGH confidence)

- ClaudeProvider implementation: `/services/providers/claudeProvider.ts` (lines 380-550)
- GeminiService implementation: `/services/geminiService.ts` (lines 100-290)
- Detection module: `/services/contentPreservation/detector.ts` (complete file)
- Preservation rules: `/services/prompts/contentPreservationRules.ts` (complete file)
- Type definitions: `/services/contentPreservation/types.ts` (complete file)
- Phase 49 CONTEXT: `.planning/phases/49-provider-integration-preservation/49-CONTEXT.md`

### Secondary (MEDIUM confidence)

- N/A - this is pure integration phase with existing codebase

### Tertiary (LOW confidence)

- N/A - no external research needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Pure integration, no new libraries
- Architecture: HIGH - Existing patterns clear from codebase inspection
- Pitfalls: HIGH - Common prompt engineering issues well-documented

**Research date:** 2026-02-01
**Valid until:** 90+ days (stable internal architecture, no external dependencies)
