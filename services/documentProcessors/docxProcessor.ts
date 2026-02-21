/**
 * DOCX Processor - Extract text using mammoth.js
 * Generates placeholder thumbnail (Word icon) since DOCX can't be rendered in browser
 */

import { extractDocxTextWithHeadings } from './docxTextExtractor';

export interface DocxProcessResult {
  thumbnail: string;
  pageCount: number;  // Estimated from character count
  type: 'docx';
  text: string;
}

// Simple Word document icon as inline SVG data URL
const DOCX_ICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <rect x="12" y="8" width="72" height="80" rx="4" fill="#2B579A"/>
  <path d="M24 28h48M24 40h48M24 52h48M24 64h32" stroke="white" stroke-width="4" stroke-linecap="round"/>
  <text x="48" y="82" text-anchor="middle" fill="white" font-size="14" font-weight="bold">DOCX</text>
</svg>
`)}`;

/**
 * Process a Word document to extract text and estimate page count.
 * Throws error with code 'TOO_MANY_PAGES' if estimated pages > 20.
 */
export async function processDocx(file: File): Promise<DocxProcessResult> {
  const arrayBuffer = await file.arrayBuffer();
  const text = await extractDocxTextWithHeadings(arrayBuffer);

  // Estimate pages (~3000 chars per page)
  const pageCount = Math.max(1, Math.ceil(text.length / 3000));

  // Validate page count (max 20 pages)
  if (pageCount > 20) {
    throw {
      code: 'TOO_MANY_PAGES',
      message: `Document has approximately ${pageCount} pages (maximum 20)`
    };
  }

  return {
    thumbnail: DOCX_ICON,
    pageCount,
    type: 'docx',
    text
  };
}
