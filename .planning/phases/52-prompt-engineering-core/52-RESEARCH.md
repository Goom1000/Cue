# Phase 52: Prompt Engineering Core - Research

**Researched:** 2026-02-01
**Domain:** AI prompt engineering for educational scaffolding and progressive reveal
**Confidence:** HIGH

## Summary

Phase 52 transforms how the AI generates slides by adding problem/answer splitting and scaffolding guidance. This phase consumes Phase 51's teachable moment detection (`TeachableMoment[]`) as input and uses it to modify the AI generation prompts. The goal is to make the AI generate problem bullets WITHOUT answer leakage, answer bullets as separate reveals, and scaffolding strategies in teleprompter segments.

This is primarily a **prompt engineering task**. The existing slide structure (`content: string[]`, `speakerNotes: string`) already supports the required behavior through progressive disclosure. The AI generates structured JSON output with strict schemas, and the teleprompter already uses 👉 delimiters to segment instructions. No new UI components, types, or APIs are needed.

The core challenge is **prompt clarity and structured guidance**: the AI must understand exactly when and how to split content, what scaffolding strategies to provide for different content types (math vs. vocabulary vs. comprehension), and how to maintain natural lesson flow despite the split structure.

**Primary recommendation:** Extend existing system prompts in `contentPreservationRules.ts` with teachable moment formatting rules. Use content category classification from Phase 51 to provide content-specific scaffolding templates. Leverage structured JSON schemas to enforce problem/answer separation at generation time.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Gemini API | gemini-3-flash-preview | Structured JSON output | Native JSON schema support, already used in codebase |
| Claude API | claude-3-5-sonnet | Structured JSON output | Tool-based schema enforcement, existing provider |
| Pure TypeScript | - | Prompt template strings | Type-safe, maintainable, already used for all prompts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Prompt engineering uses native AI provider capabilities |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON Schema in config | LangChain / Semantic Kernel | Adds dependency; current providers natively support structured output |
| Template engine (Handlebars) | Template literals | Added complexity; TypeScript template literals are sufficient |
| External prompt library | Custom prompts | Loss of control; educational domain requires custom scaffolding |

**Installation:**
```bash
# No new dependencies required
# Uses existing @google/genai and @anthropic-ai/sdk packages
```

## Architecture Patterns

### Recommended Project Structure
```
services/
  prompts/
    contentPreservationRules.ts     # EXTEND: Add teachable moment rules
    teachableMomentRules.ts         # NEW: Content-specific scaffolding templates
  contentPreservation/
    types.ts                         # Already has TeachableMoment from Phase 51
  geminiService.ts                   # MODIFY: Include teachable moment rules in system prompt
  providers/
    geminiProvider.ts                # MODIFY: Pass teachable moments to generation
    claudeProvider.ts                # MODIFY: Pass teachable moments to generation
```

### Pattern 1: Structured Prompt Composition (Contract-Style)
**What:** Build system prompts using clear sections: role, success criteria, constraints, output format
**When to use:** Always - this is the 2026 best practice for prompt engineering
**Example:**
```typescript
// Source: Claude Prompt Engineering Best Practices 2026
// https://promptbuilder.cc/blog/claude-prompt-engineering-best-practices-2026
const TEACHABLE_MOMENT_SYSTEM_PROMPT = `
ROLE: You are an educational content specialist generating interactive teaching slides.

SUCCESS CRITERIA:
- Problem bullets contain ONLY the question/problem, never the answer
- Answer bullets appear as the immediately following bullet
- Teleprompter segments between problem and answer contain scaffolding strategies
- Natural transitions preserve lesson flow

CONSTRAINTS:
- Problem bullet must end at sentence boundary (no answer leakage)
- Answer bullet must be self-contained (student can understand it standalone)
- Scaffolding must match content type (math/vocabulary/comprehension)
- Minimum 2, maximum 3 question prompts per teachable moment

OUTPUT FORMAT:
[JSON schema specification]
`;
```

