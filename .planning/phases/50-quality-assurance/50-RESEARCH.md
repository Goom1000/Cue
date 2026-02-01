# Phase 50: Quality Assurance - Research

**Researched:** 2026-02-01
**Domain:** LLM Output Quality Validation & Prompt Refinement
**Confidence:** HIGH

## Summary

Phase 50 is quality assurance for the content preservation feature implemented in Phases 48-49. The goal is to validate that preservation works correctly while ensuring non-preserved content maintains its pre-preservation quality. This is a validation and prompt refinement phase, not new feature development.

The established approach combines two validation methods: (1) automated checks that verify preserved content appears verbatim in output, and (2) manual quality review for subjective factors like vocabulary level, slide flow, and teleprompter naturalness. This hybrid approach aligns with the CONTEXT.md decision for a small test set (3-5 lesson plans) with developer review.

For prompt refinement, the standard practice is iterative adjustment based on failure patterns. When quality issues are found (awkward flow, vocabulary mismatch, jarring preserved content), the prompts in `contentPreservationRules.ts` and the provider system prompts are refined with additional guidance or examples.

**Primary recommendation:** Create a small test corpus (3-5 lesson plans at elementary level with varying preservation density), run through all three modes (Fresh/Refine/Blend), automate verbatim preservation checks, manually review quality factors, and iterate on prompts until output matches pre-preservation baseline quality.

## Standard Stack

### Core (Already Integrated)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Jest | Existing | Automated preservation verification | Already in project |
| TypeScript | Existing | Test utilities and validation logic | Already in project |
| Manual review | N/A | Subjective quality assessment | Developer-performed |

### Supporting Utilities

| Utility | Purpose | When to Use |
|---------|---------|-------------|
| String includes/match | Check if preserved text appears in output | All automated tests |
| Regex patterns | Verify preserved content format | Checking exact wording preservation |
| Console logging | Debug output during iteration | Development/refinement phase |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual review | LLM-as-a-Judge | Adds API costs, complexity; small test set doesn't justify automation overhead |
| Custom test harness | promptfoo/DeepEval | Overkill for 3-5 test cases; developer review is faster for this scope |
| Automated vocabulary analysis | Readability libraries (readability-scores) | Small test set, elementary focus makes manual review sufficient |

**Installation:**
```bash
# No new dependencies required
# Uses existing Jest framework and manual review
```

## Architecture Patterns

### Recommended Test Structure

```
services/contentPreservation/
├── detector.ts              # Existing detection logic
├── detector.test.ts         # Existing unit tests
├── qualityTestFixtures/     # NEW: Test lesson plans
│   ├── elementary-math-sparse.md    # 1-2 preserved elements
│   ├── elementary-science-dense.md  # 5+ preserved elements
│   ├── elementary-reading.md        # Mix of questions/activities
│   └── edge-case-long-question.md   # Edge case testing
└── qualityValidation.test.ts  # NEW: Integration tests for preservation
```

### Pattern 1: Automated Preservation Verification

**What:** Test that detected content appears verbatim in generated slides
**When to use:** Every test run to catch regressions

```typescript
// Source: Jest testing patterns for content verification

describe('Preservation Quality', () => {
  it('preserves detected questions verbatim in output', async () => {
    const lessonText = `
      Today we'll learn about fractions.
      Ask students: What is 3/4 of 12?
      Then discuss how to solve it.
    `;

    // Run detection
    const detected = detectPreservableContent(lessonText);
    expect(detected.questions).toHaveLength(1);
    expect(detected.questions[0].text).toBe('What is 3/4 of 12?');

    // Generate slides (mock or real API call)
    const slides = await generateLessonSlides({
      lessonText,
      mode: 'fresh',
      gradeLevel: 'Year 3 (7-8 years old)'
    });

    // Verify preservation
    const allContent = slides.flatMap(s => [s.title, ...s.content]).join(' ');
    expect(allContent).toContain('What is 3/4 of 12?');
  });

  it('maintains preservation across all three modes', async () => {
    const testCases = [
      { mode: 'fresh', sourceField: 'lessonText' },
      { mode: 'refine', sourceField: 'presentationText' },
      { mode: 'blend', sourceField: 'lessonText' }  // Lesson wins in blend
    ];

    for (const testCase of testCases) {
      // Test each mode maintains verbatim preservation
    }
  });
});
```

### Pattern 2: Quality Checklist for Manual Review

