# Phase 53: Scaffolding Templates - Research

**Researched:** 2026-02-01
**Domain:** Subject-specific pedagogical scaffolding with verbal deliverability constraints
**Confidence:** HIGH

## Summary

Phase 53 validates and refines the scaffolding templates created in Phase 52 to ensure each individual prompt is verbally deliverable in under 20 words. This is primarily a refinement phase, not a new implementation phase. Phase 52 created 5 content-specific templates (math, vocabulary, comprehension, science, general) with full scaffolding guidance. Phase 53 ensures the word count constraint (SCF-05) is satisfied.

The current implementation in `teachableMomentRules.ts` already has solid subject-specific approaches. The issue is that example scaffolding segments show ALL prompts combined (24-28 words total), when the constraint is per individual prompt (each question must be under 20 words). Individual prompts in the current examples are 5-13 words - well under the 20-word limit. The phase work is about clarifying this constraint in the AI prompts and potentially adding explicit word count guidance.

Research on classroom verbal delivery confirms that brief, focused questions are more effective than lengthy scripts. Teachers naturally speak in short prompts, and research on wait time shows that concise questions paired with pause cues optimize student thinking time.

**Primary recommendation:** Update scaffolding templates to explicitly constrain each individual prompt to under 20 words. Add word count validation examples. Emphasize single-question format for verbal delivery.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Pure TypeScript | - | Template strings with prompt engineering | Already used in teachableMomentRules.ts |
| AI Provider APIs | Gemini 3 / Claude 3.5 | Interpret scaffolding rules | Already integrated in Phase 52 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | This is prompt refinement, not new code |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prompt-only enforcement | Runtime word count validation | Adds complexity; prompt instructions sufficient for AI |
| Template literals | Structured object format | Would require refactoring; template literals already work |

**Installation:**
```bash
# No new dependencies required
# Uses existing teachableMomentRules.ts infrastructure
```

## Architecture Patterns

### Recommended Project Structure
```
services/
  prompts/
    teachableMomentRules.ts     # MODIFY: Add word count constraints
  contentPreservation/
    detector.ts                  # No changes needed
    types.ts                     # No changes needed
```

### Pattern 1: Per-Prompt Word Count Constraint
**What:** Explicit instruction that each scaffolding question must be under 20 words
**When to use:** Always - this is the SCF-05 requirement
**Example:**
```typescript
// Source: Cue REQUIREMENTS.md SCF-05
const WORD_COUNT_CONSTRAINT = `
WORD COUNT CONSTRAINT (CRITICAL):
Each scaffolding question prompt must be verbally deliverable.
Maximum 20 words per individual question.

WRONG - Too long (28 words combined):
"What do we know from this problem? [PAUSE] What are we trying to find? [PAUSE] Can we draw a picture or use objects to help us solve this?"

CORRECT - Three separate prompts, each under 20 words:
- "What do we know?" (4 words)
- "What are we trying to find?" (6 words)
- "Can we draw this?" (4 words)

The AI generates 2-3 SHORT questions, not one long script.
`;
```

### Pattern 2: Question-Only Format
**What:** Scaffolding prompts are single questions, not statements or explanations
**When to use:** Always - questions are more verbally natural than statements
**Example:**
```typescript
// Source: Responsive Classroom research on verbal brevity
CORRECT FORMATS:
- "What do we know?" (question)
- "What's the first step?" (question)
- "Can you find evidence?" (question)

INCORRECT FORMATS:
- "Think about what you know and then consider what you need to find." (statement, 12 words)
- "The first thing we should do is look at the information given." (statement, 12 words)
```

### Pattern 3: Timing Cue Integration
**What:** Each prompt includes a pause cue for wait time
**When to use:** Always - separates prompts and indicates teacher pause
**Example:**
```typescript
// Source: Wait time research (Mary Budd Rowe, 3-5 seconds optimal)
const TIMING_PATTERN = `
Format each scaffold as: "Question? [PAUSE]"

The [PAUSE] marker signals the teacher to wait 3-5 seconds.
Multiple prompts are separated by [PAUSE], giving natural breaks.

Example: "What do we know? [PAUSE] What are we finding? [PAUSE]"
`;
```

### Anti-Patterns to Avoid
- **Combined multi-prompt scripts:** "Ask them what they know, then ask what they're finding, and finally suggest drawing it" - this is a script, not prompts
- **Statement-based scaffolds:** "Have students think about..." - teachers speak in questions, not meta-instructions
- **Overly wordy questions:** "What do you think the answer might be if you consider all the information we've discussed so far?" (18 words but verbose)
- **Missing pause cues:** Questions without [PAUSE] run together in teleprompter

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Word count validation | Runtime string.split().length check | Prompt constraints | AI follows explicit constraints; runtime validation adds complexity |
| Template selection logic | New selector function | Existing category-based selection | getTeachableMomentRules() already selects by ContentCategory |
| Subject detection | New classifier | Phase 51 classifyContentCategory() | Already implemented and integrated |

