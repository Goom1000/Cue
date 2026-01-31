# Features Research: Content Preservation

**Domain:** AI-powered educational content generation
**Milestone:** v3.8 Preserve Teacher Content
**Researched:** 2026-02-01
**Confidence:** HIGH (based on codebase analysis + educational tool ecosystem research)

---

## Executive Summary

Content preservation in AI educational tools is an emerging expectation, not yet standard practice. Most AI lesson planning tools focus on **generation** and **customization**, not **preservation**. Teachers are trained to refine AI output through iterative prompting rather than expecting the AI to preserve their specific content.

This creates a differentiation opportunity for Cue: if teachers include specific questions or activities in their lesson plans, Cue should preserve them verbatim rather than generalizing. This aligns with teacher mental models ("I wrote this question deliberately") and reduces frustration with AI "improving" content that was intentionally specific.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or frustrating.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Specific questions preserved verbatim** | Teachers write questions deliberately; generalizing them feels like the AI ignored their input | Medium | Detection + prompt engineering |
| **Activity instructions preserved** | Step-by-step instructions (e.g., "Cut paper in half") have specific sequence/wording teachers want | Medium | Same mechanism as questions |
| **Teleprompter includes preserved content** | Teacher needs to read the exact question to students; can't make it up on the spot | Low | Already flows through - just needs preserved content to reach teleprompter |
| **Math problems with specific numbers** | "Calculate 24 x 15" must not become "practice multiplication" - the numbers ARE the exercise | High priority | Most visible preservation failure |
| **Consistent preservation across modes** | Fresh, Refine, and Blend modes should all preserve teacher content equally | Medium | Needs injection into all three mode prompts |

### Table Stakes Evidence

**Teacher frustration patterns** (from web research):
- "AI gets you 80% of the way there" - teachers expect to edit, not have content overwritten
- Common complaint: "too generic, too long, too fluffy" - teachers want specificity preserved
- "Garbage in, garbage out" - if teachers provide specific content, they expect specific output

**Existing tool behavior** (from competitor analysis):
- Monsha: "edit to perfection" after generation - implies initial output may need correction
- Chalkie: "make your own changes" - post-generation editing, not preservation
- Magic School: "customize outputs to suit" - editing, not input preservation

**Gap identified:** No major AI lesson tool explicitly promises verbatim preservation of teacher-specified content. This is table stakes for Cue because the current behavior (generalizing specific questions) directly contradicts teacher expectations.

---

## Differentiators

Features that set Cue apart. Not expected, but valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Automatic detection of preservable content** | No markup required; AI recognizes questions/activities by context | Medium | Heuristic-based detection (numbers, question marks, "Task:" prefixes) |
| **Preservation across content types** | Works with lesson PDFs, existing PowerPoints, and uploaded resources | Medium | Same rules applied to all GenerationInput sources |
| **Visual indicator for preserved content** | Teacher sees what was preserved vs. generated | Medium | Could use subtle badge or italics in editor |
| **Teacher override for AI interpretation** | If AI incorrectly generalizes, one-click "use original text" | High | Requires storing original alongside generated |
| **Preservation confidence feedback** | "3 questions preserved from your lesson plan" toast/notification | Low | Counts detection matches, surfaces to user |
| **Context-aware question placement** | Preserved questions appear at pedagogically appropriate slide positions | High | AI determines slide flow, not just content |

### Differentiator Rationale

**Why these matter:**

1. **Automatic detection** removes friction. Teachers don't want to mark up their lesson plans with `[PRESERVE]` tags. The AI should understand intent from context.

2. **Cross-content preservation** is unique to Cue. Existing tools treat each upload as separate; Cue's multi-mode system (fresh/refine/blend) means preserved content should flow through all sources.

3. **Visual indicators** build trust. When teachers see their exact words on slides, they gain confidence in the tool. Marking preserved content reduces the "did it change anything?" uncertainty.

**Competitive advantage:**
- Most AI lesson tools are generation-focused: "describe what you want, we'll create it"
- Cue's PDF-based workflow means teachers have ALREADY written content
- Preservation respects existing teacher work rather than replacing it

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Explicit markup syntax** | Teachers won't learn `[PRESERVE]` tags; adds friction to natural workflows | Automatic detection with heuristics |
| **100% verbatim mode** | Some content SHOULD be transformed (teacher notes to student-facing, verbose explanations to bullets) | Selective preservation based on content type |
| **Preservation blocking AI enhancement** | If AI can't improve surrounding content, the value diminishes | Preserve specific items, enhance the flow around them |
| **Post-hoc preservation selection** | Asking "which parts to preserve?" after generation is too late; content already lost | Preserve during generation, allow override after |
| **Character-level matching** | Minor formatting differences (double space vs. single) shouldn't break preservation checks | Semantic preservation with format normalization |
| **Preservation logging/history** | Over-engineering for a simple feature | Just preserve the content; don't track what was preserved |

