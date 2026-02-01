/**
 * Types for the content preservation detection system.
 * Used to identify and preserve teacher-specified content (questions, activities, instructions)
 * that must appear verbatim on slides rather than being generalized by AI.
 */

// Content types that can be preserved
export type ContentType = 'question' | 'activity' | 'instruction';

// Confidence levels for detection
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Detection method identifier
export type DetectionMethod =
  | 'punctuation'        // Detected by ? ending
  | 'context'            // Detected by "Ask:", "Question:" prefix
  | 'numbered-list'      // Detected as part of numbered question list
  | 'action-verb'        // Detected by Bloom's taxonomy action verbs
  | 'instruction-prefix'; // Detected by instruction markers

// Individual detected content item
export interface DetectedContent {
  type: ContentType;
  text: string;
  confidence: ConfidenceLevel;
  detectionMethod: DetectionMethod;
  startIndex: number;
  endIndex: number;
}

// Aggregated preservation results
export interface PreservableContent {
  questions: DetectedContent[];
  activities: DetectedContent[];
  instructions: DetectedContent[];
  all: DetectedContent[];  // Convenience: sorted by startIndex
}

// =============================================================================
// Teachable Moment Detection Types (Phase 51)
// =============================================================================

// Content categories for scaffolding selection
export type ContentCategory = 'math' | 'vocabulary' | 'comprehension' | 'science' | 'general';

// Extended detection method for answer patterns
export type AnswerDetectionMethod =
  | 'answer-marker'     // "Answer:", "A:", "Ans:"
  | 'numbered-answer'   // "A1:", "A2:"
  | 'math-result'       // "= 15", "equals 42"
  | 'definition';       // "X means Y", "defined as"

// A detected problem-answer pair that should trigger delayed reveal
export interface TeachableMoment {
  problem: DetectedContent;           // The question/problem portion
  answer: DetectedContent | null;     // The paired answer (null if not found within proximity)
  contentCategory: ContentCategory;   // Classification for scaffolding
  confidence: ConfidenceLevel;        // Combined confidence of the detection
  proximityChars: number;             // Distance in characters between problem end and answer start
}
