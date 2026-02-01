# Phase 54: Quality Assurance - Research

**Researched:** 2026-02-01
**Domain:** QA Testing for AI-Generated Educational Content (Answer Leakage Prevention, Format Diversity Detection, Provider Parity)
**Confidence:** HIGH

## Summary

This phase validates the teachable moment detection and scaffolding features implemented in Phases 51-53. The focus is QA validation rather than new feature development. The codebase already has:
- Detection: `detectTeachableMoments()` that identifies Q&A pairs with content classification (math, vocabulary, comprehension, science, general)
- Scaffolding: `getTeachableMomentRules()` that generates subject-specific AI prompts with word count constraints (<20 words per prompt)
- Providers: Both `GeminiProvider` and `ClaudeProvider` integrate these features in `generateLessonSlides()`

The QA phase must validate three requirements:
- **QUA-01**: No answer leakage in problem statement or scaffolding prompts
- **QUA-02**: Detection works across lesson plan formats (various teachers' styles)
- **QUA-03**: Both Gemini and Claude providers produce equivalent scaffolded output

**Primary recommendation:** Use test fixture-based validation with canary strings for leakage detection, diverse lesson plan samples for format coverage, and output comparison tests for provider parity.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Jest | 30.2.0 | Test framework | Already configured with ESM support |
| ts-jest | 29.4.6 | TypeScript transpilation | Configured preset for ESM |

### Supporting (Recommend Adding)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| faker | 9.x | Test data generation | Diverse lesson plan fixtures |
| diff | 7.x | Output comparison | Provider parity checks |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual fixture files | AI-generated fixtures | Real diversity vs. repeatability |
| String matching | Regex patterns | Precision vs. edge case coverage |
| Jest 30 | Vitest | Would require migration; Jest already working |

**Installation:**
```bash
npm install --save-dev @faker-js/faker diff
```

## Architecture Patterns

### Recommended Test Structure
```
services/
├── contentPreservation/
│   ├── detector.test.ts           # Existing - unit tests
│   ├── detector.integration.test.ts # NEW - format diversity tests
│   └── leakage.test.ts            # NEW - answer leakage tests
├── prompts/
│   ├── teachableMomentRules.test.ts # NEW - scaffolding word count tests
│   └── contentPreservationRules.test.ts # Existing
└── providers/
    └── parity.test.ts             # NEW - provider comparison tests
```

### Pattern 1: Canary String Detection for Leakage
**What:** Embed unique identifiable strings in test answers, verify they don't appear in problem bullets or scaffolding prompts
**When to use:** QUA-01 answer leakage validation
**Example:**
```typescript
// Source: Industry standard for data leakage detection
const CANARY_ANSWERS = [
  { problem: 'What is 3 + 4?', answer: 'CANARY_SEVEN_42', category: 'math' },
  { problem: 'Define photosynthesis', answer: 'CANARY_PLANT_PROCESS_99', category: 'science' }
];

function detectLeakage(output: Slide[]): LeakageResult[] {
  const leaks: LeakageResult[] = [];
  for (const slide of output) {
    for (const canary of CANARY_ANSWERS) {
      // Check problem bullets don't contain answer canary
      for (const bullet of slide.content) {
        if (bullet.includes(canary.answer)) {
          leaks.push({ type: 'problem-contains-answer', slide, canary });
        }
      }
      // Check scaffolding in speakerNotes doesn't contain answer
      if (slide.speakerNotes?.includes(canary.answer)) {
        leaks.push({ type: 'scaffolding-contains-answer', slide, canary });
      }
    }
  }
  return leaks;
}
```

### Pattern 2: Format Diversity Fixture Matrix
**What:** Test detection against multiple lesson plan formats (bullets, numbered, prose, mixed)
**When to use:** QUA-02 format diversity validation
**Example:**
```typescript
// Source: Codebase analysis - teachers use varied formats
const LESSON_PLAN_FORMATS = {
  numbered: `
    1. What is 2+2? Answer: 4
    2. What is 3x3? Answer: 9
  `,
  bulletWithColon: `
    - Question: What is the capital of France?
    - Answer: Paris
  `,
  prose: `
    Ask students: What makes a good story? The answer is compelling characters.
  `,
  qaBlocks: `
    Q1: Define photosynthesis
    A1: Process by which plants make food using sunlight

    Q2: What is chlorophyll?
    A2: Green pigment in plants
  `,
  mixed: `
    Learning Objective: Understand fractions

    Activity: What is 3/4 of 12? (Answer: 9)

    Discussion Questions:
    - Why do we use fractions?
    - How does this relate to division?
  `
};

describe('Format Diversity Detection', () => {
  Object.entries(LESSON_PLAN_FORMATS).forEach(([format, text]) => {
    it(`detects teachable moments in ${format} format`, () => {
      const moments = detectTeachableMoments(text);
      expect(moments.length).toBeGreaterThan(0);
    });
  });
});
```

### Pattern 3: Provider Parity Snapshot Testing
**What:** Compare output structure between Gemini and Claude providers
**When to use:** QUA-03 provider equivalence validation
**Example:**
```typescript
// Source: Best practice for multi-provider AI testing
interface ParityCheck {
  hasSameBulletCount: boolean;
  hasSeparateProblemAnswerBullets: boolean;
  hasScaffoldingInNotes: boolean;
  wordCountUnder20: boolean;
}

async function checkProviderParity(
  lessonText: string,
  geminiProvider: GeminiProvider,
  claudeProvider: ClaudeProvider
): Promise<{ gemini: ParityCheck; claude: ParityCheck }> {
  const input: GenerationInput = { lessonText, mode: 'fresh' };

  const [geminiSlides, claudeSlides] = await Promise.all([
    geminiProvider.generateLessonSlides(input),
    claudeProvider.generateLessonSlides(input)
  ]);

  return {
    gemini: analyzeSlides(geminiSlides),
    claude: analyzeSlides(claudeSlides)
  };
}
```

### Anti-Patterns to Avoid
- **Testing AI output verbatim:** AI outputs vary; test structure and constraints instead
- **Single-format test fixtures:** Miss format diversity issues
- **Skipping scaffolding word count checks:** Defeats verbal deliverability requirement
- **Mock-only provider tests:** Need some integration tests with real API calls

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Diverse test data | Manual fixture files | @faker-js/faker with templates | Combinatorial coverage |
| Text diffing | Custom comparison | diff library | Handles edge cases |
| Word counting | regex split | Established word boundary rules | Handles contractions, hyphenation |
| Leakage patterns | Ad-hoc string matching | Canary string methodology | Proven detection approach |

**Key insight:** QA testing benefits from established patterns. Canary strings are industry standard for data leakage detection; don't reinvent with fuzzy matching.

## Common Pitfalls

### Pitfall 1: Testing AI Output Determinism
**What goes wrong:** Tests fail randomly because AI outputs vary between runs
**Why it happens:** LLM responses are non-deterministic; exact string matching fails
**How to avoid:** Test structural properties (bullet count, separation, word count) not exact content
**Warning signs:** Flaky tests that pass/fail on reruns without code changes

### Pitfall 2: Missing Edge Case Formats
**What goes wrong:** Detection works for common formats but fails on unusual teacher styles
**Why it happens:** Test fixtures don't cover format diversity
**How to avoid:** Build a matrix of format variations: numbering styles, delimiters, prose vs. structured
**Warning signs:** User bug reports from specific teachers but not others

### Pitfall 3: Scaffolding Word Count Violations
**What goes wrong:** AI generates long-winded scaffolding that exceeds 20-word constraint
**Why it happens:** Prompts request "2-3 questions" but each question gets too long
**How to avoid:** Test word count per individual scaffolding question, not total block
**Warning signs:** Teachers report scaffolding prompts are awkward to read aloud

### Pitfall 4: Provider-Specific Bugs
**What goes wrong:** Feature works with Claude but breaks with Gemini (or vice versa)
**Why it happens:** Different AI models interpret prompts differently; only one provider tested
**How to avoid:** Parity tests that run same input through both providers
**Warning signs:** Support tickets correlate with specific provider settings

### Pitfall 5: Answer Leakage in Scaffolding
**What goes wrong:** Scaffolding prompts accidentally hint at or reveal the answer
**Why it happens:** AI interprets "guide thinking" as "lead to answer"
**How to avoid:** Canary string detection; check scaffolding doesn't contain answer text
**Warning signs:** Students report they can guess answers from teacher prompts

## Code Examples

Verified patterns from codebase analysis:

### Answer Leakage Detection Test
```typescript
// Based on: Codebase detector.test.ts patterns + canary methodology
describe('QUA-01: Answer Leakage Prevention', () => {
  const TEST_CASES = [
    {
      name: 'math problem',
      input: 'What is 3 + 4? Answer: 7',
      canaryAnswer: '7',
      category: 'math'
    },
    {
      name: 'vocabulary definition',
      input: 'Define: Photosynthesis means the process plants use to make food',
      canaryAnswer: 'process plants use to make food',
      category: 'vocabulary'
    }
  ];

  TEST_CASES.forEach(({ name, input, canaryAnswer, category }) => {
    it(`does not leak answer in problem bullet for ${name}`, () => {
      const moments = detectTeachableMoments(input);
      expect(moments.length).toBeGreaterThan(0);

      const problem = moments[0].problem;
      // Problem text should not contain the full answer
      expect(problem.text).not.toContain(canaryAnswer);
    });

    it(`scaffolding template does not reveal ${name} answer`, () => {
      const moments = detectTeachableMoments(input);
      const rules = getTeachableMomentRules(moments);

      // Scaffolding prompts should guide thinking, not reveal answer
      expect(rules).not.toContain(canaryAnswer);
      expect(rules).toContain('under 20 words');
    });
  });
});
```

### Format Diversity Detection Test
```typescript
// Based on: Existing detector.test.ts 'DET-05: PowerPoint input format' pattern
describe('QUA-02: Format Diversity Detection', () => {
  const TEACHER_FORMATS = {
    'Mrs. Smith style - numbered Q&A': `
      1. Q: What is 2+2?
         A: 4
      2. Q: What is 3x3?
         A: 9
    `,
    'Mr. Jones style - prose with inline answers': `
      Today we'll learn about fractions. What is 1/2 of 10? The answer is 5.
      Then we'll practice: What is 1/4 of 20? Answer: 5.
    `,
    'Ms. Garcia style - bullet headers': `
      Question: Define evaporation
      Answer: When water turns to gas

      Question: Define condensation
      Answer: When gas turns to water
    `,
    'Dr. Lee style - markdown tables': `
      | Problem | Solution |
      |---------|----------|
      | 5 + 7 = ? | 12 |
      | 8 - 3 = ? | 5 |
    `
  };

  Object.entries(TEACHER_FORMATS).forEach(([style, lessonText]) => {
    describe(style, () => {
      it('detects at least one teachable moment', () => {
        const moments = detectTeachableMoments(lessonText);
        expect(moments.length).toBeGreaterThanOrEqual(1);
      });

      it('correctly classifies content category', () => {
        const moments = detectTeachableMoments(lessonText);
        moments.forEach(m => {
          expect(['math', 'vocabulary', 'comprehension', 'science', 'general'])
            .toContain(m.contentCategory);
        });
      });

      it('pairs problems with answers when present', () => {
        const moments = detectTeachableMoments(lessonText);
        const withAnswers = moments.filter(m => m.answer !== null);
        // Most formats should have detectable answers
        expect(withAnswers.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
```

### Scaffolding Word Count Validation
```typescript
// Based on: Phase 53 verbal deliverability requirements
describe('Scaffolding Word Count Constraint (<20 words)', () => {
  const SCAFFOLDING_TEMPLATES = [
    { name: 'MATH_SCAFFOLDING_TEMPLATE', expectedMaxWords: 20 },
    { name: 'VOCABULARY_SCAFFOLDING_TEMPLATE', expectedMaxWords: 20 },
    { name: 'COMPREHENSION_SCAFFOLDING_TEMPLATE', expectedMaxWords: 20 },
    { name: 'SCIENCE_SCAFFOLDING_TEMPLATE', expectedMaxWords: 20 },
    { name: 'GENERAL_SCAFFOLDING_TEMPLATE', expectedMaxWords: 20 }
  ];

  function extractScaffoldingQuestions(templateOutput: string): string[] {
    // Extract individual questions between [PAUSE] markers
    return templateOutput
      .split('[PAUSE]')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.endsWith('?'));
  }

  function countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  it('each scaffolding question is under 20 words', () => {
    const moments: TeachableMoment[] = [
      {
        problem: { type: 'question', text: 'What is 3+4?', confidence: 'high',
                   detectionMethod: 'punctuation', startIndex: 0, endIndex: 12 },
        answer: { type: 'answer', text: '7', confidence: 'high',
                  detectionMethod: 'context', startIndex: 20, endIndex: 21 },
        contentCategory: 'math',
        confidence: 'high',
        proximityChars: 8
      }
    ];

    const rules = getTeachableMomentRules(moments);
    const questions = extractScaffoldingQuestions(rules);

    questions.forEach(q => {
      const wordCount = countWords(q);
      expect(wordCount).toBeLessThanOrEqual(20);
    });
  });
});
```

### Provider Parity Test
```typescript
// Based on: ClaudeProvider and GeminiProvider implementations
describe('QUA-03: Provider Parity', () => {
  const PARITY_TEST_INPUT: GenerationInput = {
    lessonText: `
      Math Lesson: Fractions

      What is 3/4 of 12? Answer: 9

      Key Concept: Fractions represent parts of a whole.
    `,
    mode: 'fresh',
    verbosity: 'standard'
  };

  // NOTE: These tests require API keys - run in integration test suite
  describe.skip('Integration: Live API Comparison', () => {
    let geminiProvider: GeminiProvider;
    let claudeProvider: ClaudeProvider;

    beforeAll(() => {
      geminiProvider = new GeminiProvider(process.env.GEMINI_API_KEY!);
      claudeProvider = new ClaudeProvider(process.env.CLAUDE_API_KEY!);
    });

    it('both providers detect and split teachable moments', async () => {
      const [geminiSlides, claudeSlides] = await Promise.all([
        geminiProvider.generateLessonSlides(PARITY_TEST_INPUT),
        claudeProvider.generateLessonSlides(PARITY_TEST_INPUT)
      ]);

      // Structural parity checks (not exact content)
      expect(geminiSlides.length).toBeGreaterThan(0);
      expect(claudeSlides.length).toBeGreaterThan(0);

      // Both should have some slides with split problem/answer
      const geminiHasSplit = geminiSlides.some(s =>
        s.content.some(b => b.includes('3/4') && !b.includes('9'))
      );
      const claudeHasSplit = claudeSlides.some(s =>
        s.content.some(b => b.includes('3/4') && !b.includes('9'))
      );

      expect(geminiHasSplit).toBe(true);
      expect(claudeHasSplit).toBe(true);
    });

    it('both providers include scaffolding in speaker notes', async () => {
      const [geminiSlides, claudeSlides] = await Promise.all([
        geminiProvider.generateLessonSlides(PARITY_TEST_INPUT),
        claudeProvider.generateLessonSlides(PARITY_TEST_INPUT)
      ]);

      const geminiHasScaffolding = geminiSlides.some(s =>
        s.speakerNotes?.includes('[PAUSE]') ||
        s.speakerNotes?.toLowerCase().includes('what do')
      );
      const claudeHasScaffolding = claudeSlides.some(s =>
        s.speakerNotes?.includes('[PAUSE]') ||
        s.speakerNotes?.toLowerCase().includes('what do')
      );

      expect(geminiHasScaffolding).toBe(true);
      expect(claudeHasScaffolding).toBe(true);
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual test case creation | Fixture matrix + canary strings | 2025 | More systematic leakage detection |
| Single-provider testing | Parity testing across providers | 2025 | Catches provider-specific bugs |
| Full output comparison | Structural property testing | 2025 | Handles AI non-determinism |
| Integration-only tests | Unit + Integration layers | 2026 | Faster feedback loops |

**Deprecated/outdated:**
- Exact string matching for AI outputs: AI is non-deterministic, use structural checks
- Single format test fixtures: Miss teacher-specific format issues

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal fixture count for format diversity**
   - What we know: Need multiple formats to catch edge cases
   - What's unclear: How many formats is "enough" for confidence?
   - Recommendation: Start with 5-6 distinct formats, expand based on user bug reports

2. **Real-world API testing frequency**
   - What we know: Live API tests are slow and costly
   - What's unclear: How often to run integration tests vs. unit tests?
   - Recommendation: Unit tests on every commit; API tests in nightly CI

3. **Scaffolding quality beyond word count**
   - What we know: Word count is measurable; "helpfulness" is not
   - What's unclear: How to validate scaffolding actually guides thinking?
   - Recommendation: Word count + structural checks now; user feedback later

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `detector.ts`, `teachableMomentRules.ts`, `claudeProvider.ts`, `geminiProvider.ts`
- Codebase analysis: Existing test patterns in `detector.test.ts`, `contentPreservationRules.test.ts`
- Jest 30 documentation: ESM support configuration

### Secondary (MEDIUM confidence)
- [LLM Testing Best Practices 2026](https://www.confident-ai.com/blog/llm-testing-in-2024-top-methods-and-strategies) - Testing framework patterns
- [Datadog LLM Evaluation Framework](https://www.datadoghq.com/blog/llm-evaluation-framework-best-practices/) - Multi-tier validation
- [1EdTech AI Content Best Practices](https://www.imsglobal.org/resource/AI-Generated_Content_Best_Practices/v1p0) - Educational content validation

### Tertiary (LOW confidence)
- [Prompt Leakage Probing Framework](https://dev.to/ag2ai/agentic-testing-for-prompt-leakage-security-3p6b) - Canary string methodology concept
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking) - Mock patterns (for reference if migrating)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Jest 30 setup, minimal additions needed
- Architecture: HIGH - Patterns derived from existing codebase test structure
- Pitfalls: HIGH - Based on codebase analysis and industry patterns
- Code examples: HIGH - Validated against existing test patterns in repo

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable - testing patterns don't change rapidly)