**What:** Structured review criteria for subjective quality factors
**When to use:** After each test generation, before marking test as passing

```markdown
## Quality Review Checklist

### Non-Preserved Content Quality
- [ ] Vocabulary matches grade level (elementary = simple words)
- [ ] Complete sentences, not fragments
- [ ] Student-friendly tone (direct but approachable)
- [ ] No teacher meta-language ("students will learn...")

### Preserved Content Integration
- [ ] Preserved content feels integrated, not jarring
- [ ] Surrounding content supports preserved items
- [ ] No awkward repetition around preserved content
- [ ] Questions placed in prominent positions (titles or key bullets)

### Slide Flow
- [ ] Natural transitions between slides
- [ ] Preserved content doesn't disrupt lesson progression
- [ ] Hook -> I Do -> We Do -> You Do structure maintained

### Teleprompter Quality
- [ ] Conversational coaching style
- [ ] Preserved questions introduced naturally ("Now ask the class:")
- [ ] Timing cues present ([Wait for responses])
- [ ] Not robotic reading of slide content

### Layout Compatibility
- [ ] Content renders correctly in assigned layout
- [ ] No overflow or truncation issues
- [ ] Preserved content fits naturally in slide design
```

### Pattern 3: Prompt Refinement Workflow

**What:** Iterative process for fixing quality issues
**When to use:** When manual review identifies problems

```typescript
// Refinement workflow:

// 1. Identify failure pattern
// Example: Preserved question appears but surrounding content uses complex vocabulary

// 2. Locate relevant prompt section
// For vocabulary issues: `services/prompts/studentFriendlyRules.ts`
// For preservation integration: `services/prompts/contentPreservationRules.ts`

// 3. Add explicit guidance
// BEFORE:
const PRESERVATION_RULES = `
When preserved content is provided, you MUST:
1. Include the EXACT text of each <preserve> item
...
`;

// AFTER (with vocabulary refinement):
const PRESERVATION_RULES = `
When preserved content is provided, you MUST:
1. Include the EXACT text of each <preserve> item
2. Write surrounding content at the same vocabulary level as the grade specified
3. Do NOT use complex vocabulary to "set up" a simple preserved question

VOCABULARY AROUND PRESERVED CONTENT:
- If grade is elementary (K-5), keep supporting content simple
- Match the reading level of non-preserved bullets to the grade
- Preserved content may be at any level (teacher wrote it); surrounding content adapts
...
`;

// 4. Re-run tests
// 5. Repeat until quality matches baseline
```

### Pattern 4: Baseline Comparison for Quality Verification

**What:** Compare preservation-enabled output to pre-preservation baseline
**When to use:** When assessing if preservation degrades quality

```typescript
// Baseline comparison approach:

// 1. Generate slides WITHOUT preservation rules (baseline)
const baselineSlides = await generateLessonSlides({
  lessonText,
  mode: 'fresh',
  // Temporarily remove preservation from system prompt
});

// 2. Generate slides WITH preservation rules
const preservedSlides = await generateLessonSlides({
  lessonText,
  mode: 'fresh',
  // Normal flow with preservation
});

// 3. Compare non-preserved content quality
// - Vocabulary complexity should be similar
// - Sentence structure should be similar
// - Tone should match

// Note: This is primarily a manual comparison, but can log both outputs
// side-by-side for easier review
```

### Anti-Patterns to Avoid

- **Over-automation for small test sets:** Don't build complex evaluation pipelines for 3-5 test cases. Manual review is faster and more accurate for this scope.
- **Testing only happy path:** Don't skip edge cases (dense preservation, long questions). Include at least one edge case in test corpus.
- **Fixing prompts without root cause analysis:** Don't add random guidance. Identify WHY the failure occurs, then add targeted fix.
- **Ignoring teleprompter quality:** Don't only check slide content. Teleprompter is equally important for teacher experience.
- **Testing only one mode:** Don't assume Fresh mode results apply to Refine/Blend. Each mode has different detection sources and thresholds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Automated vocabulary analysis | Custom word complexity scoring | Manual review + grade-level judgment | Small test set, subjective quality bar |
| LLM-as-Judge evaluation | Custom evaluation prompts | Direct comparison to baseline | Adds API costs, complexity for 3-5 tests |
| Automated slide flow analysis | Transition quality scoring | Manual review checklist | Subjective quality, hard to automate accurately |
| Comprehensive regression suite | Large test corpus | Focused 3-5 lesson plans | Phase scope is validation, not CI/CD |

