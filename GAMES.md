# 🎮 Games – Julkalender 2026

Twenty-four different Christmas minigames power the 24 doors and the bonus **Extras** menu. Every game is a
standalone Angular component under `src/app/components/challenges/<name>-challenge/` and follows the
shared contract in [`docs/ADDING_A_GAME.md`](docs/ADDING_A_GAME.md).

All games are bilingual (sv/en), work with mouse, touch and keyboard, and fit a phone screen.
Each one saves a personal best through `CalendarStateService.saveGameStats`.
All 24 games provide sound feedback for their main actions and results. Sound is on by default;
the header toggle remembers an explicit mute choice. Bell Choir notes always play because audio is the puzzle.

## Calendar plan

| Day | Game | Day | Game |
|---|---|---|---|
| 1 | 🔤 Juldle | 13 | 🔐 Christmas Cryptogram |
| 2 | 🔔 Klockkören | 14 | 🧝 Tomteverkstaden |
| 3 | 🎅 Bonka tomten | 15 | 🎁 Gift Packing |
| 4 | 🐧 Frusna sjön (6×6) | 16 | 🏃 Rooftop Runner |
| 5 | 🎶 Emoji-julklassiker (set a) | 17 | 🕵️ Christmas Detective |
| 6 | ❄️ Snöbollskriget | 18 | 🍪 Cookie Decorator |
| 7 | 🧩 Julpixlar (8×8 tree) | 19 | 🎼 Carol Conductor |
| 8 | 🎁 Klappmatchen | 20 | 💡 Tänd granen |
| 9 | 🛷 Klappleveransen | 21 | 🌨️ Snow Globe Jigsaw |
| 10 | 🏡 Tänd byn (5×5) | 22 | 🧹 Chimney Sweeper |
| 11 | 🔎 Hitta felen (village) | 23 | 🦌 Gingerbread Bridge |
| 12 | ⛄ Bygg en snögubbe | 24 | 🗝️ Christmas Eve Escape |

Days are configured in the Cosmos `calendar` document, seeded by `api/Data/calendar-2026.json`; bonus levels in
`src/app/config/extras-config.ts`. Icons live in `challenge-icons.ts`, and the lazy-loaded component
registry in `challenge-registry.ts`.

## Extras

The Extras menu unlocks after all 24 doors (or on Christmas Day). It contains **83 levels across
24 game types**, including **7 endless modes**. The ten replaced calendar configurations remain
available as archived levels, and each new game has a practice round. The original packs contain:

- **Puzzle and word games:** 5 levels, easy → expert.
- **Action games:** 3 harder levels plus an **endless ♾️** mode.

Endless levels set `isInfinite: true`. They have no win state, never emit `completed`, keep a
personal best, and are left out of the "x/y completed" count.

---

## Word & quiz

### 🔤 Juldle (`juldle`)
Christmas Wordle. Guess the word in a few tries; tiles flip green (right spot), gold (in the word)
or slate (absent), with real Wordle rules for repeated letters. An on-screen keyboard (with Å Ä Ö
in Swedish) and a physical keyboard both work. No dictionary check, the hint shows a clue, and
running out of rows offers a retry with the same word.
- Config: `{ wordSv, wordEn, clueSv, clueEn, maxGuesses = 6 }`. Word lengths may differ per language (4–7).
- Extras: GRAN/BELL, LUCIA/CAROL, KNÄCK/EGGNOG, MISTEL/WREATH (5 tries), JULBOCK/CHIMNEY.

### 🎶 Emoji-julklassiker (`emojiCarols`)
Guess Christmas songs, films and food from emoji riddles. 4 options per round, 6 rounds, pass with
4 right. Options are reshuffled every run. Swedish sets use the titles Swedes know.
Every answer reveals an explanation connecting the emoji to the solution, followed by trivia.
- Config: `{ set: 'a'…'g', rounds = 6, passScore = 4 }`. Questions live in the i18n files under
  `challenges.emojiCarols.sets.<set>`.
- Extras: classics, films, pop hits, Christmas food, expert mix.

## Logic

### 🐧 Frusna sjön / Frozen Lake (`iceSlide`)
A penguin slides on ice until it hits a rock; snowdrifts and the present stop it. Includes undo,
an exact hint from a BFS solver, a star rating against par, and a friendly "stuck" overlay.
- Config: `{ level: string[], par? }` with `#` rock, `.` ice, `*` snowdrift, `S` start, `G` gift.
  `par` is computed by the solver (`solveIce`) when omitted.
