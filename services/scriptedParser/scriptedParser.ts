/**
 * Scripted lesson plan parser.
 * Pure-function parser for marker-annotated lesson plans.
 *
 * Extracts typed blocks (Say, Ask, Write on board, Activity) from text
 * using a line-by-line state machine. Also detects section headings
 * (Hook, I Do, We Do, You Do, Plenary) as slide boundary markers and
 * splits multi-day plans on ## Day N boundaries.
 *
 * Input: plain text with markers at line start.
 * Output: typed ScriptedParseResult with blocks grouped by day and section.
 *
 * No AI, no side effects, no network calls -- pure function.
 * Never throws -- always returns a valid result, even for empty/malformed input.
 * Never mutates input.
 *
 * Follows the pure-function, deterministic pattern from:
 * - phaseDetection/phaseDetector.ts (regex-based detection)
 * - contentPreservation/detector.ts (marker-based extraction)
 *
 * Source: Phase 69 Plan 01, v6.0 REQUIREMENTS.md (PARSE-01 through PARSE-08)
 */

import {
  ScriptedBlockType,
  SectionLabel,
  ScriptedBlock,
  DaySection,
  ParseStats,
  ScriptedParseResult,
} from './types';

// =============================================================================
// Regex Patterns (module-level, not recreated per call)
// =============================================================================

/**
 * Marker pattern definition for line-start matching.
 * Ordered longest-first to prevent partial matches
 * (e.g., "Write on board" before any shorter pattern).
 */
interface MarkerPattern {
  type: ScriptedBlockType;
  regex: RegExp;
}

/**
 * Explicit marker patterns. Case-insensitive, line-start anchored.
 * Capture group 1 extracts content after the colon.
 * Order: longest multi-word marker first.
 */
const MARKER_PATTERNS: MarkerPattern[] = [
  { type: 'write-on-board', regex: /^Write\s+on\s+board\s*:\s*(.*)/i },
  { type: 'activity', regex: /^Activity\s*:\s*(.*)/i },
  { type: 'ask', regex: /^Ask\s*:\s*(.*)/i },
  { type: 'say', regex: /^Say\s*:\s*(.*)/i },
];

/** Day boundary: ## Day N with optional title after colon */
const DAY_BOUNDARY = /^##\s*Day\s+(\d+)\s*(?::\s*(.+))?$/i;

/** Section headings: ## or ### followed by canonical heading name */
const SECTION_HEADING = /^#{2,3}\s*(Hook|I\s+Do|We\s+Do|You\s+Do|Plenary)\s*$/i;

