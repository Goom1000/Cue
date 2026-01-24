# Project Research Summary

**Project:** Cue v3.2 — Pedagogical Slide Types
**Domain:** AI-powered educational presentation tools for K-12 teachers
**Researched:** 2026-01-25
**Confidence:** HIGH

## Executive Summary

This research examines adding four pedagogical features to Cue's existing presentation system: Elaborate slides (AI-generated deeper content), Work Together slides (collaborative activities), Class Challenge slides (live interactive student contribution capture), and Single Slide Script Regeneration. The excellent news: **no new dependencies required**. All four features integrate cleanly with Cue's existing stack (React 19, TypeScript, Gemini/Claude AI providers, BroadcastChannel sync).

The recommended approach leverages proven patterns from v3.1 verbosity caching and existing AI provider abstraction. Elaborate and Work Together slides extend the same insertion pattern as Exemplar slides. Class Challenge introduces a new interactive slide type with teacher-controlled input synced via BroadcastChannel (already proven for game state). Single teleprompter regeneration exposes an existing method (`regenerateTeleprompter()`) to the UI with careful cache management.

The key risk is **integration complexity, not technical capability**. Class Challenge requires presentation-mode editing (breaking the "presentation is read-only" assumption), and cache invalidation for single regeneration must avoid conflicts with the v3.1 verbosity caching system. The architecture supports these features, but implementation order matters: start with low-complexity extensions (Single Regenerate, Elaborate) before tackling the novel pattern (Class Challenge).

## Key Findings

### Recommended Stack

**Zero new dependencies required.** All four features build on Cue's existing 17,000 LOC codebase. The current React 19 + TypeScript + AI provider architecture already has the necessary extension points.

**Core technologies (no changes):**
- **React 19.2.0**: Controlled components handle Class Challenge input — Native `<input>` with `onChange` is best practice for 2026, avoiding outdated libraries like react-contenteditable
- **@google/genai 1.30.0 + Claude API**: Existing provider abstraction extends cleanly — Add three methods (`generateElaborateSlide`, `generateWorkTogetherSlide`, `generateClassChallengeSlide`) following the `generateExemplarSlide` pattern
- **BroadcastChannel (native)**: Already proven for game state sync in v3.0 — Class Challenge uses same pattern with `CHALLENGE_UPDATE` message type

**Anti-recommendations (what NOT to add):**
- react-contenteditable: Outdated (2022-2023), adds complexity for plain text use case
- Draft.js / Lexical: 2MB+ bundle, overkill for bullet point editing
- Liveblocks / Supabase Realtime / Socket.io: External dependencies when BroadcastChannel already works client-side

**Architectural principle:** Maximize existing capabilities before adding dependencies.

### Expected Features

All four features are **table stakes** in modern pedagogical presentation tools (ClassPoint, Nearpod, Pear Deck, Microsoft Copilot, Twistly). Missing these makes Cue feel incomplete for teacher workflows.

**Must have (v3.2 scope):**
- **Elaborate slides**: AI generates 3-5 paragraphs expanding on current slide with examples, explanations, and context — Core scaffolding technique, users expect depth-on-demand
- **Work Together slides**: AI generates collaborative activity instructions (pair work, group discussion, think-pair-share) — Foundational to modern pedagogy, research-backed
- **Class Challenge slides**: Teacher types student contributions live during presentation, visible to student view — Interactive brainstorming, formative assessment pattern
- **Single teleprompter regeneration**: Regenerate script for one slide after manual edits, respecting current verbosity level — Teachers manually refine AI content, need script to match

**Should have (differentiators beyond v3.2):**
- **Teleprompter-integrated Elaborate slides**: Speaker notes guide teachers through complex explanations (not just content depth)
- **Grade-aware Work Together activities**: Use student grade data from class bank for differentiated group activities
- **No-device Class Challenge**: Teacher-controlled model works in low-tech environments (competitor advantage over ClassPoint/Poll Everywhere)
- **Verbosity-aware single regeneration**: Generate all three verbosity levels on regenerate, preserve cache

