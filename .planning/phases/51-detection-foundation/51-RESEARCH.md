# Phase 51: Detection Foundation - Research

**Researched:** 2026-02-01
**Domain:** Pattern matching and content detection in educational lesson text
**Confidence:** HIGH

## Summary

Phase 51 focuses on building the detection layer for "teachable moments" - problem-answer pairs in lesson content that should trigger delayed answer reveal. This is a pure detection phase with no AI prompt changes, no UI modifications, and no presentation behavior changes.

The existing codebase has a robust content detection pattern in `services/contentPreservation/detector.ts` that detects questions, activities, and instructions. This phase extends that architecture with a new `detectTeachableMoments()` function that pairs problems with their answers within proximity thresholds.

The core challenge is **precision over recall**: detecting too many teachable moments fragments lesson flow (research shows >30% of bullets flagged causes "over-detection tsunami"). The detection must be conservative, flagging only clear problem-answer pairs with high confidence.

**Primary recommendation:** Extend the existing `contentPreservation/detector.ts` with a new `TeachableMoment` interface and `detectTeachableMoments()` function using proximity-based answer pairing. Apply content type classification at detection time to inform later scaffolding phases.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pure TypeScript | - | Pattern matching via regex | Already used in detector.ts; pure functions are testable, deterministic |
| Vitest | - | Unit testing | Already configured in project; excellent for pure function testing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Detection is pure pattern matching - no external dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex patterns | AI classification | Deterministic detection preferred; AI adds latency and non-determinism |
| Character-based proximity | Semantic proximity | Character counting is simpler, predictable, and sufficient for MVP |

**Installation:**
```bash
# No new dependencies required
# Uses existing project infrastructure
```

## Architecture Patterns

### Recommended Project Structure
```
services/
  contentPreservation/
    types.ts           # ADD: TeachableMoment, ContentCategory types
    detector.ts        # ADD: detectTeachableMoments(), content classification
    detector.test.ts   # ADD: comprehensive test cases for new detection
```

### Pattern 1: Proximity-Based Answer Detection
**What:** Match problems (questions, calculations, examples) with answers that appear within a character-distance threshold.
**When to use:** Always - this is the core detection strategy.
**Example:**
```typescript
// Source: Cue codebase pattern (contentPreservation/detector.ts)
export interface TeachableMoment {
  problem: DetectedContent;      // The question/problem portion
  answer: DetectedContent | null; // The paired answer (null if not found)
  contentCategory: ContentCategory; // 'math' | 'vocabulary' | 'comprehension' | 'science' | 'general'
  confidence: ConfidenceLevel;
  proximityChars: number;        // Distance in characters between problem and answer
}

const PROXIMITY_THRESHOLD = 200; // Characters between problem end and answer start
```

### Pattern 2: Content Type Classification via Keywords
**What:** Classify detected teachable moments by content type to inform scaffolding selection later.
**When to use:** At detection time, based on keyword analysis in the problem/answer text.
**Example:**
```typescript
// Content type detection patterns
const MATH_SIGNALS = [
  /\d+\s*[+\-*/]\s*\d+/,           // "3 + 4", "12 / 3"
  /=\s*\d+/,                        // "= 15"
  /\d+%/,                           // "10%"
  /calculate|solve|how many|what is.*\d/i, // Action verbs with numbers
  /fraction|percent|area|perimeter|sum|difference/i
];

const VOCABULARY_SIGNALS = [
  /\bmeans?\b/i,                    // "X means Y"
  /\bis defined as\b/i,
  /\bvocabulary\b|\bdefinition\b/i,
  /synonyms?|antonyms?/i
];

const COMPREHENSION_SIGNALS = [
  /\bbecause\b.*\b(therefore|so|thus)\b/i,
  /\bwhy does\b|\bwhy did\b/i,
  /\bwhat.*happen/i,
  /cause.*effect|effect.*cause/i
];

const SCIENCE_SIGNALS = [
  /experiment|hypothesis|observe|predict/i,
  /photosynthesis|evaporation|condensation/i,
  /chemical|reaction|energy|force/i
];
```

### Pattern 3: Conservative Detection with Throttling
**What:** Limit detection density to preserve lesson flow.
**When to use:** Always - this is a core requirement (DET-02).
**Example:**
```typescript
// Apply throttling: max teachable moments per text block
function throttleDetections(
  moments: TeachableMoment[],
  maxPercent: number = 0.30  // 30% threshold from requirements
): TeachableMoment[] {
  // If too many moments detected, keep only highest confidence
  // Sort by confidence, then by proximity (closer answers = higher quality)
  return moments
    .sort((a, b) => {
      const confOrder = { high: 0, medium: 1, low: 2 };
      const confDiff = confOrder[a.confidence] - confOrder[b.confidence];
      if (confDiff !== 0) return confDiff;
      return a.proximityChars - b.proximityChars;
    })
    .slice(0, Math.floor(totalBullets * maxPercent));
}
```

