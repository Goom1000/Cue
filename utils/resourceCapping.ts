/**
 * Content Capping Utility - Truncate resource text for generation prompts
 *
 * This is a VIEW function: it does NOT modify stored resources.
 * Full content stays intact in UploadedResource for Phase 68 ResourceHub.
 * Capping is applied only when building generation prompts to prevent token overflow.
 */

/** Maximum characters per individual resource */
export const PER_RESOURCE_CAP = 2000;

/** Maximum characters across all resources combined */
export const TOTAL_RESOURCE_CAP = 6000;

/** Maximum number of supplementary resource files */
export const MAX_SUPPLEMENTARY_RESOURCES = 5;

/**
 * Cap resource text content for injection into generation prompts.
 *
 * Applies per-resource cap first, then respects total budget across all resources.
 * Processes resources in array order (first resources get priority).
 * Skips resources without text content (images, etc.).
 *
 * @param resources - Array of resources with optional text content
 * @returns Map of resource ID to capped text string
 */
export function capResourceContent(
  resources: Array<{ id: string; content?: { text?: string } }>
): Map<string, string> {
  const capped = new Map<string, string>();
  let totalUsed = 0;

  for (const resource of resources) {
    const text = resource.content?.text;
    if (!text) continue;

    const remaining = TOTAL_RESOURCE_CAP - totalUsed;
    if (remaining <= 0) break;

    const perCap = Math.min(PER_RESOURCE_CAP, remaining);
    const truncated = text.substring(0, perCap);
    capped.set(resource.id, truncated);
    totalUsed += truncated.length;
  }

  return capped;
}
