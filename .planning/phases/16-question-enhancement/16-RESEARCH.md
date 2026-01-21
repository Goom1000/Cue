# Phase 16: Question Enhancement - Research

**Researched:** 2026-01-22
**Domain:** AI question generation with expected answers, session-based question tracking
**Confidence:** HIGH

## Summary

Phase 16 enhances the existing quick question feature by adding expected answers visible only to teachers in the teleprompter. The project already has a working three-button difficulty system (Grade C/B/A) that generates questions via AI. This phase extends that by:

1. Modifying the AI prompt to generate both question + expected answer
2. Using Gemini's structured JSON output to return both fields reliably
3. Formatting the answer with bolded key points using markdown
4. Implementing session-based question tracking to avoid repeats
5. Extending to five difficulty levels (A/B/C/D/E) per user requirements

The existing codebase uses Google Gemini API with structured JSON schemas, React hooks for state management, and a custom `MarkdownText` component for bold formatting. All infrastructure needed is already in place.

**Primary recommendation:** Extend the existing `generateQuickQuestion` function in `geminiService.ts` to return a structured object with question + answer fields. Use a `useRef` hook to track asked questions per session without triggering re-renders.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @google/genai | ^1.30.0 | Gemini API client | Already in package.json, supports structured JSON output with schemas |
| React | ^19.2.0 | UI framework | Project standard, hooks-based state management |
| TypeScript | ~5.8.2 | Type safety | Project uses TypeScript throughout |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Type (from @google/genai) | ^1.30.0 | JSON schema type definitions | For structured output responseSchema |
| React hooks | Built-in | State management | useState for UI state, useRef for tracking without re-renders |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Gemini structured output | Claude structured output | Project already uses Gemini as primary, Claude as fallback |
| useRef for tracking | useState for tracking | useState triggers re-renders unnecessarily |
| Session storage | localStorage | Session storage auto-clears on close, matches requirement |

**Installation:**
No new packages needed — all dependencies already installed.

## Architecture Patterns

### Recommended Data Structure
```typescript
// Extend existing QuizQuestion or create new interface
interface QuestionWithAnswer {
  question: string;
  answer: string;  // Markdown with **bold** for key points
  difficulty: 'A' | 'B' | 'C' | 'D' | 'E';
  slideId: string;  // For tracking which slide it's from
}

// Session tracking (in component state)
const askedQuestionsRef = useRef<Set<string>>(new Set());
```

### Pattern 1: Structured Output with Gemini
**What:** Use Gemini's `responseSchema` to guarantee both question and answer fields
**When to use:** Any AI generation that needs reliable structure
**Example:**
```typescript
// Source: Existing pattern from geminiService.ts (lines 159-178)
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: prompt,
  config: {
    systemInstruction,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        answer: { type: Type.STRING, description: "Sample answer with **key points** bolded" }
      },
      required: ['question', 'answer']
    }
  }
});
```

### Pattern 2: Session-Based Tracking with useRef
**What:** Track asked questions without causing re-renders
**When to use:** Data that persists across renders but doesn't affect UI directly
**Example:**
```typescript
// Source: React useRef best practices
const askedQuestionsRef = useRef<Set<string>>(new Set());

const generateQuestion = async (difficulty: string) => {
  // Check if question was already asked this session
  const questionKey = `${currentSlide.id}-${difficulty}`;

  // Generate new question
  const result = await provider.generateQuestionWithAnswer(...);

  // Track it
  askedQuestionsRef.current.add(questionKey);

  // Store in state for display
  setQuickQuestion(result);
};

// Clear tracking on slide change
useEffect(() => {
  askedQuestionsRef.current.clear();
}, [currentIndex]);
```

