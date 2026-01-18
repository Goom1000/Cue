# Feature Landscape: Dual-Monitor Presentation Systems

**Domain:** Browser-based dual-monitor presentation (teacher view + student view)
**Researched:** 2026-01-18
**Confidence:** HIGH (verified against PowerPoint, Google Slides, reveal.js official documentation)

## Executive Summary

Dual-monitor presentation systems have a well-established feature set defined primarily by PowerPoint Presenter View and Google Slides. For a classroom teleprompter-focused tool, the table stakes are narrower than general presentation software, but reliability expectations are higher. Teachers presenting to a class cannot afford technical hiccups.

The existing PiPi codebase already implements many core features (speaker notes, slide sync, bullet reveal, student name assignment) but uses a fragile `window.open()` approach that does not guarantee window placement on the correct display. The primary gap is not features but rather **reliability of the dual-monitor setup itself**.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | PiPi Status | Notes |
|---------|--------------|------------|-------------|-------|
| **Separate teacher/student displays** | Core value proposition - teacher sees notes, students see slides only | High | Partial | Uses `window.open()` which does not control display placement |
| **Speaker notes visible to presenter** | Every presentation tool has this; PowerPoint, Google Slides, reveal.js | Low | Done | Already showing structured teleprompter script |
| **Current slide preview** | Presenter must see what audience sees | Low | Done | Slide preview shown in teacher view |
| **Next slide preview** | Knowing what comes next prevents stumbles | Medium | Partial | Shows "Next: [bullet]" text but no visual preview |
| **Slide navigation (next/prev)** | Basic presentation control | Low | Done | Arrow keys, buttons work |
| **Keyboard shortcuts** | Teachers need hands-free control; PowerPoint uses arrow keys, Space, N/P | Low | Done | Arrow keys and Space implemented |
| **Progressive bullet reveal** | Content pacing control; standard in all presentation software | Low | Done | Already implemented with visual counter |
| **Timer/clock display** | Knowing elapsed time; PowerPoint, Google Slides, reveal.js all have this | Low | Missing | No timer in current presenter view |
| **Sync between windows** | When teacher advances, student view must update immediately | Medium | Done | React state sharing via portal works |
| **Exit presentation gracefully** | Return to edit mode without losing state | Low | Done | Exit button implemented |

### Critical Gap Analysis

The **window placement problem** is the single biggest table stakes gap. Current implementation:

```javascript
const win = window.open('', '', 'width=800,height=600,left=200,top=200');
```

This opens a window at a fixed position, which will usually appear on the same monitor as the main window. On a typical classroom setup (laptop + projector), the teacher must manually drag the student window to the projector.

**Expected behavior:** Student view should appear on the secondary display (projector) automatically, or at minimum, the system should make it trivially easy to move there.

**Industry standard solutions:**
1. **Window Management API** - Chrome/Edge allow querying displays and positioning windows on specific screens (requires permission prompt)
2. **Presentation API** - W3C standard for presenting to secondary displays (limited browser support)
3. **Manual "Pop out + F11"** - Most reliable fallback; teacher pops out student view and hits F11 for fullscreen

---

## Differentiators

Features that set PiPi apart. Not expected but valued.

| Feature | Value Proposition | Complexity | PiPi Status | Notes |
|---------|-------------------|------------|-------------|-------|
| **Teleprompter-style notes** | Structured script format (STUDENT READS / TEACHER ELABORATES) vs raw notes | Medium | Done | Core differentiator already implemented |
| **Student name assignment** | Auto-assigns reading parts to students; no other tool does this | High | Done | Already implemented and randomized |
| **Question flag system** | Mark slides needing comprehension checks | Low | Done | Visual flag with highlighting |
| **AI question generation** | Generate differentiated questions (Grade C/B/A) on demand | High | Done | Already integrated |
| **Quiz game mode** | Gamified formative assessment mid-presentation | High | Done | Full quiz overlay with Kahoot-style UI |
| **Bullet-level script sync** | Notes change per bullet, not per slide | Medium | Done | currentScriptSegment logic handles this |
| **Auto display detection** | Detect secondary display and offer to present there | Medium | Missing | Would require Window Management API |
| **One-click projector mode** | Single button puts student view on projector fullscreen | Medium | Missing | Combine window.open + screen detection + fullscreen request |
| **Presenter remote support** | USB presentation clickers work (they send Page Up/Down) | Low | Missing | Need to add Page Up/Down keyboard support |
| **Display layout options** | Toggle between side-by-side and stacked teacher view | Low | Done | Already implemented |

