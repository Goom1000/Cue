---
phase: 21
plan: 04
subsystem: millionaire-game
tags: [celebration-animations, student-view, audio-controls, game-polish]
requires: [21-03]
provides: [complete-millionaire-game, student-view-sync, celebration-effects]
affects: []
tech-stack:
  added: [useSound-hook]
  patterns: [css-animations, confetti-effect, celebration-overlays, mute-toggle]
key-files:
  created:
    - hooks/useSound.ts
    - components/games/millionaire/SafeHavenCelebration.tsx
    - components/games/millionaire/WrongAnswerReveal.tsx
    - components/games/millionaire/VictoryCelebration.tsx
  modified:
    - index.html
    - components/StudentGameView.tsx
    - components/games/MillionaireGame.tsx
decisions:
  - id: celebration-timing
    context: When to show safe haven celebrations
    decision: Trigger on entering next question after passing safe haven position
    rationale: Avoid disrupting answer reveal sequence
    date: 2026-01-23
  - id: sound-default-off
    context: Initial audio state per CONTEXT.md
    decision: Audio defaults to OFF with visible toggle
    rationale: Classroom environment may not want sound on by default
    date: 2026-01-23
  - id: confetti-implementation
    context: CSS vs canvas for confetti effect
    decision: Use CSS animations with fixed positioned divs
    rationale: Zero dependencies, performant, sufficient visual impact
    date: 2026-01-23
  - id: wrong-answer-flow
    context: When to transition after wrong answer
    decision: Show WrongAnswerReveal overlay, then dismiss to result screen
    rationale: Dramatic pause before returning to game end state
    date: 2026-01-23
duration: 204s
completed: 2026-01-23
---

# Phase 21 Plan 04: Millionaire Student View and Celebrations Summary

**Millionaire game complete with student view sync, dramatic TV-style celebration animations, and optional audio**

## Accomplishments

- Student view displays complete Millionaire game state (money tree, questions, lifeline results)
- Three celebration overlays with TV-style drama: safe haven, wrong answer reveal, victory
- CSS animations for glow, flash, confetti effects (zero dependencies)
- Zero-dependency useSound hook for future audio integration
- Audio toggle defaults to OFF with clear mute/unmute button
- All MILL requirements (MILL-01 through MILL-08) now complete

## Task Commits

1. **Task 1: Create celebration and drama overlays with CSS animations** - `aff7193` (feat)
2. **Task 2: Add MillionaireStudentView to StudentGameView** - `6652562` (feat)
3. **Task 3: Add useSound hook and integrate celebrations into MillionaireGame** - `5f2c2e0` (feat)

## Files Created/Modified

### Created

- `hooks/useSound.ts` - Zero-dependency audio playback hook with enabled/volume options
- `components/games/millionaire/SafeHavenCelebration.tsx` - Full-screen amber overlay with glow animation, auto-dismisses after 3s
- `components/games/millionaire/WrongAnswerReveal.tsx` - Dramatic red overlay showing correct answer and safe haven prize
- `components/games/millionaire/VictoryCelebration.tsx` - Golden overlay with CSS confetti falling from top, shows final prize

### Modified

- `index.html` - Added Millionaire CSS animations: millionaireGlow, wrongAnswerFlash, safeHavenCelebration, confettiFall, answerRevealPulse
- `components/StudentGameView.tsx` - Added MillionaireStudentView component with money tree, questions, answers, lifeline results; removed 'millionaire' from PlaceholderStudentView
- `components/games/MillionaireGame.tsx` - Integrated celebration overlays, added sound toggle button, celebration trigger logic for safe havens/wrong answers/victory

## Technical Details

### CSS Animation Keyframes

All animations added to index.html `<style>` block:

- **millionaireGlow**: 2s infinite pulse for question box (box-shadow 20px → 40px)
- **wrongAnswerFlash**: 1.5s red flash sequence with scale transform
- **safeHavenCelebration**: 2s scale and glow effect (amber shadow)
- **confettiFall**: 3s fall with rotation (translateY -100vh → 100vh, rotate 720deg)
- **answerRevealPulse**: 0.3s scale and opacity reveal

### MillionaireStudentView Component

Read-only view synchronized via BroadcastChannel:

- Left sidebar (25% width): MoneyTree component
- Right area (75% width): Question badge, question text (with glow), 2x2 answer grid
- Eliminated options (50:50) shown as grayed-out placeholders
- Selected option highlighted in amber
- Reveal animations: correct answer flashes green, wrong answer flashes red
- Lifeline results displayed below answers:
  - Audience poll: 4-column percentage display (A/B/C/D)
  - Phone-a-Friend: Speech bubble with hint text

### Celebration Trigger Logic

Safe haven celebration:
```typescript
useEffect(() => {
  if (state.status === 'playing' && state.currentQuestionIndex > 0) {
    const currentIndex = state.currentQuestionIndex - 1; // Previous question completed
    if (config.safeHavens.includes(currentIndex) && lastSafeHavenReached !== currentIndex) {
      setShowSafeHaven(true);
    }
  }
}, [state.status, state.currentQuestionIndex]);
```

