/**
 * Scaffolding Word Count Validation Tests
 *
 * Validates that all scaffolding templates adhere to the Phase 53 requirement:
 * Each scaffolding question must be under 20 words for verbal deliverability.
 *
 * Teachers read these prompts aloud - short questions are natural, long scripts are awkward.
 */

import { getTeachableMomentRules } from './teachableMomentRules';
import { TeachableMoment, ContentCategory } from '../contentPreservation/types';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Count words in a text string.
 * Handles contractions and punctuation correctly.
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Extract CORRECT example questions from scaffolding template output.
 * Excludes WRONG examples which are intentionally too long to show what not to do.
 *
 * Strategy:
 * 1. Split the template into CORRECT and WRONG sections
 * 2. Only extract questions from CORRECT sections
 * 3. Questions are identified as text in quotes followed by word count
 */
function extractExampleQuestions(templateOutput: string): string[] {
  const questions: string[] = [];

  // Split into sections and only process CORRECT sections
  // The template alternates between CORRECT and WRONG examples
  const sections = templateOutput.split(/WRONG[^C]*/);
  const correctSections = sections.filter(s => s.includes('CORRECT') || s.includes('Question types:'));

  for (const section of correctSections) {
    // Extract quoted questions followed by word count (e.g., "What do we know?" (4 words))
    const quotedPattern = /"([^"]+\??)"\s*\(\d+ words?\)/g;
    let match;
    while ((match = quotedPattern.exec(section)) !== null) {
      const question = match[1].trim();
      // Only include actual question examples
      if (question.length > 5 && question.length < 100) {
        questions.push(question);
      }
    }
  }

  return questions;
}

/**
 * Create a mock TeachableMoment for a specific content category.
 */
function createMockMoment(category: ContentCategory): TeachableMoment {
  return {
    problem: {
      type: 'question',
      text: 'Test question?',
      confidence: 'high',
      detectionMethod: 'punctuation',
      startIndex: 0,
      endIndex: 14
    },
    answer: {
      type: 'answer',
      text: 'Test answer',
      confidence: 'high',
      detectionMethod: 'context',
      startIndex: 20,
      endIndex: 31
    },
    contentCategory: category,
    confidence: 'high',
    proximityChars: 6
  };
}

// =============================================================================
// Word Count Constraint Tests
// =============================================================================

