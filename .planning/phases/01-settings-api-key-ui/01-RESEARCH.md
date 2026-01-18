# Phase 1: Settings & API Key UI - Research

**Researched:** 2026-01-19
**Domain:** Settings UI, API Key Management, Modal Dialogs, localStorage Persistence
**Confidence:** HIGH

## Summary

This research covers what is needed to implement a Settings panel with API key configuration for the LessonLens app. The existing codebase already provides strong patterns to follow: React 19 with Tailwind CSS, functional components with hooks, and an established modal pattern in `ResourceHub.tsx`.

The key challenge is transitioning from build-time API key injection (`process.env.API_KEY`) to runtime user-provided keys stored in localStorage. All three providers (Gemini, Claude, OpenAI) offer lightweight list-models endpoints that can validate keys without incurring significant API costs.

**Primary recommendation:** Build a Settings modal component following the established ResourceHub pattern, store settings in localStorage using the existing usePreviewPersistence hook pattern, and validate API keys using the `/models` list endpoints for each provider.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI Framework | Already in use, loaded via CDN importmap |
| Tailwind CSS | 3.x (CDN) | Styling | Already in use, configured in index.html |
| localStorage API | Native | Persistence | Browser-native, no dependencies needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `<dialog>` | HTML5 | Modal dialogs | Modern browsers, provides backdrop and focus management |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` | Custom div overlay (current ResourceHub approach) | Custom approach already established in codebase |
| focus-trap-react | Manual focus management | Extra dependency; ResourceHub works fine without it |
| zustand/jotai | React Context + useState | Overkill for single settings object |

**Installation:**
No new packages needed. All functionality available via existing stack.

## Architecture Patterns

### Recommended Project Structure
```
components/
  SettingsModal.tsx        # Main settings modal component
  SettingsProvider.tsx     # Context provider for settings (optional)
hooks/
  useSettings.ts           # Hook for reading/writing settings to localStorage
services/
  geminiService.ts         # Modify to accept API key at runtime
