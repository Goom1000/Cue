# Architecture Integration: Pedagogical Slide Types

**Domain:** Presentation editing and interactive classroom slides
**Researched:** 2026-01-25
**Confidence:** HIGH

## Executive Summary

The new pedagogical slide types (Elaborate, Work Together, Class Challenge) and single teleprompter regeneration integrate cleanly with Cue's existing architecture. All three slide insertion types follow the established pattern: extend the InsertPoint dropdown menu, add AI provider methods, and handle async generation with loading states. Class Challenge requires a new interactive slide type with teacher-controlled input and BroadcastChannel sync to student view. Single teleprompter regeneration leverages existing `regenerateTeleprompter()` method with slide-level caching.

**Key insight:** The architecture is already optimized for these features. The InsertPoint component, AI provider interface, and BroadcastChannel sync pattern provide all necessary extension points.

## Integration Point 1: Slide Insertion Menu Extension

### Current Implementation

**Location:** `/App.tsx` lines 29-66

```typescript
const InsertPoint = ({ onClickBlank, onClickExemplar }: {
  onClickBlank: () => void,
  onClickExemplar: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="group/insert py-1 flex items-center justify-center">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)}>+</button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => { onClickBlank(); setIsOpen(false); }}>
            Blank
          </button>
          <button onClick={() => { onClickExemplar(); setIsOpen(false); }}>
            Exemplar
          </button>
        </div>
      )}
    </div>
  );
};
```

**Usage pattern:** Appears between every slide thumbnail in the sidebar (lines 1181-1186).

### Required Changes

**Component signature extension:**
```typescript
const InsertPoint = ({
  onClickBlank,
  onClickExemplar,
  onClickElaborate,      // NEW
  onClickWorkTogether,   // NEW
  onClickClassChallenge  // NEW
}: {
  onClickBlank: () => void,
  onClickExemplar: () => void,
  onClickElaborate: () => void,
  onClickWorkTogether: () => void,
  onClickClassChallenge: () => void
}) => {
```

**UI expansion:**
- Current: 2-button horizontal layout fits in rounded pill
- New: 5 buttons requires either:
  - **Option A:** Vertical dropdown list (recommended for 5+ options)
  - **Option B:** Two-row horizontal grid
  - **Option C:** Icon-only buttons with tooltips

**Recommendation:** Vertical dropdown with icons + labels:
```
+ button click reveals:
┌─────────────────────┐
│ 📄 Blank            │
│ 💡 Exemplar         │
│ 📖 Elaborate        │  ← NEW
│ 👥 Work Together    │  ← NEW
│ 🎯 Class Challenge  │  ← NEW
└─────────────────────┘
```

### Implementation Impact

| Component | Change Type | Complexity |
|-----------|-------------|------------|
| `InsertPoint` | Modify (add 3 props) | Low |
| `App.tsx` line 1182-1183 | Add 3 handler calls | Low |
| `App.tsx` line 1149-1150 | Add 3 handler calls | Low |

**Build order:** Extend InsertPoint UI first, then add placeholder handlers that insert blank slides with TODO markers.

## Integration Point 2: AI Provider Interface Extension

### Current Pattern

**Location:** `/services/aiProvider.ts` lines 170-211

```typescript
export interface AIProviderInterface {
  generateExemplarSlide(lessonTopic: string, prevSlide: Slide): Promise<Slide>;
  // ... other methods
}
```

**Existing exemplar generation:** `handleInsertExemplarSlide()` in `App.tsx` lines 412-453:
1. Creates temp slide with loading state
2. Calls `provider.generateExemplarSlide(lessonTitle, prevSlide)`
3. Updates temp slide with result
4. Auto-generates image if enabled

### Required Provider Methods

```typescript
export interface AIProviderInterface {
  // ... existing methods

  // Generate comprehensive elaboration of current slide
  generateElaborateSlide(
    lessonTopic: string,
    currentSlide: Slide,
    prevSlides: Slide[]  // For cumulative context
  ): Promise<Slide>;

  // Generate collaborative activity slide
  generateWorkTogetherSlide(
    lessonTopic: string,
    currentSlide: Slide,
    prevSlides: Slide[]
  ): Promise<Slide>;

  // Generate Class Challenge prompt slide
  generateClassChallengeSlide(
    lessonTopic: string,
    currentSlide: Slide,
    prevSlides: Slide[]
  ): Promise<Slide>;
}
```

