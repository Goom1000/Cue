/**
 * Content detection module for identifying preservable content in lesson plans.
 * Pure functions that accept text input and return typed detection results.
 *
 * Detection patterns:
 * - DET-01: Questions by punctuation (?)
 * - DET-02: Questions by context (Ask:, Question:)
 * - DET-03: Activities by action verbs (Bloom's taxonomy)
 * - DET-04: Pure, deterministic functions
 *
 * Teachable Moment Detection (Phase 51):
 * - Answer detection: Answer:, A:, Ans:, A1:, =, equals
 * - Content classification: math, vocabulary, science, comprehension, general
 */

import {
  DetectedContent,
  ConfidenceLevel,
  ContentType,
  DetectionMethod,
  PreservableContent,
  ContentCategory,
  TeachableMoment
} from './types';

// =============================================================================
// Rhetorical Question Patterns
// =============================================================================

/**
 * Patterns that indicate a rhetorical question (should be low confidence).
 * These are enthusiasm markers, not actual questions for students.
 */
const RHETORICAL_PATTERNS = [
  /^Isn't\s/i,
  /^Don't\s+you\s+think/i,
  /^Doesn't\s/i,
  /^Wouldn't\s+it\s+be/i,
  /^Wouldn't\s+you/i,
  /^Shouldn't\s/i,
  /^Can\s+you\s+believe/i,
  /^Have\s+you\s+ever\s+wondered/i,
  /^Isn't\s+it\s+(amazing|incredible|fascinating|wonderful)/i,
];

/**
 * Check if a question text matches rhetorical patterns.
 */
function isRhetorical(text: string): boolean {
  const trimmed = text.trim();
  return RHETORICAL_PATTERNS.some(pattern => pattern.test(trimmed));
}

// =============================================================================
// Deduplication Helper
// =============================================================================

/**
 * Remove overlapping detections, keeping the highest confidence version.
 * Uses startIndex/endIndex to detect overlaps.
 */
function deduplicateOverlapping(results: DetectedContent[]): DetectedContent[] {
  if (results.length <= 1) return results;

  // Sort by start index, then by confidence (high first)
  const sorted = [...results].sort((a, b) => {
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
    const confidenceOrder: Record<ConfidenceLevel, number> = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });

  const deduplicated: DetectedContent[] = [];

  for (const item of sorted) {
    // Check if this item overlaps with any already-kept item
    const overlaps = deduplicated.some(kept => {
      const overlap = item.startIndex < kept.endIndex && item.endIndex > kept.startIndex;
      return overlap;
    });

    if (!overlaps) {
      deduplicated.push(item);
    }
  }

  return deduplicated;
}

// =============================================================================
// Question Detection (DET-01, DET-02)
// =============================================================================

/**
 * Detect questions in text using multiple heuristics.
 *
 * Detection methods:
 * 1. Punctuation-based (high confidence): Sentences ending with ?
 * 2. Context-based (medium confidence): Prefixes like "Ask:", "Question:", "Q1:"
 * 3. Numbered lists (medium confidence): "1. What is...?"
 *
 * Rhetorical questions are flagged as low confidence.
 */