/** Lines consisting only of formatting characters (dashes, asterisks, equals, hashes, whitespace) */
const FORMATTING_LINE = /^[\s\-*=#]+$/;

// =============================================================================
// Section Label Normalization
// =============================================================================

/**
 * Normalize detected heading text to canonical SectionLabel.
 * Handles flexible whitespace and case variations.
 */
const SECTION_MAP: Record<string, SectionLabel> = {
  'hook': 'Hook',
  'i do': 'I Do',
  'we do': 'We Do',
  'you do': 'You Do',
  'plenary': 'Plenary',
};

function normalizeSectionLabel(raw: string): SectionLabel {
  const normalized = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  return SECTION_MAP[normalized] ?? 'Hook';
}

// =============================================================================
// Internal State Types
// =============================================================================

interface PartialBlock {
  type: ScriptedBlockType;
  content: string;
  lineNumber: number;
  section: SectionLabel | null;
  implicit: boolean;
}

interface PartialDay {
  dayNumber: number;
  title: string | null;
  blocks: ScriptedBlock[];
  currentSection: SectionLabel | null;
  /** True if this day was created by an explicit ## Day N header */
  explicit: boolean;
}

interface ParserState {
  currentBlock: PartialBlock | null;
  currentDay: PartialDay;
  days: DaySection[];
  warnings: string[];
  parsedLines: number;
}

// =============================================================================
// Parser Implementation
// =============================================================================

/**
 * Parse a scripted lesson plan into typed blocks grouped by day and section.
 *
 * Uses a line-by-line state machine with the following priority chain:
 * 1. Day boundary (## Day N) -- flush block + day, start new day
 * 2. Section heading (## Hook, ### I Do, etc.) -- flush block, create heading block
 * 3. Explicit marker (Say:, Ask:, Write on board:, Activity:) -- flush block, start new block
 * 4. Blank line -- preserve as paragraph break within current block, or ignore
 * 5. Content line -- append to current block, or start implicit Say if >= 20 chars
 *
 * @param text - Raw lesson plan text with optional markers
 * @returns ScriptedParseResult with blocks, days, stats, and warnings
 */
export function parseScriptedLessonPlan(text: string): ScriptedParseResult {
  const lines = text.split('\n');
  const state: ParserState = {
    currentBlock: null,
    currentDay: {
      dayNumber: 1,
      title: null,
      blocks: [],
      currentSection: null,
      explicit: false,
    },
    days: [],
    warnings: [],
    parsedLines: 0,
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Priority 1: Day boundary
    const dayMatch = line.match(DAY_BOUNDARY);
    if (dayMatch) {
      flushCurrentBlock(state);
      // Only flush the current day if it has blocks or was explicitly created.
      // Skip flushing the default empty Day 1 that exists before any ## Day N header.
      if (state.currentDay.blocks.length > 0 || state.currentDay.explicit) {
        flushCurrentDay(state);
      }
      state.currentDay = {
        dayNumber: parseInt(dayMatch[1], 10),
        title: dayMatch[2] ? dayMatch[2].trim() : null,
        blocks: [],
        currentSection: null,
        explicit: true,
      };
      state.parsedLines++;
      continue;
    }

    // Priority 2: Section heading
    const sectionMatch = line.match(SECTION_HEADING);
    if (sectionMatch) {
      flushCurrentBlock(state);
      const label = normalizeSectionLabel(sectionMatch[1]);
      state.currentDay.currentSection = label;
      state.currentDay.blocks.push({
        type: 'section-heading',
        content: label,
        lineNumber,
        section: label,
        implicit: false,
      });
      state.parsedLines++;
      continue;
    }

    // Priority 3: Explicit marker (Say:, Ask:, Write on board:, Activity:)
    const markerMatch = matchMarker(line);
    if (markerMatch) {
      flushCurrentBlock(state);
      state.currentBlock = {
        type: markerMatch.type,
        content: markerMatch.content,
        lineNumber,
        section: state.currentDay.currentSection,
        implicit: false,
      };
      state.parsedLines++;
      continue;
    }

    // Priority 4: Blank line
    if (line.trim() === '') {
      if (state.currentBlock) {
        // Preserve blank lines within blocks (paragraph breaks)
        state.currentBlock.content += '\n';
      }
      // Blank lines between blocks are ignored
      continue;
    }

    // Priority 5: Content line (unmarked prose)
    if (state.currentBlock) {
      // Continue accumulating into current block
      state.currentBlock.content += '\n' + line;
      state.parsedLines++;
    } else if (line.trim().length >= 20 && !FORMATTING_LINE.test(line)) {
      // Start implicit Say: block (PARSE-06: 20+ chars threshold)
      state.currentBlock = {
        type: 'say',
        content: line,
        lineNumber,
        section: state.currentDay.currentSection,
        implicit: true,
      };
      state.parsedLines++;
    }
    // Lines < 20 chars with no current block are skipped (formatting noise)
  }

  // Flush remaining block and day
  flushCurrentBlock(state);
  flushCurrentDay(state);

  return buildResult(state, lines.length);
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Try to match a line against all explicit marker patterns.
 * Returns the matched type and captured content, or null.
 */
function matchMarker(line: string): { type: ScriptedBlockType; content: string } | null {
  for (const pattern of MARKER_PATTERNS) {
    const match = line.match(pattern.regex);
    if (match) {
      return {
        type: pattern.type,
        content: (match[1] ?? '').trim(),
      };
    }
  }
  return null;
}

/**
 * Flush the current block into the current day's blocks array.
 * Trims trailing whitespace from block content before pushing.
 */
function flushCurrentBlock(state: ParserState): void {
  if (state.currentBlock) {
    const block: ScriptedBlock = {
      type: state.currentBlock.type,
      content: state.currentBlock.content.trimEnd(),
      lineNumber: state.currentBlock.lineNumber,
      section: state.currentBlock.section,
      implicit: state.currentBlock.implicit,
    };
    state.currentDay.blocks.push(block);
    state.currentBlock = null;
  }
}

/**
 * Flush the current day into the days array.
 * Checks for empty days and generates warnings.
 */
function flushCurrentDay(state: ParserState): void {
  const contentBlocks = state.currentDay.blocks.filter(
    b => b.type !== 'section-heading'
  );
  if (contentBlocks.length === 0 && state.currentDay.blocks.length > 0) {
    // Day has section headings but no content blocks
    state.warnings.push(
      `Day ${state.currentDay.dayNumber} has no content blocks`
    );
  } else if (contentBlocks.length === 0 && state.days.length > 0) {
    // Empty day (no blocks at all) -- only warn for days after the first
    // when there are explicit day headers
    state.warnings.push(
      `Day ${state.currentDay.dayNumber} has no content blocks`
    );
  }
  state.days.push({
    dayNumber: state.currentDay.dayNumber,
    title: state.currentDay.title,
    blocks: state.currentDay.blocks,
  });
}

/**
 * Build the final ScriptedParseResult from parser state.
 * Calculates stats, totalBlocks, totalDays from accumulated days.
 */
function buildResult(state: ParserState, totalLines: number): ScriptedParseResult {
  const stats: ParseStats = {
    sayCount: 0,
    askCount: 0,
    writeOnBoardCount: 0,
    activityCount: 0,
    sectionHeadingCount: 0,
    implicitSayCount: 0,
    totalLines,
    parsedLines: state.parsedLines,
  };

  let totalBlocks = 0;

  for (const day of state.days) {
    for (const block of day.blocks) {
      switch (block.type) {
        case 'say':
          stats.sayCount++;
          if (block.implicit) {
            stats.implicitSayCount++;
          }
          totalBlocks++;
          break;
        case 'ask':
          stats.askCount++;
          totalBlocks++;
          break;
        case 'write-on-board':
          stats.writeOnBoardCount++;
          totalBlocks++;
          break;
        case 'activity':
          stats.activityCount++;
          totalBlocks++;
          break;
        case 'section-heading':
          stats.sectionHeadingCount++;
          // Section headings excluded from totalBlocks
          break;
      }
    }
  }

  return {
    days: state.days,
    totalBlocks,
    totalDays: state.days.length,
    warnings: state.warnings,
    stats,
  };
}

// =============================================================================
// Marker Detection (Phase 72)
// =============================================================================

/**
 * Quick detection of scripted markers in text.
 * Returns true if at least one explicit marker (Say:, Ask:, etc.) is found.
 * Used by UI to auto-suggest scripted import mode (MODE-01).
 * Much cheaper than a full parse -- stops at first match.
 */
export function detectScriptedMarkers(text: string): boolean {
  const lines = text.split('\n');
  for (const line of lines) {
    for (const pattern of MARKER_PATTERNS) {
      if (pattern.regex.test(line)) return true;
    }
  }
  return false;
}