### Highest-Value Missing Differentiators

1. **Auto display detection** - Eliminates manual window dragging; transforms UX
2. **Presenter remote support** - Teachers use clickers; trivial to add (Page Up/Down = prev/next)
3. **Timer with color warnings** - Yellow at 5 min, red at 1 min; stagetimer.io pattern

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Annotation/drawing tools** | Scope creep; PowerPoint/Slides do this better; focus on teleprompter value | Defer indefinitely; use PowerPoint export for annotation needs |
| **Laser pointer simulation** | Same as above; adds complexity without unique value | Out of scope |
| **Video/audio embedding** | Major complexity; streaming to second window is hard; not core to teleprompter use case | Support static images only; teachers use separate apps for video |
| **Audience Q&A system** | Google Slides already does this; Mentimeter, Slido specialize here | Integrate with existing tools rather than building |
| **Cloud sync/collaboration** | Massive infrastructure; Google/Microsoft already solved this | Local-first; export to PPTX for sharing |
| **Custom transitions/animations** | PowerPoint territory; diminishing returns | Simple fade only |
| **Speaker video feed** | Zoom/Teams territory; irrelevant for classroom with projector | Not applicable to use case |
| **Session recording** | Recording a second window is complex; other tools exist | Out of scope |
| **Multi-presenter handoff** | Edge case; adds significant state complexity | Single presenter model |
| **Slide reordering during presentation** | Confusing for presenter; violates mental model of fixed flow | Allow in edit mode only |

### Why These Are Anti-Features

The core insight: PiPi's value is **AI-generated teleprompter scripts for classroom teaching**, not being a general-purpose presentation tool. PowerPoint, Google Slides, and Keynote have spent decades on annotation, transitions, and collaboration. PiPi cannot and should not compete there.

Every feature added that is not directly supporting the teleprompter use case dilutes focus and increases maintenance burden.

---

## Feature Dependencies

```
AUTO DISPLAY DETECTION
  |
  +-- Window Management API permission
  |     |
  |     +-- getScreenDetails() call
  |     +-- Screen selection UI
  |
  +-- Fullscreen on specific screen
        |
        +-- requestFullscreen({ screen })

PRESENTER REMOTE SUPPORT
  |
  +-- Page Up/Down keyboard handling (trivial)

TIMER SYSTEM
  |
  +-- Elapsed timer (simple)
  +-- Countdown timer (optional)
  +-- Color warnings (green -> yellow -> red)

NEXT SLIDE PREVIEW
  |
  +-- Thumbnail generation (already have slide renderer)
  +-- Layout space in presenter console
```

---

## MVP Recommendation

For the dual-monitor milestone, prioritize reliability over features.

### Must Have (Table Stakes Gaps)

1. **Timer display** - Elapsed time in presenter view header
2. **Robust window management** - Either Window Management API integration OR clear UX for manual fullscreen
3. **Presenter remote support** - Page Up/Down keyboard handling

### Should Have (High-Value Differentiators)

4. **Next slide visual preview** - Small thumbnail in presenter console
5. **Auto display detection** - Query screens, offer to present on secondary

### Defer

- Annotation tools (anti-feature)
- Transitions (anti-feature)
- Countdown timers (nice-to-have)
- Recording (anti-feature)

---

## Competitive Landscape

| Tool | Teacher/Presenter View | Strengths | Weaknesses for PiPi Use Case |
|------|------------------------|-----------|------------------------------|
| **PowerPoint Presenter View** | Full-featured: notes, next slide, timer, zoom, annotations | Industry standard; clicker support; reliable | No AI scripts; notes are manual |
| **Google Slides Presenter View** | Notes, timer, Q&A, pointer | Browser-based; Meet integration | No AI; limited customization |
| **reveal.js Speaker Notes** | Notes, timer, next slide via second window | Open source; customizable | Manual; no student name assignment |
| **Keynote Presenter Display** | Notes, next slide, timer | Mac-native; polished | Closed ecosystem |
| **Nearpod** | Teacher dashboard with student response view | Interactive features | Different paradigm (student devices) |