### Implementation in Both Providers

**Gemini:** `/services/providers/geminiProvider.ts`
**Claude:** `/services/providers/claudeProvider.ts`

Both providers must implement all three methods. Follow existing `generateExemplarSlide()` pattern:

1. Build context from previous slides
2. Send structured prompt to AI
3. Parse JSON response into Slide object
4. Handle errors with AIProviderError

**Prompt structure for Elaborate:**
```
You are generating a comprehensive elaboration slide for a Year 6 lesson.

Current slide: [title, content]
Previous slides: [titles and bullet points]

Generate a slide that:
- Provides deeper explanation beyond bullet points
- Uses concrete examples and analogies
- Maintains Year 6 reading level
- Has 3-4 detailed bullet points
- Includes visual description for image generation
```

**Prompt structure for Work Together:**
```
Generate a collaborative pair activity slide.

Constraints:
- Uses only basic resources (pen/paper/whiteboard)
- Designed for pairs (with group-of-3 alternative)
- Related to current topic
- Clear instructions visible to students
- Facilitation notes in speakerNotes
```

**Prompt structure for Class Challenge:**
```
Generate an interactive class participation prompt.

Format:
- Single engaging question (e.g., "Can you suggest modal verbs?")
- Designed to elicit multiple student responses
- Related to current lesson content
- SpeakerNotes contain facilitation tips
```

### Implementation Impact

| File | Method Count | Complexity |
|------|--------------|------------|
| `aiProvider.ts` | +3 interface methods | Low |
| `geminiProvider.ts` | +3 implementations | Medium |
| `claudeProvider.ts` | +3 implementations | Medium |

**Build order:** Add interface methods → Implement in Gemini → Implement in Claude → Test both providers.

## Integration Point 3: Class Challenge Interactive Slide Type

### Architecture Decision: Slide Type vs Slide Property

**Option A:** New discriminated union type
```typescript
export type SlideType =
  | { type: 'content'; slide: Slide }
  | { type: 'class-challenge'; slide: ChallengeSlide };
```

**Option B:** Add optional property to existing Slide type
```typescript
export interface Slide {
  // ... existing properties
  challengeData?: {
    prompt: string;
    responses: string[];  // Teacher-added during presentation
  };
}
```

**Recommendation:** Option B (extend Slide type)

**Rationale:**
- Cue uses flat Slide type everywhere (not discriminated unions for slide types)
- Challenge slides still have title, content, speakerNotes, imagePrompt
- Only difference: interactive input during presentation
- Simpler to save/load in existing .cue file format

### Data Structure

```typescript
export interface Slide {
  id: string;
  title: string;
  content: string[];
  speakerNotes: string;
  imagePrompt: string;
  imageUrl?: string;
  isGeneratingImage?: boolean;
  layout?: 'split' | 'full-image' | 'center-text' | 'flowchart' | 'grid' | 'tile-overlap';
  theme?: 'default' | 'purple' | 'blue' | 'green' | 'warm';
  hasQuestionFlag?: boolean;
  verbosityCache?: {
    concise?: string;
    detailed?: string;
  };

  // NEW: Class Challenge data
  challengeData?: {
    prompt: string;        // The question shown to students
    responses: string[];   // Teacher-added responses during presentation
    isLocked: boolean;     // True after moving to next slide (no more edits)
  };
}
```

### Teacher View UI (PresentationView)

**Location:** `/components/PresentationView.tsx`

**Current slide rendering:** Lines use `<SlideContentRenderer />` which handles all layouts.

**New rendering logic:**
```typescript
// In PresentationView's slide display area
const currentSlide = slides[currentIndex];

if (currentSlide.challengeData) {
  return (
    <ClassChallengeSlide
      slide={currentSlide}
      onAddResponse={(response: string) => {
        // Update slide in presentation state
        const updated = {
          ...currentSlide,
          challengeData: {
            ...currentSlide.challengeData,
            responses: [...currentSlide.challengeData.responses, response]
          }
        };
        onUpdateSlide(currentSlide.id, { challengeData: updated.challengeData });

        // Broadcast to student view
        broadcastMessage({
          type: 'CHALLENGE_UPDATE',
          payload: updated.challengeData
        });
      }}
      isLocked={currentSlide.challengeData.isLocked}
    />
  );
} else {
  return <SlideContentRenderer slide={currentSlide} />;
}
```

