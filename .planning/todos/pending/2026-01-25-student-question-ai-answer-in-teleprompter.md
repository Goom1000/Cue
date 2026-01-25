---
created: 2026-01-25T11:14
title: Student question AI answer in teleprompter
area: ui
files:
  - src/components/TeleprompterPanel.tsx
---

## Problem

During lessons, students ask unexpected questions that teachers may not immediately have a good answer for. Currently, teachers must either:
- Think on the spot (stressful, may give incomplete answers)
- Say "I'll get back to you" (disrupts lesson flow)
- Look it up manually (breaks teaching momentum)

The AI already has context from the slides and lesson content, so it could provide contextually appropriate answers that match the lesson's language and themes.

## Solution

Add a "Student Question" button/section in the teleprompter panel:

1. **Button in teleprompter**: Click to open a modal dialog
2. **Text input**: Teacher types or voice-dictates the student's question
3. **AI generation**: AI generates a suitable response using:
   - Current slide context
   - Overall lesson/presentation content
   - Age-appropriate language matching the slides
   - Theme-consistent terminology
4. **Display response**: Answer appears in teleprompter for teacher to read/paraphrase

**Key consideration**: Response should be visible only to teacher (teleprompter), not students. This maintains the "students see presentation, teacher sees teleprompter" core value.