**Key insight:** Phase 52 built the infrastructure. Phase 53 refines the prompt content, not the code structure.

## Common Pitfalls

### Pitfall 1: Treating Combined Prompts as Single Prompt
**What goes wrong:** Measuring "What do we know? What are we finding? Can we draw this?" as one 14-word unit instead of three separate prompts
**Why it happens:** Templates show full scaffolding segments, not individual prompts
**How to avoid:**
- Clarify in prompt that EACH question is separate
- Count words per question, not per segment
- Use [PAUSE] as explicit separator
**Warning signs:** AI generates long flowing sentences instead of distinct questions

### Pitfall 2: Questions Too Abstract for Grade Level
**What goes wrong:** "What metacognitive strategies might help here?" for Year 6 students
**Why it happens:** AI defaults to sophisticated language
**How to avoid:**
- Specify grade-appropriate vocabulary in prompts
- Provide concrete examples at appropriate level
- Match question complexity to problem complexity
**Warning signs:** Scaffolding questions use vocabulary harder than the problem itself

### Pitfall 3: Generic Prompts Despite Subject Templates
**What goes wrong:** Math problems get "What do you think?" instead of "What's the first step?"
**Why it happens:** AI falls back to generic patterns when specific templates are unclear
**How to avoid:**
- Make subject-specific examples very concrete
- Include "WRONG: generic" vs "CORRECT: subject-specific" contrast
- Reinforce content category in each template
**Warning signs:** All subjects produce similar scaffolding despite different templates

### Pitfall 4: Scaffolding Harder Than Problem
**What goes wrong:** "Can you explain the mathematical relationship between the dividend and divisor?" for "12 / 4 = ?"
**Why it happens:** AI tries to be educational, overshoots complexity
**How to avoid:**
- Match scaffold complexity to problem complexity
- Use simple vocabulary in scaffold prompts
- Avoid introducing new concepts in scaffolds
**Warning signs:** Students confused by scaffold question, not by the original problem

### Pitfall 5: Losing the [PAUSE] Timing Cues
**What goes wrong:** AI generates questions without pause markers, teleprompter runs prompts together
**Why it happens:** [PAUSE] marker not emphasized in template
**How to avoid:**
- Include [PAUSE] in every example
- Make it a formatting requirement, not optional
- Validate presence in examples
**Warning signs:** Teleprompter scaffold segment reads like continuous text

## Code Examples

Verified patterns from the existing codebase and research:

### Current Math Scaffolding Template (Phase 52)
```typescript
// Source: services/prompts/teachableMomentRules.ts lines 19-30
const MATH_SCAFFOLDING_TEMPLATE = `
MATH PROBLEM SCAFFOLDING:
When the problem bullet contains a math question, guide student thinking with:
- Break into known vs. unknown: "What information do we have? What are we trying to find?"
- Step-by-step thinking prompts: "What operation makes sense here? Let's work through it."
- Visual/manipulative suggestions: "Can we draw this? Can we use objects to represent it?"

Example scaffolding segment:
"What do we know from this problem? [PAUSE] What are we trying to find? [PAUSE] Can we draw a picture or use objects to help us solve this?"

Format: 2-3 brief, actionable question prompts with [PAUSE] timing cues.
`;
```

### Recommended Math Scaffolding Template (Phase 53 Refined)
```typescript
// RECOMMENDED UPDATE for teachableMomentRules.ts
const MATH_SCAFFOLDING_TEMPLATE = `
MATH PROBLEM SCAFFOLDING:
Generate 2-3 SHORT questions (each under 20 words) to guide math thinking:

Question types:
- Known/unknown: "What do we know?" or "What are we finding?"
- Process: "What's the first step?" or "Which operation?"
- Visual: "Can we draw this?" or "Can we use objects?"

CORRECT - each question under 20 words:
"What do we know? [PAUSE] What are we finding? [PAUSE] Can we draw it?"

WRONG - combined script (too long to speak naturally):
"What do we know from this problem and what are we trying to find and can we draw a picture to help?"

Each [PAUSE] is 3-5 seconds of wait time.
`;
```

### Recommended Vocabulary Scaffolding Template (Phase 53 Refined)
```typescript
// RECOMMENDED UPDATE for teachableMomentRules.ts
const VOCABULARY_SCAFFOLDING_TEMPLATE = `
VOCABULARY SCAFFOLDING:
Generate 2-3 SHORT questions (each under 20 words) about the vocabulary word:

Question types:
- Context: "Have you heard this word before?"
- Word parts: "Do you see any parts you recognize?"
- Real-world: "Where might you use this word?"

CORRECT - each question under 20 words:
"Do you recognize this word? [PAUSE] What parts do you see? [PAUSE]"

WRONG - too wordy:
"Think about whether you have ever encountered this word before and what context you might have seen it in."

CRITICAL: Answer bullet shows definition ONLY - do NOT repeat the vocabulary word.
`;
```

