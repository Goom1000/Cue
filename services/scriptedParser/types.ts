/**
 * Type definitions and constants for the scripted lesson plan parser.
 *
 * Defines the data structures for parsing marker-annotated lesson plans
 * into typed blocks (Say, Ask, Write on board, Activity) grouped by
 * day and section.
 *
 * Follows the pattern from phaseDetection/phasePatterns.ts:
 * exported types and constants, no logic.
 *
 * Source: Phase 69 Plan 01, v6.0 REQUIREMENTS.md (PARSE-01 through PARSE-08)
 */

// =============================================================================
// Block Types
// =============================================================================

/**
 * The type of a parsed block. Each marker produces a specific block type.
 * 'section-heading' is used for slide boundary markers (## Hook, ### I Do, etc).
 */
export type ScriptedBlockType =
  | 'say'
  | 'ask'
  | 'write-on-board'
  | 'activity'
  | 'section-heading';

/**
 * Canonical section labels from detected headings.
 * These correspond to the 5 GRR (Gradual Release of Responsibility) phases.
 */
export type SectionLabel = 'Hook' | 'I Do' | 'We Do' | 'You Do' | 'Plenary';

// =============================================================================
// Interfaces
// =============================================================================

/**
 * A single parsed block from a scripted lesson plan.
 *
 * Each block represents one teacher instruction unit: something to say,
 * a question to ask, content to write on the board, or an activity to run.
 * Section headings are also blocks (for ordering), but are excluded from
 * content block counts.
 */
export interface ScriptedBlock {
  /** The block type, determined by the marker that started it */
  type: ScriptedBlockType;
  /** Text content after the marker (trimmed, multi-line preserved with \n) */
  content: string;
  /** 1-indexed line number where the block starts in the source text */
  lineNumber: number;
  /** Nearest preceding section heading label, null if none */
  section: SectionLabel | null;
  /** True if this block was unmarked prose treated as implicit Say: */
  implicit: boolean;
}

/**
 * A single day within a multi-day lesson plan.
 * Contains all blocks parsed from that day's section.
 */
export interface DaySection {
  /** 1-indexed day number */
  dayNumber: number;
  /** Optional title from "## Day 1: Title", null if no title */
  title: string | null;
  /** All blocks in this day, in source order */
  blocks: ScriptedBlock[];
}

/**
 * Statistics about the parsed lesson plan.
 * Enables the import preview to show block type counts.
 */
export interface ParseStats {
  /** Number of Say: blocks (includes implicit Say blocks) */
  sayCount: number;
  /** Number of Ask: blocks */
  askCount: number;
  /** Number of Write on board: blocks */
  writeOnBoardCount: number;
  /** Number of Activity: blocks */
  activityCount: number;
  /** Number of section heading blocks */
  sectionHeadingCount: number;
  /** Subset of sayCount that were implicit (unmarked prose) */
  implicitSayCount: number;
  /** Total number of lines in the input text */
  totalLines: number;
  /** Number of lines that contributed to blocks */
  parsedLines: number;
}

/**
 * The complete result of parsing a scripted lesson plan.
 * Contains all days, blocks, statistics, and warnings.
 */
export interface ScriptedParseResult {
  /** Day sections containing blocks, always >= 1 (default Day 1) */
  days: DaySection[];
  /** Sum of content blocks across all days (excludes section-heading blocks) */
  totalBlocks: number;
  /** Number of days (days.length) */
  totalDays: number;
  /** Non-fatal issues found during parsing (e.g., empty days) */
  warnings: string[];
  /** Aggregate statistics across all days */
  stats: ParseStats;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Human-readable display labels for each block type.
 * Used in UI badges and import preview.
 * Follows the PHASE_DISPLAY_LABELS pattern from phasePatterns.ts.
 */
export const BLOCK_TYPE_LABELS: Record<ScriptedBlockType, string> = {
  'say': 'Say',
  'ask': 'Ask',
  'write-on-board': 'Write On Board',
  'activity': 'Activity',
  'section-heading': 'Section Heading',
};

/**
 * The 4 canonical markers recognized by the parser.
 * Shared with Phase 73 (Claude Chat Tips) to keep the tips page
 * and parser in sync.
 *
 * These are the only markers the parser recognizes at line start.
 * Order: longest multi-word marker first, then alphabetical.
 */
export const SUPPORTED_MARKERS = ['Write on board', 'Activity', 'Ask', 'Say'] as const;
