/**
 * Export Service
 *
 * PDF generation and zip bundling for enhanced resources.
 * Creates print-ready A4 PDFs with binding margins for each differentiation level.
 */

import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import {
  EnhancementResult,
  DifferentiatedVersion,
  EnhancedElement,
  AnswerKeyResult,
  AnswerKeyItem,
  EditState
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * PDF configuration for A4 portrait with binding margins.
 * Left margin is extra wide for hole-punching/binding.
 */
export const PDF_CONFIG = {
  pageWidth: 210 as number,      // A4 width in mm
  pageHeight: 297 as number,     // A4 height in mm
  marginLeft: 25 as number,      // Extra for binding/hole-punching
  marginRight: 15 as number,
  marginTop: 20 as number,
  marginBottom: 20 as number,
  get contentWidth(): number { return this.pageWidth - this.marginLeft - this.marginRight; },
  get pageBottom(): number { return this.pageHeight - this.marginBottom; }
};

// ============================================================================
// Types
// ============================================================================

/**
 * Export progress callback data.
 */
export interface ExportProgress {
  phase: 'generating' | 'bundling';
  percent: number;
  currentFile?: string;
}

// ============================================================================
// PDF Rendering
// ============================================================================

/**
 * Render a single enhanced element to the PDF.
 * Handles page overflow by adding new pages as needed.
 *
 * @returns The new Y position after rendering
 */
function renderEnhancedElementToPDF(
  doc: jsPDF,
  element: EnhancedElement,
  content: string,
  y: number
): number {
  const { marginLeft, contentWidth, marginTop, pageBottom } = PDF_CONFIG;

  // Check if we need a new page before rendering
  const checkPageBreak = (requiredHeight: number): number => {
    if (y + requiredHeight > pageBottom) {
      doc.addPage();
      return marginTop;
    }
    return y;
  };

  switch (element.type) {
    case 'header': {
      y = checkPageBreak(16);
      // Extra spacing before headers (except at page top)
      if (y > marginTop + 5) {
        y += 8;
        y = checkPageBreak(12);
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const headerLines = doc.splitTextToSize(content, contentWidth);
      for (const line of headerLines) {
        y = checkPageBreak(8);
        doc.text(line, marginLeft, y);
        y += 8;
      }
      return y + 4;
    }

    case 'subheader': {
      y = checkPageBreak(12);
      // Extra spacing before subheaders
      if (y > marginTop + 5) {
        y += 6;
        y = checkPageBreak(10);
      }
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const subheaderLines = doc.splitTextToSize(content, contentWidth);
      for (const line of subheaderLines) {
        y = checkPageBreak(7);
        doc.text(line, marginLeft, y);
        y += 7;
      }
      return y + 3;
    }

    case 'paragraph':
    case 'instruction': {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(content, contentWidth);
      for (const line of lines) {
        y = checkPageBreak(6);
        doc.text(line, marginLeft, y);
        y += 6;
      }
      return y + 4;
    }

    case 'question': {
      y = checkPageBreak(10);
      // Question styling: bold with left border indicator
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      // Visual indent for questions
      const questionIndent = 5;
      const questionWidth = contentWidth - questionIndent;
      const qLines = doc.splitTextToSize(content, questionWidth);
      // Draw left border indicator
      const questionHeight = qLines.length * 6;
      doc.setDrawColor(200, 100, 150); // Pink color for questions
      doc.setLineWidth(1);
      doc.line(marginLeft, y - 2, marginLeft, y + questionHeight);
      for (const line of qLines) {
        y = checkPageBreak(6);
        doc.text(line, marginLeft + questionIndent, y);
        y += 6;
      }
      return y + 8; // Extra space after questions
    }

    case 'list': {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      // Handle list items - either from children or newline-separated content
      const items = element.children || content.split('\n').filter(item => item.trim());
      const bulletIndent = 5;
      for (const item of items) {
        const itemLines = doc.splitTextToSize(item, contentWidth - bulletIndent - 3);
        for (let i = 0; i < itemLines.length; i++) {
          y = checkPageBreak(6);
          if (i === 0) {
            // Bullet point for first line
            doc.text('\u2022', marginLeft + bulletIndent - 3, y);
          }
          doc.text(itemLines[i], marginLeft + bulletIndent, y);
          y += 6;
        }
      }
      return y + 4;
    }

    case 'table': {
      // Render table if we have table data
      if (element.tableData) {
        y = checkPageBreak(20);
        doc.setFontSize(10);
        const { headers, rows } = element.tableData;
        const colCount = headers.length;
        const colWidth = contentWidth / colCount;
        const rowHeight = 8;

        // Draw header row
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(marginLeft, y - 5, contentWidth, rowHeight, 'F');
        for (let i = 0; i < headers.length; i++) {
          const headerText = doc.splitTextToSize(headers[i], colWidth - 4)[0] || '';
          doc.text(headerText, marginLeft + i * colWidth + 2, y);
        }
        y += rowHeight;

        // Draw data rows
        doc.setFont('helvetica', 'normal');
        for (const row of rows) {
          y = checkPageBreak(rowHeight);
          for (let i = 0; i < row.length; i++) {
            const cellText = doc.splitTextToSize(row[i], colWidth - 4)[0] || '';
            doc.text(cellText, marginLeft + i * colWidth + 2, y);
          }
          y += rowHeight;
        }

        // Draw table border
        doc.setDrawColor(200);
        doc.rect(marginLeft, y - (rows.length + 1) * rowHeight - 5, contentWidth, (rows.length + 1) * rowHeight);

        return y + 6;
      }
      // Fallback: render as text
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text(`[Table: ${content}]`, marginLeft, y);
      return y + 8;
    }

    case 'blank-space': {
      y = checkPageBreak(15);
      // Draw horizontal line for fill-in
      doc.setDrawColor(180);
      doc.setLineWidth(0.5);
      const lineWidth = contentWidth * 0.6;
      doc.line(marginLeft, y + 8, marginLeft + lineWidth, y + 8);
      return y + 15;
    }

    case 'answer': {
      y = checkPageBreak(10);
      // Answer styling: with left border (green)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const answerIndent = 5;
      const answerWidth = contentWidth - answerIndent;
      const answerLines = doc.splitTextToSize(content, answerWidth);
      // Draw left border indicator
      const answerHeight = answerLines.length * 6;
      doc.setDrawColor(100, 180, 100); // Green color for answers
      doc.setLineWidth(1);
      doc.line(marginLeft, y - 2, marginLeft, y + answerHeight);
      for (const line of answerLines) {
        y = checkPageBreak(6);
        doc.text(line, marginLeft + answerIndent, y);
        y += 6;
      }
      return y + 6;
    }

    case 'diagram':
    case 'image': {
      y = checkPageBreak(20);
      // Placeholder for visual content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100);
      doc.text('[Visual content preserved from original document]', marginLeft, y);
      doc.setTextColor(0);
      if (content && content !== element.type) {
        y += 5;
        const descLines = doc.splitTextToSize(`Description: ${content}`, contentWidth);
        for (const line of descLines) {
          y = checkPageBreak(5);
          doc.text(line, marginLeft, y);
          y += 5;
        }
      }
      return y + 10;
    }

    default: {
      // Fallback for any unknown types
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const defaultLines = doc.splitTextToSize(content, contentWidth);
      for (const line of defaultLines) {
        y = checkPageBreak(6);
        doc.text(line, marginLeft, y);
        y += 6;
      }
      return y + 4;
    }
  }
}

/**
 * Generate a worksheet PDF for a single differentiation level.
 */
function generateWorksheetPDF(
  version: DifferentiatedVersion,
  title: string,
  levelName: string,
  edits: Map<number, string>
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { marginLeft, marginTop, contentWidth } = PDF_CONFIG;
  let y = marginTop;

  // Level badge at top
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(levelName, marginLeft, y);
  y += 8;

  // Document title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  for (const line of titleLines) {
    doc.text(line, marginLeft, y);
    y += 9;
  }
  y += 6;

  // Slide alignment note if present
  if (version.slideAlignmentNote) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 150);
    doc.text(version.slideAlignmentNote, marginLeft, y);
    doc.setTextColor(0);
    y += 10;
  }

  // Render all elements
  for (const element of version.elements) {
    // Apply user edits if present, otherwise use enhanced content
    const content = edits.get(element.position) ?? element.enhancedContent;
    y = renderEnhancedElementToPDF(doc, element, content, y);
  }

  return doc;
}

