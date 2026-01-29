# Phase 42: Student-Friendly Slide Generation - Research

**Researched:** 2026-01-29
**Domain:** AI prompt engineering for age-appropriate educational content
**Confidence:** HIGH

## Summary

This phase transforms how AI generates slide content - from teacher-facing notes to student-directed content. The research confirms that age-appropriate content adaptation requires explicit audience specification in AI prompts, with the target age group being a "determinant role in the appropriateness of the language, the choice of examples, and the depth of the generated content."

The implementation approach is straightforward: modify existing slide generation prompts to include student-facing tone instructions and grade level context. The existing codebase already has the necessary infrastructure (ChatContext.gradeLevel, VerbosityLevel patterns) that can be leveraged. No new dependencies are required.

**Primary recommendation:** Add a student-friendly content generation layer to the existing prompt system, passing gradeLevel into all slide generation functions and adding tone/style instructions to system prompts.

## Standard Stack

The existing stack is sufficient for this phase. No new libraries required.

### Core (No Changes)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @google/genai | ^1.30.0 | Gemini API for slide generation | Already integrated |
| Claude API | claude-sonnet-4 | Alternative AI provider | Already integrated |

### Supporting (No Changes)
No supporting libraries needed. This is purely a prompt engineering phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prompt-based adaptation | Readability APIs (Flesch-Kincaid) | Overkill - AI can calibrate without external APIs |
| Hardcoded grade text | LLM-determined complexity | User decision: explicit grade level already in Cue |

**Installation:**
```bash
# No installation needed - uses existing dependencies
```

## Architecture Patterns

### Recommended Approach: Prompt Injection Pattern

The existing codebase uses a **system instruction pattern** where prompts are constructed dynamically based on mode and verbosity. This phase adds a new dimension: **audience adaptation**.

```
Existing Pattern:
  Mode (fresh/refine/blend) + Verbosity (concise/standard/detailed)
         ↓
  System Instruction Builder
         ↓
  AI Generation

New Pattern:
  Mode + Verbosity + GradeLevel + StudentFriendlyStyle
         ↓
  System Instruction Builder (enhanced)
         ↓
  AI Generation with student-facing content
```

### Pattern 1: Grade Level Context Injection

**What:** Pass grade level string into all slide generation functions via GenerationInput

**When to use:** Every slide generation call

**Current state (geminiService.ts):**
```typescript
export interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  presentationText?: string;
  presentationImages?: string[];
  mode: GenerationMode;
  verbosity?: VerbosityLevel;
}
```

**Extended pattern:**
```typescript
export interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  presentationText?: string;
  presentationImages?: string[];
  mode: GenerationMode;
  verbosity?: VerbosityLevel;
  gradeLevel?: string;  // NEW: e.g., "Year 6 (10-11 years old)" or "GCSE (14-16 years old)"
}
```

### Pattern 2: Student-Friendly Prompt Layer

**What:** Add student-facing content instructions to system prompts

**When to use:** All slide content generation (fresh, refine, blend modes)

**Example prompt injection:**
```typescript
const STUDENT_FACING_CONTENT_RULES = `
SLIDE CONTENT STYLE - STUDENT-FACING:
Write bullet points as conversational sentences directed at students, not teacher notes.

TONE:
- Clear instructor tone: direct but approachable ("This is...", "Remember that...")
- Mix direct address ("you") with neutral phrasing - not always "you"
- Consistent warmth throughout - not too casual, not too dry
- No slang or jokes, but keep some approachability

VOCABULARY ADAPTATION for ${gradeLevel}:
- Use term + explanation pattern: "Photosynthesis - how plants make food"
- Adjust vocabulary complexity to match grade level
- Sentence structure stays similar across ages, vocabulary changes

CONTENT STRUCTURE:
- Bullet points should be complete sentences, not fragments
- Questions to students: rarely, only when content naturally calls for it
- Include calls-to-action when they enhance learning

TRANSFORMATION RULES:
- Teacher instructions ("Explain photosynthesis") → transform to student-facing content
- Third-person ("students will learn...") → reframe based on context
- Teacher references → rephrase when appropriate, keep when natural
`;
```

### Pattern 3: Grade Level Mapping

**What:** Map Cue's grade level strings to UK Key Stages for prompt context

**Reference: UK Key Stages**
| Key Stage | Year Groups | Ages | Vocabulary Target |
|-----------|-------------|------|-------------------|
| KS1 | Years 1-2 | 5-7 | Simple, short sentences, everyday words |
| KS2 | Years 3-6 | 7-11 | Growing vocabulary, some subject terms with explanations |
| KS3 | Years 7-9 | 11-14 | Subject terminology, compound sentences |
| KS4/GCSE | Years 10-11 | 14-16 | Technical vocabulary, assume foundational knowledge |
| KS5/A-Level | Years 12-13 | 16-18 | Academic vocabulary, assume prior subject knowledge |

