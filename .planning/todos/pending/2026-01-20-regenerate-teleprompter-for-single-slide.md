---
created: 2026-01-20T09:01
title: Add regenerate teleprompter for single slide
area: ui
files:
  - src/components/SlideEditor.tsx
---

## Problem

When users manually edit slide content after AI generation, the teleprompter script no longer matches what's displayed on the slide. Currently there's no way to update just the teleprompter for a single slide without regenerating the entire presentation.

Users need a "Revise Teleprompter" button on individual slides that will:
1. Look at the context from slides before and after
2. Consider the user's manual changes to the slide content
3. Regenerate only the teleprompter script for that specific slide to fit within the sequence

This ensures the teacher's script stays coherent with manual content edits while maintaining flow with surrounding slides.

## Solution

Add a "Revise Teleprompter" button to each slide in the editor that:
1. Gathers context (previous slide content/teleprompter, current slide content, next slide content/teleprompter)
2. Calls AI to regenerate just the teleprompter for the current slide
3. Updates only the teleprompter field for that slide