**Key insight:** Phase 50 is about validating a feature works correctly and refining prompts based on findings. The small scope (3-5 test cases, developer review) doesn't justify building automated quality infrastructure. Manual review with clear checklists is the appropriate approach.

## Common Pitfalls

### Pitfall 1: Testing Wrong Vocabulary Level

**What goes wrong:** Tests use Year 6 lesson plans but CONTEXT.md specifies elementary focus (K-5)
**Why it happens:** Prior phases defaulted to Year 6 as the grade level
**How to avoid:** Create test fixtures specifically at K-5 level. Use simpler vocabulary in lesson plans. Set gradeLevel parameter explicitly in tests.
**Warning signs:** Output vocabulary seems appropriate but doesn't match elementary expectations

### Pitfall 2: Only Testing Sparse Preservation

**What goes wrong:** Tests pass with 1-2 preserved items but fail with 5+ items
**Why it happens:** Dense preservation stresses token limits and slide organization
**How to avoid:** CONTEXT.md requires "dense (5+) scenarios". Include at least one test case with 5+ preserved elements.
**Warning signs:** Dense lesson plans produce incomplete or poorly organized slides

### Pitfall 3: Skipping Mode Coverage

**What goes wrong:** Fresh mode works but Refine mode breaks
**Why it happens:** Each mode has different detection sources (lessonText vs presentationText)
**How to avoid:** CONTEXT.md requires "All three modes (Fresh, Refine, Blend)". Create test fixture that works across modes.
**Warning signs:** Users report preservation works for lesson plans but not presentations

### Pitfall 4: Ignoring Teleprompter Quality

**What goes wrong:** Slides look good but teleprompter reads robotically
**Why it happens:** Focus on visual output, forget speaker notes are equally important
**How to avoid:** Include teleprompter in quality checklist. Check for natural introduction of preserved content.
**Warning signs:** Teacher reports awkward delivery when following teleprompter

### Pitfall 5: Prompt Bloat During Refinement

**What goes wrong:** Fixing issues by adding more and more guidance, eventually exceeding token limits
**Why it happens:** Additive fixes without removing obsolete instructions
**How to avoid:** Refine by replacement, not accumulation. When adding guidance, check if existing guidance can be consolidated.
**Warning signs:** System prompts grow significantly during refinement phase

### Pitfall 6: Failing to Document Prompt Changes

**What goes wrong:** Quality improves but changes aren't tracked, making future debugging hard
**Why it happens:** Iterative refinement without version control discipline
**How to avoid:** Commit each prompt refinement with descriptive message. Document why the change was made.
**Warning signs:** Unable to explain why a particular instruction exists in the prompt

## Code Examples

### Example 1: Test Fixture for Elementary Math (Sparse)

```markdown
# Fractions Introduction (Grade 3)

## Hook
Today we're going to learn about sharing things equally!

## I Do
Ask students: What is 1/2 of 8?

Show them how to divide 8 into 2 equal groups.

## We Do
Let's try together. Complete this activity: Draw 12 circles and color half of them.

## You Do
Practice problems on worksheet.
```

Expected detections:
- Question: "What is 1/2 of 8?" (high confidence)
- Activity: "Draw 12 circles and color half of them." (high confidence)

### Example 2: Test Fixture for Elementary Science (Dense)

```markdown
# The Water Cycle (Grade 4)

## Introduction
Ask: What happens to water when it rains?
Question: Where does rain come from?

## Evaporation
Key question: How does water get into the air?
Note: This is the most important concept!

## Condensation
Ask students: What are clouds made of?
Important: Demonstrate with cold glass experiment.

## Precipitation
Q1: Why does it rain?
Q2: What other forms can precipitation take?

## Activity
List 3 examples of where you see water in daily life.
Discuss with your partner how water moves through the cycle.
Compare the water cycle to cooking pasta (water boils, steam rises, condenses on lid).
```

Expected detections: 7+ items (questions + activities)

### Example 3: Automated Preservation Check

