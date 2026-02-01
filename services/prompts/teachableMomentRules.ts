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
 * visual/manipulative suggestions.
 */
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

/**
 * Vocabulary scaffolding: Context clues, word breakdown (prefix/root/suffix),
 * real-world examples.
 *
 * NOTE: Definition must NOT repeat the vocabulary word - definition only.
 * The word is already visible on the previous bullet, so the definition bullet
 * should provide the meaning without redundantly repeating the term.
 */
const VOCABULARY_SCAFFOLDING_TEMPLATE = `
VOCABULARY SCAFFOLDING:
When the problem bullet contains a vocabulary word, guide student thinking with:
- Context clues: "Have you seen this word before? Where might you encounter it?"
- Word breakdown (prefix/root/suffix): "Look at the parts of the word. What do you recognize?"
- Real-world examples: "Where might you use or hear this word in everyday life?"

Example scaffolding segment:
"Look at this word carefully. [PAUSE] Do you see any parts you recognize? [PAUSE] Where might you encounter this word in the real world?"

Format: 2-3 brief, actionable question prompts with [PAUSE] timing cues.

CRITICAL: The answer bullet shows the definition ONLY. Do NOT repeat the vocabulary word in the definition bullet - the word is already visible above.
`;

/**
 * Comprehension scaffolding: Text evidence prompts, reasoning/inference,
 * connection to prior knowledge.
 */
const COMPREHENSION_SCAFFOLDING_TEMPLATE = `
COMPREHENSION SCAFFOLDING:
When the problem bullet contains a comprehension question, guide student thinking with:
- Text evidence prompts: "What clues from the passage support your answer?"
- Reasoning/inference: "What can we figure out based on what we've read?"
- Connection to prior knowledge: "Where have we seen this before? What do we already know?"

Example scaffolding segment:
"Think about what we just read. [PAUSE] What clues from the passage might help us answer this? [PAUSE] How does this connect to what we already know?"

Format: 2-3 brief, actionable question prompts with [PAUSE] timing cues.
`;

/**
 * Science scaffolding: Observation prompts, prediction/hypothesis,
 * real-world connection.
 */
const SCIENCE_SCAFFOLDING_TEMPLATE = `
SCIENCE SCAFFOLDING:
When the problem bullet contains a science question, guide student thinking with:
- Observation prompts: "What do you observe? What do you notice about this?"
- Prediction/hypothesis: "What do you think will happen? What's your prediction?"
- Real-world connection: "Where do we see this in everyday life? Why does this matter?"

Example scaffolding segment:
"What do you observe here? [PAUSE] What do you think will happen and why? [PAUSE] Where might we see this in the real world?"

Format: 2-3 brief, actionable question prompts with [PAUSE] timing cues.
`;

/**
 * General scaffolding: Fallback for unclassified content.
 * Uses think-pair-share structure.
 */
const GENERAL_SCAFFOLDING_TEMPLATE = `
GENERAL SCAFFOLDING (Fallback):
When the content category is not specifically math, vocabulary, comprehension, or science:
- Think: "Take a moment to think about this on your own."
- Pair: "Turn to a partner and share your thoughts."
- Share: "Let's hear some ideas from the class."

Example scaffolding segment:
"Take a moment to think about this. [PAUSE] What ideas come to mind? [PAUSE] Share your thinking with a partner."

Format: 2-3 brief, actionable question prompts with [PAUSE] timing cues.
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
