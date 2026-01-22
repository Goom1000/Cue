# Feature Landscape: Quiz Game Formats

**Domain:** TV-style quiz games for classroom presentation tool
**Researched:** 2026-01-22
**Confidence:** HIGH (official game show rules verified, classroom adaptations surveyed)

## Executive Summary

This research covers three iconic quiz game formats for classroom adaptation: **The Chase**, **Beat the Chaser**, and **Who Wants to Be a Millionaire**. Each has distinct mechanics that create different learning experiences:

- **The Chase**: Team-based, competitive chase format with time pressure and strategic risk/reward decisions
- **Beat the Chaser**: Solo format with risk assessment and time-based challenge selection
- **Who Wants to Be a Millionaire**: Individual progression format with lifelines, safe havens, and escalating difficulty

All three formats share common DNA: multiple-choice questions, visual progression displays, dramatic tension through stakes/timers, and clear win/lose conditions. Classroom adaptations must balance authentic game show feel with educational practicality.

---

## Game 1: The Chase

### Overview
Team-based quiz where contestants build cash through quick-fire questions, then face a "Chaser" (opponent) in a strategic board game. Final round has surviving team members collaborate to answer questions faster than the Chaser.

### Table Stakes Features

Features users expect to feel like "The Chase". Missing = game feels incomplete.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Cash Builder Round** | Iconic opening - rapid-fire questions build starting cash | Medium | Timer system, question queue, score tracking |
| **7-Step Chase Board** | Visual centerpiece of the game, shows contestant vs Chaser positions | Medium | Visual board component, position tracking |
| **Three Offer System** | Core strategic decision: high/middle/low offers with position tradeoffs | Medium | Board positioning, dynamic offer calculation |
| **Question-by-Question Movement** | Correct answer = move one step, wrong = opponent moves | Low | Board state management |
| **Team Prize Fund** | Accumulates winnings from successful contestants | Low | Persistent score across rounds |
| **Final Chase Format** | Team answers questions for 2 minutes, then Chaser chases for 2 minutes | High | Dual timer system, team collaboration, head-start calculation |
| **Head Start Calculation** | One step per surviving team member in Final Chase | Low | Simple arithmetic based on team size |
| **Pushback Mechanic** | In Final Chase, if team answers correctly while Chaser on same step, Chaser pushed back | Medium | Board state, turn-based logic |

**Complexity Notes:**
- Cash Builder: Need rapid question delivery + visible timer + live score updates
- Chase Board: Visual representation with contestant/Chaser position indicators
- Final Chase: Most complex - requires team mode, dual timers, pushback logic

### Differentiators

Features that enhance classroom experience beyond authentic game show.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI Chaser Personality** | Teacher can select Chaser persona (strict/encouraging/humorous) that affects question pacing | High | AI voice generation, personality system |
| **Difficulty-Based Offers** | High offer = harder questions, low offer = easier questions | Medium | Integrates with existing A-E difficulty system |
| **Team Strategy Voting** | Class votes on whether contestant should accept high/middle/low offer | Low | Simple polling before chase begins |
| **Educational "Explain Mode"** | After Final Chase, review missed questions with explanations | Medium | Question bank with explanation field |
| **Dynamic Question Difficulty** | Chaser questions slightly harder than contestant questions for balance | Medium | Difficulty adjustment algorithm |
| **Multiple Teams Mode** | Split class into 2-3 teams, each plays their own Chase, highest total wins | Medium | Multi-game state management |
| **Comeback Mechanics** | If team beats Chaser with 0 steps remaining, bonus points awarded | Low | End-game condition detection |

**Why Differentiators:**
- Personality: Makes repeated games fresh, addresses "same Chaser" fatigue
- Difficulty-Based Offers: Leverages existing A-E system, adds educational calibration
- Strategy Voting: Increases whole-class engagement during individual rounds
- Explain Mode: Converts game from pure fun to learning reinforcement

### Anti-Features

