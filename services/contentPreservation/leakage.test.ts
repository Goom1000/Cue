/**
 * QUA-01: Answer Leakage Prevention Tests
 *
 * Validates that the teachable moment detection and scaffolding generation
 * never accidentally expose answers before the teacher is ready to reveal them.
 *
 * Uses the canary string methodology: embed unique identifiable strings as answers,
 * then verify they don't appear in problem bullets or scaffolding prompts.
 *
 * Key insight: Use unique canary values (like CANARY_42 or unusual numbers like 847)
 * that would never appear in template examples.
 */

import { detectTeachableMoments } from './detector';
import { getTeachableMomentRules } from '../prompts/teachableMomentRules';

// =============================================================================
// Test Fixtures: Canary String Test Cases
// =============================================================================

/**
 * Test cases with "canary" strings as answers that are easy to detect.
 * Each case covers a different content category to ensure comprehensive coverage.
 *
 * IMPORTANT: Use unique values that won't appear in scaffolding templates:
 * - Avoid small numbers (3, 4, 5, 6, 7) that appear in template examples
 * - Use larger/unusual numbers (847, 523, 1749) as canaries
 */
const MATH_TEST_CASES = [
  {
    name: 'simple arithmetic with unique answer',
    input: 'What is 423 + 424? Answer: 847',
    canaryAnswer: '847'
  },
  {
    name: 'fraction calculation with unique answer',
    input: 'What is 1/4 of 2092? Answer: 523',
    canaryAnswer: '523'
  },
  {
    name: 'multiplication with unique answer',
    input: 'What is 27 * 37? Answer: 999',
    canaryAnswer: '999'
  },
  {
    name: 'percentage calculation with unique answer',
    input: 'What is 15% of 4460? Answer: 669',
    canaryAnswer: '669'
  }
];

const VOCABULARY_TEST_CASES = [
  {
    name: 'vocabulary with context',
    input: 'What does osmosis mean? Answer: It means the movement of water across a membrane.',
    canaryAnswer: 'the movement of water across a membrane'
  },
  {
    name: 'antonym question',
    input: 'What is an antonym of hot? Answer: cold',
    canaryAnswer: 'cold'
  },
  {
    name: 'vocabulary definition question',
    input: 'What does metamorphosis mean? Answer: It means a complete change in form.',
    canaryAnswer: 'a complete change in form'
  },
  {
    name: 'word meaning question',
    input: 'What does precipitation mean? Answer: It means water falling from clouds.',
    canaryAnswer: 'water falling from clouds'
  }
];

const COMPREHENSION_TEST_CASES = [
  {
    name: 'cause and effect',
    input: 'Why did the ice melt? Answer: Because heat was applied.',
    canaryAnswer: 'Because heat was applied'
  },
  {
    name: 'inference question',
    input: 'Why did Sarah smile at the end of the story? Answer: Because she found her lost dog.',
    canaryAnswer: 'Because she found her lost dog'
  },
  {
    name: 'author purpose',
    input: 'Why did the author write this article? Answer: To inform readers about climate change.',
    canaryAnswer: 'To inform readers about climate change'
  },
  {
    name: 'reasoning question',
    input: 'Why do leaves change color in autumn? Answer: Because chlorophyll breaks down.',
    canaryAnswer: 'Because chlorophyll breaks down'
  }
];

const SCIENCE_TEST_CASES = [
  {
    name: 'science process',
    input: 'What happens during photosynthesis? Answer: Plants convert sunlight into food.',
    canaryAnswer: 'Plants convert sunlight into food'
  },
  {
    name: 'experiment observation',
    input: 'What did you observe in the experiment? Answer: The liquid changed from blue to green.',
    canaryAnswer: 'The liquid changed from blue to green'
  },
  {
    name: 'hypothesis testing',
    input: 'Was your hypothesis correct? Answer: Yes, the plant grew taller with more light.',
    canaryAnswer: 'Yes, the plant grew taller with more light'
  },
  {
    name: 'chemical reaction',
    input: 'What happens when you mix baking soda and vinegar? Answer: A chemical reaction produces carbon dioxide gas.',
    canaryAnswer: 'A chemical reaction produces carbon dioxide gas'
  }
];

// =============================================================================
// QUA-01: Answer Leakage Prevention - Problem Bullet Tests
// =============================================================================

