/**
 * Tests for mapBlocksToSlides() -- the slide mapper that converts
 * ScriptedBlock[] (from Phase 69's parser) into valid Cue Slide[] objects.
 *
 * Covers all MAP requirements:
 * - MAP-01: Field mapping (Say -> speakerNotes, Write -> content, Ask -> content + flag)
 * - MAP-02: Segment count invariant (speakerNotes segments = content.length + 1)
 * - MAP-03: Slide boundaries (section headings, ask flush, grouping)
 * - MAP-04: LessonPhase assignment from section headings
 * - MAP-05: Work-together slides from substantial Activity: blocks
 *
 * Source: Phase 70 Plan 01, v6.0 REQUIREMENTS.md (MAP-01 through MAP-05)
 */

import { ScriptedBlock, SectionLabel } from './types';
import { mapBlocksToSlides } from './scriptedMapper';
import { Slide, LessonPhase } from '../../types';

// =============================================================================
// Constants & Helpers
// =============================================================================

/** The segment delimiter used in speakerNotes for teleprompter splitting */
const SEGMENT_DELIMITER = '\u{1F449}';

/**
 * Factory for creating ScriptedBlock objects with sensible defaults.
 * Tests only need to specify the fields they care about.
 */
function makeBlock(
  overrides: Partial<ScriptedBlock> & Pick<ScriptedBlock, 'type' | 'content'>
): ScriptedBlock {
  return {
    lineNumber: 1,
    section: null,
    implicit: false,
    ...overrides,
  };
}

/** Count segments in speakerNotes by splitting on delimiter */
function countSegments(speakerNotes: string): number {
  return speakerNotes.split(SEGMENT_DELIMITER).length;
}

// =============================================================================
// MAP-01: Field Mapping
// =============================================================================

describe('MAP-01: Field Mapping', () => {
  test('Say: block content appears in speakerNotes, not in content[]', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Today we are learning about fractions' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].speakerNotes).toContain('Today we are learning about fractions');
    expect(slides[0].content).not.toContain('Today we are learning about fractions');
  });

  test('Write on board: block content appears as plain-text content[] bullet with no prefix', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'write-on-board', content: '1/2 + 1/4 = 3/4' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].content).toContain('1/2 + 1/4 = 3/4');
    // No "Board:" prefix
    expect(slides[0].content.every(c => !c.startsWith('Board:'))).toBe(true);
  });

  test('Ask: block content appears as plain-text content[] bullet with no prefix', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'ask', content: 'What is 1/2 + 1/4?' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].content).toContain('What is 1/2 + 1/4?');
    // No "Q:" prefix
    expect(slides[0].content.every(c => !c.startsWith('Q:'))).toBe(true);
  });

  test('Ask: block sets hasQuestionFlag: true on the slide', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'ask', content: 'What is 1/2 + 1/4?' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].hasQuestionFlag).toBe(true);
  });

  test('Substantial multi-line Activity: block produces work-together slide with content[] bullets', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({
        type: 'activity',
        content: 'Work with your partner\nStep 1: Read the problem\nStep 2: Solve together',
      }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].slideType).toBe('work-together');
    expect(slides[0].content.length).toBeGreaterThanOrEqual(2);
    expect(slides[0].content).toContain('Work with your partner');
  });

  test('Short single-line Activity: block is absorbed as content bullet, no separate slide', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Let us try a quick activity' }),
      makeBlock({ type: 'activity', content: 'Think-pair-share about fractions' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    // Should be one slide, not two
    expect(slides.length).toBe(1);
    expect(slides[0].content).toContain('Think-pair-share about fractions');
    expect(slides[0].slideType).not.toBe('work-together');
  });

  test('Implicit Say: blocks (implicit: true) are treated identically to explicit Say: blocks', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'This is implicit prose', implicit: true }),
      makeBlock({ type: 'write-on-board', content: 'Key point here' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].speakerNotes).toContain('This is implicit prose');
    expect(slides[0].content).toContain('Key point here');
    expect(slides[0].content).not.toContain('This is implicit prose');
  });
});

// =============================================================================
// MAP-02: Segment Count Invariant
// =============================================================================