**ClassChallengeSlide component:**
```typescript
interface ClassChallengeSlideProps {
  slide: Slide;
  onAddResponse: (response: string) => void;
  isLocked: boolean;
}

const ClassChallengeSlide: React.FC<ClassChallengeSlideProps> = ({
  slide,
  onAddResponse,
  isLocked
}) => {
  const [input, setInput] = useState('');

  return (
    <div className="class-challenge">
      <h2>{slide.challengeData.prompt}</h2>

      <div className="responses-grid">
        {slide.challengeData.responses.map((response, idx) => (
          <div key={idx} className="response-card">
            {response}
          </div>
        ))}
      </div>

      {!isLocked && (
        <div className="input-area">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim()) {
                onAddResponse(input.trim());
                setInput('');
              }
            }}
            placeholder="Type student response and press Enter"
          />
        </div>
      )}
    </div>
  );
};
```

### Student View Sync

**Current sync pattern:** `/hooks/useBroadcastSync.ts` (lines 1-106)

PresentationView already uses BroadcastChannel for:
- Slide navigation (STATE_UPDATE)
- Game state (GAME_STATE_UPDATE)
- Student selection (STUDENT_SELECT)

**New message type:**
```typescript
export type PresentationMessage =
  | { type: 'STATE_UPDATE'; payload: PresentationState }
  | { type: 'GAME_STATE_UPDATE'; payload: GameState }
  | { type: 'STUDENT_SELECT'; payload: { studentName: string } }
  | { type: 'STUDENT_CLEAR' }
  | { type: 'CHALLENGE_UPDATE'; payload: ChallengeData }  // NEW
  | { type: 'CLOSE_STUDENT' }
  // ... other types
```

**Student view handler:** `/components/StudentView.tsx`

```typescript
// Add to message handler switch
case 'CHALLENGE_UPDATE':
  setChallengeData(message.payload);
  break;
```

**Student view rendering:**
```typescript
const StudentView = () => {
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);

  // If current slide is challenge, show challenge view
  if (currentSlide?.challengeData) {
    return (
      <div className="challenge-student-view">
        <h1>{currentSlide.challengeData.prompt}</h1>
        <div className="responses-grid">
          {currentSlide.challengeData.responses.map((response, idx) => (
            <div
              key={idx}
              className="response-card animate-pop-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {response}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Otherwise show normal slide content
  return <SlideContentRenderer slide={currentSlide} />;
};
```

### Locking Mechanism

**When to lock:** When teacher navigates away from challenge slide.

**Implementation in PresentationView:**
```typescript
// In navigation handler (keyboard or button)
const handleNavigation = (direction: 'next' | 'prev') => {
  const currentSlide = slides[currentIndex];

  // Lock challenge data when leaving slide
  if (currentSlide.challengeData && !currentSlide.challengeData.isLocked) {
    onUpdateSlide(currentSlide.id, {
      challengeData: {
        ...currentSlide.challengeData,
        isLocked: true
      }
    });
  }

  // Proceed with navigation
  if (direction === 'next') {
    setCurrentIndex(prev => Math.min(slides.length - 1, prev + 1));
  } else {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }
};
```

### Implementation Impact

| Component | Change Type | Complexity |
|-----------|-------------|------------|
| `types.ts` | Add challengeData to Slide | Low |
| `types.ts` | Add CHALLENGE_UPDATE message | Low |
| `PresentationView.tsx` | Add challenge rendering logic | Medium |
| `ClassChallengeSlide.tsx` | New component | Medium |
| `StudentView.tsx` | Add challenge rendering | Low |
| `useBroadcastSync` message handler | Add CHALLENGE_UPDATE case | Low |

**Build order:**
1. Add challengeData type to Slide
2. Create ClassChallengeSlide component (render only, no sync)
3. Integrate into PresentationView with local state
4. Add BroadcastChannel message type
5. Connect teacher input to student view sync
6. Add locking on navigation
7. Test with student window open

## Integration Point 4: Single Teleprompter Regeneration

### Current Implementation

**Full presentation regeneration:** `/components/PresentationView.tsx` lines 900-950

