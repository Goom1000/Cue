# Feature Landscape: Answer Delay and Scaffolding (v3.9)

**Project:** Cue - Teacher Presentation Tool
**Domain:** Educational presentation tools - answer reveal timing and scaffolding support
**Researched:** 2026-02-01
**Confidence:** MEDIUM (educational research solid; implementation patterns inferred from codebase)

---

## Executive Summary

Answer delay with scaffolding is a well-established pedagogical practice. Research shows that "wait time" of 3-5 seconds significantly improves student response quality and participation (Rowe 1972, Stahl 1994). The key insight: **the delay is not just timing - it's what happens during the delay** that matters pedagogically.

This feature should detect "teachable moments" (content with answers that benefit from thinking time), structure problem-scaffolding-reveal sequences, and provide actionable scaffolding prompts in the teleprompter.

**Integration advantage:** Cue already has progressive bullet reveal (`visibleBullets`), teleprompter scripts (`speakerNotes`), and content preservation detection patterns. v3.9 extends these existing capabilities rather than building new infrastructure.

---

## Table Stakes

Features teachers expect. Missing = product feels pedagogically incomplete.

### TS-1: Automatic Detection of Answer-Containing Content

| Aspect | Details |
|--------|---------|
| **What** | AI detects bullets that contain answers to implicit or explicit questions |
| **Why Expected** | Manual tagging is too slow; teachers expect AI to understand content structure |
| **Complexity** | Medium |
| **Cue Integration** | Extends `contentPreservation/detector.ts` patterns |

**Detection signals (detailed in DETECTION-SIGNALS section):**
- Explicit Q&A in same bullet
- Definition patterns (X is/means Y)
- Math calculations with results
- Cause-effect conclusions
- Process outcomes

### TS-2: Problem-First Bullet Sequencing

| Aspect | Details |
|--------|---------|
| **What** | Present the problem/question/concept WITHOUT the answer first; reveal answer as next progressive bullet |
| **Why Expected** | Core pedagogical requirement - prevents students from skipping to answers |
| **Complexity** | Low (AI restructures at generation time) |
| **Cue Integration** | Leverages existing `visibleBullets` progressive reveal |

**Example transformation:**
```
ORIGINAL CONTENT IN LESSON PLAN:
"Photosynthesis converts CO2 and water into glucose and oxygen"

AI-GENERATED BULLETS:
- "What does photosynthesis produce from CO2 and water?" [shown first]
- "Glucose and oxygen" [revealed on teacher click]
```

**Important:** This happens during slide generation, not at runtime. The AI rewrites the content to separate problem from answer.

### TS-3: Scaffolding Strategy in Teleprompter

| Aspect | Details |
|--------|---------|
| **What** | Speaker notes include specific scaffolding guidance for each delayed answer |
| **Why Expected** | Teachers need guidance on what to do during wait time |
| **Complexity** | Medium |
| **Cue Integration** | Follows existing speakerNotes format |

**Must contain:**
1. Signal that this bullet has a delayed answer
2. Wait time recommendation (3-5+ seconds depending on complexity)
3. Scaffolding approach (see SCAFFOLDING-APPROACHES section)
4. 2-3 question prompts to ask students

**Format example (follows existing segment pattern):**
```
[THINK TIME] Wait 5 seconds before revealing.

Scaffolding: Ask students what they already know about plant processes.

Questions to try:
- "What do plants need to survive?"
- "What gas do we breathe out?"
- "Where does the plant get its energy?"

Then reveal the answer.
```

### TS-4: Question Prompts for Teacher Use

| Aspect | Details |
|--------|---------|
| **What** | Specific Socratic questions the teacher can ask during scaffolding |
| **Why Expected** | Reduces teacher cognitive load; ready-to-use prompts |
| **Complexity** | Medium (AI-generated during slide creation) |
| **Cue Integration** | Embedded in speakerNotes |

**Research basis:** Teachers asking fewer than 5 "why" questions per session benefit most from prompt support. Socratic questioning frameworks provide templates.

**Prompt types (see PROMPT-TYPES section):**
- Clarifying: "What is the question asking?"
- Probing: "Why do you think that?"
- Connecting: "What did we learn earlier that might help?"

---

## Differentiators

Features that would set Cue apart. Not expected, but add significant value.

### D-1: Adaptive Scaffolding by Content Type

| Aspect | Details |
|--------|---------|
| **What** | Different scaffolding strategies for different content types |
| **Value** | Shows deep pedagogical understanding; reduces teacher prep |
| **Complexity** | Medium-High |

**Content-specific scaffolding:**

