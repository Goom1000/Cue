# Architecture Research: Content Preservation

**Milestone:** Preserve Teacher Content
**Researched:** 2026-02-01
**Confidence:** HIGH (based on direct codebase analysis)

## Executive Summary

Content preservation for teacher questions/activities requires prompt-layer changes only. The existing architecture already supports this use case - the `GenerationInput` type passes lesson text to providers, and prompts in both `geminiService.ts` and `claudeProvider.ts` control how the AI processes that content. No structural changes are needed.

The solution is straightforward: add explicit preservation instructions to the slide generation prompts, teaching the AI to identify and preserve specific question/activity text verbatim rather than generalizing it.

---

## Current Flow

### Slide Generation Data Flow

```
User uploads PDF
        |
        v
PDF.js extracts text + images
        |
        v
GenerationInput created:
  - lessonText: string
  - lessonImages?: string[]
  - mode: 'fresh' | 'refine' | 'blend'
  - verbosity?: VerbosityLevel
  - gradeLevel?: string
        |
        v
createAIProvider() → GeminiProvider or ClaudeProvider
        |
        v
provider.generateLessonSlides(input)
        |
        v
getSystemInstructionForMode() builds prompt
        |
        v
AI generates slides with title, content[], speakerNotes
        |
        v
Slides displayed to user
```

### Key Files

| File | Role |
|------|------|
| `services/aiProvider.ts` | Provider interface, `GenerationInput` type, factory |
| `services/geminiService.ts` | Gemini implementation, prompt logic |
| `services/providers/geminiProvider.ts` | Wrapper calling geminiService |
| `services/providers/claudeProvider.ts` | Full Claude implementation with prompts |
| `services/prompts/studentFriendlyRules.ts` | Shared student-facing content rules |

### Prompt Architecture

Prompts are built dynamically in `getSystemInstructionForMode()` (geminiService.ts) and `getSystemPromptForMode()` (claudeProvider.ts):

```
System Prompt = [
  Role statement (Elite Primary Education Consultant)
  + studentFriendlyRules (grade-appropriate content)
  + Mode-specific rules (fresh/refine/blend)
  + Teleprompter rules
  + Layout guidance
]
```

The `studentFriendlyRules` from `services/prompts/studentFriendlyRules.ts` are imported and injected. This pattern should be followed for preservation rules.

---

## Integration Points

### 1. Prompt Files (Primary Change Location)

**Location:** `services/prompts/`

**Recommended approach:** Create a new file `services/prompts/contentPreservationRules.ts` following the existing pattern:

```typescript
// services/prompts/contentPreservationRules.ts
export function getContentPreservationRules(): string {
  return `
CONTENT PRESERVATION RULES:
When the lesson plan contains specific questions, exercises, or activities:

1. PRESERVE VERBATIM:
   - Numbered questions (e.g., "1. What is 3/4 + 1/2?")
   - Word problems with specific numbers/names
   - Activity instructions with step-by-step directions
   - Fill-in-the-blank exercises
   - Multiple choice questions

2. DETECTION SIGNALS:
   Look for these patterns in the source text:
   - Numbered or lettered lists (1., 2., a., b.)
   - Question marks following specific content
   - "Activity:", "Exercise:", "Task:", "Challenge:"
   - Mathematical expressions or equations
   - Quoted text or dialogue

3. OUTPUT FORMAT:
   When preserving content:
   - Place in slide content[] array exactly as written
   - Use separate bullet for each question/step
   - Prefix with "[Preserved]" marker if helpful for teacher
   - Do NOT paraphrase, simplify, or generalize

4. WHAT TO STILL TRANSFORM:
   - General lesson explanations (make student-friendly)
   - Teacher instructions (convert to student-facing)
   - Background context (summarize appropriately)
`;
}
```

**Why this location:**
- Follows existing pattern (`studentFriendlyRules.ts`)
- Easy to import into both provider implementations
- Centralized - change once, affects all providers

### 2. Generation Mode Functions (Secondary Change Location)

**Gemini:** `services/geminiService.ts` lines 100-178 (`getSystemInstructionForMode`)

**Claude:** `services/providers/claudeProvider.ts` lines 380-463 (`getSystemPromptForMode`)

Both functions construct prompts per generation mode. The preservation rules should be injected into all three modes (fresh, refine, blend).

**Modification pattern:**
```typescript
import { getContentPreservationRules } from './prompts/contentPreservationRules';

function getSystemInstructionForMode(mode, verbosity, gradeLevel) {
  const preservationRules = getContentPreservationRules();
  const studentFriendlyRules = getStudentFriendlyRules(gradeLevel);
  const teleprompterRules = getTeleprompterRulesForVerbosity(verbosity);

  switch (mode) {
    case 'fresh':
      return `
        You are an elite Primary Education Consultant.
        ...
        ${preservationRules}
        ${studentFriendlyRules}
        ${teleprompterRules}
        ...
      `;
    // Similar for 'refine' and 'blend'
  }
}
```

### 3. No Changes Required

The following components need NO modification:

