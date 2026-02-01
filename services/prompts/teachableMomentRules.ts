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
 * Math scaffolding: Provide actual technique/procedure for the teacher to guide students through.
 * Must include the METHOD, not just questions. Teachers need to know HOW to explain the skill.
 */
const MATH_SCAFFOLDING_TEMPLATE = `
MATH PROBLEM SCAFFOLDING:

CRITICAL: Include the ACTUAL TECHNIQUE/METHOD for the teacher to guide students through.
Don't just ask "How do we find 10%?" - explain the procedure step by step.

Structure:
1. State the technique briefly (teacher explains the method)
2. Guide through each step with questions
3. Each step under 20 words

PERCENTAGE PROBLEMS:
"To find 10%, we divide by 10. [PAUSE] What's 60 divided by 10? [PAUSE] Now we subtract that from the original price."

ADDITION/SUBTRACTION:
"Let's count on from the bigger number. [PAUSE] Start at 7, count up 4 more. [PAUSE] What do we get?"

MULTIPLICATION:
"We can use groups or repeated addition. [PAUSE] 4 groups of 3 - how many altogether? [PAUSE]"

FRACTIONS:
"To find a fraction of a number, divide by the bottom, multiply by the top. [PAUSE] What's 12 divided by 4? [PAUSE] Now times 3?"

WRONG - too vague (doesn't teach the technique):
"What do we know? [PAUSE] What's the first step? [PAUSE] Can we draw it?"
^^^ Students who don't know the method won't benefit from these generic questions.

The scaffolding must TEACH the procedure, not just prompt thinking.
`;

/**
 * Vocabulary scaffolding: Provide actual technique for understanding new words.
 * Include word analysis strategies, not just generic questions.
 */
const VOCABULARY_SCAFFOLDING_TEMPLATE = `
VOCABULARY SCAFFOLDING:

CRITICAL: Include the ACTUAL TECHNIQUE for working out word meanings.
Don't just ask "What does this word mean?" - teach the strategy.

Structure:
1. Word attack strategy (how to figure out unknown words)
2. Guide through applying the strategy
3. Each step under 20 words

WORD PARTS TECHNIQUE:
"Let's break this word into parts. [PAUSE] 'Photo' means light, 'synthesis' means making. [PAUSE] What might it mean together?"

CONTEXT CLUES TECHNIQUE:
"Look at the sentence around the word. [PAUSE] What clues help us? [PAUSE] The text says plants use it for food..."

PREFIX/SUFFIX TECHNIQUE:
"'Un-' at the start means 'not'. [PAUSE] So 'unhappy' means... [PAUSE] What about 'uncertain'?"

ROOT WORD TECHNIQUE:
"The root 'port' means carry. [PAUSE] 'Transport' carries across, 'export' carries out. [PAUSE] What might 'import' mean?"

WRONG - too vague:
"Have you heard this word before? [PAUSE] What parts do you see?"
^^^ Doesn't teach HOW to figure out the meaning.

CRITICAL: Answer bullet shows definition ONLY - do NOT repeat the vocabulary word.
`;

/**
 * Comprehension scaffolding: Provide actual reading strategies for finding answers in text.
 * Include specific techniques like re-reading, finding key words, inference chains.
 */
const COMPREHENSION_SCAFFOLDING_TEMPLATE = `
COMPREHENSION SCAFFOLDING:

CRITICAL: Include the ACTUAL READING STRATEGY for finding answers.
Don't just ask "What did it say?" - teach the technique for finding evidence.

Structure:
1. Name the reading strategy
2. Guide through applying it to the text
3. Each step under 20 words

FINDING EVIDENCE TECHNIQUE:
"Let's go back to paragraph 2. [PAUSE] The text says she 'packed her bags'. [PAUSE] What does that tell us about her plans?"

INFERENCE TECHNIQUE:
"The text doesn't say it directly. [PAUSE] But we know she was unhappy at home and dreamed of travel. [PAUSE] So why might she leave?"

CAUSE AND EFFECT TECHNIQUE:
"What happened first? [PAUSE] Then what happened because of that? [PAUSE] So the cause was... and the effect was..."

CHARACTER MOTIVE TECHNIQUE:
"How was the character feeling? [PAUSE] What did they want? [PAUSE] So why would they do that?"

WRONG - too vague:
"What did the text say? [PAUSE] What can we figure out?"
^^^ Doesn't guide students to WHERE in the text or HOW to find the answer.
`;

/**
 * Science scaffolding: Provide actual scientific reasoning techniques.
 * Include observation-hypothesis-evidence patterns and process explanations.
 */