Wrong answer / victory:
```typescript
useEffect(() => {
  if (state.status === 'result' && revealState.showResult) {
    const allCorrect = state.currentQuestionIndex === questions.length - 1 &&
                       state.selectedOption === correctAnswerIndex;
    if (allCorrect) setShowVictory(true);
    else if (wrongAnswer) setShowWrongAnswer(true);
  }
}, [state.status, revealState.showResult]);
```

### useSound Hook Structure

Zero-dependency audio hook with graceful failure handling:

```typescript
export function useSound(src: string, options?: { volume?: number; enabled?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const play = useCallback(() => {
    if (!enabled) return;
    audio.play().catch(err => console.warn('Audio play failed:', err));
  }, [src, volume, enabled]);
  return { play, stop, isPlaying };
}
```

Hook is wired up but no audio files provided yet (can be added later without code changes).

## Decisions Made

### 1. Celebration Timing (celebration-timing)

**Context:** When to show safe haven celebrations without disrupting game flow

**Decision:** Trigger on entering next question after passing safe haven position

**Rationale:**
- Avoids interfering with answer reveal sequence
- Provides natural break between questions
- Teacher can click through or wait 3s auto-dismiss

**Implementation:** Track `lastSafeHavenReached` to prevent duplicate celebrations, check when `status === 'playing'` and `currentQuestionIndex` increments past safe haven

### 2. Sound Default OFF (sound-default-off)

**Context:** CONTEXT.md specified audio OFF by default per classroom needs

**Decision:** `soundEnabled` state defaults to `false`, visible mute/unmute toggle in header

**Rationale:**
- Classroom environments may not want sound disrupting other activities
- Teacher has explicit control before enabling audio
- Icon clearly shows current state (volume icon vs volume-x icon)

**Implementation:** `const [soundEnabled, setSoundEnabled] = useState(false)` with SVG icon button showing speaker icon (unmuted) or speaker-x icon (muted)

### 3. Confetti Implementation (confetti-implementation)

**Context:** Need visual celebration effect for victory without adding dependencies

**Decision:** Use CSS animations with fixed positioned divs

**Rationale:**
- Zero runtime dependencies (React sufficient)
- Performant (CSS transforms are GPU-accelerated)
- Sufficient visual impact for classroom use
- 25 confetti pieces with random colors, positions, delays

**Implementation:** Generate 25 `<div>` elements with `.confetti-piece` class, random `left`, `backgroundColor`, `animationDelay` inline styles. CSS keyframe handles fall animation.

### 4. Wrong Answer Flow (wrong-answer-flow)

**Context:** How to handle game end after wrong answer

**Decision:** Show WrongAnswerReveal overlay, then dismiss to result screen

**Rationale:**
- Provides dramatic TV-style moment showing correct answer
- Displays safe haven amount prominently
- "Game Over" button gives teacher control over pacing

**Implementation:** WrongAnswerReveal overlay with red gradient background, correct answer in green box, safe haven in amber text. `onClose` dismisses overlay and calls parent `onClose` to end game.

## Verification Results

All verification criteria met:

- ✅ `npm run build` succeeds (3 successful builds, one per task)
- ✅ Millionaire animations work in index.html (glow, wrong answer flash, safe haven, confetti)
- ✅ Student view displays Millionaire game correctly via BroadcastChannel
- ✅ Safe haven celebration shows when reaching positions 2, 4, 9 (depending on question count)
- ✅ Wrong answer reveals correct answer with dramatic red flash effect
- ✅ Victory celebration shows confetti when winning top prize
- ✅ Sound toggle button present and defaults to OFF

## Success Criteria

All success criteria achieved:

- ✅ Student view shows money tree, question, answers, lifeline results synchronized from teacher view
- ✅ Safe haven celebrations appear at questions 3 and 5 (5-question game), or 5 and 10 (10-question game)
- ✅ Wrong answer shows TV-style drama with correct answer reveal
- ✅ Victory celebration displays with confetti effect
- ✅ Audio is OFF by default with visible mute/unmute toggle
- ✅ All Millionaire requirements (MILL-01 through MILL-08) are met

## Next Phase Readiness

**Phase 21 (Millionaire Game) is now COMPLETE.**

All 4 plans delivered:
- 21-01: Money tree, prize ladder, safe havens
- 21-02: Question display, answer selection, game flow
- 21-03: Three lifelines (50:50, Ask the Audience, Phone-a-Friend)
- 21-04: Student view sync and celebration animations

**Ready for Phase 22:** The Chase game implementation can begin with proven game architecture patterns.

**Millionaire game features:**
- ✅ 3/5/10 question variants with scaled prize ladders
- ✅ Sequential answer reveal with dramatic timing
- ✅ Three functional lifelines with AI-generated Phone-a-Friend
- ✅ Safe haven system with guaranteed minimum prizes
- ✅ Student view synchronization via BroadcastChannel
- ✅ TV-style celebration animations
- ✅ Optional audio controls (infrastructure ready for sound files)

## Blockers/Concerns

None. Phase 21 complete.

**Optional future enhancements (not blocking):**
- Add actual audio files for sound effects (useSound hook ready)
- Add confetti physics library for more realistic confetti (current CSS sufficient for MVP)
- Add accessibility features (screen reader announcements for celebrations)

## Deviations from Plan

None - plan executed exactly as written.

All celebration components, student view integration, and audio controls implemented per specification. CSS animations provide dramatic visual effects matching TV game show aesthetic without requiring additional dependencies.
