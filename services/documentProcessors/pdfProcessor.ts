/**
 * PDF Processor - Extract thumbnail and page count using pdf.js
 * Uses existing pdf.js CDN loaded in index.html
 */

declare const pdfjsLib: any;

export interface PdfProcessResult {
  thumbnail: string;
  pageCount: number;
  type: 'pdf';
}

/**
 * Process a PDF file to extract thumbnail and page count.
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

  // Generate thumbnail from first page
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 }); // Smaller for thumbnail
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: context, viewport }).promise;
  const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

  return { thumbnail, pageCount, type: 'pdf' };
}