const SCIENCE_SCAFFOLDING_TEMPLATE = `
SCIENCE SCAFFOLDING:

CRITICAL: Include the ACTUAL SCIENTIFIC PROCESS or explanation.
Don't just ask "What will happen?" - explain the underlying science.

Structure:
1. Name the scientific concept or process
2. Break down the steps/stages
3. Each step under 20 words

PROCESS EXPLANATION:
"Water evaporates when heated. [PAUSE] The molecules gain energy and escape as gas. [PAUSE] Where does the water go?"

CAUSE AND EFFECT:
"Iron reacts with oxygen and water. [PAUSE] This chemical reaction creates rust. [PAUSE] What conditions speed this up?"

SCIENTIFIC METHOD:
"First we observe carefully. [PAUSE] Then we make a prediction. [PAUSE] Now we test - what do you think will happen?"

CLASSIFICATION:
"Living things share certain features. [PAUSE] They grow, reproduce, and need energy. [PAUSE] Does this fit those criteria?"

WRONG - too vague:
"What do you notice? [PAUSE] What will happen?"
^^^ Doesn't explain the science behind why it happens.
`;

/**
 * General scaffolding: Fallback for unclassified content.
 * Still provides structured guidance, not just vague questions.
 */
const GENERAL_SCAFFOLDING_TEMPLATE = `
GENERAL SCAFFOLDING:

For content not specifically math, vocabulary, comprehension, or science:
Still provide STRUCTURED GUIDANCE, not just open questions.

Structure:
1. Break the problem into smaller parts
2. Guide through each part
3. Each step under 20 words

STEP-BY-STEP BREAKDOWN:
"Let's break this into parts. [PAUSE] First, what do we need to figure out? [PAUSE] What information do we have?"

WORKED EXAMPLE APPROACH:
"Let me show you one first. [PAUSE] Watch the steps I follow. [PAUSE] Now you try with this example."

THINK-ALOUD TECHNIQUE:
"I'm going to think out loud. [PAUSE] First I notice... then I think about... [PAUSE] What do you notice?"

COMPARE AND CONTRAST:
"How are these similar? [PAUSE] How are they different? [PAUSE] What pattern do you see?"

WRONG - too vague:
"What do you think? [PAUSE] Talk to a partner."
^^^ Gives no guidance on HOW to think about the problem.

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

<example scenario="math-discount-calculation">
Input: "A $60 bag has 10% off. What is the new price? (Expected: $54)"
Correct output:
  Bullet 1: "A $60 bag has 10% off. What is the new price?"
  Bullet 2: "$54"
Teleprompter for Bullet 1 (SCAFFOLDING with technique):
  "To find 10%, we divide by 10. [PAUSE] What's 60 divided by 10? [PAUSE] That's our discount - now what do we subtract it from?"
Teleprompter for Bullet 2 (CONFIRMATION):
  "Excellent! $6 off $60 gives us $54. The technique: divide by 10 for 10%, then subtract."

WRONG teleprompter for Bullet 1 (just explaining):
  "Ten percent of sixty is six dollars, so sixty minus six is fifty-four."
  ^^^ This tells them the answer instead of teaching the technique!

WRONG teleprompter for Bullet 1 (too vague):
  "What do we know? [PAUSE] What's the first step?"
  ^^^ This doesn't teach HOW to find a percentage!
</example>

<example scenario="math-addition">
Input: "What is 3 + 4? The answer is 7."
Correct output:
  Bullet 1: "What is 3 + 4?"
  Bullet 2: "7"
Teleprompter for Bullet 1 (SCAFFOLDING):
  "What are we adding together? [PAUSE] Can you count on from 3? [PAUSE] What do you get?"
Teleprompter for Bullet 2 (CONFIRMATION):
  "Yes! 3 plus 4 equals 7."
</example>

<example scenario="vocabulary-definition">
Input: "Photosynthesis: The process plants use to make food from sunlight."
Correct output:
  Bullet 1: "Photosynthesis"
  Bullet 2: "The process plants use to make food from sunlight"
Teleprompter for Bullet 1 (SCAFFOLDING):
  "Have you seen this word before? [PAUSE] Look at the parts - 'photo' and 'synthesis'. What might they mean? [PAUSE]"
Teleprompter for Bullet 2 (CONFIRMATION):
  "Exactly! Photo means light, synthesis means putting together. Plants put together food using light."
Note: Definition does NOT repeat "Photosynthesis is..." - the word is already visible.
</example>

<example scenario="comprehension-question">
Input: "Why did the character leave home? Because she wanted adventure."
Correct output:
  Bullet 1: "Why did the character leave home?"
  Bullet 2: "Because she wanted adventure"
Teleprompter for Bullet 1 (SCAFFOLDING):
  "What clues from the story help us? [PAUSE] What was she feeling at home? [PAUSE] What did she want?"
Teleprompter for Bullet 2 (CONFIRMATION):
  "Good thinking! The story showed us she felt trapped and dreamed of something more."
</example>

<example scenario="rhetorical-question">
Input: "Have you ever wondered why the sky is blue?"
Handling: Rhetorical questions (no real answer expected) should NOT be split.
This is a hook/engagement question, not a problem requiring scaffolding.
</example>

</teachable_moment_examples>
`;

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Generate visual scaffolding rules for image-based PDFs where text extraction failed.
 *
 * When a PDF is image-based (scanned or exported as images), we can't detect
 * teachable moments from text. Instead, we include ALL scaffolding templates
 * and instruct the AI to identify Q&A pairs visually from the images.
 *
 * @returns Formatted prompt section with visual detection instructions and all templates
 */