```typescript
// services/contentPreservation/qualityValidation.test.ts

import { detectPreservableContent } from './detector';
import { generateLessonSlides } from '../providers/claudeProvider'; // or mock

describe('Preservation Integration Quality', () => {
  const elementaryMathSparse = `
    Today we're learning about fractions.
    Ask students: What is 1/2 of 8?
    Show them how to divide.
  `;

  it('preserves question verbatim in Fresh mode', async () => {
    const detected = detectPreservableContent(elementaryMathSparse);

    // Verify detection works
    expect(detected.questions.length).toBeGreaterThan(0);
    const expectedQuestion = 'What is 1/2 of 8?';
    expect(detected.questions.some(q => q.text.includes(expectedQuestion))).toBe(true);

    // Generate slides (requires API key in test environment)
    // In CI, this would be mocked
    const slides = await generateLessonSlides({
      lessonText: elementaryMathSparse,
      mode: 'fresh',
      gradeLevel: 'Year 3 (7-8 years old)'
    });

    // Verify preservation in output
    const slideContent = slides.flatMap(s => [s.title, ...s.content]).join('\n');
    expect(slideContent).toContain(expectedQuestion);
  });

  it('uses appropriate vocabulary for elementary grade', async () => {
    const slides = await generateLessonSlides({
      lessonText: elementaryMathSparse,
      mode: 'fresh',
      gradeLevel: 'Year 3 (7-8 years old)'
    });

    // Log for manual review
    console.log('=== VOCABULARY REVIEW ===');
    slides.forEach((slide, i) => {
      console.log(`Slide ${i + 1}: ${slide.title}`);
      slide.content.forEach(bullet => console.log(`  - ${bullet}`));
    });
    console.log('=========================');

    // Basic automated checks
    const allContent = slides.flatMap(s => s.content).join(' ');

    // Should not contain overly complex words for Year 3
    const complexWords = ['photosynthesis', 'nevertheless', 'consequently'];
    complexWords.forEach(word => {
      expect(allContent.toLowerCase()).not.toContain(word);
    });
  });

  it('teleprompter introduces preserved question naturally', async () => {
    const slides = await generateLessonSlides({
      lessonText: elementaryMathSparse,
      mode: 'fresh',
      gradeLevel: 'Year 3 (7-8 years old)'
    });

    // Find slide with preserved question
    const slideWithQuestion = slides.find(s =>
      s.content.some(c => c.includes('1/2 of 8'))
    );

    expect(slideWithQuestion).toBeDefined();

    // Check teleprompter has delivery guidance
    const notes = slideWithQuestion!.speakerNotes;

    // Should have some form of introduction phrase
    const hasIntro = /ask|question|check/i.test(notes);
    expect(hasIntro).toBe(true);

    // Log for manual quality review
    console.log('=== TELEPROMPTER REVIEW ===');
    console.log(notes);
    console.log('===========================');
  });
});
```

### Example 4: Quality Review Template

```markdown
# Quality Review: [Test Case Name]

**Date:** YYYY-MM-DD
**Mode:** Fresh / Refine / Blend
**Grade Level:** [e.g., Year 3]
**Preserved Elements:** [count]

## Preservation Verification

| Detected Content | Found in Output? | Location |
|------------------|------------------|----------|
| [question 1] | Yes/No | Slide X, bullet Y |
| [activity 1] | Yes/No | Slide X, bullet Y |

## Non-Preserved Content Quality

- [ ] Vocabulary appropriate for grade
- [ ] Student-friendly tone
- [ ] Complete sentences
- [ ] No teacher meta-language

**Notes:** [observations]

## Preserved Content Integration

- [ ] Content feels integrated
- [ ] Supporting context present
- [ ] No awkward repetition
- [ ] Prominent placement

**Notes:** [observations]

## Slide Flow

- [ ] Natural transitions
- [ ] Logical progression
- [ ] Structure maintained (Hook, I Do, We Do, You Do)

**Notes:** [observations]

## Teleprompter Quality

- [ ] Conversational style
- [ ] Natural question introduction
- [ ] Timing cues present
- [ ] Not robotic

**Notes:** [observations]

## Overall Assessment

- [ ] PASS - Quality matches baseline
- [ ] NEEDS REFINEMENT - [specific issue]

## Prompt Refinement Needed

[If NEEDS REFINEMENT, describe specific prompt changes required]
```

### Example 5: Prompt Refinement for Vocabulary Issue

```typescript
// BEFORE: contentPreservationRules.ts

const PRESERVATION_RULES = `
CONTENT PRESERVATION RULES:

When preserved content is provided, you MUST:
1. Include the EXACT text of each <preserve> item on an appropriate slide
2. Match wording, punctuation, and capitalization precisely
3. Place questions in prominent positions (titles or key bullet points)
4. Place activities as clear instructions students can follow
`;

// AFTER: With vocabulary refinement based on quality review finding

const PRESERVATION_RULES = `
CONTENT PRESERVATION RULES:

