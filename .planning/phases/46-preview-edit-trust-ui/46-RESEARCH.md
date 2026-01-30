# Phase 46: Preview, Edit, and Trust UI - Research

**Researched:** 2026-01-30
**Domain:** React inline editing, text diff visualization, contenteditable components
**Confidence:** MEDIUM

## Summary

This phase adds three critical trust-building features to the EnhancementPanel: inline editing of AI-generated content, visual diff highlighting to show what changed from original, and per-element regeneration for targeted improvements. The research reveals that while React contenteditable components and text diff libraries are well-established, they come with significant implementation pitfalls around cursor position management, XSS security, and accessibility.

The standard approach involves using controlled contenteditable components with careful cursor position management, dedicated diff viewer libraries for side-by-side or inline diff display, and immutable state patterns for tracking edits. The key technical challenges are preventing cursor jumping during re-renders, sanitizing user input to prevent XSS attacks, and maintaining proper ARIA attributes for screen reader support.

**Primary recommendation:** Use native contenteditable with `contenteditable="plaintext-only"` for security, implement cursor position restoration with `useLayoutEffect`, use `react-diff-viewer` or `react-diff-view` for visual diff display, and manage edit state with `useReducer` for complex multi-element editing operations.

## Standard Stack

The established libraries/tools for inline editing and diff visualization:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React built-in | 19.2.0 | contenteditable handling | Native browser API, no dependencies |
| react-diff-viewer | 3.1.1+ | Visual diff display | Github-style UI, syntax highlighting, split/inline views |
| DOMPurify | 3.3.1+ | HTML sanitization | OWASP recommended, prevents XSS attacks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-contenteditable | 3.3.7 | Controlled contenteditable wrapper | If cursor management becomes too complex (not recommended first) |
| react-diff-view | 3.3.2+ | Git-style diff component | For performance-critical applications with large diffs |
| diff-match-patch | 1.0.5 | Text diffing algorithm | For custom diff UI (lower-level than react-diff-viewer) |
| jsdiff (diff) | 8.0+ | Text diffing with TypeScript | Modern alternative to diff-match-patch |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native contenteditable | react-contenteditable library | Library adds complexity but handles cursor position automatically |
| react-diff-viewer | react-diff-view | react-diff-view is more lightweight but requires more setup |
| DOMPurify | sanitize-html | DOMPurify is OWASP standard and more actively maintained |

**Installation:**
```bash
npm install react-diff-viewer dompurify
npm install --save-dev @types/dompurify
```

## Architecture Patterns

### Recommended Component Structure
```
components/
├── EnhancementPanel.tsx          # Modified: Add edit mode, diff view
├── EditableElement.tsx           # New: Wraps each element with edit capability
└── DiffViewToggle.tsx            # New: Shows original vs enhanced comparison
```

### Pattern 1: Controlled ContentEditable with Cursor Management
**What:** Use native contenteditable with manual cursor position restoration
**When to use:** For inline text editing without external library dependencies
**Example:**
```typescript
// Source: React patterns from official docs + community best practices
import React, { useRef, useState, useLayoutEffect } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (newValue: string) => void;
  onBlur?: () => void;
}

const EditableText: React.FC<EditableTextProps> = ({ value, onChange, onBlur }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  // Restore cursor position after render (useLayoutEffect is synchronous)
  useLayoutEffect(() => {
    if (cursorPosition !== null && contentRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      const textNode = contentRef.current.firstChild;

      if (textNode && selection) {
        const safePosition = Math.min(cursorPosition, textNode.textContent?.length || 0);
        range.setStart(textNode, safePosition);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, [value, cursorPosition]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    // Save cursor position before state update
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setCursorPosition(range.startOffset);
    }

    onChange(e.currentTarget.textContent || '');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div
      ref={contentRef}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      onBlur={onBlur}
      className="editable-element"
    >
      {value}
    </div>
  );
};
```

### Pattern 2: Edit Mode Toggle with Local State
**What:** Use boolean state to toggle between view and edit modes
**When to use:** When users need explicit control over when editing is active
**Example:**
```typescript
// Source: React state management patterns
const [isEditMode, setIsEditMode] = useState(false);
const [editedElements, setEditedElements] = useState<Map<number, string>>(new Map());

// Toggle edit mode
const toggleEditMode = () => {
  if (isEditMode) {
    // Exiting edit mode - could prompt to save or discard
    const hasChanges = editedElements.size > 0;
    if (hasChanges) {
      // Show confirmation or auto-save
    }
  }
  setIsEditMode(!isEditMode);
};

// Update single element
const handleElementEdit = (position: number, newContent: string) => {
  setEditedElements(prev => new Map(prev).set(position, newContent));
};
```