describe('Scaffolding Word Count Constraint (<20 words)', () => {
  describe('Math scaffolding template', () => {
    it('each example question is under 20 words', () => {
      const moments = [createMockMoment('math')];
      const rules = getTeachableMomentRules(moments);

      const questions = extractExampleQuestions(rules);

      questions.forEach(q => {
        const wordCount = countWords(q);
        expect(wordCount).toBeLessThanOrEqual(20);
      });
    });

    it('contains [PAUSE] markers for wait time', () => {
      const moments = [createMockMoment('math')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('[PAUSE]');
    });

    it('specifies word count constraint explicitly', () => {
      const moments = [createMockMoment('math')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('under 20 words');
    });
  });

  describe('Vocabulary scaffolding template', () => {
    it('each example question is under 20 words', () => {
      const moments = [createMockMoment('vocabulary')];
      const rules = getTeachableMomentRules(moments);

      const questions = extractExampleQuestions(rules);

      questions.forEach(q => {
        const wordCount = countWords(q);
        expect(wordCount).toBeLessThanOrEqual(20);
      });
    });

    it('contains [PAUSE] markers for wait time', () => {
      const moments = [createMockMoment('vocabulary')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('[PAUSE]');
    });

    it('specifies word count constraint explicitly', () => {
      const moments = [createMockMoment('vocabulary')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('under 20 words');
    });
  });

  describe('Comprehension scaffolding template', () => {
    it('each example question is under 20 words', () => {
      const moments = [createMockMoment('comprehension')];
      const rules = getTeachableMomentRules(moments);

      const questions = extractExampleQuestions(rules);

      questions.forEach(q => {
        const wordCount = countWords(q);
        expect(wordCount).toBeLessThanOrEqual(20);
      });
    });

    it('contains [PAUSE] markers for wait time', () => {
      const moments = [createMockMoment('comprehension')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('[PAUSE]');
    });

    it('specifies word count constraint explicitly', () => {
      const moments = [createMockMoment('comprehension')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('under 20 words');
    });
  });

  describe('Science scaffolding template', () => {
    it('each example question is under 20 words', () => {
      const moments = [createMockMoment('science')];
      const rules = getTeachableMomentRules(moments);

      const questions = extractExampleQuestions(rules);

      questions.forEach(q => {
        const wordCount = countWords(q);
        expect(wordCount).toBeLessThanOrEqual(20);
      });
    });

    it('contains [PAUSE] markers for wait time', () => {
      const moments = [createMockMoment('science')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('[PAUSE]');
    });

    it('specifies word count constraint explicitly', () => {
      const moments = [createMockMoment('science')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('under 20 words');
    });
  });

  describe('General scaffolding template', () => {
    it('each example question is under 20 words', () => {
      const moments = [createMockMoment('general')];
      const rules = getTeachableMomentRules(moments);

      const questions = extractExampleQuestions(rules);

      questions.forEach(q => {
        const wordCount = countWords(q);
        expect(wordCount).toBeLessThanOrEqual(20);
      });
    });

    it('contains [PAUSE] markers for wait time', () => {
      const moments = [createMockMoment('general')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('[PAUSE]');
    });

    it('specifies word count constraint explicitly', () => {
      const moments = [createMockMoment('general')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('under 20 words');
    });
  });
});

// =============================================================================
// Template Structure Tests
// =============================================================================

describe('Template Structure', () => {
  it('returns empty string when no teachable moments provided', () => {
    const rules = getTeachableMomentRules([]);
    expect(rules).toBe('');
  });

  it('includes XML tags for structured AI prompting', () => {
    const moments = [createMockMoment('math')];
    const rules = getTeachableMomentRules(moments);

    expect(rules).toContain('<teachable_moment_formatting>');
    expect(rules).toContain('</teachable_moment_formatting>');
  });

  it('includes verbal deliverability section', () => {
    const moments = [createMockMoment('math')];
    const rules = getTeachableMomentRules(moments);

    expect(rules).toContain('VERBAL DELIVERABILITY');
  });

  it('includes teleprompter confirmation guidance', () => {
    const moments = [createMockMoment('math')];
    const rules = getTeachableMomentRules(moments);

    expect(rules).toContain('TELEPROMPTER CONFIRMATION');
  });

  it('includes bullet structure rules', () => {
    const moments = [createMockMoment('math')];
    const rules = getTeachableMomentRules(moments);

    expect(rules).toContain('BULLET STRUCTURE');
    expect(rules).toContain('Problem bullet');
    expect(rules).toContain('Answer bullet');
  });
});

// =============================================================================
// Category-Specific Template Tests
// =============================================================================

describe('Category-Specific Templates', () => {
  describe('Math template', () => {
    it('includes known/unknown question type', () => {
      const moments = [createMockMoment('math')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('What do we know');
    });

    it('includes process question type', () => {
      const moments = [createMockMoment('math')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('first step');
    });

    it('includes visual question type', () => {
      const moments = [createMockMoment('math')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('draw');
    });

    it('provides CORRECT and WRONG examples', () => {
      const moments = [createMockMoment('math')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('CORRECT');
      expect(rules).toContain('WRONG');
    });

    it('shows word count for examples', () => {
      const moments = [createMockMoment('math')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toMatch(/\(\d+ words?\)/);
    });
  });

  describe('Vocabulary template', () => {
    it('includes word parts technique', () => {
      const moments = [createMockMoment('vocabulary')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('break this word into parts');
    });

    it('includes root word technique', () => {
      const moments = [createMockMoment('vocabulary')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('root');
    });

    it('includes critical note about not repeating word', () => {
      const moments = [createMockMoment('vocabulary')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('CRITICAL');
      expect(rules).toContain('do NOT repeat the vocabulary word');
    });
  });

  describe('Comprehension template', () => {
    it('includes finding evidence technique', () => {
      const moments = [createMockMoment('comprehension')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('go back to paragraph');
    });

    it('includes inference question type', () => {
      const moments = [createMockMoment('comprehension')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('figure out');
    });

    it('includes inference technique', () => {
      const moments = [createMockMoment('comprehension')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('INFERENCE TECHNIQUE');
    });
  });

  describe('Science template', () => {
    it('includes process explanation technique', () => {
      const moments = [createMockMoment('science')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('Water evaporates');
    });

    it('includes prediction question type', () => {
      const moments = [createMockMoment('science')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('What will happen');
    });

    it('includes cause and effect technique', () => {
      const moments = [createMockMoment('science')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('CAUSE AND EFFECT');
    });
  });

  describe('General template', () => {
    it('includes think question type', () => {
      const moments = [createMockMoment('general')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('What do you think');
    });

    it('includes share prompt type', () => {
      const moments = [createMockMoment('general')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('Talk to a partner');
    });

    it('includes step-by-step breakdown technique', () => {
      const moments = [createMockMoment('general')];
      const rules = getTeachableMomentRules(moments);

      expect(rules).toContain('break this into parts');
    });
  });
});

// =============================================================================
// Multi-Category Handling Tests
// =============================================================================

describe('Multi-Category Content Handling', () => {
  it('includes all relevant category templates when multiple categories detected', () => {
    const moments = [
      createMockMoment('math'),
      createMockMoment('vocabulary'),
      createMockMoment('comprehension')
    ];
    const rules = getTeachableMomentRules(moments);

    // Should include math-specific content
    expect(rules).toContain('divide by 10');
    // Should include vocabulary-specific content
    expect(rules).toContain('break this word into parts');
    // Should include comprehension-specific content
    expect(rules).toContain('go back to paragraph');
  });

  it('does not duplicate common elements', () => {
    const moments = [
      createMockMoment('math'),
      createMockMoment('vocabulary')
    ];
    const rules = getTeachableMomentRules(moments);

    // VERBAL DELIVERABILITY section should appear only once
    const vdMatches = rules.match(/VERBAL DELIVERABILITY/g);
    expect(vdMatches).toHaveLength(1);
  });

  it('includes teachable moment examples section', () => {
    const moments = [createMockMoment('math')];
    const rules = getTeachableMomentRules(moments);

    expect(rules).toContain('<teachable_moment_examples>');
    expect(rules).toContain('</teachable_moment_examples>');
  });
});

// =============================================================================
// Edge Case Examples Section Tests
// =============================================================================

describe('Edge Case Examples', () => {
  it('includes math-discount-calculation example', () => {
    const moments = [createMockMoment('math')];
    const rules = getTeachableMomentRules(moments);

    expect(rules).toContain('math-discount-calculation');
  });

  it('includes vocabulary-definition example', () => {
    const moments = [createMockMoment('vocabulary')];
    const rules = getTeachableMomentRules(moments);

    expect(rules).toContain('vocabulary-definition');
  });

  it('includes rhetorical-question example', () => {
    const moments = [createMockMoment('math')];
    const rules = getTeachableMomentRules(moments);

    expect(rules).toContain('rhetorical-question');
  });

  it('includes comprehension-question example', () => {
    const moments = [createMockMoment('comprehension')];
    const rules = getTeachableMomentRules(moments);

    expect(rules).toContain('comprehension-question');
  });
});

// =============================================================================
// Determinism Tests
// =============================================================================

describe('Template Determinism', () => {
  it('produces identical output for same input', () => {
    const moments = [createMockMoment('math')];

    const rules1 = getTeachableMomentRules(moments);
    const rules2 = getTeachableMomentRules(moments);
    const rules3 = getTeachableMomentRules(moments);

    expect(rules1).toBe(rules2);
    expect(rules2).toBe(rules3);
  });

  it('produces consistent output across all categories', () => {
    const categories: ContentCategory[] = ['math', 'vocabulary', 'comprehension', 'science', 'general'];

    categories.forEach(category => {
      const moments = [createMockMoment(category)];

      const rules1 = getTeachableMomentRules(moments);
      const rules2 = getTeachableMomentRules(moments);

      expect(rules1).toBe(rules2);
    });
  });
});
