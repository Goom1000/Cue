/**
 * PDF Text Extractor - Preserves line breaks from pdf.js text items
 *
 * pdf.js returns text items with transform matrices. transform[5] is the Y coordinate.
 * When Y changes between items (threshold >2 units), we insert a newline.
 * This preserves line-by-line structure needed for scripted lesson parsing
 * (e.g., ^Say:, ^Ask: regex patterns that require line-start anchors).
 *
 * Also normalizes heading-like lines (Day N, section names) with ## markers,
 * since PDFs lack heading metadata. This matches what the DOCX extractor does
 * with HTML heading tags, producing parser-compatible output.
 */

interface PdfTextItem {
  str: string;
  transform: number[];
}

/** Day boundary: "Day 1", "Day 1: Title", "Day 1 - Title" as a standalone line */
const DAY_LINE = /^Day\s+(\d+)\s*(?:[-:]\s*(.+))?$/i;

/** Section heading: exact match for canonical section names */
const SECTION_LINE = /^(Hook|I\s+Do|We\s+Do|You\s+Do|Plenary)$/i;

/**
 * Extract text from pdf.js textContent.items while preserving line breaks.
 * Items on the same Y coordinate are joined with spaces;
 * items on different Y coordinates get newlines between them.
 * Lines are trimmed to remove PDF positioning whitespace.
 * Heading-like lines get ## markers added for parser compatibility.
 */
export function extractTextWithLineBreaks(items: PdfTextItem[]): string {
  if (items.length === 0) return '';

  const lines: string[] = [];
  let currentLine = items[0].str;
  let currentY = items[0].transform[5];

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const y = item.transform[5];

    if (Math.abs(y - currentY) > 2) {
      // Y changed — new line (trim to remove PDF positioning whitespace
      // so ^-anchored regex patterns like ^Say: match correctly)
      lines.push(currentLine.trim());
      currentLine = item.str;
      currentY = y;
    } else {
      // Same line — append with space (skip if item is empty)
      if (item.str) {
        currentLine += ' ' + item.str;
      }
    }
  }

  // Push the last line
  lines.push(currentLine.trim());

  return lines.map(addHeadingMarkers).join('\n');
}

/**
 * Add ## markers to lines that look like headings.
 * PDFs don't have heading metadata, so we detect them by pattern:
 * - "Day N" / "Day N: Title" → "## Day N: Title"
 * - "Hook" / "I Do" / "We Do" / "You Do" / "Plenary" → "## Hook"
 */
function addHeadingMarkers(line: string): string {
  if (DAY_LINE.test(line)) {
    return '## ' + line;
  }
  if (SECTION_LINE.test(line)) {
    return '## ' + line;
  }
  return line;
}
