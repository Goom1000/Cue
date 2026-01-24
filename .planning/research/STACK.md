# Technology Stack: Pedagogical Slide Types

**Project:** Cue — Pedagogical slide type additions
**Researched:** 2026-01-25
**Confidence:** HIGH

## Executive Summary

**No new dependencies required.** All four features (Elaborate slides, Work Together slides, Class Challenge slides, and single-slide teleprompter regeneration) can be implemented with the existing stack.

The codebase already has established patterns for:
- AI content generation via provider abstraction (Gemini/Claude)
- Slide insertion via dropdown menu
- Real-time teacher-student sync via BroadcastChannel
- On-demand regeneration (proven in v3.1 verbosity caching)

## Existing Stack (No Changes)

### Core Framework
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| React | 19.2.0 | UI framework | ✓ Current |
| TypeScript | 5.8.2 | Type safety | ✓ Current |
| Vite | 6.2.0 | Build tool | ✓ Current |

### AI Providers
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| @google/genai | 1.30.0 | Gemini API client | ✓ Current |
| Claude API | (via fetch) | Claude Sonnet 4.5 | ✓ Current |

### UI Libraries
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| Tailwind CSS | (via CDN) | Styling | ✓ Current |
| react-rnd | 10.5.2 | Draggable/resizable windows | ✓ Current |

### Communication
| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| BroadcastChannel | (native) | Teacher-student sync | ✓ Current |

## Why No New Dependencies?

### 1. Elaborate Slides (AI-Generated Deeper Content)

**Requirement:** Generate slide with expanded detail on current topic

**Implementation path:**
- Add new method to `AIProviderInterface`: `generateElaborateSlide()`
- Pattern: Identical to existing `generateExemplarSlide()` and `generateContextualSlide()`
- AI prompt engineering only (no new libraries)

**Existing precedent:**
```typescript
// From services/aiProvider.ts (line 189-190)
generateExemplarSlide(lessonTopic: string, prevSlide: Slide): Promise<Slide>;
generateContextualSlide(lessonTopic: string, userInstruction: string,
  prevSlide?: Slide, nextSlide?: Slide): Promise<Slide>;
```

**Stack decision:** Use existing AI provider abstraction
**Rationale:** Elaborate = "explain current slide in more depth" is a prompt variation, not a capability gap

---

### 2. Work Together Slides (AI-Generated Collaborative Activities)

**Requirement:** Generate activity slides for pair/group work

**Implementation path:**
- Add new method to `AIProviderInterface`: `generateWorkTogetherSlide()`
- Pattern: Identical to Elaborate (context-aware generation)
- AI prompt specifies activity format (pair work, group discussion, hands-on)

**Stack decision:** Use existing AI provider abstraction
**Rationale:** Activity generation is prompt engineering, not a new API capability

---

### 3. Class Challenge Slides (Live Teacher Input)

**Requirement:** Teacher types student contributions live during presentation, visible to student view

**Implementation path:**
- Native React controlled inputs (React 19 built-in state management)
- BroadcastChannel sync pattern (already proven for game state)
- No rich text editing needed (plain text bullets sufficient)

**Existing precedent:**
```typescript
// From types.ts (line 199)
| { type: 'GAME_STATE_UPDATE'; payload: GameState }
```

**Why NOT react-contenteditable:**
- Package outdated (v3.3.7 from ~2022-2023, 152k weekly downloads but no recent updates)
- Adds unnecessary complexity for plain text input
- React 19 controlled components are more predictable and performant
- Native `<textarea>` or `<input>` with `onChange` is the React 19 best practice

**Stack decision:** Native React controlled inputs + BroadcastChannel
**Rationale:**
- Plain text bullets don't need contenteditable complexity
- React 19's controlled components handle form state reliably
- BroadcastChannel already syncs complex game state (proven in v3.0)
- Simpler = fewer bugs, better performance

---

### 4. Single Slide Teleprompter Regeneration

**Requirement:** Regenerate teleprompter script for one slide without changing verbosity level

**Implementation path:**
- Call existing `regenerateTeleprompter()` method (added in v3.1)
- Pattern: Identical to verbosity toggle, but reuse current verbosity level
- UI: Add "↻ Regenerate" button next to verbosity selector

**Existing precedent:**
```typescript
// From services/aiProvider.ts (line 208-211)
regenerateTeleprompter(
  slide: Slide,
  verbosity: VerbosityLevel
): Promise<string>;
```

**Stack decision:** Use existing regeneration method
**Rationale:** Already implemented for v3.1 verbosity caching, just expose it to UI

---

## Anti-Recommendations

### What NOT to Add