### Pattern 3: Markdown Bold Rendering
**What:** Use existing MarkdownText component for bold formatting
**When to use:** Displaying text with **bold** markers
**Example:**
```typescript
// Source: components/SlideRenderers.tsx (lines 6-40)
// Already handles **bold** and *bold* patterns
<MarkdownText text={quickQuestion.answer} />
// Converts: "The answer is **photosynthesis** which uses **sunlight**"
// To: "The answer is <strong>photosynthesis</strong> which uses <strong>sunlight</strong>"
```

### Pattern 4: Difficulty Level Mapping (Bloom's Taxonomy)
**What:** Map A-E grades to cognitive complexity levels
**When to use:** Generating questions at appropriate difficulty
**Example:**
```typescript
const DIFFICULTY_DESCRIPTIONS = {
  'A': 'Synthesis/Evaluation: Predict, design, judge, create solutions',
  'B': 'Analysis/Application: Compare, organize, solve, apply concepts',
  'C': 'Understanding: Explain, describe, summarize in own words',
  'D': 'Comprehension: Identify, classify, give examples',
  'E': 'Recall: Define, list, name, state facts'
};
```

### Anti-Patterns to Avoid
- **Tracking in useState:** Causes unnecessary re-renders when adding questions to Set
- **No slide-awareness:** Questions should reference current slide content
- **Ignoring duplicates:** Clicking same button twice should generate NEW question (per CONTEXT.md)
- **Storing questions in localStorage:** Should be session-only per requirements

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown bold parsing | Custom regex parser | Existing `MarkdownText` component | Already handles **bold**, *italic*, and script headers |
| JSON schema validation | Manual string parsing | Gemini `responseSchema` config | Gemini guarantees structure, no parsing errors |
| Question uniqueness | Array filtering | JavaScript `Set` data structure | O(1) lookup vs O(n), automatic deduplication |
| Difficulty mapping | Hardcoded if/else | Lookup object/Map | More maintainable, easier to document |

**Key insight:** The existing codebase already has mature patterns for all core functionality. Extend, don't rebuild.

## Common Pitfalls

### Pitfall 1: Structured Output Not Returning Expected Fields
**What goes wrong:** Gemini returns partial data or malformed JSON despite schema
**Why it happens:** Schema constraints only guide, don't guarantee (especially with older models)
**How to avoid:**
- Use latest Gemini models (gemini-3-flash-preview already in use)
- Include field descriptions in schema to reinforce expectations
- Add try/catch with fallback error messages
**Warning signs:** TypeScript errors on response.question or response.answer being undefined

### Pitfall 2: Re-renders on Every Question Track
**What goes wrong:** Component re-renders every time a question is marked as "asked"
**Why it happens:** Using useState for tracking Set causes re-render on each add
**How to avoid:** Use `useRef` for tracking data that doesn't affect UI rendering
**Warning signs:** Performance lag, console showing multiple renders

### Pitfall 3: Question Tracking Not Clearing Between Slides
**What goes wrong:** User can't regenerate questions on new slide because they're "already asked"
**Why it happens:** Missing useEffect to clear tracking on slide change
**How to avoid:** Clear tracking Set in useEffect with `[currentIndex]` dependency
**Warning signs:** Buttons don't generate new questions on slide navigation

### Pitfall 4: Answer Bold Formatting Not Visible
**What goes wrong:** Bold text renders but doesn't look different from regular text
**Why it happens:** MarkdownText component requires parent color context
**How to avoid:** Ensure answer display area has appropriate text color classes
**Warning signs:** All text looks same weight despite markdown markers

### Pitfall 5: Difficulty Levels Not Aligned with Bloom's Taxonomy
**What goes wrong:** "Grade A" generates easy questions or vice versa
**Why it happens:** Unclear mapping in system instruction
**How to avoid:** Explicitly map each level to Bloom's taxonomy in prompt
**Warning signs:** Teachers report questions don't match expected difficulty

## Code Examples

Verified patterns from official sources and existing codebase:

