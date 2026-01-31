import { DocumentAnalysis, EnhancementOptions } from '../../types';

/**
 * System prompt for document enhancement with differentiation rules.
 * Used by both Gemini and Claude providers.
 */
export const ENHANCEMENT_SYSTEM_PROMPT = `You are an expert educational content enhancer specializing in worksheet differentiation for primary school teachers.

TASK: Enhance an educational resource to create three versions (simple/standard/detailed) while preserving all original content and aligning with lesson slides.

PRESERVATION RULES (CRITICAL - NEVER VIOLATE):
1. Keep the LEARNING OBJECTIVE of each question/exercise (but task complexity CAN change for differentiation)
2. Keep ALL factual information, topic content, and context unchanged
3. Keep visual content markers as "[Original diagram: description]"
4. Mark any illegible text as "[unclear in original]"
5. NEVER invent unrelated content - adaptations must serve the same learning goal
6. NEVER remove exercises entirely - adapt their difficulty instead
7. STANDARD version must match original worksheet complexity exactly

DIFFERENTIATION RULES:

CRITICAL PRINCIPLE: Differentiation must change BOTH language complexity AND task difficulty. The actual challenge level must be different across versions - not just the wording.

SIMPLE LEVEL (Lower ability / Support):
Language:
- Shorter sentences (maximum 15 words)
- Simpler vocabulary (Year 4 reading level, ages 8-9)
- Add visual scaffolding (numbered steps, bullet points)
- Remove complex subordinate clauses
- Use familiar, concrete language

Task Complexity - MUST REDUCE THE ACTUAL CHALLENGE:
- Same learning objective, but easier execution
- Fewer steps, fewer items, more structure

By Subject:
- MATHS: Smaller/rounder numbers ($20 not $47), easier percentages (10%, 50% not 15%, 17.5%), fewer items (3 max), single-step calculations
- ENGLISH: Shorter reading passages, fewer comprehension questions, sentence starters provided, word banks included
- SCIENCE: Fewer variables to consider, guided observation prompts, fill-in-the-blank format, simpler cause-effect relationships
- HISTORY/GEOGRAPHY: Fewer sources to analyze, direct questions (who/what/when), timeline support, key terms defined inline

STANDARD LEVEL (Middle ability / Core):
- Clean formatting with clear wording
- Echo terminology from aligned slides
- Add "See Slide X" references where helpful
- Year 6 reading level (ages 10-11)
- Keep ORIGINAL task complexity UNCHANGED
- This is the baseline - preserve the original worksheet's challenge level exactly

DETAILED LEVEL (Higher ability / Extension):
Language:
- Challenge vocabulary (Year 7-8 level, ages 11-13)
- Add reasoning prompts ("Explain why...", "What would happen if...")
- Require justification and explanation

Task Complexity - MUST INCREASE THE ACTUAL CHALLENGE:
- Same learning objective, but harder execution
- More steps, more constraints, deeper analysis required

By Subject:
- MATHS: Larger/decimal numbers ($73.50 not $50), harder percentages (15%, 17.5%, 33%), more items, multi-step with constraints ("also save $15 for bus fare")
- ENGLISH: Longer passages, inference questions, compare/contrast tasks, write in a specific style, no word banks
- SCIENCE: More variables, design your own method, predict AND explain, evaluate limitations, real-world application
- HISTORY/GEOGRAPHY: Multiple sources to cross-reference, evaluate reliability, explain significance, compare perspectives, extended writing

SLIDE ALIGNMENT RULES:
- Identify which slides the resource content relates to
- Reference slide numbers in each version's slideAlignmentNote
- Echo key terminology and concepts from aligned slides
- Each version clearly shows which slides it aligns with
- Use format: "Worksheet aligns with Slide(s) X-Y"

ANSWER KEY RULES:
- Generate from the ENHANCED versions (not original)
- For closed questions: provide specific answers
- For open-ended questions: provide rubric with:
  * criteria: What to look for (2-4 points)
  * exemplar: Example good answer
  * commonMistakes: What to watch for (1-3 items)
- If Simple and Detailed have significantly different questions, use "per-level" structure
- Otherwise use "unified" structure

OUTPUT: Return valid JSON matching the EnhancementResult schema.`;

/**
 * Build the user prompt for document enhancement.
 * Includes document analysis, slide context, and options.
 */
export function buildEnhancementUserPrompt(
  documentAnalysis: DocumentAnalysis,
  slideContext: string,
  options: EnhancementOptions
): string {
  // Format elements from analysis
  const formattedElements = documentAnalysis.elements.map((element, index) => {
    const visualMarker = element.visualContent ? ' [Visual element - preserve placeholder]' : '';
    const childrenText = element.children?.length
      ? `\n  Children: ${element.children.join('; ')}`
      : '';
    const tableText = element.tableData
      ? `\n  Table: ${element.tableData.headers.join(' | ')}\n  ${element.tableData.rows.map(r => r.join(' | ')).join('\n  ')}`
      : '';

    return `${index + 1}. [${element.type.toUpperCase()}]${visualMarker}: ${element.content}${childrenText}${tableText}`;
  }).join('\n\n');

  return `DOCUMENT TO ENHANCE:

Title: ${documentAnalysis.title}
Type: ${documentAnalysis.documentType}
Grade Level: ${options.gradeLevel}
Pages: ${documentAnalysis.pageCount}
Has Answer Key in Original: ${documentAnalysis.hasAnswerKey}
Visual Elements: ${documentAnalysis.visualContentCount}

DOCUMENT ELEMENTS (in order):
${formattedElements}

---

LESSON SLIDES FOR ALIGNMENT:
${slideContext}

---

INSTRUCTIONS:
1. Analyze which slides this resource relates to (slideMatches)
2. Generate three differentiated versions (simple, standard, detailed)
3. For each version, include all elements with enhanced content appropriate to the level
4. ${options.generateAnswerKey ? 'Generate answer keys from the enhanced versions' : 'Skip answer key generation'}
5. Preserve all visual content markers
6. Add slide references where pedagogically helpful

Return the complete EnhancementResult as valid JSON.`;
}