| Library | Why Avoid |
|---------|-----------|
| react-contenteditable | Outdated (2022-2023), adds complexity for plain text use case |
| Draft.js | 2MB bundle, overkill for bullet point editing |
| Lexical | Facebook's rich text editor - too heavy for simple input |
| Liveblocks | 3rd-party collaboration service - BroadcastChannel already works |
| Supabase Realtime | External dependency - BroadcastChannel is native and free |
| Socket.io | Server required - BroadcastChannel is client-only and instant |

**Principle:** Don't add dependencies when native browser APIs + existing patterns solve the problem.

---

## Integration Points with Existing Stack

### AI Provider Extension Pattern

All new AI methods follow existing interface:

```typescript
// services/aiProvider.ts — ADD these methods to AIProviderInterface
interface AIProviderInterface {
  // ... existing methods ...

  // NEW: Pedagogical slide types
  generateElaborateSlide(
    lessonTopic: string,
    currentSlide: Slide,
    depth: 'detailed' | 'conceptual' | 'example-focused'
  ): Promise<Slide>;

  generateWorkTogetherSlide(
    lessonTopic: string,
    currentSlide: Slide,
    activityType: 'pair-share' | 'group-discussion' | 'hands-on' | 'think-pair-share'
  ): Promise<Slide>;
}
```

**Both Gemini and Claude providers must implement** (via `geminiService.ts` and `claudeProvider.ts`).

---

### Slide Insertion Menu Extension

Current pattern (from App.tsx line 30):

```typescript
const InsertPoint = ({
  onClickBlank,
  onClickExemplar
}: {
  onClickBlank: () => void,
  onClickExemplar: () => void
}) => { /* ... */ }
```

**Extend with new options:**
- "Elaborate" → calls `handleInsertElaborateSlide(index)`
- "Work Together" → calls `handleInsertWorkTogetherSlide(index)`
- "Class Challenge" → inserts blank slide with `type: 'class-challenge'` flag

---

### BroadcastChannel Message Extension

Current pattern (from types.ts line 193-202):

```typescript
type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'GAME_STATE_UPDATE'; payload: GameState }
  // ...
```

**Add for Class Challenge:**
```typescript
| { type: 'CHALLENGE_UPDATE'; payload: { slideId: string; contributions: string[] } }
```

Pattern already proven for game state sync (v3.0).

---

### Slide Type Discriminator (Optional Enhancement)

Current `Slide` interface could add optional type flag:

```typescript
export interface Slide {
  // ... existing fields ...
  slideType?: 'standard' | 'elaborate' | 'work-together' | 'class-challenge';
}
```

**Not required** — just helps UI conditionally render Class Challenge edit mode.

---

## Implementation Confidence

| Feature | Confidence | Rationale |
|---------|------------|-----------|
| Elaborate slides | HIGH | Identical pattern to generateExemplarSlide (shipped in v2.0) |
| Work Together slides | HIGH | Same as Elaborate, different prompt |
| Class Challenge slides | HIGH | BroadcastChannel proven in v3.0 game sync; React 19 controlled inputs are standard |
| Single regeneration | HIGH | Method already exists (v3.1), just needs UI button |

---

## Installation

**No changes required.** Existing dependencies cover all features.

```bash
# Current package.json is sufficient:
# - react: ^19.2.0
# - react-dom: ^19.2.0
# - @google/genai: ^1.30.0
# - react-rnd: ^10.5.2 (unchanged)
```

---

## Validation Sources

### Official Documentation
- **React 19 Forms:** [Native Form Handling in React 19](https://www.yeti.co/blog/native-form-handling-in-react-19) — confirms controlled components with `useState` are best practice for 2026
- **React 19 State:** [Managing State – React](https://react.dev/learn/managing-state) — official guidance on controlled inputs
- **BroadcastChannel API:** [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel_API) — native browser API, no polyfill needed

### Ecosystem Research
- **React + AI Stack 2026:** [The React + AI Stack for 2026](https://www.builder.io/blog/react-ai-stack-2026) — confirms TypeScript + Tailwind + AI API integration is current best practice
- **Controlled Components:** [React Forms Best Practices](https://www.dhiwise.com/blog/design-converter/react-forms-best-practices-for-better-user-experience) — controlled components with `onChange` handlers recommended over contenteditable

### Package Status
- **react-contenteditable:** v3.3.7 last published ~2022-2023, no updates in 3+ years ([npm trends](https://npmtrends.com/react-contenteditable)) — decision: avoid, use native inputs

---

## Decision Summary

**Zero new dependencies.** Extend existing patterns:

1. **Elaborate/Work Together slides:** Add AI provider methods (same pattern as Exemplar)
2. **Class Challenge slides:** React controlled inputs + BroadcastChannel sync (proven in games)
3. **Single regeneration:** Expose existing `regenerateTeleprompter()` to UI

**Architectural principle:** Maximize existing capabilities before adding dependencies.
