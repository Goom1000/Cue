/**
 * Unit tests for the phase detection module.
 *
 * Tests cover:
 * - detectPhasesInText: Identifying all 6 GRR phases from UK/Australian terminology
 * - False positive prevention: Casual English not matching phase labels
 * - assignPhasesToSlides: Explicit detection and positional heuristics
 * - Immutability: Input slides are not mutated
 *
 * Source: Phase 65 Plan 01, v5.0 REQUIREMENTS.md (PHASE-01 through PHASE-07)
 */

import { describe, it, expect } from '@jest/globals';
import { detectPhasesInText, assignPhasesToSlides } from './phaseDetector';
import { Slide } from '../../types';

// =============================================================================
// Helper: Create a minimal Slide for testing
// =============================================================================

function makeSlide(overrides: Partial<Slide> = {}): Slide {
  return {
    id: crypto.randomUUID(),
    title: '',
    content: [],
    speakerNotes: '',
    imagePrompt: '',
    ...overrides,
  };
}

// =============================================================================
// detectPhasesInText
// =============================================================================

describe('detectPhasesInText', () => {
  // Test 1: Empty text
  it('returns empty phases and hasExplicitPhases=false for empty text', () => {
    const result = detectPhasesInText('');
    expect(result.phases).toHaveLength(0);
    expect(result.hasExplicitPhases).toBe(false);
  });

  // Test 2: Hook detection
  it('detects hook phase from "Hook:" at line start with high confidence', () => {
    const text = 'Hook:\nWhat do you already know about fractions?';
    const result = detectPhasesInText(text);

    expect(result.phases.length).toBeGreaterThanOrEqual(1);
    const hookPhase = result.phases.find(p => p.phase === 'hook');
    expect(hookPhase).toBeDefined();
    expect(hookPhase!.confidence).toBe('high');
    expect(result.hasExplicitPhases).toBe(true);
  });

  // Test 3: I Do (Modelled Practice) detection
  it('detects i-do phase from "Modelled Practice:"', () => {
    const text = 'Modelled Practice:\nTeacher demonstrates how to add fractions.';
    const result = detectPhasesInText(text);

    const iDoPhase = result.phases.find(p => p.phase === 'i-do');
    expect(iDoPhase).toBeDefined();
    expect(iDoPhase!.confidence).toBe('high');
  });

  // Test 4: We Do (Guided Practice) detection
  it('detects we-do phase from "Guided Practice:"', () => {
    const text = 'Guided Practice:\nWork through examples as a class.';
    const result = detectPhasesInText(text);

    const weDoPhase = result.phases.find(p => p.phase === 'we-do');
    expect(weDoPhase).toBeDefined();
    expect(weDoPhase!.confidence).toBe('high');
  });

  // Test 5: We Do Together (Partner Work) detection -- must NOT be we-do
  it('detects we-do-together phase from "Partner Work:" (not we-do)', () => {
    const text = 'Partner Work:\nStudents work in pairs to solve problems.';
    const result = detectPhasesInText(text);

    const wdtPhase = result.phases.find(p => p.phase === 'we-do-together');
    expect(wdtPhase).toBeDefined();
    // Should NOT have a we-do detection for this text
    const weDoPhase = result.phases.find(p => p.phase === 'we-do');
    expect(weDoPhase).toBeUndefined();
  });

  // Test 6: You Do (Independent Practice) detection
  it('detects you-do phase from "Independent Practice:"', () => {
    const text = 'Independent Practice:\nComplete the worksheet on your own.';
    const result = detectPhasesInText(text);

    const youDoPhase = result.phases.find(p => p.phase === 'you-do');
    expect(youDoPhase).toBeDefined();
    expect(youDoPhase!.confidence).toBe('high');
  });

  // Test 7: Plenary detection
  it('detects plenary phase from "Plenary:"', () => {
    const text = 'Plenary:\nWhat did we learn today about fractions?';
    const result = detectPhasesInText(text);

    const plenaryPhase = result.phases.find(p => p.phase === 'plenary');
    expect(plenaryPhase).toBeDefined();
    expect(plenaryPhase!.confidence).toBe('high');
  });

  // Test 8: Full lesson plan with multiple phases detects all in order
  it('detects all phases in a full lesson plan with hasExplicitPhases=true', () => {
    const text = `Hook:
What do you know about volcanoes?

I Do:
Teacher explains how volcanoes form.

Guided Practice:
Together, label the diagram of a volcano.

Partner Work:
In pairs, research one type of volcano.

Independent Practice:
Write a paragraph about your volcano type.

Plenary:
Share key facts you discovered.`;

    const result = detectPhasesInText(text);

    expect(result.hasExplicitPhases).toBe(true);
    expect(result.phases.length).toBe(6);

    // Verify order by position
    const phaseNames = result.phases
      .sort((a, b) => a.startPosition - b.startPosition)
      .map(p => p.phase);
    expect(phaseNames).toEqual([
      'hook', 'i-do', 'we-do', 'we-do-together', 'you-do', 'plenary'
    ]);
  });

  // Test 9: False positive prevention -- "I do not recommend"
  it('does NOT match i-do from "I do not recommend"', () => {
    const text = 'I do not recommend using this approach in class.';
    const result = detectPhasesInText(text);

    const iDoPhase = result.phases.find(p => p.phase === 'i-do');
    expect(iDoPhase).toBeUndefined();
  });

  // Test 10: False positive prevention -- "We do this every day"
  it('does NOT match we-do from "We do this every day"', () => {
    const text = 'We do this every day in the morning routine.';
    const result = detectPhasesInText(text);

    const weDoPhase = result.phases.find(p => p.phase === 'we-do');
    expect(weDoPhase).toBeUndefined();
  });

  // Test 11: No GRR terms
  it('returns hasExplicitPhases=false for text with no GRR terminology', () => {
    const text = 'Today we will learn about the water cycle. Water evaporates from the ocean and forms clouds.';
    const result = detectPhasesInText(text);

    expect(result.hasExplicitPhases).toBe(false);
  });

  // Test 12: Australian terms
  it('matches Australian terms: "Tuning In:" -> hook, "Explicit Teaching:" -> i-do', () => {
    const text = `Tuning In:
Show a picture and ask what students notice.

Explicit Teaching:
Demonstrate the concept step by step.`;

    const result = detectPhasesInText(text);

    const hookPhase = result.phases.find(p => p.phase === 'hook');
    expect(hookPhase).toBeDefined();

    const iDoPhase = result.phases.find(p => p.phase === 'i-do');
    expect(iDoPhase).toBeDefined();
  });
});

