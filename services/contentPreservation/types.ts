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
