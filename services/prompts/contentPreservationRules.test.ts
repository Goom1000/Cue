/**
 * Unit tests for the content preservation rules module.
 *
 * Tests cover:
 * - escapeXml: all 5 special characters (&, <, >, ", ')
 * - buildPreservationPrompt: various input scenarios and confidence filtering
 * - getPreservationRules: PreservableContent wrapper
 * - getTeleprompterPreservationRules: conditional guidance generation
 */

import {
  escapeXml,
  buildPreservationPrompt,
  getPreservationRules,
  getTeleprompterPreservationRules
} from './contentPreservationRules';

import type { DetectedContent, PreservableContent, ConfidenceLevel } from '../contentPreservation/types';

// =============================================================================
// Helper to create DetectedContent
// =============================================================================

function createDetectedContent(
  text: string,
  type: 'question' | 'activity' | 'instruction' = 'question',
  confidence: ConfidenceLevel = 'high'
): DetectedContent {
  return {
    type,
    text,
    confidence,
    detectionMethod: 'punctuation',
    startIndex: 0,
    endIndex: text.length
  };
}

function createPreservableContent(
  questions: DetectedContent[] = [],
  activities: DetectedContent[] = [],
  instructions: DetectedContent[] = []
): PreservableContent {
  return {
    questions,
    activities,
    instructions,
    all: [...questions, ...activities, ...instructions]
  };
}

// =============================================================================
// escapeXml Tests
// =============================================================================

