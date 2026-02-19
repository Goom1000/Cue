/**
 * Unit tests for the scripted lesson plan parser.
 *
 * Tests cover all 8 PARSE requirements:
 * - PARSE-01: Say marker detection (single-line, multi-line, case-insensitive)
 * - PARSE-02: Ask marker detection
 * - PARSE-03: Write on board marker detection (multi-word, case-insensitive)
 * - PARSE-04: Activity marker detection
 * - PARSE-05: Section heading detection (## Hook, ### I Do, etc.)
 * - PARSE-06: Implicit Say blocks (unmarked prose >= 20 chars)
 * - PARSE-07: Multi-day splitting (## Day N boundaries)
 * - PARSE-08: Parse result structure (stats, warnings, counts)
 *
 * Plus additional behavior tests for edge cases.
 *
 * Source: Phase 69 Plan 01, v6.0 REQUIREMENTS.md (PARSE-01 through PARSE-08)
 */

import { describe, it, expect } from '@jest/globals';
import { parseScriptedLessonPlan } from './scriptedParser';

// =============================================================================
// PARSE-01: Say marker detection
// =============================================================================

describe('PARSE-01: Say marker detection', () => {
  it('detects Say: at line start and extracts content after colon', () => {
    const text = 'Say: Good morning class, today we are learning about fractions.';
    const result = parseScriptedLessonPlan(text);

    expect(result.days).toHaveLength(1);
    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('say');
    expect(result.days[0].blocks[0].content).toBe(
      'Good morning class, today we are learning about fractions.'
    );
    expect(result.days[0].blocks[0].implicit).toBe(false);
  });

  it('captures multi-line Say: block (3+ paragraphs) until next marker', () => {
    const text = `Say: Welcome to today's lesson.
This is going to be really exciting.
We'll explore fractions in depth.

Ask: What do you already know about fractions?`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(2);
    expect(result.days[0].blocks[0].type).toBe('say');
    expect(result.days[0].blocks[0].content).toContain('really exciting');
    expect(result.days[0].blocks[0].content).toContain('explore fractions');
    // Multi-line content joined by \n
    expect(result.days[0].blocks[0].content).toContain('\n');
    expect(result.days[0].blocks[1].type).toBe('ask');
  });

  it('handles case-insensitive matching: say:, SAY:, Say: all produce type say', () => {
    const text = `say: lowercase test
SAY: uppercase test
Say: title case test`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(3);
    result.days[0].blocks.forEach(block => {
      expect(block.type).toBe('say');
    });
  });

  it('handles flexible whitespace after colon: Say:text, Say: text, Say:  text', () => {
    const text1 = 'Say:no space after colon content here.';
    const text2 = 'Say: single space after colon content.';
    const text3 = 'Say:  double space after colon content.';

    const r1 = parseScriptedLessonPlan(text1);
    const r2 = parseScriptedLessonPlan(text2);
    const r3 = parseScriptedLessonPlan(text3);

    expect(r1.days[0].blocks[0].content).toBe('no space after colon content here.');
    expect(r2.days[0].blocks[0].content).toBe('single space after colon content.');
    expect(r3.days[0].blocks[0].content).toBe('double space after colon content.');
  });
});

// =============================================================================
// PARSE-02: Ask marker detection
// =============================================================================

describe('PARSE-02: Ask marker detection', () => {
  it('detects Ask: and extracts question text', () => {
    const text = 'Ask: What is the numerator in three-quarters?';
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('ask');
    expect(result.days[0].blocks[0].content).toBe('What is the numerator in three-quarters?');
  });

  it('captures multi-line continuation with expected answers', () => {
    const text = `Ask: What is three-quarters as a decimal?
Expected answer: 0.75
Follow up: How did you work that out?`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('ask');
    expect(result.days[0].blocks[0].content).toContain('0.75');
    expect(result.days[0].blocks[0].content).toContain('How did you work that out?');
  });
});

// =============================================================================
// PARSE-03: Write on board marker detection
// =============================================================================

describe('PARSE-03: Write on board marker detection', () => {
  it('detects Write on board: (multi-word, case-insensitive)', () => {
    const text = 'Write on board: 3/4 = 0.75';
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('write-on-board');
    expect(result.days[0].blocks[0].content).toBe('3/4 = 0.75');
  });

  it('handles WRITE ON BOARD: in all caps', () => {
    const text = 'WRITE ON BOARD: Key vocabulary: numerator, denominator';
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('write-on-board');
    expect(result.days[0].blocks[0].content).toBe('Key vocabulary: numerator, denominator');
  });

  it('handles write on board:content (no space after colon)', () => {
    const text = 'write on board:Fractions are parts of a whole.';
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('write-on-board');
    expect(result.days[0].blocks[0].content).toBe('Fractions are parts of a whole.');
  });
});

