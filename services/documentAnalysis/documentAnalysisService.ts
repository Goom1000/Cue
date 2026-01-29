/**
 * Document Analysis Service
 * Orchestrates AI-powered document structure detection
 * Extracts images from uploaded resources and coordinates with AI providers
 */

import { UploadedResource, DocumentAnalysis } from '../../types';
import { AIProviderInterface } from '../aiProvider';

// Declare pdf.js from CDN (loaded in index.html)
declare const pdfjsLib: any;

// Maximum pages to render for AI analysis (token limits)
const MAX_PAGES_FOR_ANALYSIS = 10;

// PDF.js worker URL (same as used in pdfProcessor)
const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Result of document analysis with UI state hints
 */
export interface AnalysisResult {
  analysis: DocumentAnalysis;
  needsTypeConfirmation: boolean; // True if user should confirm/select document type
}

/**
 * Extract page images from a PDF file for AI analysis.
 * Renders pages at higher resolution than thumbnails for better AI accuracy.
 */
async function extractPdfImages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const pagesToRender = Math.min(pdf.numPages, MAX_PAGES_FOR_ANALYSIS);
  const images: string[] = [];

  for (let i = 1; i <= pagesToRender; i++) {
    const page = await pdf.getPage(i);
    // Scale 1.5 for good AI accuracy without excessive token usage
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;

    // Get base64 without data URL prefix (API expects raw base64)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    images.push(dataUrl.split(',')[1]);
  }

  return images;
}

/**
 * Extract text content from a PDF file for AI analysis.
 * Supplements visual analysis with extracted text.
 */
async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const pagesToExtract = Math.min(pdf.numPages, MAX_PAGES_FOR_ANALYSIS);
  const textParts: string[] = [];

  for (let i = 1; i <= pagesToExtract; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    if (pageText.trim()) {
      textParts.push(`[Page ${i}]\n${pageText}`);
    }
  }

  return textParts.join('\n\n');
}

/**
 * Get images for analysis from an UploadedResource.
 * Routes based on resource type.
 */
async function getImagesForAnalysis(
  resource: UploadedResource,
  originalFile?: File
): Promise<string[]> {
  switch (resource.type) {
    case 'image':
      // Image resources have base64 in content.images (from imageProcessor)
      return resource.content?.images || [];

    case 'pdf':
      // PDF needs page rendering - requires original file
      if (!originalFile) {
        throw new Error('Original file required for PDF analysis');
      }
      return extractPdfImages(originalFile);

    case 'docx':
      // DOCX has no visual rendering - AI relies on extracted text
      return [];

    default:
      return [];
  }
}

/**
 * Get text content for analysis from an UploadedResource.
 */
async function getTextForAnalysis(
  resource: UploadedResource,
  originalFile?: File
): Promise<string> {
  // DOCX and image resources have text in content.text (from processors)
  if (resource.content?.text) {
    return resource.content.text;
  }

  // PDF needs text extraction - requires original file
  if (resource.type === 'pdf' && originalFile) {
    return extractPdfText(originalFile);
  }

  return '';
}

/**
 * Analyze an uploaded document to detect structure and content.
 *
 * @param resource - The UploadedResource from upload service
 * @param provider - AI provider instance (Gemini or Claude)
 * @param originalFile - Original File object (required for PDF processing)
 * @returns Analysis result with detected type, elements, and UI hints
 */
export async function analyzeUploadedDocument(
  resource: UploadedResource,
  provider: AIProviderInterface,
  originalFile?: File
): Promise<AnalysisResult> {
  // Extract images and text for AI analysis
  const [images, text] = await Promise.all([
    getImagesForAnalysis(resource, originalFile),
    getTextForAnalysis(resource, originalFile)
  ]);

  // Run AI analysis
  const analysis = await provider.analyzeDocument(
    images,
    text,
    resource.type,
    resource.filename,
    resource.pageCount
  );

  // Determine if user should confirm document type
  // Show confirmation if:
  // - Confidence is not high
  // - Alternative types were suggested
  const needsTypeConfirmation =
    analysis.documentTypeConfidence !== 'high' ||
    (analysis.alternativeTypes && analysis.alternativeTypes.length > 0);

  return { analysis, needsTypeConfirmation };
}

/**
 * Update document type in analysis (when user overrides AI classification).
 * Returns new analysis with updated type.
 */
export function overrideDocumentType(
  analysis: DocumentAnalysis,
  newType: DocumentAnalysis['documentType']
): DocumentAnalysis {
  return {
    ...analysis,
    documentType: newType,
    documentTypeConfidence: 'high', // User confirmed
    alternativeTypes: undefined // Clear alternatives
  };
}
