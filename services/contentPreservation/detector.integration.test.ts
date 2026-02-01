/**
 * Integration tests for QUA-02: Format Diversity Detection
 *
 * Validates that teachable moment detection works across the variety of
 * lesson plan formats teachers actually use. Teachers write lesson plans
 * in many different formats - the detection must work reliably regardless
 * of whether content is numbered, bulleted, prose, or mixed.
 *
 * Test coverage:
 * - 8 distinct teacher formatting styles
 * - Detection, pairing, classification, and ordering for each format
 * - Category classification with 12 samples across 4 categories
 * - Edge cases (emoji, markdown, tabs, long content, no Q&A)
 * - Determinism verification for each format
 * - Throttling behavior across formats
 */

import { detectTeachableMoments, classifyContentCategory } from './detector';
import { ContentCategory } from './types';

// =============================================================================
// Format Matrix - Real Teacher Styles
// =============================================================================

/**
 * Representative lesson plan formats from different teaching styles.
 * Each format represents a real-world pattern teachers use.
 *
 * All formats use supported answer markers:
 * - Answer:, A:, Ans: (explicit markers)
 * - A1:, A2: (numbered answers)
 * - = X, equals X (math results)
 */
const TEACHER_FORMATS: Record<string, string> = {
  'Numbered Q&A (Mrs. Smith style)': `
    Math Practice:
    1. Q: What is 2+2?
       A: 4
    2. Q: What is 3x3?
       A: 9
    3. Q: What is 10-4?
       A: 6
  `,

  'Prose with inline answers (Mr. Jones style)': `
    Today we'll learn about fractions. What is 1/2 of 10? The answer is 5.
    Then we'll practice: What is 1/4 of 20? Answer: 5.
    Finally: What is 3/4 of 8? Answer: 6.
  `,

  'Bullet headers (Ms. Garcia style)': `
    Vocabulary Review:

    Question: What is evaporation?
    Answer: When water turns to gas

    Question: What is condensation?
    Answer: When gas turns to water

    Question: What is precipitation?
    Answer: When water falls from clouds
  `,

  'QA blocks (Dr. Lee style)': `
    Science Quiz:

    Q1: What is photosynthesis?
    A1: Process by which plants make food using sunlight

    Q2: What is chlorophyll?
    A2: Green pigment in plants

    Q3: What is the chemical equation?
    A3: 6CO2 + 6H2O = C6H12O6 + 6O2
  `,

  'Mixed format (Coach Williams style)': `
    Learning Objective: Understand fractions

    Activity: What is 3/4 of 12? Answer: 9

    Discussion Questions:
    - Why do we use fractions? Answer: To represent parts of a whole.
    - How does this relate to division?

    Quick Check:
    Q: What is 1/2 + 1/4?
    A: 3/4
  `,

  'Table-like format (Ms. Chen style)': `
    Vocabulary Match:

    | Term | Definition |
    |------|------------|
    | Evaporation | Water turns to gas |
    | Condensation | Gas turns to water |

    Questions:
    What causes evaporation? Answer: Heat energy
    What causes condensation? Answer: Cooling
  `,

  'Equals sign answers (Prof. Brown style)': `
    Math Practice:

    1. What is 5+5? = 10
    2. What is 12-4? = 8
    3. What is 3x7? = 21
  `,

  'Answer marker variations (Ms. Patel style)': `
    Mixed Quiz:

    Q1: What is 8+2?
    Ans: 10

    What is 15-6? Answer: 9

    Calculate 4x4? A: 16
  `
};

// =============================================================================
// QUA-02: Format Diversity Detection Tests
// =============================================================================