### Pattern 2: Content-Specific Scaffolding Templates
**What:** Provide different scaffolding guidance based on content category from Phase 51 detection
**When to use:** For each detected teachable moment, select scaffolding template by category
**Example:**
```typescript
// Math scaffolding template
const MATH_SCAFFOLDING = `
MATH PROBLEM SCAFFOLDING:
When generating teleprompter guidance between a math problem and its answer:
- Break problem into known vs. unknown
- Provide step-by-step thinking prompts
- Include visual/manipulative suggestions
Example: "What do we know? What are we trying to find? Can we draw this?"
`;

// Vocabulary scaffolding template
const VOCABULARY_SCAFFOLDING = `
VOCABULARY SCAFFOLDING:
When generating teleprompter guidance between a vocabulary word and its definition:
- Ask for context clues or prior knowledge
- Prompt for word breakdown (prefix, root, suffix)
- Request real-world examples
Example: "Have you heard this word before? What words does it look like?"
`;

// Comprehension scaffolding template
const COMPREHENSION_SCAFFOLDING = `
COMPREHENSION SCAFFOLDING:
When generating teleprompter guidance between a comprehension question and its answer:
- Prompt for text evidence
- Ask for reasoning and inference
- Encourage connection to prior knowledge
Example: "What clues in the text help us? What have we learned that connects?"
`;
```

### Pattern 3: Progressive Disclosure Alignment
**What:** Ensure scaffolding respects existing teleprompter segment structure (👉 delimiters)
**When to use:** Always - maintain compatibility with current presentation flow
**Example:**
```typescript
// From geminiService.ts TELEPROMPTER_RULES
// Existing structure: Segments = Bullets + 1
// Segment 0: Intro (before any bullets)
// Segment N: After Bullet N appears

// With teachable moment at Bullet 3-4:
// Segment 0: Intro
// Segment 1: Explain Bullet 1
// Segment 2: Explain Bullet 2
// Segment 3: SCAFFOLDING for problem (Bullet 3) - guide student thinking
// Segment 4: CONFIRMATION for answer (Bullet 4) - celebrate/extend
// Segment 5: Explain Bullet 5
```

### Pattern 4: Schema-Enforced Structure
**What:** Use JSON schema validation to enforce problem/answer separation at generation time
**When to use:** Always - prevents AI from generating merged problem+answer bullets
**Example:**
```typescript
// From geminiProvider.ts pattern (existing schema structure)
const SLIDE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    content: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Each bullet is a SEPARATE item. Problem and answer are CONSECUTIVE bullets, never combined."
    },
    speakerNotes: {
      type: Type.STRING,
      description: "Segments delimited by 👉. For teachable moments: scaffolding segment before answer reveal, confirmation segment after."
    }
  },
  required: ['title', 'content', 'speakerNotes']
};
```

### Anti-Patterns to Avoid
- **Answer leakage in problem bullet:** AI combines problem and answer in one bullet. Fix: Explicit schema description, examples in prompt.
- **Generic scaffolding:** "What do you think?" for all content types. Fix: Content-specific templates based on category.
- **Breaking teleprompter flow:** Too many scaffolding segments disrupt progressive disclosure count. Fix: Single scaffolding segment per problem-answer pair.
- **Repeating the word in vocabulary definitions:** "Photosynthesis means photosynthesis is..." Fix: Explicit instruction that word is already visible above.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation | Custom validator | Native Gemini/Claude schema support | Built-in type enforcement, production-tested |
| Prompt versioning | Git commits only | Prompt template constants in code | Type-safe, refactorable, testable |
| Content category detection | AI-based classification | Phase 51 regex patterns | Deterministic, no latency, already implemented |
| Teleprompter segment parsing | New parser | Existing 👉 split logic | PresentationView.tsx:1265, proven pattern |

**Key insight:** The prompt engineering layer builds on proven infrastructure. Don't reinvent structured output, content detection, or teleprompter parsing. Focus effort on prompt clarity and content-specific scaffolding templates.

## Common Pitfalls

### Pitfall 1: Vague Scaffolding Instructions
**What goes wrong:** AI generates generic prompts like "Think about this" instead of specific scaffolding strategies.
**Why it happens:** Prompt says "generate scaffolding" without defining what good scaffolding looks like.
**How to avoid:**
- Provide concrete examples in the system prompt
- Include content-specific templates (math, vocabulary, comprehension)
- Use contract-style prompts with explicit success criteria
**Warning signs:** Generated scaffolding is same across all content types, lacks actionable teacher prompts.

### Pitfall 2: Answer Leakage Despite Instructions
**What goes wrong:** Problem bullet includes the answer inline (e.g., "What is 3/4 of 12? The answer is 9.")
**Why it happens:** AI optimizes for completeness, doesn't understand "separate bullets" means structural separation.
**How to avoid:**
- Use JSON schema descriptions to enforce separation
- Provide before/after examples showing correct split
- Include explicit "NEVER combine problem and answer in same bullet" rule
**Warning signs:** Manual review shows merged problem+answer bullets, student sees answer before reveal.

