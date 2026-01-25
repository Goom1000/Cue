# Phase 36: Core Ask AI - Research

**Researched:** 2026-01-26
**Domain:** AI Chat Interface with Streaming, React UI Components
**Confidence:** HIGH

## Summary

This phase implements an in-presentation AI assistant that allows teachers to ask contextual questions during a lesson. The core challenge is implementing streaming responses from two AI providers (Gemini and Claude) while maintaining smooth character-by-character display and ensuring the feature remains teacher-only (not synced to student view).

The existing codebase already has:
- Multi-provider AI infrastructure (`aiProvider.ts`, `geminiProvider.ts`, `claudeProvider.ts`)
- BroadcastChannel sync pattern for teacher/student separation
- Toast notification system for feedback
- Established UI patterns in the teleprompter panel area

**Primary recommendation:** Extend the existing `AIProviderInterface` with a new streaming chat method, implement SSE parsing for Claude and async iterator for Gemini, and add an inline panel component below the teleprompter script area.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @google/genai | 1.37.0 | Gemini streaming via `generateContentStream` | Already installed, supports async iterators |
| Anthropic API | 2023-06-01 | Claude streaming via `stream: true` SSE | Already used in claudeProvider.ts |
| React 19 | 19.2.0 | UI components and state management | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native fetch + ReadableStream | Browser API | Parse Claude SSE responses | For text/event-stream parsing |
| navigator.clipboard | Browser API | Copy to clipboard | For copy button functionality |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native SSE parsing | fetch-event-stream (741b) | Extra dependency, but cleaner API - recommend native for 0 dependencies |
| Custom typewriter hook | react-type-animation | External dependency vs simple useEffect with requestAnimationFrame |
| Inline panel | Modal dialog | Modal steals focus (violates UX-01), inline maintains context |

**Installation:**
```bash
# No new packages required - all APIs available via existing dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
components/
  AskAIPanel.tsx         # Main panel component (inline in teleprompter)
services/
  aiProvider.ts          # Add streamChat method to interface
  providers/
    geminiProvider.ts    # Implement Gemini streaming
    claudeProvider.ts    # Implement Claude SSE streaming
hooks/
  useStreamingChat.ts    # Hook for managing streaming state
```

### Pattern 1: Dual-State Streaming (Network vs Display)
**What:** Decouple network chunks from display animation
**When to use:** Always for streaming AI responses
**Example:**
```typescript
// Source: Upstash smooth streaming pattern
interface StreamState {
  // Network state - raw chunks as they arrive
  chunks: string[];
  isStreaming: boolean;
  error: string | null;

  // Display state - animated text shown to user
  displayedText: string;
  isAnimating: boolean;
}

// Animation runs independently at consistent speed (5ms/char = 200 chars/sec)
useEffect(() => {
  if (!isAnimating) return;

  let lastTime = performance.now();
  const fullText = chunks.join('');
  let charIndex = displayedText.length;

  const animate = (currentTime: number) => {
    const elapsed = currentTime - lastTime;
    const charsToAdd = Math.floor(elapsed / 5); // 5ms per character

    if (charsToAdd > 0 && charIndex < fullText.length) {
      charIndex = Math.min(charIndex + charsToAdd, fullText.length);
      setDisplayedText(fullText.slice(0, charIndex));
      lastTime = currentTime;
    }

    if (charIndex < fullText.length) {
      requestAnimationFrame(animate);
    } else {
      setIsAnimating(false);
    }
  };

  requestAnimationFrame(animate);
}, [chunks, isAnimating]);
```

### Pattern 2: Provider-Agnostic Streaming Interface
**What:** Unified async generator interface for both Gemini and Claude
**When to use:** For the streamChat method on AIProviderInterface
**Example:**
```typescript
// Source: Existing AIProviderInterface pattern
interface AIProviderInterface {
  // ... existing methods ...

  // New streaming method - returns async generator
  streamChat(
    message: string,
    context: ChatContext
  ): AsyncGenerator<string, void, unknown>;
}

interface ChatContext {
  lessonTopic: string;
  currentSlideTitle: string;
  currentSlideContent: string[];
  cumulativeContent: string;
  gradeLevel: string; // For age-appropriate responses (CTXT-02)
}
```

### Pattern 3: SSE Parsing for Claude (Browser)
**What:** Manual parsing of text/event-stream since EventSource doesn't support POST
**When to use:** For Claude API streaming
**Example:**
```typescript
// Source: Anthropic streaming docs + fetch-event-stream pattern
async function* streamClaudeChat(
  apiKey: string,
  message: string,
  context: ChatContext
): AsyncGenerator<string, void, unknown> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      stream: true, // Enable streaming
      system: buildSystemPrompt(context),
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!response.ok) throw new AIProviderError(/*...*/);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'content_block_delta' &&
            data.delta?.type === 'text_delta') {
          yield data.delta.text;
        }
      }
    }
  }
}
```

