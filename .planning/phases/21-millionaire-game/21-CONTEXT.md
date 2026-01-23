# Phase 21: Millionaire Game - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Students play Who Wants to Be a Millionaire with configurable question count (3, 5, or 10 questions), prize progression, safe havens, and three functional lifelines (50:50, Ask the Audience, Phone-a-Friend). This is a classroom brain break activity, not the full 15-question TV format.

</domain>

<decisions>
## Implementation Decisions

### Visual Presentation
- Classic vertical money tree showing all prize amounts, current question highlighted
- Question count selectable at game start: 3, 5, or 10 questions (not 15)
- Lifeline buttons displayed in row above question area, grayed out when used
- Answers revealed sequentially with dramatic timing (A → B → C → D)
- Classic Millionaire blue/purple color scheme (deep blue background, purple accents)

### Lifeline Behavior
- 50:50: Randomly eliminates 2 of 3 wrong answers (no AI logic, pure random)
- Ask the Audience: Difficulty-based poll percentages (easy questions = strong signal toward correct, hard questions = scattered votes)
- Phone-a-Friend: Dynamic responses that vary between confident answers, reasoning hints, and elimination hints — unpredictable for students
- All lifelines available at any time before answering (no restrictions, one of each per game)

### Game Flow & Pacing
- Safe havens trigger dramatic pause: celebratory animation, confetti/glow effect, 2-3 second pause
- Wrong answer: TV-style drama — red flash, dramatic reveal of correct answer, fall back to safe haven amount displayed
- No "walk away" option — must answer each question
- Victory celebration: Claude's discretion on design

### Sound & Atmosphere
- Audio OFF by default (silent option)
- Full sound pack available when enabled: answer lock, correct ding, wrong buzzer, lifeline activation, safe haven fanfare
- Mute/unmute button always visible during gameplay
- Visual tension effects: Claude's discretion (balance atmosphere with readability)

### Claude's Discretion
- Victory celebration design
- Visual tension effects (pulsing, dimming) balanced with readability
- Exact timing of sequential answer reveals
- Money tree scaling for different question counts (3, 5, 10)
- Safe haven positions for shorter games (e.g., 5 questions might have 1 safe haven at question 3)

</decisions>

<specifics>
## Specific Ideas

- This is for classroom brain breaks, not full TV episode length — hence 3/5/10 question options instead of 15
- Phone-a-Friend should feel like an actual phone call with varied response styles so students can't predict what the AI will say
- Sequential answer reveal mimics the TV show's dramatic pacing

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-millionaire-game*
*Context gathered: 2026-01-23*