- Extras: 5 solver-verified levels, 7×7 → 10×10.

### 🧩 Julpixlar / Christmas Picross (`nonogram`)
A classic nonogram that blooms into colour when solved. Supports drag painting, an X mode,
long-press or right-click to mark X, and a hint that flags mistakes.
- Config: `{ puzzle: string[], palette?: string[], colors?, titleSv, titleEn }`. Titles include
  the article ("en julgran"). Every puzzle is verified to have exactly one solution.
- Extras: candy cane, bell, gift, reindeer, and Santa (12×12).

### 🏡 Tänd byn / Light the Village (`lightPath`)
Rotate wire tiles until power from the cabin reaches every house and tree. Puzzles come from a
random spanning tree, so they are always solvable.
- Config: `{ cols, rows, targets, seed? }`. The hint turns one wrong tile into place.
- Extras: 5 levels up to 8×9 with 6 targets.

### 🎁 Klappmatchen / Gift Match (`giftMatch`)
Match-3 with baubles, stars, trees, gingerbread and snowflakes. A match of 4 makes a striped piece,
5 makes a star; cascades, combos and reshuffles are handled automatically.
- Config: `{ cols = 7, rows = 8, kinds = 5, targetScore, moves, endless, duration = 90 }`.
  Targets were tuned by simulating 500 games per level, so most players win within 1–3 tries.
- Extras: 3 harder boards plus ♾️ a 90-second time attack (big combos add time).

### 💡 Tänd granen / Light Up the Tree (`treeLights`)
Lights-out on a Christmas tree: a tap flips a bulb and its neighbours. Puzzles are made by
scrambling a lit tree, so they are always solvable and the hint is exact.
- Config: `{ rows = 5, scrambleTaps = 5 }`.
- Extras: 5 trees, 4 → 7 rows.

### 🔔 Klockkören / Bell Choir (`jingleBells`)
Simon-style memory game with five singing bells. Start with one note and earn one additional
note each round. Day 2 uses the eight-note opening of **We Wish You a Merry Christmas**:
G–C–C–D–C–B–A–A. Matching the rhythm is optional. After the final correct answer, the song
continues through the rest of its verse before the reward appears. Two extra bells join the choir
after winning so every note in that continuation has a matching glow and ringing animation.
All seven bells have distinct colors and fit on one row, shrinking on narrow screens. Mistakes replay the same
round. Bells play even when UI sounds are muted because the melody is the game.
- Config: `{ targetLength = 8, startSpeed = 650, endless }`. Day 2 stays at eight notes, including
  with older cloud configurations. Longer extras repeat the fragment; finite levels keep a steady beat.