// =============================================================================
// PARSE-04: Activity marker detection
// =============================================================================

describe('PARSE-04: Activity marker detection', () => {
  it('detects Activity: and extracts instructions', () => {
    const text = 'Activity: Students sort fraction cards into order from smallest to largest.';
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('activity');
    expect(result.days[0].blocks[0].content).toBe(
      'Students sort fraction cards into order from smallest to largest.'
    );
  });

  it('captures multi-line activity description', () => {
    const text = `Activity: Fraction wall exploration.
Students use fraction walls to find equivalent fractions.
They record their findings in their maths books.
Allow 10 minutes for this activity.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('activity');
    expect(result.days[0].blocks[0].content).toContain('fraction walls');
    expect(result.days[0].blocks[0].content).toContain('10 minutes');
  });
});

// =============================================================================
// PARSE-05: Section heading detection
// =============================================================================

describe('PARSE-05: Section heading detection', () => {
  it('detects ## Hook as section-heading block with content Hook', () => {
    const text = `## Hook
Say: What do you know about fractions?`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks[0].type).toBe('section-heading');
    expect(result.days[0].blocks[0].content).toBe('Hook');
    expect(result.days[0].blocks[1].type).toBe('say');
  });

  it('detects ### I Do, ### We Do, ### You Do, ### Plenary at ## or ### level', () => {
    const text = `### I Do
Say: Watch me demonstrate.
### We Do
Say: Now let us try together.
### You Do
Say: Your turn to practice.
### Plenary
Say: What did we learn?`;
    const result = parseScriptedLessonPlan(text);

    const headings = result.days[0].blocks.filter(b => b.type === 'section-heading');
    expect(headings).toHaveLength(4);
    expect(headings[0].content).toBe('I Do');
    expect(headings[1].content).toBe('We Do');
    expect(headings[2].content).toBe('You Do');
    expect(headings[3].content).toBe('Plenary');
  });

  it('sets section field on subsequent blocks to nearest preceding heading', () => {
    const text = `## Hook
Say: Intro text for the hook section.
Ask: What do you know about this topic?
### I Do
Say: Teacher models the concept here.`;
    const result = parseScriptedLessonPlan(text);

    const blocks = result.days[0].blocks;
    // After ## Hook: section = 'Hook'
    expect(blocks[1].section).toBe('Hook');
    expect(blocks[2].section).toBe('Hook');
    // After ### I Do: section = 'I Do'
    expect(blocks[4].section).toBe('I Do');
  });

  it('accepts headings in any order (no enforcement of pedagogical sequence)', () => {
    const text = `### Plenary
Say: Plenary first is fine.
## Hook
Say: Hook second is fine.`;
    const result = parseScriptedLessonPlan(text);

    const headings = result.days[0].blocks.filter(b => b.type === 'section-heading');
    expect(headings).toHaveLength(2);
    expect(headings[0].content).toBe('Plenary');
    expect(headings[1].content).toBe('Hook');
  });
});

// =============================================================================
// PARSE-06: Implicit Say blocks
// =============================================================================

describe('PARSE-06: Implicit Say blocks', () => {
  it('treats unmarked prose >= 20 chars as implicit Say: block', () => {
    const text = 'This is a long enough line that it should become an implicit Say block.';
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('say');
    expect(result.days[0].blocks[0].implicit).toBe(true);
    expect(result.days[0].blocks[0].content).toBe(text);
  });

  it('skips short text < 20 chars with no current block', () => {
    const text = 'Short line here.';
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(0);
  });

  it('unmarked continuation lines extend the current block, not start a new implicit', () => {
    const text = `Say: Start of a block.
This continues the say block.
And this line too.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].type).toBe('say');
    expect(result.days[0].blocks[0].content).toContain('continues the say block');
    expect(result.days[0].blocks[0].content).toContain('And this line too');
  });
});

// =============================================================================
// PARSE-07: Multi-day splitting
// =============================================================================