**Defer (anti-features):**
- Student device polling for Class Challenge: Breaks Cue's client-only model, creates equity issues
- Pre-built activity template libraries: Scope creep, generic templates disconnect from lesson content
- Automatic script regeneration on content edit: Destroys teacher manual refinements, creates "AI fighting teacher" UX
- Live word cloud visualization: High complexity, marginal value over simple list display

### Architecture Approach

**All integration points already exist.** The InsertPoint component (slide insertion menu), AIProviderInterface (generation methods), BroadcastChannel sync (teacher-student communication), and verbosity caching system provide complete extension points. The challenge is integration coherence, not missing capabilities.

**Major components:**
1. **InsertPoint menu extension** — Add 3 buttons (Elaborate, Work Together, Class Challenge) to existing dropdown, extend from 2 to 5 options with vertical layout
2. **AI Provider interface extension** — Add 3 methods to `AIProviderInterface`, implement in both `geminiProvider.ts` and `claudeProvider.ts` following `generateExemplarSlide` pattern
3. **Class Challenge interactive slide** — New slide type with optional `challengeData: { prompt, responses, isLocked }` field, teacher input via React controlled components, BroadcastChannel sync to student view
4. **Single regeneration UI** — Add "🔄 Regen" button to teleprompter panel (PresentationView), call existing `regenerateTeleprompter()` method with current verbosity, update cache carefully
5. **Slide type discriminator** — Optional `slideType?: 'standard' | 'elaborate' | 'work-together' | 'class-challenge'` field for visual badges, export metadata, filtering

**Data flow patterns:**
- **Elaborate/Work Together insertion**: Create temp slide → AI generates with full slide context (not just prevSlide) → replace temp → auto-generate image if enabled
- **Class Challenge live input**: Teacher types response → update slide state → broadcast `CHALLENGE_UPDATE` → student view renders with animation → lock on navigation away
- **Single regeneration**: User clicks button → call `provider.regenerateTeleprompter(currentSlide, currentVerbosity)` → update cache at current verbosity level → clear stale cache flags

### Critical Pitfalls

Top 5 integration risks (all manageable with patterns from research):

1. **Cache invalidation conflicts with manual teleprompter** — Single regeneration breaks v3.1's assumption that `speakerNotes` is immutable. Need separate `manualTeleprompter` field or extend cache with `standardManual` to avoid losing regenerated work on verbosity switches. **Prevention:** Extend cache structure before Phase 1 implementation.

2. **BroadcastChannel race conditions on live input** — Class Challenge contributions may arrive out of order or collide (messages are async, no ordering guarantee). **Prevention:** Timestamp messages, deduplicate by UUID, append-only state updates with sorting by timestamp.

3. **AI context degradation on slide insertion** — Passing only `prevSlide` to generation (current Exemplar pattern) causes Elaborate/Work Together to lack lesson arc awareness, generating generic content that repeats earlier slides or contradicts upcoming content. **Prevention:** Reuse `buildSlideContext()` pattern from quiz generation (pass cumulative previous slides + optional lookahead to next slide).

4. **PresentationState sync breaks with new slide types** — Adding interactive slides (Class Challenge with contributions) without extending BroadcastChannel message types causes lost data on navigation. **Prevention:** Extend `Slide` interface with optional `challengeData` field, add `CHALLENGE_UPDATE` message type, ensure contributions persist in slide state.

5. **AI content homogenization from repeated regeneration** — Teachers regenerating Elaborate/Work Together multiple times using previous generation as context causes convergence to bland, generic content (research shows iterative AI outputs lose specificity). **Prevention:** Always regenerate from original slide context (stateless), track regeneration count with warning, inject diversity prompts on retry ("focus on visual examples" vs "focus on misconceptions").

**Additional moderate pitfalls:**
- Slide insertion breaks auto-save sequence (pause auto-save during generation or force save on completion)
- Elaborate/Work Together slides lack visual distinction (add `slideType` badges, color-coded sidebar borders)
- Class Challenge input validation missing (sanitize HTML, max length 200 chars, profanity filter)
- Work Together grouping algorithm unfair (use student grades for heterogeneous pairing, not random shuffle)