### Extending generateQuickQuestion to Include Answers
```typescript
// Source: Adapted from geminiService.ts generateQuickQuestion (lines 253-289)
export const generateQuestionWithAnswer = async (
    apiKey: string,
    slideTitle: string,
    slideContent: string[],
    difficulty: 'A' | 'B' | 'C' | 'D' | 'E'
  ): Promise<{ question: string; answer: string }> => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";

      const systemInstruction = `
        You are a teaching assistant for a Year 6 (10-11 year old) class.
        Generate a question AND expected answer based on the current slide.

        DIFFICULTY LEVELS (Bloom's Taxonomy):
        - Grade A: Analysis/Synthesis - "Why does X affect Y?", "What would happen if..."
        - Grade B: Application - "How would you use...", "Explain how..."
        - Grade C: Understanding - "Describe in your own words", "What does X mean?"
        - Grade D: Comprehension - "Give an example of...", "Which one shows..."
        - Grade E: Recall - "What is...", "Name the...", "List the..."

        ANSWER FORMAT:
        - Write a sample answer a good student would give
        - Use **bold** around KEY POINTS the teacher should listen for
        - Length: 1-2 sentences for Grade E/D, 2-3 sentences for C/B/A
        - Example: "The answer is **photosynthesis**, which uses **sunlight** and **water**."
      `;

      const prompt = `Topic: ${slideTitle}\nKey Points: ${slideContent.join('; ')}\n\nGenerate a Grade ${difficulty} question with answer.`;

      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING, description: "Sample answer with **key points** bolded" }
              },
              required: ['question', 'answer']
            }
          }
        });
        return JSON.parse(response.text || '{"question":"Error","answer":"Could not generate"}');
      } catch (e) {
        return { question: "Network error", answer: "Try again" };
      }
};
```

### Session Tracking Pattern
```typescript
// Source: React useRef best practices + existing PresentationView patterns
const PresentationView: React.FC<Props> = ({ ... }) => {
  const [quickQuestion, setQuickQuestion] = useState<{
    question: string;
    answer: string;
    level: string;
  } | null>(null);

  // Track asked questions without re-renders
  const askedQuestionsRef = useRef<Set<string>>(new Set());

  // Clear tracking when slide changes
  useEffect(() => {
    setQuickQuestion(null);
    askedQuestionsRef.current.clear();
  }, [currentIndex]);

  const handleGenerateQuestion = async (difficulty: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (!provider) {
      onRequestAI(`generate a Grade ${difficulty} question`);
      return;
    }

    setIsGeneratingQuestion(true);
    try {
      // Always generate new question (even if same button clicked twice)
      const result = await provider.generateQuestionWithAnswer(
        currentSlide.title,
        currentSlide.content,
        difficulty
      );

      // Track this question to potentially avoid in future (within this slide)
      const questionKey = `${currentSlide.id}-${difficulty}-${result.question.substring(0, 20)}`;
      askedQuestionsRef.current.add(questionKey);

      setQuickQuestion({
        question: result.question,
        answer: result.answer,
        level: `Grade ${difficulty}`
      });
    } catch (err) {
      if (err instanceof AIProviderError) {
        onError('Question Generation Failed', err.userMessage);
      } else {
        onError('Error', 'Could not generate question.');
      }
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // ... rest of component
};
```

### Display Pattern with Answer Section
```typescript
// Source: Adapted from existing quickQuestion display (PresentationView lines 777-790)
{quickQuestion && (
  <div className="mt-3 bg-slate-700 rounded-xl p-3 border border-slate-600 shadow-lg animate-fade-in">
    <div className="flex justify-between items-start mb-2">
      <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
        quickQuestion.level === 'Grade E' ? 'bg-emerald-900 text-emerald-300' :
        quickQuestion.level === 'Grade D' ? 'bg-green-900 text-green-300' :
        quickQuestion.level === 'Grade C' ? 'bg-amber-900 text-amber-300' :
        quickQuestion.level === 'Grade B' ? 'bg-orange-900 text-orange-300' :
        'bg-rose-900 text-rose-300'
      }`}>{quickQuestion.level}</span>
      <button onClick={() => setQuickQuestion(null)} className="text-slate-400 hover:text-white">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    {/* Question */}
    <p className="text-sm font-medium text-white leading-relaxed mb-2">
      Q: "{quickQuestion.question}"
    </p>

    {/* Expected Answer - Teacher Only */}
    <div className="border-t border-slate-600 pt-2 mt-2">
      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
        Expected Answer (Teacher Only)
      </span>
      <p className="text-sm text-slate-300 leading-relaxed">
        <MarkdownText text={quickQuestion.answer} />
      </p>
    </div>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Question only | Question + Answer | Phase 16 (2026-01) | Teachers can prep responses, identify key points |
