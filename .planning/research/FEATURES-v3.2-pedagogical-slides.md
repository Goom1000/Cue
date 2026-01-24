# Feature Landscape: Pedagogical Slide Types

**Domain:** Educational presentation tools for K-12 teachers
**Researched:** 2026-01-25
**Confidence:** HIGH

## Executive Summary

This research examines four pedagogical slide types being added to Cue: Elaborate slides (AI-generated deeper content), Work Together slides (collaborative activities), Class Challenge slides (live student contribution capture), and Single Slide Script Regeneration. These features align with established pedagogical patterns in educational technology while maintaining Cue's teacher-teleprompter-student projection model.

The research draws from current educational technology leaders (ClassPoint, Nearpod, Pear Deck), AI presentation tools (Microsoft Copilot, Twistly, SlideSpeak), and pedagogical frameworks (scaffolding, elaboration, think-pair-share). All features are table stakes in modern interactive presentation tools, with opportunities for differentiation through Cue's unique teleprompter-centric architecture.

---

## Table Stakes

Features users expect from pedagogical slide types. Missing = product feels incomplete.

### 1. Elaborate Slide: AI Deeper Content Generation

| Aspect | Expected Behavior | Complexity | Notes |
|--------|------------------|------------|-------|
| **Content Depth** | Generate 3-5 paragraphs expanding on slide topic with examples, explanations, and context | Medium | Must preserve original slide topic while adding depth |
| **Teleprompter Script** | Automatically generate matching speaker notes for elaboration content | Low | Leverage existing AI provider strategy pattern |
| **Visual Support** | Generate relevant image prompt and display elaborated content as readable text blocks | Medium | Different from bullet-based slides; needs readable paragraph layout |
| **Content Preservation** | Original slide remains unchanged; elaboration is new slide inserted after current | Low | Follows existing "insert blank/exemplar" pattern |
| **AI Provider Compatibility** | Works with both Gemini and Claude providers | Low | Use existing provider abstraction |

**Pedagogical Rationale:** Elaboration is a core scaffolding technique where teachers prompt students to justify, lengthen, or deepen their understanding. In presentation context, elaborate slides provide "just-in-time" deeper content when teacher detects students need more explanation or examples.

**User Flow:**
1. Teacher clicks "Insert Elaborate Slide" while on current slide during editing
2. AI analyzes current slide content + lesson context
3. Generates new slide with deeper explanation, examples, analogies
4. Inserts after current slide with matching teleprompter script
5. Teacher can edit/refine before presenting

**Dependency:** Existing AI provider system, slide insertion pattern, teleprompter generation

---

### 2. Work Together Slide: Collaborative Activity Instructions

| Aspect | Expected Behavior | Complexity | Notes |
|--------|------------------|------------|-------|
| **Activity Generation** | AI generates pair/group activity instructions relevant to current slide topic | Medium | Think-pair-share, discussion prompts, problem-solving tasks |
| **Instruction Clarity** | Clear, actionable steps students can follow independently | Medium | Must include: time allocation, group size, deliverable, success criteria |
| **Teacher Guidance** | Teleprompter provides facilitation tips, monitoring strategies, common misconceptions | Medium | More complex than typical speaker notes |
| **Visual Format** | Instructions displayed clearly on student view (numbered steps, timer-friendly) | Medium | Students read from projector; must be large, scannable text |
| **Resource Suggestions** | Basic materials list if activity needs physical resources (paper, markers, etc.) | Low | Simple text list; not generating actual worksheets |

**Pedagogical Rationale:** Collaborative learning (think-pair-share, peer teaching) is foundational to modern pedagogy. Research shows students who learn through collaborative dialogue develop stronger conceptual understanding and problem-solving skills than passive listening.

**User Flow:**
1. Teacher clicks "Insert Work Together Slide" during editing
2. AI analyzes current slide topic + student grade level
3. Generates collaborative activity appropriate for age group
4. Slide shows: activity title, instructions, time suggestion, grouping (pairs/groups of 3-4)
5. Teleprompter shows: facilitation tips, monitoring guidance, wrap-up questions

**Dependency:** Existing AI provider system, student grade level from class bank, slide insertion

---

### 3. Class Challenge Slide: Live Student Contribution Capture

| Aspect | Expected Behavior | Complexity | Notes |
|--------|------------------|------------|-------|
| **Real-Time Input** | Teacher types student responses during presentation; appears immediately on student view | High | NEW pattern; requires presentation-mode editing |
| **Contribution Display** | Student responses shown as list/word cloud on projector | High | Word cloud requires aggregation logic; list is simpler |
| **Teacher Interface** | Simple input field in teleprompter panel; add/remove contributions on the fly | High | Breaks "presentation is read-only" assumption |
| **Persistence** | Contributions saved to slide; reappear if teacher returns to slide | Medium | State management during presentation |
| **Broadcast Sync** | Student view updates instantly as teacher adds contributions | Medium | Leverage existing BroadcastChannel pattern |