### Anti-Feature Rationale

**Why automatic detection over markup:**
- Research finding: "If you've ever tried asking an AI tool for help and ended up with a response that was generic, too complex, or just plain unhelpful, you're not alone. Most of these frustrations come down to how prompts are written."
- Teachers are already frustrated with needing to craft perfect prompts; adding preservation markup would increase cognitive load

**Why selective over 100% verbatim:**
- Cue's value is in TRANSFORMATION: lesson plans to slideshows
- Pure preservation would just be a copy/paste tool
- The skill is knowing WHAT to preserve (specific questions) vs. WHAT to transform (explanations)

**Why inline preservation over post-hoc selection:**
- UX pattern research: "Always show the AI's result inline as a suggestion layer, not an overwrite. Require verification to accept, reject, or refine."
- Once content is generalized, the original is lost unless stored separately
- Better to preserve first, allow override to AI-generated version

---

## User Expectations

What teachers expect when they include specific content in lesson plans.

### Mental Model: "AI as Teaching Assistant"

Teachers approach AI tools with this mental model:
- "I've done the hard work of writing specific questions"
- "The AI should HELP me present this, not REPLACE what I wrote"
- "My students need to hear THESE exact questions, not paraphrases"

### Specific Expectations by Content Type

| Content Type | Teacher Expectation | Current Behavior (Problem) |
|--------------|---------------------|---------------------------|
| **Math problems** | "24 x 15" stays "24 x 15" | Becomes "multiplication practice" |
| **Discussion questions** | "What would happen if we removed all the bees?" | Becomes "Discussion: Ecosystem interdependence" |
| **Activity steps** | "1. Cut paper in half 2. Fold on dotted line" | Becomes "Complete the paper folding activity" |
| **Fill-in-the-blank** | "The capital of France is ___" | Becomes "Test your geography knowledge" |
| **Reading comprehension** | "What did Max feel when he saw the wolf?" | Becomes "Discuss character emotions" |
| **Success criteria** | "I can add fractions with different denominators" | Usually preserved (structured format helps) |

### Teacher Workflow Expectations

**Upload phase:**
- Teacher uploads PDF with lesson plan
- Lesson plan contains mix of explanatory text AND specific questions/activities
- Teacher expects AI to "know the difference"

**Generation phase:**
- Slides should be engaging and student-friendly
- BUT specific questions should appear exactly as written
- Teleprompter should include the exact question text

**Presentation phase:**
- Teacher reads question from teleprompter
- Students see question on slide
- Both must match what teacher originally wrote

### Trust Dynamics

**Trust built when:**
- "I see my exact words on the slide"
- "The AI understood what I wanted to preserve"
- "I can rely on this for my lesson tomorrow"

**Trust broken when:**
- "It changed my carefully-worded question"
- "I have to manually fix every slide"
- "This is more work than doing it myself"

---

## Integration with Existing Verbosity System

Cue has a three-level verbosity toggle (Concise / Standard / Detailed). Preservation must interact correctly with verbosity.

### Current Verbosity Behavior

| Level | Teleprompter Behavior |
|-------|----------------------|
| Concise | Brief keywords and phrases |
| Standard | Natural conversational delivery |
| Detailed | Full scripts teacher can read verbatim |

### Preservation + Verbosity Interaction

| Content Type | Concise | Standard | Detailed |
|--------------|---------|----------|----------|
| **Preserved questions** | Question preserved verbatim | Question preserved verbatim | Question preserved verbatim |
| **Surrounding context** | Minimal setup | Conversational intro | Full script with transitions |

**Key principle:** Verbosity affects GENERATED content, not PRESERVED content.

Example with question "What would happen if we removed all the bees?":

| Verbosity | Teleprompter Output |
|-----------|---------------------|
| Concise | "Ask: What would happen if we removed all the bees?" |
| Standard | "Let's think about this. What would happen if we removed all the bees? Give students 30 seconds to discuss with a partner." |
| Detailed | "Now we're going to explore ecosystem interdependence. I'd like you to consider this question carefully. What would happen if we removed all the bees? Turn to your partner and share your thoughts. After 30 seconds, we'll hear some ideas." |