/**
 * Generate answer key PDF.
 */
function generateAnswerKeyPDF(
  answerKeys: AnswerKeyResult,
  title: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { marginLeft, marginTop, contentWidth, pageBottom } = PDF_CONFIG;
  let y = marginTop;

  // Check page break helper
  const checkPageBreak = (requiredHeight: number): number => {
    if (y + requiredHeight > pageBottom) {
      doc.addPage();
      return marginTop;
    }
    return y;
  };

  // Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Answer Key', marginLeft, y);
  y += 8;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  for (const line of titleLines) {
    doc.text(line, marginLeft, y);
    y += 9;
  }
  y += 10;

  // Render answer key items
  const renderAnswerKeyItem = (item: AnswerKeyItem) => {
    y = checkPageBreak(20);

    // Question reference
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(item.questionRef, marginLeft, y);
    y += 7;

    if (item.type === 'closed' && item.answer) {
      // Closed question - show answer
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(34, 139, 34); // Green
      const answerLines = doc.splitTextToSize(`Answer: ${item.answer}`, contentWidth);
      for (const line of answerLines) {
        y = checkPageBreak(6);
        doc.text(line, marginLeft, y);
        y += 6;
      }
      doc.setTextColor(0);
    } else if (item.type === 'open-ended' && item.rubric) {
      // Open-ended question - show rubric
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      // Criteria
      if (item.rubric.criteria.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Marking Criteria:', marginLeft, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        for (const criterion of item.rubric.criteria) {
          y = checkPageBreak(6);
          const criteriaLines = doc.splitTextToSize(`\u2022 ${criterion}`, contentWidth - 5);
          for (const line of criteriaLines) {
            doc.text(line, marginLeft + 3, y);
            y += 5;
          }
        }
        y += 3;
      }

      // Exemplar
      if (item.rubric.exemplar) {
        y = checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 139, 34);
        doc.text('Example Answer:', marginLeft, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const exemplarLines = doc.splitTextToSize(item.rubric.exemplar, contentWidth);
        for (const line of exemplarLines) {
          y = checkPageBreak(5);
          doc.text(line, marginLeft, y);
          y += 5;
        }
        doc.setTextColor(0);
        y += 3;
      }

      // Common mistakes
      if (item.rubric.commonMistakes && item.rubric.commonMistakes.length > 0) {
        y = checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(200, 100, 0); // Orange
        doc.text('Watch for:', marginLeft, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        for (const mistake of item.rubric.commonMistakes) {
          y = checkPageBreak(5);
          const mistakeLines = doc.splitTextToSize(`\u2022 ${mistake}`, contentWidth - 5);
          for (const line of mistakeLines) {
            doc.text(line, marginLeft + 3, y);
            y += 5;
          }
        }
        doc.setTextColor(0);
      }
    }

    y += 8; // Space between items
  };

  // Handle unified vs per-level answer keys
  if (answerKeys.structure === 'unified') {
    // Single unified answer key
    const items = answerKeys.keys[0]?.items || [];
    for (const item of items) {
      renderAnswerKeyItem(item);
    }
  } else {
    // Per-level answer keys
    for (const key of answerKeys.keys) {
      if (!key.items || key.items.length === 0) continue;

      y = checkPageBreak(15);

      // Level header
      if (key.level) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 150);
        doc.text(`${key.level.charAt(0).toUpperCase() + key.level.slice(1)} Version`, marginLeft, y);
        doc.setTextColor(0);
        y += 10;
      }

      for (const item of key.items) {
        renderAnswerKeyItem(item);
      }
    }
  }

  return doc;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export enhanced resource as a zip file containing:
 * - Simple Version PDF
 * - Standard Version PDF
 * - Detailed Version PDF
 * - Answer Key PDF
 *
 * @param result The enhancement result containing all versions
 * @param editState User edits to apply to each version
 * @param title Document title for filenames
 * @param onProgress Progress callback for UI feedback
 */
