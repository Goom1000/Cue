---
created: 2026-01-22T19:10
title: Add tooltips and onboarding walkthrough
area: ui
files:
  - TBD (all major UI components)
---

## Problem

New users have no guided way to learn about all the app's features. The app has many powerful features (teleprompter, student display, class bank, targeted questioning, etc.) but users need to discover them on their own.

Two related needs:
1. **Contextual help**: Each feature should have a small "i" icon that shows a tooltip explaining what it does
2. **First-time walkthrough**: A guided tour that grays out the screen and highlights each section in logical order with explanatory dialog boxes

## Solution

**Part 1: Tooltip system**
- Add info icon (ℹ️ or similar) next to each feature/section
- Clicking shows a popover/tooltip with explanation
- Should be unobtrusive but discoverable

**Part 2: Onboarding walkthrough**
- Trigger automatically on first app launch (track in localStorage/user prefs)
- Gray overlay with spotlight on current feature
- Dialog box positioned next to each highlighted section
- Logical progression through features (likely: main display → teleprompter → class management → questioning features)
- Next/Skip/Finish controls
- "Replay walkthrough" option accessible from settings or help menu

Consider using a library like react-joyride, intro.js, or similar for the walkthrough implementation.