| Content Type | Detection Signal | Scaffolding Strategy |
|--------------|------------------|---------------------|
| **Math/Calculation** | Numbers, operators, "calculate", "solve", "=" | "Break into steps: What do we know? What are we solving for?" |
| **Vocabulary/Definition** | "means", "is defined as", term in quotes | "Use the word in context. Find root words. Think of synonyms." |
| **Comprehension** | "because", "therefore", cause-effect | "Find evidence in the text. Connect to what we learned." |
| **Factual Recall** | Dates, names, places | "Think about the time period. What category does this fit?" |
| **Process/Sequence** | "first", "then", "next", numbered steps | "What step comes before this? Visualize the process." |

### D-2: Hint Progression in Notes

| Aspect | Details |
|--------|---------|
| **What** | Multiple hint levels: gentle nudge, medium hint, strong hint |
| **Value** | Teacher can escalate support without revealing answer |
| **Complexity** | Medium |

**Example structure:**
```
Hint 1 (if no response): "Think about what plants need to survive..."
Hint 2 (still struggling): "What gas do we breathe out that plants use?"
Hint 3 (final prompt): "Plants take in CO2 and produce..."
[Then reveal answer]
```

### D-3: Cognitive Load Indicator

| Aspect | Details |
|--------|---------|
| **What** | Indicate recommended wait time based on question complexity |
| **Value** | Helps teacher pace appropriately |
| **Complexity** | Low (simple heuristic) |

**Wait time heuristics:**
- Factual recall: 3-5 seconds
- Application/analysis: 5-10 seconds
- Synthesis/evaluation: 10-15 seconds

### D-4: Visual Cue in Slide (Badge or Icon)

| Aspect | Details |
|--------|---------|
| **What** | Teacher view shows which bullets have delayed answers |
| **Value** | At-a-glance awareness during editing |
| **Complexity** | Low |
| **Cue Integration** | Similar to existing `hasQuestionFlag` and `slideType` badges |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

### AF-1: Timer/Countdown Display

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Visible countdown timer on student screen | Creates anxiety, rushes students, undermines thinking time purpose |
| **Instead** | Teacher controls pacing; no visual countdown |

### AF-2: Automated Answer Reveal

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Auto-reveal answer after N seconds | Removes teacher control; classroom dynamics vary |
| **Instead** | Teacher clicks to reveal (existing behavior works) |

### AF-3: Student Response Collection

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Poll/quiz integration during scaffolding | Over-engineers the feature; Cue is presentation tool |
| **Instead** | Scaffolding stays in teleprompter; use separate Quick Quiz for assessment |

### AF-4: Complex Branching Paths

| Anti-Feature | Why Avoid |
|--------------|-----------|
| "If students struggle, show hint A; else skip" | Complicates presentation flow; requires runtime decisions |
| **Instead** | Linear reveal with hints in notes; teacher decides in-the-moment |

### AF-5: Per-Student Progress Tracking

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Track which students answered during scaffolding | Presentation mode is broadcast; scope creep |
| **Instead** | Use existing Targeted Questioning for individual student selection |

### AF-6: Separate "Answer Slide" Generation

| Anti-Feature | Why Avoid |
|--------------|-----------|
| Create entirely new slides for answers | Inflates deck length; disrupts flow |
| **Instead** | Use progressive bullet reveal within same slide |

---

## Detection Signals for Teachable Moments

Content patterns that indicate a bullet should be delayed/scaffolded.

### Pattern: Explicit Question with Answer

**Signal:** Question mark followed by answer in same content block.
```
"What is the capital of France? Paris."
"How do we calculate area? Length times width."
```
**Detection:** `?` followed by text that doesn't contain another `?`.

### Pattern: Definition Structure

**Signal:** Term + copula verb + explanation.
```
"Photosynthesis is the process by which plants convert light to energy."
"Mammals are warm-blooded animals that nurse their young."
"Osmosis means the movement of water across a membrane."
```
**Detection regex patterns:**
- `[Term] is [definition]`
- `[Term] are [definition]`
- `[Term] means [definition]`
- `[Term] is defined as [definition]`
- `[Term], or [synonym], is [definition]`

### Pattern: Math Calculation with Result

**Signal:** Numbers/operators followed by equals and result.
```
"To find the area: 5 x 3 = 15 square units"
"The percentage change is: (20-15)/15 = 33%"
"2/3 + 1/4 = 11/12"
```
**Detection:** Presence of `=` with numbers on both sides.

### Pattern: Cause-Effect with Conclusion

**Signal:** Causal connectors followed by consequence.
```
"Because the sun heats water, it evaporates into the atmosphere."
"Therefore, the character decides to leave home."
"As a result, the economy collapsed."
```
**Detection keywords:** because, therefore, so, as a result, consequently, thus.

### Pattern: Process Step with Outcome

