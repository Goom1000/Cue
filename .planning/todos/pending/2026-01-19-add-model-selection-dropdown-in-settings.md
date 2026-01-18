---
created: 2026-01-19T00:00
title: Add model selection dropdown in settings
area: ui
files: []
---

## Problem

Currently users can switch between AI providers (Gemini, Claude) in settings, but:
- There's no visibility into which specific model version is being used
- The app might be using a lower-tier model (e.g., Claude 3.5 instead of 4.5)
- Users have no control over model selection
- Different models have different capabilities, costs, and quality

Users should be able to:
1. See which specific model is currently selected
2. Choose from available models for their selected provider
3. Refresh the model list to get the latest available models

## Solution

TBD — likely involves:
- When a provider is selected in settings, show a model dropdown
- Fetch available models from the provider's API (already have list-models for key validation)
- Add a "Refresh Models" button to update the list
- Store selected model in settings alongside the API key
- Default to a sensible model if none selected
- May need to show model info (capabilities, pricing tier hints)