### Recommended Comprehension Scaffolding Template (Phase 53 Refined)
```typescript
// RECOMMENDED UPDATE for teachableMomentRules.ts
const COMPREHENSION_SCAFFOLDING_TEMPLATE = `
COMPREHENSION SCAFFOLDING:
Generate 2-3 SHORT questions (each under 20 words) about the text:

Question types:
- Evidence: "What clues from the text help?"
- Inference: "What can we figure out?"
- Connection: "What do we already know about this?"

CORRECT - each question under 20 words:
"What did the text say? [PAUSE] What can we figure out? [PAUSE]"

WRONG - too wordy:
"Think about what specific evidence from the passage might support your answer to this question."

Focus on text evidence and connecting ideas.
`;
```

### Word Count Constraint Addition
```typescript
// RECOMMENDED ADDITION to getTeachableMomentRules() output
const WORD_COUNT_SECTION = `
== VERBAL DELIVERABILITY (SCF-05) ==

Each scaffolding question must be speakable in under 20 words.
Teachers read these aloud - short questions are natural, long scripts are awkward.

WORD COUNT EXAMPLES:
- "What do we know?" (4 words) - GOOD
- "What's the first step?" (4 words) - GOOD
- "Can you find evidence in the text?" (7 words) - GOOD
- "What do you think the author is trying to convey through this particular passage?" (14 words) - TOO LONG

Generate 2-3 short questions, NOT one long paragraph.
Separate each question with [PAUSE] for teacher wait time.
`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Long scaffolding scripts | Short question prompts | Phase 53 (2026) | Teachers can speak naturally |
| Generic "What do you think?" | Subject-specific questions | Phase 52 (2026) | Math/vocab/comprehension get appropriate scaffolds |
| No timing guidance | [PAUSE] cues between questions | Phase 52 (2026) | Teachers know when to wait |
| Statement-based scaffolds | Question-only format | Phase 53 (2026) | Natural verbal delivery |

**Deprecated/outdated:**
- **Combined multi-question scripts:** Research shows brief questions are more effective
- **Meta-instructions ("Have students think about..."):** Teachers need direct questions to ask, not instructions about asking

## Open Questions

Things that couldn't be fully resolved:

1. **Exact word count for "verbally deliverable"**
   - What we know: Requirement says "<20 words per prompt"
   - What's unclear: Whether 15 words is a better target for natural speech
   - Recommendation: Use 20 as hard limit, but examples should average 4-8 words

2. **Consistency vs. variety in scaffolding**
   - What we know: CONTEXT.md gives discretion on whether same problem types get consistent or varied scaffolding
   - What's unclear: Whether teachers prefer predictable prompts or variety
   - Recommendation: Slight variety using template options, but consistent question types per subject

3. **Multi-moment slides**
   - What we know: A slide can have multiple teachable moments
   - What's unclear: Whether each moment gets full 2-3 prompts or whether total per slide should be capped
   - Recommendation: Each moment gets its own 2-3 prompts; Phase 51 throttling already limits total moments

## Sources

### Primary (HIGH confidence)
- Cue codebase: `services/prompts/teachableMomentRules.ts` - Current template implementation
- Cue codebase: `services/contentPreservation/detector.ts` - Content classification
- Phase 52 RESEARCH.md - Scaffolding template patterns
- Phase 52 VERIFICATION.md - Implementation verification
- PITFALLS-delay-answer-reveal.md - Pitfall 10 on prompt length

### Secondary (MEDIUM confidence)
- [Responsive Classroom: Reinforcing, Reminding, Redirecting](https://www.responsiveclassroom.org/reinforcing-reminding-and-redirecting/) - Brief verbal instruction research
- [Edutopia: 6 Ways to Make Instructions Stick](https://www.edutopia.org/article/repeating-instructions-less/) - Multi-modal brief delivery
- [San Diego County: Providing Appropriate Scaffolding](https://www.sdcoe.net/educators/multilingual-education-and-global-achievement/oracy-toolkit/providing-appropriate-scaffolding) - Scaffolding hierarchy
- [Curriculum Associates: Scaffolding Math](https://www.curriculumassociates.com/blog/scaffolding-math) - Math scaffolding strategies
- [Keys to Literacy: Using Morphology](https://keystoliteracy.com/blog/using-morphology-to-teach-vocabulary/) - Vocabulary word parts
- [Reading Rockets: Seven Strategies for Comprehension](https://www.readingrockets.org/topics/comprehension/articles/seven-strategies-teach-students-text-comprehension) - Comprehension scaffolds

### Tertiary (LOW confidence)
- General web search on "verbal prompts word count" - No specific research found on 20-word limit
- Inferred from classroom practice that brief questions are standard

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing Phase 52 infrastructure
- Architecture: HIGH - Refinement to existing templates, no structural changes
- Pitfalls: HIGH - Based on PITFALLS-delay-answer-reveal.md and Phase 52 verification

**Research date:** 2026-02-01
**Valid until:** 30 days (stable domain - pedagogical scaffolding principles well-established)
