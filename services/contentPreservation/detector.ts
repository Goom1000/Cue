/**
 * Content detection module for identifying preservable content in lesson plans.
 * Pure functions that accept text input and return typed detection results.
 *
 * Detection patterns:
 * - DET-01: Questions by punctuation (?)
 * - DET-02: Questions by context (Ask:, Question:)
 * - DET-03: Activities by action verbs (Bloom's taxonomy)
 * - DET-04: Pure, deterministic functions
 */

import {
  DetectedContent,
  ConfidenceLevel,
  ContentType,
  DetectionMethod,
  PreservableContent
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