The question itself never changes. The scaffolding around it does.

---

## Feature Priority Matrix

Based on research, recommended implementation order:

### P0 - Ship Blocker

- Specific questions preserved verbatim on slides
- Specific questions preserved in teleprompter
- Works in Fresh mode (primary use case)

### P1 - Strong Expectation

- Activity/instruction preservation
- Math problem preservation (numbers intact)
- Works in Refine and Blend modes

### P2 - Differentiation

- Visual indicator for preserved content
- Preservation count feedback
- Detection confidence tuning

### P3 - Future Enhancement

- Teacher override (use original vs. AI version)
- Explicit preservation markers (optional, for power users)
- Per-slide preservation settings

---

## Comparison with Competitor Approaches

| Tool | Preservation Approach | Limitation |
|------|----------------------|------------|
| **Monsha** | Edit after generation | No input preservation; requires manual correction |
| **Chalkie** | AI editing with single-click tweaks | Can "make it more fun" but not "preserve my question" |
| **MagicSchool** | Customization after generation | Teacher corrects output, doesn't preserve input |
| **Brisk** | Works on existing content | Transforms, doesn't preserve verbatim |
| **Eduaide** | Content generation from scratch | No preservation - it's generation, not adaptation |
| **Cue (proposed)** | Automatic detection + verbatim preservation | Unique approach - respects teacher input |

**Competitive position:** Cue would be first to offer automatic preservation of teacher-specified content. This aligns with Cue's PDF-to-slides workflow where teachers have already written content.

---

## Sources

### Web Research (MEDIUM confidence)

- [PCE San Diego - AI Tools for Teachers](https://pce.sandiego.edu/ai-tools-for-teachers/) - Tool landscape
- [Eduaide.ai](https://www.eduaide.ai/) - Content generation approach
- [Monsha](https://monsha.ai) - Edit-after-generation pattern
- [Brisk Teaching](https://www.briskteaching.com/) - Transform without preservation
- [Teaching Channel - 65 AI Prompts](https://www.teachingchannel.com/k12-hub/blog/65-ai-prompts-for-lesson-planning/) - Teacher prompting strategies
- [Edutopia - AI Lesson Planning](https://www.edutopia.org/article/ai-tools-lesson-planning/) - Teacher expectations
- [Medium - Think Before You Prompt](https://medium.com/@noble-words/think-before-you-prompt-why-teachers-must-craft-ai-prompts-carefully-and-stop-blaming-the-robot-7f89f30be447) - Teacher frustration patterns
- [ShapeofAI - Inline Action Pattern](https://www.shapeof.ai/patterns/inline-action) - Preserve authorship UX
- [Medium - Fix It, Tweak It, Transform It](https://medium.com/ui-for-ai/fix-it-tweak-it-transform-it-a-new-way-to-refine-ai-generated-content-dc53fd9d431f) - Multi-level refinement
- [Smashing Magazine - AI Interface Patterns](https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/) - UX patterns for AI tools
- [UX Tigers - Prompt Augmentation](https://www.uxtigers.com/post/prompt-augmentation) - Enhancement vs. fidelity

### Codebase Analysis (HIGH confidence)

- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/.planning/PROJECT.md` - Project context, existing features
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/services/aiProvider.ts` - GenerationInput type, provider interface
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/services/geminiService.ts` - Current prompt structure, "preserve" usage
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/services/providers/claudeProvider.ts` - Claude prompt patterns
- `/Users/ricky/Documents/App_Projects/Education Apps/DEV - Cue/.planning/research/ARCHITECTURE-content-preservation.md` - Existing architecture research

### Key Insight from Codebase

The codebase already uses "preserve" language in prompts (lines 118, 136, 138, 139 in geminiService.ts) for Refine mode to preserve pedagogical structure. The content preservation feature extends this same pattern to user-specified questions and activities.

---

## Confidence Assessment

| Category | Confidence | Reason |
|----------|------------|--------|
| Table Stakes | HIGH | Clear user expectation from workflow analysis |
| Differentiators | MEDIUM | Based on competitor gap analysis, not user research |
| Anti-Features | HIGH | Engineering tradeoffs are well-understood |
| User Expectations | MEDIUM | Inferred from teacher workflow + AI tool research |
| Verbosity Integration | HIGH | Direct codebase analysis |

**Overall confidence:** HIGH for core feature definition, MEDIUM for prioritization. Would benefit from teacher interviews to validate differentiator priority.