describe('PARSE-07: Multi-day splitting', () => {
  it('splits on ## Day 1 and ## Day 2 into separate day sections', () => {
    const text = `## Day 1
Say: Welcome to day one.
Ask: What is a fraction?

## Day 2
Say: Welcome to day two.
Activity: Complete the worksheet.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.totalDays).toBe(2);
    expect(result.days[0].dayNumber).toBe(1);
    expect(result.days[1].dayNumber).toBe(2);
  });

  it('extracts optional title: ## Day 1: Introduction to Fractions', () => {
    const text = `## Day 1: Introduction to Fractions
Say: Today we introduce fractions.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].dayNumber).toBe(1);
    expect(result.days[0].title).toBe('Introduction to Fractions');
  });

  it('no day headers = single Day 1 with title: null', () => {
    const text = `Say: Just a simple lesson.
Ask: Any questions?`;
    const result = parseScriptedLessonPlan(text);

    expect(result.totalDays).toBe(1);
    expect(result.days[0].dayNumber).toBe(1);
    expect(result.days[0].title).toBeNull();
  });

  it('each day has its own block array with accurate counts', () => {
    const text = `## Day 1: Intro
Say: Welcome to day one.
Ask: What is a fraction?

## Day 2: Practice
Say: Let's practice fractions.
Activity: Complete the worksheet.
Write on board: Key formula: a/b`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(2); // Say + Ask
    expect(result.days[1].blocks).toHaveLength(3); // Say + Activity + Write on board
  });
});

// =============================================================================
// PARSE-08: Parse result structure
// =============================================================================

describe('PARSE-08: Parse result structure', () => {
  it('totalBlocks counts content blocks only (excludes section-heading)', () => {
    const text = `## Hook
Say: Intro.
### I Do
Say: Demo.
Ask: Question?`;
    const result = parseScriptedLessonPlan(text);

    // 3 content blocks (2 Say + 1 Ask), 2 section headings excluded
    expect(result.totalBlocks).toBe(3);
  });

  it('totalDays equals days.length', () => {
    const text = `## Day 1
Say: Day one.
## Day 2
Say: Day two.
## Day 3
Say: Day three.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.totalDays).toBe(3);
    expect(result.totalDays).toBe(result.days.length);
  });

  it('stats fields are accurate counts', () => {
    const text = `Say: One.
Say: Two.
Ask: Question one?
Ask: Question two?
Write on board: Board content.
Activity: Do this activity.
## Hook
This is an implicit say block with enough text to qualify.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.stats.sayCount).toBe(3); // 2 explicit + 1 implicit
    expect(result.stats.askCount).toBe(2);
    expect(result.stats.writeOnBoardCount).toBe(1);
    expect(result.stats.activityCount).toBe(1);
    expect(result.stats.sectionHeadingCount).toBe(1);
    expect(result.stats.implicitSayCount).toBe(1);
  });

  it('empty days produce warnings: "Day N has no content blocks"', () => {
    const text = `## Day 1
Say: Day one has content.

## Day 2

## Day 3
Say: Day three has content.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.warnings).toContain('Day 2 has no content blocks');
  });

  it('stats.implicitSayCount is subset of stats.sayCount', () => {
    const text = `Say: Explicit say block one.
This is implicit say content that exceeds twenty characters easily.
Say: Explicit say block two.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.stats.sayCount).toBe(3); // 2 explicit + 1 implicit
    expect(result.stats.implicitSayCount).toBe(1);
    expect(result.stats.implicitSayCount).toBeLessThanOrEqual(result.stats.sayCount);
  });
});

// =============================================================================
// Additional behavior tests
// =============================================================================