### Pattern 4: Gemini Streaming (Async Iterator)
**What:** Use generateContentStream with for-await-of
**When to use:** For Gemini API streaming
**Example:**
```typescript
// Source: Google GenAI SDK documentation
async function* streamGeminiChat(
  apiKey: string,
  message: string,
  context: ChatContext
): AsyncGenerator<string, void, unknown> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContentStream({
    model: 'gemini-2.0-flash-exp',
    contents: buildPromptWithContext(message, context),
    config: {
      systemInstruction: buildSystemPrompt(context),
    },
  });

  for await (const chunk of response) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
```

### Anti-Patterns to Avoid
- **Displaying chunks directly:** Leads to jerky, unreadable text. Always use animation buffer.
- **Syncing to BroadcastChannel:** Ask AI must remain teacher-only. Never emit ASK_AI messages.
- **Modal dialogs:** Steals focus from presentation navigation. Use inline panel only.
- **Blocking keyboard navigation:** Panel must not prevent arrow keys from changing slides.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE parsing | Custom regex parser | Line-by-line split with data: prefix check | SSE format is well-specified, simple to parse correctly |
| Copy to clipboard | document.execCommand | navigator.clipboard.writeText | execCommand is deprecated, writeText is modern and async |
| Loading spinner | CSS keyframes animation | Existing `.animate-spin` Tailwind class | Already used throughout codebase |
| Toast feedback | Custom notification | Existing `useToast` hook | Already has success/error variants |
| Error retry UI | New component | Existing Toast with action prop | Toast supports action buttons |

**Key insight:** The codebase already has robust patterns for loading states, error handling, and notifications. The Ask AI feature should reuse these rather than creating new UI paradigms.

## Common Pitfalls

### Pitfall 1: Chunky Streaming Display
**What goes wrong:** Text appears in bursts matching network chunks, not smooth character flow
**Why it happens:** Directly rendering network chunks without animation buffer
**How to avoid:** Use dual-state pattern - buffer chunks, animate display separately at 5ms/char
**Warning signs:** Text appearing in 10-50 character bursts instead of smooth typing

### Pitfall 2: Focus Stealing
**What goes wrong:** Input field captures keyboard focus, arrow keys no longer navigate slides
**Why it happens:** Standard input behavior captures all keyboard events
**How to avoid:**
- Don't auto-focus input
- Allow focus only on explicit click
- Use `onKeyDown` to pass through navigation keys (Arrow, PageDown, Space)
**Warning signs:** Teacher can't advance slides while panel is visible

### Pitfall 3: Student View Leak
**What goes wrong:** Ask AI state or responses appear on student display
**Why it happens:** Accidentally including AI state in STATE_UPDATE broadcast
**How to avoid:**
- Keep Ask AI state entirely local to PresentationView
- Never add Ask AI message types to PresentationMessage union
- Audit all postMessage calls
**Warning signs:** Any AI-related content visible in StudentView component

### Pitfall 4: Incomplete SSE Parsing
**What goes wrong:** Text gets dropped or corrupted during streaming
**Why it happens:** Not handling partial chunks that span multiple reads
**How to avoid:** Keep a buffer for incomplete lines, only process complete data: lines
**Warning signs:** Missing words, garbled characters, especially at chunk boundaries

### Pitfall 5: Memory Leak on Unmount
**What goes wrong:** Animation continues after component unmounts, state updates on unmounted component
**Why it happens:** requestAnimationFrame or AbortController not cleaned up
**How to avoid:**
- Store animation frame ID in ref, cancel in cleanup
- Use AbortController for fetch, abort in cleanup
- Check mounted ref before state updates
**Warning signs:** React warnings about state updates on unmounted components

### Pitfall 6: API Key Not Available
**What goes wrong:** Panel renders but streaming fails with cryptic error
**Why it happens:** Provider is null when no API key configured
**How to avoid:** Check `provider !== null` before showing input, show setup prompt if unavailable
**Warning signs:** "Cannot read property of null" errors in console

## Code Examples

Verified patterns from official sources:

### Complete useStreamingChat Hook
```typescript
// Combines network streaming with display animation
interface UseStreamingChatOptions {
  provider: AIProviderInterface | null;
  context: ChatContext;
}

interface UseStreamingChatReturn {
  displayedText: string;
  isLoading: boolean;      // True during "Thinking..." phase
  isStreaming: boolean;    // True while receiving/animating
  error: string | null;
  sendMessage: (message: string) => void;
  retry: () => void;
  clear: () => void;
}

function useStreamingChat({ provider, context }: UseStreamingChatOptions): UseStreamingChatReturn {
  const [chunks, setChunks] = useState<string[]>([]);
  const [displayedText, setDisplayedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Animation effect - runs when chunks change
  useEffect(() => {
    if (chunks.length === 0) return;

    const fullText = chunks.join('');
    let charIndex = displayedText.length;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      if (!mountedRef.current) return;

      const elapsed = currentTime - lastTime;
      const charsToAdd = Math.floor(elapsed / 5); // 5ms per char

      if (charsToAdd > 0 && charIndex < fullText.length) {
        charIndex = Math.min(charIndex + charsToAdd, fullText.length);
        setDisplayedText(fullText.slice(0, charIndex));
        lastTime = currentTime;
      }

      if (charIndex < fullText.length) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else if (!isStreaming) {
        // Animation complete, streaming complete
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [chunks, isStreaming]);

  const sendMessage = useCallback(async (message: string) => {
    if (!provider || !message.trim()) return;

    // Abort any existing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLastMessage(message);
    setChunks([]);
    setDisplayedText('');
    setError(null);
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const stream = provider.streamChat(message, context);

      // First chunk received - switch from loading to streaming
      let firstChunk = true;

      for await (const chunk of stream) {
        if (!mountedRef.current) break;
        if (firstChunk) {
          setIsLoading(false);
          firstChunk = true;
        }
        setChunks(prev => [...prev, chunk]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof AIProviderError) {
        setError(e.userMessage);
      } else if ((e as Error).name !== 'AbortError') {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsStreaming(false);
      }
    }
  }, [provider, context]);

  const retry = useCallback(() => {
    if (lastMessage) {
      sendMessage(lastMessage);
    }
  }, [lastMessage, sendMessage]);

  const clear = useCallback(() => {
    abortControllerRef.current?.abort();
    setChunks([]);
    setDisplayedText('');
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  return {
    displayedText,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    retry,
    clear,
  };
}
```