### PiPi's Unique Position

None of these tools generate structured teleprompter scripts with student reading assignments. PiPi does not need to match PowerPoint feature-for-feature; it needs to:

1. **Reliably show slides on projector** (table stakes)
2. **Show AI-generated teleprompter scripts** (core value)
3. **Sync bullet reveals across displays** (already done)

---

## Technical Considerations for Implementation

### Window Management API

```javascript
// Check support
if ('getScreenDetails' in window) {
  const screens = await window.getScreenDetails();
  const external = screens.screens.find(s => !s.isPrimary);
  if (external) {
    // Open on external display
    const popup = window.open('', '',
      `left=${external.left},top=${external.top},width=${external.width},height=${external.height}`);
    popup.document.body.requestFullscreen({ screen: external });
  }
}
```

**Browser support:** Chrome 100+, Edge 100+. Not supported in Safari or Firefox.

**Permission:** User must grant "window-management" permission.

**Fallback:** If API unavailable, fall back to window.open() with instructions for manual fullscreen.

### Presentation API Alternative

```javascript
const request = new PresentationRequest('student-view.html');
request.start().then(connection => {
  // connection.send() for messaging
});
```

**Browser support:** Chrome 66+ on ChromeOS, Linux, Windows. Not Mac Safari.

**Tradeoff:** Less control than Window Management API; better for casting to remote displays.

### Recommended Approach

1. **Detect Window Management API support**
2. **If supported:** Offer one-click "Present on [Display Name]" with permission request
3. **If not supported:** Open popup window with button "Click to enter fullscreen"
4. **Always:** Support Page Up/Down for clickers

---

## Permission UX for Display Targeting (v1.2 Focus)

**Updated:** 2026-01-18
**Milestone:** v1.2 Permission Flow Fix

### Current Problem

The existing permission flow has a critical UX issue:

```tsx
// Current: Appears on component mount when conditions are met
useEffect(() => {
  if (isSupported && hasMultipleScreens && permissionState === 'prompt') {
    setShowPermissionExplainer(true);
  }
}, [isSupported, hasMultipleScreens, permissionState]);
```