Features to explicitly NOT build. Common mistakes in quiz game adaptations.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Individual Student Buzzers** | Requires device per student, slows game pace, creates tech barriers | Teacher selects students to answer or whole-class call-out |
| **Real Money Display** | Classroom context makes cash prizes awkward/meaningless | Use points, stars, or abstract "team score" |
| **Chaser Video/Avatar** | High production cost, distracting, hard to maintain | Simple name badge + color scheme per Chaser persona |
| **Complex Calculations** | Brain teasers, math problems requiring work | Focus on knowledge recall appropriate for lesson content |
| **Celebrity Guest Chasers** | Unsustainable, breaks immersion with low-quality implementations | Consistent AI Chaser with selectable difficulty |
| **Live Audience Participation** | Hard to coordinate, creates chaos in Final Chase | Audience is passive viewers (projector display) |

**Why Avoid:**
- Buzzers: The Chase is teacher-controlled, not student-device-driven (unlike Kahoot)
- Real Money: Education context doesn't support gambling aesthetics
- Video Chaser: Resource-intensive with minimal educational value
- Complex Math: Game should test lesson content recall, not computational skills

---

## Game 2: Beat the Chaser

### Overview
Solo contestant format where player chooses how many Chasers (2-5) to face simultaneously based on risk/reward. Higher stakes = more Chasers = less time advantage.

### Table Stakes Features

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Cash Builder (5 questions)** | Quick warm-up, determines baseline offer | Low | Question queue, score tracking |
| **Offer Selection Screen** | Present 2-5 Chaser options with increasing money/decreasing time | Medium | Dynamic offer calculation UI |
| **Dual Timer Display** | Contestant 60s vs Chasers' reduced time (e.g., 40s for 2 Chasers, 20s for 5) | High | Dual countdown timers, clock switching logic |
| **Buzzer System** | Chasers must buzz in to answer; wrong buzzer = auto-fail | Medium | Multi-contestant state, buzzer lock-out |
| **Clock Toggle** | Correct answer stops your clock, starts opponent's clock | Medium | Timer state machine, turn management |
| **Time-Out Win Condition** | Contestant wins if Chasers' clock hits 0:00 first | Low | End-game detection |

**Complexity Notes:**
- Dual Timers: Core mechanic, must be visually prominent and synchronized
- Buzzer System: Different from The Chase - requires explicit buzz-in, mistakes penalized
- Clock Toggle: Seamless switching between clocks without UI jank

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Class Risk Assessment** | Before contestant chooses, class votes on which offer to take | Low | Quick poll before offer selection |
| **Chaser Names Display** | Show which Chasers are playing (e.g., "The Teacher," "The Brain," "The Storm") | Low | Visual flavor, builds narrative |
| **Time Advantage Preview** | Calculator showing "You'll have X more seconds than them" | Low | Simple math display for transparency |
| **Progressive Difficulty** | More Chasers = slightly harder questions to maintain balance | Medium | Difficulty scaling based on Chaser count |
| **Super Offer Mode** | Perfect Cash Builder (5/5) unlocks "Face All 6 Chasers" challenge | Medium | Conditional unlock, special difficulty tier |
| **Chaser Elimination Visual** | When a Chaser answers wrong, visual strike-through or fade-out | Low | Visual feedback, increases drama |

**Why Differentiators:**
- Risk Assessment: Teaches probability thinking, engages whole class
- Chaser Names: Creates memorable personas without video assets
- Time Advantage: Makes abstract time difference concrete for students
- Super Offer: Reward for excellence, creates aspirational challenge

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Chaser Conferencing** | Chasers can't discuss answers (per official rules) | Simulate 5 independent answer attempts |
| **Variable Contestant Time** | Always 60 seconds per rules | Fixed 60s, only vary Chaser time |
| **Manual Buzzer Hardware** | Requires physical buzzers, high friction | Visual buzz-in or teacher-controlled selection |
| **Partial Credit** | Binary correct/incorrect, no "close enough" | Strict answer matching |
| **Audience Lifelines** | Not part of Beat the Chaser format | Keep format pure to original game |

---

## Game 3: Who Wants to Be a Millionaire

### Overview
Individual contestant climbs 15-question ladder with escalating difficulty and money values. Three lifelines assist, two safe havens protect winnings.