types.ts                   # Add Settings interface
```

### Pattern 1: Modal Dialog (Following ResourceHub)
**What:** Full-screen overlay with centered panel, close on X button or backdrop click
**When to use:** Settings panel, confirmations, focused workflows
**Example:**
```typescript
// Source: components/ResourceHub.tsx (lines 220-345)
// Existing pattern in codebase
const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header with close button */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold font-fredoka">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
            {/* X icon */}
          </button>
        </div>
        {/* Content */}
        <div className="p-6">...</div>
      </div>
    </div>
  );
};
```

### Pattern 2: localStorage Persistence Hook
**What:** Custom hook that syncs state to localStorage with validation
**When to use:** Any data that persists across sessions
**Example:**
```typescript
// Source: hooks/usePreviewPersistence.ts (existing pattern)
function useSettings(defaultState: Settings): [Settings, (updates: Partial<Settings>) => void] {
  const [state, setState] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem('pipi-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate shape before using
        if (isValidSettings(parsed)) {
          return { ...defaultState, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to parse settings from localStorage:', e);
    }
    return defaultState;
  });

  // Save on changes
  useEffect(() => {
    localStorage.setItem('pipi-settings', JSON.stringify(state));
  }, [state]);

  const updateState = useCallback((updates: Partial<Settings>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return [state, updateState];
}
```

### Pattern 3: Type-to-Confirm Dangerous Action
**What:** User must type confirmation text before destructive action proceeds
**When to use:** Clear all data, irreversible deletions
**Example:**
```typescript
// Type-to-confirm pattern
const [confirmText, setConfirmText] = useState('');
const canClear = confirmText.toLowerCase() === 'delete';

<input
  placeholder="Type 'delete' to confirm"
  value={confirmText}
  onChange={(e) => setConfirmText(e.target.value)}
/>
<button
  disabled={!canClear}
  onClick={handleClearAll}
  className={`${canClear ? 'bg-red-500' : 'bg-slate-300'}`}
>
  Clear All Data
</button>
```

### Anti-Patterns to Avoid
- **Storing API key in React state only:** Must persist to localStorage
- **Validating key on every keystroke:** Wait for explicit Test button click
- **Using process.env at runtime:** Won't work on static GitHub Pages deployment
- **Encrypting localStorage:** Adds complexity without real security benefit (XSS can still read it)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password field visibility toggle | Custom visibility logic | `<input type="password">` + toggle state | Browser handles masking behavior |
| Modal backdrop dimming | Custom overlay z-index management | Fixed overlay pattern from ResourceHub | Already proven to work in codebase |
| Form validation | Complex validation framework | Simple controlled inputs + Test button | Only need "key works" validation |
| Accordion animation | CSS keyframe animations | Tailwind transition utilities | `max-h-0` to `max-h-[500px]` with transition |

**Key insight:** The existing codebase has all the UI patterns needed. Follow ResourceHub for modals, Button for button variants, usePreviewPersistence for localStorage hooks.

## Common Pitfalls

### Pitfall 1: API Key Visible in Browser Dev Tools
**What goes wrong:** User's API key visible in Network tab or Application > Local Storage
**Why it happens:** Client-side storage has no secrets from the user
**How to avoid:** This is expected and unavoidable for client-side-only apps. Document clearly with "Stored locally only" notice. The key is protecting from OTHER users/XSS, not from the device owner.
**Warning signs:** Users asking "is my key safe?" without understanding client-side limitations

### Pitfall 2: API Key Test Consuming Quota
**What goes wrong:** Testing key makes expensive API call
**Why it happens:** Using generateContent endpoint instead of lightweight endpoint
**How to avoid:** Use `/models` list endpoint for validation - it's free/cheap and confirms authentication
**Warning signs:** Test button costs money; users complain about charges

### Pitfall 3: Settings Lost on Clear Cache
**What goes wrong:** User clears browser data and loses API key
**Why it happens:** localStorage is cleared with other browser data
**How to avoid:** Cannot prevent this. Mitigate by making re-entry easy with clear instructions.
**Warning signs:** Users complaining settings disappear "randomly"

### Pitfall 4: State Not Syncing to localStorage
**What goes wrong:** User sets API key, refreshes, it's gone
**Why it happens:** State update didn't trigger save, or save failed silently
**How to avoid:** Use explicit Save button instead of auto-save; show success feedback
**Warning signs:** Users reporting inconsistent persistence behavior

### Pitfall 5: Modal Focus Escapes
**What goes wrong:** User tabs out of modal into underlying page
**Why it happens:** No focus trap implemented
**How to avoid:** ResourceHub doesn't have focus trap and works fine. For Settings modal, keep close button prominent; ESC to close is nice-to-have.
**Warning signs:** Accessibility audit failures (but acceptable for v1)

## API Key Validation Endpoints

All three providers have lightweight endpoints for validating API keys:

### Gemini (Google AI)
```typescript
// GET request to list models - validates key without generating content
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
);
// 200 = valid, 400/401 = invalid
```
**Cost:** Free - just lists available models
**Source:** [Google AI Gemini API Docs](https://ai.google.dev/gemini-api/docs/api-key)

### OpenAI
```typescript
// GET request to list models
const response = await fetch('https://api.openai.com/v1/models', {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});
// 200 = valid, 401 = invalid
```
**Cost:** Free - just lists available models
**Source:** [OpenAI API Reference](https://platform.openai.com/docs/api-reference/models/list)

### Claude (Anthropic)
```typescript
// GET request to list models
const response = await fetch('https://api.anthropic.com/v1/models', {
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  }
});
// 200 = valid, 401 = invalid
```
**Cost:** Free - just lists available models
**Source:** [Anthropic Claude API Reference](https://docs.anthropic.com/en/api/models-list)

### Unified Validation Function Pattern
```typescript
async function validateApiKey(provider: Provider, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const endpoints: Record<Provider, { url: string; headers: HeadersInit }> = {
    gemini: {
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      headers: {}
    },
    openai: {
      url: 'https://api.openai.com/v1/models',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    },
    claude: {
      url: 'https://api.anthropic.com/v1/models',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    }
  };

  try {
    const { url, headers } = endpoints[provider];
    const response = await fetch(url, { headers });

    if (response.ok) {
      return { valid: true };
    }

    const error = await response.json();
    return { valid: false, error: error.error?.message || 'Invalid API key' };
  } catch (e) {
    return { valid: false, error: 'Network error - check your connection' };
  }
}
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Settings Type Definition
```typescript
// types.ts
export type AIProvider = 'gemini' | 'openai' | 'claude';

export interface Settings {
  provider: AIProvider;
  apiKey: string;
  // Future: other preferences
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'gemini',
  apiKey: ''
};
```

