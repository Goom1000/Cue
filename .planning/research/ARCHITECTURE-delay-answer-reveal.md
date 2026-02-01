# Architecture: Delay Answer Reveal

**Feature:** Delay Answer Reveal (v3.9)
**Researched:** 2026-02-01
**Confidence:** HIGH

## Executive Summary

Delay Answer Reveal leverages Cue's existing progressive bullet disclosure system. The AI already generates slides with sequential bullets revealed one at a time. This feature extends that pattern by:

1. Detecting "teachable moments" (problems with answers) in source material
2. Splitting problem/answer into separate, consecutive bullets
3. Generating scaffolding guidance in the teleprompter between problem and answer bullets

**This is primarily a prompt engineering task.** The slide structure (`content: string[]`) already supports the required behavior. No new types, components, or APIs are needed.

## Existing Architecture (What We Have)

### Data Flow Overview

```
+------------------+     +-----------------------+     +--------------------+
|  PDF Upload      |---->|  Content Detection    |---->|  AI Generation     |
|  (lessonText)    |     |  (detector.ts)        |     |  (provider.ts)     |
+------------------+     +-----------------------+     +--------------------+
                                  |                              |
                                  v                              v
                        +-----------------------+     +--------------------+
                        |  PreservableContent   |---->|  System Prompt     |
                        |  {questions, etc}     |     |  with Preservation |
                        +-----------------------+     +--------------------+
                                                               |
                                                               v
                                                      +--------------------+
                                                      |  Slide[]           |
                                                      |  - content[]       |
                                                      |  - speakerNotes    |
                                                      +--------------------+
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Slide.content` | `types.ts:7` | Bullet array - revealed progressively |
| `Slide.speakerNotes` | `types.ts:8` | Teleprompter script with segments |
| `detectPreservableContent()` | `contentPreservation/detector.ts` | Finds questions/activities in source |
| `getPreservationRules()` | `prompts/contentPreservationRules.ts` | Builds XML tags for AI prompt |
| `getTeleprompterPreservationRules()` | `prompts/contentPreservationRules.ts` | Adds speaker note guidance |
| `getSystemInstructionForMode()` | `geminiService.ts` / `claudeProvider.ts` | Builds full system prompt |

### Progressive Disclosure System

The presentation mode already reveals bullets one at a time:

```typescript
// From types.ts
export interface Slide {
  content: string[];      // Bullet points revealed sequentially
  speakerNotes: string;   // Segments delimited by pointing_right emoji
}

// Teleprompter format (from geminiService.ts)
// Segment 0 (Intro): Before any bullets
// Segment 1: After Bullet 1 revealed
// Segment 2: After Bullet 2 revealed
// ... Segments = Bullets + 1
```

### Content Preservation System (v3.8)

The existing system detects questions and activities:

```typescript
// From contentPreservation/types.ts
export interface DetectedContent {
  type: 'question' | 'activity' | 'instruction';
  text: string;
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: 'punctuation' | 'context' | 'numbered-list' | 'action-verb' | 'instruction-prefix';
  startIndex: number;
  endIndex: number;
}
```

Detection methods in `detector.ts`:
- **Questions:** Punctuation (`?`), context (`Ask:`, `Question:`), numbered lists
- **Activities:** Bloom's taxonomy action verbs (`List`, `Solve`, `Compare`)
- **Instructions:** Markers (`Note:`, `Remember:`, `Important:`)

## Proposed Architecture (What We Need)

### Approach: Extend Detection + Enhance Prompts

**No new components needed.** We extend the existing detection system and prompt engineering.

### Phase 1: Teachable Moment Detection

Extend `detector.ts` to identify question-answer pairs:

```typescript
// NEW detection pattern for teachable moments
export interface TeachableMoment {
  problem: DetectedContent;      // The question/problem
  answer: DetectedContent | null; // The answer (if detected)
  confidence: ConfidenceLevel;
  proximity: number;             // Character distance between problem and answer
}

// Detection heuristics:
// 1. Question followed by "Answer:" or "A:" within ~200 chars
// 2. Math problem followed by "=" or "is equal to"
// 3. Activity with explicit expected output
// 4. Numbered Q&A pairs (Q1/A1 pattern)
```

Detection patterns to add:
```typescript
// Answer proximity patterns
const ANSWER_PATTERNS = [
  /(?:Answer|A)\s*[:=]\s*([^.!?\n]+)/i,    // "Answer: 42" or "A: 42"
  /=\s*(\d+(?:\.\d+)?)/,                    // "3/4 of 12 = 9"
  /(?:is|equals)\s+([^.!?\n]+)/i,           // "The answer is 9"
];
```

### Phase 2: Prompt Engineering Enhancement

Add new rules to `contentPreservationRules.ts`:

```typescript
// NEW: Teachable moment formatting rules
const TEACHABLE_MOMENT_RULES = `
TEACHABLE MOMENT FORMATTING:

When you detect a question-with-answer (teachable moment):