## Implications for Roadmap

Based on research, suggested phase structure optimizes for **dependency order, complexity escalation, and pattern establishment**:

### Phase 1: Single Slide Teleprompter Regeneration
**Rationale:** Simplest implementation, immediate teacher value, establishes cache management pattern for later phases.
**Delivers:** "🔄 Regen" button in teleprompter panel, regenerates current slide only, respects verbosity level
**Addresses:** Teachers manually editing slide content need speaker notes to match (table stakes feature)
**Avoids:** Pitfall 1 (cache invalidation) — Extend cache structure or add `manualTeleprompter` field to separate manual overrides from verbosity cache
**Stack:** Reuses existing `provider.regenerateTeleprompter()` method (v3.1), updates `verbosityCache`, no new dependencies
**Complexity:** LOW (UI button + state update)
**Research needed:** None (method already exists, just needs UI exposure)

### Phase 2: Elaborate Slide Insertion
**Rationale:** Extends proven Exemplar insertion pattern, tests AI provider extension before more complex features.
**Delivers:** "Elaborate" option in InsertPoint menu, AI generates deeper content with examples/explanations
**Addresses:** Core scaffolding technique, users expect depth-on-demand (table stakes)
**Avoids:** Pitfall 2 (AI context degradation) — Use `buildSlideContext()` to pass cumulative lesson context, not just prevSlide; Pitfall 5 (homogenization) — Regenerate from original context stateless
**Implements:** Extend `AIProviderInterface` with `generateElaborateSlide()`, implement in Gemini + Claude providers
**Complexity:** MEDIUM (AI prompt engineering for quality, paragraph layout vs bullets)
**Research needed:** None (standard AI generation pattern)

### Phase 3: Work Together Slide Insertion
**Rationale:** Same pattern as Elaborate, different prompt engineering, can share implementation approach.
**Delivers:** "Work Together" option in menu, AI generates collaborative activity instructions
**Addresses:** Foundational pedagogy (think-pair-share, peer teaching), research-backed effectiveness
**Avoids:** Pitfall 2 (context degradation) — Same solution as Phase 2; Pitfall 9 (grouping fairness) — Use student grades for heterogeneous pairing if implementing group suggestions
**Implements:** Add `generateWorkTogetherSlide()` to providers, activity-specific prompts
**Complexity:** MEDIUM (prompt quality for age-appropriate activities)
**Research needed:** None (leverages Phase 2 patterns)

### Phase 4: Class Challenge Interactive Slides
**Rationale:** Most architecturally novel (presentation-mode editing, live sync), defer until earlier patterns established.
**Delivers:** "Class Challenge" option, teacher input field during presentation, live student view sync
**Addresses:** Interactive brainstorming, formative assessment, visible student contributions (table stakes in interactive tools)
**Avoids:** Pitfall 3 (BroadcastChannel race conditions) — Timestamp + UUID messages, append-only state; Pitfall 4 (state sync) — Extend Slide with `challengeData` field, add `CHALLENGE_UPDATE` message; Pitfall 8 (input validation) — Sanitize HTML, max length 200 chars
**Implements:** New `ClassChallengeSlide` component, React controlled inputs, BroadcastChannel sync, locking on navigation
**Complexity:** HIGH (breaks "presentation is read-only" assumption, new interaction pattern)
**Research needed:** None (BroadcastChannel already proven for game state v3.0, just needs application to live input)

### Phase Ordering Rationale

- **Phase 1 first:** Low-complexity quick win, validates cache management approach for later phases, immediate teacher value for manual editing workflow
- **Phases 2-3 together:** Both extend same AI provider pattern, establish `buildSlideContext()` usage, test prompt engineering quality before interactive features
- **Phase 4 last:** Requires presentation-mode editing (novel pattern), benefits from earlier phases testing AI generation and state management, highest risk phase isolated from others

**Dependency chain:**
```
No external dependencies
  ├─ Phase 1 (Single Regen) → validates cache extension pattern
  ├─ Phase 2 (Elaborate) → establishes AI provider extension + context pattern
  ├─ Phase 3 (Work Together) → reuses Phase 2 patterns
  └─ Phase 4 (Class Challenge) → new pattern (presentation editing + sync)
```