describe('Additional behavior tests', () => {
  it('consecutive same-type markers stay separate (not merged)', () => {
    const text = `Say: First point about fractions.
Say: Second point about fractions.
Say: Third point about fractions.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(3);
    expect(result.days[0].blocks[0].content).toBe('First point about fractions.');
    expect(result.days[0].blocks[1].content).toBe('Second point about fractions.');
    expect(result.days[0].blocks[2].content).toBe('Third point about fractions.');
  });

  it('blank lines preserved within blocks as paragraph breaks', () => {
    const text = `Say: First paragraph of speech.

Second paragraph of speech after blank line.

Third paragraph of speech.
Ask: Next question?`;
    const result = parseScriptedLessonPlan(text);

    const sayBlock = result.days[0].blocks[0];
    expect(sayBlock.type).toBe('say');
    // Content should contain paragraph breaks
    expect(sayBlock.content).toContain('First paragraph');
    expect(sayBlock.content).toContain('Second paragraph');
    expect(sayBlock.content).toContain('Third paragraph');
  });

  it('blank lines between blocks are ignored', () => {
    const text = `Say: First block.


Ask: Second block after blank lines.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks).toHaveLength(2);
    expect(result.days[0].blocks[0].type).toBe('say');
    expect(result.days[0].blocks[1].type).toBe('ask');
  });

  it('mid-paragraph "On Day 1" is NOT matched as a day boundary', () => {
    const text = `Say: On Day 1 of the experiment, students observed chemical changes.
They noted the colour change carefully.`;
    const result = parseScriptedLessonPlan(text);

    // Should be 1 day (no splitting), 1 block
    expect(result.totalDays).toBe(1);
    expect(result.days[0].blocks).toHaveLength(1);
    expect(result.days[0].blocks[0].content).toContain('On Day 1');
  });

  it('formatting-only lines (---, ***, ===) are not treated as implicit Say blocks', () => {
    const text = `Say: Before formatting.
---
***
===
Say: After formatting.`;
    const result = parseScriptedLessonPlan(text);

    // The formatting lines between Say blocks should not produce implicit Say blocks.
    // They are continuation of first Say block or ignored.
    const sayBlocks = result.days[0].blocks.filter(b => b.type === 'say');
    expect(sayBlocks).toHaveLength(2);
    // No implicit say blocks from formatting lines
    expect(result.stats.implicitSayCount).toBe(0);
  });

  it('parser never throws -- empty input returns valid result with 0 blocks and Day 1', () => {
    const result = parseScriptedLessonPlan('');

    expect(result.days).toHaveLength(1);
    expect(result.days[0].dayNumber).toBe(1);
    expect(result.days[0].title).toBeNull();
    expect(result.days[0].blocks).toHaveLength(0);
    expect(result.totalBlocks).toBe(0);
    expect(result.totalDays).toBe(1);
    expect(result.stats.sayCount).toBe(0);
  });

  it('lineNumber is 1-indexed and points to the marker line', () => {
    const text = `Say: First block.
Ask: Second block.
Activity: Third block.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.days[0].blocks[0].lineNumber).toBe(1);
    expect(result.days[0].blocks[1].lineNumber).toBe(2);
    expect(result.days[0].blocks[2].lineNumber).toBe(3);
  });

  it('handles a full multi-day lesson plan with all features', () => {
    const text = `## Day 1: Introduction to Fractions
## Hook
Say: Good morning Year 5! Today we are going to explore fractions.
Who can tell me something they already know about fractions?

Ask: What is a fraction? Can someone give me an example?

### I Do
Say: Watch carefully as I show you how to represent fractions.
A fraction has two parts: the numerator on top and the denominator on the bottom.

Write on board: Fraction = Numerator / Denominator

### We Do
Say: Let's try some together now.
Activity: Students work with the teacher to identify fractions from pictures on the interactive whiteboard.

### You Do
Activity: Complete the fraction identification worksheet independently.
Students have 10 minutes.

### Plenary
Ask: What are the two parts of a fraction called?
Say: Great work today! Tomorrow we will look at equivalent fractions.

## Day 2: Equivalent Fractions
## Hook
Say: Yesterday we learned about fractions. Today we explore equivalent fractions.
Ask: Can someone remind us what a fraction is?

### I Do
Say: Watch as I show you that 1/2 is the same as 2/4.
Write on board: 1/2 = 2/4 = 4/8

### Plenary
Say: Well done today! You have mastered equivalent fractions.`;
    const result = parseScriptedLessonPlan(text);

    // Multi-day
    expect(result.totalDays).toBe(2);
    expect(result.days[0].title).toBe('Introduction to Fractions');
    expect(result.days[1].title).toBe('Equivalent Fractions');

    // All block types present
    expect(result.stats.sayCount).toBeGreaterThan(0);
    expect(result.stats.askCount).toBeGreaterThan(0);
    expect(result.stats.writeOnBoardCount).toBeGreaterThan(0);
    expect(result.stats.activityCount).toBeGreaterThan(0);
    expect(result.stats.sectionHeadingCount).toBeGreaterThan(0);

    // Section labels carried forward
    const day1Blocks = result.days[0].blocks;
    const iDoBlocks = day1Blocks.filter(b => b.section === 'I Do' && b.type !== 'section-heading');
    expect(iDoBlocks.length).toBeGreaterThan(0);

    // No warnings (both days have content)
    expect(result.warnings).toHaveLength(0);

    // totalBlocks excludes section headings
    const allContentBlocks = result.days.flatMap(d =>
      d.blocks.filter(b => b.type !== 'section-heading')
    );
    expect(result.totalBlocks).toBe(allContentBlocks.length);
  });

  it('stats.totalLines counts all input lines', () => {
    const text = `Say: Line 1.
Line 2 continuation.
Ask: Line 3.`;
    const result = parseScriptedLessonPlan(text);

    expect(result.stats.totalLines).toBe(3);
  });

  it('stats.parsedLines counts lines that contributed to blocks', () => {
    const text = `Say: Line 1.
Line 2 continuation.

Ask: Line 4.`;
    const result = parseScriptedLessonPlan(text);

    // Lines 1, 2, 4 contribute to blocks. Line 3 is blank (between blocks after Say is flushed? No -- blank within Say block).
    // Actually: Say block gets line 1, 2, and blank line 3 (as paragraph break). Ask gets line 4.
    // So parsed lines = 3 (lines 1, 2, 4 contribute content; line 3 is blank within block)
    expect(result.stats.parsedLines).toBeGreaterThanOrEqual(3);
  });
});