describe('escapeXml', () => {
  it('escapes ampersand (&)', () => {
    expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('escapes less than (<)', () => {
    expect(escapeXml('a < b')).toBe('a &lt; b');
  });

  it('escapes greater than (>)', () => {
    expect(escapeXml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quote (")', () => {
    expect(escapeXml('He said "hello"')).toBe('He said &quot;hello&quot;');
  });

  it('escapes single quote (\')', () => {
    expect(escapeXml("It's fine")).toBe('It&apos;s fine');
  });

  it('escapes all 5 characters in one string', () => {
    const input = `<tag attr="value" other='test'> & more`;
    const expected = '&lt;tag attr=&quot;value&quot; other=&apos;test&apos;&gt; &amp; more';
    expect(escapeXml(input)).toBe(expected);
  });

  it('returns empty string for empty input', () => {
    expect(escapeXml('')).toBe('');
  });

  it('returns unchanged text when no special characters', () => {
    const text = 'Regular text with no special characters';
    expect(escapeXml(text)).toBe(text);
  });

  it('handles multiple consecutive special characters', () => {
    expect(escapeXml('<<<>>>')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
  });

  it('handles teacher content like "Compare <plant> and <animal> cells"', () => {
    const input = 'Compare <plant> and <animal> cells';
    const expected = 'Compare &lt;plant&gt; and &lt;animal&gt; cells';
    expect(escapeXml(input)).toBe(expected);
  });

  it('handles HTML-like content in educational text', () => {
    const input = 'Use the <b>bold</b> tag for emphasis';
    const expected = 'Use the &lt;b&gt;bold&lt;/b&gt; tag for emphasis';
    expect(escapeXml(input)).toBe(expected);
  });
});

// =============================================================================
// buildPreservationPrompt Tests
// =============================================================================

describe('buildPreservationPrompt', () => {
  describe('empty input handling', () => {
    it('returns empty string for empty array', () => {
      const result = buildPreservationPrompt([]);
      expect(result).toBe('');
    });

    it('returns empty string when all items are filtered by confidence', () => {
      const lowConfidenceItem = createDetectedContent('Low confidence question?', 'question', 'low');
      const result = buildPreservationPrompt([lowConfidenceItem], 'medium');
      expect(result).toBe('');
    });
  });

  describe('single item handling', () => {
    it('generates prompt for single question', () => {
      const item = createDetectedContent('What is photosynthesis?', 'question', 'high');
      const result = buildPreservationPrompt([item]);

      expect(result).toContain('<content_preservation>');
      expect(result).toContain('</content_preservation>');
      expect(result).toContain('<preserve type="question"');
      expect(result).toContain('What is photosynthesis?');
    });

    it('generates prompt for single activity', () => {
      const item = createDetectedContent('List three examples.', 'activity', 'high');
      const result = buildPreservationPrompt([item]);

      expect(result).toContain('<preserve type="activity"');
      expect(result).toContain('List three examples.');
    });

    it('generates prompt for single instruction', () => {
      const item = createDetectedContent('This is important for the exam.', 'instruction', 'high');
      const result = buildPreservationPrompt([item]);

      expect(result).toContain('<preserve type="instruction"');
    });
  });

  describe('multiple items handling', () => {
    it('includes all items in output', () => {
      const items = [
        createDetectedContent('Question 1?', 'question', 'high'),
        createDetectedContent('Question 2?', 'question', 'high'),
        createDetectedContent('Activity 1.', 'activity', 'high')
      ];
      const result = buildPreservationPrompt(items);

      expect(result).toContain('Question 1?');
      expect(result).toContain('Question 2?');
      expect(result).toContain('Activity 1.');
    });

    it('preserves order of items', () => {
      const items = [
        createDetectedContent('First', 'question', 'high'),
        createDetectedContent('Second', 'activity', 'high'),
        createDetectedContent('Third', 'instruction', 'high')
      ];
      const result = buildPreservationPrompt(items);

      const firstIndex = result.indexOf('First');
      const secondIndex = result.indexOf('Second');
      const thirdIndex = result.indexOf('Third');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  describe('confidence filtering', () => {
    const highItem = createDetectedContent('High confidence', 'question', 'high');
    const mediumItem = createDetectedContent('Medium confidence', 'question', 'medium');
    const lowItem = createDetectedContent('Low confidence', 'question', 'low');
    const allItems = [highItem, mediumItem, lowItem];

    it('filters out low confidence items by default (minConfidence=medium)', () => {
      const result = buildPreservationPrompt(allItems);

      expect(result).toContain('High confidence');
      expect(result).toContain('Medium confidence');
      expect(result).not.toContain('Low confidence');
    });

    it('includes all items when minConfidence is low', () => {
      const result = buildPreservationPrompt(allItems, 'low');

      expect(result).toContain('High confidence');
      expect(result).toContain('Medium confidence');
      expect(result).toContain('Low confidence');
    });

    it('includes only high confidence when minConfidence is high', () => {
      const result = buildPreservationPrompt(allItems, 'high');

      expect(result).toContain('High confidence');
      expect(result).not.toContain('Medium confidence');
      expect(result).not.toContain('Low confidence');
    });

    it('returns empty string when no items meet confidence threshold', () => {
      const result = buildPreservationPrompt([lowItem], 'high');
      expect(result).toBe('');
    });
  });

  describe('XML structure', () => {
    it('includes preservation rules section', () => {
      const item = createDetectedContent('Test question?', 'question', 'high');
      const result = buildPreservationPrompt([item]);

      expect(result).toContain('CONTENT PRESERVATION RULES:');
      expect(result).toContain('you MUST:');
      expect(result).toContain('You MAY:');
      expect(result).toContain('You MUST NOT:');
    });

    it('includes few-shot examples', () => {
      const item = createDetectedContent('Test question?', 'question', 'high');
      const result = buildPreservationPrompt([item]);

      expect(result).toContain('<preservation_examples>');
      expect(result).toContain('</preservation_examples>');
      expect(result).toContain('<example scenario=');
    });

    it('includes preservable content section', () => {
      const item = createDetectedContent('Test?', 'question', 'high');
      const result = buildPreservationPrompt([item]);

      expect(result).toContain('<preservable_content>');
      expect(result).toContain('</preservable_content>');
    });

    it('includes detection method in preserve tag', () => {
      const item: DetectedContent = {
        type: 'question',
        text: 'Test?',
        confidence: 'high',
        detectionMethod: 'punctuation',
        startIndex: 0,
        endIndex: 5
      };
      const result = buildPreservationPrompt([item]);

      expect(result).toContain('method="punctuation"');
    });
  });

  describe('XML escaping in output', () => {
    it('escapes special characters in preserved content', () => {
      const item = createDetectedContent('Compare <x> & <y>', 'question', 'high');
      const result = buildPreservationPrompt([item]);

      expect(result).toContain('&lt;x&gt;');
      expect(result).toContain('&amp;');
      expect(result).not.toContain('<x>');
    });

    it('escapes quotes in preserved content', () => {
      const item = createDetectedContent('What is "test"?', 'question', 'high');
      const result = buildPreservationPrompt([item]);

      expect(result).toContain('&quot;test&quot;');
    });
  });
});

// =============================================================================
// getPreservationRules Tests
// =============================================================================

describe('getPreservationRules', () => {
  it('wraps buildPreservationPrompt for PreservableContent', () => {
    const content = createPreservableContent(
      [createDetectedContent('Question?', 'question', 'high')],
      [createDetectedContent('Activity.', 'activity', 'high')],
      []
    );

    const result = getPreservationRules(content);

    expect(result).toContain('Question?');
    expect(result).toContain('Activity.');
  });

  it('returns empty string for empty PreservableContent', () => {
    const content = createPreservableContent();
    const result = getPreservationRules(content);

    expect(result).toBe('');
  });

  it('passes minConfidence to buildPreservationPrompt', () => {
    const content = createPreservableContent(
      [createDetectedContent('Low question?', 'question', 'low')],
      [],
      []
    );

    const resultFiltered = getPreservationRules(content, 'medium');
    const resultUnfiltered = getPreservationRules(content, 'low');

    expect(resultFiltered).toBe('');
    expect(resultUnfiltered).toContain('Low question?');
  });

  it('uses medium as default minConfidence', () => {
    const content = createPreservableContent(
      [
        createDetectedContent('High?', 'question', 'high'),
        createDetectedContent('Low?', 'question', 'low')
      ],
      [],
      []
    );

    const result = getPreservationRules(content);

    expect(result).toContain('High?');
    expect(result).not.toContain('Low?');
  });

  it('handles mixed content types', () => {
    const content = createPreservableContent(
      [createDetectedContent('Q1?', 'question', 'high')],
      [createDetectedContent('A1.', 'activity', 'medium')],
      [createDetectedContent('I1.', 'instruction', 'high')]
    );

    const result = getPreservationRules(content);

    expect(result).toContain('Q1?');
    expect(result).toContain('A1.');
    expect(result).toContain('I1.');
  });
});

// =============================================================================
// getTeleprompterPreservationRules Tests
// =============================================================================

describe('getTeleprompterPreservationRules', () => {
  describe('returns guidance when content present', () => {
    it('returns guidance when questions are present', () => {
      const content = createPreservableContent(
        [createDetectedContent('What is this?', 'question', 'high')],
        [],
        []
      );

      const result = getTeleprompterPreservationRules(content);

      expect(result).toContain('SPEAKER NOTES FOR PRESERVED CONTENT');
      expect(result).toContain('For QUESTIONS:');
    });

    it('returns guidance when activities are present', () => {
      const content = createPreservableContent(
        [],
        [createDetectedContent('List examples.', 'activity', 'high')],
        []
      );

      const result = getTeleprompterPreservationRules(content);

      expect(result).toContain('SPEAKER NOTES FOR PRESERVED CONTENT');
      expect(result).toContain('For ACTIVITIES:');
    });

    it('returns guidance when both questions and activities present', () => {
      const content = createPreservableContent(
        [createDetectedContent('Question?', 'question', 'high')],
        [createDetectedContent('Activity.', 'activity', 'high')],
        []
      );

      const result = getTeleprompterPreservationRules(content);

      expect(result).toContain('For QUESTIONS:');
      expect(result).toContain('For ACTIVITIES:');
    });
  });

  describe('returns empty when no questions/activities', () => {
    it('returns empty string for empty content', () => {
      const content = createPreservableContent();
      const result = getTeleprompterPreservationRules(content);

      expect(result).toBe('');
    });

    it('returns empty string when only instructions present', () => {
      const content = createPreservableContent(
        [],
        [],
        [createDetectedContent('Note: Important.', 'instruction', 'high')]
      );

      const result = getTeleprompterPreservationRules(content);

      expect(result).toBe('');
    });
  });

  describe('teleprompter guidance content', () => {
    it('includes question delivery guidance', () => {
      const content = createPreservableContent(
        [createDetectedContent('Test?', 'question', 'high')],
        [],
        []
      );

      const result = getTeleprompterPreservationRules(content);

      expect(result).toContain('Introduce the question');
      expect(result).toContain('Wait for responses');
      expect(result).toContain('expected answer hints');
    });

    it('includes activity delivery guidance', () => {
      const content = createPreservableContent(
        [],
        [createDetectedContent('Activity.', 'activity', 'high')],
        []
      );

      const result = getTeleprompterPreservationRules(content);

      expect(result).toContain('Set up the activity');
      expect(result).toContain('timing cues');
      expect(result).toContain('wrap-up guidance');
    });

    it('includes example teleprompter script', () => {
      const content = createPreservableContent(
        [createDetectedContent('What is 3/4 of 12?', 'question', 'high')],
        [],
        []
      );

      const result = getTeleprompterPreservationRules(content);

      expect(result).toContain('Example teleprompter');
      expect(result).toContain('What is 3/4 of 12?');
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration', () => {
  it('handles realistic lesson plan content', () => {
    const content = createPreservableContent(
      [
        createDetectedContent('What is the water cycle?', 'question', 'high'),
        createDetectedContent('How does evaporation work?', 'question', 'medium')
      ],
      [
        createDetectedContent('List 3 examples of condensation.', 'activity', 'high')
      ],
      [
        createDetectedContent('This will be on the test.', 'instruction', 'high')
      ]
    );

    const preservationPrompt = getPreservationRules(content);
    const teleprompterRules = getTeleprompterPreservationRules(content);

    // Both should have content
    expect(preservationPrompt.length).toBeGreaterThan(0);
    expect(teleprompterRules.length).toBeGreaterThan(0);

    // All high/medium confidence items included
    expect(preservationPrompt).toContain('water cycle');
    expect(preservationPrompt).toContain('evaporation');
    expect(preservationPrompt).toContain('condensation');
  });

  it('produces consistent output for same input', () => {
    const content = createPreservableContent(
      [createDetectedContent('Test?', 'question', 'high')],
      [],
      []
    );

    const result1 = getPreservationRules(content);
    const result2 = getPreservationRules(content);
    const result3 = getPreservationRules(content);

    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });
});