describe('MAP-02: Segment Count Invariant', () => {
  test('Slide with 0 content bullets has exactly 1 speakerNotes segment', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Just talking, no bullets' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].content.length).toBe(0);
    expect(countSegments(slides[0].speakerNotes)).toBe(1);
  });

  test('Slide with 3 content bullets has exactly 4 speakerNotes segments', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Intro' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet 1' }),
      makeBlock({ type: 'say', content: 'Explanation' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet 2' }),
      makeBlock({ type: 'say', content: 'More info' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet 3' }),
      makeBlock({ type: 'say', content: 'Wrap up' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].content.length).toBe(3);
    expect(countSegments(slides[0].speakerNotes)).toBe(4);
  });

  test('Fewer Say: blocks than content+1 slots results in trailing empty segments', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Intro only' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet 1' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet 2' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet 3' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].content.length).toBe(3);
    const segments = slides[0].speakerNotes.split(SEGMENT_DELIMITER);
    expect(segments.length).toBe(4); // content.length + 1
    expect(segments[0]).toBe('Intro only');
    expect(segments[2]).toBe(''); // trailing empty
    expect(segments[3]).toBe(''); // trailing empty
  });

  test('More Say: blocks than content+1 slots merges all at their position', () => {
    // 4 Say blocks all before 1 Write block: they all land in segment 0 (intro)
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Segment 1' }),
      makeBlock({ type: 'say', content: 'Segment 2' }),
      makeBlock({ type: 'say', content: 'Segment 3' }),
      makeBlock({ type: 'say', content: 'Segment 4' }),
      makeBlock({ type: 'write-on-board', content: 'Only bullet' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].content.length).toBe(1);
    const segments = slides[0].speakerNotes.split(SEGMENT_DELIMITER);
    expect(segments.length).toBe(2); // content.length + 1
    // All 4 Say blocks merge into intro segment (position before the bullet)
    expect(segments[0]).toContain('Segment 1');
    expect(segments[0]).toContain('Segment 2');
    expect(segments[0]).toContain('Segment 3');
    expect(segments[0]).toContain('Segment 4');
    expect(segments[0]).toContain('\n\n'); // paragraph breaks between merged segments
    // Trailing segment is empty (no Say after the bullet)
    expect(segments[1]).toBe('');
  });

  test('Empty segments are valid when no Say: block precedes a content bullet', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'write-on-board', content: 'Bullet 1' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet 2' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].content.length).toBe(2);
    const segments = slides[0].speakerNotes.split(SEGMENT_DELIMITER);
    expect(segments.length).toBe(3); // content.length + 1
    // All segments empty since no Say blocks
    segments.forEach(s => expect(s).toBe(''));
  });

  test('Trailing Say: blocks after the last content bullet fill the final segment', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'write-on-board', content: 'Bullet 1' }),
      makeBlock({ type: 'say', content: 'Wrapping up this point' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].content.length).toBe(1);
    const segments = slides[0].speakerNotes.split(SEGMENT_DELIMITER);
    expect(segments.length).toBe(2); // content.length + 1
    expect(segments[0]).toBe(''); // No say before bullet
    expect(segments[1]).toBe('Wrapping up this point'); // Trailing say fills final segment
  });

  test('Multiple consecutive Say: blocks before a single content bullet merge with \\n\\n', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'First thing to say' }),
      makeBlock({ type: 'say', content: 'Second thing to say' }),
      makeBlock({ type: 'write-on-board', content: 'The bullet' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].content.length).toBe(1);
    const segments = slides[0].speakerNotes.split(SEGMENT_DELIMITER);
    expect(segments.length).toBe(2); // content.length + 1
    // Both say blocks merge into the intro segment
    expect(segments[0]).toContain('First thing to say');
    expect(segments[0]).toContain('Second thing to say');
    expect(segments[0]).toContain('\n\n');
  });
});

// =============================================================================
// MAP-03: Slide Boundaries
// =============================================================================