### Anti-Patterns to Avoid
- **Over-broad regex:** Matching too many patterns leads to false positives. Test edge cases extensively.
- **AI-based detection:** Non-deterministic; same input could produce different teachable moments. Use pure functions.
- **Ignoring context:** "What a great question!" is rhetorical, not a teachable moment. Apply rhetorical filtering.
- **No proximity limit:** Answers far from problems are likely unrelated. Enforce proximity threshold.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Question detection | New question regex | Existing `detectQuestions()` | Already handles rhetorical filtering, punctuation, context prefixes |
| Activity detection | New activity regex | Existing `detectActivities()` | Already has Bloom's taxonomy verbs, imperative vs descriptive |
| Deduplication | Manual overlap detection | Existing `deduplicateOverlapping()` | Handles start/end index overlaps with confidence sorting |
| XML escaping | Manual string replace | Existing `escapeXml()` | Handles &, <, >, ", ' properly |

**Key insight:** The content preservation system already solves the hard detection problems. Teachable moment detection is an extension (pairing problems with answers), not a replacement.

## Common Pitfalls

### Pitfall 1: Over-Detection Tsunami
**What goes wrong:** More than 30% of bullets flagged as teachable moments, fragmenting lesson flow.
**Why it happens:** Regex patterns too broad; treating every question as a teachable moment.
**How to avoid:**
- Require BOTH problem AND answer to be detected (not just questions)
- Enforce proximity threshold (200 chars)
- Apply throttling mechanism (max 30% of content)
**Warning signs:** Detection tests show high flagging rate on sample lesson plans.

### Pitfall 2: Answer Leakage Detection
**What goes wrong:** Problem detection captures the answer inline (e.g., "What is 3/4 of 12? The answer is 9.").
**Why it happens:** Regex captures beyond the question mark.
**How to avoid:**
- Terminate problem detection at sentence boundary (?, !, .)
- Start answer detection AFTER problem end index
- Validate answer doesn't overlap with problem text
**Warning signs:** TeachableMoment.problem.text contains the answer.

### Pitfall 3: False Math Detection
**What goes wrong:** Phone numbers, dates, and page references detected as math problems.
**Why it happens:** Simple numeric patterns match non-mathematical content.
**How to avoid:**
- Require math operators (+, -, *, /, =) near numbers
- Exclude patterns like "page 12", "chapter 3", "1992"
- Test against real lesson plans with incidental numbers
**Warning signs:** Dates and references flagged as math problems.

### Pitfall 4: Missed Q&A Patterns
**What goes wrong:** Numbered Q&A pairs not detected (e.g., "Q1: What is X? A1: Y").
**Why it happens:** Only looking for "Answer:" pattern, missing "A1:", "A:", etc.
**How to avoid:**
- Include numbered answer patterns: `/A\d*[:.]?\s*/i`
- Include shorthand: `/(?:Answer|Ans|A)[:=]\s*/i`
- Test with various lesson plan formats
**Warning signs:** Q&A pairs in test files not detected.

### Pitfall 5: Rhetorical Moment Detection
**What goes wrong:** Rhetorical questions paired with subsequent statements as "answers".
**Why it happens:** Proximity matching without rhetorical filtering.
**How to avoid:**
- Apply existing rhetorical detection from `detectQuestions()`
- Only create TeachableMoment if problem.confidence !== 'low'
- Test against enthusiasm markers ("Isn't it amazing?")
**Warning signs:** Rhetorical questions appear in teachable moment output.

## Code Examples

Verified patterns from the existing codebase:

### Existing Question Detection (Foundation)
```typescript
// Source: services/contentPreservation/detector.ts
const questionMarkPattern = /([^.!?\n]*\?)/g;
let match;
while ((match = questionMarkPattern.exec(text)) !== null) {
  const questionText = match[1].trim();
  if (questionText.length < 3) continue;

  const confidence: ConfidenceLevel = isRhetorical(questionText) ? 'low' : 'high';
  results.push({
    type: 'question',
    text: questionText,
    confidence,
    detectionMethod: 'punctuation',
    startIndex: match.index,
    endIndex: questionMarkPattern.lastIndex
  });
}
```

