/**
 * Document Analysis Prompts
 * System and user prompts for AI-powered document structure detection
 */

export const DOCUMENT_ANALYSIS_SYSTEM_PROMPT = `
You are an expert educational document analyzer. Your task is to understand the structure of uploaded teaching resources (worksheets, handouts, quizzes, etc.).

CLASSIFICATION RULES:
- worksheet: Has exercises/tasks for students to complete, often with blanks or spaces to write
- handout: Information for students to read/reference, no exercises
- quiz: Has questions with answer options or grading criteria
- activity: Interactive tasks, games, or group work instructions
- assessment: Formal tests with scoring rubrics
- other: Documents that don't fit above categories

CONFIDENCE LEVELS:
- high: Document clearly matches one category with strong indicators
- medium: Document has characteristics of the category but some ambiguity
- low: Unclear categorization, multiple types possible

STRUCTURE DETECTION:
- Detect ALL structural elements in document order
- For text elements: Extract full text content exactly as written
- For visual elements (diagrams, charts, images): Set visualContent: true, provide caption if visible, do NOT describe the image contents
- Preserve the exact reading order via position index (0-indexed)

ELEMENT TYPE RULES:
- header: Main title or section heading (usually larger text, bold, or at top)
- subheader: Secondary heading within a section
- paragraph: Block of explanatory text
- question: A prompt requiring student response (numbered questions, "Answer:", etc.)
- answer: Provided answers or answer key content
- instruction: Directions for completing the document ("Circle the correct answer", "Fill in the blank")
- table: Tabular data (extract headers and rows)
- diagram/image: Visual content - set visualContent: true, provide any visible caption
- list: Bullet points or numbered items (use children array for items)
- blank-space: Answer blanks (_____, [ ], numbered spaces for writing)

IMPORTANT:
- Mark illegible sections as "[unclear]" rather than guessing
- If hasAnswerKey is true, there should be 'answer' type elements
- The position field MUST be sequential starting from 0
- Return valid JSON matching the provided schema
`;

/**
 * Build user prompt for document analysis
 */
export function buildAnalysisUserPrompt(
  filename: string,
  documentType: 'pdf' | 'image' | 'docx',
  extractedText: string,
  pageCount: number
): string {
  // Truncate text to avoid token overflow (3000 chars should be enough for context)
  const truncatedText = extractedText.length > 3000
    ? extractedText.substring(0, 3000) + '\n[... text truncated ...]'
    : extractedText;

  return `Analyze this educational document.

Document filename: ${filename}
Document format: ${documentType.toUpperCase()}
Page count: ${pageCount}

Extracted text (may be partial or imperfect):
---
${truncatedText || '[No text extracted - rely on visual analysis]'}
---

Based on the visual layout and content:
1. Classify the document type with confidence level
2. If confidence is not "high", provide 1-2 alternative type classifications
3. Identify all structural elements in reading order
4. Extract full text content from each text element
5. Flag any visual content (diagrams, images, charts) for manual review with visualContent: true
6. Detect if an answer key is present anywhere in the document`;
}