export function detectQuestions(text: string): DetectedContent[] {
  const results: DetectedContent[] = [];

  // -------------------------------------------------------------------------
  // DET-01: Punctuation-based detection (sentences ending with ?)
  // -------------------------------------------------------------------------
  // Use non-greedy matching to avoid capturing across paragraphs
  const questionMarkPattern = /([^.!?\n]*\?)/g;
  let match;

  while ((match = questionMarkPattern.exec(text)) !== null) {
    const questionText = match[1].trim();

    // Skip empty matches or very short matches (likely just "?")
    if (questionText.length < 3) continue;

    // Check for rhetorical patterns
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

  // -------------------------------------------------------------------------
  // DET-02: Context-based detection ("Ask:", "Ask students:", "Question:")
  // -------------------------------------------------------------------------
  const contextPattern = /(?:Ask(?:\s+(?:students|the\s+class))?|Questions?|Q\d+)\s*:?\s*([^.!?\n]+[.!?]?)/gi;

  while ((match = contextPattern.exec(text)) !== null) {
    const questionText = match[1].trim();

    // Skip if empty or too short
    if (questionText.length < 3) continue;

    results.push({
      type: 'question',
      text: questionText,
      confidence: 'medium',
      detectionMethod: 'context',
      startIndex: match.index,
      endIndex: contextPattern.lastIndex
    });
  }

  // -------------------------------------------------------------------------
  // Numbered question lists: "1. What is...?" or "(a) What is...?"
  // -------------------------------------------------------------------------
  const numberedPattern = /(?:^|\n)\s*(?:\d+\.|\([a-z]\))\s*([^.!?\n]*\?)/gm;

  while ((match = numberedPattern.exec(text)) !== null) {
    const questionText = match[1].trim();

    if (questionText.length < 3) continue;

    results.push({
      type: 'question',
      text: questionText,
      confidence: 'medium',
      detectionMethod: 'numbered-list',
      startIndex: match.index,
      endIndex: numberedPattern.lastIndex
    });
  }

  return deduplicateOverlapping(results);
}

// =============================================================================
// Activity Detection (DET-03)
// =============================================================================

/**
 * Bloom's Taxonomy action verbs organized by cognitive level.
 * Used to detect instructional activities in text.
 */
const BLOOM_ACTION_VERBS = {
  remember: ['define', 'identify', 'describe', 'list', 'label', 'name', 'state', 'match', 'select', 'recall'],
  understand: ['summarize', 'interpret', 'classify', 'compare', 'explain', 'discuss', 'distinguish', 'paraphrase'],
  apply: ['solve', 'complete', 'use', 'demonstrate', 'show', 'illustrate', 'apply', 'calculate'],
  analyze: ['analyze', 'contrast', 'differentiate', 'categorize', 'examine', 'investigate', 'organize'],
  evaluate: ['evaluate', 'judge', 'defend', 'critique', 'prioritize', 'assess', 'justify'],
  create: ['create', 'design', 'develop', 'formulate', 'construct', 'plan', 'compose', 'produce']
};

/**
 * Flatten all action verbs into a single array.
 */
const ALL_ACTION_VERBS = Object.values(BLOOM_ACTION_VERBS).flat();

/**
 * Patterns that indicate descriptive context (not imperative instructions).
 * These should be downgraded to low confidence.
 */
const DESCRIPTIVE_PATTERNS = [
  /students\s+will/i,
  /they\s+will/i,
  /you\s+will/i,
  /learners\s+will/i,
  /pupils\s+will/i,
];

/**
 * Check if text is descriptive rather than imperative.
 */
function isDescriptive(text: string): boolean {
  return DESCRIPTIVE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Detect activities in text by identifying Bloom's taxonomy action verbs.
 *
 * Detection focuses on imperative mood (direct instructions like "List 3 examples")
 * vs. descriptive future tense ("Students will list examples").
 *
 * Imperative activities get high confidence, descriptive get low.
 */
export function detectActivities(text: string): DetectedContent[] {
  const results: DetectedContent[] = [];

  // Build pattern for action verbs at sentence start (imperative mood)
  // Match: action verb + rest of sentence up to punctuation
  const verbPattern = new RegExp(
    `(?:^|[.!?]\\s+)(${ALL_ACTION_VERBS.join('|')})\\s+([^.!?]+[.!?])`,
    'gim'
  );

  let match;
  while ((match = verbPattern.exec(text)) !== null) {
    const verb = match[1];
    const restOfSentence = match[2];
    const fullActivity = `${verb} ${restOfSentence}`.trim();

    // Check if it's imperative (direct instruction) vs. descriptive
    const confidence: ConfidenceLevel = isDescriptive(restOfSentence) ? 'low' : 'high';

    results.push({
      type: 'activity',
      text: fullActivity,
      confidence,
      detectionMethod: 'action-verb',
      startIndex: match.index,
      endIndex: verbPattern.lastIndex
    });
  }

  return results;
}

// =============================================================================
// Instruction Detection
// =============================================================================

/**
 * Instruction markers that indicate explicit teacher instructions.
 */
const INSTRUCTION_MARKERS = [
  'Note:',
  'Remember:',
  'Important:',
  'Tip:',
  'Hint:',
  'Warning:',
  'Key point:',
  'Key points:',
];

/**
 * Detect instructions in text by identifying instruction markers.
 *
 * Instructions with explicit markers (Note:, Remember:, Important:) get high confidence.
 */
export function detectInstructions(text: string): DetectedContent[] {
  const results: DetectedContent[] = [];

  // Build pattern for instruction markers
  const markersPattern = INSTRUCTION_MARKERS.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const instructionPattern = new RegExp(
    `(${markersPattern})\\s*([^.!?\\n]+[.!?]?)`,
    'gi'
  );

  let match;
  while ((match = instructionPattern.exec(text)) !== null) {
    const instructionText = match[2].trim();

    // Skip if empty or too short
    if (instructionText.length < 3) continue;

    results.push({
      type: 'instruction',
      text: instructionText,
      confidence: 'high',
      detectionMethod: 'instruction-prefix',
      startIndex: match.index,
      endIndex: instructionPattern.lastIndex
    });
  }

  return results;
}

// =============================================================================
// Answer Detection (Phase 51 - DET-01)
// =============================================================================

/**
 * Answer detection patterns.
 * Matches various ways answers appear near questions.
 */
const ANSWER_PATTERNS: Array<{ pattern: RegExp; extractor: (match: RegExpExecArray) => string }> = [
  // "Answer: X", "A: X", "Ans: X" - explicit answer markers
  {
    pattern: /(?:Answer|Ans|A)\s*:\s*([^.!?\n]+[.!?]?)/gi,
    extractor: (match) => match[1].trim()
  },
  // "A1:", "A2:" - numbered answers
  {
    pattern: /A(\d+)\s*[:.]?\s*([^.!?\n]+[.!?]?)/gi,
    extractor: (match) => match[2].trim()
  },
  // "= 15", "= 3.14" - math results with equals
  {
    pattern: /=\s*(\d+(?:\.\d+)?)/g,
    extractor: (match) => match[1]
  },
  // "equals 42" - written equals
  {
    pattern: /equals\s+(\d+(?:\.\d+)?)/gi,
    extractor: (match) => match[1]
  }
];

/**
 * Find an answer within a text range.
 *
 * @param text - The text to search within (typically text after a question)
 * @param absoluteOffset - The offset to add to match indices for absolute positioning
 * @returns DetectedContent with type 'answer' or null if no answer found
 */
export function findAnswerInRange(text: string, absoluteOffset: number): DetectedContent | null {
  if (!text || text.length === 0) {
    return null;
  }

  for (const { pattern, extractor } of ANSWER_PATTERNS) {
    // Reset pattern for each search
    pattern.lastIndex = 0;

    const match = pattern.exec(text);
    if (match) {
      const answerText = extractor(match);
      if (answerText && answerText.length > 0) {
        return {
          type: 'answer' as ContentType,
          text: answerText,
          confidence: 'high',
          detectionMethod: 'context' as DetectionMethod,
          startIndex: absoluteOffset + match.index,
          endIndex: absoluteOffset + match.index + match[0].length
        };
      }
    }
  }

  return null;
}

// =============================================================================
// Content Classification (Phase 51 - DET-03)
// =============================================================================

/**
 * Math content signals - patterns that indicate mathematical content.
 */
const MATH_SIGNALS = [
  /\d+\s*[+\-*/]\s*\d+/,              // "3 + 4", "12 / 3"
  /=\s*\d+/,                          // "= 15"
  /\d+%/,                             // "10%"
  /\d+\s*\/\s*\d+/,                   // fractions like "3/4"
  /calculate|solve|how many/i,        // action verbs
  /fraction|percent|area|perimeter|sum|difference|square/i
];

/**
 * Vocabulary content signals - patterns that indicate vocabulary/definition content.
 */
const VOCABULARY_SIGNALS = [
  /\bmeans?\b/i,                      // "X means Y"
  /\bis defined as\b/i,               // formal definition
  /\bdefinition\b/i,                  // explicit definition reference
  /\bsynonyms?\b/i,                   // synonym exercises
  /\bantonyms?\b/i                    // antonym exercises
];

/**
 * Science content signals - patterns that indicate science content.
 */
const SCIENCE_SIGNALS = [
  /experiment/i,
  /hypothesis/i,
  /observe[d]?/i,
  /predict/i,
  /chemical/i,
  /reaction/i,
  /photosynthesis|evaporation|condensation/i
];

/**
 * Comprehension content signals - patterns that indicate reading comprehension content.
 */
const COMPREHENSION_SIGNALS = [
  /\bbecause\b/i,                     // cause/reason
  /\btherefore\b/i,                   // conclusion
  /\bwhy does\b|\bwhy did\b/i,        // why questions
  /cause\s*(and|&)?\s*effect/i        // explicit cause-effect
];

/**
 * Classify content into a category for scaffolding selection.
 *
 * Priority order (most specific first):
 * 1. math - numbers with operators, calculate/solve
 * 2. vocabulary - means, defined as, synonyms
 * 3. science - experiment, hypothesis, chemical
 * 4. comprehension - because, therefore, why
 * 5. general - default fallback
 *
 * @param problemText - The question/problem text
 * @param answerText - The answer text
 * @returns ContentCategory classification
 */
export function classifyContentCategory(problemText: string, answerText: string): ContentCategory {
  const combined = `${problemText} ${answerText}`;

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

// =============================================================================
// Main Aggregation Function
// =============================================================================

/**
 * Detect all preservable content in text.
 *
 * Returns an aggregated result with questions, activities, and instructions
 * categorized separately, plus an 'all' array sorted by position in text.
 *
 * This is a pure function (no side effects) and deterministic (same input = same output).
 */
export function detectPreservableContent(text: string): PreservableContent {
  const questions = detectQuestions(text);
  const activities = detectActivities(text);
  const instructions = detectInstructions(text);

  // Combine and sort by position in text
  const all = [...questions, ...activities, ...instructions]
    .sort((a, b) => a.startIndex - b.startIndex);

  return { questions, activities, instructions, all };
}

// =============================================================================
// Teachable Moment Detection (Phase 51-02)
// =============================================================================

/**
 * Maximum character distance between question end and answer start for pairing.
 * Answers beyond this distance are not associated with the question.
 * Configurable for future tuning based on real-world content analysis.
 */
export const PROXIMITY_THRESHOLD = 200;

/**
 * Default throttle percentage for teachable moment detection.
 * Limits detected moments to at most 30% of content bullets to preserve lesson flow.
 */
const DEFAULT_MAX_PERCENT = 0.3;

/**
 * Estimate bullet count from text content.
 * Uses newlines as bullet boundaries, with a minimum of 1.
 *
 * @param text - The text to analyze
 * @returns Estimated number of bullets/content items
 */
function estimateBulletCount(text: string): number {
  // Split by newlines and filter out empty lines
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return Math.max(1, lines.length);
}

/**
 * Throttle teachable moment detections to maintain lesson flow.
 *
 * Limits the number of moments to at most maxPercent of bulletCount.
 * Sorts by confidence (high first), then by proximity (closer first)
 * to prioritize the most reliable detections.
 *
 * @param moments - Array of detected teachable moments
 * @param bulletCount - Estimated number of bullets/content items in text
 * @param maxPercent - Maximum percentage of bullets that can be moments (0.0-1.0)
 * @returns Throttled array of teachable moments
 */
export function throttleDetections(
  moments: TeachableMoment[],
  bulletCount: number,
  maxPercent: number
): TeachableMoment[] {
  if (moments.length === 0) {
    return [];
  }

  // Ensure bulletCount is at least 1 to avoid division issues
  const safeBulletCount = Math.max(1, bulletCount);

  // Calculate maximum allowed moments
  const maxAllowed = Math.floor(safeBulletCount * maxPercent);

  // If already under limit, return original (preserving original order)
  if (moments.length <= maxAllowed) {
    return moments;
  }

  // Sort by: confidence (high > medium > low), then by proximityChars (closer first)
  const confidenceOrder: Record<ConfidenceLevel, number> = { high: 0, medium: 1, low: 2 };

  const sorted = [...moments].sort((a, b) => {
    // First: confidence (high first)
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;

    // Second: proximity (closer first)
    return a.proximityChars - b.proximityChars;
  });

  // Take top N moments up to max allowed
  const selected = sorted.slice(0, Math.max(1, maxAllowed));

  // Re-sort by position for consistent output ordering
  return selected.sort((a, b) => a.problem.startIndex - b.problem.startIndex);
}

/**
 * Detect teachable moments in text - problem-answer pairs suitable for delayed reveal.
 *
 * This function:
 * 1. Detects questions using existing detectQuestions function
 * 2. Filters out rhetorical questions (low confidence)
 * 3. For each question, searches for an answer within PROXIMITY_THRESHOLD characters
 * 4. Classifies each moment by content type (math, vocabulary, etc.)
 * 5. Applies throttling to limit to 30% of content bullets
 *
 * This is a pure function (DET-04): same input always produces same output.
 *
 * @param text - Raw lesson text (PDF content, slide text, speaker notes)
 * @returns Array of TeachableMoment objects, throttled and sorted by position
 */
export function detectTeachableMoments(text: string): TeachableMoment[] {
  // Step 1: Detect questions
  const questions = detectQuestions(text);

  // Step 2: Filter out rhetorical questions (confidence === 'low')
  const realQuestions = questions.filter(q => q.confidence !== 'low');

  // Step 3: Build teachable moments by finding paired answers
  const moments: TeachableMoment[] = [];

  for (const question of realQuestions) {
    // Search for answer after the question, within proximity threshold
    const searchStart = question.endIndex;
    const searchEnd = Math.min(text.length, searchStart + PROXIMITY_THRESHOLD);
    const searchText = text.slice(searchStart, searchEnd);

    const answer = findAnswerInRange(searchText, searchStart);

    // Calculate proximity (distance between question end and answer start)
    const proximityChars = answer ? answer.startIndex - question.endIndex : PROXIMITY_THRESHOLD;

    // Classify content category
    const answerText = answer?.text || '';
    const contentCategory = classifyContentCategory(question.text, answerText);

    // Determine confidence (inherit from answer if found, otherwise medium)
    const confidence: ConfidenceLevel = answer ? answer.confidence : 'medium';

    moments.push({
      problem: question,
      answer: answer,
      contentCategory,
      confidence,
      proximityChars
    });
  }

  // Step 4: Estimate bullet count for throttling
  const bulletCount = estimateBulletCount(text);

  // Step 5: Apply throttling to limit to 30% of bullets
  const throttled = throttleDetections(moments, bulletCount, DEFAULT_MAX_PERCENT);

  // Return sorted by position (throttleDetections already does this)
  return throttled;
}
