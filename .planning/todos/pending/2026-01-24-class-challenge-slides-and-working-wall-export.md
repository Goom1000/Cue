---
created: 2026-01-24T02:23
title: Class Challenge slides and Working Wall export
area: ui
files:
  - src/components/ThumbnailStrip.tsx (add slide button)
  - TBD (new interactive slide type)
---

## Problem

Teachers need two related capabilities:

1. **Interactive "Class Challenge" slides**: A way to create live classroom activities where students contribute responses that appear on screen. Currently no way to capture student verbal contributions in real-time and display them attractively.

2. **Working Wall export**: Teachers maintain a "Working Wall" - a classroom display of reference materials from lessons (vocabulary lists, grammar rules, key concepts). Currently no way to export lesson content as polished educational posters.

## Solution

### Part 1: Class Challenge Slides

Add new slide type via the "+" button in thumbnail strip:
- **Challenge prompt** at top (e.g., "Can you suggest some modal verbs?")
- **Input fields** that teacher adds dynamically as students contribute
- Each contribution appears in a styled box/card on screen
- Students see contributions build up in real-time on display
- Activity ends when teacher moves to next slide

**Purpose**: Reinforce concepts through participation AND create exportable resources

### Part 2: Working Wall Export

Add "Export for Working Wall" button somewhere accessible:
- Opens selection modal to choose which slides to export
- **AI Poster Designer**: Takes selected slides and transforms them into clear educational posters
  - AI understands the slide's pedagogical purpose
  - Converts rough "live classroom" content into polished reference materials
  - Outputs print-ready poster format (PDF/image)
  - Appropriate styling for classroom wall display

**Key insight**: The Class Challenge slides naturally produce content perfect for Working Wall - vocabulary lists, student-generated examples, etc.