### Table Stakes Features

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **15-Question Money Tree** | Iconic visual, shows progression from $100 to $1,000,000 | Medium | Vertical UI component, current position highlight |
| **Safe Havens (Q5, Q10, Q15)** | Guaranteed fall-back amounts if contestant fails later | Low | Score state management |
| **50/50 Lifeline** | Removes 2 wrong answers, leaves 1 correct + 1 wrong | Low | Answer filtering logic |
| **Ask the Audience Lifeline** | Simulated audience vote distribution for each answer | Medium | Vote generation algorithm, visual chart |
| **Phone a Friend Lifeline** | Simulated expert opinion (30-second timer) | Medium | AI-generated hint, countdown timer |
| **Four-Option Multiple Choice** | A/B/C/D answer format | Low | Standard quiz UI |
| **Walk Away Option** | Contestant can quit and keep current winnings | Low | Exit condition before answering |
| **No Time Limit** | Contestant can think as long as needed | Low | Remove quiz timer |
| **Final Answer Lock** | Must confirm "Final Answer" before locking in | Medium | Two-step answer submission |

**Complexity Notes:**
- Money Tree: Needs to fit 15 items vertically, highlight current question, dim completed/locked questions
- Ask the Audience: Generate believable vote distributions (higher correct % for easier questions)
- Phone a Friend: Could be text-based hint or simulated voice with confidence level
- Final Answer: Adds dramatic pause, prevents accidental submissions

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Educational Money Values** | Replace cash with points/stars relevant to class | Low | Theme customization |
| **Class-Wide Lifelines** | Entire class votes for Ask the Audience | Low | Actual student input vs simulation |
| **Multiple Friend Pool** | Phone a Friend selects from 3-5 "expert students" teacher pre-designates | Medium | Student roster, selection UI |
| **Difficulty Preview** | Show question difficulty tier (1-5 stars) before revealing question | Low | Visual indicator linked to A-E system |
| **Strategic Lifeline Use** | Track average lifeline usage, suggest optimal timing | High | Analytics, recommendation engine |
| **Team Relay Mode** | Multiple students each answer 3 questions, hand off to teammate | High | Multi-contestant state, handoff logic |
| **Explain After Wrong Answer** | If student fails, show correct answer + explanation before drop to safe haven | Medium | Educational reinforcement |

**Why Differentiators:**
- Class-Wide Lifelines: Authentic classroom adaptation, everyone participates
- Multiple Friend Pool: Distributes "expert" role, creates aspirational peer learning
- Team Relay: Converts individual game to collaborative, increases participation
- Explain Mode: Pure game show = entertainment, classroom = learning

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Time Pressure** | Millionaire has no time limit (unlike Fastest Finger) | Allow thinking time, no countdown |
| **Fastest Finger First** | Requires buzzers, eliminates students early | Start each game with new contestant or rotate |
| **Real Currency** | Inappropriate for classroom | Points, badges, certificates, or abstract rewards |
| **16+ Questions** | 15 is the iconic number | Stick to 15, compress difficulty curve if needed |
| **Additional Lifelines** | Some versions have 4-5 lifelines; complicates strategy | Keep classic 3: 50/50, Audience, Friend |
| **Jump the Question** | Rare variant that skips question | Not worth complexity for edge case |

---

## Cross-Game Feature Analysis

### Common Mechanics Across All Three Games

| Mechanic | The Chase | Beat the Chaser | Millionaire | Implementation Priority |
|----------|-----------|-----------------|-------------|------------------------|
| Multiple choice Q&A | Yes (rapid-fire) | Yes (timed) | Yes (untimed) | HIGH - core gameplay |
| Visual progression | Board (horizontal) | Timers (countdown) | Money tree (vertical) | HIGH - game identity |
| Risk/reward decisions | 3 offer system | Chaser count selection | Walk away option | MEDIUM - strategic depth |
| Lifelines/assists | None (team helps in Final) | None | 3 lifelines | MEDIUM - varies by game |
| Difficulty scaling | Implicit in Final Chase | Scales with Chaser count | Explicit (Q1-15) | HIGH - existing A-E system |
| Team vs Individual | Team-based | Individual | Individual | MEDIUM - mode switching |
| Timer pressure | Yes (Final Chase) | Yes (dual timers) | No | MEDIUM - affects pacing |