```typescript
const handleRegenerateTeleprompter = async (newVerbosity: VerbosityLevel) => {
  if (!provider) return;

  setIsRegenerating(true);
  setVerbosityLevel(newVerbosity);

  try {
    const newScript = await provider.regenerateTeleprompter(
      currentSlide,
      newVerbosity
    );

    // Update slide with new script
    onUpdateSlide(currentSlide.id, {
      verbosityCache: {
        ...currentSlide.verbosityCache,
        [newVerbosity]: newScript
      }
    });

    setRegeneratedScript(newScript);
  } catch (e) {
    onError('Regeneration Failed', 'Could not regenerate teleprompter');
  } finally {
    setIsRegenerating(false);
  }
};
```

**Key observations:**
- Method already exists: `provider.regenerateTeleprompter(slide, verbosity)`
- Returns Promise<string> (the new script)
- Updates slide's verbosityCache
- Caching prevents redundant AI calls

### Required Changes

**Option A:** Add "Regenerate" button to SlideCard (editing mode)

**Location:** `/components/SlideCard.tsx` (editing interface)

```typescript
// Add to SlideCard's header controls (near Magic Edit)
<button
  onClick={handleRegenerateScript}
  className="regenerate-button"
  disabled={isRegenerating}
>
  {isRegenerating ? 'Regenerating...' : 'Regenerate Script'}
</button>

const handleRegenerateScript = async () => {
  if (!isAIAvailable) {
    onRequestAI('regenerate teleprompter script');
    return;
  }

  setIsRegenerating(true);
  try {
    const newScript = await provider.regenerateTeleprompter(
      slide,
      'standard'  // Always regenerate at standard verbosity
    );

    // Update slide, clearing verbosity cache (content changed)
    onUpdate(slide.id, {
      speakerNotes: newScript,
      verbosityCache: undefined  // Clear cache on regeneration
    });
  } catch (e) {
    onRequestAI('regenerate teleprompter script');
  } finally {
    setIsRegenerating(false);
  }
};
```

**Option B:** Add "Regenerate" icon to PresentationView teleprompter panel

**Location:** `/components/PresentationView.tsx` teleprompter panel

**Rationale:** Teachers are more likely to want regeneration during presentation when they notice script doesn't match edited content.

```typescript
// In teleprompter panel (next to verbosity selector)
<div className="teleprompter-header">
  <div className="verbosity-selector">
    <button onClick={() => setVerbosity('concise')}>Concise</button>
    <button onClick={() => setVerbosity('standard')}>Standard</button>
    <button onClick={() => setVerbosity('detailed')}>Detailed</button>
  </div>

  {/* NEW: Regenerate button */}
  <button
    onClick={handleRegenerateSingleSlide}
    className="regenerate-icon"
    title="Regenerate script for this slide"
    disabled={isRegenerating}
  >
    {isRegenerating ? '⏳' : '🔄'}
  </button>
</div>

const handleRegenerateSingleSlide = async () => {
  if (!provider) {
    onRequestAI('regenerate teleprompter');
    return;
  }

  setIsRegenerating(true);

  try {
    const newScript = await provider.regenerateTeleprompter(
      currentSlide,
      verbosityLevel  // Use current verbosity
    );

    // Update the slide's speakerNotes at current verbosity level
    if (verbosityLevel === 'standard') {
      onUpdateSlide(currentSlide.id, {
        speakerNotes: newScript,
        verbosityCache: undefined  // Clear cache since content changed
      });
    } else {
      // If concise/detailed, update cache
      onUpdateSlide(currentSlide.id, {
        verbosityCache: {
          ...currentSlide.verbosityCache,
          [verbosityLevel]: newScript
        }
      });
    }

    setRegeneratedScript(newScript);
  } catch (e) {
    if (e instanceof AIProviderError) {
      onError('Regeneration Failed', e.userMessage);
    }
  } finally {
    setIsRegenerating(false);
  }
};
```

**Recommendation:** Option B (in PresentationView)

**Rationale:**
- Teleprompter is only visible during presentation
- Teachers notice outdated scripts during delivery, not editing
- Already have verbosity controls in same panel (UI consistency)
- Single-slide regeneration most useful mid-presentation

### Cache Invalidation Strategy

**Problem:** When teacher edits slide content, cached verbosity scripts become stale.

**Current behavior:** `/App.tsx` lines 317-336