describe('MAP-03: Slide Boundaries', () => {
  test('Section heading creates a new slide boundary', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Hook intro' }),
      makeBlock({ type: 'section-heading', content: 'Hook', section: 'Hook' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Main content' }),
      makeBlock({ type: 'write-on-board', content: 'Key idea' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    // First slide has 'Hook intro', second slide has the rest
    expect(slides.length).toBe(2);
  });

  test('Consecutive Say: and Write on board: blocks group onto the same slide', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'First explanation' }),
      makeBlock({ type: 'write-on-board', content: 'Point A' }),
      makeBlock({ type: 'say', content: 'Second explanation' }),
      makeBlock({ type: 'write-on-board', content: 'Point B' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].content.length).toBe(2);
  });

  test('Ask: block on a slide with existing content triggers flush after itself', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Teaching content' }),
      makeBlock({ type: 'write-on-board', content: 'Important point' }),
      makeBlock({ type: 'ask', content: 'Do you understand?' }),
      makeBlock({ type: 'say', content: 'Moving on to next topic' }),
      makeBlock({ type: 'write-on-board', content: 'Next point' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    // First slide has teaching + ask, second slide has next topic
    expect(slides.length).toBe(2);
    expect(slides[0].content).toContain('Do you understand?');
    expect(slides[0].hasQuestionFlag).toBe(true);
    expect(slides[1].content).toContain('Next point');
  });

  test('Ask: block as the first block on a slide stays without triggering boundary', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'ask', content: 'What do you already know about fractions?' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].content).toContain('What do you already know about fractions?');
    expect(slides[0].hasQuestionFlag).toBe(true);
  });

  test('Consecutive section headings with no content collapse into one slide', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'Hook', section: 'Hook' as SectionLabel }),
      makeBlock({ type: 'section-heading', content: 'I Do', section: 'I Do' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Content here' }),
      makeBlock({ type: 'write-on-board', content: 'A bullet' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    // Should NOT produce an empty slide for Hook -- the I Do heading replaces it
    expect(slides.length).toBe(1);
    expect(slides[0].content).toContain('A bullet');
  });

  test('End-to-end: realistic lesson plan produces reasonable slide count', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'Hook', section: 'Hook' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Welcome everyone, today we learn fractions' }),
      makeBlock({ type: 'ask', content: 'Who has used fractions before?' }),
      makeBlock({ type: 'section-heading', content: 'I Do', section: 'I Do' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Let me show you how to add fractions' }),
      makeBlock({ type: 'write-on-board', content: '1/2 + 1/4 = 3/4' }),
      makeBlock({ type: 'say', content: 'Notice how we find the common denominator' }),
      makeBlock({ type: 'write-on-board', content: 'LCD = 4' }),
      makeBlock({ type: 'section-heading', content: 'We Do', section: 'We Do' as SectionLabel }),
      makeBlock({
        type: 'activity',
        content: 'Work with your partner on these problems\nProblem 1: 1/3 + 1/6\nProblem 2: 2/5 + 1/10',
      }),
      makeBlock({ type: 'section-heading', content: 'Plenary', section: 'Plenary' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Great work today' }),
      makeBlock({ type: 'ask', content: 'What was the key step in adding fractions?' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    // Reasonable: Hook (ask triggers flush) + I Do + We Do activity + Plenary (ask)
    expect(slides.length).toBeGreaterThanOrEqual(3);
    expect(slides.length).toBeLessThanOrEqual(6);
  });
});

// =============================================================================
// MAP-04: LessonPhase Assignment
// =============================================================================

describe('MAP-04: LessonPhase Assignment', () => {
  test('Section heading "Hook" sets lessonPhase: hook', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'Hook', section: 'Hook' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Welcome' }),
      makeBlock({ type: 'write-on-board', content: 'Topic' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].lessonPhase).toBe('hook');
  });

  test('Section heading "I Do" sets lessonPhase: i-do', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'I Do', section: 'I Do' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Watch me' }),
      makeBlock({ type: 'write-on-board', content: 'Example' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].lessonPhase).toBe('i-do');
  });

  test('Section heading "We Do" sets lessonPhase: we-do', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'We Do', section: 'We Do' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Together now' }),
      makeBlock({ type: 'write-on-board', content: 'Problem' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].lessonPhase).toBe('we-do');
  });

  test('Section heading "You Do" sets lessonPhase: you-do', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'You Do', section: 'You Do' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Your turn' }),
      makeBlock({ type: 'write-on-board', content: 'Task' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].lessonPhase).toBe('you-do');
  });

  test('Section heading "Plenary" sets lessonPhase: plenary', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'Plenary', section: 'Plenary' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Review time' }),
      makeBlock({ type: 'write-on-board', content: 'Summary' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].lessonPhase).toBe('plenary');
  });

  test('Slides after a section heading inherit the lessonPhase until next heading', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'Hook', section: 'Hook' as SectionLabel }),
      makeBlock({ type: 'say', content: 'First hook content' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet' }),
      makeBlock({ type: 'ask', content: 'Question?' }),
      // After ask flush, the next slide should still be 'hook'
      makeBlock({ type: 'say', content: 'More hook content' }),
      makeBlock({ type: 'write-on-board', content: 'Another bullet' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    // All slides should have lessonPhase 'hook' since no new heading
    slides.forEach(slide => {
      expect(slide.lessonPhase).toBe('hook');
    });
  });

  test('Slides before any section heading have lessonPhase: undefined', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Before any heading' }),
      makeBlock({ type: 'write-on-board', content: 'Early bullet' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].lessonPhase).toBeUndefined();
  });
});

// =============================================================================
// MAP-05: Work-Together Slides
// =============================================================================