### Password Field with Toggle
```typescript
// Following existing input patterns in codebase
const [showKey, setShowKey] = useState(false);

<div className="relative">
  <input
    type={showKey ? 'text' : 'password'}
    value={apiKey}
    onChange={(e) => setApiKey(e.target.value)}
    placeholder="Enter your API key"
    className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-amber-500/20"
  />
  <button
    type="button"
    onClick={() => setShowKey(!showKey)}
    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
  >
    {showKey ? <EyeOffIcon /> : <EyeIcon />}
  </button>
</div>
```

### Collapsible Accordion
```typescript
// CSS transition approach (no JS animation library needed)
const [isExpanded, setIsExpanded] = useState(false);

<div>
  <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2">
    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
      {/* chevron icon */}
    </svg>
    Setup Instructions
  </button>
  <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
    {/* Instructions content */}
  </div>
</div>
```

### Header Gear Icon (Following Dark Mode Toggle)
```typescript
// Source: App.tsx lines 279-291 (existing theme toggle pattern)
<button
  onClick={() => setShowSettings(true)}
  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
  title="Settings"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
</button>
```

## Provider Instructions Content

Per-provider setup instructions for the collapsible accordion:

### Gemini
```
1. Go to Google AI Studio (aistudio.google.com)
2. Click "Get API Key" in the top-left corner
3. Create a new API key or use an existing one
4. Copy the key (starts with "AIza...")

Cost: Free tier available (15 requests/minute)
Paid: ~$0.075 per 1M input tokens for Gemini 1.5 Flash
```
**Link:** `https://aistudio.google.com/app/apikey`

### OpenAI
```
1. Go to platform.openai.com
2. Sign in or create an account
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with "sk-...")

Cost: Pay-as-you-go, ~$0.15/1M input tokens for GPT-4o-mini
Requires: Credit card on file (minimum $5 credit)
```
**Link:** `https://platform.openai.com/api-keys`

### Claude (Anthropic)
```
1. Go to console.anthropic.com
2. Sign in or create an account
3. Navigate to API Keys
4. Click "Create Key"
5. Copy the key

Cost: Pay-as-you-go, ~$0.25/1M input tokens for Claude 3.5 Haiku
Requires: Credit card on file (minimum $5 credit)
```
**Link:** `https://console.anthropic.com/settings/keys`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `process.env.API_KEY` build-time | Runtime user-provided keys | v2.0 (now) | Enables sharing without exposing developer key |
| Single provider (Gemini only) | Multi-provider support | v2.0 (now) | Users choose their preferred AI service |

**Deprecated/outdated:**
- Build-time API key injection: Won't work on static GitHub Pages deployment

## Open Questions

Things that couldn't be fully resolved:

1. **CORS for Claude API**
   - What we know: Anthropic added CORS support in late 2024
   - What's unclear: Whether it works reliably from all browsers
   - Recommendation: Test during implementation; may need to document browser requirements

2. **Settings persistence across devices**
   - What we know: localStorage is device-specific
   - What's unclear: Whether users will expect cloud sync
   - Recommendation: Document "settings are per-device" clearly; out of scope for v2.0

## Sources

### Primary (HIGH confidence)
- `/components/ResourceHub.tsx` - Modal dialog pattern (existing codebase)
- `/hooks/usePreviewPersistence.ts` - localStorage persistence pattern (existing codebase)
- `/components/Button.tsx` - Button variant patterns (existing codebase)
- `/App.tsx` - Header layout and dark mode toggle pattern (existing codebase)

### Secondary (MEDIUM confidence)
- [Google AI Gemini API Docs](https://ai.google.dev/gemini-api/docs/api-key) - Gemini key validation
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/models/list) - OpenAI models endpoint
- [Anthropic Claude API Reference](https://docs.anthropic.com/en/api/models-list) - Claude models endpoint
- [Securing Web Storage Best Practices - DEV](https://dev.to/rigalpatel001/securing-web-storage-localstorage-and-sessionstorage-best-practices-f00) - localStorage security

### Tertiary (LOW confidence)
- [focus-trap-react - npm](https://www.npmjs.com/package/focus-trap-react) - Focus management (not using, but referenced)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing codebase patterns, no new dependencies
- Architecture: HIGH - Clear patterns from ResourceHub and usePreviewPersistence
- API validation: HIGH - Official docs confirm models endpoints for all providers
- Pitfalls: MEDIUM - Based on general web dev knowledge, not production testing

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable technologies)
