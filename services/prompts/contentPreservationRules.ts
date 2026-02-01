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