describe('QUA-01: Answer Leakage Prevention', () => {
  describe('Problem bullet does not contain answer', () => {
    describe('Math content', () => {
      MATH_TEST_CASES.forEach(({ name, input, canaryAnswer }) => {
        it(`does not leak answer in problem bullet for ${name}`, () => {
          const moments = detectTeachableMoments(input);

          expect(moments.length).toBeGreaterThan(0);

          // The problem text should NOT contain the canary answer
          const problem = moments[0].problem;
          expect(problem.text).not.toContain(canaryAnswer);
        });
      });
    });

    describe('Vocabulary content', () => {
      VOCABULARY_TEST_CASES.forEach(({ name, input, canaryAnswer }) => {
        it(`does not leak answer in problem bullet for ${name}`, () => {
          const moments = detectTeachableMoments(input);

          expect(moments.length).toBeGreaterThan(0);

          const problem = moments[0].problem;
          expect(problem.text).not.toContain(canaryAnswer);
        });
      });
    });

    describe('Comprehension content', () => {
      COMPREHENSION_TEST_CASES.forEach(({ name, input, canaryAnswer }) => {
        it(`does not leak answer in problem bullet for ${name}`, () => {
          const moments = detectTeachableMoments(input);

          expect(moments.length).toBeGreaterThan(0);

          const problem = moments[0].problem;
          expect(problem.text).not.toContain(canaryAnswer);
        });
      });
    });

    describe('Science content', () => {
      SCIENCE_TEST_CASES.forEach(({ name, input, canaryAnswer }) => {
        it(`does not leak answer in problem bullet for ${name}`, () => {
          const moments = detectTeachableMoments(input);

          expect(moments.length).toBeGreaterThan(0);

          const problem = moments[0].problem;
          expect(problem.text).not.toContain(canaryAnswer);
        });
      });
    });
  });

  // ===========================================================================
  // QUA-01: Scaffolding Prompt Leakage Tests
  // ===========================================================================

  describe('Scaffolding prompts do not reveal answer', () => {
    describe('Math content', () => {
      MATH_TEST_CASES.forEach(({ name, input, canaryAnswer }) => {
        it(`scaffolding does not reveal ${name} answer`, () => {
          const moments = detectTeachableMoments(input);
          expect(moments.length).toBeGreaterThan(0);

          const rules = getTeachableMomentRules(moments);

          // Scaffolding rules should not contain the unique canary answer
          expect(rules).not.toContain(canaryAnswer);
          // Should contain verbal deliverability constraint
          expect(rules).toContain('under 20 words');
        });
      });
    });

    describe('Vocabulary content', () => {
      VOCABULARY_TEST_CASES.forEach(({ name, input, canaryAnswer }) => {
        it(`scaffolding does not reveal ${name} answer`, () => {
          const moments = detectTeachableMoments(input);
          expect(moments.length).toBeGreaterThan(0);

          const rules = getTeachableMomentRules(moments);

          expect(rules).not.toContain(canaryAnswer);
          expect(rules).toContain('under 20 words');
        });
      });
    });

    describe('Comprehension content', () => {
      COMPREHENSION_TEST_CASES.forEach(({ name, input, canaryAnswer }) => {
        it(`scaffolding does not reveal ${name} answer`, () => {
          const moments = detectTeachableMoments(input);
          expect(moments.length).toBeGreaterThan(0);

          const rules = getTeachableMomentRules(moments);

          expect(rules).not.toContain(canaryAnswer);
          expect(rules).toContain('under 20 words');
        });
      });
    });

    describe('Science content', () => {
      SCIENCE_TEST_CASES.forEach(({ name, input, canaryAnswer }) => {
        it(`scaffolding does not reveal ${name} answer`, () => {
          const moments = detectTeachableMoments(input);
          expect(moments.length).toBeGreaterThan(0);

          const rules = getTeachableMomentRules(moments);

          expect(rules).not.toContain(canaryAnswer);
          expect(rules).toContain('under 20 words');
        });
      });
    });
  });

  // ===========================================================================
  // QUA-01: Answer Detection Verification
  // ===========================================================================

  describe('Answer is correctly detected and stored separately', () => {
    describe('Math content', () => {
      MATH_TEST_CASES.forEach(({ name, input, canaryAnswer }) => {
        it(`correctly detects answer for ${name}`, () => {
          const moments = detectTeachableMoments(input);

          expect(moments.length).toBeGreaterThan(0);
          expect(moments[0].answer).not.toBeNull();
          expect(moments[0].contentCategory).toBe('math');

          // The detected answer should contain the canary
          if (moments[0].answer) {
            expect(moments[0].answer.text).toBe(canaryAnswer);
          }
        });
      });
    });

    describe('Vocabulary content', () => {
      VOCABULARY_TEST_CASES.forEach(({ name, input }) => {
        it(`correctly classifies ${name} as vocabulary`, () => {
          const moments = detectTeachableMoments(input);

          expect(moments.length).toBeGreaterThan(0);
          expect(moments[0].contentCategory).toBe('vocabulary');
        });
      });
    });

    describe('Comprehension content', () => {
      COMPREHENSION_TEST_CASES.forEach(({ name, input }) => {
        it(`correctly classifies ${name} as comprehension`, () => {
          const moments = detectTeachableMoments(input);

          expect(moments.length).toBeGreaterThan(0);
          expect(moments[0].contentCategory).toBe('comprehension');
        });
      });
    });

    describe('Science content', () => {
      SCIENCE_TEST_CASES.forEach(({ name, input }) => {
        it(`correctly classifies ${name} as science`, () => {
          const moments = detectTeachableMoments(input);

          expect(moments.length).toBeGreaterThan(0);
          expect(moments[0].contentCategory).toBe('science');
        });
      });
    });
  });

  // ===========================================================================
  // Edge Case: Multi-Part Content
  // ===========================================================================

  describe('Multi-part content handling', () => {
    it('does not leak answers when multiple Q&A pairs exist', () => {
      // Create enough lines for throttling to allow 3 moments (10 lines * 0.3 = 3)
      const input = `Introduction line.
Another content line.
What is 200+247? Answer: 447
More content here.
What is 500+823? Answer: 1323
Even more content.
What is 800-289? Answer: 511
Padding line.
Another padding line.
Final line.`;

      const moments = detectTeachableMoments(input);

      // Each moment's problem should not contain any answer
      moments.forEach((moment) => {
        // Problem should not contain the answers
        expect(moment.problem.text).not.toContain('447');
        expect(moment.problem.text).not.toContain('1323');
        expect(moment.problem.text).not.toContain('511');

        // Each problem should be isolated to the question portion
        expect(moment.problem.text).toMatch(/What is \d+[+\-]\d+\?/);
      });
    });

    it('scaffolding for multi-category content does not leak any answers', () => {
      // Use unique canary answers that won't be in templates
      const input = `What is 423+424? Answer: 847
What does metamorphosis mean? Answer: It means a complete change in form.
Why did the ice melt? Answer: Because thermal energy was transferred.`;

      const moments = detectTeachableMoments(input);
      const rules = getTeachableMomentRules(moments);

      // None of the unique answers should appear in scaffolding
      expect(rules).not.toContain('847');
      expect(rules).not.toContain('complete change in form');
      expect(rules).not.toContain('thermal energy was transferred');
    });
  });

  // ===========================================================================
  // Determinism Tests
  // ===========================================================================

  describe('Leakage detection is deterministic', () => {
    it('produces consistent results across multiple runs', () => {
      const input = 'What is 500 * 60? Answer: 30000';

      const results1 = detectTeachableMoments(input);
      const results2 = detectTeachableMoments(input);
      const results3 = detectTeachableMoments(input);

      // All runs should produce identical results
      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);

      // And none should leak
      results1.forEach(moment => {
        expect(moment.problem.text).not.toContain('30000');
      });
    });

    it('scaffolding rules are deterministic', () => {
      const input = 'What is 847 + 523? Answer: 1370';
      const moments = detectTeachableMoments(input);

      const rules1 = getTeachableMomentRules(moments);
      const rules2 = getTeachableMomentRules(moments);
      const rules3 = getTeachableMomentRules(moments);

      expect(rules1).toBe(rules2);
      expect(rules2).toBe(rules3);

      // Answer should not be in scaffolding
      expect(rules1).not.toContain('1370');
    });
  });

  // ===========================================================================
  // Template Safety Tests
  // ===========================================================================

  describe('Scaffolding templates are safe', () => {
    it('math scaffolding template does not contain user answers', () => {
      const input = 'What is 999 + 888? Answer: 1887';
      const moments = detectTeachableMoments(input);
      const rules = getTeachableMomentRules(moments);

      // The template contains example numbers like 3, 4, 7 but NOT user answers
      expect(rules).not.toContain('1887');
      expect(rules).not.toContain('999');
      expect(rules).not.toContain('888');
    });

    it('vocabulary scaffolding template does not contain user definitions', () => {
      const input = 'What does equilibrium mean? Answer: It means a state of balance between opposing forces.';
      const moments = detectTeachableMoments(input);
      const rules = getTeachableMomentRules(moments);

      // The unique definition should not appear
      expect(rules).not.toContain('balance between opposing forces');
    });

    it('comprehension scaffolding template does not contain user answers', () => {
      const input = 'Why did the protagonist leave home? Answer: Because she wanted to find adventure.';
      const moments = detectTeachableMoments(input);
      const rules = getTeachableMomentRules(moments);

      expect(rules).not.toContain('wanted to find adventure');
    });

    it('science scaffolding template does not contain user answers', () => {
      const input = 'What causes tsunamis? Answer: Underwater earthquakes or volcanic eruptions.';
      const moments = detectTeachableMoments(input);
      const rules = getTeachableMomentRules(moments);

      expect(rules).not.toContain('Underwater earthquakes');
      expect(rules).not.toContain('volcanic eruptions');
    });
  });
});