**Pedagogical Rationale:** Live brainstorming and visible student contributions are core to formative assessment and engagement. Tools like Poll Everywhere, Mentimeter, and ClassPoint show that real-time aggregation of student ideas is highly valued. Cue's advantage: teacher controls projection (no student devices needed), maintaining classroom management.

**User Flow (Presentation Mode):**
1. Teacher navigates to Class Challenge slide during presentation
2. Teleprompter panel shows: prompt + input field + list of contributions so far
3. Teacher calls on students verbally, types their responses into input field
4. Each contribution immediately broadcasts to student view
5. Student view displays contributions as growing list or word cloud
6. Contributions persist in slide data; saved in .cue file

**Technical Challenge:** Presentation mode is currently read-only. Class Challenge requires editing during presentation while maintaining broadcast sync.

**Dependency:** Existing BroadcastChannel sync, new presentation-mode editing pattern, state persistence

---

### 4. Single Slide Script Regeneration

| Aspect | Expected Behavior | Complexity | Notes |
|--------|------------------|------------|-------|
| **Selective Regeneration** | Regenerate teleprompter script for ONE slide after teacher edits content | Low | Existing: regenerate all slides. New: regenerate current slide only |
| **Manual Edit Detection** | Works when teacher manually changes bullets, title, or content | Low | User explicitly requests regeneration; no auto-detection needed |
| **Verbosity Awareness** | Respects current verbosity setting (Concise/Standard/Detailed) | Low | Leverage existing verbosity cache pattern |
| **Cache Update** | Regenerated script updates cache; previous script versions discarded | Low | Existing verbosity cache logic applies |
| **Provider Support** | Works with Gemini and Claude | Low | Use existing provider strategy |
| **UI Placement** | Button in teleprompter panel or slide editor (context-appropriate) | Low | Consistent with existing "Regenerate All" pattern |

**Pedagogical Rationale:** Teachers often manually refine AI-generated slides to match their teaching style or correct inaccuracies. When slide content changes, speaker notes become misaligned. Single-slide regeneration preserves teacher agency (manual edits) while maintaining teleprompter coherence.

**User Flow (Editing Mode):**
1. Teacher manually edits slide content (bullets, title)
2. Clicks "Regenerate Script" button in teleprompter panel
3. AI analyzes updated slide content + lesson context
4. Generates new speaker notes matching current verbosity level
5. Updates teleprompter display; clears verbosity cache for that slide
6. Teacher reviews; can undo if unsatisfied

**Current Limitation:** v3.1 has "regenerate all slides" but no single-slide option. Teachers lose manual edits across ALL slides when regenerating.

**Dependency:** Existing AI provider system, verbosity cache, slide editing UI

---

## Differentiators

Features that set Cue apart from competitors. Not expected, but highly valued.

### 1. Teleprompter-Integrated Elaborate Slides

**What:** Elaborate slides generate not just deeper content but also comprehensive speaker notes that guide the teacher through complex explanations naturally.

**Why Valuable:** Competitors (Nearpod, Pear Deck) focus on student interaction but lack teacher script support. Cue's teleprompter makes deeper content accessible to teachers who may not be subject-matter experts.

**Complexity:** Medium (requires richer AI prompts for teacher guidance)

**Implementation:** When generating Elaborate slide, AI prompt includes: "Generate speaker notes that help a teacher explain this topic clearly, including analogies, common misconceptions, and pacing suggestions."

---

### 2. Grade-Aware Work Together Activities

**What:** Work Together activities automatically adjust complexity and grouping based on student grade levels from class bank (A/B/C/D/E).

**Why Valuable:** Most tools generate one-size-fits-all activities. Cue already has student grade data; using it for differentiated activities is natural extension.

**Complexity:** Medium (AI prompts must consider grade distribution)

**Implementation:** AI prompt includes class grade distribution: "30% Grade A, 40% Grade B, 30% Grade C. Generate collaborative activity with differentiated roles/questions for mixed-ability groups."

**Dependency:** Existing class bank with grade assignments (v2.4 feature)

---

### 3. No-Device Class Challenge

**What:** Class Challenge requires NO student devices. Teacher captures verbal contributions from classroom discussion and displays them in real-time.

**Why Valuable:** Most interactive tools (ClassPoint, Poll Everywhere, Mentimeter) require student devices or QR codes for submission. Cue's teacher-controlled model works in low-tech environments, maintains classroom management, and reduces equity barriers.

**Complexity:** High (but architecturally simpler than multi-device sync)

**Implementation:** Teacher is the single source of truth; BroadcastChannel sends contributions to student projector view only.

---

### 4. Verbosity-Aware Script Regeneration