```typescript
const handleUpdateSlide = useCallback((id: string, updates: Partial<Slide>) => {
  setSlides(prev => prev.map(s => {
    if (s.id !== id) return s;

    // Detect if content changed (invalidates verbosity cache)
    const contentChanged = updates.content !== undefined || updates.title !== undefined;

    // Special case: if only updating verbosityCache, preserve it
    const isOnlyCacheUpdate = Object.keys(updates).length === 1 && updates.verbosityCache !== undefined;

    return {
      ...s,
      ...updates,
      // Clear cache if content changed, unless this IS a cache update
      verbosityCache: contentChanged && !isOnlyCacheUpdate
        ? undefined
        : (updates.verbosityCache ?? s.verbosityCache),
    };
  }));
}, []);
```

**Strategy:** Cache is already auto-cleared on content edits. Single regeneration fills the cache for current verbosity level.

**Edge case:** If teacher edits content at Detailed verbosity, then switches to Standard, they see old Standard script.

**Solution:** Show "Content changed - regenerate?" indicator when cache is stale.

```typescript
// Add to Slide type
export interface Slide {
  // ... existing
  lastEditedAt?: number;  // Timestamp of last content edit
  cacheGeneratedAt?: number;  // Timestamp when cache was generated
}

// In teleprompter display
const isCacheStale = currentSlide.lastEditedAt && currentSlide.cacheGeneratedAt
  && currentSlide.lastEditedAt > currentSlide.cacheGeneratedAt;

{isCacheStale && (
  <div className="stale-warning">
    Content changed since last regeneration
    <button onClick={handleRegenerateSingleSlide}>Regenerate</button>
  </div>
)}
```

### Implementation Impact

| Component | Change Type | Complexity |
|-----------|-------------|------------|
| `PresentationView.tsx` | Add regenerate button + handler | Low |
| `types.ts` | Add timestamp fields (optional) | Low |
| Existing `regenerateTeleprompter()` | No changes needed | None |

**Build order:**
1. Add regenerate icon button to teleprompter panel
2. Wire up to existing `provider.regenerateTeleprompter()`
3. Test with verbosity switching
4. (Optional) Add staleness detection with timestamps

## Component Architecture Map

```
App.tsx (root state)
  ├─ InsertPoint component (extended with 5 options)
  │   ├─ onClickBlank() → handleInsertBlankSlide()
  │   ├─ onClickExemplar() → handleInsertExemplarSlide() [existing]
  │   ├─ onClickElaborate() → handleInsertElaborateSlide() [NEW]
  │   ├─ onClickWorkTogether() → handleInsertWorkTogetherSlide() [NEW]
  │   └─ onClickClassChallenge() → handleInsertClassChallengeSlide() [NEW]
  │
  └─ PresentationView (during presentation)
      ├─ Regular slide rendering (SlideContentRenderer)
      ├─ Class Challenge rendering (ClassChallengeSlide) [NEW]
      │   ├─ Teacher input for responses
      │   └─ BroadcastChannel sync → StudentView
      └─ Teleprompter panel
          ├─ Verbosity selector [existing]
          └─ Single regenerate button [NEW]

AIProvider interface
  ├─ generateExemplarSlide() [existing]
  ├─ generateElaborateSlide() [NEW]
  ├─ generateWorkTogetherSlide() [NEW]
  ├─ generateClassChallengeSlide() [NEW]
  └─ regenerateTeleprompter() [existing, reused]

BroadcastChannel messages
  ├─ STATE_UPDATE (slide navigation) [existing]
  ├─ GAME_STATE_UPDATE [existing]
  └─ CHALLENGE_UPDATE (responses sync) [NEW]
```

## Data Flow Diagrams

### Flow 1: Elaborate Slide Insertion

```
User clicks InsertPoint "+"
  → Opens dropdown menu
  → User clicks "Elaborate"
  → handleInsertElaborateSlide(index)
      ├─ Create temp slide with "Generating..." state
      ├─ Insert temp slide at index+1
      ├─ Call provider.generateElaborateSlide(topic, currentSlide, prevSlides)
      │   └─ AI returns Slide object with comprehensive content
      ├─ Replace temp slide with generated slide
      └─ Auto-generate image (if enabled)
```

### Flow 2: Class Challenge Live Input

