/**
 * PPTX Processor - Extract text from PowerPoint slides using JSZip + DOMParser
 * Generates placeholder thumbnail (PowerPoint icon) since PPTX can't be rendered in browser
 * Text-only extraction: no images from ppt/media/ (would bloat save files)
 */

import JSZip from 'jszip';

export interface PptxProcessResult {
  thumbnail: string;
  pageCount: number;
  type: 'pptx';
  text: string;
}

// Simple PowerPoint icon as inline SVG data URL (orange/red branding #D24726)
const PPTX_ICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
  <rect x="12" y="8" width="72" height="80" rx="4" fill="#D24726"/>
  <path d="M24 28h48M24 40h48M24 52h48M24 64h32" stroke="white" stroke-width="4" stroke-linecap="round"/>
  <text x="48" y="82" text-anchor="middle" fill="white" font-size="14" font-weight="bold">PPTX</text>
</svg>
`)}`;

// DrawingML namespace for text extraction
const DRAWING_ML_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

/**
 * Process a PowerPoint file to extract text from all slides.
 * Throws error with code 'TOO_MANY_PAGES' if slide count > 20.
 */
export async function processPptx(file: File): Promise<PptxProcessResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find slide XML files matching ppt/slides/slideN.xml pattern
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml$/)![1], 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml$/)![1], 10);
      return numA - numB;
    });

  // Validate slide count (max 20 slides)
  if (slideFiles.length > 20) {
    throw {
      code: 'TOO_MANY_PAGES',
      message: `Presentation has ${slideFiles.length} slides (maximum 20)`
    };
  }

  const parser = new DOMParser();
  const slideTexts: string[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('string');
    const doc = parser.parseFromString(xml, 'application/xml');

    // Extract paragraphs from DrawingML namespace
    const paragraphs = doc.getElementsByTagNameNS(DRAWING_ML_NS, 'p');
    const paragraphTexts: string[] = [];

    for (let p = 0; p < paragraphs.length; p++) {
      const tElements = paragraphs[p].getElementsByTagNameNS(DRAWING_ML_NS, 't');
      const parts: string[] = [];

      for (let t = 0; t < tElements.length; t++) {
        const text = tElements[t].textContent;
        if (text) parts.push(text);
      }

      const paragraphText = parts.join('');
      if (paragraphText.trim()) {
        paragraphTexts.push(paragraphText.trim());
      }
    }

    if (paragraphTexts.length > 0) {
      slideTexts.push(`[Slide ${i + 1}]\n${paragraphTexts.join('\n')}`);
    }
  }

  const allText = slideTexts.join('\n\n');

  return {
    thumbnail: PPTX_ICON,
    pageCount: slideFiles.length,
    type: 'pptx',
    text: allText
  };
}
