/**
 * Content Preservation Rules for AI Slide Generation.
 * Generates XML-tagged instructions that tell the AI to preserve
 * specific questions, activities, and instructions verbatim.
 */

import { DetectedContent, PreservableContent, ConfidenceLevel } from '../contentPreservation/types';

/**
 * Escape special XML characters to prevent parsing issues.
 * Teachers may write content like "Compare <plant> and <animal> cells"
 * which would break XML structure without escaping.
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build a single preserve tag for a detected content item.
 */
function buildPreserveTag(item: DetectedContent): string {
  const escapedText = escapeXml(item.text);
  return `  <preserve type="${item.type}" method="${item.detectionMethod}">${escapedText}</preserve>`;
}

/**
 * Few-shot examples for edge case handling.
 * These help the AI understand nuanced preservation scenarios.
 */
const FEW_SHOT_EXAMPLES = `
<preservation_examples>

<example scenario="direct-question">
Source: "What is the water cycle? Explain evaporation first."
Detected: <preserve type="question">What is the water cycle?</preserve>
Output: Slide shows "What is the water cycle?" exactly as written, with supporting content around it.
</example>

<example scenario="activity-instruction">
Source: "List 3 examples of renewable energy. Discuss with your partner."
Detected: <preserve type="activity">List 3 examples of renewable energy.</preserve>
         <preserve type="activity">Discuss with your partner.</preserve>
Output: Both instructions appear verbatim on the slide or in sequence.
</example>

<example scenario="embedded-question">
Source: "The key question to consider is: How does photosynthesis work?"
Detected: <preserve type="question">How does photosynthesis work?</preserve>
Output: Slide shows "How does photosynthesis work?" - the wrapper text may be paraphrased.
</example>

</preservation_examples>
`;

/**
 * Core preservation rules that apply regardless of detected content.
 */
const PRESERVATION_RULES = `
CONTENT PRESERVATION RULES:

When preserved content is provided, you MUST:
1. Include the EXACT text of each <preserve> item on an appropriate slide
2. Match wording, punctuation, and capitalization precisely
3. Place questions in prominent positions (titles or key bullet points)
4. Place activities as clear instructions students can follow

You MAY:
- Add supporting context around preserved items
- Decide which slide is most appropriate for each item
- Rephrase surrounding (non-preserved) content as needed

You MUST NOT:
- Paraphrase or generalize preserved content
- Split preserved sentences into fragments
- Omit any preserved item from the output
- Change "What is 3/4 of 12?" to "Practice fractions" or similar generalizations
`;

/**
 * Build the complete preservation prompt section from detected content.
 * Returns empty string if no content detected (don't clutter prompt).
 *
 * @param detectedItems Array of detected content items to preserve
 * @param minConfidence Minimum confidence level to include (default: skip 'low')
 * @returns Formatted prompt section or empty string
 */
export function buildPreservationPrompt(
  detectedItems: DetectedContent[],
  minConfidence: ConfidenceLevel = 'medium'
): string {
  // Filter by confidence
  const confidenceOrder: ConfidenceLevel[] = ['low', 'medium', 'high'];
  const minIndex = confidenceOrder.indexOf(minConfidence);

  const filteredItems = detectedItems.filter(item => {
    const itemIndex = confidenceOrder.indexOf(item.confidence);
    return itemIndex >= minIndex;
  });

  // No items to preserve - return empty to avoid cluttering prompt
  if (filteredItems.length === 0) {
    return '';
  }

  const preserveTags = filteredItems.map(buildPreserveTag).join('\n');

  return `
<content_preservation>
${PRESERVATION_RULES}

DETECTED CONTENT TO PRESERVE:
<preservable_content>
${preserveTags}
</preservable_content>

${FEW_SHOT_EXAMPLES}
</content_preservation>
`;
}

/**
 * Teleprompter-specific preservation rules.
 * Questions and activities need delivery context in speaker notes.
 */
const TELEPROMPTER_PRESERVATION_RULES = `
SPEAKER NOTES FOR PRESERVED CONTENT:

When a slide contains preserved content, the teleprompter should:

For QUESTIONS:
- Introduce the question: "Now ask the class:"
- Include the exact question text
- Add follow-up prompts: "[Wait for responses]", "[Call on 2-3 students]"
- Provide expected answer hints for the teacher

For ACTIVITIES:
- Set up the activity: "Time for a quick activity:"
- Include the exact instruction
- Add timing cues: "[Give them 2 minutes]", "[Walk around and observe]"
- Provide wrap-up guidance

Example teleprompter for a preserved question:
"Now let's check understanding. Ask the class: 'What is 3/4 of 12?' [PAUSE - wait for hands] Look for students who might be struggling. The answer we're looking for is 9."
`;

/**
 * Build preservation prompt from PreservableContent result.
 * Convenience wrapper that handles the aggregated detection output.
 *
 * @param content PreservableContent from detectPreservableContent()
 * @param minConfidence Minimum confidence level to include
 * @returns Formatted prompt section or empty string
 */
export function getPreservationRules(
  content: PreservableContent,
  minConfidence: ConfidenceLevel = 'medium'
): string {
  return buildPreservationPrompt(content.all, minConfidence);
}

/**
 * Build teleprompter-specific preservation guidance.
 * Adds delivery context rules for questions and activities.
 *
 * @param content PreservableContent from detectPreservableContent()
 * @returns Teleprompter guidance section or empty string
 */
export function getTeleprompterPreservationRules(
  content: PreservableContent
): string {
  const hasQuestions = content.questions.length > 0;
  const hasActivities = content.activities.length > 0;

  if (!hasQuestions && !hasActivities) {
    return '';
  }

  return TELEPROMPTER_PRESERVATION_RULES;
}