```
Teacher navigates to Challenge slide
  → PresentationView detects slide.challengeData exists
  → Renders ClassChallengeSlide component
  → Shows prompt + existing responses + input field

Teacher types response + presses Enter
  → onAddResponse("modal verb")
      ├─ Update local slide state (add to responses array)
      ├─ Call onUpdateSlide() to persist in App state
      └─ Broadcast CHALLENGE_UPDATE message
          └─ StudentView receives message
              └─ Adds response card with pop-in animation
```

### Flow 3: Single Teleprompter Regeneration

```
Teacher in PresentationView with verbosity = 'detailed'
  → Clicks regenerate button (🔄)
  → handleRegenerateSingleSlide()
      ├─ Call provider.regenerateTeleprompter(currentSlide, 'detailed')
      │   └─ AI returns new script at detailed verbosity
      ├─ Update slide.verbosityCache.detailed = newScript
      └─ Display regenerated script in teleprompter panel
```

## Build Order Recommendations

### Phase 1: UI Extensions (No AI)
**Goal:** Extend menus and placeholders

1. Extend InsertPoint dropdown to 5 options
2. Add placeholder handlers that insert blank slides
3. Add regenerate button to teleprompter panel (disabled)
4. Test UI interactions

**Validation:** All new buttons visible and clickable (no-ops OK).

### Phase 2: AI Provider Extensions
**Goal:** Generate new slide types

1. Add 3 new methods to AIProviderInterface
2. Implement in GeminiProvider
3. Implement in ClaudeProvider
4. Wire up InsertPoint handlers to call AI
5. Test generation for Elaborate/WorkTogether/ClassChallenge

**Validation:** Each slide type generates appropriate content.

### Phase 3: Class Challenge Interactivity
**Goal:** Live input with sync

1. Add challengeData to Slide type
2. Create ClassChallengeSlide component (teacher view)
3. Add CHALLENGE_UPDATE message type
4. Integrate ClassChallengeSlide into PresentationView
5. Add challenge rendering to StudentView
6. Implement BroadcastChannel sync
7. Add locking on navigation

**Validation:** Teacher adds responses → appear on student view in real-time.

### Phase 4: Single Regeneration
**Goal:** Refresh individual scripts

1. Wire regenerate button to existing `regenerateTeleprompter()`
2. Handle cache updates for current verbosity
3. Add loading state during regeneration
4. (Optional) Add staleness detection

**Validation:** Clicking regenerate updates teleprompter without affecting other slides.

## Suggested Phase Structure for Roadmap

Based on dependency analysis:

### Phase A: Slide Insertion Extension (Elaborate, Work Together, Class Challenge)
**Why first:** Extends existing pattern, no new architecture concepts

- Extend InsertPoint UI (5 options)
- Add 3 AI provider methods
- Implement in both providers
- Wire up handlers in App.tsx

**Dependencies:** None (pure extension of existing insertion pattern)

### Phase B: Class Challenge Interactivity
**Why second:** Requires Phase A's Class Challenge slide type

- Add challengeData type
- Create ClassChallengeSlide component
- Implement BroadcastChannel sync
- Add student view rendering
- Implement locking mechanism

**Dependencies:** Phase A (needs Class Challenge slide generator)

### Phase C: Single Teleprompter Regeneration
**Why third:** Independent feature, can be last

- Add regenerate button to teleprompter panel
- Wire to existing `regenerateTeleprompter()`
- Handle verbosity cache updates
- (Optional) Add staleness detection

**Dependencies:** None (reuses existing method)

**Alternative ordering:** Phase C could be first (simplest, no AI changes). But Phase A provides more user value and tests AI provider extensibility.

## Architectural Risks & Mitigations

### Risk 1: InsertPoint UI Complexity
**Problem:** 5 options may not fit in existing horizontal pill layout

**Mitigation:** Switch to vertical dropdown list with icons. Modern pattern for 5+ options.

**Validation:** Prototype UI in Figma/CodePen before implementing.

### Risk 2: Class Challenge State Management
**Problem:** Responses added during presentation must persist if teacher navigates back

**Mitigation:** Store responses in slide state (not local component state). Existing slide updates already persist in App state.

**Validation:** Add response → navigate away → navigate back → response still visible.

### Risk 3: BroadcastChannel Sync Latency
**Problem:** Student view might lag behind teacher input

