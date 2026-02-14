/**
 * Upload Service - File validation and processing orchestration
 * Routes uploads to appropriate document processors based on file type
 */

import { UploadedResource, UploadValidationError } from '../types';
import { processPdf } from './documentProcessors/pdfProcessor';
import { processImage } from './documentProcessors/imageProcessor';
import { processDocx } from './documentProcessors/docxProcessor';
import { processPptx } from './documentProcessors/pptxProcessor';

// File size limit: 25MB
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

// Accepted MIME types mapped to our resource types
const ACCEPTED_TYPES: Record<string, 'pdf' | 'image' | 'docx' | 'pptx'> = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
};

// Accepted file extensions (fallback for MIME detection)
const EXTENSION_MAP: Record<string, 'pdf' | 'image' | 'docx' | 'pptx'> = {
  '.pdf': 'pdf',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.docx': 'docx',
  '.pptx': 'pptx'
};

/**
 * Detect file type from MIME type or extension fallback.
 * Returns null if unsupported.
 */
export function getFileType(file: File): 'pdf' | 'image' | 'docx' | 'pptx' | null {
  // Check MIME type first
  if (ACCEPTED_TYPES[file.type]) {
    return ACCEPTED_TYPES[file.type];
  }

  // Fallback to extension (some browsers don't set MIME correctly)
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return EXTENSION_MAP[ext] || null;
}

/**
 * Validate file before processing.
 * Returns null if valid, or error object if invalid.
 */
export function validateFile(file: File): UploadValidationError | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      code: 'FILE_TOO_LARGE',
      message: `File size (${sizeMB}MB) exceeds 25MB limit`
    };
  }

  // Check file type
  const fileType = getFileType(file);
  if (!fileType) {
    return {
      code: 'UNSUPPORTED_TYPE',
      message: `Unsupported file type. Please upload PDF, PNG, JPG, DOCX, or PPTX files.`
    };
  }

  return null;
}

/**
 * Process an uploaded file and return an UploadedResource.
 * Validates first, then routes to appropriate processor.
 * Throws UploadValidationError on failure.
 */
export async function processUploadedFile(file: File): Promise<UploadedResource> {
  // Validate first
  const validationError = validateFile(file);
  if (validationError) {
    throw validationError;
  }

  const fileType = getFileType(file)!; // Safe - validated above

  // Route to appropriate processor
  let result: {
    thumbnail: string;
    pageCount: number;
    type: 'pdf' | 'image' | 'docx' | 'pptx';
    text?: string;
    base64?: string;
    images?: string[];  // For PDF page images
  };

  try {
    switch (fileType) {
      case 'pdf':
        result = await processPdf(file);
        break;
      case 'image':
        result = await processImage(file);
        break;
      case 'docx':
        result = await processDocx(file);
        break;
      case 'pptx':
        result = await processPptx(file);
        break;
    }
  } catch (err: any) {
    // Re-throw structured errors from processors
    if (err.code) {
      throw err as UploadValidationError;
    }
    // Wrap unexpected errors
    throw {
      code: 'PROCESSING_ERROR',
      message: err.message || 'Failed to process file'
    } as UploadValidationError;
  }

  // Build UploadedResource
  const resource: UploadedResource = {
    id: crypto.randomUUID(),
    filename: file.name,
    type: result.type,
    thumbnail: result.thumbnail,
    pageCount: result.pageCount,
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString()
  };

  // Attach extracted content if available (for AI processing)
  if (result.type === 'docx' && 'text' in result) {
    resource.content = { text: result.text };
  } else if (result.type === 'pptx' && 'text' in result) {
    resource.content = { text: result.text };
  } else if (result.type === 'image' && 'base64' in result) {
    resource.content = { images: [result.base64] };
  } else if (result.type === 'pdf') {
    // PDF: store both page images and extracted text
    resource.content = {
      images: result.images,
      text: result.text
    };
  }

  return resource;
}

/**
 * Get accepted file extensions for input accept attribute.
 */
export function getAcceptedExtensions(): string {
  return '.pdf,.png,.jpg,.jpeg,.docx,.pptx';
}