**Build order per phase:**
1. UI extensions (buttons, placeholders) — all phases can start with no-op UI
2. AI provider methods — Phases 2-4 implement generation
3. State management — Phase 1 cache, Phase 4 live sync
4. Integration — wire up handlers, test end-to-end

### Research Flags

**Phases with standard patterns (skip `/gsd:research-phase`):**
- **Phase 1 (Single Regen):** Reuses existing method, just UI placement decision
- **Phase 2 (Elaborate):** Standard AI generation, follows Exemplar pattern exactly
- **Phase 3 (Work Together):** Same as Phase 2, different prompt domain

**Phases needing validation during implementation (consider `/gsd:research-phase` if complexity emerges):**
- **Phase 4 (Class Challenge):** Presentation-mode editing is new pattern — May need deeper research if BroadcastChannel race conditions prove more complex than anticipated, or if locking mechanism conflicts with navigation logic

**Overall:** All phases have HIGH confidence implementation paths. No phase requires external research during planning.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Zero new dependencies verified against 2026 best practices (React 19 controlled components, native BroadcastChannel). All features use existing capabilities. |
| Features | **HIGH** | Verified with multiple authoritative sources (ClassPoint, Nearpod, Microsoft Copilot, SlideSpeak, peer-reviewed pedagogy research). All four are table stakes in modern tools. |
| Architecture | **HIGH** | All integration points confirmed in Cue codebase (InsertPoint component, AIProviderInterface, BroadcastChannel sync, verbosity cache). Patterns already proven (Exemplar insertion, game state sync). |
| Pitfalls | **HIGH** | Based on Cue v3.1 verbosity implementation analysis + 2026 web research on BroadcastChannel race conditions, AI homogenization, cache invalidation. All critical pitfalls have prevention strategies. |

**Overall confidence:** **HIGH**

Research draws from:
- Verified Cue codebase patterns (App.tsx, types.ts, aiProvider.ts, useBroadcastSync.ts, PresentationView.tsx)
- Official documentation (React 19 forms, BroadcastChannel MDN, Gemini/Claude APIs)
- Established educational technology tools (ClassPoint, Nearpod, Pear Deck)
- 2026 AI tooling research (Microsoft Copilot, Twistly, SlideSpeak)
- Peer-reviewed pedagogy (think-pair-share effectiveness, scaffolding research)
- 2026 web security and state management best practices

### Gaps to Address

**Minor implementation questions (resolvable during phase planning):**

1. **InsertPoint UI layout:** Vertical dropdown vs horizontal 2-row grid for 5 options — **Resolution:** Prototype both, choose based on visual hierarchy (vertical recommended for scalability)

2. **Elaborate slide layout:** Paragraph text layout vs existing bullet layouts — **Resolution:** Test readability with 3-4 paragraph content, may need new "article" layout type

3. **Work Together grouping:** Should Phase 3 implement grouping suggestions or just activity instructions? — **Resolution:** Defer grouping to post-MVP, start with activity instructions only (simpler, still valuable)

4. **Class Challenge staleness:** Should locked challenges be editable if teacher returns? — **Resolution:** Lock on navigation away, no editing after lock (prevents inconsistency with student view)

5. **Single regen verbosity:** Should regeneration update all three verbosity levels or just current? — **Resolution:** Start with current level only (faster, simpler), extend to all three in post-MVP if teachers request

**No blocking gaps.** All questions have straightforward resolution paths during implementation.

## Sources

### Primary (HIGH confidence)

**Existing Cue Architecture:**
- Codebase analysis: App.tsx (InsertPoint pattern, exemplar insertion, cache invalidation logic lines 321-334), types.ts (Slide interface, BroadcastChannel messages), aiProvider.ts (provider interface, regenerateTeleprompter method), PresentationView.tsx (verbosity toggle, game state sync), useBroadcastSync.ts (sync pattern)
- v3.1 ROADMAP: Verbosity implementation decisions, cache management patterns