**Mitigation:** BroadcastChannel is already used for game state sync with <100ms latency. Challenge updates are smaller payloads than game state.

**Validation:** Test with actual student window on separate monitor. Measure latency from keypress to student view update.

### Risk 4: Cache Staleness After Edit
**Problem:** Teacher edits content at Detailed verbosity, switches to Standard, sees old Standard script

**Current behavior:** Cache auto-clears on content edit (good!)

**Enhancement:** Show "Content changed since last regeneration" warning when switching to cached verbosity after edit.

**Mitigation:** Add timestamps to detect staleness. Low complexity addition.

## Performance Considerations

### AI Generation Load
**Class Challenge:** Single prompt generation (low load, ~1s)
**Elaborate/WorkTogether:** Similar to Exemplar (existing pattern, ~2-3s)
**Single Regeneration:** Same as full verbosity toggle (~1-2s)

**Recommendation:** All features use existing retry + error handling patterns. No new performance concerns.

### BroadcastChannel Message Size
**Challenge responses:** Array of strings (<1KB per message)
**Existing game state:** Complex objects with arrays (~2-5KB)

**Recommendation:** Challenge updates are smaller than existing game state. No performance concern.

### UI Responsiveness
**5-option dropdown:** More DOM nodes, but trivial (<100 elements)
**Challenge response cards:** Animate on add (CSS transitions, GPU-accelerated)

**Recommendation:** No performance impact. Modern browsers handle this easily.

## Existing Patterns to Follow

### 1. Async AI Generation with Loading State
**Example:** `handleInsertExemplarSlide()` (App.tsx lines 412-453)

```typescript
const handleInsertNewSlideType = async (index: number) => {
  if (!provider) {
    setErrorModal({ title: 'AI Not Configured', message: '...' });
    return;
  }

  // 1. Create temp slide with loading state
  const tempId = `temp-${Date.now()}`;
  const tempSlide: Slide = {
    id: tempId,
    title: "Generating...",
    content: ["Loading..."],
    speakerNotes: "",
    imagePrompt: "",
    isGeneratingImage: true,
    layout: 'split'
  };

  // 2. Insert temp slide
  const newSlides = [...slides];
  newSlides.splice(index + 1, 0, tempSlide);
  setSlides(newSlides);
  setActiveSlideIndex(index + 1);

  // 3. Generate with AI
  try {
    const generated = await provider.generateNewSlideType(lessonTitle, currentSlide);
    setSlides(curr => curr.map(s =>
      s.id === tempId
        ? { ...generated, id: tempId, isGeneratingImage: autoGenerateImages }
        : s
    ));

    // 4. Auto-generate image
    if (autoGenerateImages) {
      const img = await provider.generateSlideImage(generated.imagePrompt, generated.layout);
      setSlides(curr => curr.map(s =>
        s.id === tempId
          ? { ...s, imageUrl: img, isGeneratingImage: false }
          : s
      ));
    }
  } catch (err) {
    console.error("Generation error:", err);
    // Fallback to blank slide
    setSlides(curr => curr.map(s =>
      s.id === tempId
        ? { ...tempSlide, title: "Custom Slide", isGeneratingImage: false }
        : s
    ));
    if (err instanceof AIProviderError) {
      setErrorModal({ title: 'Generation Failed', message: err.userMessage });
    }
  }
};
```

### 2. BroadcastChannel Message Handling
**Example:** PresentationView sync pattern

```typescript
// In PresentationView
const { postMessage } = useBroadcastSync<PresentationMessage>(
  BROADCAST_CHANNEL_NAME
);

// When state changes
useEffect(() => {
  postMessage({
    type: 'CHALLENGE_UPDATE',
    payload: currentSlide.challengeData
  });
}, [currentSlide.challengeData]);

// In StudentView
const { lastMessage } = useBroadcastSync<PresentationMessage>(
  BROADCAST_CHANNEL_NAME
);

useEffect(() => {
  if (lastMessage?.type === 'CHALLENGE_UPDATE') {
    setChallengeData(lastMessage.payload);
  }
}, [lastMessage]);
```

### 3. Conditional Rendering Based on Slide Properties
**Example:** hasQuestionFlag in SlideCard (SlideCard.tsx lines 58-63)