1. BULLET STRUCTURE:
   - Bullet N: The PROBLEM/QUESTION only (no answer)
   - Bullet N+1: The ANSWER revealed separately

2. TELEPROMPTER STRUCTURE:
   - Segment N (after problem bullet): Scaffolding guidance
     - Probing questions to guide student thinking
     - "What do we know?" / "What are we trying to find?"
     - Wait time cues: "[PAUSE - give them 10 seconds to think]"
   - Segment N+1 (after answer bullet): Confirmation/extension
     - Celebrate correct reasoning
     - Address common misconceptions

EXAMPLE INPUT:
"What is 3/4 of 12? The answer is 9."

EXAMPLE OUTPUT:
Bullet 3: "What is 3/4 of 12?"
Bullet 4: "The answer is 9"
Teleprompter Segment 3: "Ask: What is 3/4 of 12? [PAUSE for thinking]
  Prompt: How many equal parts? (4) So what's 12 divided by 4? (3)
  Now we need 3 of those parts... [WAIT for hands]"
Teleprompter Segment 4: "The answer is 9! Great thinking.
  [For strugglers: Draw 12 objects, circle groups of 3]"
`;
```

### Phase 3: Integration Points

Modify the existing flow in `geminiService.ts` / `claudeProvider.ts`:

```typescript
// In getSystemInstructionForMode() - existing function
function getSystemInstructionForMode(
  mode: GenerationMode,
  verbosity: VerbosityLevel = 'standard',
  gradeLevel: string = 'Year 6 (10-11 years old)',
  preservableContent?: PreservableContent,
  teachableMoments?: TeachableMoment[]  // NEW parameter
): string {
  // ... existing code ...

  // NEW: Add teachable moment rules if any detected
  const teachableMomentRules = teachableMoments && teachableMoments.length > 0
    ? getTeachableMomentRules(teachableMoments)
    : '';

  // Include in system prompt
  return `
    ${existingPrompt}
    ${teachableMomentRules}
  `;
}
```

## Component Boundaries

### What Changes

| Component | Change Type | Description |
|-----------|-------------|-------------|
| `contentPreservation/types.ts` | ADD | `TeachableMoment` interface |
| `contentPreservation/detector.ts` | ADD | `detectTeachableMoments()` function |
| `prompts/contentPreservationRules.ts` | ADD | `getTeachableMomentRules()` function |
| `geminiService.ts` | MODIFY | Pass teachable moments to system prompt |
| `claudeProvider.ts` | MODIFY | Pass teachable moments to system prompt |

### What Does NOT Change

| Component | Why Unchanged |
|-----------|---------------|
| `Slide` type | Already has `content[]` and `speakerNotes` |
| `SlideContent` rendering | Already handles progressive bullet reveal |
| `Teleprompter` component | Already parses segment delimiters |
| `AIProviderInterface` | Same `generateLessonSlides()` signature |
| Presentation mode | Already reveals bullets sequentially |

## Data Flow (Enhanced)

```
+------------------+     +-----------------------+     +--------------------+
|  PDF Upload      |---->|  Content Detection    |---->|  NEW: Teachable    |
|  (lessonText)    |     |  (detector.ts)        |     |  Moment Detection  |
+------------------+     +-----------------------+     +--------------------+
                                                               |
                                  +----------------------------+
                                  v
                        +-----------------------+
                        |  TeachableMoment[]    |
                        |  + PreservableContent |
                        +-----------------------+
                                  |
                                  v
                        +-----------------------+
                        |  Enhanced System      |
                        |  Prompt with Rules    |
                        +-----------------------+
                                  |
                                  v
                        +-----------------------+
                        |  AI Generation        |
                        |  (Claude/Gemini)      |
                        +-----------------------+
                                  |
                                  v
                        +-----------------------+
                        |  Slide[] with:        |
                        |  - Split problem/answer|
                        |  - Scaffolding notes  |
                        +-----------------------+
```

## Prompt Engineering Strategy

### Detection-to-Prompt Pattern

Following v3.8's successful pattern:

1. **Detect** content client-side (pure functions, fast, deterministic)
2. **Format** as XML tags in system prompt
3. **Instruct** AI how to handle detected content
4. **Few-shot** examples for edge cases

### Teachable Moment Prompt Structure

```xml
<teachable_moments>

<moment type="math-problem">
  <problem>What is 3/4 of 12?</problem>
  <answer>9</answer>
</moment>

<moment type="comprehension">
  <problem>Why do plants need sunlight?</problem>
  <answer>For photosynthesis to produce energy</answer>
</moment>

<formatting_rules>
1. Split problem and answer into consecutive bullets
2. Teleprompter between them provides scaffolding
3. Never reveal answer on same bullet as problem
</formatting_rules>

<few_shot_examples>
<!-- Examples here -->
</few_shot_examples>

</teachable_moments>
```

### Scaffolding Strategy Templates

Different subjects need different scaffolding approaches:

