/**
 * Teachable Moment Rules for AI Slide Generation.
 * Generates XML-tagged instructions that tell the AI to split problem/answer pairs
 * into separate bullets with scaffolding guidance in the teleprompter.
 *
 * This file provides the core prompt engineering for the delay answer reveal feature.
 */

import { TeachableMoment, ContentCategory } from '../contentPreservation/types';

// =============================================================================
// Content-Specific Scaffolding Templates
// =============================================================================

/**
 * Math scaffolding: Break into known vs unknown, step-by-step thinking,
 * visual/manipulative suggestions. Each question under 20 words.
 */
const MATH_SCAFFOLDING_TEMPLATE = `
MATH PROBLEM SCAFFOLDING (each question under 20 words):
Generate 2-3 SHORT questions to guide math thinking:

Question types:
- Known/unknown: "What do we know?" (4 words) or "What are we finding?" (4 words)
- Process: "What's the first step?" (4 words) or "Which operation?" (2 words)
- Visual: "Can we draw this?" (4 words) or "Can we use objects?" (4 words)

CORRECT - each question under 20 words:
"What do we know? [PAUSE] What are we finding? [PAUSE] Can we draw it?"
(4 words + 4 words + 4 words = three separate short questions)

WRONG - combined script (too long to speak naturally):
"What do we know from this problem and what are we trying to find and can we draw a picture to help?"
(22 words in one run-on sentence - awkward to say aloud)

Each [PAUSE] is 3-5 seconds of wait time.
`;

/**
 * Vocabulary scaffolding: Context clues, word breakdown (prefix/root/suffix),
 * real-world examples. Each question under 20 words.
 *
 * NOTE: Definition must NOT repeat the vocabulary word - definition only.
 * The word is already visible on the previous bullet, so the definition bullet
 * should provide the meaning without redundantly repeating the term.
 */
const VOCABULARY_SCAFFOLDING_TEMPLATE = `
VOCABULARY SCAFFOLDING (each question under 20 words):
Generate 2-3 SHORT questions about the vocabulary word:

Question types:
- Context: "Have you heard this word before?" (6 words) or "Where might you see this?" (5 words)
- Word parts: "Do you see parts you recognize?" (6 words) or "What prefix or suffix?" (4 words)
- Real-world: "Where might you use this word?" (6 words)

CORRECT - each question under 20 words:
"Do you recognize this word? [PAUSE] What parts do you see? [PAUSE] Where might you use it?"
(5 words + 5 words + 5 words = three separate short questions)

WRONG - too wordy:
"Think about whether you have ever encountered this word before and what context you might have seen it in."
(19 words in one run-on sentence - awkward to say aloud)

Each [PAUSE] is 3-5 seconds of wait time.

CRITICAL: Answer bullet shows definition ONLY - do NOT repeat the vocabulary word.
`;

/**
 * Comprehension scaffolding: Text evidence prompts, reasoning/inference,
 * connection to prior knowledge. Each question under 20 words.
 */
const COMPREHENSION_SCAFFOLDING_TEMPLATE = `
COMPREHENSION SCAFFOLDING (each question under 20 words):
Generate 2-3 SHORT questions about the text:

Question types:
- Evidence: "What clues from the text help?" (6 words) or "What did it say?" (4 words)
- Inference: "What can we figure out?" (5 words) or "What does this tell us?" (5 words)
- Connection: "What do we already know?" (5 words) or "Have we seen this before?" (5 words)

CORRECT - each question under 20 words:
"What did the text say? [PAUSE] What can we figure out? [PAUSE] What do we already know?"
(5 words + 5 words + 5 words = three separate short questions)

WRONG - too wordy:
"Think about what specific evidence from the passage might support your answer to this comprehension question."
(16 words in one run-on sentence - awkward to say aloud)

Each [PAUSE] is 3-5 seconds of wait time.
`;

/**
 * Science scaffolding: Observation prompts, prediction/hypothesis,
 * real-world connection. Each question under 20 words.
 */
const SCIENCE_SCAFFOLDING_TEMPLATE = `
SCIENCE SCAFFOLDING (each question under 20 words):
Generate 2-3 SHORT questions about the science concept:

Question types:
- Observation: "What do you notice?" (4 words) or "What do you observe?" (4 words)
- Prediction: "What will happen?" (3 words) or "What's your prediction?" (3 words)
- Connection: "Where do we see this?" (5 words) or "Why does this matter?" (4 words)

CORRECT - each question under 20 words:
"What do you notice? [PAUSE] What will happen? [PAUSE] Where do we see this?"
(4 words + 3 words + 5 words = three separate short questions)

WRONG - too wordy:
"What do you observe here and what do you think will happen and where might we see this in the real world?"
(22 words in one run-on sentence - awkward to say aloud)

Each [PAUSE] is 3-5 seconds of wait time.
`;

