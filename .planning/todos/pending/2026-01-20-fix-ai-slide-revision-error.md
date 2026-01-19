---
created: 2026-01-20T09:00
title: Fix AI slide revision error on edit page
area: ui
files:
  - src/components/SlideEditor.tsx
---

## Problem

On the slide edit page, each slide has an option to "revise slide using AI". When clicking this button and providing instructions for what the AI should modify, an error message appears and the feature doesn't work.

This is a bug in the existing AI revision functionality that prevents users from making AI-assisted edits to individual slides.

## Solution

TBD - Need to investigate:
1. What error message appears
2. Whether the API call is failing or the UI handling is broken
3. Check the AI revision handler/endpoint
