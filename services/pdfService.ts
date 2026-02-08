/**
 * PDF Export Service
 *
 * Generates a script-mode PDF with vector text, slide thumbnails,
 * and expanded talking-point bullets for colleague sharing.
 * Companion to pptxService.ts (PPTX export).
 */

import { jsPDF } from 'jspdf';
import { Slide } from '../types';
import { ColleagueTransformationResult } from './aiProvider';

// ============================================================================
// Configuration (self-contained, mirrors exportService.ts A4 layout)
// ============================================================================

const MARGIN_LEFT = 25;    // Extra for binding/hole-punching
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const CONTENT_WIDTH = 210 - MARGIN_LEFT - MARGIN_RIGHT; // 170mm
const PAGE_BOTTOM = 297 - MARGIN_BOTTOM; // 277mm

// ============================================================================
// Helpers
// ============================================================================

/**
 * Compress an image data URL for PDF embedding.
 * Scales down to maxWidth and exports as JPEG 0.8 quality
 * to prevent PDF size explosion from large base64 PNGs.
 */
function compressImageForPdf(
  dataUrl: string,
  maxWidth: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;

      // Calculate scaled dimensions
      let w = naturalWidth;
      let h = naturalHeight;
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }

      // Draw to canvas and export as JPEG
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        width: naturalWidth,
        height: naturalHeight,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}

/**
 * Cue marker prefixes that get special styling (italic, indigo).
 */
const CUE_MARKERS = [
  '[Discussion point]',
  '[Activity]',
  '[Question]',
  '[Answer]',
];

/**
 * Check if a bullet starts with a cue marker.
 * Returns the marker if found, or null.
 */
function detectCueMarker(bullet: string): string | null {
  for (const marker of CUE_MARKERS) {
    if (bullet.startsWith(marker)) {
      return marker;
    }
  }
  return null;
}

/**
 * Strip ** bold markers from text for clean rendering.
 * Falls back to full stripping if inline bold is too complex.
 */
function stripBoldMarkers(text: string): string {
  return text.replace(/\*\*/g, '');
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export AI-transformed talking-point bullets as a script-mode PDF.
 * Layout: A4 portrait with slide number, title, compressed thumbnail,
 * and expanded bullets with cue marker styling and page break handling.
 *
 * @param slides - Original slide deck (for images and fallback data)
 * @param transformationResult - AI-transformed talking points per slide
 * @param title - Lesson title for filename and header
 */
export async function exportScriptPdf(
  slides: Slide[],
  transformationResult: ColleagueTransformationResult,
  title: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Iterate transformed slides
  for (let i = 0; i < transformationResult.slides.length; i++) {
    const transformed = transformationResult.slides[i];

    // Look up original slide with safety check
    const originalSlide = slides[transformed.slideIndex];
    if (!originalSlide) continue;

    // Add new page for all slides after the first
    if (i > 0) {
      doc.addPage();
    }

    let y = MARGIN_TOP;

    // Image source: pasted original takes priority (per MEMORY.md)
    const imageSource = originalSlide.originalPastedImage || originalSlide.imageUrl;

    // ------------------------------------------------------------------
    // Slide number (top-left)
    // ------------------------------------------------------------------
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(153, 153, 153); // #999999
    doc.text(`Slide ${transformed.slideIndex + 1}`, MARGIN_LEFT, y);
    y += 8;

    // ------------------------------------------------------------------
    // Thumbnail (top-right, if image exists) - load async
    // ------------------------------------------------------------------
    let thumbnailHeight = 0;
    if (imageSource) {
      try {
        const compressed = await compressImageForPdf(imageSource, 400);

        // Calculate aspect-ratio-safe dimensions within 50x38mm
        const maxW = 50;
        const maxH = 38;
        const ratio = compressed.width / compressed.height;
        let thumbW = maxW;
        let thumbH = thumbW / ratio;
        if (thumbH > maxH) {
          thumbH = maxH;
          thumbW = thumbH * ratio;
        }

        const thumbX = MARGIN_LEFT + CONTENT_WIDTH - thumbW;
        const thumbY = MARGIN_TOP;
        doc.addImage(compressed.dataUrl, 'JPEG', thumbX, thumbY, thumbW, thumbH);
        thumbnailHeight = thumbH;
      } catch {
        // Image load failed - skip thumbnail, continue with text
        thumbnailHeight = 0;
      }
    }

    // ------------------------------------------------------------------
    // Title (below slide number)
    // ------------------------------------------------------------------
    const titleWidth = imageSource ? CONTENT_WIDTH - 55 : CONTENT_WIDTH;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // #1e293b
    const titleLines = doc.splitTextToSize(transformed.originalTitle, titleWidth);
    const titleStartY = y;
    for (const line of titleLines) {
      doc.text(line, MARGIN_LEFT, y);
      y += 8;
    }
    const titleBlockHeight = y - titleStartY;

    // ------------------------------------------------------------------
    // Bullets start Y: below whichever is taller (title block or thumbnail)
    // ------------------------------------------------------------------
    const thumbnailBottom = MARGIN_TOP + thumbnailHeight;
    const titleBottom = titleStartY + titleBlockHeight;
    y = Math.max(thumbnailBottom, titleBottom) + 4;

    // ------------------------------------------------------------------
    // Bullet rendering
    // ------------------------------------------------------------------
    const slideNum = transformed.slideIndex + 1;

    for (let bIdx = 0; bIdx < transformed.expandedBullets.length; bIdx++) {
      const rawBullet = transformed.expandedBullets[bIdx];
      const cueMarker = detectCueMarker(rawBullet);

      if (cueMarker) {
        // Cue marker bullet: italic, indigo color, indented
        const bulletText = stripBoldMarkers(rawBullet.slice(cueMarker.length).trim());
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(79, 70, 229); // #4F46E5

        const wrappedLines = doc.splitTextToSize(
          `${cueMarker} ${bulletText}`,
          CONTENT_WIDTH - 10
        );

        for (const line of wrappedLines) {
          // Page break check
          if (y + 6 > PAGE_BOTTOM) {
            doc.addPage();
            y = MARGIN_TOP;
            // Continuation header
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(153, 153, 153);
            doc.text(`Slide ${slideNum} (continued)`, MARGIN_LEFT, y);
            y += 8;
            // Restore cue marker styling
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(79, 70, 229);
          }
          doc.text(line, MARGIN_LEFT + 5, y);
          y += 6;
        }
      } else {
        // Regular bullet with bold marker parsing
        const cleanBullet = stripBoldMarkers(rawBullet);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85); // #334155

        const wrappedLines = doc.splitTextToSize(cleanBullet, CONTENT_WIDTH - 5);

        for (let lineIdx = 0; lineIdx < wrappedLines.length; lineIdx++) {
          // Page break check
          if (y + 6 > PAGE_BOTTOM) {
            doc.addPage();
            y = MARGIN_TOP;
            // Continuation header
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(153, 153, 153);
            doc.text(`Slide ${slideNum} (continued)`, MARGIN_LEFT, y);
            y += 8;
            // Restore bullet styling
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
          }

          if (lineIdx === 0) {
            // Bullet character on first line
            doc.text('\u2022', MARGIN_LEFT, y);
          }
          doc.text(wrappedLines[lineIdx], MARGIN_LEFT + 5, y);
          y += 6;
        }
      }

      // Extra gap between bullets
      y += 4;
    }
  }

  // ------------------------------------------------------------------
  // Trigger browser download
  // ------------------------------------------------------------------
  const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '').trim() || 'Lesson';
  doc.save(`${sanitizedTitle} - Script Version.pdf`);
}
