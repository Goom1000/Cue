---
created: 2026-01-20T04:36
title: Add Elaborate and Work Together slide options
area: ui
files:
  - src/components/SlideList.tsx
  - src/services/ClaudeProvider.ts
---

## Problem

The slide thumbnail "+" insertion menu currently offers two options: Blank and Exemplar. Teachers need more pedagogical slide types that can be auto-generated based on lesson context:

1. **Elaborate** - When a concept needs deeper explanation beyond dot points, teachers need a way to quickly generate a more detailed, comprehensive slide that elaborates on the current content.

2. **Work Together** - Teachers frequently need collaborative pair/group activities but designing them on the fly is time-consuming. Need a quick way to generate simple activities using minimal classroom resources.

## Solution

**Expand the "+" dropdown menu with two new options:**

**"Elaborate" option:**
- AI analyzes current slide and preceding content
- Generates a new slide with more comprehensive, detailed content
- NOT just more bullet points - thorough explanation students can "get their teeth into"
- Inserted after the current slide position

**"Work Together" option:**
- AI analyzes current slide and preceding content
- Generates a collaborative activity slide
- Activity constraints:
  - Uses only basic resources: pen/pencil, paper, whiteboard
  - Designed for pairs (primary) with group-of-3 alternative
  - Related to the current topic being taught
- Slide shows activity instructions for students
- Teleprompter shows teacher facilitation notes

**UI placement:**
- Same "+" button between thumbnails
- Dropdown now has 4 options: Blank, Exemplar, Elaborate, Work Together