| 3 difficulty levels | 5 difficulty levels (A-E) | Phase 16 (2026-01) | Matches grade system, finer granularity |
| Manual question writing | AI-generated questions | Existing | Saves teacher prep time |
| No tracking | Session-based tracking | Phase 16 (2026-01) | Avoids immediate repeats |

**Deprecated/outdated:**
- None identified — existing quick question feature is recent

## Open Questions

Things that couldn't be fully resolved:

1. **Should question tracking prevent regeneration?**
   - What we know: CONTEXT.md says "Click same button again to regenerate a new question"
   - What's unclear: Should tracking prevent same question appearing, or just log it?
   - Recommendation: Track but don't block — let AI naturally vary questions, tracking is for analytics

2. **How specific should Bloom's taxonomy mapping be?**
   - What we know: User wants A=hard, E=easy based on cognitive depth
   - What's unclear: Exact verb lists for each level
   - Recommendation: Use simplified 5-tier mapping (provided in code examples) — matches education standard but simplified for 10-11yo

3. **Should answers include student name?**
   - What we know: CONTEXT.md doesn't mention student targeting in Phase 16
   - What's unclear: Integration with Phase 15 student grades
   - Recommendation: Phase 16 is grade-agnostic — Phase 17 adds targeting mode

## Sources

### Primary (HIGH confidence)
- [Structured outputs | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/structured-output) - Gemini JSON schema patterns
- [Google GenAI SDK documentation](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-structured-outputs/) - November 2025 updates
- Existing codebase:
  - `services/geminiService.ts` - Structured output patterns (lines 159-178)
  - `components/PresentationView.tsx` - Question generation handler (lines 346-362)
  - `components/SlideRenderers.tsx` - MarkdownText component (lines 6-40)

### Secondary (MEDIUM confidence)
- [Bloom's Taxonomy Question Stems | Top Hat](https://tophat.com/blog/blooms-taxonomy-question-stems/) - Difficulty mapping
- [Using Bloom's Taxonomy to Write Effective Learning Objectives](https://tips.uark.edu/using-blooms-taxonomy/) - Educational standards
- [React useRef Hook | React.dev](https://react.dev/reference/react/useRef) - Session tracking patterns
- [JavaScript Maps vs Sets | DEV Community (2026)](https://dev.to/cristiansifuentes/javascript-maps-vs-sets-a-scientific-production-minded-guide-2026-58j8) - Set for tracking

### Tertiary (LOW confidence)
- [Prompt Engineering Guide 2026 | Analytics Vidhya](https://www.analyticsvidhya.com/blog/2026/01/master-prompt-engineering/) - General prompt patterns
- [Markdown Guide | Basic Syntax](https://www.markdownguide.org/basic-syntax/) - Bold formatting reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, verified versions
- Architecture: HIGH - Existing patterns in codebase directly applicable
- Pitfalls: MEDIUM - Inferred from React best practices and Gemini docs, not project-specific experience

**Research date:** 2026-01-22
**Valid until:** 2026-02-21 (30 days - stable technology stack)