### Pitfall 3: Teleprompter Segment Count Mismatch
**What goes wrong:** Scaffolding adds extra segments, breaking "Segments = Bullets + 1" rule.
**Why it happens:** Prompt adds scaffolding without explaining it replaces normal segment content.
**How to avoid:**
- Clarify that scaffolding is the CONTENT of the segment, not an additional segment
- Reinforce existing teleprompter structure in teachable moment rules
- Test generated output against segment count validation
**Warning signs:** Progressive disclosure breaks, PresentationView shows wrong segment for current bullet.

### Pitfall 4: Unnatural Transitions
**What goes wrong:** Split problem/answer creates awkward lesson flow, feels jarring to teacher.
**Why it happens:** AI generates problem bullet in isolation without considering lesson narrative.
**How to avoid:**
- Instruct AI to maintain natural language flow
- Provide examples of smooth transitions
- Include "before" context in scaffolding segment
**Warning signs:** Teacher feedback reports clunky slides, students confused by abrupt reveals.

### Pitfall 5: Vocabulary Definition Repeating Word
**What goes wrong:** Definition bullet says "Photosynthesis means photosynthesis is..."
**Why it happens:** AI treats definition as standalone statement, doesn't know word is visible above.
**How to avoid:**
- Explicit rule in prompt: "For vocabulary, definition appears WITHOUT repeating the word"
- Example: Word bullet: "Photosynthesis", Definition bullet: "The process plants use to make food from sunlight"
- This is a LOCKED decision from CONTEXT.md
**Warning signs:** Vocabulary definitions are redundant, repeat the term being defined.

### Pitfall 6: Over-Scaffolding
**What goes wrong:** Too many question prompts (5-6 instead of 2-3), overwhelming teacher.
**Why it happens:** AI errs on side of completeness.
**How to avoid:**
- Explicit constraint: "2-3 question prompts per teachable moment"
- Examples showing concise scaffolding
- Schema could enforce array length (future enhancement)
**Warning signs:** Scaffolding segments are very long, teacher skips reading them.

## Code Examples

Verified patterns from the existing codebase:

### Existing Teleprompter Structure (Foundation)
```typescript
// Source: services/geminiService.ts (lines 11-35)
const TELEPROMPTER_RULES = `
STRICT SPEAKER NOTE RULES (TELEPROMPTER LOGIC):
The app uses a "Progressive Disclosure" system.
1. The visual bullet point appears on screen.
2. The Student reads that bullet aloud.
3. The Teacher (Teleprompter) explains THAT SAME bullet - why it matters, an example, or deeper context.

FORMATTING:
The speaker notes must use "👉" as a delimiter.
- Segment 0 (Intro): Set the scene before any bullets appear.
- Segment 1: Student just read Bullet 1. Explain Bullet 1's significance.
- The number of "👉" segments MUST be exactly (Number of Bullets + 1).
`;
```

### New: Teachable Moment Formatting Rules
```typescript
// Recommended implementation for contentPreservationRules.ts or teachableMomentRules.ts

export function getTeachableMomentRules(
  teachableMoments: TeachableMoment[]
): string {
  if (teachableMoments.length === 0) return '';

  // Group by content category for template selection
  const categories = new Set(teachableMoments.map(tm => tm.contentCategory));

  return `
TEACHABLE MOMENT FORMATTING:

You have been provided with detected teachable moments (problems with answers).
For each teachable moment, follow these CRITICAL rules:

BULLET STRUCTURE (MANDATORY):
- Problem bullet: Contains ONLY the question/problem. NO answer text.
- Answer bullet: The immediately following bullet. Contains the answer/solution.
- Problem and answer are ALWAYS consecutive bullets on the SAME slide.

EXAMPLE - Math:
Input: "What is 3/4 of 12? The answer is 9."
✓ CORRECT:
  Bullet 3: "What is 3/4 of 12?"
  Bullet 4: "The answer is 9"
✗ WRONG:
  Bullet 3: "What is 3/4 of 12? The answer is 9." (combined - answer leakage!)

EXAMPLE - Vocabulary:
Input: "Photosynthesis: The process plants use to make food from sunlight."
✓ CORRECT:
  Bullet 5: "Photosynthesis"
  Bullet 6: "The process plants use to make food from sunlight"
✗ WRONG:
  Bullet 5: "Photosynthesis means the process plants use..." (repeated word!)

TELEPROMPTER SCAFFOLDING (Between Problem and Answer):
The segment AFTER the problem bullet (BEFORE answer reveal) contains scaffolding guidance.

Format: 2-3 question prompts to guide student thinking. Include [PAUSE] timing cue.