- Extras: 10, 12 and 15 notes, then random, accelerating endless mode (one mistake ends the run).
- Melody reference: [Ivory Piano's arrangement](https://ivorypiano.com/sv/songs/we-wish-you-a-merry-christmas).

### ❄️ Snöbollskriget / Snowball Fight (`snowballToss`)
Pull back to choose angle and power. The aiming dots show only the first 0.12–0.24 seconds,
with no collision or landing prediction. Smooth wind gusts affect flight and are shown by the
windsock/HUD. Smaller snowmen slide along ledges: lead them and arc shots over the forts.
Only snow bodies count as hits; grazing a hat or stick arm misses. Headshots add 75 points,
sliding targets add 50, and consecutive hits add up to 100. A miss resets the streak.
- Config: `{ snowmen = 4, snowballs = snowmen + 2, wind, moving = 2, preview = 0.22,
  gusts = 0.35, speed = 1.8, endless }`. At most two spare throws. Old full-flight guides are capped.
- Calendar: day 6 has four targets/two sliders and six throws. The former day 19, now in Extras,
  has five targets/three faster sliders, stronger gusts, a shorter guide and seven throws.
- Extras: harder yards with one or two spare throws; endless waves start with moving targets
  and ramp up gusts and target speed. Refills allow at most two spare throws.

### 🛷 Klappleveransen / Present Drop (`chimneyDrop`)
Santa's sleigh flies over a night town; tap to drop presents into chimneys. A present keeps the
sleigh's speed, so release early.
- Config: `{ target, presents, speed, wind (0…1), chimneyWidth (0.6–1.3), endless }`.
- Extras: narrow chimneys, storm, rush hour, plus ♾️ endless night (3 lives, speeding up).

### ⛄ Bygg en snögubbe / Build a Snowman (`snowmanStack`)
A snowball swings from a branch; tap to drop it on the stack. Perfect drops snap and sparkle,
and a finished snowman gets dressed with hat, scarf and carrot.
- Config: `{ height = 3, speed = 1, tolerance = 0.6, endless }`.
- Extras: 5 balls, snowstorm, a 10-ball snow tower, plus ♾️ endless tower.

### 🎅 Bonka tomten / Whack-a-Tomte (`tomteWhack`)
Tomtar pop out of snow mounds; bonk them, but avoid coal and the julbock. The timer is a burning
candle. Click/tap a mound or use the numpad. Regular tomtar make a wooden bonk, golden tomtar
jingle, coal crunches and the goat bleats. Keys follow the keyboard numpad: 7–8–9 on top, 4–5–6 in the middle, 1–2–3 at the bottom.
Numpad keys also work with Num Lock off; top-row digits use the same mapping. Larger grids map
the bottom-left 3×3 area; the remaining mounds can be tapped or clicked.
- Config: `{ targetScore, duration, rows, cols, speed, endless }`.
- Extras: a 4×4 yard, rush, short candle, plus ♾️ survival with 3 hearts.

## Observation

### 🔎 Hitta felen / Spot the Difference (`spotDifference`)
Two hand-drawn, animated SVG scenes; tap the changes. Wrong taps cost 3 seconds and there is no
fail state.
- Config: `{ scene: 'livingRoom' | 'village' | 'workshop', differences: number | string[] }`.
  The difference ids are listed in the component.
- Extras: 5 sets across all scenes, the last ones subtle.

### 🧝 Tomteverkstaden / Elf Workshop (`toySorter`)
Sort items off a conveyor belt into the right sack by swiping, tapping a side, or using ←/→.
The rule changes mid-round.
- Config: `{ target = 15, speed = 1, rules: ('wrapped' | 'color' | 'tomte' | 'naughty')[], endless }`.
- Extras: 3 faster shifts plus ♾️ endless shift.

---

## Ten new calendar games

These games use the shared lifecycle and frame in `challenges/shared/`: personal bests, replay,
completion, sounds and cleanup. They use their own mechanics and controls. Their current default
rounds need no `challengeData` settings; each has a practice level in Extras.

| Day | Type | Rules and controls |
|---|---|---|
| 13 | `cryptogram` | Decode a festive substitution cipher. Select a numbered letter and type or tap its replacement; matching codes update together. Hints cost points. Swedish uses Å, Ä and Ö. |
| 15 | `giftPacking` | Fill a 5×5 sack with seven shaped presents. Select a piece, rotate with R or the button, and place it on the board. Pick up placed pieces or undo. |
| 16 | `rooftopRunner` | Jump across 12 roofs, avoid chimneys and collect at least 12 gifts. Space/Up/W or the jump button; three hearts and checkpoints. |
| 17 | `christmasDetective` | Assign elves, gifts and treats to four houses using ten clues. Keyboard-accessible selectors; clues identify exactly one solution. |
| 18 | `cookieDecorator` | Trace three icing patterns with at least 86% coverage and 78% precision. Draw with mouse/touch, or move the pen with arrows and toggle icing with Space. |
| 19 | `carolConductor` | Play a 60-note Christmas melody in four lanes using D/F/J/K or touch pads. Hit at least 45 notes with no more than 20 errors. Accurate timing builds combos; audio is part of the game. |
| 21 | `snowGlobeJigsaw` | Rotate and place nine picture tiles. Select, rotate with R or the button, and swap pieces on the board. A reference peek is available. |
| 22 | `chimneySweeper` | Clear 28 soot bricks with a bouncing snowball. Move the paddle with mouse, touch, arrows or A/D; Space/Enter serves. Three hearts; falling stars temporarily widen the paddle. |
| 23 | `gingerbreadBridge` | Connect joints with at most 18 beams, then test a moving reindeer load. A truss stiffness solver checks stability, deflection and strain. Failed tests preserve the design for edits; undo and single-beam hints help. |
| 24 | `christmasEveEscape` | Explore six study hotspots, solve a clock and ornament clues, collect and combine items, uncover a window clue and unlock the final gift. Hints are available. |

The jigsaw scene is an authored SVG in `src/assets/games/`. Other game art uses inline SVG/CSS.

The 2025 games (riddles, hangman, sokoban, flappy sleigh, …) are archived on the
[`advent-2025`](../../tree/advent-2025) branch.