**Implementation:**
```typescript
function getGradeLevelContext(gradeLevel: string): string {
  // Parse grade level and return appropriate prompt context
  // This can be a simple string for the AI to interpret
  // No complex mapping needed - AI handles nuance
  return `Students are ${gradeLevel}. Adapt vocabulary complexity appropriately.`;
}
```

### Anti-Patterns to Avoid

- **Over-engineering the mapping:** Don't create complex lookup tables for vocabulary. The AI can handle "Year 6 (10-11 years old)" directly.
- **Duplicating prompts:** Don't copy-paste prompt rules into both Gemini and Claude providers. Extract to shared constants.
- **Breaking existing patterns:** Don't restructure the entire prompt system. Inject the new rules into the existing pattern.
- **Readability scoring:** Don't add Flesch-Kincaid or other readability APIs. The AI calibrates without them.

## Don't Hand-Roll

Problems that look simple but should use existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grade level detection | Auto-detect from content | Existing gradeLevel setting in LessonPlan | User already sets this |
| Vocabulary simplification | Word replacement dictionary | AI prompt instructions | AI handles nuance better |
| Readability scoring | Flesch-Kincaid implementation | AI judgment | Not needed, adds complexity |
| Content transformation | Rule-based rewriting | AI prompt layer | AI handles teacher→student transformation |

**Key insight:** The AI is already capable of age-appropriate content generation. The missing piece is telling it to do so via prompts.

## Common Pitfalls

### Pitfall 1: Prompt Instruction Overload

**What goes wrong:** Adding too many detailed rules causes the AI to ignore some or produce inconsistent results.

**Why it happens:** Trying to specify every edge case in the prompt.

**How to avoid:**
- Keep prompt additions focused on the core requirement
- Let "Claude's Discretion" items (from CONTEXT.md) remain unspecified
- Test with real content and iterate

**Warning signs:** AI output varies wildly between generations, or ignores some rules.

### Pitfall 2: Breaking Teleprompter Format

**What goes wrong:** Student-friendly content rules interfere with the existing teleprompter segment format.

**Why it happens:** The slide content and teleprompter have different audiences.

**How to avoid:**
- Student-friendly rules apply to `content[]` array only
- Teleprompter (`speakerNotes`) remains teacher-facing
- Be explicit in prompts about which output field each rule applies to

**Warning signs:** Teleprompter scripts become student-facing, or lose the segment format.

### Pitfall 3: Inconsistent Provider Behavior

**What goes wrong:** Gemini and Claude produce different content styles.

**Why it happens:** Prompts are duplicated in two providers with slight differences.

**How to avoid:**
- Extract student-friendly prompt rules to shared constant
- Import in both geminiService.ts and claudeProvider.ts
- Test both providers with same input

**Warning signs:** Output quality differs between providers.

### Pitfall 4: Regression in Content Quality

**What goes wrong:** Adding student-friendly rules breaks other aspects of slide generation.

**Why it happens:** New prompt instructions conflict with existing ones.

**How to avoid:**
- Add new rules as additions, not replacements
- Test all generation modes (fresh, refine, blend)
- Compare output before/after changes

**Warning signs:** Slides missing expected elements (Success Criteria, Differentiation, etc.)

### Pitfall 5: Grade Level Not Passed Through

**What goes wrong:** Grade level is available in the app but not reaching generation functions.

**Why it happens:** GenerationInput extended but callers not updated.

**How to avoid:**
- Trace the call path from App.tsx → generateLessonSlides
- Ensure gradeLevel flows through all intermediate functions
- Add default fallback ("Year 6") for backward compatibility

**Warning signs:** Generated content ignores grade level setting.

## Code Examples

### Example 1: Extended GenerationInput

```typescript
// services/aiProvider.ts
export interface GenerationInput {
  lessonText: string;
  lessonImages?: string[];
  presentationText?: string;
  presentationImages?: string[];
  mode: GenerationMode;
  verbosity?: VerbosityLevel;
  gradeLevel?: string;  // NEW
}
```

### Example 2: Student-Friendly Prompt Rules (Shared)

```typescript
// services/prompts/studentFriendlyRules.ts
export function getStudentFriendlyRules(gradeLevel: string = 'Year 6'): string {
  return `
SLIDE CONTENT STYLE - STUDENT-FACING:
Write bullet points as conversational sentences directed at students.
Target audience: ${gradeLevel} students.

TONE:
- Clear instructor tone - direct but approachable ("This is...", "Remember that...")
- Address students with "you" sometimes, mix with neutral phrasing
- Balanced voice - not too casual (no slang), not too dry (keep warmth)
- Consistent tone throughout all slides

