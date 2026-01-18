# Phase 3: Disabled AI State - Research

**Researched:** 2026-01-19
**Domain:** Conditional UI states, feature gating, disabled button UX, modal dialogs
**Confidence:** HIGH

## Summary

This phase implements graceful degradation when no API key is configured. The goal is to make AI features visually disabled (grayed with lock icon) while keeping the app fully functional for non-AI workflows (create, edit, present slides). The existing codebase provides strong patterns to follow: the Button component, useSettings hook, SettingsModal, and error modal in App.tsx.

Key findings:
- **AI feature locations identified:** 7 distinct AI-powered actions across App.tsx, ResourceHub, PresentationView, and SlideCard
- **Detection pattern:** Already implemented - check if `provider` is null (created from `settings.apiKey`)
- **Existing modal pattern:** Error modal in App.tsx can be adapted for the "enable AI" prompt
- **Settings auto-focus:** React `useRef` with `ref.current?.focus()` in useEffect on modal open

**Primary recommendation:** Create a reusable `AIFeatureButton` component that wraps the disabled state logic, lock icon overlay, and click-to-open-settings behavior. This avoids duplicating the disabled state logic across 7+ locations.

## Codebase Analysis

### AI Features That Need Disabling

All AI-powered features identified in the codebase:

| Component | Feature | Current Handler | Line |
|-----------|---------|-----------------|------|
| App.tsx | Generate Slideshow | `handleGenerate()` | 488-496 |
| App.tsx | Insert Exemplar Slide | `handleInsertExemplarSlide()` | 258-299 |
| SlideCard.tsx | AI Concept Refinement (Revise) | `handleMagicEdit()` | 145-151 |
| SlideCard.tsx | Regenerate Image | `onRegenerateImage()` | 175-181 |
| ResourceHub.tsx | Generate Resources | `handleGenerate()` | 260-262 |
| PresentationView.tsx | Generate Question (Grade C/B/A) | `handleGenerateQuestion()` | 662-670 |
| PresentationView.tsx | Game Mode Quiz | `QuizOverlay handleStart()` | 449-454 |

### Current Provider Detection Pattern

The app already has a pattern for checking if AI is available:

```typescript
// App.tsx lines 70-81
const provider = useMemo<AIProviderInterface | null>(() => {
  if (!settings.apiKey) return null;
  try {
    return createAIProvider({ provider: settings.provider, apiKey: settings.apiKey });
  } catch (e) {
    if (e instanceof AIProviderError) {
      setErrorModal({ title: 'Provider Not Available', message: e.userMessage });
    }
    return null;
  }
}, [settings.provider, settings.apiKey]);

// Child components receive: provider: AIProviderInterface | null
```

**Key insight:** `provider === null` means AI is unavailable. This is the single source of truth.

### Current Error Modal Pattern

App.tsx already has an error modal that can serve as the template for the "enable AI" modal:

```typescript
// App.tsx lines 675-701
{errorModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
        {errorModal.title}
      </h3>
      <p className="text-slate-600 dark:text-slate-300 mb-6">
        {errorModal.message}
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => { setErrorModal(null); setShowSettings(true); }}
          className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-amber-400 hover:underline"
        >
          Open Settings
        </button>
        <button
          onClick={() => setErrorModal(null)}
          className="px-4 py-2 bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90"
        >
          OK
        </button>
      </div>
    </div>
  </div>
)}
```

### useSettings Hook

The settings hook provides everything needed to detect API key status:

```typescript
// hooks/useSettings.ts - already implemented
export function useSettings(): [Settings, (updates: Partial<Settings>) => void, () => void] {
  // Returns: [settings, updateSettings, refreshSettings]
  // settings.apiKey === '' means no key configured
}
```

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI Framework | Already in use, loaded via CDN |
| Tailwind CSS | 3.x (CDN) | Styling | Already in use, provides disabled states |

### No New Dependencies Needed

All functionality can be built with existing React patterns and Tailwind utilities.

## Architecture Patterns