When preserved content is provided, you MUST:
1. Include the EXACT text of each <preserve> item on an appropriate slide
2. Match wording, punctuation, and capitalization precisely
3. Place questions in prominent positions (titles or key bullet points)
4. Place activities as clear instructions students can follow

VOCABULARY AROUND PRESERVED CONTENT:
- Supporting content (non-preserved bullets) must match the grade level specified
- Do NOT use complex vocabulary to "introduce" or "set up" a simple preserved question
- If the grade is elementary (K-5), use simple words: "Let's see" not "Let us examine"
- The preserved content may use any vocabulary (teacher wrote it); YOUR content adapts

Example - GOOD:
Preserved: "What is 1/2 of 8?"
Your bullet: "Let's try this question together"  (simple vocabulary)

Example - BAD:
Preserved: "What is 1/2 of 8?"
Your bullet: "Now we shall examine a mathematical inquiry"  (too complex)
`;
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Automated LLM-as-Judge for all validation | Hybrid: automated for verbatim, manual for quality | Cost-effective for small test sets |
| Comprehensive regression suites | Focused validation with 3-5 test cases | Appropriate for validation phase scope |
| Single-pass prompt writing | Iterative refinement based on quality review | Better alignment with quality bar |

**Current best practices (2026):**
- LLM-as-Judge useful for scale (500x-5000x cost savings over human review) but overkill for 3-5 test cases
- Manual review achieves 80%+ agreement with automated evaluation for small sets
- Hybrid approach (automated for objective checks, manual for subjective) is standard for validation phases

## Open Questions

1. **Optimal test case count**
   - What we know: CONTEXT.md says "Small (3-5 lesson plans)"
   - What's unclear: Is 3 sufficient or should we aim for 5?
   - Recommendation: Start with 3 covering sparse/dense/edge-case, add more if gaps found

2. **Baseline comparison methodology**
   - What we know: Quality bar is "indistinguishable from pre-preservation"
   - What's unclear: Should we generate formal baselines or use subjective comparison?
   - Recommendation: Generate baseline once for reference, then subjectively compare

3. **When to stop iterating**
   - What we know: Iterate "until quality matches baseline"
   - What's unclear: How many iterations before declaring the feature ready?
   - Recommendation: Maximum 3 iteration cycles; if still failing, escalate to design review

4. **CI/CD integration**
   - What we know: Phase 50 is validation, not production testing
   - What's unclear: Should any tests persist into CI after phase completes?
   - Recommendation: Keep automated verbatim checks; manual review is one-time validation

## Sources

### Primary (HIGH confidence)

- Codebase: `services/contentPreservation/detector.ts` - Detection implementation
- Codebase: `services/prompts/contentPreservationRules.ts` - Preservation rules
- Codebase: `services/providers/claudeProvider.ts` - Claude integration
- Codebase: `services/geminiService.ts` - Gemini integration
- Phase 49 RESEARCH: Integration patterns and pitfalls
- Phase 50 CONTEXT: User decisions on test coverage and quality bar

### Secondary (MEDIUM confidence)

- [LLM Testing in 2026: Top Methods and Strategies](https://www.confident-ai.com/blog/llm-testing-in-2024-top-methods-and-strategies) - Industry testing approaches
- [LLM-as-a-Judge: Complete Guide](https://www.evidentlyai.com/llm-guide/llm-as-a-judge) - Evaluation patterns
- [AI Content Quality Control Guide 2026](https://koanthic.com/en/ai-content-quality-control-complete-guide-for-2026-2/) - Quality control frameworks

### Tertiary (LOW confidence)

- General prompt engineering best practices from training data
- Testing pattern intuition from Jest/TypeScript experience

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, uses existing tools
- Architecture: HIGH - Patterns derived from codebase and industry standards
- Pitfalls: MEDIUM - Based on common quality assurance challenges, not empirically tested in this context

**Research date:** 2026-02-01
**Valid until:** 60 days (stable domain, validation patterns change slowly)

**Notes for planner:**
- No new npm dependencies required
- Test fixtures are markdown files representing lesson plans
- Automated tests can run with mocked API or real API (with key)
- Manual review is developer-performed, not user-facing
- Prompt refinements should be committed with descriptive messages
- Focus on elementary grade level per CONTEXT.md decision