Content-Specific Scaffolding Templates:
${categories.has('math') ? MATH_SCAFFOLDING_TEMPLATE : ''}
${categories.has('vocabulary') ? VOCABULARY_SCAFFOLDING_TEMPLATE : ''}
${categories.has('comprehension') ? COMPREHENSION_SCAFFOLDING_TEMPLATE : ''}
${categories.has('science') ? SCIENCE_SCAFFOLDING_TEMPLATE : ''}

TELEPROMPTER CONFIRMATION (After Answer Reveal):
The segment AFTER the answer bullet celebrates/extends learning.

Format: Acknowledgment + common misconception or extension
Example: "That's right, 9! [For strugglers: Draw 12 objects in groups of 3]"

NATURAL FLOW:
Transitions between problem, scaffolding, and answer should feel like a natural teaching conversation.
Avoid abrupt changes in tone or topic.
`;
}

// Template constants
const MATH_SCAFFOLDING_TEMPLATE = `
MATH:
- Break into known vs. unknown
- Step-by-step thinking prompts
- Visual/manipulative suggestions
Example: "What do we know? (12 items, 3/4 needed) What's 12 ÷ 4? (3) How many groups? (3) [PAUSE 10 seconds]"
`;

const VOCABULARY_SCAFFOLDING_TEMPLATE = `
VOCABULARY:
- Ask for context clues or prior knowledge
- Word breakdown (prefix, root, suffix if applicable)
- Real-world examples
Example: "Look at the word. 'Photo' means light, 'synthesis' means putting together. What might this mean? [PAUSE for thinking]"
NOTE: Answer bullet shows definition ONLY, does NOT repeat the vocabulary word.
`;

const COMPREHENSION_SCAFFOLDING_TEMPLATE = `
COMPREHENSION:
- Prompt for text evidence
- Ask for reasoning/inference
- Connection to prior knowledge
Example: "What clues from the passage support your answer? Where have we seen this before? [PAUSE 15 seconds]"
`;

const SCIENCE_SCAFFOLDING_TEMPLATE = `
SCIENCE:
- Observation prompt
- Prediction/hypothesis
- Real-world connection
Example: "What do you observe in the diagram? What do you think will happen? Why? [PAUSE for predictions]"
`;
```

### Integration Point: System Prompt Modification
```typescript
// Recommended modification to geminiService.ts getSystemInstructionForMode()

function getSystemInstructionForMode(
  mode: GenerationMode,
  verbosity: VerbosityLevel = 'standard',
  gradeLevel: string = 'Year 6 (10-11 years old)',
  preservableContent?: PreservableContent,
  teachableMoments?: TeachableMoment[]  // NEW parameter from Phase 51
): string {
  const teleprompterRules = getTeleprompterRulesForVerbosity(verbosity);
  const studentFriendlyRules = getStudentFriendlyRules(gradeLevel);

  // Existing preservation rules
  const minConfidence = getMinConfidenceForMode(mode);
  const preservationRules = preservableContent && preservableContent.all.length > 0
    ? getPreservationRules(preservableContent, minConfidence)
    : '';

  const teleprompterPreservationRules = preservableContent
    ? getTeleprompterPreservationRules(preservableContent)
    : '';

  // NEW: Teachable moment rules
  const teachableMomentRules = teachableMoments && teachableMoments.length > 0
    ? getTeachableMomentRules(teachableMoments)
    : '';

  // Build system instruction (mode-specific logic continues as before)
  return `
${existingModePrompt}

${studentFriendlyRules}

${preservationRules}

${teachableMomentRules}

${teleprompterRules}

${teleprompterPreservationRules}
`;
}
```