### Recommended Project Structure
```
components/
  AIFeatureButton.tsx     # NEW: Wrapper for disabled AI feature buttons
  EnableAIModal.tsx       # NEW: Modal prompting user to add API key
  Button.tsx              # EXISTING: Extend with aiDisabled variant
hooks/
  useAIAvailability.ts    # NEW: Hook to check AI availability + show modal
```

### Pattern 1: AIFeatureButton Component

**What:** Wrapper component that handles disabled state for all AI features
**When to use:** Any button/action that requires AI provider to be configured

```typescript
// components/AIFeatureButton.tsx
interface AIFeatureButtonProps {
  isAIAvailable: boolean;
  onRequestEnable: () => void;
  featureName: string;  // e.g., "generate slides", "create quiz"
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

const AIFeatureButton: React.FC<AIFeatureButtonProps> = ({
  isAIAvailable,
  onRequestEnable,
  featureName,
  children,
  onClick,
  className = '',
  variant = 'primary'
}) => {
  const handleClick = () => {
    if (isAIAvailable) {
      onClick();
    } else {
      onRequestEnable();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative ${className}
        ${!isAIAvailable ? 'opacity-50 cursor-pointer' : ''}
      `}
      title={!isAIAvailable ? 'Add API key in Settings to enable' : undefined}
    >
      {children}
      {/* Lock icon overlay when disabled */}
      {!isAIAvailable && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-500 rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </button>
  );
};
```

### Pattern 2: Enable AI Modal (Per CONTEXT.md Decisions)

**What:** Friendly invitation modal when user clicks disabled AI feature
**When to use:** Every click on a disabled AI feature

```typescript
// components/EnableAIModal.tsx
interface EnableAIModalProps {
  featureName: string;  // "generate slides", "create quiz", etc.
  onOpenSettings: () => void;
}

const EnableAIModal: React.FC<EnableAIModalProps> = ({ featureName, onOpenSettings }) => {
  const handleOpenSettings = () => {
    onOpenSettings();  // Modal closes automatically when this is called
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
        {/* Lock icon decoration */}
        <div className="w-16 h-16 bg-indigo-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-indigo-600 dark:text-amber-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 text-center font-fredoka">
          Add an API key to unlock AI features!
        </h3>

        <p className="text-slate-600 dark:text-slate-300 mb-2 text-center">
          To {featureName}, add an API key in Settings.
        </p>

        {/* Brief explanation for newcomers */}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
          An API key connects this app to AI services like Gemini or Claude.
          Many providers offer free tiers to get started.
        </p>

        {/* Single action button - no dismiss option per CONTEXT.md */}
        <button
          onClick={handleOpenSettings}
          className="w-full px-6 py-3 bg-indigo-600 dark:bg-amber-500 text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          Open Settings
        </button>
      </div>
    </div>
  );
};
```

### Pattern 3: Auto-Focus API Key Input

**What:** When opening Settings from the enable modal, focus the API key input
**When to use:** When Settings is opened specifically to add an API key

```typescript
// components/SettingsModal.tsx - Add ref and autoFocus prop
interface SettingsModalProps {
  onClose: () => void;
  autoFocusApiKey?: boolean;  // NEW: Auto-focus the API key input
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, autoFocusApiKey = false }) => {
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the API key input if requested
  useEffect(() => {
    if (autoFocusApiKey && apiKeyInputRef.current) {
      // Small delay to ensure modal animation completes
      setTimeout(() => {
        apiKeyInputRef.current?.focus();
      }, 100);
    }
  }, [autoFocusApiKey]);

  return (
    // ... modal content ...
    <input
      ref={apiKeyInputRef}
      type={showKey ? 'text' : 'password'}
      value={apiKey}
      onChange={(e) => handleKeyChange(e.target.value)}
      placeholder="Enter your API key..."
      // ... rest of props
    />
  );
};
```

### Pattern 4: Hook for AI Availability + Modal State

**What:** Custom hook encapsulating AI availability check and modal control
**When to use:** Any component that needs to gate AI features

```typescript
// hooks/useAIAvailability.ts
interface UseAIAvailabilityReturn {
  isAIAvailable: boolean;
  showEnableModal: boolean;
  requestFeature: (featureName: string) => void;
  closeEnableModal: () => void;
  pendingFeatureName: string | null;
}

