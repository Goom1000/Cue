/**
 * DOCX Text Extractor - Preserves heading structure from Word documents
 *
 * mammoth.extractRawText() strips all styling, so heading-based markers
 * like "## Day 1" or "## Hook" are lost. Instead, we use mammoth.convertToHtml()
 * to get styled HTML, then convert that HTML to text with markdown heading markers.
 * This preserves the structure needed for scripted lesson parsing.
 */

import mammoth from 'mammoth';

/**
 * Extract text from a DOCX file, preserving heading markers.
 * Uses mammoth's HTML output to detect headings, then converts to plain text
 * with ## / ### prefixes for h2/h3 elements.
 */
export async function extractDocxTextWithHeadings(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return htmlToTextWithHeadings(result.value);
}

/**
 * Convert mammoth HTML output to text, preserving heading levels.
 * - <h1> → # prefix
 * - <h2> → ## prefix
 * - <h3> → ### prefix
 * - <p>, <li> → text + newline
 * - Strips remaining HTML tags
 * - Decodes common HTML entities
 */
export function htmlToTextWithHeadings(html: string): string {
  let text = html;

  // Convert headings to markdown markers
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');

  // Convert block elements to newlines
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');

  // Clean up excessive blank lines (3+ → 2)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