**What:** Single slide regeneration respects verbosity preferences AND preserves cached alternate versions.

**Why Valuable:** Competitors (Twistly, SlideSpeak, Copilot) regenerate speaker notes but don't maintain multiple verbosity levels. Cue's v3.1 verbosity caching makes regeneration non-destructive.

**Complexity:** Low (leverage existing verbosity cache)

**Implementation:** When regenerating single slide, generate all three verbosity levels (Concise/Standard/Detailed) and update cache. Teacher can still switch verbosity mid-lesson without losing regenerated work.

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

### 1. Student Device Polling

**What:** Allow students to submit responses from their own devices (phones, tablets, laptops).

**Why Avoid:**
- Breaks Cue's core model (teacher + projector only)
- Requires backend infrastructure (Cue is client-side only)
- Creates equity issues (not all students have devices)
- Reduces classroom management (students distracted by devices)

**What to Do Instead:**
- Use Class Challenge with teacher-mediated input
- Teacher calls on students verbally; captures responses at keyboard
- Maintains low-tech, high-equity model

---

### 2. Pre-Built Activity Libraries

**What:** Extensive template libraries of collaborative activities (e.g., "100 Think-Pair-Share Templates").

**Why Avoid:**
- Scope creep (Cue is AI-first, not template library)
- Generic templates disconnect from lesson content
- Maintenance burden (curating/updating templates)

**What to Do Instead:**
- AI generates activities contextual to current slide topic
- Activities are always relevant to lesson content
- Teacher can manually edit generated activities if needed

---

### 3. Automatic Slide Content Sync with Speaker Notes

**What:** Auto-regenerate speaker notes whenever teacher edits slide content.

**Why Avoid:**
- Destroys teacher's manual script refinements
- Creates unexpected behavior (teacher edits bullet, script changes)
- Leads to "AI fighting the teacher" experience

**What to Do Instead:**
- Explicit "Regenerate Script" button (user-initiated)
- Teacher controls when regeneration happens
- Preserves agency and predictability

---

### 4. Multi-Format Export for Elaborate/Work Together Slides

**What:** Export Elaborate slides as standalone PDFs, Work Together activities as printable worksheets.

**Why Avoid:**
- Cue already has PPTX export; sufficient for sharing
- Adds UI complexity for edge-case usage
- Resource generation (printable worksheets) is different feature domain

**What to Do Instead:**
- Export to PPTX (existing feature)
- Teachers can copy-paste content into Word/Google Docs if needed
- Focus on presentation experience, not resource creation

---

### 5. Live Word Cloud Visualization

**What:** Dynamically generate word cloud visualization as teacher types contributions in Class Challenge.

**Why Avoid:**
- High complexity (word frequency analysis, layout algorithm, real-time rendering)
- Visual distraction from teaching flow
- Marginal value over simple list display

**What to Do Instead:**
- Display contributions as numbered list (simple, clear)
- Or display as stacked text items (card-based layout)
- Save word cloud feature for future if user demand emerges

---

## Feature Dependencies

```
Existing Features → New Features

AI Provider Strategy (v2.0)
  ├→ Elaborate Slide Generation
  ├→ Work Together Activity Generation
  └→ Single Script Regeneration

Verbosity System (v3.1)
  └→ Single Script Regeneration (respects verbosity cache)

Slide Insertion Pattern (existing)
  ├→ Elaborate Slide Insertion
  └→ Work Together Slide Insertion

BroadcastChannel Sync (v1.0)
  └→ Class Challenge Real-Time Updates

Class Bank with Grades (v2.4)
  └→ Grade-Aware Work Together Activities (differentiator)

Presentation State Management (v1.0)
  └→ Class Challenge Contribution Persistence
```

---

## MVP Recommendation

For v3.2 milestone, prioritize in this order:

### Phase 1: Low-Complexity, High-Value (Ship First)
1. **Single Slide Script Regeneration** — Low complexity, immediate value for teachers who manually edit slides
2. **Elaborate Slide Insertion** — Medium complexity, leverages existing AI + insertion patterns

### Phase 2: Medium-Complexity, Pedagogical Core (Ship Second)
3. **Work Together Slide Insertion** — Medium complexity, requires richer AI prompts but no new architecture

### Phase 3: High-Complexity, Novel Feature (Ship Last)
4. **Class Challenge Slide** — High complexity, requires presentation-mode editing pattern (new architectural challenge)

**Rationale:**
- Single Script Regeneration is quick win; unblocks teacher workflow immediately
- Elaborate and Work Together leverage existing patterns; can ship together
- Class Challenge requires new presentation-editing pattern; defer until architecture validated

**Defer to Post-MVP:**
- Grade-aware Work Together differentiation (can launch with generic activities first)
- Verbosity-aware regeneration for all three levels (start with Standard only)
- Word cloud visualization for Class Challenge (start with simple list)

