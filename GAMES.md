# 🎮 Games – Julkalender 2026

Fourteen Christmas minigames power the 24 doors and the bonus **Extras** menu. Every game is a
standalone Angular component under `src/app/components/challenges/<name>-challenge/` and follows the
shared contract in [`docs/ADDING_A_GAME.md`](docs/ADDING_A_GAME.md).

All games are bilingual (sv/en), work with mouse, touch and keyboard, and fit a phone screen.
Each one saves a personal best through `CalendarStateService.saveGameStats`.

## Calendar plan

| Day | Game | Day | Game |
|---|---|---|---|
| 1 | 🔤 Juldle | 13 | 🔤 Juldle (GLÖGG / TINSEL) |
| 2 | 🔔 Klockkören | 14 | 🧝 Tomteverkstaden |
| 3 | 🎅 Bonka tomten | 15 | 🐧 Frusna sjön (8×8) |
| 4 | 🐧 Frusna sjön (6×6) | 16 | 🎅 Bonka tomten (harder) |
| 5 | 🎶 Emoji-julklassiker (set a) | 17 | 🎶 Emoji-julklassiker (set b) |
| 6 | ❄️ Snöbollskriget | 18 | 🎁 Klappmatchen (harder) |
| 7 | 🧩 Julpixlar (8×8 tree) | 19 | ❄️ Snöbollskriget (harder) |
| 8 | 🎁 Klappmatchen | 20 | 💡 Tänd granen |
| 9 | 🛷 Klappleveransen | 21 | 🧩 Julpixlar (10×10 snowman) |
| 10 | 🏡 Tänd byn (5×5) | 22 | 🛷 Klappleveransen (harder) |
| 11 | 🔎 Hitta felen (village) | 23 | 🏡 Tänd byn (6×6) |
| 12 | ⛄ Bygg en snögubbe | 24 | 🔎 Hitta felen (cosy living room) |

Days are configured in the Cosmos `calendar` document, seeded by `api/Data/calendar-2026.json`; bonus levels in
`src/app/config/extras-config.ts`. Icons live in `challenge-icons.ts`, and the lazy-loaded component
registry in `challenge-registry.ts`.

## Extras

The Extras menu unlocks after all 24 doors (or on Christmas Day). Every game has a bonus pack:

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
Drag back and release to throw (slingshot style) with a dotted trajectory preview. Wind is shown
by a windsock. Knock down every snowman before you run out of snowballs.
- Config: `{ snowmen, snowballs, wind (-1…1), moving (0–3), preview (0.15–1), endless }`.
- Extras: 3 harder yards plus ♾️ endless waves (clearing a wave refills your snowballs).

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
candle. Keys follow the keyboard numpad: 7–8–9 on top, 4–5–6 in the middle, 1–2–3 at the bottom.
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

The 2025 games (riddles, hangman, sokoban, flappy sleigh, …) are archived on the
[`advent-2025`](../../tree/advent-2025) branch.
