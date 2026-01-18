---
created: 2026-01-19T00:00
title: Script mode slides with teleprompter on screen
area: ui
files: []
---

## Problem

Current presentations are designed for the creator to use:
- **Student view:** Brief dot points (minimal text)
- **Teacher view:** Dot points + teleprompter script

This works great for the creator, but when exporting for another teacher:
- They only get the dot points
- They have no context for what to say
- They must elaborate on their own without understanding the lesson flow
- The teleprompter content (the real teaching script) is lost

**Use case:** A teacher creates a presentation, exports it, and gives it to a colleague or teaching assistant. That person should be able to just read what's on the screen to deliver the lesson effectively.

## Solution

Add a toggle on the landing page (during generation):
- **Normal mode:** Current behavior (dot points + separate teleprompter)
- **Script mode:** Teleprompter content becomes the main slide content
  - Slides show detailed script that can be read aloud
  - No separate teleprompter needed
  - Exports are self-contained and usable by anyone

This is a generation-time option — the AI produces different output based on the mode selected.