### Integration with Existing Cue Features

| Existing Feature | The Chase Integration | Beat the Chaser Integration | Millionaire Integration |
|------------------|----------------------|---------------------------|------------------------|
| **A-E Difficulty System** | Map to offer tiers (high=harder) | Scale with Chaser count | Map to question tiers (Q1-5=E, Q6-10=D, etc.) |
| **AI Question Generation** | Generate rapid-fire questions | Generate timed challenges | Generate progressive difficulty sets |
| **BroadcastChannel Display** | Show Chase board + timers | Show dual timers + scores | Show Money Tree + lifelines |
| **Teacher Controls** | Select students, approve offers, manage Chaser | Select contestant, manage Chaser buzz-ins | Select contestant, approve lifeline use |
| **Kahoot-style Quiz** | Replace with Cash Builder | Replace with Cash Builder | Replace with question progression |

### Feature Dependencies Map

```
Foundation Layer (build first):
├── Timer System (Chase Final, Beat the Chaser dual timers)
├── Visual Board Component (Chase board, Millionaire money tree)
├── Question Queue Management (all games)
└── Score/Prize Tracking (all games)

Game-Specific Layer:
├── The Chase
│   ├── Cash Builder → 3-Offer System → Head-to-Head Board → Final Chase
│   └── Requires: Dual player mode, position tracking, pushback logic
├── Beat the Chaser
│   ├── Cash Builder → Offer Selection → Dual Timer Challenge
│   └── Requires: Multi-timer, buzzer simulation, clock toggle
└── Millionaire
    ├── Question Progression → Lifeline System → Safe Haven Logic
    └── Requires: Money tree UI, lifeline state, confirmation flow

Enhancement Layer (post-MVP):
├── AI Chaser Personality (Chase, Beat the Chaser)
├── Educational Explain Mode (all games)
├── Team Relay Modes (Millionaire)
└── Analytics/Strategy Tracking (all games)
```

---

## MVP Recommendations

### Phase 1: Core Mechanics (Build First)

**The Chase - Minimum Viable Game:**
1. Cash Builder (1 minute, rapid questions)
2. Simple 7-step board (no offers yet - use Cash Builder amount only)
3. Head-to-Head Chase (contestant vs AI Chaser)
4. Basic Final Chase (team + head start vs Chaser)

**Rationale:** Gets the core "chase" feel working without complex offer calculations.

**Who Wants to Be a Millionaire - Minimum Viable Game:**
1. 15-question money tree
2. Safe havens at Q5, Q10, Q15
3. 50/50 lifeline (easiest to implement)
4. Walk away option

**Rationale:** Core progression + one lifeline proves the format. Other lifelines added later.

**Beat the Chaser - Defer to Phase 2:**
- Most complex due to dual timer system + multi-Chaser simulation
- Can reuse Chase board mechanics once proven
- Better to perfect The Chase first, then adapt

### Phase 2: Essential Features

**The Chase:**
- Three offer system (high/middle/low with position shifts)
- Pushback mechanic in Final Chase
- Visual polish (dramatic board animations)

**Millionaire:**
- Ask the Audience lifeline (with real class voting)
- Phone a Friend lifeline
- Final Answer confirmation flow

**Beat the Chaser:**
- Full game implementation (now that timers + Chase board proven)
- 2-5 Chaser selection
- Dual timer system

### Phase 3: Differentiators

**All Games:**
- Educational Explain Mode (show correct answer + reasoning after wrong answer)
- Integration with existing lesson content AI generation
- Teacher analytics (which questions stumped students, difficulty calibration)

**Game-Specific:**
- The Chase: AI Chaser personality selection
- Millionaire: Team Relay Mode
- Beat the Chaser: Super Offer challenge

---

## Classroom-Specific Considerations

### Teacher Control Requirements