### Copy to Clipboard with Feedback
```typescript
// Source: MDN navigator.clipboard.writeText
const handleCopy = async (text: string, addToast: ToastFunction) => {
  try {
    await navigator.clipboard.writeText(text);
    addToast('Copied to clipboard', 2000, 'success');
  } catch (err) {
    addToast('Failed to copy', 2000, 'error');
  }
};
```

### Quick Action Buttons
```typescript
// Predefined prompts for CTXT-03
const QUICK_ACTIONS = [
  { label: 'Get 3 facts', prompt: 'Give me 3 interesting facts about this topic that students would find engaging.' },
  { label: 'Explain simply', prompt: 'Explain this concept in simpler terms suitable for the students.' },
  { label: 'Answer question', prompt: 'A student asked about this. How should I answer?' },
] as const;
```

### Privacy Indicator Component
```typescript
// UX-03: Teacher-only visibility indicator
const PrivacyIndicator = () => (
  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded text-[10px] text-slate-400">
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
    <span>Not visible to students</span>
  </div>
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| EventSource for SSE | fetch + ReadableStream | 2023 | EventSource only supports GET; fetch needed for POST with headers |
| document.execCommand('copy') | navigator.clipboard.writeText | 2020 | execCommand deprecated, writeText is async and secure |
| setInterval for animation | requestAnimationFrame | Standard | 60fps smooth animation, battery efficient |
| Chunky streaming display | Buffer + animate pattern | 2025 | Required for LLM responses to feel natural |

**Deprecated/outdated:**
- **EventSource for LLM APIs:** All major LLM providers require POST; EventSource only supports GET
- **Anthropic SDK in browser:** While @anthropic-ai/sdk exists, it doesn't support browser CORS. Continue using raw fetch with `anthropic-dangerous-direct-browser-access` header as in existing claudeProvider.ts

## Open Questions

Things that couldn't be fully resolved:

1. **Conversation History Persistence**
   - What we know: Requirements say "session-only history (not persisted to .cue files)"
   - What's unclear: Should history survive slide navigation? Survive verbosity changes?
   - Recommendation: Clear history on slide change, keep during verbosity regeneration. Start with no history (single turn) and iterate if users request multi-turn.

2. **Context Window Size**
   - What we know: Full cumulative content can be large (10+ slides)
   - What's unclear: When to truncate context to avoid token limits
   - Recommendation: Include current slide + 2 previous slides. If lesson topic available, include that. Monitor for 400 errors from context overflow.

3. **Keyboard Navigation Passthrough**
   - What we know: Panel must not steal arrow key focus
   - What's unclear: Exact implementation for textarea that allows typing but passes navigation
   - Recommendation: Use single-line input (not textarea), blur on Enter/send, re-enable navigation on blur.

## Sources

### Primary (HIGH confidence)
- [Google GenAI SDK generateContentStream](https://github.com/googleapis/js-genai/blob/main/sdk-samples/generate_content_streaming.ts) - Official streaming sample
- [Anthropic Streaming Messages API](https://platform.claude.com/docs/en/api/messages-streaming) - SSE event types and format
- Existing codebase: `services/providers/claudeProvider.ts` - Current Claude integration pattern
- Existing codebase: `services/providers/geminiProvider.ts` - Current Gemini integration pattern

### Secondary (MEDIUM confidence)
- [Upstash Smooth Streaming](https://upstash.com/blog/smooth-streaming) - Buffer + animate pattern for AI SDK
- [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) - navigator.clipboard.writeText
- [fetch-event-stream](https://github.com/lukeed/fetch-event-stream) - SSE parsing pattern reference

### Tertiary (LOW confidence)
- WebSearch results on React typewriter effects - various implementation approaches, not verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All APIs verified in official documentation and existing codebase
- Architecture: HIGH - Patterns align with existing codebase structure
- Pitfalls: MEDIUM - Based on common streaming issues, verified against requirements
- Code examples: HIGH - Based on official SDK docs and existing codebase patterns

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable APIs)