### Pattern 3: Immutable Array Updates for Element Edits
**What:** Use map() to create new array with updated element
**When to use:** Updating specific elements in state arrays
**Example:**
```typescript
// Source: https://react.dev/learn/updating-arrays-in-state
const updateElement = (position: number, newContent: string) => {
  setElements(elements.map((element, index) =>
    index === position
      ? { ...element, enhancedContent: newContent }
      : element
  ));
};

// For tracking which elements are edited vs original
interface EditableEnhancementResult extends EnhancementResult {
  editedElements: Map<number, string>; // position -> edited content
  originalElements: EnhancedElement[];  // Preserve original for revert
}
```

### Pattern 4: Visual Diff Display
**What:** Use react-diff-viewer for side-by-side or inline diff view
**When to use:** Showing what AI changed from original
**Example:**
```typescript
// Source: https://www.npmjs.com/package/react-diff-viewer
import ReactDiffViewer from 'react-diff-viewer';

const DiffView: React.FC<{ original: string; enhanced: string }> = ({ original, enhanced }) => {
  return (
    <ReactDiffViewer
      oldValue={original}
      newValue={enhanced}
      splitView={false} // Use inline view for compact display
      useDarkTheme={false}
      compareMethod="diffWords" // Word-level highlighting
      hideLineNumbers={true}
      showDiffOnly={false}
    />
  );
};
```

### Pattern 5: Per-Element Actions
**What:** Attach action buttons to each rendered element
**When to use:** Providing regenerate/revert actions per element
**Example:**
```typescript
// Source: React list component patterns
const renderElement = (element: EnhancedElement, index: number) => {
  const isEdited = editedElements.has(element.position);

  return (
    <div key={index} className="element-container">
      {/* Element content */}
      {isEditMode ? (
        <EditableText
          value={editedElements.get(element.position) || element.enhancedContent}
          onChange={(newValue) => handleElementEdit(element.position, newValue)}
        />
      ) : (
        <div>{element.enhancedContent}</div>
      )}

      {/* Per-element actions */}
      {isEditMode && (
        <div className="element-actions">
          <button onClick={() => handleRegenerateElement(element.position)}>
            Regenerate
          </button>
          {isEdited && (
            <button onClick={() => handleRevertElement(element.position)}>
              Revert
            </button>
          )}
        </div>
      )}
    </div>
  );
};
```

### Anti-Patterns to Avoid
- **Don't use execCommand:** It's deprecated and could be removed from browsers
- **Don't use controlled contenteditable without cursor restoration:** Causes cursor jumping to start/end on every keystroke
- **Don't skip input sanitization:** contenteditable + innerHTML is an XSS vector
- **Don't mutate state arrays directly:** Always create new arrays/objects for React to detect changes
- **Don't use onChange with contenteditable:** Use onInput instead (onChange doesn't fire for contenteditable)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text diffing algorithm | Custom string comparison | diff-match-patch or jsdiff | Myers diff algorithm is complex, handles edge cases |
| Diff UI rendering | Custom highlighting spans | react-diff-viewer | Handles word-level, line-level, syntax highlighting |
| HTML sanitization | Regex or manual filtering | DOMPurify | XSS bypasses discovered regularly, needs constant updates |
| Cursor position management | Manual range/selection handling | Native Selection API with useLayoutEffect | Browser inconsistencies, text nodes vs elements |
| contenteditable wrapper | Custom component | Native contenteditable="plaintext-only" | Built-in security, simpler implementation |

**Key insight:** Text diffing and cursor position management have subtle edge cases that take years to discover. Use battle-tested libraries unless you have a very specific requirement they don't meet.

## Common Pitfalls

### Pitfall 1: Cursor Jumping on Re-render
**What goes wrong:** User types in contenteditable, cursor jumps to start/end of text
**Why it happens:** React rerenders contenteditable element, browser resets cursor position
**How to avoid:**
- Use `useLayoutEffect` (not `useEffect`) to restore cursor position synchronously
- Save cursor position before state update in `onInput` handler
- Use Selection API to restore position to exact offset
**Warning signs:** User complains text appears but cursor moves unexpectedly while typing

### Pitfall 2: XSS Vulnerability from User Input
**What goes wrong:** Attacker injects malicious HTML/JavaScript through contenteditable
**Why it happens:** contenteditable allows rich text by default, can paste formatted HTML
**How to avoid:**
- Use `contenteditable="plaintext-only"` attribute (modern browsers)
- Sanitize with DOMPurify before rendering if using dangerouslySetInnerHTML
- Handle paste events to strip formatting: `e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));`
- Never trust user input, sanitize on both client and server
**Warning signs:** Pasted content includes HTML tags, formatting, or scripts