**Signal:** Action verb + outcome connector + result.
```
"Mixing the chemicals produces a blue precipitate."
"This step leads to cell division."
"Clicking submit sends your response."
```
**Detection keywords:** produces, creates, results in, leads to, causes.

### Pattern: List Answer

**Signal:** Enumerated items that answer an implicit question.
```
"The three branches of government are: 1. Executive 2. Legislative 3. Judicial"
"Primary colors include: red, blue, and yellow."
```
**Detection:** Colon followed by list structure.

### Pattern: Example with Answer

**Signal:** "For example" or "such as" followed by specific instance.
```
"Renewable energy sources include solar, wind, and hydroelectric."
"Mammals, such as dogs, cats, and whales, are warm-blooded."
```
**Detection keywords:** for example, such as, including, e.g., like.

---

## Scaffolding Content Patterns

What the teleprompter should contain during scaffolding phase.

### Standard Scaffolding Block Structure

```
[THINK TIME - 5 seconds]

Scaffolding approach: [One sentence description]

Questions to ask:
- "[Question 1]"
- "[Question 2]"
- "[Question 3]"

If students struggle: "[Hint]"

Then reveal the answer.
```

### Prompt Types (Socratic Framework)

Based on established Socratic questioning research:

| Type | Purpose | Example Prompts |
|------|---------|-----------------|
| **Clarifying** | Check understanding of the problem | "What is the question asking?", "Can you rephrase that?" |
| **Probing** | Dig into reasoning | "Why do you think that?", "What evidence supports that?" |
| **Connecting** | Link to prior knowledge | "What did we learn about X that might help?", "Does this remind you of anything?" |
| **Evidence** | Support with facts | "Can you give an example?", "Where did you see that?" |
| **Implication** | Explore consequences | "If that's true, what would happen?", "What are the implications?" |
| **Perspective** | Consider alternatives | "What would someone who disagrees say?", "Is there another way to look at this?" |

### Scaffolding Approaches by Content Type

| Content Type | Scaffolding Approach | Example Prompts |
|--------------|---------------------|-----------------|
| **Math** | Break into sub-problems | "What information do we have?", "What are we trying to find?" |
| **Vocabulary** | Context and word parts | "Where have you seen this word before?", "What might the prefix mean?" |
| **Comprehension** | Text evidence | "What does the text say about this?", "What clues does the author give?" |
| **Factual** | Category and association | "What time period is this?", "What category does this belong to?" |
| **Process** | Sequence and visualization | "What happens before this step?", "Can you picture the process?" |

---

## Feature Dependencies

```
Existing Cue Features:
    |
    +-- Progressive bullet reveal (visibleBullets state)
    |   |
    |   +-- [v3.9] Answer delay uses SAME mechanism
    |       (no new sync needed)
    |
    +-- Teleprompter scripts (speakerNotes field)
    |   |
    |   +-- [v3.9] Scaffolding content embedded HERE
    |       (follows existing segment format)
    |
    +-- Content preservation (detector.ts)
    |   |
    |   +-- [v3.9] Extend with answer-detection patterns
    |       (same architecture)
    |
    +-- AI slide generation (geminiService.ts / claudeProvider.ts)
        |
        +-- [v3.9] AI restructures content at generation time
            (prompt engineering, not runtime logic)
```

### What Changes vs. What Reuses

| Component | Change Type | Details |
|-----------|-------------|---------|
| `Slide.content` | No change | Still array of bullet strings |
| `Slide.speakerNotes` | Extended content | Scaffolding blocks added |
| `visibleBullets` state | No change | Same reveal mechanism |
| Detection patterns | New patterns | Extend detector.ts |
| AI prompts | Modified | Add restructuring instructions |
| Broadcast sync | No change | Same STATE_UPDATE message |

---

## MVP Recommendation

For MVP, prioritize:

### Phase 1 (Core capability)
1. **TS-1: Detection of answer-containing content** - AI recognizes teachable moments
2. **TS-2: Problem-first bullet sequencing** - Visible change in generated slides
3. **TS-3: Basic scaffolding in teleprompter** - Wait time + 2-3 question prompts

### Phase 2 (Polish)
4. **TS-4: Refined question prompts** - Better variety, content-appropriate
5. **D-4: Visual badge in editor** - Teacher sees which bullets are delayed

### Defer to Post-MVP
- **D-1: Adaptive scaffolding by content type** - Nice to have, increases prompt complexity significantly
- **D-2: Hint progression (3 levels)** - Single hint sufficient for MVP
- **D-3: Cognitive load indicators** - Can add later as polish

---

## Implementation Sketch

### Detection Integration (extends detector.ts)

