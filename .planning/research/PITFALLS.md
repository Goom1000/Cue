# Domain Pitfalls: Adding Pedagogical Slide Types to Cue

**Domain:** AI-generated contextual slides, live interactive features, partial content regeneration
**Project:** Cue v3.2 - Pedagogical Slide Types
**Researched:** 2026-01-25
**Confidence:** HIGH (based on existing Cue architecture analysis, verbosity caching patterns, BroadcastChannel implementation, and 2026 web research)

---

## Executive Summary

This research identifies pitfalls specific to adding four new features to Cue's existing 17,000 LOC presentation system:
1. **Elaborate slides** - AI-generated contextual expansion slides
2. **Work Together slides** - AI-generated collaborative activity slides
3. **Class Challenge slides** - Live interactive slides capturing student contributions
4. **Single teleprompter regenerate** - Partial content regeneration for manually-edited slides

**Critical insight:** All four features integrate with existing systems (AI generation, BroadcastChannel sync, slide state management, caching). Integration complexity is higher than greenfield development. The verbosity caching system (v3.1) provides a successful pattern to follow, but also reveals pitfalls around cache invalidation and state synchronization.

---

## Critical Pitfalls

Mistakes that cause data loss, broken presentations, or require architectural rewrites.

---

### Pitfall 1: Cache Invalidation on Manual Edit Creates Orphaned Data

**What goes wrong:**
When adding "single teleprompter regenerate" to slides that were manually edited, the cache invalidation logic conflicts with manual overrides:

```typescript
// Current v3.1 cache invalidation (App.tsx:321-334)
const contentChanged = updates.content !== undefined || updates.title !== undefined;
const isOnlyCacheUpdate = Object.keys(updates).length === 1 && updates.verbosityCache !== undefined;

return {
  ...s,
  ...updates,
  verbosityCache: contentChanged && !isOnlyCacheUpdate
    ? undefined  // CLEARS entire cache
    : (updates.verbosityCache ?? s.verbosityCache),
};
```

**The trap with single regenerate:**
1. Teacher manually edits slide content
2. Cache gets cleared (verbosityCache becomes undefined)
3. Teacher clicks "Regenerate Teleprompter" button
4. AI generates new teleprompter based on manually-edited content
5. Where does this new teleprompter go? speakerNotes or verbosityCache.standard?
6. If speakerNotes: next verbosity switch regenerates from scratch (loses manual context)
7. If verbosityCache.standard: contradicts current pattern (standard = speakerNotes)

**Why it happens:**
- v3.1 assumed speakerNotes is immutable (original AI generation)
- v3.1 cache pattern: standard = speakerNotes, cache only concise/detailed
- Single regenerate breaks this assumption (speakerNotes becomes mutable)
- No concept of "manual override flag" vs "AI-generated flag"

**Consequences:**
- Regenerated teleprompter disappears on next content edit
- Verbosity switching produces inconsistent results
- Teacher loses AI-regenerated work after manual edits
- Cache and source-of-truth diverge

**Warning signs in code:**
- Reusing verbosityCache for single regenerate without extending the pattern
- No tracking of which teleprompter source is "canonical"
- Clearing entire cache on any content change
- Assumption that speakerNotes is always the "original" version

**Prevention strategy:**

Option A: Extend cache to track manual regeneration
```typescript
// Add to Slide interface
interface Slide {
  // ...existing fields
  verbosityCache?: {
    concise?: string;
    detailed?: string;
    // NEW: track manually-regenerated standard version
    standardManual?: string;
  };
  // NEW: flag which teleprompter is active
  activeTeleprompterSource?: 'original' | 'manual-regen' | 'verbosity';
}

// Cache invalidation becomes more nuanced
if (contentChanged) {
  // Clear verbosity cache but preserve manual regen flag
  return {
    ...s,
    ...updates,
    verbosityCache: s.activeTeleprompterSource === 'manual-regen'
      ? { standardManual: s.verbosityCache?.standardManual } // preserve manual
      : undefined, // clear all
    activeTeleprompterSource: undefined, // reset to original
  };
}
```

Option B: Separate teleprompter state from cache
```typescript
interface Slide {
  speakerNotes: string;  // Original AI generation (immutable)
  verbosityCache?: { concise?: string; detailed?: string };
  // NEW: separate field for manual overrides
  manualTeleprompter?: string;
  teleprompterSource: 'original' | 'manual';  // Which to display
}

// Single regenerate updates manualTeleprompter
// Content edits clear manualTeleprompter
// Verbosity switches ignore manualTeleprompter
```

**Which phase should address this:** Phase 1 (Single Teleprompter Regenerate) - must solve before implementation