### Pitfall 3: Enter Key Creating Unwanted Elements
**What goes wrong:** Pressing Enter creates `<div>` or `<br>` tags unexpectedly
**Why it happens:** Browser default behavior for contenteditable varies by browser
**How to avoid:**
- Use `contenteditable="plaintext-only"` to prevent rich text
- Or intercept Enter key in `onKeyDown` and call `e.preventDefault()` if single-line input desired
- For multi-line, explicitly insert `<br>` with `document.execCommand('insertLineBreak')`
**Warning signs:** Inspecting DOM shows nested divs or unexpected br elements

### Pitfall 4: State Updates Triggering Unnecessary Re-renders
**What goes wrong:** Editing one element causes all elements to re-render, poor performance
**Why it happens:** Parent component state change triggers re-render of all children
**How to avoid:**
- Wrap element components in `React.memo`
- Use stable keys (element.position, not array index)
- Consider `useReducer` for complex edit state instead of multiple `useState` calls
- Avoid inline object/function props (causes referential inequality)
**Warning signs:** Typing feels laggy, performance profiler shows many component updates

### Pitfall 5: Diff Library Performance with Large Documents
**What goes wrong:** Diff rendering is slow for documents with many elements
**Why it happens:** Diff algorithms are O(n*m) complexity for two strings of length n and m
**How to avoid:**
- Use react-diff-view instead of react-diff-viewer for better performance
- Implement virtualization for long documents
- Show diff per-element instead of whole document
- Use `showDiffOnly={true}` to hide unchanged content
**Warning signs:** UI freezes when toggling diff view, fan spins up

### Pitfall 6: Accessibility - Screen Readers Can't Navigate
**What goes wrong:** Screen reader users can't edit or understand contenteditable elements
**Why it happens:** contenteditable without ARIA attributes provides no semantic information
**How to avoid:**
- Add `role="textbox"` to contenteditable elements
- Use `aria-multiline="true"` for multi-line inputs
- Provide `aria-label` or `aria-labelledby` for each editable field
- Test with screen reader (NVDA, JAWS, VoiceOver)
**Warning signs:** Accessibility audit fails, screen reader announces "group" instead of "text field"

## Code Examples

Verified patterns from official sources:

### Plain Text Paste Handler
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable
const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
};

// Modern alternative (execCommand is deprecated but widely supported)
// Use Clipboard API when browser support improves
```

### DOMPurify Sanitization
```typescript
// Source: https://github.com/cure53/DOMPurify
import DOMPurify from 'dompurify';

// Sanitize before rendering user-provided HTML
const sanitizedHTML = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: []
});

// For contenteditable, prefer plaintext-only instead
<div contentEditable="plaintext-only">
  {content}
</div>
```

### Edit State Management with useReducer
```typescript
// Source: https://react.dev/reference/react/useReducer
type EditAction =
  | { type: 'EDIT_ELEMENT'; position: number; content: string }
  | { type: 'REVERT_ELEMENT'; position: number }
  | { type: 'DISCARD_ALL' }
  | { type: 'SAVE_ALL' };

interface EditState {
  editedElements: Map<number, string>;
  originalElements: EnhancedElement[];
}

const editReducer = (state: EditState, action: EditAction): EditState => {
  switch (action.type) {
    case 'EDIT_ELEMENT':
      const newEdits = new Map(state.editedElements);
      newEdits.set(action.position, action.content);
      return { ...state, editedElements: newEdits };

    case 'REVERT_ELEMENT':
      const revertedEdits = new Map(state.editedElements);
      revertedEdits.delete(action.position);
      return { ...state, editedElements: revertedEdits };

    case 'DISCARD_ALL':
      return { ...state, editedElements: new Map() };

    case 'SAVE_ALL':
      // Apply edits to original elements
      const updatedElements = state.originalElements.map(elem => {
        const edited = state.editedElements.get(elem.position);
        return edited ? { ...elem, enhancedContent: edited } : elem;
      });
      return { editedElements: new Map(), originalElements: updatedElements };

    default:
      return state;
  }
};

// Usage in component
const [editState, dispatch] = useReducer(editReducer, {
  editedElements: new Map(),
  originalElements: result.versions[selectedLevel].elements
});
```

### Accessible ContentEditable
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/textbox_role
<div
  role="textbox"
  contentEditable="plaintext-only"
  aria-multiline="false"
  aria-label="Edit question text"
  aria-required="false"
  onInput={handleInput}
  onPaste={handlePaste}
>
  {content}
</div>
```

