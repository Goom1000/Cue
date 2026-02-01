# Feature Landscape: Clipboard Paste and Deck Cohesion

**Domain:** Presentation tool - paste workflow and deck consistency
**Researched:** 2026-02-02
**Confidence:** HIGH (verified with official docs and multiple sources)

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Paste images via Ctrl+V | Universal UX pattern - users paste screenshots/images constantly | Medium | Clipboard API (browser) |
| Paste text with formatting | Users copy formatted content from web/docs, expect it preserved | Medium | Clipboard API |
| Paste feedback (visual confirmation) | Users need to know paste succeeded | Low | None |
| Drag-and-drop images | Alternative to paste, many users prefer this | Low | Existing file upload |
| Undo paste action | Standard UX - mistakes happen | Low | Existing slide editing |
| Loading state during AI processing | Users need to know system is working on pasted content | Low | Existing loading states |

### Paste Formatting Options (PowerPoint Standard)

PowerPoint and Google Slides offer two options when pasting slides:
- **Use Destination Theme**: Adapt pasted content to match existing deck styling
- **Keep Source Formatting**: Preserve original colors, fonts, layouts

For Cue specifically: Since AI generates/improves slides, the natural behavior is "use destination theme" (AI applies Cue's layouts). "Keep source formatting" is less relevant since AI transforms content anyway.

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Depends On |
|---------|-------------------|------------|------------|
| **AI-powered slide improvement on paste** | Paste raw slides, AI restructures with proper layouts/visuals | High | AI service, slide generation |
| **"Make Cohesive" button** | One-click to unify mismatched slides into consistent design | High | AI service, all slides |
| **Lesson plan gap analysis** | Compare slides against uploaded lesson plan, identify missing topics | High | Lesson plan text, slide content |
| **Visual scaffolding detection** | AI identifies diagrams/images in pasted content and preserves them | Medium | Existing visual detection |
| **Batch paste (multiple slides)** | Paste many slides at once from clipboard | Medium | Slide parsing |
| **Smart slide insertion point** | AI suggests where in deck to insert pasted content based on flow | Medium | Slide content analysis |

### Make Cohesive: What It Actually Does

Based on research into tools like DeckRobot, Beautiful.ai, and Wonderslide, "deck cohesion" features typically include:

1. **Visual consistency**: Unify fonts, colors, header styles, spacing
2. **Layout normalization**: Apply consistent layouts across slides (title positioning, bullet alignment)
3. **Theme application**: Match new slides to existing deck theme
4. **Flow improvement**: Reorder slides for logical progression (optional, AI-assisted)

For Cue, "Make Cohesive" should focus on:
- Normalizing slide layouts to Cue's layout system (`split`, `full-image`, `center-text`, etc.)
- Unifying theme colors across all slides
- Ensuring consistent bullet/content structure
- Optionally regenerating images to match a unified visual style

### Gap Analysis: What It Means for Teachers

Based on curriculum gap analysis tools (EdGate, CurriculumFlow), gap analysis in education context means:

1. **Content coverage check**: Which lesson plan topics are represented by slides?
2. **Missing topics identification**: What's in the lesson plan but not in slides?
3. **Depth assessment**: Are topics covered superficially or thoroughly?
4. **Sequence validation**: Are topics in logical teaching order?

For Cue, "Gap Check" should:
- Parse lesson plan text (already uploaded)
- Extract key topics/concepts
- Match against slide titles and content
- Report: "These topics from your lesson plan aren't covered: X, Y, Z"
- Optionally: "Generate slides for missing topics?"

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Paste entire PowerPoint files via clipboard** | Clipboard doesn't support .pptx files - this is a file upload, not paste | Use existing PPTX upload feature |
| **Auto-save pasted content before confirmation** | Users may paste wrong content accidentally | Show preview, require confirmation |
| **Auto-generate images for every pasted slide** | Slow, expensive, may not match original intent | Offer as option, not default |
| **Complex paste formatting dialog** | Overwhelming for teachers who just want quick paste | AI decides format, minimal UI |
| **Clipboard monitoring/background access** | Privacy concern, requires permissions, unreliable | Only access on explicit paste action |
| **Preserving PowerPoint animations** | Cue doesn't support animations, would break expectations | Strip animations, notify user |
| **Real-time collaboration on paste** | Out of scope, adds massive complexity | Single-user paste workflow |
| **Paste directly into presentation mode** | Confusing UX, editing should happen in edit mode | Only allow paste in EDITING state |

## Feature Dependencies

```
Existing Features (Already Built)
         |
         v
+------------------+
| PDF/PPTX Upload  |-----> AI processes content
+------------------+
         |
         v
+------------------+
| Slide Generation |-----> Layouts, themes applied
+------------------+
         |
         v
+------------------+
| Slide Editing    |-----> Manual improvements
+------------------+

New Features (This Milestone)
         |
         v
+------------------+
| Clipboard Paste  |-----> Images, text, slides
+------------------+
         |
         v
+------------------+
| AI Improvement   |-----> Transform pasted content
+------------------+
         |
         v
+------------------+
| Make Cohesive    |-----> Unify deck styling
+------------------+
         |
         v
+------------------+
| Gap Analysis     |-----> Compare to lesson plan
+------------------+
```

### Dependency Map

| Feature | Depends On |
|---------|------------|
| Paste images | Clipboard API, existing slide adding |
| Paste slides | Clipboard API, slide parsing, AI service |
| AI improvement | AI service (existing), slide generation (existing) |
| Make Cohesive | AI service, access to all slides in deck |
| Gap Analysis | Lesson plan text (existing `lessonText` state), slide content |

## Implementation Priorities

### Phase 1: Core Paste (Must Have)

1. **Paste image from clipboard** (Ctrl+V or button)
   - Use Async Clipboard API with paste event fallback
   - Convert to base64, add to current slide or create new slide
   - Show loading indicator during processing

2. **Paste text content**
   - Accept plain text and HTML
   - Extract meaningful content, strip unnecessary formatting
   - Send to AI for slide generation

### Phase 2: AI Enhancement

3. **AI improvement of pasted content**
   - Use existing `generateLessonSlides` or similar
   - Apply Cue layouts and themes
   - Generate speaker notes

4. **Batch slide paste**
   - Parse multiple slides from clipboard HTML
   - Process each through AI
   - Insert at current position or end

### Phase 3: Cohesion Features

5. **Make Cohesive button**
   - Analyze all slides for inconsistencies
   - AI suggests/applies unified theme
   - Preview changes before applying

6. **Gap Analysis**
   - Parse lesson plan text
   - Extract topic list
   - Compare against slide content
   - Display coverage report

## Technical Notes

### Clipboard API Considerations

**Modern approach (preferred):**
```typescript
const items = await navigator.clipboard.read();
for (const item of items) {
  if (item.types.includes('image/png')) {
    const blob = await item.getType('image/png');
    // Process image
  }
  if (item.types.includes('text/html')) {
    const blob = await item.getType('text/html');
    // Process HTML slides
  }
}
```

**Fallback (paste event):**
```typescript
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      // Process image
    }
  }
});
```

**Browser support:**
- Async Clipboard API: Chrome 76+, Edge 79+, Firefox 127+, Safari 13.1+
- Paste event: Universal support
- Recommendation: Use progressive enhancement

**Security requirements:**
- Must be in secure context (HTTPS or localhost)
- User must trigger the action (click, keypress)
- Permission may be requested on first use

### HTML Slide Parsing

When users copy slides from PowerPoint/Google Slides:
- Clipboard contains `text/html` with slide structure
- Also contains `text/plain` as fallback
- Images may be embedded as base64 or external URLs
- Need to handle both formats

### Make Cohesive Algorithm Considerations

Based on DeckRobot and Beautiful.ai patterns:
1. Analyze current slides for dominant theme/layout
2. Identify outlier slides (different colors, fonts, layouts)
3. Generate unified styling rules
4. Apply to outliers while preserving content
5. Option: Preview before applying

## Sources

### Clipboard API and Paste Behavior
- [How to paste images | Clipboard | web.dev](https://web.dev/patterns/clipboard/paste-images)
- [Clipboard: read() method | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read)
- [Clipboard API | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [Copy and paste in Office for the web | Microsoft Support](https://support.microsoft.com/en-us/office/copy-and-paste-in-office-for-the-web-682704da-8360-464c-9a26-ff44abf4c4fe)

### PowerPoint Paste Formatting
- [Copy and paste your slides | Microsoft Support](https://support.microsoft.com/en-us/office/copy-and-paste-your-slides-1fe39ace-4df6-4346-b724-30a6e2c0aeab)
- [Copy & paste slides in PowerPoint and keep slide formatting | Hocking Design](https://hockingdesign.com/copy-paste-slides-powerpoint-keep-slide-formatting/)
- [PowerPoint Copy Slides between Presentations | Office Watch](https://office-watch.com/2025/easy-way-to-duplicate-slides-between-powerpoints/)

### Deck Cohesion and Design Consistency
- [DeckRobot: AI-Powered PowerPoint Design](https://www.deckrobot.com/)
- [Beautiful.ai: Smart Slide Design](https://www.beautiful.ai/)
- [Wonderslide: AI Presentation Design](https://wonderslide.com/blog/ai-for-fonts-and-colors-perfect-slides-and-brand-consistency/)
- [Keep your presentation on-brand with Copilot | Microsoft Support](https://support.microsoft.com/en-us/topic/keep-your-presentation-on-brand-with-copilot-046c23d5-012e-49e0-8579-fe49302959fc)

### Curriculum Gap Analysis
- [ExACT: Curriculum Gap Analysis | EdGate](https://edgate.com/systems/exact/gap-analysis)
- [CurriculumFlow: AI Curriculum Alignment Tool](https://www.curriculumflow.com/)
- [Conducting a curriculum gap analysis | Watermark Insights](https://www.watermarkinsights.com/resources/blog/conducting-a-curriculum-gap-analysis/)
- [How to Identify and Address Learning Gaps | Progress Learning](https://progresslearning.com/news-blog/identify-and-address-learning-gaps/)

---

*Research completed: 2026-02-02*