function useAIAvailability(provider: AIProviderInterface | null): UseAIAvailabilityReturn {
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [pendingFeatureName, setPendingFeatureName] = useState<string | null>(null);

  const isAIAvailable = provider !== null;

  const requestFeature = useCallback((featureName: string) => {
    if (!isAIAvailable) {
      setPendingFeatureName(featureName);
      setShowEnableModal(true);
    }
  }, [isAIAvailable]);

  const closeEnableModal = useCallback(() => {
    setShowEnableModal(false);
    setPendingFeatureName(null);
  }, []);

  return {
    isAIAvailable,
    showEnableModal,
    requestFeature,
    closeEnableModal,
    pendingFeatureName,
  };
}
```

### Anti-Patterns to Avoid

- **Double-checking API key everywhere:** Use the single `provider === null` check
- **Hiding AI features completely:** Per requirements, features should be visible but disabled
- **Complicated disabled state logic in each component:** Centralize in AIFeatureButton or hook
- **Using cursor-not-allowed:** Per CONTEXT.md, use default pointer (button is still clickable)
- **Adding dismiss option to enable modal:** Per CONTEXT.md, only "Open Settings" action

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Disabled button styling | Custom opacity/filter classes | Tailwind's `opacity-50` | Consistent with existing patterns |
| Modal backdrop | Custom z-index management | Existing error modal pattern | Already proven to work |
| Focus management on modal | Complex focus trap | Simple `useRef` + `focus()` | Sufficient for this use case |
| Provider detection | New validation logic | Existing `provider === null` check | Already implemented and working |

**Key insight:** The codebase already handles provider null checks in 7 places. The pattern is established; this phase just makes the disabled state visible to users.

## Common Pitfalls

### Pitfall 1: Inconsistent Disabled State Across Components
**What goes wrong:** Some AI features disabled, others still work when no API key
**Why it happens:** Missing disabled state in some components
**How to avoid:** Create exhaustive list of AI features (done above), test each one
**Warning signs:** User reports "X works but Y doesn't" with same settings

### Pitfall 2: Lock Icon Visually Clashing with Button Icons
**What goes wrong:** Lock icon overlaps or hides button content
**Why it happens:** Positioned without considering button content
**How to avoid:** Position lock in corner with small size (w-4 h-4), use absolute positioning
**Warning signs:** Buttons look cluttered or lock is hard to see

### Pitfall 3: Modal Not Closing When Settings Opens
**What goes wrong:** Two modals stacked on top of each other
**Why it happens:** Enable modal not dismissed before Settings opens
**How to avoid:** Close enable modal first, then open Settings (single state handler)
**Warning signs:** User sees enable modal behind Settings modal

### Pitfall 4: Settings Not Refreshed After API Key Added
**What goes wrong:** User adds key, closes Settings, AI still shows disabled
**Why it happens:** App state not updated from localStorage
**How to avoid:** Use existing `refreshSettings()` callback when Settings closes
**Warning signs:** User has to refresh page for changes to take effect

### Pitfall 5: Tooltip Interfering with Click
**What goes wrong:** Tooltip blocks click target on mobile/touch
**Why it happens:** Tooltip positioned over button area
**How to avoid:** Use title attribute (native tooltip) instead of custom positioned tooltip
**Warning signs:** Users on touch devices can't click disabled AI buttons

## Code Examples

### Disabled Button with Lock Icon

```typescript
// Tailwind classes for disabled AI button appearance
const disabledAIClasses = `
  relative
  opacity-50
  cursor-pointer
`;