### New: Answer Detection Patterns
```typescript
// Recommended implementation for answer detection
const ANSWER_PATTERNS = [
  // Explicit answer markers
  /(?:Answer|A|Ans)\s*[:=]\s*([^.!?\n]+[.!?]?)/gi,

  // Numbered answers: "A1:", "A2.", etc.
  /A\d+\s*[:.]?\s*([^.!?\n]+[.!?]?)/gi,

  // Math results: "= 15", "equals 42"
  /(?:=|equals)\s+(\d+(?:\.\d+)?(?:\s*(?:square\s+)?(?:units?|cm|m|kg|ml|l))?)/gi,

  // Definition patterns: "X is Y"
  // Note: Handled separately due to overlap with problem patterns
];
```

### New: Content Category Classification
```typescript
// Recommended implementation for DET-03
function classifyContentCategory(problemText: string, answerText: string): ContentCategory {
  const combined = `${problemText} ${answerText}`.toLowerCase();

  // Check in priority order (most specific first)
  if (MATH_SIGNALS.some(pattern => pattern.test(combined))) {
    return 'math';
  }
  if (VOCABULARY_SIGNALS.some(pattern => pattern.test(combined))) {
    return 'vocabulary';
  }
  if (SCIENCE_SIGNALS.some(pattern => pattern.test(combined))) {
    return 'science';
  }
  if (COMPREHENSION_SIGNALS.some(pattern => pattern.test(combined))) {
    return 'comprehension';
  }
  return 'general';
}
```

### New: Teachable Moment Aggregation
```typescript
// Recommended implementation for main detection function
export function detectTeachableMoments(text: string): TeachableMoment[] {
  const questions = detectQuestions(text);
  const results: TeachableMoment[] = [];

  for (const question of questions) {
    // Skip rhetorical questions
    if (question.confidence === 'low') continue;

    // Look for answer within proximity window
    const searchStart = question.endIndex;
    const searchEnd = Math.min(text.length, question.endIndex + PROXIMITY_THRESHOLD);
    const searchText = text.slice(searchStart, searchEnd);

    const answer = findAnswerInRange(searchText, searchStart);

    if (answer) {
      const category = classifyContentCategory(question.text, answer.text);
      results.push({
        problem: question,
        answer,
        contentCategory: category,
        confidence: answer.confidence,
        proximityChars: answer.startIndex - question.endIndex
      });
    }
  }

  // Apply throttling if too many detected
  return throttleDetections(results);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI-based classification | Rule-based detection | This implementation | Deterministic, testable, no latency |
| Flat content preservation | Paired problem-answer detection | This phase | Enables delay-reveal feature |

**Deprecated/outdated:**
- N/A - This is a new feature building on stable patterns

## Open Questions

Things that couldn't be fully resolved:

1. **Proximity threshold optimal value**
   - What we know: 200 chars is a reasonable starting point based on typical Q&A formatting
   - What's unclear: Optimal value may vary by content type (math vs. comprehension)
   - Recommendation: Start with 200, make configurable, tune based on real lesson plan testing

2. **Math expression complexity**
   - What we know: Simple patterns (3+4=7) are detectable
   - What's unclear: How to handle complex expressions (fractions, multi-step)
   - Recommendation: MVP handles simple patterns; expand in later iterations

3. **Content category accuracy**
   - What we know: Keyword-based classification works for clear cases
   - What's unclear: Edge cases where content spans multiple categories
   - Recommendation: Default to 'general' when ambiguous; refine based on usage

## Sources

### Primary (HIGH confidence)
- Cue codebase: `services/contentPreservation/detector.ts` - Existing detection patterns
- Cue codebase: `services/contentPreservation/types.ts` - Type definitions
- Cue codebase: `services/prompts/contentPreservationRules.ts` - Prompt integration pattern
- `.planning/research/ARCHITECTURE-delay-answer-reveal.md` - Architecture decisions
- `.planning/research/PITFALLS-delay-answer-reveal.md` - Pitfall research

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES-v3.9-answer-delay.md` - Feature landscape research
- `.planning/todos/pending/2026-02-01-delay-answer-reveal-with-scaffolding-strategy.md` - Original requirements

### Tertiary (LOW confidence)
- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing patterns, no new dependencies
- Architecture: HIGH - Extends proven detection system
- Pitfalls: HIGH - Based on codebase analysis and prior research

**Research date:** 2026-02-01
**Valid until:** 30 days (stable domain, no external dependencies)