### React Diff Viewer Integration
```typescript
// Source: https://www.npmjs.com/package/react-diff-viewer
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer';

const ElementDiffView: React.FC<{
  original: string;
  enhanced: string;
  isEdited: boolean;
  editedContent?: string;
}> = ({ original, enhanced, isEdited, editedContent }) => {
  const displayContent = isEdited ? editedContent : enhanced;

  return (
    <ReactDiffViewer
      oldValue={original}
      newValue={displayContent}
      splitView={false}
      compareMethod={DiffMethod.WORDS}
      styles={{
        variables: {
          light: {
            diffViewerBackground: '#fff',
            addedBackground: '#e6ffed',
            addedColor: '#24292e',
            removedBackground: '#ffeef0',
            removedColor: '#24292e',
          },
        },
      }}
      hideLineNumbers={true}
      showDiffOnly={false}
    />
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| execCommand API | Clipboard API + Selection API | 2023-2024 | execCommand deprecated but still widely used due to better browser support |
| contenteditable="true" | contenteditable="plaintext-only" | 2021+ | Prevents XSS by stripping formatting, but requires polyfill for older browsers |
| Class components | Function components with hooks | 2019+ | useLayoutEffect is key for cursor position management |
| diff-match-patch | jsdiff (diff package) | 2020+ | TypeScript support, better tree-shaking, still compatible |
| Multiple useState | useReducer for complex state | 2019+ | Better for multi-element editing with interdependencies |

**Deprecated/outdated:**
- `document.execCommand()`: Still works but deprecated, no modern replacement for some operations
- `react-contenteditable` v3.3.7: Last update 3 years ago, works but not actively maintained
- `@types/dompurify`: No longer needed, DOMPurify v3+ has built-in TypeScript types

## Open Questions

Things that couldn't be fully resolved:

1. **Browser Support for contenteditable="plaintext-only"**
   - What we know: Modern Chrome, Edge, Safari support it; Firefox support varies by version
   - What's unclear: Should we polyfill for older browsers or fall back to contenteditable="true" with sanitization?
   - Recommendation: Start with plaintext-only, add runtime detection and fallback if needed

2. **Per-Element Regeneration API Strategy**
   - What we know: Existing enhancement uses full document context for coherence
   - What's unclear: Should single-element regeneration use full context or isolated context?
   - Recommendation: Use full context but mark target element, prevents inconsistency across versions

3. **Performance Threshold for Diff Display**
   - What we know: Diff algorithms are expensive for large documents
   - What's unclear: At what element count should we switch from full-document diff to per-element diff?
   - Recommendation: Test with realistic documents (10-50 elements), profile, set threshold empirically

4. **Edit State Persistence**
   - What we know: Edits should be local until export
   - What's unclear: Should we persist edits to localStorage if user navigates away?
   - Recommendation: No auto-save for v3.7, add in future if users request it

## Sources

### Primary (HIGH confidence)
- [React Official Docs - Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state) - Immutable update patterns
- [React Official Docs - Rendering Lists](https://react.dev/learn/rendering-lists) - List component patterns
- [MDN - contenteditable attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable) - Native API reference
- [MDN - ARIA textbox role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/textbox_role) - Accessibility requirements

### Secondary (MEDIUM confidence)
- [react-diff-viewer npm](https://www.npmjs.com/package/react-diff-viewer) - Library documentation
- [react-diff-view npm](https://www.npmjs.com/package/react-diff-view) - Alternative library
- [DOMPurify GitHub](https://github.com/cure53/DOMPurify) - Sanitization library
- [LogRocket - Build inline editable UI in React](https://blog.logrocket.com/build-inline-editable-ui-react/) - Implementation guide
- [Tania Rascia - Content Editable Elements in React](https://www.taniarascia.com/content-editable-elements-in-javascript-react/) - Best practices

### Tertiary (LOW confidence - WebSearch only)
- [React contenteditable package npm](https://www.npmjs.com/package/react-contenteditable) - Last updated 3 years ago
- [GitHub Issue - react-contenteditable cursor position](https://github.com/facebook/react/issues/2047) - Known cursor jumping issue
- [Various blog posts on contenteditable pitfalls](https://markoskon.com/using-the-contenteditable-attribute/) - Community experiences

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Libraries are stable but react-contenteditable is unmaintained
- Architecture: HIGH - Patterns are well-established in React ecosystem
- Pitfalls: HIGH - Documented in official React issues and MDN

**Research date:** 2026-01-30
**Valid until:** ~30 days (stable domain, occasional library updates)

**Key risks:**
- execCommand deprecation may force API changes in future
- Browser support for plaintext-only varies, may need polyfill
- Cursor position restoration is browser-specific, needs testing

**Recommended validation:**
- Test contenteditable="plaintext-only" support in target browsers
- Profile diff rendering performance with realistic document sizes
- Accessibility audit with screen reader before release
