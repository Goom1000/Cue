/**
 * Scripted lesson plan parser.
 * Stub implementation -- returns minimal valid result for TDD RED phase.
 */

import { ScriptedParseResult } from './types';

export function parseScriptedLessonPlan(_text: string): ScriptedParseResult {
  return {
    days: [],
    totalBlocks: 0,
    totalDays: 0,
    warnings: [],
    stats: {
      sayCount: 0,
      askCount: 0,
      writeOnBoardCount: 0,
      activityCount: 0,
      sectionHeadingCount: 0,
      implicitSayCount: 0,
      totalLines: 0,
      parsedLines: 0,
    },
  };
}