describe('MAP-05: Work-Together Slides', () => {
  test('Substantial multi-line Activity: creates slideType work-together', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({
        type: 'activity',
        content: 'Group activity\nStep 1: Read the text\nStep 2: Discuss with partner',
      }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides.length).toBe(1);
    expect(slides[0].slideType).toBe('work-together');
  });

  test('Work-together slide has layout: work-together', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({
        type: 'activity',
        content: 'Partner work\nRead page 10\nAnswer questions 1-5',
      }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].layout).toBe('work-together');
  });

  test('Activity instructions are split on newlines into content[] bullets', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({
        type: 'activity',
        content: 'Main task\nStep 1: Gather materials\nStep 2: Build model\nStep 3: Present',
      }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].content.length).toBe(4);
    expect(slides[0].content[0]).toBe('Main task');
    expect(slides[0].content[1]).toBe('Step 1: Gather materials');
    expect(slides[0].content[2]).toBe('Step 2: Build model');
    expect(slides[0].content[3]).toBe('Step 3: Present');
  });

  test('Full activity text goes into speakerNotes for teleprompter', () => {
    const activityText = 'Group activity\nStep 1: Read\nStep 2: Discuss';
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'activity', content: activityText }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].speakerNotes).toContain('Group activity');
    expect(slides[0].speakerNotes).toContain('Step 1: Read');
    expect(slides[0].speakerNotes).toContain('Step 2: Discuss');
  });

  test('Short single-line Activity: is NOT work-together', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Try this' }),
      makeBlock({ type: 'activity', content: 'Quick think-pair-share' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].slideType).not.toBe('work-together');
    expect(slides[0].layout).not.toBe('work-together');
  });
});

// =============================================================================
// Slide Construction
// =============================================================================

describe('Slide Construction', () => {
  test('Each slide has an id matching pattern scripted-{timestamp}-{index}', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Content' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].id).toMatch(/^scripted-\d+-\d+$/);
  });

  test('Slides with section heading get that section as title', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'Hook', section: 'Hook' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Teaching' }),
      makeBlock({ type: 'write-on-board', content: 'Point' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].title).toBe('Hook');
  });

  test('Slides with no section context derive title from first content bullet (truncated to 60 chars)', () => {
    const longBullet = 'This is a very long content bullet that should be truncated at sixty characters for the title';
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'write-on-board', content: longBullet }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].title.length).toBeLessThanOrEqual(60);
    expect(longBullet.startsWith(slides[0].title.replace('...', ''))).toBe(true);
  });

  test('Slides with no section and no content get title Untitled', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Just talking' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].title).toBe('Untitled');
  });

  test('imagePrompt is empty string on all slides', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'Hook', section: 'Hook' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Content' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    slides.forEach(slide => {
      expect(slide.imagePrompt).toBe('');
    });
  });

  test('Non-work-together slides have layout split by default', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'say', content: 'Content' }),
      makeBlock({ type: 'write-on-board', content: 'Bullet' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    expect(slides[0].layout).toBe('split');
  });
});

// =============================================================================
// Segment Invariant Cross-Check (applies to all slides)
// =============================================================================

describe('Segment Invariant Cross-Check', () => {
  test('Every slide in a complex scenario satisfies segments = content.length + 1', () => {
    const blocks: ScriptedBlock[] = [
      makeBlock({ type: 'section-heading', content: 'Hook', section: 'Hook' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Welcome to the lesson' }),
      makeBlock({ type: 'ask', content: 'Ready to learn?' }),
      makeBlock({ type: 'section-heading', content: 'I Do', section: 'I Do' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Watch carefully' }),
      makeBlock({ type: 'write-on-board', content: 'Step 1: Find LCD' }),
      makeBlock({ type: 'say', content: 'Now convert' }),
      makeBlock({ type: 'write-on-board', content: 'Step 2: Convert fractions' }),
      makeBlock({ type: 'write-on-board', content: 'Step 3: Add numerators' }),
      makeBlock({ type: 'section-heading', content: 'We Do', section: 'We Do' as SectionLabel }),
      makeBlock({
        type: 'activity',
        content: 'Pair work\nSolve problem A\nSolve problem B\nCompare answers',
      }),
      makeBlock({ type: 'section-heading', content: 'Plenary', section: 'Plenary' as SectionLabel }),
      makeBlock({ type: 'say', content: 'Great job today' }),
    ];
    const slides = mapBlocksToSlides(blocks);

    // Verify the invariant on every single slide
    slides.forEach((slide, i) => {
      const segmentCount = countSegments(slide.speakerNotes);
      const expectedCount = slide.content.length + 1;
      expect(segmentCount).toBe(expectedCount);
    });
  });
});