| Component | Why No Change |
|-----------|---------------|
| `GenerationInput` type | Already passes full lesson text |
| `AIProviderInterface` | Method signatures unchanged |
| PDF extraction | Raw text is already preserved |
| Slide type | `content: string[]` supports any text |
| Response schemas | JSON schema already allows string arrays |

---

## Suggested Approach

### Phase 1: Create Preservation Rules Module

1. Create `services/prompts/contentPreservationRules.ts`
2. Export `getContentPreservationRules()` function
3. Design rules that:
   - Detect preservable content (questions, exercises, activities)
   - Instruct AI to preserve verbatim
   - Allow transformation of explanatory content

### Phase 2: Inject into Gemini Provider

1. Import rules into `services/geminiService.ts`
2. Add to `getSystemInstructionForMode()` for all three modes
3. Test with sample lesson plans containing questions

### Phase 3: Inject into Claude Provider

1. Import rules into `services/providers/claudeProvider.ts`
2. Add to `getSystemPromptForMode()` for all three modes
3. Verify parity with Gemini output

### Phase 4: Validate Preservation Behavior

1. Create test lesson plans with:
   - Math problems with specific numbers
   - Reading comprehension questions
   - Step-by-step activity instructions
2. Verify AI preserves content character-for-character
3. Verify non-question content is still transformed appropriately

---

## Data Flow for Preserved Content

```
Lesson Text (input):
  "Success Criteria:
   1. Calculate 3/4 + 1/2 correctly
   2. Show working using diagrams
   3. Explain the method to a partner"
        |
        v
AI with Preservation Rules:
  - Detects numbered list after "Success Criteria"
  - Marks as preservable content
  - Passes through verbatim
        |
        v
Generated Slide:
  title: "Success Criteria"
  content: [
    "1. Calculate 3/4 + 1/2 correctly",
    "2. Show working using diagrams",
    "3. Explain the method to a partner"
  ]
```

The existing slide structure (`content: string[]`) already supports this. Each preserved item becomes one bullet point.

---

## Testing Strategy

### Unit Testing (Prompt Level)

Create test fixtures:

```typescript
// __tests__/fixtures/preservationTestCases.ts
export const preservationTestCases = [
  {
    name: 'Math problems preserved',
    input: 'Task 1: Calculate 24 x 15\nTask 2: Divide 144 by 12',
    shouldContain: ['24 x 15', '144 by 12'],
    shouldNotContain: ['multiply numbers', 'division problem']
  },
  {
    name: 'Activity steps preserved',
    input: 'Activity: 1. Cut the paper in half 2. Fold along the dotted line',
    shouldContain: ['Cut the paper in half', 'Fold along the dotted line'],
    shouldNotContain: ['prepare materials', 'complete the activity']
  }
];
```

### Integration Testing (Full Flow)

1. Upload PDF with known question content
2. Generate slides
3. Assert specific strings appear in slide content
4. Use substring matching (allows for minor formatting differences)

### Manual Validation

Provide teachers with:
- Sample lesson plan
- Expected output (preserved questions)
- Generated slides
- Ask: "Are your questions exactly as you wrote them?"

---

## Risks and Mitigations

### Risk 1: AI Still Generalizes Despite Instructions

**Symptom:** "Calculate 3/4 + 1/2" becomes "Add fractions together"

**Mitigation:**
- Strengthen prompt language ("NEVER paraphrase questions")
- Add explicit examples of correct vs incorrect preservation
- Consider post-processing validation (detect numbers in input, ensure they appear in output)

### Risk 2: Over-Preservation

**Symptom:** Everything preserved verbatim, even explanatory content

**Mitigation:**
- Clearly distinguish preservable vs transformable content in rules
- Use detection signals (numbered lists, question marks, "Task:" prefixes)
- Allow teachers to mark sections explicitly in future version

### Risk 3: Provider Behavior Divergence

**Symptom:** Gemini preserves correctly, Claude doesn't (or vice versa)

**Mitigation:**
- Test both providers with identical inputs
- Tune prompt language per provider if needed
- Keep rules in shared module for consistency

---

## Build Order Recommendation

Given minimal architecture changes:

| Step | Description | Effort |
|------|-------------|--------|
| 1 | Create `contentPreservationRules.ts` | Small |
| 2 | Update `geminiService.ts` prompts | Small |
| 3 | Update `claudeProvider.ts` prompts | Small |
| 4 | Manual testing with sample PDFs | Medium |
| 5 | Edge case handling (if needed) | Small |

**Total estimated effort:** 1-2 phases of a typical milestone.

The architecture is well-suited for this change. The prompt-based approach means:
- No API changes
- No type changes
- No component refactoring
- Backward compatible (prompts just become more specific)

---

## Sources

All findings from direct codebase analysis:

| File | Lines | Information |
|------|-------|-------------|
| `services/aiProvider.ts` | 1-330 | Provider interface, GenerationInput type |
| `services/geminiService.ts` | 1-1263 | Gemini prompts, getSystemInstructionForMode |
| `services/providers/claudeProvider.ts` | 1-1729 | Claude prompts, getSystemPromptForMode |
| `services/prompts/studentFriendlyRules.ts` | 1-36 | Pattern for prompt modules |
| `types.ts` | 1-600 | Slide type definition |

No external research required - this is a prompt engineering task within existing architecture.