describe('QUA-02: Format Diversity Detection', () => {

  // ===========================================================================
  // Core Detection Tests - Format Matrix
  // ===========================================================================

  describe('Format detection matrix', () => {
    Object.entries(TEACHER_FORMATS).forEach(([styleName, lessonText]) => {
      describe(styleName, () => {
        it('detects at least one teachable moment', () => {
          const moments = detectTeachableMoments(lessonText);
          expect(moments.length).toBeGreaterThanOrEqual(1);
        });

        it('correctly pairs problems with answers', () => {
          const moments = detectTeachableMoments(lessonText);
          const withAnswers = moments.filter(m => m.answer !== null);

          // Most formats should have at least one paired answer
          expect(withAnswers.length).toBeGreaterThanOrEqual(1);
        });

        it('assigns valid content category to each moment', () => {
          const moments = detectTeachableMoments(lessonText);

          const validCategories: ContentCategory[] = [
            'math', 'vocabulary', 'comprehension', 'science', 'general'
          ];

          moments.forEach(m => {
            expect(validCategories).toContain(m.contentCategory);
          });
        });

        it('maintains position ordering', () => {
          const moments = detectTeachableMoments(lessonText);

          // Moments should be sorted by position in text
          for (let i = 1; i < moments.length; i++) {
            expect(moments[i].problem.startIndex)
              .toBeGreaterThan(moments[i - 1].problem.startIndex);
          }
        });
      });
    });
  });

  // ===========================================================================
  // Category Classification Tests
  // ===========================================================================

  describe('Content category classification across formats', () => {
    const MATH_SAMPLES = [
      'What is 2+2? Answer: 4',
      'What is 3*3? A: 9',
      'What is 1/2 of 10? Answer: 5'
    ];

    const VOCABULARY_SAMPLES = [
      'What is evaporation? Answer: It means when water turns to gas',
      'What does osmosis mean? Answer: It means the movement of water',
      'What is photosynthesis? Answer: It is defined as the process plants use'
    ];

    const COMPREHENSION_SAMPLES = [
      'Why did the character leave? Answer: Because she wanted adventure',
      'What caused the conflict? A: Because the two groups disagreed',
      'What is the main theme? Answer: Therefore, perseverance through hardship'
    ];

    const SCIENCE_SAMPLES = [
      'What is photosynthesis? Answer: Process plants use to make food via chemical reaction',
      'What did the experiment show? A: The experiment showed oxidation',
      'What is your hypothesis? Answer: My hypothesis is that plants need light'
    ];

    MATH_SAMPLES.forEach((sample, i) => {
      it(`classifies math sample ${i + 1} correctly`, () => {
        const moments = detectTeachableMoments(sample);
        expect(moments.length).toBeGreaterThan(0);
        expect(moments[0].contentCategory).toBe('math');
      });
    });

    VOCABULARY_SAMPLES.forEach((sample, i) => {
      it(`classifies vocabulary sample ${i + 1} correctly`, () => {
        const moments = detectTeachableMoments(sample);
        expect(moments.length).toBeGreaterThan(0);
        expect(moments[0].contentCategory).toBe('vocabulary');
      });
    });

    COMPREHENSION_SAMPLES.forEach((sample, i) => {
      it(`classifies comprehension sample ${i + 1} correctly`, () => {
        const moments = detectTeachableMoments(sample);
        expect(moments.length).toBeGreaterThan(0);
        expect(moments[0].contentCategory).toBe('comprehension');
      });
    });

    SCIENCE_SAMPLES.forEach((sample, i) => {
      it(`classifies science sample ${i + 1} correctly`, () => {
        const moments = detectTeachableMoments(sample);
        expect(moments.length).toBeGreaterThan(0);
        expect(moments[0].contentCategory).toBe('science');
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Format edge cases', () => {
    it('handles emoji bullets', () => {
      const text = `
        Math Practice:
        What is 5+5? Answer: 10
        What is 6-2? Answer: 4
      `;
      const moments = detectTeachableMoments(text);
      expect(moments.length).toBeGreaterThanOrEqual(1);
    });

    it('handles markdown-style formatting', () => {
      const text = `
        ## Quiz Questions

        **Q:** What is the capital of France?
        **A:** Paris

        **Q:** What is the capital of Germany?
        **A:** Berlin
      `;
      const moments = detectTeachableMoments(text);
      expect(moments.length).toBeGreaterThanOrEqual(1);
    });

    it('handles tab-separated content', () => {
      const text = `
        Question\tAnswer
        What is 2+2?\t4
        What is 3+3?\t6
      `;
      const moments = detectTeachableMoments(text);
      // May or may not detect depending on format - should not crash
      expect(Array.isArray(moments)).toBe(true);
    });

    it('handles very long lesson plans', () => {
      // Generate a lesson plan with many Q&A pairs
      const qaPairs = Array.from({ length: 20 }, (_, i) =>
        `Q${i + 1}: What is ${i}+1? A${i + 1}: ${i + 1}`
      ).join('\n');

      const text = `
        Lengthy Math Review

        ${qaPairs}

        Extra content to ensure padding.
        More content here.
        And some more.
      `;

      const moments = detectTeachableMoments(text);

      // Should apply 30% throttling
      expect(moments.length).toBeLessThanOrEqual(10); // ~30% of ~25 lines
      expect(moments.length).toBeGreaterThan(0);
    });

    it('handles content with no Q&A pairs gracefully', () => {
      const text = `
        Lesson Introduction

        Today we will learn about fractions.
        Fractions represent parts of a whole.
        This is important for everyday math.
      `;

      const moments = detectTeachableMoments(text);
      expect(moments).toEqual([]);
    });
  });

  // ===========================================================================
  // DET-04: Determinism Tests
  // ===========================================================================

  describe('DET-04: Deterministic output across formats', () => {
    Object.entries(TEACHER_FORMATS).forEach(([styleName, lessonText]) => {
      it(`produces consistent results for ${styleName}`, () => {
        const results1 = detectTeachableMoments(lessonText);
        const results2 = detectTeachableMoments(lessonText);
        const results3 = detectTeachableMoments(lessonText);

        expect(results1).toEqual(results2);
        expect(results2).toEqual(results3);
      });
    });
  });

  // ===========================================================================
  // Throttling Behavior Across Formats
  // ===========================================================================

  describe('Throttling consistency across formats', () => {
    it('applies 30% throttling consistently regardless of format', () => {
      // Dense numbered format (1 line per Q&A)
      const numberedFormat = Array.from({ length: 15 }, (_, i) =>
        `${i + 1}. What is ${i}? A: ${i}`
      ).join('\n');

      // Dense prose format (single line, many Q&A)
      const proseFormat = Array.from({ length: 15 }, (_, i) =>
        `What is ${i}? Answer: ${i}.`
      ).join(' ');

      // Dense inline format (1 line per Q&A)
      const inlineFormat = Array.from({ length: 15 }, (_, i) =>
        `What is ${i}+1? Answer: ${i + 1}`
      ).join('\n');

      const numberedMoments = detectTeachableMoments(numberedFormat);
      const proseMoments = detectTeachableMoments(proseFormat);
      const inlineMoments = detectTeachableMoments(inlineFormat);

      // All should be throttled to ~30% of content
      // With 15 lines, expect at most ~5 moments (floor(15*0.3) = 4-5)
      expect(numberedMoments.length).toBeLessThanOrEqual(6);
      expect(proseMoments.length).toBeLessThanOrEqual(6);
      expect(inlineMoments.length).toBeLessThanOrEqual(6);

      // All should have at least some moments detected
      expect(numberedMoments.length).toBeGreaterThan(0);
      expect(proseMoments.length).toBeGreaterThan(0);
      expect(inlineMoments.length).toBeGreaterThan(0);
    });

    it('prioritizes high-confidence detections when throttling', () => {
      // Mix of clear and ambiguous formats
      const mixedConfidence = `
        Introduction paragraph.

        What is 2+2? Answer: 4

        Some ambiguous content here.

        What is 3+3? Answer: 6

        More content.

        Clear Question: What is 4+4?
        Clear Answer: 8

        Final content.
      `;

      const moments = detectTeachableMoments(mixedConfidence);

      // Should have detected some moments
      expect(moments.length).toBeGreaterThan(0);

      // All retained moments should have valid confidence
      moments.forEach(m => {
        expect(['high', 'medium', 'low']).toContain(m.confidence);
      });
    });

    it('verifies 30% throttling scales with content size', () => {
      // Small content: 5 lines * 0.3 = 1 moment max
      const smallContent = Array.from({ length: 5 }, (_, i) =>
        `What is ${i}+1? Answer: ${i + 1}`
      ).join('\n');

      // Medium content: 20 lines * 0.3 = 6 moments max
      const mediumContent = Array.from({ length: 20 }, (_, i) =>
        `What is ${i}+1? Answer: ${i + 1}`
      ).join('\n');

      // Large content: 50 lines * 0.3 = 15 moments max
      const largeContent = Array.from({ length: 50 }, (_, i) =>
        `What is ${i}+1? Answer: ${i + 1}`
      ).join('\n');

      const smallMoments = detectTeachableMoments(smallContent);
      const mediumMoments = detectTeachableMoments(mediumContent);
      const largeMoments = detectTeachableMoments(largeContent);

      // Verify throttling scales appropriately
      expect(smallMoments.length).toBeLessThanOrEqual(2);
      expect(mediumMoments.length).toBeLessThanOrEqual(7);
      expect(largeMoments.length).toBeLessThanOrEqual(16);

      // Verify all have some detections
      expect(smallMoments.length).toBeGreaterThan(0);
      expect(mediumMoments.length).toBeGreaterThan(0);
      expect(largeMoments.length).toBeGreaterThan(0);

      // Verify larger content has more moments (throttling scales)
      expect(largeMoments.length).toBeGreaterThan(smallMoments.length);
    });

    it('preserves all moments when under 30% threshold', () => {
      // 10 lines with only 2 Q&A pairs = 20% < 30%
      const text = `
        Introduction to the lesson.
        Today we learn about math.
        What is 2+2? Answer: 4
        This is regular content.
        More regular content.
        What is 3+3? Answer: 6
        Conclusion paragraph.
        Final summary.
        End of lesson.
        Additional padding.
      `;

      const moments = detectTeachableMoments(text);

      // Both moments should be preserved (2/10 = 20% < 30%)
      expect(moments.length).toBe(2);
    });

    it('throttles by confidence - high confidence preferred', () => {
      // Create content where we can infer confidence ranking
      // High confidence: clear punctuation-based questions
      // All questions here should be high confidence (ending with ?)
      const denseQA = Array.from({ length: 20 }, (_, i) =>
        `What is ${i}+1? Answer: ${i + 1}`
      ).join('\n');

      const moments = detectTeachableMoments(denseQA);

      // Verify throttling occurred
      expect(moments.length).toBeLessThan(20);
      expect(moments.length).toBeGreaterThan(0);

      // All retained should be high confidence (since all source Q&A were high)
      moments.forEach(m => {
        expect(m.confidence).toBe('high');
      });
    });

    it('maintains position ordering after throttling', () => {
      // Dense content that will be throttled
      const denseContent = Array.from({ length: 30 }, (_, i) =>
        `What is ${i}+1? Answer: ${i + 1}`
      ).join('\n');

      const moments = detectTeachableMoments(denseContent);

      // Verify throttling occurred
      expect(moments.length).toBeLessThan(30);

      // Verify ordering is maintained (sorted by position)
      for (let i = 1; i < moments.length; i++) {
        expect(moments[i].problem.startIndex)
          .toBeGreaterThan(moments[i - 1].problem.startIndex);
      }
    });

    it('throttles consistently across repeated calls (deterministic)', () => {
      const denseContent = Array.from({ length: 25 }, (_, i) =>
        `What is ${i}? Answer: ${i}`
      ).join('\n');

      const results1 = detectTeachableMoments(denseContent);
      const results2 = detectTeachableMoments(denseContent);
      const results3 = detectTeachableMoments(denseContent);

      // Verify all calls return identical results
      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);

      // Verify throttling was applied
      expect(results1.length).toBeLessThan(25);
      expect(results1.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Format-Specific Detection Accuracy
  // ===========================================================================

  describe('Format-specific detection accuracy', () => {
    it('detects Q1/A1 numbered pairs correctly', () => {
      const text = `
        Quiz:
        Q1: What is the capital of France?
        A1: Paris
      `;
      const moments = detectTeachableMoments(text);
      expect(moments.length).toBeGreaterThan(0);
      expect(moments[0].answer?.text).toContain('Paris');
    });

    it('detects "Question:/Answer:" format correctly', () => {
      const text = `
        Question: What is water made of?
        Answer: H2O
      `;
      const moments = detectTeachableMoments(text);
      expect(moments.length).toBeGreaterThan(0);
      expect(moments[0].answer?.text).toContain('H2O');
    });

    it('detects inline "Answer:" format correctly', () => {
      const text = 'What is 5+5? Answer: 10';
      const moments = detectTeachableMoments(text);
      expect(moments.length).toBe(1);
      expect(moments[0].answer?.text).toBe('10');
    });

    it('detects "= X" math format correctly', () => {
      const text = 'What is 7+8? = 15';
      const moments = detectTeachableMoments(text);
      expect(moments.length).toBe(1);
      expect(moments[0].answer?.text).toBe('15');
    });

    it('handles mixed Q&A and regular content', () => {
      const text = `
        Welcome to today's lesson.

        Learning objectives:
        - Understand basic math
        - Practice problem solving

        Practice Problem:
        What is 12-5? Answer: 7

        Summary:
        Today we learned about subtraction.
      `;
      const moments = detectTeachableMoments(text);
      expect(moments.length).toBe(1);
      expect(moments[0].answer?.text).toBe('7');
    });
  });

  // ===========================================================================
  // Multi-format Document Tests
  // ===========================================================================

  describe('Multi-format document handling', () => {
    it('detects Q&A pairs when multiple formats are mixed in one document', () => {
      const text = `
        Section 1 - Numbered:
        1. What is 2+2? Answer: 4

        Section 2 - Q/A Block:
        Q: What is 3+3?
        A: 6

        Section 3 - Inline:
        Quick check: What is 4+4? The answer is 8.
      `;
      const moments = detectTeachableMoments(text);
      expect(moments.length).toBeGreaterThanOrEqual(2);
    });

    it('maintains correct ordering when formats are interleaved', () => {
      const text = `
        Start: What is 1+1? Answer: 2
        Middle: Q: What is 2+2? A: 4
        End: What is 3+3? = 6
      `;
      const moments = detectTeachableMoments(text);

      // Verify ordering by position
      for (let i = 1; i < moments.length; i++) {
        expect(moments[i].problem.startIndex)
          .toBeGreaterThan(moments[i - 1].problem.startIndex);
      }
    });
  });
});
