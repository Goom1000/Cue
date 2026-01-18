# Coding Conventions

**Analysis Date:** 2026-01-18

## Naming Patterns

**Files:**
- Components: PascalCase (`Button.tsx`, `SlideCard.tsx`, `PresentationView.tsx`)
- Services: camelCase with `Service` suffix (`geminiService.ts`, `pptxService.ts`)
- Types: camelCase singular (`types.ts`)
- Entry point: lowercase (`index.tsx`)

**Functions:**
- Event handlers: `handle` prefix (`handleGenerate`, `handleFileChange`, `handleUpdateSlide`)
- Async operations: verb describing action (`generateLessonSlides`, `reviseSlide`)
- React hooks: `use` prefix (standard React convention)
- Boolean generators: descriptive names (`isGenerating`, `isRevising`, `isDarkMode`)

**Variables:**
- State variables: camelCase descriptive (`lessonText`, `activeSlideIndex`, `pageImages`)
- Boolean flags: `is`/`has` prefix (`isGenerating`, `isProcessingFile`, `hasQuestionFlag`)
- Refs: camelCase with `Ref` suffix (`fileInputRef`, `contentRef`)

**Types/Interfaces:**
- Interfaces: PascalCase with descriptive name (`Slide`, `LessonResource`, `ButtonProps`)
- Props interfaces: ComponentName + `Props` (`SlideCardProps`, `ResourceHubProps`)
- Enums: PascalCase with SCREAMING_SNAKE values (`AppState.INPUT`, `AppState.EDITING`)

## Code Style

**Formatting:**
- No explicit formatter config detected (likely using editor defaults)
- 2-space indentation observed
- Single quotes for strings in imports
- Double quotes for JSX attributes

**Linting:**
- No ESLint/Prettier config files present
- TypeScript strict mode not explicitly enabled
- `any` type used in several places (window declarations, API responses)

## Import Organization

**Order:**
1. React and React-related imports (`import React, { useState, useCallback }`)
2. Third-party libraries (`import { GoogleGenAI, Type }`)
3. Local types (`import { Slide, LessonResource }`)
4. Local services (`import { generateLessonSlides }`)
5. Local components (`import Button`, `import SlideCard`)

**Path Aliases:**
- `@/*` alias configured in `tsconfig.json` mapping to root
- Currently unused in actual imports (relative paths used instead)

## Error Handling

**Patterns:**
- Try-catch blocks wrap async API calls
- Error state stored in React state (`const [error, setError] = useState<string | null>(null)`)
- Console.error for logging (`console.error("Gemini Generation Error:", error)`)
- User-facing errors shown via conditional rendering with styled error messages

**Example from `App.tsx`:**
```typescript
try {
  const generatedSlides = await generateLessonSlides(lessonText, pageImages);
  // success handling
} catch (err: any) {
  setError(err.message);
  setAppState(AppState.INPUT);
} finally {
  setIsGenerating(false);
}
```

**API Error Handling in `geminiService.ts`:**
```typescript
} catch (error: any) {
  console.error("Gemini Generation Error:", error);
  throw new Error("The AI Architect encountered an error. Check your connection.");
}
```

## Logging

**Framework:** Console (no external logging library)

**Patterns:**
- `console.error()` for caught errors
- `console.warn()` for non-critical issues (e.g., style copy failures)
- No structured logging or log levels beyond console methods

## Comments

**When to Comment:**
- Section dividers using `// --- SECTION NAME ---` pattern
- Brief explanations for complex logic
- JSDoc not used

**Observed patterns:**
```typescript
// --- Student Window Portal Helper ---
// --- QUIZ GAME MODAL COMPONENT ---
// --- LAYOUTS ---
```

## Function Design

**Size:**
- Functions range from small utility (10-20 lines) to large component functions (100+ lines)
- Main `App.tsx` component is ~580 lines (includes multiple sub-components)

**Parameters:**
- Object destructuring for props: `({ slide, visibleBullets }: { slide: Slide, visibleBullets: number })`
- Default parameters used: `pageImages: string[] = []`

**Return Values:**
- Components return JSX
- Service functions return Promises with typed responses
- Fallback returns: `return undefined` for failed image generation

## Module Design

**Exports:**
- Named exports for services: `export const generateLessonSlides`
- Default exports for components: `export default Button`
- Mixed in `SlideRenderers.tsx`: named exports for layouts, default for main renderer

**Barrel Files:**
- Not used (direct imports from each file)

## Component Patterns

**Functional Components:**
- All components are functional using React hooks
- Props interfaces defined inline or separately

**State Management:**
- Local state via `useState` hooks
- No global state management library (Redux, Zustand, etc.)
- State lifted to App.tsx and passed down as props

**Callbacks:**
- `useCallback` for memoized event handlers passed to children
- `useMemo` for expensive computations (e.g., `studentAssignments`)

**Example pattern from `App.tsx`:**
```typescript
const handleUpdateSlide = useCallback((id: string, updates: Partial<Slide>) => {
  setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
}, []);
```

## Styling Conventions

**CSS Framework:** Tailwind CSS (loaded via CDN)

**Patterns:**
- Utility classes directly in JSX
- Dark mode via `dark:` prefix classes
- Template literals for dynamic classes
- Class concatenation with template strings

**Example:**
```typescript
className={`${baseStyles} ${variants[variant]} ${className}`}
```

**Theme Colors:**
- Light mode: Indigo primary (`indigo-600`, `indigo-500`)
- Dark mode: Amber primary (`amber-500`, `amber-400`)
- Neutral: Slate scale (`slate-50` through `slate-950`)

## TypeScript Usage

**Type Safety:**
- Interfaces for data structures (`Slide`, `LessonResource`)
- Props types for components
- `any` used for external library types (`window.PptxGenJS: any`, `pdfjsLib: any`)

**Type Assertions:**
- Used sparingly: `as any`, `err: any`

**Generics:**
- React.FC used for component typing
- Standard React hook generics: `useState<Slide[]>([])`

---

*Convention analysis: 2026-01-18*