```typescript
// New detection type
export type ContentType = 'question' | 'activity' | 'instruction' | 'teachable-moment';

// New detection method
export type DetectionMethod =
  | 'punctuation' | 'context' | 'numbered-list' | 'action-verb' | 'instruction-prefix'
  | 'definition-pattern' | 'math-result' | 'cause-effect' | 'example-list';

// New function
export function detectTeachableMoments(text: string): DetectedContent[];
```

### AI Prompt Addition (slide generation)

```
When generating slides, identify content that contains answers to implicit or explicit questions.
For each such content:
1. Split into problem bullet (question/prompt without answer) and answer bullet
2. The answer bullet should be brief and direct
3. In speakerNotes, add scaffolding block before the answer reveal

Scaffolding block format:
[THINK TIME - X seconds]
Scaffolding: [approach]
Questions:
- [question 1]
- [question 2]
Then reveal answer.
```

### Slide Type Extension

```typescript
// types.ts
slideType?: 'standard' | 'elaborate' | 'work-together' | 'class-challenge' | 'answer-delay';
```

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Wait time research | HIGH | Well-established (Rowe 1972, Stahl 1994, multiple replications) |
| Scaffolding strategies | HIGH | Extensive educational research, widely taught in teacher training |
| Detection signals | MEDIUM | Patterns inferred from content structure; needs real-world validation |
| Cue integration points | HIGH | Based on actual codebase analysis |
| Question prompt quality | MEDIUM | AI capability assumed; needs prompt engineering iteration |
| Teacher adoption | MEDIUM | Novel UX in teleprompter; may need onboarding |

---

## Sources

### Wait Time and Think Time Research
- [Edutopia: Extending Silence](https://www.edutopia.org/article/extending-silence/) - Practical strategies
- [Harvard: Providing Wait Time](https://instructionalmoves.gse.harvard.edu/providing-wait-time-students-process-and-gain-confidence) - Research basis
- [CPM: Using Wait Time](https://cpm.org/using-wait-time-to-support-effective-questioning/) - Math education context
- [Kent State: Wait Time](https://www.kent.edu/ctl/wait-time-making-space-authentic-learning) - Higher ed perspective
- [ERIC Digest: Think-Time and Wait-Time](https://www.ericdigests.org/1995-1/think.htm) - Original research summary

### Scaffolding Strategies
- [NIU: Instructional Scaffolding](https://www.niu.edu/citl/resources/guides/instructional-guide/instructional-scaffolding-to-improve-learning.shtml) - Framework overview
- [Edutopia: 6 Scaffolding Strategies](https://www.edutopia.org/blog/scaffolding-lessons-six-strategies-rebecca-alber) - Practical techniques
- [Third Space Learning: I Do We Do You Do](https://thirdspacelearning.com/blog/i-do-we-do-you-do/) - Gradual release model
- [Atom Learning: Gradual Release](https://www.atomlearning.com/blog/gradual-release-of-responsibility) - Worked examples

### Socratic Questioning
- [Graduate Program: Socratic Method](https://www.graduateprogram.org/blog/the-socratic-method-in-the-modern-classroom/) - Modern application
- [UConn: Socratic Questions](https://cetl.uconn.edu/resources/teaching-your-course/leading-effective-discussions/socratic-questions/) - Question types
- [Sec-Ed: 38 Socratic Questions](https://www.sec-ed.co.uk/content/best-practice/a-questioning-classroom-38-socratic-questions-for-your-teaching) - Prompt examples
- [Open Colleges: Socratic Questioning](https://www.opencolleges.edu.au/blogs/articles/socratic-questioning-30-thought-provoking-questions-to-ask-your-students) - Implementation guide

### Hint Systems and EdTech Scaffolding
- [arXiv: Designing Hint Generation Systems](https://arxiv.org/html/2510.21087) - AI hint generation research
- [Wiley: Scaffolding Math with LLMs](https://bera-journals.onlinelibrary.wiley.com/doi/10.1111/bjet.13571) - LLM scaffolding patterns
- [Springer: Mobile Scaffolding](https://link.springer.com/article/10.1007/s12564-024-09951-8) - ProSES problem-solving software

### Vocabulary and Reading
- [NWEA: Teaching Academic Vocabulary](https://www.nwea.org/blog/2024/4-ways-to-teach-academic-vocabulary-and-help-students-master-grade-level-content/) - Teachable moments
- [Reading Teacher: Upward and Downward Scaffolds](https://ila.onlinelibrary.wiley.com/doi/full/10.1002/trtr.1943) - Adaptive scaffolding
- [Curriculum Associates: Scaffolding for Reading](https://www.curriculumassociates.com/blog/scaffolding-for-reading) - Comprehension strategies

---

*Research completed: 2026-02-01*
