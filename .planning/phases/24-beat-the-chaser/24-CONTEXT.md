# Phase 24: Beat the Chaser - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Students play Beat the Chaser with dual independent timers. Contestants accumulate clock time during Cash Builder (5 seconds per correct answer), then race against the chaser in a timed battle where turns alternate on the same questions. Timer hitting zero = instant loss.

</domain>

<decisions>
## Implementation Decisions

### Timer mechanics
- Fixed 5 seconds per correct answer during Cash Builder phase
- Fixed 5 second bonus transferred to contestant clock when answering correctly during timed battle
- Contestant and chaser have independent countdown timers
- Timer hitting zero = instant loss (no grace period)

### Turn flow
- Immediate switch after each answer (no pause between turns)
- Both players answer the same question — contestant first, then chaser
- Wrong answers just switch turn, no time penalty
- Only active player's timer runs during their turn

### Difficulty scaling
- Difficulty affects chaser starting time as ratio of contestant time:
  - Easy: chaser gets 80% of contestant's accumulated time
  - Medium: chaser gets 100% (equal time)
  - Hard: chaser gets 120% of contestant's time
- AI accuracy also scales with difficulty:
  - Easy: 50-60% accuracy
  - Medium: 70-80% accuracy
  - Hard: 85-95% accuracy
- Cash Builder phase stays consistent regardless of difficulty (same questions, same 5s/correct)

### Visual presentation
- Dual timers side by side — contestant on left, chaser on right
- Active player's timer glows/pulses, inactive timer is dimmed
- Urgency styling: red pulse when under 10 seconds (consistent with The Chase)
- Time bonus feedback: timer flashes green with "+5s" floating animation when contestant earns time

### Claude's Discretion
- Maximum time cap on contestant's clock (reasonable limit to maintain tension)
- Exact animation timings and easing curves
- Cash Builder question count (likely 10-12 questions)
- Chaser AI thinking delay timing

</decisions>

<specifics>
## Specific Ideas

- Reuse The Chase's timer hook and AI accuracy patterns where applicable
- Visual consistency with Phase 23 — same urgency threshold (10s), same pulse animations
- "+5s" floating text similar to score popups in arcade games

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-beat-the-chaser*
*Context gathered: 2026-01-23*
