# Slide Editor / Canvas Mode

**Source:** Phase 56 checkpoint discussion
**Priority:** High (affects paste workflow usability)
**Category:** Feature

## Problem

When pasting slides from PowerPoint, the AI extracts text well but the visual content (diagrams, worksheets, arrows, functional graphics) is lost or replaced by generic AI illustrations. Teachers need to preserve and compose visual elements from original slides because they serve a pedagogical purpose (e.g., planning worksheets with arrows guiding students through tasks).

## Proposed Solution

Add a "Slide Editor" mode accessible via an Edit button on the slide editing page. When opened, it shows:

1. **Text content** (editable) - title, bullets from AI analysis
2. **Layout selector** - choose how content is arranged
3. **Image canvas area** where teachers can:
   - See any AI-generated image (optional)
   - Paste images from clipboard (snipping tool, screenshots from other decks)
   - Resize and position pasted images on the slide
   - Layer multiple images if needed
4. **Preview** of how the final slide will look in presentation mode

## Technical Implications

- Slide data model changes: from single `imageUrl` to array of positioned images with x/y/width/height
- Canvas rendering: need a visual editor component (consider fabric.js or konva.js)
- Image persistence: multiple images per slide stored as data URLs or uploaded
- Export: positioned images need to render correctly in presentation view

## User Story

"As a teacher, I want to paste my PowerPoint slide, have the AI extract and improve the text, but then add specific images from the original deck (cropped via snipping tool) so my Cue slides have both great teleprompter notes AND the exact visual aids my students need."

## Scope

This is likely a future milestone feature (beyond v4.0), or could be added as an additional phase in v4.0 if prioritized.
