/**
 * Resource Injection Utility - Build prompt text from supplementary resources
 *
 * Provider-agnostic: both Gemini and Claude use the same output string.
 * Uses capResourceContent to respect per-resource and total token budgets.
 */

import { capResourceContent } from './resourceCapping';
import { UploadedResource } from '../types';

/**
 * Build a formatted prompt section from supplementary resources for AI injection.
 *
 * Returns an empty string if no resources or no resources have text content,
 * so callers can safely append without conditional checks.
 *
 * @param resources - Supplementary resources uploaded by the teacher
 * @returns Formatted prompt section string (or empty string)
 */
export function buildResourceInjectionText(resources: UploadedResource[]): string {
  if (!resources || resources.length === 0) return '';

  const capped = capResourceContent(resources);
  if (capped.size === 0) return '';

  let text = '\n\n---\nSUPPLEMENTARY TEACHING RESOURCES\nWeave content from these resources into relevant slides. Add callout references like "[See: {filename}]" on slides where the resource is most relevant.\n\n';

  for (const resource of resources) {
    const cappedText = capped.get(resource.id);
    if (cappedText) {
      text += `### ${resource.filename}\n${cappedText}\n\n`;
    }
  }

  return text;
}
