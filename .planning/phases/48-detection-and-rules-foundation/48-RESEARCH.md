# Phase 48: Detection and Rules Foundation - Research

**Researched:** 2026-02-01
**Domain:** Text pattern detection and LLM prompt engineering for content preservation
**Confidence:** HIGH

## Summary

This phase requires building detection patterns (regex-based TypeScript functions) to identify preservable content (questions, activities, instructions) in lesson plans and PowerPoint input, plus AI prompt rules that instruct the LLM to preserve detected content verbatim. The domain combines two well-established techniques: regex pattern matching in TypeScript and XML-tagged prompt engineering for Claude/Gemini.

The standard approach is a two-layer architecture: (1) client-side TypeScript detector that marks content with metadata using regex patterns, and (2) system prompt rules that use XML tags to communicate preservation requirements to the AI. This pattern is already established in the codebase through `services/documentAnalysis/analysisPrompts.ts` and `services/prompts/studentFriendlyRules.ts`.

Claude's official documentation confirms XML tags are the recommended method for structured prompts with content preservation requirements. The existing codebase uses XML-style delimiters (`👉` for teleprompter segments) and already has precedent for detection/preservation patterns in document analysis.

**Primary recommendation:** Build detector as pure TypeScript module with regex patterns, integrate preservation rules into existing prompt architecture using XML tags, follow established service structure pattern (`services/contentPreservation/`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript native RegExp | ES2024 | Pattern matching for questions/activities | Built-in, no dependencies, well-tested |
| XML tags (Claude-recommended) | N/A | Structured prompts for content preservation | Claude official best practice, already used in codebase |
| Jest (existing) | Current project version | Unit testing regex patterns | Already in codebase, standard for TypeScript testing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript String methods | ES2024 | `.match()`, `.test()`, `.exec()` for pattern matching | All detection scenarios |
| Named capture groups | ES2018+ | Extract question text, action verbs, context | When need structured extraction beyond boolean match |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native RegExp | NLP library (compromise.js, natural) | Libraries add 100-500KB bundle size, unnecessary for simple pattern matching. RegExp handles educational text patterns adequately. |
| XML tags | JSON structure, markdown delimiters | XML tags are Claude's documented best practice, already used in codebase for similar tasks |
| Client-side detection | LLM-based detection | Client regex is deterministic, instant, and free. LLM detection costs API calls and introduces latency/non-determinism. |

**Installation:**
```bash
# No new dependencies required
# Uses TypeScript built-in RegExp and existing test framework
```

## Architecture Patterns

### Recommended Project Structure
```
services/
├── contentPreservation/
│   ├── detector.ts              # Regex patterns, detection logic
│   ├── detector.test.ts         # Jest unit tests
│   └── types.ts                 # DetectedContent interface
└── prompts/
    └── contentPreservationRules.ts  # AI prompt rules (XML tags, examples)
```

### Pattern 1: Detection Module with Regex Patterns
**What:** Pure functions that accept text input and return typed detection results
**When to use:** For all client-side content detection before AI processing

**Example:**
```typescript
// Source: Codebase pattern from documentAnalysis/analysisPrompts.ts
// Combined with TypeScript RegExp best practices

export interface DetectedContent {
  type: 'question' | 'activity' | 'instruction';
  text: string;
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: string; // e.g., "punctuation", "context", "action-verb"
  startIndex: number;
  endIndex: number;
}

export function detectQuestions(text: string): DetectedContent[] {
  const results: DetectedContent[] = [];

  // DET-01: Detect by punctuation (sentences ending with ?)
  const questionMarkPattern = /[^.!?]*\?/g;
  let match;
  while ((match = questionMarkPattern.exec(text)) !== null) {
    results.push({
      type: 'question',
      text: match[0].trim(),
      confidence: 'high',
      detectionMethod: 'punctuation',
      startIndex: match.index,
      endIndex: questionMarkPattern.lastIndex
    });
  }

  // DET-02: Detect by context ("Ask:", "Ask students:")
  const contextPattern = /(?:Ask|Question|Q\d+):?\s*([^.!?]+[.!?])/gi;
  // ... similar extraction logic

  return results;
}

export function detectActivities(text: string): DetectedContent[] {
  // DET-03: Detect instructional action verbs
  const actionVerbs = [
    'list', 'discuss', 'complete', 'compare', 'analyze',
    'solve', 'identify', 'explain', 'describe', 'create',
    'design', 'evaluate', 'apply', 'demonstrate'
  ];

  const verbPattern = new RegExp(
    `\\b(${actionVerbs.join('|')})\\b[^.!?]*[.!?]`,
    'gi'
  );

  // ... extraction logic
}
```

### Pattern 2: XML-Tagged Prompt Rules
**What:** System prompt sections that use XML tags to communicate preservation requirements
**When to use:** When integrating detection results into AI generation prompts

**Example:**
```typescript
// Source: Claude official docs (https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
// Applied to content preservation context

export function getContentPreservationRules(detectedContent: DetectedContent[]): string {
  const preservableItems = detectedContent.map(item =>
    `<preserve type="${item.type}">${item.text}</preserve>`
  ).join('\n');

  return `
CONTENT PRESERVATION RULES:

The input contains teacher-specified content that MUST appear verbatim in the output.
Do NOT generalize, rephrase, or summarize the following marked content:

<preservable_content>
${preservableItems}
</preservable_content>

CRITICAL RULES:
1. Questions marked with <preserve type="question"> MUST appear word-for-word on slides
2. Activities marked with <preserve type="activity"> MUST use the exact instructional language
3. When a question or activity is preserved, you may add supporting content around it
4. DO NOT change wording, punctuation, or phrasing of preserved content
5. If multiple slides cover the same topic, preserve the item on the most relevant slide

INTEGRATION EXAMPLES:

<example>
Input: "What is photosynthesis? Students should understand the process..."
Preserved: <preserve type="question">What is photosynthesis?</preserve>

Output slide content:
- What is photosynthesis?  ← EXACT MATCH (preserved)
- The process by which plants convert light into energy  ← Supporting content
</example>

<example>
Input: "List 3 examples of renewable energy sources. Discuss their advantages."
Preserved: <preserve type="activity">List 3 examples of renewable energy sources</preserve>
           <preserve type="activity">Discuss their advantages</preserve>

Output slide content:
- List 3 examples of renewable energy sources  ← EXACT MATCH
- Discuss their advantages  ← EXACT MATCH
</example>
`;
}
```

### Pattern 3: Few-Shot Examples for Edge Cases
**What:** 2-3 specific examples showing preservation in ambiguous scenarios
**When to use:** For handling rhetorical questions, embedded questions, multi-step activities

**Example:**
```typescript
// Source: Prompt engineering best practices (2026 guide)

const FEW_SHOT_EXAMPLES = `
<edge_case_examples>

<example scenario="rhetorical-question">
Input: "Isn't it amazing how plants grow? Through photosynthesis, they convert..."
Analysis: "Isn't it amazing" = rhetorical (don't preserve)
         Actual teaching question would be: "How do plants grow?"
Action: Skip rhetorical, extract concept
</example>

<example scenario="embedded-question">
Input: "Students should answer: What factors affect plant growth?"
Preserved: <preserve type="question">What factors affect plant growth?</preserve>
Action: Extract the actual question, discard wrapper text
</example>

<example scenario="multi-step-activity">
Input: "Complete the worksheet, then discuss your answers in pairs"
Preserved: <preserve type="activity">Complete the worksheet</preserve>
           <preserve type="activity">Discuss your answers in pairs</preserve>
Action: Separate into discrete activities, preserve each
</example>

</edge_case_examples>
`;
```

### Anti-Patterns to Avoid

- **Over-detection with greedy patterns:** Don't use `.*` wildcard that captures too much. Use non-greedy `.*?` or specific character classes.
- **LLM-based detection for simple patterns:** Don't use AI API calls for tasks regex handles (wastes tokens, adds latency).
- **Hardcoded strings in prompts:** Don't embed preservation rules directly in provider files. Use separate `contentPreservationRules.ts` module.
- **Single-pattern detection:** Don't rely only on question marks. Combine multiple heuristics (punctuation + context + action verbs).
- **No confidence scoring:** Don't treat all detections equally. Flag low-confidence items for manual review.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sentence boundary detection | Custom split-on-period logic | Regex with lookahead for abbreviations | Periods in "Mr.", "Dr.", "etc." will break naive splitting. Established regex patterns handle edge cases. |
| Action verb taxonomy | Manual verb list | Bloom's Taxonomy standard categories | Educators expect Bloom's framework. Don't invent new categorization. Use established Remember/Understand/Apply/Analyze/Evaluate/Create levels. |
| Question detection | Simple `?.includes()` check | Multi-heuristic detection (punctuation + context + numbered lists) | "?" appears in titles, rhetorical questions, URLs. Need confidence scoring and multiple patterns. |
| XML tag generation | Template string concatenation | Structured builder functions | Tag nesting, escaping, and consistency errors are common. Use typed functions that guarantee valid XML structure. |

**Key insight:** Educational content has domain-specific patterns (Bloom's taxonomy, lesson plan conventions) that are standardized. Don't reinvent categorization systems educators already know.

## Common Pitfalls

### Pitfall 1: Greedy Regex Capturing Across Paragraphs
**What goes wrong:** Pattern like `Ask:.*` captures from "Ask:" to end of document instead of just that sentence.
**Why it happens:** `.` matches any character, `*` is greedy (matches as much as possible).
**How to avoid:** Use non-greedy quantifiers (`.*?`) or specific character classes (`[^.!?]+`). Always test with multi-paragraph input.
**Warning signs:** Detection results include multiple sentences or unrelated content after the actual question.

### Pitfall 2: False Positives on Rhetorical Questions
**What goes wrong:** "Isn't math fun?" gets detected as a question to preserve, but it's just teacher enthusiasm.
**Why it happens:** Pure punctuation-based detection treats all `?` equally.
**How to avoid:** Use confidence levels. Mark rhetorical patterns ("Isn't it...", "Don't you think...") as low-confidence. Combine with context heuristics (is it followed by actual content, or is it standalone?).
**Warning signs:** Teachers report seeing their casual phrasing verbatim on slides instead of actual questions.

### Pitfall 3: Missing Numbered Question Lists
**What goes wrong:** "1. What is X? 2. Why does Y?" detected as two separate items instead of a question set.
**Why it happens:** Detection runs per-sentence without grouping related items.
**How to avoid:** Add pattern for numbered/lettered lists: `(?:[1-9]\.|\(?[a-z]\)).*?\?`. Group consecutive numbered items with shared context.
**Warning signs:** Slide has "1. What is X?" without "2. Why does Y?" even though they were adjacent in source.

### Pitfall 4: Action Verb False Positives in Non-Instructional Contexts
**What goes wrong:** "Students will discuss..." (teacher description) detected as activity instruction.
**Why it happens:** "discuss" is an action verb, but context matters.
**How to avoid:** Check for imperative mood (command form) vs. descriptive future tense. "Discuss in pairs" = instruction. "Students will discuss" = description (rephrase). Use low confidence for non-imperative matches.
**Warning signs:** Slides contain meta-language about the lesson instead of direct student instructions.

### Pitfall 5: XML Tag Escaping in Preserved Content
**What goes wrong:** Teacher writes "Compare <plant> and <animal> cells" → breaks XML structure.
**Why it happens:** Angle brackets in content conflict with XML syntax.
**How to avoid:** Escape `<` as `&lt;` and `>` as `&gt;` when wrapping preserved content in XML tags. Use TypeScript function that handles escaping automatically.
**Warning signs:** AI responses are malformed or parser errors occur when processing prompt.

### Pitfall 6: Non-English Content Detection
**What goes wrong:** Detection patterns hardcoded for English fail on bilingual lesson plans.
**Why it happens:** Action verbs, context patterns ("Ask:"), and punctuation conventions are language-specific.
**How to avoid:** For Phase 48, document as English-only. If internationalization needed later, use language detection library and locale-specific pattern sets.
**Warning signs:** Teachers using non-English lesson plans report no detection or incorrect results.

## Code Examples

### Question Detection with Multiple Heuristics
```typescript
// Source: TypeScript RegExp best practices + educational content patterns

export function detectQuestions(text: string): DetectedContent[] {
  const results: DetectedContent[] = [];

  // High confidence: Explicit question punctuation
  const questionMarkPattern = /([^.!?]*\?)/g;
  let match;
  while ((match = questionMarkPattern.exec(text)) !== null) {
    const questionText = match[1].trim();

    // Filter out rhetorical patterns
    const isRhetorical = /^(Isn't|Don't|Doesn't|Wouldn't|Shouldn't)\s/i.test(questionText);

    results.push({
      type: 'question',
      text: questionText,
      confidence: isRhetorical ? 'low' : 'high',
      detectionMethod: 'punctuation',
      startIndex: match.index,
      endIndex: questionMarkPattern.lastIndex
    });
  }

  // Medium confidence: Context markers
  const contextPattern = /(?:Ask|Question|Q\d+):?\s*([^.!?]+[.!?])/gi;
  while ((match = contextPattern.exec(text)) !== null) {
    results.push({
      type: 'question',
      text: match[1].trim(),
      confidence: 'medium',
      detectionMethod: 'context',
      startIndex: match.index,
      endIndex: contextPattern.lastIndex
    });
  }

  // Medium confidence: Numbered question lists
  const numberedPattern = /(?:^|\n)\s*(\d+\.)\s*([^.!?]*\?)/gm;
  while ((match = numberedPattern.exec(text)) !== null) {
    results.push({
      type: 'question',
      text: match[2].trim(),
      confidence: 'medium',
      detectionMethod: 'numbered-list',
      startIndex: match.index,
      endIndex: numberedPattern.lastIndex
    });
  }

  return deduplicateOverlapping(results);
}
```

### Activity Detection with Bloom's Taxonomy Verbs
```typescript
// Source: Bloom's Taxonomy action verbs (2026)
// https://www.teachthought.com/critical-thinking-posts/blooms-taxonomy-verbs/

const BLOOM_ACTION_VERBS = {
  remember: ['define', 'identify', 'describe', 'list', 'label', 'name', 'state', 'match', 'select'],
  understand: ['summarize', 'interpret', 'classify', 'compare', 'explain', 'discuss', 'distinguish'],
  apply: ['solve', 'complete', 'use', 'demonstrate', 'show', 'illustrate', 'apply'],
  analyze: ['analyze', 'contrast', 'differentiate', 'categorize', 'examine', 'investigate'],
  evaluate: ['evaluate', 'judge', 'defend', 'critique', 'prioritize', 'assess'],
  create: ['create', 'design', 'develop', 'formulate', 'construct', 'plan']
};

const ALL_ACTION_VERBS = Object.values(BLOOM_ACTION_VERBS).flat();

export function detectActivities(text: string): DetectedContent[] {
  const results: DetectedContent[] = [];

  // Build pattern: action verb at start of sentence (imperative mood)
  const verbPattern = new RegExp(
    `(?:^|[.!?]\\s+)(${ALL_ACTION_VERBS.join('|')})\\s+([^.!?]+[.!?])`,
    'gim'
  );

  let match;
  while ((match = verbPattern.exec(text)) !== null) {
    const verb = match[1].toLowerCase();
    const fullActivity = `${match[1]} ${match[2]}`.trim();

    // Check if it's imperative (direct instruction) vs. descriptive
    const isDescriptive = /(?:students will|they will|you will)/i.test(match[2]);

    results.push({
      type: 'activity',
      text: fullActivity,
      confidence: isDescriptive ? 'low' : 'high',
      detectionMethod: `action-verb-${verb}`,
      startIndex: match.index,
      endIndex: verbPattern.lastIndex
    });
  }

  return results;
}
```

### XML Tag Builder for Preservation Prompt
```typescript
// Source: Claude XML tag best practices
// https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildPreservationPrompt(detectedItems: DetectedContent[]): string {
  if (detectedItems.length === 0) {
    return ''; // No preservation needed
  }

  const preservableTags = detectedItems
    .filter(item => item.confidence !== 'low') // Skip low-confidence
    .map(item => {
      const escapedText = escapeXml(item.text);
      return `  <preserve type="${item.type}" method="${item.detectionMethod}">${escapedText}</preserve>`;
    })
    .join('\n');

  return `
<content_preservation>
CRITICAL: The following content MUST appear verbatim in the generated slides.
Do NOT rephrase, generalize, or summarize these items.

${preservableTags}

Integration rules:
- Place each preserved item on the most contextually relevant slide
- You may add supporting bullet points around preserved content
- Maintain exact wording, punctuation, and capitalization
- If an item doesn't fit naturally, create a dedicated slide for it
</content_preservation>
`;
}
```

### Jest Unit Tests for Detection Patterns
```typescript
// Source: Jest testing best practices for regex
// https://jestjs.io/docs/expect

describe('detectQuestions', () => {
  it('detects simple questions by punctuation', () => {
    const text = 'What is photosynthesis?';
    const results = detectQuestions(text);

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('What is photosynthesis?');
    expect(results[0].confidence).toBe('high');
    expect(results[0].detectionMethod).toBe('punctuation');
  });

  it('detects multiple questions in paragraph', () => {
    const text = 'What is X? Why does Y happen? How do we Z?';
    const results = detectQuestions(text);

    expect(results).toHaveLength(3);
    expect(results.map(r => r.text)).toEqual([
      'What is X?',
      'Why does Y happen?',
      'How do we Z?'
    ]);
  });

  it('flags rhetorical questions as low confidence', () => {
    const text = "Isn't science amazing? Today we'll learn about cells.";
    const results = detectQuestions(text);

    const rhetorical = results.find(r => r.text.includes("Isn't"));
    expect(rhetorical?.confidence).toBe('low');
  });

  it('detects context-based questions', () => {
    const text = 'Ask students: How does this work?';
    const results = detectQuestions(text);

    const contextQuestion = results.find(r => r.detectionMethod === 'context');
    expect(contextQuestion?.text).toBe('How does this work?');
  });

  it('handles embedded questions correctly', () => {
    const text = 'The main question is: What is the result?';
    const results = detectQuestions(text);

    // Should extract just the question, not the prefix
    expect(results.some(r => r.text === 'What is the result?')).toBe(true);
  });
});

describe('detectActivities', () => {
  it('detects activities by action verbs', () => {
    const text = 'List 3 examples of renewable energy.';
    const results = detectActivities(text);

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('List 3 examples of renewable energy.');
    expect(results[0].confidence).toBe('high');
  });

  it('distinguishes imperative from descriptive', () => {
    const imperative = 'Discuss in pairs your findings.';
    const descriptive = 'Students will discuss their findings.';

    const imperativeResults = detectActivities(imperative);
    const descriptiveResults = detectActivities(descriptive);

    expect(imperativeResults[0]?.confidence).toBe('high');
    expect(descriptiveResults[0]?.confidence).toBe('low');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Few-shot prompting with 5+ examples | Zero-shot with clear instructions + 2-3 edge case examples | 2025-2026 (GPT-4o, Claude Opus 4) | Modern LLMs perform better with direct instructions. Few-shot still useful for specific tone/format, but less critical. |
| JSON for structured prompts | XML tags (Claude-recommended) | Claude Anthropic docs 2023+ | XML provides better clarity, nesting, and parseability. Claude specifically trained on XML tag format. |
| NLP libraries for sentence detection | Native TypeScript RegExp with modern features | ES2018+ (named groups, lookbehind) | Regex sufficient for educational content. NLP libraries add bundle size without meaningful accuracy gain for this use case. |

**Deprecated/outdated:**
- **Template literal XML generation without escaping:** Modern approach uses typed builder functions that handle escaping automatically. Direct string concatenation risks XML injection when content contains `<` or `>`.
- **Single-pattern detection (question mark only):** Current best practice combines multiple heuristics (punctuation + context + numbering) with confidence scoring.

## Open Questions

1. **Rhetorical vs. deliberate question threshold**
   - What we know: Rhetorical questions follow patterns ("Isn't...", "Don't you think...")
   - What's unclear: Edge cases like "Can you believe X?" (could be rhetorical or genuine)
   - Recommendation: Start with conservative patterns (mark as low confidence), gather teacher feedback in Phase 49 integration

2. **Multi-step activity grouping**
   - What we know: "Complete worksheet, then discuss in pairs" has two activities
   - What's unclear: Should they be separate bullets or single bullet with sub-items?
   - Recommendation: Preserve as separate activities (matches teleprompter progressive disclosure pattern)

3. **Duplicate detection across PowerPoint slides**
   - What we know: DET-05 requires detection in PowerPoint text fields
   - What's unclear: If same question appears on multiple slides, preserve once or multiple times?
   - Recommendation: Preserve each occurrence (teacher intentionally repeated it, context may differ)

4. **Confidence threshold for preservation**
   - What we know: Low-confidence items are ambiguous (rhetorical, descriptive context)
   - What's unclear: Should low-confidence items be preserved or skipped?
   - Recommendation: Skip low-confidence by default, but log them for potential manual review UI in future phase

## Sources

### Primary (HIGH confidence)
- Claude official documentation: [Use XML tags to structure your prompts](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags) - Verified XML tag best practices, nesting, parseability
- Bloom's Taxonomy verb lists: [TeachThought Bloom's Taxonomy Verbs](https://www.teachthought.com/critical-thinking-posts/blooms-taxonomy-verbs/) - Authoritative action verb categorization by cognitive level
- Stanford NLP textbook (2026 draft): Sentence boundary disambiguation with regex - Canonical patterns for question mark detection
- TypeScript RegExp documentation (MDN/ES2024): Named capture groups, non-greedy quantifiers, lookbehind assertions

### Secondary (MEDIUM confidence)
- Codebase precedent: `services/documentAnalysis/analysisPrompts.ts` shows system prompt structure for detection tasks
- Codebase precedent: `services/prompts/studentFriendlyRules.ts` shows prompt rule organization pattern
- Prompt engineering guides (2026): [Few-shot prompting guide](https://www.promptingguide.ai/techniques/fewshot), [IBM Prompt Engineering 2026](https://www.ibm.com/think/prompt-engineering) - Modern consensus on zero-shot vs. few-shot

### Tertiary (LOW confidence)
- Web search results on NLP action verb detection: Limited 2026 research on automated instructional language detection. Recommendation stands: use Bloom's taxonomy manually curated lists rather than ML-based detection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native TypeScript RegExp well-documented, XML tags are Claude's official recommendation, Jest already in project
- Architecture: HIGH - Pattern matches existing codebase structure (services/documentAnalysis pattern), verified with official Claude docs
- Pitfalls: MEDIUM - Based on general regex pitfalls + educational content domain knowledge, not empirically tested with actual lesson plan corpus

**Research date:** 2026-02-01
**Valid until:** 60 days (stable domain - regex and prompt engineering best practices change slowly)

**Notes for planner:**
- No new npm dependencies required
- Detector module should be pure functions (easy to test, no side effects)
- Prompt rules integrate into existing provider architecture (claudeProvider.ts line 1-10 pattern)
- Test fixtures needed: realistic lesson plan excerpts with edge cases (rhetorical questions, action verbs in descriptive context, numbered lists)