export async function exportEnhancedResource(
  result: EnhancementResult,
  editState: EditState,
  title: string,
  onProgress: (progress: ExportProgress) => void
): Promise<void> {
  const zip = new JSZip();

  // Sanitize title for filename (remove special chars, trim)
  const sanitizedTitle = title
    .replace(/[^a-z0-9 ]/gi, '')
    .trim() || 'Enhanced Resource';

  const levels = ['simple', 'standard', 'detailed'] as const;
  const levelNames: Record<typeof levels[number], string> = {
    simple: 'Simple Version',
    standard: 'Standard Version',
    detailed: 'Detailed Version'
  };

  // Generate worksheet PDFs (3 levels = 75% of progress)
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const version = result.versions[level];
    const edits = editState.edits[level];

    onProgress({
      phase: 'generating',
      percent: Math.round((i / 4) * 100),
      currentFile: levelNames[level]
    });

    // Generate PDF
    const pdf = generateWorksheetPDF(version, sanitizedTitle, levelNames[level], edits);
    const pdfBlob = pdf.output('blob');

    // Add to zip
    zip.file(`${sanitizedTitle} - ${levelNames[level]}.pdf`, pdfBlob);
  }

  // Generate answer key PDF (75% to 85%)
  onProgress({
    phase: 'generating',
    percent: 75,
    currentFile: 'Answer Key'
  });

  const answerKeyPdf = generateAnswerKeyPDF(result.answerKeys, sanitizedTitle);
  zip.file(`${sanitizedTitle} - Answer Key.pdf`, answerKeyPdf.output('blob'));

  // Bundle into zip (85% to 100%)
  onProgress({
    phase: 'bundling',
    percent: 85
  });

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  onProgress({
    phase: 'bundling',
    percent: 95
  });

  // Trigger download
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizedTitle} - All Versions.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 100);

  onProgress({
    phase: 'bundling',
    percent: 100
  });
}