export function getVisualScaffoldingRules(): string {
  // Include ALL scaffolding templates since we don't know the content type
  const allTemplates = [
    MATH_SCAFFOLDING_TEMPLATE,
    VOCABULARY_SCAFFOLDING_TEMPLATE,
    COMPREHENSION_SCAFFOLDING_TEMPLATE,
    SCIENCE_SCAFFOLDING_TEMPLATE,
    GENERAL_SCAFFOLDING_TEMPLATE
  ];

  return `
<teachable_moment_formatting>

**IMPORTANT: VISUAL Q&A DETECTION MODE**

The uploaded document is image-based (text could not be extracted). You must VISUALLY identify any question-and-answer pairs in the images and apply scaffolding rules.

VISUAL DETECTION INSTRUCTIONS:
1. Look for questions in the images (sentences ending with ?, math problems, vocabulary terms with definitions)
2. Look for answers near those questions (explicit answers, solutions, definitions)
3. When you find a Q&A pair, apply the scaffolding rules below

== BULLET STRUCTURE (MANDATORY) ==

When you identify a Q&A pair in the images:
- Problem bullet: Contains ONLY the question/problem. NO answer text whatsoever.
- Answer bullet: The immediately following bullet. Contains the answer/solution.
- Problem and answer are ALWAYS consecutive bullets on the SAME slide.
- Never combine problem and answer in one bullet - this causes "answer leakage" where students see the answer before they have time to think.

== TELEPROMPTER SCAFFOLDING (CRITICAL) ==

The teleprompter segment AFTER the problem bullet (BEFORE answer reveal) must contain QUESTIONS that guide student thinking - NOT explanations or answers.

SCAFFOLDING = Questions that help students figure it out themselves
SCAFFOLDING ≠ Telling students the answer or explaining how to solve it

Format: 2-3 SHORT questions with [PAUSE] timing cues (3-5 seconds each)

CORRECT scaffolding for "A $60 bag has 10% off. What is the new price?":
  "To find 10%, we divide by 10. [PAUSE] What's 60 divided by 10? [PAUSE] Now subtract that from the original price."

WRONG scaffolding (DO NOT DO THIS):
  "Ten percent of sixty is six dollars. So sixty minus six gives us fifty-four dollars."
  ^^^ This EXPLAINS the answer - it defeats the purpose! Students don't think, they just listen.

The goal is to make students THINK before the answer appears, not to explain the answer to them.

Content-Specific Scaffolding Templates (use the appropriate one based on content type):
${allTemplates.join('\n')}

${VERBAL_DELIVERABILITY_RULES}

== TELEPROMPTER CONFIRMATION ==

The teleprompter segment AFTER the answer bullet celebrates and extends learning.
Format: Acknowledgment + common misconception or extension

${TEACHABLE_MOMENT_EXAMPLES}

</teachable_moment_formatting>
`;
}

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

**IMPORTANT: These rules OVERRIDE the normal teleprompter rules above for any detected teachable moments (problems with answers).**

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

== TELEPROMPTER SCAFFOLDING (CRITICAL) ==

The teleprompter segment AFTER the problem bullet (BEFORE answer reveal) must contain QUESTIONS that guide student thinking - NOT explanations or answers.

SCAFFOLDING = Questions that help students figure it out themselves
SCAFFOLDING ≠ Telling students the answer or explaining how to solve it

Format: 2-3 SHORT questions with [PAUSE] timing cues (3-5 seconds each)

CORRECT scaffolding for "A $60 bag has 10% off. What is the new price?":
  "What do we know here? [PAUSE] How do we find 10% of a number? [PAUSE] What's 10% of 60?"

WRONG scaffolding (DO NOT DO THIS):
  "Ten percent of sixty is six dollars. So sixty minus six gives us fifty-four dollars."
  ^^^ This EXPLAINS the answer - it defeats the purpose! Students don't think, they just listen.

WRONG scaffolding (DO NOT DO THIS):
  "Let me show you how to calculate this discount step by step..."
  ^^^ This is teacher-led explanation, not student thinking prompts.

The goal is to make students THINK before the answer appears, not to explain the answer to them.

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