**Official Documentation:**
- [React 19 Forms: Native Form Handling in React 19](https://www.yeti.co/blog/native-form-handling-in-react-19) — Controlled components best practice 2026
- [Managing State – React Official](https://react.dev/learn/managing-state) — Official guidance on controlled inputs
- [BroadcastChannel API – MDN](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel_API) — Native browser API spec

**Educational Technology Platforms:**
- [ClassPoint Interactive Quiz Questions](https://www.classpoint.io/interactive-quiz-questions) — Real-time student response collection
- [Nearpod vs PearDeck Comparison](https://www.teachfloor.com/blog/nearpod-vs-peardeck) — Interactive slide type comparison
- [Using Slide Decks for Collaborative Learning | Edutopia](https://www.edutopia.org/article/using-slide-decks-collaborative-learning/) — Pedagogical patterns

**AI Presentation Tools:**
- [Add Speaker Notes in PowerPoint with AI | Twistly](https://twistly.ai/add-speaker-notes-in-powerpoint-with-ai/) — Single slide regeneration patterns
- [Create a new presentation with Copilot in PowerPoint](https://support.microsoft.com/en-us/office/create-a-new-presentation-with-copilot-in-powerpoint-3222ee03-f5a4-4d27-8642-9c387ab4854d) — Microsoft Copilot speaker notes
- [Add Speaker Notes with AI to Presentations - SlideSpeak](https://slidespeak.co/blog/2024/04/18/add-speaker-notes-with-ai-to-presentations/) — Slide-by-slide AI patterns

### Secondary (MEDIUM confidence)

**Pedagogical Research:**
- [Think-Pair-Share: Promoting Equitable Participation (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10887392/) — Collaborative learning effectiveness
- [Scaffolding Content | University at Buffalo](https://www.buffalo.edu/catt/teach/develop/build/scaffolding.html) — Elaboration as scaffolding strategy
- [Challenge Based Learning Engages Students | Edutopia](https://www.edutopia.org/article/challenge-based-learning-engages-students/) — Interactive challenge pedagogy

**2026 Stack Best Practices:**
- [The React + AI Stack for 2026](https://www.builder.io/blog/react-ai-stack-2026) — TypeScript + Tailwind + AI API integration
- [React Forms Best Practices](https://www.dhiwise.com/blog/design-converter/react-forms-best-practices-for-better-user-experience) — Controlled components over contenteditable

**BroadcastChannel & Real-Time Sync:**
- [BroadcastChannel spec vague about async nature - WHATWG #7267](https://github.com/whatwg/html/issues/7267) — Ordering not guaranteed
- [Handling Race Conditions in Real-Time Apps](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8) — Event cache solutions
- [Real-Time Collaboration with BroadcastChannel API](https://www.slingacademy.com/article/real-time-collaboration-with-broadcast-channel-api-in-javascript/) — Protocol design

**AI Content Quality:**
- [AI-induced cultural stagnation is already happening](https://theconversation.com/ai-induced-cultural-stagnation-is-no-longer-speculation-its-already-happening-272488) — Convergence to generic content
- [AI Content Generation 2026: Brand Voice, Strategy and Scaling](https://www.roboticmarketer.com/ai-content-generation-in-2026-brand-voice-strategy-and-scaling/) — Hallucinations, tone mismatches
- [Best AI Presentation Makers 2026](https://plusai.com/blog/best-ai-presentation-makers) — "AI struggles when missing context, lacks strategic soul"

### Tertiary (LOW confidence - validation needed)

**Cache Invalidation Patterns:**
- [React Query Cache Invalidation](https://medium.com/@kennediowusu/react-query-cache-invalidation-why-your-mutations-work-but-your-ui-doesnt-update-a1ad23bc7ef1) — State management patterns (applies to React but Cue doesn't use React Query)
- [Managing Query Keys for Cache Invalidation](https://www.wisp.blog/blog/managing-query-keys-for-cache-invalidation-in-react-query) — Cache strategies (general principles apply)

---

**Research completed:** 2026-01-25
**Ready for roadmap:** Yes
**Next step:** Requirements definition phase can begin