### Detection Flow Integration
```typescript
// Recommended modification to geminiService.ts generateLessonSlides()

export const generateLessonSlides = async (
  apiKey: string,
  inputOrText: GenerationInput | string,
  pageImages: string[] = []
): Promise<Slide[]> => {
  // Normalize input (existing code)
  const input: GenerationInput = typeof inputOrText === 'string'
    ? { lessonText: inputOrText, lessonImages: pageImages, mode: 'fresh' }
    : inputOrText;

  // Detect preservable content (existing Phase 50 code)
  const sourceText = getDetectionSource(input);
  const detectedContent = detectPreservableContent(sourceText);

  // NEW: Detect teachable moments (Phase 51)
  const teachableMoments = detectTeachableMoments(sourceText);

  // Debug logging
  if (teachableMoments.length > 0) {
    console.log(`[GeminiService] Detected ${teachableMoments.length} teachable moments`);
    teachableMoments.forEach(tm => {
      console.log(`  - ${tm.contentCategory}: ${tm.problem.text.substring(0, 50)}...`);
    });
  }

  // Build system instruction with teachable moments (Phase 52)
  const systemInstruction = getSystemInstructionForMode(
    input.mode,
    input.verbosity,
    input.gradeLevel,
    detectedContent,
    teachableMoments  // NEW parameter
  );

  // Continue with API call (existing code)
  // ...
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unstructured text prompts | JSON Schema-enforced output | 2024-2026 | 60% reduction in AI errors, strict format compliance |
| "Write better prompts" | Contract-style prompts (role/criteria/constraints) | 2025-2026 | Clearer success criteria, more consistent outputs |
| Generic scaffolding | Content-specific templates | This phase (2026) | Math/vocabulary/comprehension get tailored strategies |
| Prompt engineering as art | Prompt engineering as instructional design | 2026 research | Systematic frameworks, measurable outcomes |

**Deprecated/outdated:**
- **Long verbose prompts:** Research shows contract-style beats verbosity (2026 Claude best practices)
- **AI-generated scaffolding without templates:** Too generic; content-specific templates perform better
- **Separate API calls for problem/answer:** Inefficient; single call with schema enforcement is standard

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal scaffolding length by verbosity level**
   - What we know: Concise = 2-3 short phrases, Standard = sentences, Detailed = full script
   - What's unclear: Whether scaffolding segments should scale with verbosity or stay consistent
   - Recommendation: Start with verbosity-independent scaffolding (always 2-3 prompts), user test for preference

2. **Visual separation in teleprompter UI**
   - What we know: CONTEXT.md locks "visually separated from regular notes"
   - What's unclear: Specific visual treatment (background color, border, icon, section header)
   - Recommendation: Phase 53 UI implementation decision; research suggests header + subtle background

3. **Multiple teachable moments on one slide**
   - What we know: Possible to have 2+ problem-answer pairs on one slide
   - What's unclear: Optimal sequencing and whether to limit per slide
   - Recommendation: Allow multiple, rely on Phase 51 throttling (max 30% of bullets)

4. **Claude vs. Gemini prompt differences**
   - What we know: Both support JSON schema, but Gemini uses native schema, Claude uses tool-based
   - What's unclear: Whether teachable moment prompts need provider-specific adaptations
   - Recommendation: Start with unified prompt, A/B test if quality differs by provider

## Sources

### Primary (HIGH confidence)
- Cue codebase: `services/geminiService.ts` - Existing teleprompter structure and JSON schema patterns
- Cue codebase: `services/prompts/contentPreservationRules.ts` - Prompt template patterns
- Cue codebase: `services/contentPreservation/detector.ts` - Detection system architecture
- Phase 51 Research: `.planning/phases/51-detection-foundation/51-RESEARCH.md` - TeachableMoment types, detection patterns
- Architecture Research: `.planning/research/ARCHITECTURE-delay-answer-reveal.md` - Feature architecture

### Secondary (MEDIUM confidence)
- [Claude Prompt Engineering Best Practices 2026](https://promptbuilder.cc/blog/claude-prompt-engineering-best-practices-2026) - Contract-style prompts, 2026 best practices
- [JSON Prompt: The Ultimate Guide in 2026](https://mpgone.com/json-prompt-guide/) - Structured output benefits, 70% enterprise adoption
- [Prompt Engineering as Cognitive Scaffolding](https://link.springer.com/article/10.1007/s44217-026-01134-4) - Educational scaffolding frameworks
- [Realizing the Possibilities of LLMs in Education](https://www.tandfonline.com/doi/full/10.1080/00405841.2025.2528545) - Chain-of-thought prompting for scaffolding
- [Progressive Disclosure in AI Agents](https://aipositive.substack.com/p/progressive-disclosure-matters) - Just-in-time context, Agent Skills pattern

### Tertiary (LOW confidence)
- [AI Prompts for Teachers 2026](https://www.mentimeter.com/blog/education/ai-prompts-for-teachers) - General educational prompt examples
- [Socratic Questioning AI Prompts](https://towardsai.net/p/machine-learning/the-socratic-prompt-how-to-make-a-language-model-stop-guessing-and-start-thinking) - Questioning frameworks (may inform scaffolding prompts)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing AI provider capabilities, no new dependencies
- Architecture: HIGH - Extends proven prompt composition patterns from codebase
- Pitfalls: HIGH - Based on codebase analysis, 2026 research, and CONTEXT.md decisions

**Research date:** 2026-02-01
**Valid until:** 14 days (fast-moving domain - AI best practices evolve quarterly, but core patterns stable)
