/**
 * Provider Parity Tests
 *
 * QUA-03: Validates that both Gemini and Claude providers produce equivalent
 * scaffolded output by verifying structural integration of teachable moment
 * detection and scaffolding features.
 *
 * Test Categories:
 * 1. Source Code Import Tests - Both providers import same modules
 * 2. Integration Pattern Tests - Same detection flow is used
 * 3. Shared Detection Logic Tests - detectTeachableMoments produces identical output
 * 4. Structural Parity Tests - TeachableMoment data structures are equivalent
 * 5. Provider Delegation Tests - Providers delegate to shared functions
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the shared detection and scaffolding functions
import {
  detectTeachableMoments,
  detectPreservableContent,
  classifyContentCategory,
  findAnswerInRange,
  PROXIMITY_THRESHOLD
} from '../contentPreservation/detector';
import { getTeachableMomentRules } from '../prompts/teachableMomentRules';
import { TeachableMoment, ContentCategory } from '../contentPreservation/types';

// =============================================================================
// 1. Source Code Import Tests
// =============================================================================

describe('Provider Source Code Import Parity', () => {
  const claudeProviderPath = path.join(__dirname, 'claudeProvider.ts');
  const geminiServicePath = path.join(__dirname, '../geminiService.ts');
  const geminiProviderPath = path.join(__dirname, 'geminiProvider.ts');

  let claudeProviderSource: string;
  let geminiServiceSource: string;
  let geminiProviderSource: string;

  beforeAll(() => {
    claudeProviderSource = fs.readFileSync(claudeProviderPath, 'utf-8');
    geminiServiceSource = fs.readFileSync(geminiServicePath, 'utf-8');
    geminiProviderSource = fs.readFileSync(geminiProviderPath, 'utf-8');
  });

  describe('detectTeachableMoments import', () => {
    it('Claude provider imports detectTeachableMoments from detector', () => {
      expect(claudeProviderSource).toMatch(/import.*detectTeachableMoments.*from.*contentPreservation\/detector/);
    });

    it('Gemini service imports detectTeachableMoments from detector', () => {
      expect(geminiServiceSource).toMatch(/import.*detectTeachableMoments.*from.*contentPreservation\/detector/);
    });
  });

  describe('getTeachableMomentRules import', () => {
    it('Claude provider imports getTeachableMomentRules from teachableMomentRules', () => {
      expect(claudeProviderSource).toMatch(/import.*getTeachableMomentRules.*from.*prompts\/teachableMomentRules/);
    });

    it('Gemini service imports getTeachableMomentRules from teachableMomentRules', () => {
      expect(geminiServiceSource).toMatch(/import.*getTeachableMomentRules.*from.*prompts\/teachableMomentRules/);
    });
  });

  describe('TeachableMoment type import', () => {
    it('Claude provider imports TeachableMoment type', () => {
      expect(claudeProviderSource).toMatch(/import.*TeachableMoment.*from.*contentPreservation\/types/);
    });

    it('Gemini service imports TeachableMoment type', () => {
      expect(geminiServiceSource).toMatch(/import.*TeachableMoment.*from.*contentPreservation\/types/);
    });
  });

  describe('detectPreservableContent import', () => {
    it('Claude provider imports detectPreservableContent from detector', () => {
      expect(claudeProviderSource).toMatch(/import.*detectPreservableContent.*from.*contentPreservation\/detector/);
    });

    it('Gemini service imports detectPreservableContent from detector', () => {
      expect(geminiServiceSource).toMatch(/import.*detectPreservableContent.*from.*contentPreservation\/detector/);
    });
  });
});

// =============================================================================
// 2. Integration Pattern Tests
// =============================================================================

describe('Provider Integration Pattern Parity', () => {
  const claudeProviderPath = path.join(__dirname, 'claudeProvider.ts');
  const geminiServicePath = path.join(__dirname, '../geminiService.ts');

  let claudeProviderSource: string;
  let geminiServiceSource: string;

  beforeAll(() => {
    claudeProviderSource = fs.readFileSync(claudeProviderPath, 'utf-8');
    geminiServiceSource = fs.readFileSync(geminiServicePath, 'utf-8');
  });

  describe('detectTeachableMoments call pattern', () => {
    it('Claude provider calls detectTeachableMoments with source text', () => {
      // Both providers should call detectTeachableMoments(sourceText) or similar
      expect(claudeProviderSource).toMatch(/detectTeachableMoments\s*\(\s*sourceText\s*\)/);
    });

    it('Gemini service calls detectTeachableMoments with source text', () => {
      expect(geminiServiceSource).toMatch(/detectTeachableMoments\s*\(\s*sourceText\s*\)/);
    });
  });

  describe('getTeachableMomentRules call pattern', () => {
    it('Claude provider calls getTeachableMomentRules with detected moments', () => {
      expect(claudeProviderSource).toMatch(/getTeachableMomentRules\s*\(\s*teachableMoments\s*\)/);
    });

    it('Gemini service calls getTeachableMomentRules with detected moments', () => {
      expect(geminiServiceSource).toMatch(/getTeachableMomentRules\s*\(\s*teachableMoments\s*\)/);
    });
  });

  describe('teachableMomentRules inclusion in system prompt', () => {
    it('Claude provider includes teachableMomentRules in system prompt', () => {
      // Check that the rules are interpolated into the prompt
      expect(claudeProviderSource).toMatch(/\$\{teachableMomentRules\}/);
    });

    it('Gemini service includes teachableMomentRules in system prompt', () => {
      expect(geminiServiceSource).toMatch(/\$\{teachableMomentRules\}/);
    });
  });
});

// =============================================================================
// 3. Shared Detection Logic Tests
// =============================================================================

describe('Shared Detection Logic Produces Identical Output', () => {
  // These tests verify the shared functions produce consistent, deterministic output
  // Since both providers use these same functions, identical output = parity

  describe('detectTeachableMoments determinism', () => {
    const testInputs = [
      'What is 3+4? Answer: 7',
      'Define photosynthesis. It means the process plants use to make food.',
      'Why does the ice melt? Because heat was applied.',
    ];

    testInputs.forEach((input, index) => {
      it(`produces identical output for input ${index + 1} across calls`, () => {
        const result1 = detectTeachableMoments(input);
        const result2 = detectTeachableMoments(input);
        const result3 = detectTeachableMoments(input);

        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);
      });

      it(`maintains consistent structure for input ${index + 1}`, () => {
        const result = detectTeachableMoments(input);

        result.forEach(moment => {
          // Verify structure
          expect(moment).toHaveProperty('problem');
          expect(moment).toHaveProperty('answer');
          expect(moment).toHaveProperty('contentCategory');
          expect(moment).toHaveProperty('confidence');
          expect(moment).toHaveProperty('proximityChars');

          // Verify problem structure
          expect(moment.problem).toHaveProperty('type');
          expect(moment.problem).toHaveProperty('text');
          expect(moment.problem).toHaveProperty('confidence');
          expect(moment.problem).toHaveProperty('startIndex');
          expect(moment.problem).toHaveProperty('endIndex');
        });
      });

      it(`classifies content category consistently for input ${index + 1}`, () => {
        const result1 = detectTeachableMoments(input);
        const result2 = detectTeachableMoments(input);

        result1.forEach((moment, i) => {
          expect(moment.contentCategory).toBe(result2[i].contentCategory);
        });
      });
    });
  });

  describe('getTeachableMomentRules determinism', () => {
    const createMockMoment = (category: ContentCategory): TeachableMoment => ({
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
        startIndex: 15,
        endIndex: 26
      },
      contentCategory: category,
      confidence: 'high',
      proximityChars: 1
    });

    const categories: ContentCategory[] = ['math', 'vocabulary', 'comprehension', 'science', 'general'];

    categories.forEach(category => {
      it(`produces identical rules for ${category} category across calls`, () => {
        const moments = [createMockMoment(category)];

        const rules1 = getTeachableMomentRules(moments);
        const rules2 = getTeachableMomentRules(moments);
        const rules3 = getTeachableMomentRules(moments);

        expect(rules1).toBe(rules2);
        expect(rules2).toBe(rules3);
      });
    });

    it('produces empty string for empty moments array', () => {
      const rules1 = getTeachableMomentRules([]);
      const rules2 = getTeachableMomentRules([]);

      expect(rules1).toBe('');
      expect(rules2).toBe('');
    });
  });
});

// =============================================================================
// 4. Structural Parity Tests
// =============================================================================

describe('TeachableMoment Data Structure Parity', () => {
  describe('TeachableMoment interface validation', () => {
    it('all detected moments have required fields', () => {
      const testCases = [
        'What is 2+2? Answer: 4',
        'Define osmosis. It means the movement of water.',
        'Why did the character leave? Because she was scared.',
      ];

      testCases.forEach(text => {
        const moments = detectTeachableMoments(text);
        moments.forEach(moment => {
          // Core fields
          expect(typeof moment.problem).toBe('object');
          expect(['question']).toContain(moment.problem.type);
          expect(typeof moment.problem.text).toBe('string');
          expect(['high', 'medium', 'low']).toContain(moment.problem.confidence);
          expect(typeof moment.problem.startIndex).toBe('number');
          expect(typeof moment.problem.endIndex).toBe('number');

          // Content classification
          expect(['math', 'vocabulary', 'comprehension', 'science', 'general']).toContain(moment.contentCategory);

          // Moment-level fields
          expect(['high', 'medium', 'low']).toContain(moment.confidence);
          expect(typeof moment.proximityChars).toBe('number');
        });
      });
    });

    it('answer field is null or has correct structure', () => {
      const textWithAnswer = 'What is 5+5? Answer: 10';
      const textWithoutAnswer = 'What is your favorite color?';

      const momentsWithAnswer = detectTeachableMoments(textWithAnswer);
      const momentsWithoutAnswer = detectTeachableMoments(textWithoutAnswer);

      momentsWithAnswer.forEach(moment => {
        if (moment.answer !== null) {
          expect(moment.answer).toHaveProperty('type');
          expect(moment.answer).toHaveProperty('text');
          expect(moment.answer).toHaveProperty('confidence');
          expect(moment.answer).toHaveProperty('startIndex');
          expect(moment.answer).toHaveProperty('endIndex');
        }
      });

      momentsWithoutAnswer.forEach(moment => {
        // Answer can be null if no answer found
        expect(moment.answer === null || typeof moment.answer === 'object').toBe(true);
      });
    });

    it('content categories match classification logic', () => {
      const testCases = [
        { text: 'What is 3*4? Answer: 12', expected: 'math' },
        { text: 'What does osmosis mean? Answer: Water movement', expected: 'vocabulary' },
        { text: 'Why did it happen? Because of heat', expected: 'comprehension' },
      ];

      testCases.forEach(({ text, expected }) => {
        const moments = detectTeachableMoments(text);
        if (moments.length > 0) {
          expect(moments[0].contentCategory).toBe(expected);
        }
      });
    });
  });
});

// =============================================================================
// 5. Provider Delegation Tests
// =============================================================================

describe('Provider Delegation to Shared Functions', () => {
  const claudeProviderPath = path.join(__dirname, 'claudeProvider.ts');
  const geminiServicePath = path.join(__dirname, '../geminiService.ts');

  let claudeProviderSource: string;
  let geminiServiceSource: string;

  beforeAll(() => {
    claudeProviderSource = fs.readFileSync(claudeProviderPath, 'utf-8');
    geminiServiceSource = fs.readFileSync(geminiServicePath, 'utf-8');
  });

  describe('getDetectionSource function parity', () => {
    it('Claude provider has getDetectionSource function', () => {
      expect(claudeProviderSource).toMatch(/function\s+getDetectionSource/);
    });

    it('Gemini service has getDetectionSource function', () => {
      expect(geminiServiceSource).toMatch(/function\s+getDetectionSource/);
    });

    it('both use mode-based source selection', () => {
      // Both should handle fresh, refine, blend modes
      expect(claudeProviderSource).toMatch(/switch\s*\(\s*input\.mode\s*\)/);
      expect(geminiServiceSource).toMatch(/switch\s*\(\s*input\.mode\s*\)/);
    });
  });

  describe('debug logging pattern parity', () => {
    it('Claude provider logs detected teachable moments count', () => {
      expect(claudeProviderSource).toMatch(/console\.log.*\[ClaudeProvider\].*Detected.*teachable moments/);
    });

    it('Gemini service logs detected teachable moments count', () => {
      expect(geminiServiceSource).toMatch(/console\.log.*\[GeminiService\].*Detected.*teachable moments/);
    });
  });

  describe('conditional rules generation parity', () => {
    it('Claude provider conditionally generates teachable moment rules', () => {
      // Both should check teachableMoments.length > 0 before generating rules
      expect(claudeProviderSource).toMatch(/teachableMoments\s*&&\s*teachableMoments\.length\s*>\s*0/);
    });

    it('Gemini service conditionally generates teachable moment rules', () => {
      expect(geminiServiceSource).toMatch(/teachableMoments\s*&&\s*teachableMoments\.length\s*>\s*0/);
    });
  });
});

// =============================================================================
// 6. Edge Case and Error Handling Parity Tests
// =============================================================================

describe('Edge Case Parity: Empty and Minimal Input', () => {
  describe('empty input handling', () => {
    it('handles empty string identically', () => {
      const result1 = detectTeachableMoments('');
      const result2 = detectTeachableMoments('');

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(result1).toEqual(result2);
    });

    it('generates empty rules for empty moments', () => {
      const rules = getTeachableMomentRules([]);
      expect(rules).toBe('');
    });

    it('handles whitespace-only input', () => {
      const whitespaceInputs = ['   ', '\n\n\n', '\t\t', '  \n  \t  '];

      whitespaceInputs.forEach(input => {
        const result = detectTeachableMoments(input);
        expect(result).toEqual([]);
      });
    });
  });

  describe('minimal input handling', () => {
    it('handles single character input', () => {
      const result = detectTeachableMoments('?');
      // Very short question marks should be filtered out
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles minimal valid question', () => {
      const result = detectTeachableMoments('Why?');
      expect(Array.isArray(result)).toBe(true);
    });

    it('handles minimal valid answer pattern', () => {
      const result = detectTeachableMoments('A: 1');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('Edge Case Parity: Special Characters', () => {
  describe('unicode handling', () => {
    it('handles unicode math symbols identically', () => {
      const input = 'What is 5 \u00D7 3? Answer: 15'; // multiplication symbol
      const result1 = detectTeachableMoments(input);
      const result2 = detectTeachableMoments(input);

      expect(result1).toEqual(result2);
    });

    it('handles emoji in text', () => {
      const input = 'What is the answer? Answer: 42';
      const result1 = detectTeachableMoments(input);
      const result2 = detectTeachableMoments(input);

      expect(result1).toEqual(result2);
    });

    it('handles non-ASCII characters', () => {
      const input = 'What is caf\u00E9? Answer: A coffee shop'; // e with accent
      const result1 = detectTeachableMoments(input);
      const result2 = detectTeachableMoments(input);

      expect(result1).toEqual(result2);
    });
  });

  describe('HTML/XML character handling', () => {
    it('handles HTML entities', () => {
      const input = 'What is &lt;html&gt;? Answer: A tag';
      const result1 = detectTeachableMoments(input);
      const result2 = detectTeachableMoments(input);

      expect(result1).toEqual(result2);
    });

    it('handles angle brackets', () => {
      const input = 'What is <div>? Answer: HTML element';
      const result1 = detectTeachableMoments(input);
      const result2 = detectTeachableMoments(input);

      expect(result1).toEqual(result2);
    });

    it('handles quotes and apostrophes', () => {
      const input = "What does 'test' mean? Answer: It means evaluation";
      const result1 = detectTeachableMoments(input);
      const result2 = detectTeachableMoments(input);

      expect(result1).toEqual(result2);
    });
  });
});

describe('Edge Case Parity: Large Input', () => {
  describe('performance consistency', () => {
    it('handles large text input deterministically', () => {
      // Generate large input with many Q&A pairs
      const pairs = [];
      for (let i = 1; i <= 50; i++) {
        pairs.push(`What is ${i}+${i}? Answer: ${i * 2}`);
      }
      const largeInput = pairs.join('\n');

      const result1 = detectTeachableMoments(largeInput);
      const result2 = detectTeachableMoments(largeInput);

      expect(result1).toEqual(result2);
    });

    it('applies throttling consistently on large input', () => {
      // Generate 100 lines with 50 Q&A pairs
      const lines = [];
      for (let i = 1; i <= 100; i++) {
        if (i % 2 === 0) {
          lines.push(`What is ${i}? Answer: ${i}`);
        } else {
          lines.push(`Regular content line ${i}`);
        }
      }
      const largeInput = lines.join('\n');

      const result1 = detectTeachableMoments(largeInput);
      const result2 = detectTeachableMoments(largeInput);

      // Results should be throttled to ~30% and identical
      expect(result1).toEqual(result2);
      expect(result1.length).toBeLessThanOrEqual(30); // 100 * 0.3
    });
  });
});

describe('Edge Case Parity: Mixed Content Categories', () => {
  describe('multi-category detection', () => {
    it('handles mixed math and vocabulary content', () => {
      // Need enough lines to allow 2 moments through throttling (30% threshold)
      // 7 lines * 0.3 = 2.1 = 2 moments allowed
      const input = `Introduction to today's lesson.
What is 2+2? Answer: 4
Regular content line here.
What does osmosis mean? Answer: Water movement
More content for padding.
Additional context provided.
Conclusion of the text.`;

      const result1 = detectTeachableMoments(input);
      const result2 = detectTeachableMoments(input);

      expect(result1).toEqual(result2);
      // Verify different categories are detected
      const categories = result1.map(m => m.contentCategory);
      expect(categories).toContain('math');
      expect(categories).toContain('vocabulary');
    });

    it('handles mixed comprehension and science content', () => {
      const input = `Why did the character leave? Because she was scared.
What happens during photosynthesis? Answer: Plants convert sunlight`;

      const result1 = detectTeachableMoments(input);
      const result2 = detectTeachableMoments(input);

      expect(result1).toEqual(result2);
    });
  });

  describe('category classification consistency', () => {
    it('consistently classifies math across variations', () => {
      const mathInputs = [
        'What is 3+4? Answer: 7',
        'Calculate 10-5. Answer: 5',
        'Solve for x: x = 3. Answer: 3',
        'What is 50%? Answer: Half',
      ];

      mathInputs.forEach(input => {
        const result1 = detectTeachableMoments(input);
        const result2 = detectTeachableMoments(input);

        expect(result1).toEqual(result2);
        if (result1.length > 0) {
          expect(result1[0].contentCategory).toBe('math');
        }
      });
    });

    it('consistently classifies vocabulary across variations', () => {
      const vocabInputs = [
        'What does osmosis mean? Answer: Water movement',
        'Define photosynthesis. It means plant food production',
        'Find a synonym for happy. Answer: Joyful',
      ];

      vocabInputs.forEach(input => {
        const result1 = detectTeachableMoments(input);
        const result2 = detectTeachableMoments(input);

        expect(result1).toEqual(result2);
        if (result1.length > 0) {
          expect(result1[0].contentCategory).toBe('vocabulary');
        }
      });
    });
  });
});