VOCABULARY:
- Adapt complexity to ${gradeLevel} level
- For technical terms: use term + explanation pattern ("Photosynthesis - how plants make food")
- Sentence structure stays similar across ages, vocabulary complexity changes

CONTENT FORMAT:
- Bullet points must be complete sentences, not fragments
- Questions to students: rarely, only when content naturally calls for reflection
- Include calls-to-action when they enhance understanding

TRANSFORMATION:
- Teacher instructions ("Explain X") → transform to student-facing explanation of X
- Third-person ("students will learn...") → rephrase based on context
- Teacher references in content → Claude decides: keep when natural, rephrase when awkward

NOTE: These rules apply to the 'content' array (bullet points visible to students).
Speaker notes remain teacher-facing for teleprompter use.
`;
}
```

### Example 3: Integration in System Prompt

```typescript
// services/geminiService.ts
function getSystemInstructionForMode(
  mode: GenerationMode,
  verbosity: VerbosityLevel = 'standard',
  gradeLevel: string = 'Year 6'  // NEW parameter
): string {
  const teleprompterRules = getTeleprompterRulesForVerbosity(verbosity);
  const studentFriendlyRules = getStudentFriendlyRules(gradeLevel);  // NEW

  switch (mode) {
    case 'fresh':
      return `
You are an elite Primary Education Consultant.
Your goal is to transform a formal lesson plan into a teaching slideshow.

${studentFriendlyRules}

CRITICAL: You will be provided with both text AND visual images of the document.
// ... rest of existing prompt ...

${teleprompterRules}

LAYOUTS: Use 'split' for content with images...
`;
    // ... other modes
  }
}
```

### Example 4: Default Grade Level Handling

```typescript
// App.tsx - where generation is triggered
const handleGenerateSlides = async () => {
  const input: GenerationInput = {
    lessonText: lessonText,
    lessonImages: pageImages,
    mode: generationMode,
    verbosity: deckVerbosity,
    gradeLevel: gradeLevel || 'Year 6 (10-11 years old)',  // Default fallback
  };

  const slides = await aiProvider.generateLessonSlides(input);
  // ...
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded "Year 6" | Dynamic grade level | This phase | Content adapts to all UK Key Stages |
| Teacher-facing bullets | Student-facing bullets | This phase | Slides speak directly to students |
| No audience context | Explicit audience in prompts | This phase | Better AI output calibration |

**Current codebase patterns (2026-01):**
- Grade level exists in LessonPlan type but not passed to generation
- ChatContext has gradeLevel but only used in Ask AI feature
- System prompts mention "Year 6" directly in about 20 places
- Both Gemini and Claude providers have duplicated prompt strings

## Open Questions

Questions that couldn't be fully resolved:

1. **Grade Level UI Source**
   - What we know: LessonPlan.gradeLevel exists in types.ts
   - What's unclear: Where is this set in the UI? Is there a grade level selector?
   - Recommendation: During planning, verify the call path from UI → generation

2. **Edge Cases for Very Young Students (KS1)**
   - What we know: CONTEXT.md says "Claude decides on sentence length for younger students"
   - What's unclear: Should there be explicit length limits or leave it to AI?
   - Recommendation: Test with KS1 content, iterate on prompts if needed

3. **Slide Types Beyond Standard**
   - What we know: Elaborate, Work Together, Class Challenge slides also generate content
   - What's unclear: Do they need the same student-friendly treatment?
   - Recommendation: Yes - apply to all slide types for consistency

## Sources

### Primary (HIGH confidence)
- Cue codebase analysis (geminiService.ts, claudeProvider.ts, types.ts)
- Phase 42 CONTEXT.md - locked decisions from user discussion

### Secondary (MEDIUM confidence)
- [UK Key Stages Education Levels](https://edumentors.co.uk/blog/school-years-and-key-stages-in-the-uk/) - Age/grade mapping
- [AI Prompt Engineering for Education](https://www.mdpi.com/2227-7102/15/12/1640) - PARTS framework
- [K-12 AI Prompts](https://www.panoramaed.com/blog/ai-prompts-for-k-12-education) - Grade level specification patterns
- [Flesch-Kincaid Readability](https://readable.com/readability/flesch-reading-ease-flesch-kincaid-grade-level/) - Readability benchmarks

### Tertiary (LOW confidence)
- None - all findings verified with codebase or authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, verified existing code
- Architecture: HIGH - Extends existing patterns, clear integration points
- Pitfalls: HIGH - Based on codebase analysis and prompt engineering research

**Research date:** 2026-01-29
**Valid until:** 2026-03-29 (60 days - stable prompt engineering domain)
