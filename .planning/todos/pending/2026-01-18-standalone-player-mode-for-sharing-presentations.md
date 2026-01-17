---
created: 2026-01-18T00:00
title: Build standalone player mode for sharing presentations
area: general
files: []
---

## Problem

Currently PiPi requires the creator to have Google accounts and AI generation tools to use presentations. This limits sharing with teaching team members who:
- Don't have Google accounts
- Don't have access to AI generation APIs
- Just need to present/use content that was already created

The goal is to allow a teacher to:
1. Create slides, resources, and images using PiPi (with all the AI features)
2. Save/export the finished presentation as a shareable file
3. Share that file with colleagues
4. Colleagues can open it in a "player mode" that works without any API access

This player mode would:
- Display all slides as designed
- Provide access to all downloads/resources
- Work offline or without authentication
- Preserve the visual quality (avoiding PowerPoint export which looks poor)

**Open question:** How to handle live-generated content like questions and games? Options might include:
- Pre-generate and cache them during export
- Skip those features in player mode
- Bundle question banks with the export

## Solution

TBD — This is a significant feature requiring:
- Design of a save file format (JSON bundle? ZIP with assets?)
- Separate player app or player mode in the same app
- Asset bundling (images, resources, downloads)
- Strategy for interactive/AI-generated content
- Possibly a simpler build/distribution for the player