---

## Complexity Assessment

| Feature | Complexity | Primary Challenge | Risk Level |
|---------|-----------|------------------|-----------|
| Single Script Regeneration | **Low** | UI placement, cache invalidation | Low |
| Elaborate Slide | **Medium** | Layout for paragraph text vs bullets | Low |
| Work Together Slide | **Medium** | AI prompt engineering for quality activities | Medium |
| Class Challenge | **High** | Presentation-mode editing, state sync | High |

**High-Risk Item:** Class Challenge breaks "presentation is read-only" assumption. Requires new pattern for editing during presentation while maintaining BroadcastChannel sync. Recommend deep research during planning phase.

---

## Sources

### Educational Technology Platforms
- [ClassPoint Interactive Quiz Questions](https://www.classpoint.io/interactive-quiz-questions) — Real-time student response collection in PowerPoint
- [Using Slide Decks for Collaborative Learning | Edutopia](https://www.edutopia.org/article/using-slide-decks-collaborative-learning/) — Pedagogical patterns for collaborative slides
- [Nearpod vs PearDeck Comparison](https://www.teachfloor.com/blog/nearpod-vs-peardeck) — Interactive slide type comparison
- [Student collaboration in shared Google Slides](https://ditchthattextbook.com/student-collaboration-in-shared-google-slides/) — Collaborative slide patterns

### Pedagogical Research
- [Think-Pair-Share: Promoting Equitable Participation](https://pmc.ncbi.nlm.nih.gov/articles/PMC10887392/) — Research on collaborative learning effectiveness
- [Scaffolding Content | University at Buffalo](https://www.buffalo.edu/catt/teach/develop/build/scaffolding.html) — Elaboration as scaffolding strategy
- [Challenge Based Learning Engages Students | Edutopia](https://www.edutopia.org/article/challenge-based-learning-engages-students/) — Interactive challenge pedagogy

### AI Speaker Notes Tools
- [Add Speaker Notes in PowerPoint with AI | Twistly](https://twistly.ai/add-speaker-notes-in-powerpoint-with-ai/) — Single slide regeneration patterns
- [Create a new presentation with Copilot in PowerPoint](https://support.microsoft.com/en-us/office/create-a-new-presentation-with-copilot-in-powerpoint-3222ee03-f5a4-4d27-8642-9c387ab4854d) — Microsoft Copilot speaker notes generation
- [Add Speaker Notes with AI to Presentations - SlideSpeak](https://slidespeak.co/blog/2024/04/18/add-speaker-notes-with-ai-to-presentations/) — Slide-by-slide AI speaker notes

### Interactive Classroom Tools
- [10 Types Of Word Cloud Activities That Engage Students](https://www.classpoint.io/blog/engaging-word-cloud-activities) — Live word cloud patterns
- [6 Ideas for Using Collaborative Word Clouds in the Classroom](https://wordcloud.app/blog/6-ideas-for-collaborative-word-clouds-classroom) — Real-time contribution capture
- [AnswerGarden](https://answergarden.ch/) — Live word cloud generator for classroom brainstorming

### Best Practices
- [Using Slides in Classroom Teaching | University of Vermont](https://www.uvm.edu/ctl/slidesinclassroom/) — Pedagogical slide design principles
- [Teaching with PowerPoint | Northern Illinois University](https://www.niu.edu/citl/resources/guides/instructional-guide/teaching-with-powerpoint.shtml) — Effective slide usage in teaching
- [18 Formative Assessment Tools For Digital Exit Tickets](https://www.teachthought.com/technology/smart-tools-for-digital-exit-slips/) — Check-for-understanding patterns

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|-----------|-----------|
| Table Stakes Features | **HIGH** | Verified with multiple authoritative sources (ClassPoint, Nearpod, Microsoft Copilot, SlideSpeak) |
| Pedagogical Rationale | **HIGH** | Peer-reviewed research (PMC articles), established educational frameworks (scaffolding, think-pair-share) |
| Complexity Estimates | **MEDIUM** | Based on Cue's existing architecture patterns; Class Challenge complexity is estimated (requires validation) |
| Differentiators | **MEDIUM** | Logical extensions of Cue's unique model; market validation needed |
| Anti-Features | **HIGH** | Verified against competitor feature sets and Cue's architectural constraints |

---

## Open Questions for Planning Phase

1. **Class Challenge Architecture:** How to safely enable editing during presentation mode without breaking BroadcastChannel sync?
2. **Work Together Quality:** What quality threshold for AI-generated activities? (May need human review/refinement)
3. **Elaborate Slide Layout:** Paragraph layout vs bullet layout — reuse existing layouts or create new "article" layout?
4. **Single Script Regeneration:** Should it regenerate all three verbosity levels or just current selection?