// =============================================================================
// assignPhasesToSlides
// =============================================================================

describe('assignPhasesToSlides', () => {
  // Test 13: Explicit phases with 6+ slides assigns detected phases
  it('assigns detected phases to slides when hasExplicitPhases is true and 6+ slides', () => {
    const slides = Array.from({ length: 6 }, (_, i) =>
      makeSlide({ title: `Slide ${i + 1}` })
    );

    const text = `Hook:
Introduction

I Do:
Teacher models

Guided Practice:
Class works together

Partner Work:
Pairs collaborate

Independent Practice:
Students work alone

Plenary:
Wrap up`;

    const detectedPhases = detectPhasesInText(text);
    const result = assignPhasesToSlides(slides, detectedPhases);

    // All 6 slides should have a phase assigned
    expect(result.filter(s => s.lessonPhase !== undefined)).toHaveLength(6);
    // First slide should be hook, last should be plenary
    expect(result[0].lessonPhase).toBe('hook');
    expect(result[result.length - 1].lessonPhase).toBe('plenary');
  });

  // Test 14: Positional heuristics when hasExplicitPhases is false and 5+ slides
  it('applies positional heuristics when hasExplicitPhases=false and 5+ slides', () => {
    const slides = Array.from({ length: 6 }, (_, i) =>
      makeSlide({ title: `Slide ${i + 1}` })
    );
    const noPhases = { phases: [], hasExplicitPhases: false };
    const result = assignPhasesToSlides(slides, noPhases);

    // First slide = hook
    expect(result[0].lessonPhase).toBe('hook');
    // Second slide = i-do
    expect(result[1].lessonPhase).toBe('i-do');
    // Last slide = plenary
    expect(result[result.length - 1].lessonPhase).toBe('plenary');
  });

  // Test 15: No phase assignment when <5 slides and no explicit phases
  it('returns slides with undefined lessonPhase when hasExplicitPhases=false and <5 slides', () => {
    const slides = Array.from({ length: 3 }, (_, i) =>
      makeSlide({ title: `Slide ${i + 1}` })
    );
    const noPhases = { phases: [], hasExplicitPhases: false };
    const result = assignPhasesToSlides(slides, noPhases);

    result.forEach(slide => {
      expect(slide.lessonPhase).toBeUndefined();
    });
  });

  // Test 16: Does not overwrite existing lessonPhase
  it('does not overwrite slides that already have lessonPhase set', () => {
    const slides = Array.from({ length: 6 }, (_, i) =>
      makeSlide({ title: `Slide ${i + 1}` })
    );
    // Pre-set the first slide's phase
    slides[0].lessonPhase = 'plenary';

    const noPhases = { phases: [], hasExplicitPhases: false };
    const result = assignPhasesToSlides(slides, noPhases);

    // First slide should keep 'plenary' (not overwritten to 'hook')
    expect(result[0].lessonPhase).toBe('plenary');
  });

  // Test 17: Returns new objects (immutability)
  it('returns new slide objects without mutating input', () => {
    const slides = Array.from({ length: 6 }, (_, i) =>
      makeSlide({ title: `Slide ${i + 1}` })
    );
    const noPhases = { phases: [], hasExplicitPhases: false };
    const result = assignPhasesToSlides(slides, noPhases);

    // Should be different object references
    result.forEach((resultSlide, i) => {
      expect(resultSlide).not.toBe(slides[i]);
    });

    // Original slides should not have lessonPhase set
    slides.forEach(slide => {
      expect(slide.lessonPhase).toBeUndefined();
    });
  });
});