This creates a small blue popup (`PermissionExplainer.tsx`) that appears **before the user clicks anything**. Per [web.dev best practices](https://web.dev/articles/permissions-best-practices):

> "77% of permission prompts on Desktop Chrome are shown without such a basic signal of user intent and consequently only 12% of such prompts get allowed."

Teachers focus on the "Launch Student" button, not peripheral UI. The popup is easily missed.

### Permission UX Table Stakes

| Feature | Why Expected | Current State |
|---------|--------------|---------------|
| **Pre-action context** | Users need to understand *why* before granting | WRONG TIMING - appears before user intent |
| **User-initiated prompt** | Permission should follow user action | MISSING - appears on mount |
| **Clear benefit statement** | Grant rates increase with obvious benefit | PARTIAL - text is good, timing wrong |
| **Escape hatch** | User can proceed without granting | PRESENT - "Skip" button exists |
| **Fallback workflow** | Path when denied/unavailable | PRESENT - ManualPlacementGuide |

### Permission UX Anti-Features

| Anti-Feature | Why Avoid | PiPi Status |
|--------------|-----------|-------------|
| **Prompt on page load** | No context = 88%+ denial | DOING THIS |
| **Blocking modal for optional feature** | Permission is enhancement, not requirement | NOT doing |
| **Permission without user activation** | 3x lower accept rates | DOING THIS |
| **Auto-dismissing permission UI** | Users miss it if distracted | DOING THIS (small corner popup) |
| **No fallback for denied** | Users stuck | NOT doing (has fallback) |

### Recommended Permission Flow

**Phase 1: Detection (Silent)**
- Check `screen.isExtended` on mount
- Query permission state
- Cache in hook (already done)
- **DO NOT show any UI**

**Phase 2: Action Initiation (User Click)**
```
User clicks "Launch Student":
  IF permission === 'granted'
    -> Open window with cached coordinates (works today)
  IF permission === 'prompt' AND hasMultipleScreens
    -> Show PermissionExplainer INSTEAD of opening window
    -> User clicks "Enable Auto-Placement"
       -> Browser shows native prompt
       -> If granted: Open on projector
       -> If denied: Open + show ManualPlacementGuide
    -> User clicks "Skip"
       -> Open + show ManualPlacementGuide
  IF permission === 'denied'
    -> Open + show ManualPlacementGuide (works today)
  IF !hasMultipleScreens
    -> Open window normally (works today)
```

**Phase 3: Feedback (Post-Action)**
- Toast: "Student view opened on [Projector Name]" (if targeted)
- OR toast: "Drag the student window to your projector"

### Competitor Permission Patterns

**PowerPoint/Keynote:** No permission needed (desktop apps)
- Automatic detection and smart defaults
- One-click swap if wrong

**Google Slides:** Manual configuration
- Dropdown to select target display
- Browser limitations same as PiPi

**Zoom Screen Share:** Permission at action
- macOS Sequoia: "Bypass system private window picker"
- Shows when user clicks Share, not on page load
- Privacy-focused explanation

### High-Value Quick Wins for v1.2

1. **Move trigger to button click** - Core fix (P0)
2. **Block action until decision** - User must decide before window opens (P0)
3. **Include screen label** - "Send to [DELL U2718Q]?" (P1)
4. **Success toast** - Confirm where window opened (P1)

---

## Sources

### PowerPoint Presenter View
- [Microsoft Support: Use Presenter View in PowerPoint](https://support.microsoft.com/en-us/office/use-presenter-view-in-powerpoint-fe7638e4-76fb-4349-8d81-5eb6679f49d7)
- [BrightCarbon: Presenter View in PowerPoint](https://www.brightcarbon.com/blog/presenter-view-in-powerpoint/)
- [Microsoft Support: Keyboard Shortcuts for Slide Shows](https://support.microsoft.com/en-us/office/use-keyboard-shortcuts-to-deliver-powerpoint-presentations-1524ffce-bd2a-45f4-9a7f-f18b992b93a0)

### Google Slides
- [Google Docs Editors Help: Present Slides](https://support.google.com/docs/answer/1696787?hl=en)
- [SlidesAI: Presenter View in Google Slides](https://www.slidesai.io/blog/presenter-view-in-google-slides)

### Browser APIs
- [Chrome Developers: Window Management API](https://developer.chrome.com/docs/capabilities/web-apis/window-management)
- [MDN: Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API)
- [Chrome Developers: Presentation API](https://developer.chrome.com/blog/present-web-pages-to-secondary-attached-displays)
- [web.dev: How to use multiple screens](https://web.dev/patterns/web-apps/multiple-screens)

### Permission UX Research
- [web.dev: Permissions Best Practices](https://web.dev/articles/permissions-best-practices) - 77% stat, timing research
- [NN/g: Permission Requests](https://www.nngroup.com/articles/permission-requests/) - Cost-benefit analysis
- [Smashing Magazine: Permission UX](https://www.smashingmagazine.com/2019/04/privacy-better-notifications-ux-permission-requests/) - Anti-patterns
- [UX Planet: Toast vs Dialog](https://uxplanet.org/toast-notification-or-dialog-box-ae32ad53106d) - When to use each

### reveal.js
- [reveal.js: Speaker View](https://revealjs.com/speaker-view/)
- [reveal.js: Multiplex Plugin](https://github.com/reveal/multiplex)

### Presentation Timers
- [stagetimer.io: Online Presentation Timer](https://stagetimer.io/use-cases/online-presentation-timer/)

### Classroom Tools
- [ClassPoint](https://www.classpoint.io/)
- [Common Sense Education: Best Classroom Tools for Presentations](https://www.commonsense.org/education/lists/best-classroom-tools-for-presentations-and-slideshows)
