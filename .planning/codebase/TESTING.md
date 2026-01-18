# Testing Patterns

**Analysis Date:** 2026-01-18

## Test Framework

**Runner:**
- Not configured
- No Jest, Vitest, or other test runner detected

**Assertion Library:**
- Not configured

**Run Commands:**
```bash
# No test scripts defined in package.json
# Only available scripts:
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Test File Organization

**Location:**
- No test files exist in the codebase

**Naming:**
- Not established (recommend: `*.test.tsx` or `*.spec.tsx`)

**Structure:**
```
# Current (no tests)
/components/
  Button.tsx
  SlideCard.tsx

# Recommended structure
/components/
  Button.tsx
  Button.test.tsx
  SlideCard.tsx
  SlideCard.test.tsx
```

## Test Structure

**Suite Organization:**
- Not established

**Recommended pattern for this codebase:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant styles', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-500');
  });
});
```

## Mocking

**Framework:**
- Not established

**Recommended patterns for this codebase:**

**Mock Gemini Service:**
```typescript
// __mocks__/services/geminiService.ts
export const generateLessonSlides = jest.fn().mockResolvedValue([
  {
    id: 'slide-1',
    title: 'Test Slide',
    content: ['Point 1', 'Point 2'],
    speakerNotes: 'INTRO: Test intro 👉 Point 1 notes 👉 Point 2 notes',
    imagePrompt: 'Test prompt',
    layout: 'split'
  }
]);

export const generateSlideImage = jest.fn().mockResolvedValue('data:image/png;base64,test');
```

**Mock Environment Variables:**
```typescript
beforeEach(() => {
  process.env.API_KEY = 'test-api-key';
});
```

**What to Mock:**
- External API calls (`@google/genai`)
- Browser APIs (`window.PptxGenJS`, `pdfjsLib`)
- File system operations (PDF processing)

**What NOT to Mock:**
- React state management
- Component interactions
- Tailwind class application

## Fixtures and Factories

**Test Data:**
```typescript
// Recommended: fixtures/slides.ts
export const mockSlide: Slide = {
  id: 'test-slide-1',
  title: 'Introduction to Fractions',
  content: ['A fraction represents part of a whole', 'The top number is the numerator'],
  speakerNotes: 'INTRO: Today we learn fractions 👉 Explain parts 👉 Define numerator',
  imagePrompt: 'Colorful pie chart showing fractions',
  layout: 'split',
  theme: 'default',
  isGeneratingImage: false
};

export const mockLessonResource: LessonResource = {
  id: 'res-1',
  title: 'Fraction Worksheet',
  type: 'worksheet',
  targetAudience: 'student',
  content: '# Practice Problems\n\n1. What is 1/2 + 1/4?',
  imagePrompt: 'Math worksheet header'
};
```

**Location:**
- Recommend: `__fixtures__/` or `test/fixtures/`

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not configured
# Recommended setup:
npm run test -- --coverage
```

**Recommended coverage targets:**
- Services: 80% (API integration logic)
- Components: 70% (UI rendering)
- Types: 100% (type exports)

## Test Types

**Unit Tests:**
- Not implemented
- Scope: Individual functions in services, component rendering

**Integration Tests:**
- Not implemented
- Scope: Component + service interactions, state flow

**E2E Tests:**
- Not implemented
- Recommend: Playwright or Cypress for full user flows

## Common Patterns

**Async Testing:**
```typescript
// Recommended pattern for API calls
it('generates slides from lesson text', async () => {
  const mockText = 'Lesson about fractions';
  const result = await generateLessonSlides(mockText, []);

  expect(result).toHaveLength(5);
  expect(result[0]).toHaveProperty('title');
  expect(result[0]).toHaveProperty('speakerNotes');
});
```

**Error Testing:**
```typescript
// Recommended pattern for error handling
it('throws error when API key is missing', async () => {
  delete process.env.API_KEY;

  await expect(generateLessonSlides('test', []))
    .rejects
    .toThrow('API Key is missing');
});
```

**React Component Testing:**
```typescript
// Recommended pattern for stateful components
it('updates slide when editing title', async () => {
  const mockUpdate = jest.fn();
  render(
    <SlideCard
      slide={mockSlide}
      index={0}
      onUpdate={mockUpdate}
      onDelete={jest.fn()}
      onRevise={jest.fn()}
      onRegenerateImage={jest.fn()}
      onInsertAfter={jest.fn()}
    />
  );

  const titleInput = screen.getByPlaceholderText('Slide Title');
  fireEvent.change(titleInput, { target: { value: 'New Title' } });

  expect(mockUpdate).toHaveBeenCalledWith('test-slide-1', { title: 'New Title' });
});
```

## Recommended Test Setup

**Dependencies to add:**
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
```

**Priority test targets:**
1. `services/geminiService.ts` - Core business logic
2. `components/Button.tsx` - Reusable UI component
3. `types.ts` - Type validation
4. `App.tsx` state management functions

---

*Testing analysis: 2026-01-18*