/**
 * General scaffolding: Fallback for unclassified content.
 * Uses think-pair-share structure. Each question under 20 words.
 */
const GENERAL_SCAFFOLDING_TEMPLATE = `
GENERAL SCAFFOLDING (each question under 20 words):
For content not specifically math, vocabulary, comprehension, or science:

Question types:
- Think: "What comes to mind?" (4 words) or "What do you think?" (4 words)
- Share: "Talk to a partner." (4 words) or "Share your thinking." (3 words)
- Discuss: "What ideas do we have?" (5 words) or "Let's hear some thoughts." (4 words)

CORRECT - each question under 20 words:
"What do you think? [PAUSE] Talk to a partner. [PAUSE] What ideas do we have?"
(4 words + 4 words + 5 words = three separate short prompts)

WRONG - too wordy:
"Take a moment to think about this on your own and then turn to a partner and share your thoughts."
(20 words in one run-on sentence - awkward to say aloud)

Each [PAUSE] is 3-5 seconds of wait time.
`;

// =============================================================================
// Verbal Deliverability Rules
// =============================================================================

/**
 * Word count constraint section - ensures each scaffolding question
 * is speakable naturally by teachers (under 20 words per question).
 */
const VERBAL_DELIVERABILITY_RULES = `
== VERBAL DELIVERABILITY (CRITICAL) ==

Each scaffolding question must be speakable in under 20 words.
Teachers read these aloud - short questions are natural, long scripts are awkward.

WORD COUNT EXAMPLES:
- "What do we know?" (4 words) - GOOD
- "What's the first step?" (4 words) - GOOD
- "Can you find evidence in the text?" (7 words) - GOOD
- "What do you think the author is trying to convey through this particular passage?" (14 words) - ACCEPTABLE but wordy
- "Think about what specific evidence from the passage might support your answer to this comprehension question." (16 words) - TOO LONG

Generate 2-3 SHORT questions, NOT one long paragraph.
Separate each question with [PAUSE] for teacher wait time (3-5 seconds).
`;

// =============================================================================
// Few-Shot Edge Case Examples
// =============================================================================

/**
 * XML-tagged examples for edge case handling.
 * Helps the AI understand nuanced splitting scenarios.
 */
const TEACHABLE_MOMENT_EXAMPLES = `
<teachable_moment_examples>

<example scenario="multi-part-math">
Input: "What is 3 + 4 = 7 and 5 + 6 = 11"
Handling: Split into separate problem/answer pairs for each equation.
Correct output:
  Bullet 1: "What is 3 + 4?"
  Bullet 2: "7"
  Bullet 3: "What is 5 + 6?"
  Bullet 4: "11"
Each problem-answer pair gets its own scaffolding segment in the teleprompter.
</example>

<example scenario="vocabulary-in-context">
Input: "The word 'photosynthesis' appears in the sentence: Plants use photosynthesis to make food."
Handling: Present word standalone, then definition without repeating the word.
Correct output:
  Bullet 5: "Photosynthesis"
  Bullet 6: "The process plants use to make food from sunlight"
Note: Definition does NOT say "Photosynthesis is..." - the word is already visible above.
</example>

<example scenario="rhetorical-question">
Input: "Have you ever wondered why the sky is blue?"
Handling: Rhetorical questions (no real answer expected) should NOT be split.
Correct output:
  Bullet 7: "Have you ever wondered why the sky is blue?"
This is a hook/engagement question, not a problem requiring an answer reveal.
</example>

<example scenario="multiple-moments-one-slide">
Input: A slide with "What is the capital of France? Paris. What is the capital of Germany? Berlin."
Handling: Sequence problem-answer pairs in order, with scaffolding between each.
Correct output:
  Bullet 1: "What is the capital of France?"
  Bullet 2: "Paris"
  Bullet 3: "What is the capital of Germany?"
  Bullet 4: "Berlin"
Teleprompter segments: scaffolding before Bullet 2, confirmation after Bullet 2, scaffolding before Bullet 4, confirmation after Bullet 4.
</example>

</teachable_moment_examples>
`;