```typescript
{slide.hasQuestionFlag && (
  <div className="bg-amber-400 text-slate-900 text-[10px]">
    Question Focus Slide
  </div>
)}

// Apply same pattern for challengeData
{slide.challengeData && (
  <ClassChallengeSlide slide={slide} onAddResponse={...} />
)}
```

## Testing Strategy

### Unit Testing (Manual for MVP)
1. InsertPoint renders 5 options
2. Each insertion handler creates correct slide structure
3. AI provider methods return valid Slide objects
4. Challenge data updates propagate through state

### Integration Testing
1. Insert Elaborate → generates comprehensive content → image auto-generates
2. Insert Work Together → generates activity → teleprompter shows facilitation notes
3. Insert Class Challenge → teacher adds responses → student view updates
4. Single regenerate → updates current slide only → other slides unchanged

### Cross-Browser Testing
**BroadcastChannel support:**
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (since iOS 15.4)

**Window Management API (existing feature):**
- Chrome/Edge only (Class Challenge doesn't need this)

**Recommendation:** Class Challenge should work on all browsers (uses standard BroadcastChannel).

## Backward Compatibility

### File Format
**Current:** .cue file version 2 (supports verbosityCache)

**New fields:**
- `challengeData?: { prompt, responses, isLocked }`

**Migration:** Optional field, v2 files without challengeData load normally.

**Recommendation:** No version bump needed. ChallengeData is optional extension.

### API Changes
**New methods:** 3 additions to AIProviderInterface

**Breaking change?** No - existing code doesn't call these methods.

**Recommendation:** Increment minor version (v3.2 or v4.0 depending on scope).

## Summary: Integration Checklist

- [ ] **InsertPoint UI:** Extend to 5 options (vertical dropdown recommended)
- [ ] **AI Provider Interface:** Add 3 methods (generateElaborateSlide, generateWorkTogetherSlide, generateClassChallengeSlide)
- [ ] **Provider Implementations:** Implement in GeminiProvider and ClaudeProvider
- [ ] **App.tsx Handlers:** Add 3 insertion handlers following exemplar pattern
- [ ] **Slide Type Extension:** Add optional challengeData to Slide interface
- [ ] **ClassChallengeSlide Component:** Create new component for teacher input
- [ ] **BroadcastChannel Message:** Add CHALLENGE_UPDATE type
- [ ] **PresentationView Logic:** Add conditional rendering for challenge slides
- [ ] **StudentView Rendering:** Add challenge display with animation
- [ ] **Locking Mechanism:** Lock challenge on navigation away
- [ ] **Teleprompter Regenerate:** Add button + handler using existing method
- [ ] **Cache Management:** Update verbosityCache on single regeneration
- [ ] **(Optional) Staleness Detection:** Add timestamps to detect cache staleness

## Open Questions for Phase Planning

1. **InsertPoint Layout:** Vertical dropdown or horizontal 2-row grid?
   - Recommendation: Vertical for scalability

2. **Class Challenge Export:** Should responses persist in .cue file?
   - Recommendation: Yes (already in challengeData design)

3. **Regenerate Button Placement:** Editing view or presentation view?
   - Recommendation: Presentation view (teachers notice stale scripts mid-lesson)

4. **Staleness Indicator:** Show warning when cache is outdated?
   - Recommendation: Yes, but defer to later phase (not critical for MVP)

5. **Challenge Response Editing:** Can teacher edit/delete responses after adding?
   - Recommendation: Yes for unlocked slides, no for locked slides

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| InsertPoint Extension | HIGH | Clear pattern, low complexity |
| AI Provider Methods | HIGH | Follows exemplar pattern exactly |
| Class Challenge Architecture | HIGH | BroadcastChannel already proven with games |
| Single Regeneration | HIGH | Reuses existing method, minimal changes |
| Build Order | MEDIUM | Dependencies clear but ordering flexible |

## Sources

**HIGH confidence sources:**
- App.tsx (examined InsertPoint, exemplar insertion, slide update logic)
- types.ts (reviewed Slide structure, message types)
- aiProvider.ts (confirmed interface patterns, regenerateTeleprompter exists)
- useBroadcastSync.ts (verified sync mechanism)
- PresentationView.tsx (examined verbosity toggle, game state sync)
- SlideCard.tsx (reviewed slide editing patterns)
- TODO documents (feature requirements from planning/)

**Architecture verified by code inspection:** All integration points confirmed to exist in codebase.