**Sources:**
- [React Query Cache Invalidation: Why Your Mutations Work But Your UI Doesn't Update](https://medium.com/@kennediowusu/react-query-cache-invalidation-why-your-mutations-work-but-your-ui-doesnt-update-a1ad23bc7ef1) - cache invalidation strategies
- [Managing Query Keys for Cache Invalidation](https://www.wisp.blog/blog/managing-query-keys-for-cache-invalidation-in-react-query) - "no built-in way to catch missing invalidations"

---

### Pitfall 2: AI Context Awareness Degrades with Slide Insertion

**What goes wrong:**
When generating "Elaborate" or "Work Together" slides that should expand on the current slide, the AI lacks sufficient context:

```typescript
// Current generateExemplarSlide pattern (App.tsx uses this for insertions)
await provider.generateExemplarSlide(lessonTopic, prevSlide);
```

**The trap:**
1. Teacher inserts "Elaborate" slide after slide 5 of 15
2. AI receives only: lessonTopic (from first slide title) + prevSlide (slide 5 content)
3. AI doesn't know: slides 1-4 context, slides 6-15 upcoming topics
4. Generated "Elaborate" slide may:
   - Repeat content from slides 1-4 (AI didn't see them)
   - Contradict slides 6-15 (AI doesn't know what's coming)
   - Miss connections between current topic and lesson arc

**Why it happens:**
- Context7 and WebSearch show "AI still struggles when missing too much context"
- Current insertion pattern only passes prevSlide (one slide of context)
- No cumulative lesson context like quiz generation uses
- 2026 research: "AI-generated decks often lack strategic soul and narrative nuances"

**Example failure scenario:**
```
Slide 3: "Photosynthesis uses light energy"
Slide 4: "Chlorophyll absorbs light"
[Teacher inserts "Elaborate" here]
Slide 5: "Light-independent reactions (Calvin cycle)"

Generated Elaborate slide might repeat Slide 3 content instead of bridging to Slide 5,
because AI only saw Slide 4 in isolation.
```

**Consequences:**
- Generated slides feel generic and disconnected
- Teachers delete and regenerate multiple times (wasted API calls)
- Loss of trust in AI quality ("it doesn't understand my lesson")
- Pedagogical flow broken by tangent content

**Warning signs in code:**
- Passing single slide to AI generation
- No buildSlideContext() call for inserted slides
- Missing cumulativeContent from previous slides
- No lookahead to next slide for coherence

**Prevention strategy:**

```typescript
// Reuse buildSlideContext pattern from quiz generation (aiProvider.ts:57-69)
export function buildSlideContext(slides: Slide[], currentIndex: number): SlideContext {
  const relevantSlides = slides.slice(0, currentIndex + 1);
  const cumulativeContent = relevantSlides
    .map((s, i) => `Slide ${i + 1} (${s.title}): ${s.content.join('; ')}`)
    .join('\n\n');

  return {
    lessonTopic: slides[0]?.title || 'Unknown Topic',
    cumulativeContent,
    currentSlideTitle: slides[currentIndex]?.title || 'Current Slide',
    currentSlideContent: slides[currentIndex]?.content || []
  };
}

// Extend AIProviderInterface for contextual slides
interface AIProviderInterface {
  generateElaborateSlide(
    slideContext: SlideContext,  // Not just prevSlide
    nextSlide?: Slide,           // Optional lookahead
    userInstruction?: string     // "Focus on visual examples"
  ): Promise<Slide>;

  generateWorkTogetherSlide(
    slideContext: SlideContext,
    groupSize: number,
    activityType: 'pair' | 'group' | 'class'
  ): Promise<Slide>;
}

// In insertion handler
const slideContext = buildSlideContext(slides, insertionIndex);
const nextSlide = slides[insertionIndex + 1]; // Lookahead
const newSlide = await provider.generateElaborateSlide(slideContext, nextSlide);
```

**Which phase should address this:** Phase 2 (Elaborate Slide) and Phase 3 (Work Together Slide) - before implementation

**Sources:**
- [Best AI Presentation Makers 2026](https://plusai.com/blog/best-ai-presentation-makers) - "AI struggles when missing context, lacks strategic soul"
- [AI Content Generation 2026](https://www.roboticmarketer.com/ai-content-generation-in-2026-brand-voice-strategy-and-scaling/) - "Hallucinations and tone mismatches plague unchecked AI"

---

### Pitfall 3: BroadcastChannel Race Condition on Live Student Input

**What goes wrong:**
Class Challenge slides capture live student contributions. Multiple students submit simultaneously via BroadcastChannel, but messages arrive out of order or collide:

```typescript
// Current BroadcastChannel pattern (fire-and-forget)
postMessage({ type: 'PRESENTATION_UPDATE', currentIndex, visibleBullets, slides });

// For live input, this doesn't work:
postMessage({ type: 'STUDENT_CONTRIBUTION', studentName, contribution });
// ❌ No ordering guarantee
// ❌ No conflict resolution if two students submit simultaneously
// ❌ No acknowledgment that message was received
```

**The trap:**
1. Teacher launches Class Challenge: "Share one word about photosynthesis"
2. Student 1 types "chlorophyll" and submits
3. Student 2 types "sunlight" and submits (0.1 seconds later)
4. BroadcastChannel delivers messages asynchronously
5. Teacher's state updates: `contributions = ['chlorophyll']`
6. Second message arrives: `contributions = ['sunlight']` (overwrites, not appends)
7. Only one contribution appears on screen

**Why it happens:**
- BroadcastChannel spec: "browsers actually perform async steps... for performance reasons"
- No built-in message ordering or conflict resolution
- React state updates are batched and may be stale
- WebSearch findings: "race conditions often overlooked, leading to data inconsistency"

**Real-world example from research:**
> "To collect the list for every postMessage() would involve messaging every process in the browser for each message, so instead browsers register BC objects in a central place using IPC." - WHATWG HTML Issue #7267

**Consequences:**
- Lost student contributions (some never appear)
- Duplicate contributions (retry logic causes duplicates)
- Out-of-order display ("sunlight" appears before "chlorophyll")
- Teacher sees 8 contributions, but 15 students submitted
- Data inconsistency across teacher/student views

**Warning signs in code:**
- Direct state replacement instead of append/merge operations
- No timestamp or sequence number on messages
- Missing conflict resolution strategy
- No acknowledgment or retry mechanism

**Prevention strategy:**

```typescript
// Strategy 1: Append-only with timestamps
interface StudentContributionMessage {
  type: 'STUDENT_CONTRIBUTION';
  contributionId: string;      // crypto.randomUUID()
  timestamp: number;           // Date.now()
  studentName: string;
  contribution: string;
}

// Teacher's reducer-style state update
const handleContributionMessage = (msg: StudentContributionMessage) => {
  setContributions(prev => {
    // Deduplicate by ID
    if (prev.some(c => c.id === msg.contributionId)) {
      return prev; // Already have this one
    }

    // Append and sort by timestamp
    const updated = [...prev, {
      id: msg.contributionId,
      name: msg.studentName,
      text: msg.contribution,
      timestamp: msg.timestamp
    }];

    return updated.sort((a, b) => a.timestamp - b.timestamp);
  });
};

// Strategy 2: Server-side ordering (requires backend) - NOT VIABLE for Cue
// Cue is client-side only, so must handle ordering in teacher view

// Strategy 3: Event cache to prevent loss
const contributionCache = useRef<StudentContributionMessage[]>([]);

useEffect(() => {
  if (!lastMessage) return;

  if (lastMessage.type === 'STUDENT_CONTRIBUTION') {
    // Cache before processing
    contributionCache.current.push(lastMessage);
    handleContributionMessage(lastMessage);
  }
}, [lastMessage]);

// On Class Challenge close, verify all cached messages were processed
```

**Which phase should address this:** Phase 4 (Class Challenge) - critical for data integrity

**Sources:**
- [BroadcastChannel spec vague about async nature](https://github.com/whatwg/html/issues/7267) - ordering not guaranteed
- [Handling Race Conditions in Real-Time Apps](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8) - "event cache solutions needed"
- [Real-Time Collaboration with BroadcastChannel API](https://www.slingacademy.com/article/real-time-collaboration-with-broadcast-channel-api-in-javascript/) - "define your own protocol"

---

### Pitfall 4: Presentation State Sync Breaks with New Slide Types

**What goes wrong:**
Adding new slide types (Elaborate, Work Together, Class Challenge) without extending the PresentationState interface:

```typescript
// Current sync pattern (types.ts:27-31)
export interface PresentationState {
  currentIndex: number;
  visibleBullets: number;
  slides: Slide[];  // Assumes all slides are standard presentation slides
}

// New slide types need additional state:
// - Class Challenge: active contributions, voting status, timer
// - Work Together: group assignments, activity phase
// - Elaborate: expanded/collapsed state?
```

**The trap:**
1. Teacher inserts Class Challenge slide at index 5
2. Students submit contributions via BroadcastChannel
3. Teacher navigates to slide 6, then back to slide 5
4. Contributions are lost (not in PresentationState.slides)
5. Student view shows stale state (no contributions)

**Why it happens:**
- PresentationState designed for one-way sync (teacher → student)
- No concept of "slide-specific ephemeral state"
- Contributions live in component state, not PresentationState
- BroadcastChannel sync is atomic snapshot (no partial updates)

**Concrete failure:**
```typescript
// In PresentationView.tsx, teacher's component state:
const [challengeContributions, setChallengeContributions] = useState<string[]>([]);

// On navigation away from Class Challenge slide:
// challengeContributions is lost (not synced to student view)

// When teacher navigates back:
// challengeContributions is empty (React remounts with fresh state)

// Student view never sees contributions (not in BroadcastChannel message)
```

**Consequences:**
- Lost data on slide navigation
- Student view out of sync with teacher
- Can't resume Class Challenge after navigating away
- Inconsistent state across windows

**Warning signs in code:**
- New slide types with local component state
- Not extending PresentationState interface
- Missing slide type in BroadcastChannel message
- Assuming Slide[] is homogeneous

**Prevention strategy:**

Option A: Extend Slide interface with discriminated union
```typescript
// types.ts - make Slide a discriminated union
export type SlideType = 'standard' | 'elaborate' | 'work-together' | 'class-challenge';

export interface BaseSlide {
  id: string;
  title: string;
  content: string[];
  speakerNotes: string;
  imagePrompt: string;
  imageUrl?: string;
  // ...common fields
}

export interface StandardSlide extends BaseSlide {
  type: 'standard';
}

export interface ClassChallengeSlide extends BaseSlide {
  type: 'class-challenge';
  prompt: string;
  contributions: Array<{
    id: string;
    studentName: string;
    text: string;
    timestamp: number;
  }>;
  isAcceptingContributions: boolean;
}

export type Slide = StandardSlide | ClassChallengeSlide | ...;

// Now PresentationState.slides can carry Class Challenge state
```

Option B: Separate ephemeral state field
```typescript
export interface PresentationState {
  currentIndex: number;
  visibleBullets: number;
  slides: Slide[];
  // NEW: ephemeral state for interactive slides
  interactiveState?: {
    [slideId: string]: {
      type: 'class-challenge';
      contributions: StudentContribution[];
      isOpen: boolean;
    } | {
      type: 'work-together';
      groups: Group[];
      phase: 'forming' | 'working' | 'sharing';
    };
  };
}
```

**Which phase should address this:** Phase 2/3/4 - before implementing any new slide type

**Sources:**
- Existing Cue architecture (types.ts, useBroadcastSync.ts) - current patterns
- [Syncing Data Across Browser Tabs with BroadcastChannel](https://medium.com/@sachin88/syncing-data-across-browser-tabs-with-the-broadcastchannel-api-de26f61529fb) - atomic state snapshots

---

### Pitfall 5: AI Content Homogenization from Repeated Regeneration

**What goes wrong:**
Teachers regenerate Elaborate/Work Together slides multiple times trying to get "better" content. Each regeneration uses previous generation as context, causing convergence to generic content:

```typescript
// Anti-pattern: using previous AI output as context for next generation
const elaborateSlide = await provider.generateElaborateSlide(slideContext);

// Teacher doesn't like it, clicks "Regenerate Elaborate"
const elaborateSlideV2 = await provider.generateElaborateSlide({
  ...slideContext,
  previousAttempt: elaborateSlide.content  // ❌ FEEDBACK LOOP
});

// After 3-5 regenerations: content becomes bland and generic
```

**Why it happens:**
- 2026 research: "When text-to-image and image-to-text systems iterate autonomously, outputs quickly converge to generic themes"
- Each regeneration compresses meaning toward familiar patterns
- AI has no diversity injection mechanism
- Teacher's frustration leads to more regenerations (worsening the problem)

**Research finding:**
> "Homogenization happens before retraining even enters the picture, with convergence to bland images emerging purely from repeated use without any new training." - The Conversation, 2026

**Example progression:**
```
Original context: "Photosynthesis light reactions in thylakoid membranes"

Regeneration 1: "Elaborate on how chlorophyll captures photons and excites electrons in photosystem II"

Regeneration 2 (using R1 as context): "Explain the electron transport chain in chloroplasts"

Regeneration 3 (using R2 as context): "Describe cellular energy production" (too generic)

Regeneration 4 (using R3 as context): "Explain how cells make energy" (even more generic)
```

**Consequences:**
- Generated content becomes increasingly generic
- Loss of pedagogical specificity
- Teacher wastes API calls on degrading quality
- Eventual resort to manual editing (defeating AI purpose)

**Warning signs in code:**
- Regenerate button with no limit or warning
- Previous generation included in context for retry
- No diversity/temperature parameter on regeneration
- No "Reset to Original Context" option

**Prevention strategy:**

```typescript
// Strategy 1: Always regenerate from original context (stateless)
const handleRegenerateElaborate = async () => {
  // Use original slide context, NOT previous generation
  const freshContext = buildSlideContext(slides, insertionIndex);
  const newSlide = await provider.generateElaborateSlide(freshContext);
  // Each regeneration is independent
};

// Strategy 2: Track regeneration count and warn
const [regenCount, setRegenCount] = useState(0);

const handleRegenerate = async () => {
  if (regenCount >= 3) {
    showWarning('Multiple regenerations may produce generic content. Try editing the prompt instead.');
  }
  setRegenCount(prev => prev + 1);
  // ... regenerate
};

// Strategy 3: Inject diversity on retry
const handleRegenerate = async (retryNumber: number) => {
  const diversityPrompt = retryNumber === 0
    ? ''
    : `Provide a different approach than typical explanations. ${
        retryNumber === 1 ? 'Focus on visual/concrete examples.' :
        retryNumber === 2 ? 'Focus on common misconceptions.' :
        'Focus on real-world applications.'
      }`;

  await provider.generateElaborateSlide(slideContext, undefined, diversityPrompt);
};

// Strategy 4: Multi-shot generation (generate 3, let teacher pick)
const handleGenerate = async () => {
  const [option1, option2, option3] = await Promise.all([
    provider.generateElaborateSlide(context, undefined, 'Visual approach'),
    provider.generateElaborateSlide(context, undefined, 'Analogy approach'),
    provider.generateElaborateSlide(context, undefined, 'Step-by-step approach'),
  ]);

  showPickerModal([option1, option2, option3]);
};
```

**Which phase should address this:** Phase 2 (Elaborate) and Phase 3 (Work Together) - during generation implementation

**Sources:**
- [AI-induced cultural stagnation is already happening](https://theconversation.com/ai-induced-cultural-stagnation-is-no-longer-speculation-its-already-happening-272488) - convergence to generic content
- [Beyond Generative: Regenerative AI in 2026](https://www.movate.com/beyond-generative-the-era-of-regenerative-ai-begins-in-2026/) - iterative degradation

---

## Moderate Pitfalls

Mistakes that cause UX degradation or technical debt, but are recoverable.

---

### Pitfall 6: Slide Insertion Breaks Auto-Save Sequence

**What goes wrong:**
Auto-save runs every 30 seconds. Teacher inserts Elaborate slide at index 5. Auto-save triggers mid-insertion:

```typescript
// Auto-save pattern (useAutoSave.ts - runs every 30s)
useEffect(() => {
  const intervalId = setInterval(() => {
    if (slides.length > 0) {
      saveToLocalStorage(slides, studentGrades, lessonTitle);
    }
  }, 30000);
}, [slides, studentGrades, lessonTitle]);

// Meanwhile, teacher clicks "Insert Elaborate" at index 5
const handleInsertElaborate = async () => {
  setIsGenerating(true);  // UI loading state
  const newSlide = await provider.generateElaborateSlide(...);

  // 3-5 seconds pass while AI generates
  // AUTO-SAVE triggers here with old slides array

  setSlides(prev => [
    ...prev.slice(0, 5),
    newSlide,
    ...prev.slice(5)
  ]);
  // Now slides array is updated, but auto-save already saved stale state
};
```

**The trap:**
1. Auto-save captures state at T=0s: `[slide1, slide2, ..., slide10]`
2. Teacher inserts Elaborate at T=2s (AI generating)
3. Auto-save triggers at T=30s with stale array (no elaborate slide yet)
4. AI generation completes at T=5s, new slide inserted
5. If page crashes at T=35s, recovery loads stale state (missing Elaborate slide)

**Why it happens:**
- Auto-save and AI generation are concurrent async operations
- No transaction/lock mechanism
- React state updates are asynchronous
- Auto-save captures snapshot, not "latest committed state"

**Consequences:**
- Generated slides lost on crash
- Recovery loads incomplete presentation
- Teacher loses 3-5 seconds of AI work
- Inconsistent state between localStorage and memory

**Warning signs in code:**
- Auto-save interval independent of async operations
- No "pending generation" flag to pause auto-save
- State updates during AI generation not atomic
- Missing optimistic UI with rollback

**Prevention strategy:**

```typescript
// Strategy 1: Pause auto-save during generation
const [isAnyGenerationPending, setIsAnyGenerationPending] = useState(false);

useEffect(() => {
  const intervalId = setInterval(() => {
    if (slides.length > 0 && !isAnyGenerationPending) {
      saveToLocalStorage(slides, studentGrades, lessonTitle);
    }
  }, 30000);
}, [slides, studentGrades, lessonTitle, isAnyGenerationPending]);

const handleInsertElaborate = async () => {
  setIsAnyGenerationPending(true);
  try {
    const newSlide = await provider.generateElaborateSlide(...);
    setSlides(prev => [...prev.slice(0, index), newSlide, ...prev.slice(index)]);
  } finally {
    setIsAnyGenerationPending(false);
    // Auto-save will trigger on next interval with complete state
  }
};

// Strategy 2: Force save after generation completes
const handleInsertElaborate = async () => {
  const newSlide = await provider.generateElaborateSlide(...);
  setSlides(prev => {
    const updated = [...prev.slice(0, index), newSlide, ...prev.slice(index)];
    // Force immediate save with updated state
    saveToLocalStorage(updated, studentGrades, lessonTitle);
    return updated;
  });
};

// Strategy 3: Optimistic UI with pending state
const [pendingSlides, setPendingSlides] = useState<Map<string, Slide>>(new Map());

const handleInsertElaborate = async () => {
  const tempId = crypto.randomUUID();
  const placeholder: Slide = { id: tempId, title: 'Generating...', ... };

  setPendingSlides(prev => new Map(prev).set(tempId, placeholder));

  try {
    const newSlide = await provider.generateElaborateSlide(...);
    setPendingSlides(prev => { const next = new Map(prev); next.delete(tempId); return next; });
    setSlides(prev => [...prev.slice(0, index), newSlide, ...prev.slice(index)]);
  } catch (e) {
    setPendingSlides(prev => { const next = new Map(prev); next.delete(tempId); return next; });
  }
};

// Auto-save skips pending slides
const slidesToSave = slides.filter(s => !pendingSlides.has(s.id));
```

**Which phase should address this:** Phase 2/3 - during Elaborate/Work Together implementation

**Sources:**
- Existing Cue auto-save implementation (useAutoSave.ts) - current 30s interval pattern
- [Cache Invalidation partial content update pitfalls](https://medium.com/@kennediowusu/react-query-cache-invalidation-why-your-mutations-work-but-your-ui-doesnt-update-a1ad23bc7ef1) - stale state issues

---

### Pitfall 7: Elaborate/Work Together Slides Lack Visual Distinction

**What goes wrong:**
Generated Elaborate and Work Together slides look identical to standard slides in the sidebar. Teacher can't tell:
- Which slides are AI-expanded content vs original lesson
- Which slides are collaborative activities
- Which slides can be regenerated vs are manual

```typescript
// Current slide rendering - all slides look the same
<SlideCard
  slide={slide}
  isActive={activeSlideIndex === index}
  onUpdate={handleUpdateSlide}
  onDelete={handleDeleteSlide}
/>
// No visual distinction for slide type
```

**The trap:**
1. Teacher generates 15-slide presentation
2. Inserts 3 Elaborate slides and 2 Work Together slides
3. Exports to PPTX and edits in PowerPoint
4. Re-imports edited PPTX (Refine mode)
5. Which slides were Elaborate/Work Together? Lost information.
6. Teacher can't tell which slides to keep vs regenerate

**Why it happens:**
- No `slideType` field in Slide interface
- All slides rendered with same SlideCard component
- No visual metadata (badge, icon, color coding)
- PPTX export loses type information

**Consequences:**
- Loss of slide provenance (manual vs AI-generated vs AI-expanded)
- Can't filter/bulk-regenerate Elaborate slides
- Pedagogical structure hidden (teacher forgets which are activities)
- Export/import round-trip loses type information

**Warning signs in code:**
- Slide interface has no type discriminator
- SlideCard component has no type-specific rendering
- No badge or icon indicating slide purpose
- Missing slide type in PPTX export metadata

**Prevention strategy:**

```typescript
// Strategy 1: Add slideType to Slide interface
export type SlideType = 'standard' | 'elaborate' | 'work-together' | 'class-challenge';

export interface Slide {
  id: string;
  title: string;
  content: string[];
  speakerNotes: string;
  slideType?: SlideType;  // Optional for backward compat
  // ...
}

// Strategy 2: Visual badges in SlideCard
const SlideTypeBadge = ({ type }: { type?: SlideType }) => {
  if (!type || type === 'standard') return null;

  const badges = {
    'elaborate': { icon: '🔍', label: 'Elaborate', color: 'bg-purple-100 text-purple-700' },
    'work-together': { icon: '👥', label: 'Activity', color: 'bg-blue-100 text-blue-700' },
    'class-challenge': { icon: '🏆', label: 'Challenge', color: 'bg-green-100 text-green-700' },
  };

  const badge = badges[type];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
      {badge.icon} {badge.label}
    </span>
  );
};

// Strategy 3: Color-coded sidebar for slide types
<div className={cn(
  "slide-card",
  slide.slideType === 'elaborate' && "border-l-4 border-purple-500",
  slide.slideType === 'work-together' && "border-l-4 border-blue-500",
  slide.slideType === 'class-challenge' && "border-l-4 border-green-500"
)}>

// Strategy 4: Preserve type in PPTX export (notes field)
const exportSlideMetadata = (slide: Slide) => {
  return `${slide.speakerNotes}\n\n[Cue Metadata: type=${slide.slideType || 'standard'}]`;
};
```

**Which phase should address this:** Phase 2 (Elaborate) - establish pattern for Phase 3/4

**Sources:**
- [Frontend Design Patterns 2026](https://www.netguru.com/blog/frontend-design-patterns) - component-driven visual distinction
- Existing Cue architecture - all slides currently homogeneous

---

### Pitfall 8: Class Challenge Input Validation Missing

**What goes wrong:**
Students submit contributions to Class Challenge with no validation:
- Empty submissions
- Profanity or inappropriate content
- Extremely long submissions (>1000 characters)
- Special characters that break rendering (e.g., unescaped HTML)

```typescript
// Anti-pattern: no validation
const handleStudentSubmit = (contribution: string) => {
  postMessage({
    type: 'STUDENT_CONTRIBUTION',
    studentName,
    contribution  // ❌ No sanitization, no length check
  });
};
```

**The trap:**
1. Student types `<script>alert('xss')</script>` as contribution
2. BroadcastChannel sends raw string
3. Teacher view renders with dangerouslySetInnerHTML (or React escapes it but looks ugly)
4. Student view shows unescaped HTML
5. Presentation becomes unprofessional or broken

**Why it happens:**
- BroadcastChannel is same-origin only (appears "safe")
- Developer assumes students won't submit malicious content
- No content-type specification (text vs HTML)
- React escapes by default but doesn't sanitize formatting

**Consequences:**
- Broken UI from malformed input
- Inappropriate content displayed to class
- Teacher embarrassment in front of students
- Extremely long submissions break layout

**Warning signs in code:**
- Direct string rendering without sanitization
- No maxLength on input field
- No profanity filter or content check
- Missing trim() on submission

**Prevention strategy:**

```typescript
// Strategy 1: Client-side validation before sending
const validateContribution = (text: string): { valid: boolean; error?: string } => {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Please enter a response' };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: 'Response too long (max 200 characters)' };
  }

  // Check for HTML-like content
  if (/<[^>]*>/g.test(trimmed)) {
    return { valid: false, error: 'Special characters not allowed' };
  }

  return { valid: true };
};

const handleSubmit = () => {
  const validation = validateContribution(contribution);
  if (!validation.valid) {
    showError(validation.error);
    return;
  }

  postMessage({
    type: 'STUDENT_CONTRIBUTION',
    contribution: contribution.trim()
  });
};

// Strategy 2: Input field constraints
<input
  type="text"
  maxLength={200}
  placeholder="Type your answer..."
  value={contribution}
  onChange={(e) => setContribution(e.target.value)}
  // Prevent paste of HTML
  onPaste={(e) => {
    const text = e.clipboardData.getData('text/plain');
    if (/<[^>]*>/g.test(text)) {
      e.preventDefault();
      showError('Cannot paste formatted content');
    }
  }}
/>

// Strategy 3: Teacher moderation (approve/reject)
interface StudentContribution {
  id: string;
  studentName: string;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Teacher sees pending contributions first, clicks approve to show
```

**Which phase should address this:** Phase 4 (Class Challenge) - before launch

**Sources:**
- Standard web security practices (XSS prevention)
- Classroom management best practices (content moderation)

---

### Pitfall 9: Work Together Slide Grouping Algorithm Creates Unfair Groups

**What goes wrong:**
AI generates Work Together slide with instruction "Pair up and discuss." But Cue doesn't track:
- Which students are already paired
- Student ability levels (Grade A/B/C in student list)
- Past groupings (some students always together)

```typescript
// Anti-pattern: random pairing without constraints
const createPairs = (students: string[]) => {
  const shuffled = [...students].sort(() => Math.random() - 0.5);
  const pairs = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;  // ❌ No consideration of fairness
};
```

**The trap:**
1. Teacher has 24 students with grades A/B/C assigned
2. Work Together slide generated: "Pair up to solve this problem"
3. Random pairing creates: [A+A], [A+A], [C+C], [C+C], [B+C], ...
4. High-achieving pairs finish quickly, low-achieving pairs struggle
5. Teacher manually reassigns groups (defeats AI purpose)

**Why it happens:**
- Student list has grades (A/B/C/D/E) but grouping ignores them
- No pedagogical strategy (heterogeneous vs homogeneous groups)
- Random assignment feels "fair" but isn't pedagogically optimal
- Teacher expectations for AI to handle this

**Consequences:**
- Pedagogically suboptimal groupings
- Teacher manual intervention required
- Loss of trust in AI for activities
- Students notice unfair distribution

**Warning signs in code:**
- Simple random shuffle for grouping
- No use of studentGrades array
- Missing grouping strategy parameter
- No teacher preview/edit of groups

**Prevention strategy:**

```typescript
// Strategy 1: Heterogeneous pairing (mix abilities)
const createHeterogeneousPairs = (students: StudentWithGrade[]) => {
  const sorted = [...students].sort((a, b) => {
    const gradeOrder = { A: 1, B: 2, C: 3, D: 4, E: 5 };
    return (gradeOrder[a.grade] || 99) - (gradeOrder[b.grade] || 99);
  });

  const pairs = [];
  const high = sorted.slice(0, Math.floor(sorted.length / 2));
  const low = sorted.slice(Math.floor(sorted.length / 2)).reverse();

  for (let i = 0; i < high.length; i++) {
    pairs.push([high[i], low[i]]);
  }

  return pairs;  // Each pair has mixed ability
};

// Strategy 2: Let teacher choose strategy
interface GroupingStrategy {
  type: 'random' | 'heterogeneous' | 'homogeneous' | 'manual';
  size: number;  // 2 for pairs, 3-4 for groups
}

const generateWorkTogetherSlide = async (
  context: SlideContext,
  grouping: GroupingStrategy
) => {
  const slide = await provider.generateWorkTogetherSlide(context, grouping.size);

  // Add grouping metadata to slide
  slide.groupingStrategy = grouping;
  return slide;
};

// Strategy 3: Preview groups before committing
const GroupingPreview = ({ students, strategy, onConfirm, onRegenerate }) => (
  <div>
    <h3>Proposed Groups:</h3>
    {createGroups(students, strategy).map((group, i) => (
      <div key={i}>
        Group {i + 1}: {group.map(s => `${s.name} (${s.grade})`).join(', ')}
      </div>
    ))}
    <Button onClick={onConfirm}>Use These Groups</Button>
    <Button onClick={onRegenerate}>Shuffle Again</Button>
  </div>
);
```

**Which phase should address this:** Phase 3 (Work Together) - during implementation

**Sources:**
- Educational best practices (heterogeneous grouping research)
- Existing Cue student grade system (studentGrades array)

---

## Minor Pitfalls

Annoyances that are fixable with simple changes.

---

### Pitfall 10: Teleprompter Regenerate Button Placement Ambiguous

**What goes wrong:**
Adding "Regenerate Teleprompter" button to PresentationView. Where does it go?
- Near verbosity selector (might regenerate all verbosity levels?)
- In slide actions (inconsistent with editing-only actions?)
- Floating on teleprompter panel (visual clutter?)

**Why it happens:**
- PresentationView already has verbosity selector, game menu, student selection
- Teleprompter panel is read-only during presentation
- No established pattern for "edit during presentation"

**Prevention:**
```typescript
// Place near verbosity selector with clear label
<div className="flex items-center gap-2">
  <VerbositySelector value={verbosity} onChange={handleVerbosityChange} />
  <button
    onClick={handleRegenerateTeleprompter}
    className="text-xs px-2 py-1 rounded"
    title="Regenerate this slide's script based on edits"
  >
    🔄 Regen
  </button>
</div>
```

**Which phase should address this:** Phase 1 (Single Teleprompter Regenerate) - UI planning

---

### Pitfall 11: Elaborate/Work Together Slides Don't Auto-Generate Images

**What goes wrong:**
Standard slides have `autoGenerateImages` setting. Elaborate/Work Together slides inserted mid-editing don't trigger image generation:

```typescript
// Current auto-image logic (App.tsx:298-304)
if (autoGenerateImages) {
  generatedSlides.forEach(async (s) => {
    // Only runs on initial generation
    setSlides(curr => curr.map(item =>
      item.id === s.id ? {...item, isGeneratingImage: true} : item
    ));
    const imageUrl = await provider.generateSlideImage(s.imagePrompt, s.layout);
    // ...
  });
}
```

**The trap:**
Elaborate slide inserted with perfect imagePrompt, but no image generation triggered. Teacher expects image, sees placeholder.

**Prevention:**
```typescript
const handleInsertElaborate = async () => {
  const newSlide = await provider.generateElaborateSlide(...);

  // Trigger image generation if auto-generate enabled
  if (autoGenerateImages && newSlide.imagePrompt) {
    setSlides(prev => [...prev.slice(0, index),
      { ...newSlide, isGeneratingImage: true },
      ...prev.slice(index)
    ]);

    const imageUrl = await provider.generateSlideImage(newSlide.imagePrompt);
    setSlides(prev => prev.map(s =>
      s.id === newSlide.id ? { ...s, imageUrl, isGeneratingImage: false } : s
    ));
  } else {
    setSlides(prev => [...prev.slice(0, index), newSlide, ...prev.slice(index)]);
  }
};
```

**Which phase should address this:** Phase 2/3 - during insertion implementation

---

### Pitfall 12: File Format Version Not Bumped for New Fields

**What goes wrong:**
Adding slideType, groupingStrategy, challengeState fields to Slide without bumping CURRENT_FILE_VERSION:

```typescript
// v3.1 pattern (types.ts)
export const CURRENT_FILE_VERSION = 2;

// Adding new fields in v3.2 but not bumping version
interface Slide {
  // ...existing
  slideType?: SlideType;  // NEW in v3.2
  challengeState?: ClassChallengeState;  // NEW in v3.2
  // Version still 2 - WRONG
}
```

**The trap:**
1. v3.2 user creates presentation with Elaborate slides
2. Saves as .cue file (version: 2)
3. v3.1 user opens file (also expects version 2)
4. v3.1 doesn't know about slideType field
5. Elaborate slides render as standard slides (data ignored)

**Prevention:**
```typescript
// Bump version for new fields
export const CURRENT_FILE_VERSION = 3;

// Migration logic in loadService.ts
if (data.version === 2) {
  // v2 -> v3: add default slideType for all slides
  data.slides = data.slides.map(s => ({
    ...s,
    slideType: s.slideType || 'standard'
  }));
  data.version = 3;
}
```

**Which phase should address this:** Phase 2 - establish v3 format

---

## Phase-Specific Risk Summary

| Phase | Feature | Critical Pitfalls | Moderate Pitfalls | Priority |
|-------|---------|-------------------|-------------------|----------|
| Phase 1 | Single Teleprompter Regenerate | Pitfall 1 (cache invalidation) | Pitfall 6 (auto-save), Pitfall 10 (UI placement) | HIGH |
| Phase 2 | Elaborate Slide | Pitfall 2 (AI context), Pitfall 5 (homogenization) | Pitfall 7 (visual distinction), Pitfall 11 (images), Pitfall 12 (version) | HIGH |
| Phase 3 | Work Together Slide | Pitfall 2 (AI context), Pitfall 5 (homogenization) | Pitfall 9 (grouping fairness) | MEDIUM |
| Phase 4 | Class Challenge | Pitfall 3 (BroadcastChannel race), Pitfall 4 (state sync) | Pitfall 8 (input validation) | CRITICAL |

---

## Architecture Recommendations

Based on these pitfalls, the v3.2 implementation should:

### 1. Extend Slide Interface as Discriminated Union
```typescript
export type Slide = StandardSlide | ElaborateSlide | WorkTogetherSlide | ClassChallengeSlide;

// Each type has type-specific fields
interface ClassChallengeSlide extends BaseSlide {
  type: 'class-challenge';
  prompt: string;
  contributions: StudentContribution[];
  isAcceptingContributions: boolean;
}
```

### 2. Separate Manual Teleprompter Overrides from Cache
```typescript
interface Slide {
  speakerNotes: string;  // Original AI generation (immutable)
  verbosityCache?: { concise?: string; detailed?: string };
  manualTeleprompter?: string;  // Single regenerate result
  teleprompterSource: 'original' | 'manual' | 'verbosity';
}
```

### 3. Use buildSlideContext for All AI Generation
```typescript
// Never pass single slide; always pass full context
const slideContext = buildSlideContext(slides, insertionIndex);
const newSlide = await provider.generateElaborateSlide(slideContext, nextSlide);
```

### 4. Timestamp and Deduplicate BroadcastChannel Messages
```typescript
interface StudentContributionMessage {
  type: 'STUDENT_CONTRIBUTION';
  contributionId: string;  // UUID
  timestamp: number;       // Date.now()
  studentName: string;
  contribution: string;
}

// Append-only with deduplication
setContributions(prev => {
  if (prev.some(c => c.id === msg.contributionId)) return prev;
  return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
});
```

### 5. Pause Auto-Save During Async Operations
```typescript
const [isGenerationPending, setIsGenerationPending] = useState(false);

// Auto-save checks flag
if (slides.length > 0 && !isGenerationPending) {
  saveToLocalStorage(slides, ...);
}
```

### 6. Bump File Version to 3
```typescript
export const CURRENT_FILE_VERSION = 3;

// Migration from v2
if (data.version === 2) {
  data.slides = data.slides.map(s => ({
    ...s,
    slideType: s.slideType || 'standard',
    teleprompterSource: s.teleprompterSource || 'original'
  }));
  data.version = 3;
}
```

---

## Summary: Top 5 Integration Pitfalls

| Priority | Pitfall | Impact | Phase |
|----------|---------|--------|-------|
| 1 | Cache invalidation conflicts with manual teleprompter | Data loss, broken verbosity switching | Phase 1 |
| 2 | BroadcastChannel race conditions on live input | Lost student contributions | Phase 4 |
| 3 | AI context degradation on slide insertion | Generic/disconnected content | Phase 2/3 |
| 4 | PresentationState doesn't support new slide types | State sync broken, lost data | Phase 2/3/4 |
| 5 | AI homogenization from repeated regeneration | Declining quality, wasted API calls | Phase 2/3 |

---

## Sources Summary

**AI Content Generation:**
- [AI Content Generation 2026: Brand Voice, Strategy and Scaling](https://www.roboticmarketer.com/ai-content-generation-in-2026-brand-voice-strategy-and-scaling/)
- [AI-induced cultural stagnation is already happening](https://theconversation.com/ai-induced-cultural-stagnation-is-no-longer-speculation-its-already-happening-272488)
- [Best AI Presentation Makers 2026](https://plusai.com/blog/best-ai-presentation-makers)

**BroadcastChannel & Real-Time Sync:**
- [BroadcastChannel spec vague about async nature - WHATWG Issue #7267](https://github.com/whatwg/html/issues/7267)
- [Real-Time Collaboration with BroadcastChannel API](https://www.slingacademy.com/article/real-time-collaboration-with-broadcast-channel-api-in-javascript/)
- [Handling Race Conditions in Real-Time Apps](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8)

**Cache Invalidation & State Management:**
- [React Query Cache Invalidation: Why Your Mutations Work But Your UI Doesn't Update](https://medium.com/@kennediowusu/react-query-cache-invalidation-why-your-mutations-work-but-your-ui-doesnt-update-a1ad23bc7ef1)
- [Managing Query Keys for Cache Invalidation](https://www.wisp.blog/blog/managing-query-keys-for-cache-invalidation-in-react-query)
- [Frontend Design Patterns 2026](https://www.netguru.com/blog/frontend-design-patterns)

**Concurrent State Modification:**
- [Building a real-time collaborative editor using Operational Transformation](https://srijancse.medium.com/how-real-time-collaborative-editing-work-operational-transformation-ac4902d75682)
- [JavaScript Frameworks - Heading into 2026](https://dev.to/this-is-learning/javascript-frameworks-heading-into-2026-2hel)

**Existing Cue Architecture:**
- Cue PROJECT.md - v3.1 verbosity caching patterns
- Cue types.ts - BroadcastChannel sync, Slide interface
- Cue App.tsx - cache invalidation logic (lines 321-334)
- Cue v3.1 ROADMAP - verbosity implementation decisions

---

_Research complete. All findings verified against existing Cue codebase patterns and 2026 web sources._