// =============================================================================
// Main Function
// =============================================================================

/**
 * Generate teachable moment formatting rules for the AI system prompt.
 *
 * Returns an empty string if no teachable moments are provided (to avoid
 * cluttering the prompt when no special formatting is needed).
 *
 * @param teachableMoments Array of detected teachable moments from Phase 51 detection
 * @returns Formatted prompt section with bullet structure rules, scaffolding templates, and examples
 */
export function getTeachableMomentRules(teachableMoments: TeachableMoment[]): string {
  // Don't clutter prompt if no teachable moments detected
  if (teachableMoments.length === 0) {
    return '';
  }

  // Extract unique content categories from detected moments
  const categories = new Set<ContentCategory>(
    teachableMoments.map(tm => tm.contentCategory)
  );

  // Build scaffolding templates section based on detected categories
  const scaffoldingTemplates: string[] = [];
  if (categories.has('math')) {
    scaffoldingTemplates.push(MATH_SCAFFOLDING_TEMPLATE);
  }
  if (categories.has('vocabulary')) {
    scaffoldingTemplates.push(VOCABULARY_SCAFFOLDING_TEMPLATE);
  }
  if (categories.has('comprehension')) {
    scaffoldingTemplates.push(COMPREHENSION_SCAFFOLDING_TEMPLATE);
  }
  if (categories.has('science')) {
    scaffoldingTemplates.push(SCIENCE_SCAFFOLDING_TEMPLATE);
  }
  if (categories.has('general')) {
    scaffoldingTemplates.push(GENERAL_SCAFFOLDING_TEMPLATE);
  }

  return `
<teachable_moment_formatting>

TEACHABLE MOMENT FORMATTING RULES:

You have been provided with detected teachable moments (problems with answers).
For each teachable moment, follow these CRITICAL rules to split content and provide scaffolding.

== BULLET STRUCTURE (MANDATORY) ==

- Problem bullet: Contains ONLY the question/problem. NO answer text whatsoever.
- Answer bullet: The immediately following bullet. Contains the answer/solution.
- Problem and answer are ALWAYS consecutive bullets on the SAME slide.
- Never combine problem and answer in one bullet - this causes "answer leakage" where students see the answer before they have time to think.

== EXAMPLES (Before/After) ==

MATH EXAMPLE:
Input: "What is 3/4 of 12? The answer is 9."
Correct split:
  Bullet 3: "What is 3/4 of 12?"
  Bullet 4: "The answer is 9"
WRONG:
  Bullet 3: "What is 3/4 of 12? The answer is 9." (combined - answer leakage!)

VOCABULARY EXAMPLE:
Input: "Photosynthesis: The process plants use to make food from sunlight."
Correct split:
  Bullet 5: "Photosynthesis"
  Bullet 6: "The process plants use to make food from sunlight"
WRONG:
  Bullet 5: "Photosynthesis means the process plants use..." (repeated word in definition!)

== TELEPROMPTER SCAFFOLDING ==

The teleprompter segment AFTER the problem bullet (BEFORE answer reveal) contains scaffolding guidance.
This gives the teacher question prompts to guide student thinking before the answer appears.

Format: 2-3 question prompts with [PAUSE] timing cue
Keep scaffolding brief and actionable - these are teacher cues, not scripts.

Content-Specific Scaffolding Templates:
${scaffoldingTemplates.join('\n')}

${VERBAL_DELIVERABILITY_RULES}

== TELEPROMPTER CONFIRMATION ==

The teleprompter segment AFTER the answer bullet celebrates and extends learning.
After revealing the answer, your teleprompter should include a brief confirmation.

Format: Acknowledgment + common misconception or extension
Examples:
- "Great! The key here is understanding that fractions represent parts of a whole."
- "That's right! A common mistake is thinking [misconception]. Remember [correct understanding]."
- "Perfect! Can anyone think of another example?"

== NATURAL FLOW ==

Transitions between problem, scaffolding, and answer should feel natural.
- Avoid abrupt changes in tone or topic
- The scaffolding should flow from introducing the problem
- The confirmation should build on the revealed answer

Remember: The goal is to give students thinking time with teacher-guided scaffolding, not to create awkward pauses.

== TELEPROMPTER SEGMENT COUNT ==

The number of teleprompter segments must still equal Bullets + 1.
Scaffolding and confirmation content goes INTO the appropriate segments, not as additional segments.

${TEACHABLE_MOMENT_EXAMPLES}

</teachable_moment_formatting>
`;
}