const lockIconOverlay = (
  <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-500 dark:bg-slate-600 rounded-full flex items-center justify-center shadow-sm">
    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  </span>
);
```

### Integration Example (App.tsx Generate Button)

```typescript
// Before: App.tsx line 488-496
<Button
  onClick={handleGenerate}
  className="px-16 py-5 text-xl rounded-2xl"
  isLoading={isGenerating}
  disabled={(!lessonText.trim() && pageImages.length === 0) || isGenerating}
>
  Generate Slideshow
</Button>

// After: With AI feature gating
<div className="relative">
  <Button
    onClick={() => {
      if (provider) {
        handleGenerate();
      } else {
        setEnableAIModal({ featureName: 'generate slides' });
      }
    }}
    className={`px-16 py-5 text-xl rounded-2xl ${!provider ? 'opacity-50' : ''}`}
    isLoading={isGenerating}
    disabled={(!lessonText.trim() && pageImages.length === 0) || isGenerating}
    title={!provider ? 'Add API key in Settings to enable' : undefined}
  >
    Generate Slideshow
  </Button>
  {/* Lock icon when AI not available */}
  {!provider && (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-slate-500 rounded-full flex items-center justify-center">
      <LockIcon className="w-3 h-3 text-white" />
    </span>
  )}
</div>
```

### Settings Modal with Auto-Focus

```typescript
// App.tsx - Tracking whether to auto-focus API key input
const [showSettings, setShowSettings] = useState(false);
const [settingsAutoFocus, setSettingsAutoFocus] = useState(false);

// When opening settings from enable modal
const handleOpenSettingsFromEnableModal = () => {
  setEnableAIModal(null);  // Close enable modal first
  setSettingsAutoFocus(true);
  setShowSettings(true);
};

// Render SettingsModal
{showSettings && (
  <SettingsModal
    onClose={() => {
      setShowSettings(false);
      setSettingsAutoFocus(false);
      refreshSettings();
    }}
    autoFocusApiKey={settingsAutoFocus}
  />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hide features when unavailable | Show disabled with lock icon | UX best practice 2020s | Users understand what's possible |
| Show raw error on click | Friendly enable modal | This phase | Better user guidance |
| Manual check in each component | Centralized availability hook | This phase | Consistent behavior |

**Deprecated/outdated:**
- cursor-not-allowed for clickable disabled states: Still clickable per design, use default pointer
- Hiding features behind paywalls without indication: Users prefer to see what's available

## Open Questions

1. **Should invalid/expired API keys show the same disabled state?**
   - What we know: CONTEXT.md says "Invalid/expired API keys treated same as no key"
   - What's unclear: Whether to show a different message ("Your key is invalid" vs "Add an API key")
   - Recommendation: Show same disabled state; let Settings modal handle validation feedback

2. **Should there be a loading state during API key validation on startup?**
   - What we know: CONTEXT.md mentions "API key validity checked on app startup"
   - What's unclear: Whether this should block UI or happen in background
   - Recommendation: Background check; if key fails validation, set provider to null

## Sources

### Primary (HIGH confidence)
- `/components/Button.tsx` - Button component patterns (existing codebase)
- `/components/SettingsModal.tsx` - Modal dialog pattern (existing codebase)
- `/App.tsx` - Provider creation and error modal pattern (existing codebase)
- `/hooks/useSettings.ts` - Settings persistence hook (existing codebase)

### Secondary (MEDIUM confidence)
- `.planning/phases/03-disabled-ai-state/03-CONTEXT.md` - User decisions for this phase
- `.planning/phases/02-multi-provider-ai/02-RESEARCH.md` - Provider system documentation
- `.planning/phases/01-settings-api-key-ui/01-RESEARCH.md` - Settings UI patterns

### Tertiary (LOW confidence)
- React documentation on useRef and focus management
- Tailwind CSS documentation on opacity utilities

## Metadata

**Confidence breakdown:**
- AI feature locations: HIGH - Exhaustive codebase search completed
- Disabled state pattern: HIGH - Based on existing Button and modal patterns
- Modal behavior: HIGH - Clear requirements from CONTEXT.md
- Auto-focus: MEDIUM - Standard React pattern, may need timing adjustment

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable patterns)
