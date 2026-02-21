/**
 * PDF Processor - Extract thumbnail, page images, and text using pdf.js
 * Uses existing pdf.js CDN loaded in index.html
 */

import { extractTextWithLineBreaks } from './pdfTextExtractor';

declare const pdfjsLib: any;

// Maximum pages to extract for AI analysis (avoid token overflow)
const MAX_PAGES_FOR_ANALYSIS = 10;

export interface PdfProcessResult {
  thumbnail: string;
  pageCount: number;
  type: 'pdf';
  images: string[];  // Base64 page images for AI analysis (no data URL prefix)
  text: string;      // Extracted text content
}

/**
 * Process a PDF file to extract thumbnail, page images, and text.
 * Throws error with code 'TOO_MANY_PAGES' if pageCount > 20.
 */
export async function processPdf(file: File): Promise<PdfProcessResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Set worker source (must be set before getDocument)
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const pageCount = pdf.numPages;

  // Validate page count (max 20 pages)
  if (pageCount > 20) {
    throw { code: 'TOO_MANY_PAGES', message: `PDF has ${pageCount} pages (maximum 20)` };
  }

  // Generate thumbnail from first page (smaller scale)
  const firstPage = await pdf.getPage(1);
  const thumbViewport = firstPage.getViewport({ scale: 0.5 });
  const thumbCanvas = document.createElement('canvas');
  const thumbContext = thumbCanvas.getContext('2d')!;
  thumbCanvas.height = thumbViewport.height;
  thumbCanvas.width = thumbViewport.width;
  await firstPage.render({ canvasContext: thumbContext, viewport: thumbViewport }).promise;
  const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

  // Extract page images for AI analysis (higher resolution, limited pages)
  const pagesToExtract = Math.min(pageCount, MAX_PAGES_FOR_ANALYSIS);
  const images: string[] = [];
  const textParts: string[] = [];

  for (let i = 1; i <= pagesToExtract; i++) {
    const page = await pdf.getPage(i);

    // Render page at scale 1.5 for good AI accuracy
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;

    // Get base64 without data URL prefix (API expects raw base64)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    images.push(dataUrl.split(',')[1]);

    // Extract text content
    const textContent = await page.getTextContent();
    const pageText = extractTextWithLineBreaks(textContent.items);
    if (pageText.trim()) {
      textParts.push(`[Page ${i}]\n${pageText}`);
    }
  }

  const text = textParts.join('\n\n');

  return { thumbnail, pageCount, type: 'pdf', images, text };
}