| Scenario | Teacher Action | UI Need |
|----------|---------------|---------|
| Student selection | "Who's playing this round?" | Quick picker or volunteers |
| Answer validation | Is verbal answer correct? | Manual correct/incorrect buttons |
| Pause/resume | Need bathroom break | Pause button that freezes timers |
| Skip question | Question contains error | Next question button (admin only) |
| Adjust difficulty | Game too hard/easy | Mid-game difficulty shift |

### Display Requirements

**Projector View (BroadcastChannel):**
- Large, readable from back of classroom (40+ students)
- High contrast (projectors often low brightness)
- Minimal text, maximum visuals
- No critical info in corners (projector edge distortion)

**Teacher View:**
- All controls visible without scrolling
- Student selection UI
- Question preview (see next question before revealing)
- Manual override buttons (correct/incorrect, skip, pause)

### Pacing Considerations

| Game | Typical Duration | Classroom Adaptation |
|------|------------------|---------------------|
| The Chase | 45 mins (full episode) | 15-20 mins (one Cash Builder + Chase per 3-4 students) |
| Beat the Chaser | 5-7 mins per contestant | 5-7 mins (good for quick reviews) |
| Millionaire | 30 mins per contestant | 10-15 mins (reduce to 10 questions or team relay) |

**Key Insight:** Classroom periods are 45-60 minutes. Games must fit multiple rounds or be interruptible.

---

## Technical Complexity Assessment

### Low Complexity (1-2 days development)

- Basic multiple-choice Q&A
- Score tracking
- Simple timers (countdown only)
- Safe haven logic (Millionaire)
- 50/50 lifeline
- Walk away option
- Visual board with position tracking

### Medium Complexity (3-5 days development)

- Cash Builder round
- Three offer system (The Chase)
- Money tree UI (Millionaire)
- Ask the Audience (simulated or real voting)
- Pushback mechanic
- Final Answer confirmation flow
- Multi-Chaser selection (Beat the Chaser)

### High Complexity (1-2 weeks development)

- Final Chase (dual timer, team collaboration, pushback logic)
- Dual timer system (Beat the Chaser)
- Buzzer simulation with multi-Chaser state
- AI Chaser personality system
- Team Relay Mode (Millionaire)
- Educational Explain Mode with AI-generated explanations
- Analytics/strategy tracking

---

## Sources

**Game Show Format Research:**
- [The Chase (British game show) - Wikipedia](https://en.wikipedia.org/wiki/The_Chase_(British_game_show))
- [The Chase | Game Shows Wiki](https://gameshows.fandom.com/wiki/The_Chase)
- [Beat the Chasers - Wikipedia](https://en.wikipedia.org/wiki/Beat_the_Chasers)
- [Who Wants to Be a Millionaire - Official Rules](https://wwbm.com/rules)
- [Who Wants to Be a Millionaire - Wikipedia](https://en.wikipedia.org/wiki/Who_Wants_to_Be_a_Millionaire)
- [Lifelines | Who Wants To Be A Millionaire Wiki](https://millionaire.fandom.com/wiki/Lifeline)

**Classroom Adaptations:**
- [The Chase - H5P Educational Platform](https://library.daytonastate.edu/blogs/academic-innovation/the-chase-h5p)
- [Who Wants to Be a Millionaire PowerPoint Templates](https://pptvba.com/powerpoint-who-wants-to-be-a-millionaire/)
- [Game Show Classroom Comparison](https://ditchthattextbook.com/game-show-classroom-comparing-the-big-5/)
- [8 Best Game Show Activities for Classrooms](https://www.fluentu.com/blog/educator/language-class-activities/)

**Game Design Mechanics:**
- [Time for a Timer - Game Design](https://www.gamedeveloper.com/design/time-for-a-timer---effective-use-of-timers-in-game-design)
- [Countdown Timer Psychology](https://www.vevox.com/quiz-and-poll-maker-with-countdown-timer)
- [Action Timer Mechanics in Board Games](https://www.smartpicks.co.uk/beat-the-clock-the-tension-and-thrill-of-the-action-timer-mechanic/)