| Subject | Scaffolding Approach |
|---------|---------------------|
| Math | "What operation?" "What numbers?" "Estimate first" |
| Reading | "What clues in the text?" "What do we already know?" |
| Science | "What's our hypothesis?" "What evidence supports this?" |
| General | "Think-pair-share" "Thumbs up when you have an idea" |

## Build Order (Suggested Phases)

### Phase 1: Detection Foundation (Minimal Change)
**Goal:** Detect problem-answer pairs in source material

1. Add `TeachableMoment` type to `types.ts`
2. Add `detectTeachableMoments()` to `detector.ts`
3. Add unit tests for detection patterns
4. No AI changes yet - just detection

**Files touched:**
- `services/contentPreservation/types.ts`
- `services/contentPreservation/detector.ts`
- `services/contentPreservation/detector.test.ts`

### Phase 2: Prompt Engineering (Core Feature)
**Goal:** AI generates split bullets with scaffolding

1. Add `getTeachableMomentRules()` to `contentPreservationRules.ts`
2. Integrate into `getSystemInstructionForMode()` in both providers
3. Add few-shot examples for edge cases
4. Manual testing with sample lesson plans

**Files touched:**
- `services/prompts/contentPreservationRules.ts`
- `services/geminiService.ts`
- `services/providers/claudeProvider.ts`

### Phase 3: Scaffolding Templates (Enhancement)
**Goal:** Subject-specific scaffolding guidance

1. Add subject detection heuristic (math keywords, science terms)
2. Include subject-appropriate scaffolding templates in prompt
3. Add grade-level scaffolding adjustments
4. Quality testing with diverse lesson plans

**Files touched:**
- `services/prompts/contentPreservationRules.ts` (expanded)
- Possibly new `services/prompts/scaffoldingTemplates.ts`

### Phase 4: Quality Assurance
**Goal:** Validate across real lesson plans

1. Test with math lesson plans (fraction, multiplication)
2. Test with reading comprehension
3. Test with science experiments
4. Verify teleprompter timing still works
5. Regression testing for non-teachable-moment slides

**No new files - testing only**

## Anti-Patterns to Avoid

### Anti-Pattern 1: Over-Detection
**Problem:** Detecting "problems" in rhetorical contexts
**Example:** "What a great question!" is not a teachable moment
**Prevention:** Require answer proximity AND high-confidence question detection

### Anti-Pattern 2: Disrupted Lesson Flow
**Problem:** Splitting content that was meant to be shown together
**Example:** "The water cycle includes evaporation, condensation, and precipitation."
**Prevention:** Only split when explicit Q&A pattern detected

### Anti-Pattern 3: Forced Scaffolding
**Problem:** Adding scaffolding where none is needed
**Example:** Simple recall questions don't need elaborate scaffolding
**Prevention:** Adjust scaffolding depth based on question complexity

### Anti-Pattern 4: Type Proliferation
**Problem:** Adding new slide types for teachable moments
**Prevention:** Use existing `Slide.content[]` structure - no new types

## Integration with Existing Features

### Content Preservation (v3.8)
- Teachable moments are a superset of detected questions
- Reuse `detectQuestions()` as foundation
- Add answer-pairing logic on top

### Teleprompter Verbosity
- Scaffolding respects verbosity setting
- Concise: Brief prompts only
- Standard: Balanced scaffolding
- Detailed: Full teaching script with alternatives

### Work Together / Class Challenge Slides
- Teachable moments can trigger these slide types
- Good pairing: "Work Together" after a challenging problem
- Detection could suggest slide type hints

## Code vs Prompt Balance

| Aspect | Code Responsibility | Prompt Responsibility |
|--------|--------------------|-----------------------|
| Detection | Find Q&A pairs | N/A |
| Formatting | XML structure | Interpret XML into bullets |
| Scaffolding | Provide templates | Generate contextual guidance |
| Slide structure | Pass to AI | Decide bullet placement |
| Teleprompter timing | Validate segment count | Create appropriate segments |

**Key principle:** Detection is deterministic (code), generation is creative (prompt).

## Verification Checklist

- [ ] Detection correctly identifies Q&A pairs
- [ ] Detection ignores rhetorical questions
- [ ] Split bullets maintain reading order
- [ ] Teleprompter segment count = bullets + 1 (still valid)
- [ ] Scaffolding appears between problem and answer
- [ ] Non-teachable-moment slides unchanged
- [ ] Both providers (Gemini/Claude) produce consistent output
- [ ] Verbosity levels respected in scaffolding

## Sources

- Cue codebase analysis (HIGH confidence)
  - `/services/contentPreservation/detector.ts`
  - `/services/prompts/contentPreservationRules.ts`
  - `/services/geminiService.ts`
  - `/services/providers/claudeProvider.ts`
  - `/types.ts`
- v3.8 Content Preservation implementation (HIGH confidence)
- Existing teleprompter segment system (HIGH confidence)
