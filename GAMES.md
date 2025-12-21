# Game Availability

Derived from `src/app/config/calendar-config.ts`. Each game is identified by its `challengeType` and the Advent calendar days when it appears.

| Game (`challengeType`) | Days |
| --- | --- |
| climber | 15 |
| flappySleigh | 5 |
| geometryDash | 9, 22 |
| giftCatcher | 10 |
| hangman | 2, 20 |
| mahjong | 11 |
| mazeRunner | 18 |
| memoryCard | 4 |
| presentStacking | 24 |
| rebus | 6, 13 |
| riddle | 1, 14 |
| skiSlope | 7 |
| slidingPuzzle | 16 |
| sokoban | 8 |
| wordScramble | 3, 12, 19 |
| wordSearch | 17, 23 |
| busses | 21 |

## Game Details

### Climber (`challengeType: climber`)
- **Description:** Pixel canvas platformer where Santa climbs through static, moving, and icy ledges while collecting a handful of ornaments before reaching the finish line at the top of the vertical shaft.
- **How to play:** Start the run from the info modal, then tap the canvas or use the touch controls to trigger the buffered jump; there is no direct horizontal steering, so timing the jump as platforms move or wobble is the core challenge.
- **Controls:** Desktop uses `Space` or `ArrowUp` (handled by `KeyboardService`); mobile shows the `app-touch-controls` jump area and also accepts canvas taps so the same buffer is triggered.
- **Rewards:** The calendar only exposes a fun fact on day 15 for this challenge (`CALENDAR_DAYS` entry for day 15 has `funFactKey` but no reward).
- **Notes:** The instructions color-code platform types (green static, gold moving, blue ice) and the game can also run in an endless mode where best height/time stats persist in `CalendarStateService`.

### Flappy Sleigh (`challengeType: flappySleigh`)
- **Description:** Flappy-Bird-inspired level where Santa’s sleigh slides through candy-cane pipes, with a progress bar showing how close the sleigh is to the finish-line tree.
- **How to play:** Start the run, then keep the sleigh aloft by flapping whenever you see a gap; collision with a pipe or the top/bottom of the band ends the attempt, and reaching `levelLength` (3200 px by default) triggers the win overlay.
- **Controls:** Desktop accepts `Space` or `ArrowUp` from `KeyboardService`, while the canvas itself responds to clicks/taps; mobile also surfaces a giant “flap” button for repeated taps, and the same button becomes “Try again” after a crash.
- **Rewards:** Completing the December 5th appearance grants a fortune cookie with a random message (`reward.type: fortuneCookie` and a list of fortune keys in `calendar-config`).
- **Notes:** Infinite mode (for extras) keeps best distance/time stored via `CalendarStateService`, and render logic differentiates sprite-based visuals from fallback shapes.

### Geometry Dash (`challengeType: geometryDash`)
- **Description:** Auto-running obstacle course featuring candy blocks, pits, assistance platforms, and ceiling candy that requires precise timing to jump over or onto.
- **How to play:** After starting the run, jump whenever an obstacle approaches (`jumpForce` + `gravity` determine the arc). The timer shows elapsed seconds, and finishing before the `levelLength` cuts the victory state.
- **Controls:** Jump by pressing `Space`/`ArrowUp` or tapping/clicking the canvas; on mobile a dedicated jump button appears after instructions block.
- **Rewards:** Day 9 gives a video reward (`rewards/day19.mp4`), whereas the day 22 appearance only reveals a fun fact without extra media.
- **Notes:** The component selects different presets for `easy`, `medium`, or `hard` difficulties, supports endless survival with best-time persistence, and automatically generates assist platforms when a tall candy would otherwise be impossible to clear.

### Gift Catcher (`challengeType: giftCatcher`)
- **Description:** Santa moves along the bottom to catch falling gifts while dodging coal—a day is won once the `targetScore` (15 by default) is reached.
- **How to play:** Items drop every `spawnRate` milliseconds with a bit of speed variance; catching a gift increments score, while coal drops subtract 5 points and stay removed.
- **Controls:** Desktop/keyboard players hold `ArrowLeft`/`ArrowRight` or `A`/`D`; mobile players can tap the left or right canvas halves (touch handlers simulate arrow keys) or use the on-screen arrow buttons shown below the canvas.
- **Rewards:** Day 10 is a fun-fact day (`funFactKey`) with no additional reward media defined.
- **Notes:** The HUD shows current score, elapsed time, and best time pulled from `CalendarStateService`; falling gifts animate via sprite images when available.

### Hangman (`challengeType: hangman`)
- **Description:** Classic hangman with a festive gallows drawing and translation keys for the clue and optional hint; up to six wrong guesses draw Santa’s outline.
- **How to play:** Use the clue/hint to deduce the word, click a letter from the alphabet grid, and avoid filling all six wrong slots before revealing every letter.
- **Controls:** Only the on-screen letter buttons are exposed (no keyboard shortcut), and the alphabet expands with `ÅÄÖ` when the current language is Swedish.
- **Rewards:** The day 2 and day 20 appearances show fun facts only.
- **Notes:** Wrong guesses persist for already-completed runs so the stored tally can be shown instead of resetting to zero, and the hint toggles without counting as a guess.

### Maze Runner (`challengeType: mazeRunner`)
- **Description:** Recursive-backtracking maze generator produces a 21×21 grid with five collectibles scattered around and a goal placed near the bottom-right corner.
- **How to play:** Navigate cell-by-cell using four moves; collecting all gifts unlocks the goal tile and completes the challenge with `moveCount` tracked for stats.
- **Controls:** Keyboard arrows/WASD immediately move the avatar and a short `moveInterval` keeps movement responsive while a key is held. Mobile players rely on the dedicated D-pad buttons shown below the maze grid.
- **Rewards:** Day 18 grants an audio file reward (`rewards/day18.mp3` with lyrics metadata).
- **Notes:** The sidebar highlights total gifts versus collected ones, and the component records stats to `CalendarStateService` so completed runs show the original move count.

### Mahjong (`challengeType: mahjong`)
- **Description:** Classic Mahjong-style matching across three layered stacks using Font Awesome icons, plus a hidden sleigh bonus tile tucked under the pile.
- **How to play:** You can only select a free tile (no tile on top and at least one side open). Select two free tiles with the same icon to remove them and earn a point.
- **Controls:** Click/tap free tiles to select them; use the controls below the board to reshuffle, destroy a valid matching pair (no points), or request a hint for the currently selected tile (highlights possible matches).
- **Rewards:** Day 11 grants a popup card reward (`reward.type: popupCard`).
- **Notes:** The sleigh tile is red, appears only once on the lowest layer, and does not count toward clearing the board; it spawns in a random position and only grants double points if the player reveals it without using the Destroy help (Destroy-revealed sleigh tiles are locked for the rest of the run).

### Busses (`challengeType: busses`)
- **Description:** The calendar instantiates `src/app/components/challenges/busses-challenge/busses-challenge.ts`, which keeps the 11×11 grid and 7×7 parking block while overlaying animated bus sprites that rotate, translate, and track path history as they cruise toward the corners and exit.
- **How to play:** Tap a bus to let it drive straight until it reaches a border, turn toward the nearest corner when it hits an edge, and keep going until it leaves the board. Collisions flash an explosion, the vehicle retraces its recorded path, crashes increment the counter, and the run finishes once every vehicle has cleared.
- **Controls:** Click/tap directly on the bus icon; there are no keyboard shortcuts because each vehicle follows its own automated path once launched.
- **Rewards:** Day 21 delivers a magic 8-ball reward (`rewards.magic8Ball.*`) with randomized answers.
- **Notes:** `CalendarStateService` stores `carsLeft`, `crashes`, and `timesPlayed`, the HUD mirrors those stats, and `isSleighMode()` swaps the icon/color after December 24 for a sleigh-themed finale.

### Memory Card (`challengeType: memoryCard`)
- **Description:** A 4×4 flip-and-match board with emoji icons (Santa, snowman, tree, gift, etc.) shuffled every run.
- **How to play:** Flip two cards by tapping them; matched pairs stay revealed and unmatched cards flip back after a short delay. The game ends when all eight pairs are matched.
- **Controls:** Mouse/tap on the card buttons triggers flips; there are no keyboard bindings or drag interactions.
- **Rewards:** Day 4 delivers an ice-breaker reward that shuffles through 15 topic prompts (`rewards.iceBreaker.*`) for group conversation starters.
- **Notes:** The shuffle uses Fisher–Yates to ensure randomization, and already-completed cards remain flipped with move stats restored from `CalendarStateService`.

### Present Stacking (`challengeType: presentStacking`)
- **Description:** Physics-heavy tower building powered by Matter.js; a present glides horizontally near the top until you drop it to stack on the developing pile.
- **How to play:** Drop up to 12 presents (default) by clicking/tapping the canvas when the moving preview is aligned with the tower; reaching a scaled target height (300 px for desktop, halved on mobile) finishes the level.
- **Controls:** Single mouse click or tap anywhere on the canvas triggers `dropPresent()`; there is no drag-and-drop or keyboard interaction.
- **Rewards:** Day 24 unlocks a video reward (`rewards/day24.mp4`) after the tower clears the height threshold.
- **Notes:** The UI renders current/next present previews, a progress bar, and counts how many presents have been used; the engine marks the day complete as soon as height conditions are satisfied.

### Rebus (`challengeType: rebus`)
- **Description:** Emoji/text puzzles hint at a word or phrase; translation keys make the rebus and hint text easy to localize.
- **How to play:** Read the rebus, optionally reveal the hint, type the answer in the input, and press Enter or tap Submit; wrong answers flash a brief error message.
- **Controls:** Text input with Enter key handling; hints and submit are standard buttons, so mouse and keyboard are both supported.
- **Rewards:** Day 6 shows a popup card reward, while day 13 only delivers a fun fact.
- **Notes:** Answers are normalized via `normalize('NFC')` so accented characters and letter case are ignored.

### Riddle (`challengeType: riddle`)
- **Description:** Read a translated riddle, toggle a hint if needed, and type the solution to complete the puzzle.
- **How to play:** Fill in the text box and submit; the component normalizes the string before comparing it to the allowed answers list, so extra whitespace or capitalization does not block completion.
- **Controls:** Keyboard typing and the Enter key, or the Submit button; there are no drag gestures.
- **Rewards:** Day 1 reveals a video reward (`rewards/day1.mp4`), while day 14 gives a snow globe collectible reward configured via `rewards.snowGlobe`.
- **Notes:** Hints toggle on demand, and already-completed riddles populate the input with the stored answer so the UI can show the solved state.

### Ski Slope (`challengeType: skiSlope`)
- **Description:** Santa skis downhill while dodging trees/rocks, slowing on snowdrifts, and picking up presents to keep the Grinch at bay.
- **How to play:** Start the run, then steer left/right to avoid deadly obstacles; snowdrifts temporarily slow Santa, and collecting presents pushes the Grinch backward. If the Grinch catches up, the run ends.
- **Controls:** Desktop users hold Left/Right arrows or `A`/`D`; mobile players use the two circular arrow buttons (touchstart/touchend) displayed below the canvas.
- **Rewards:** Day 7 only shows a fun fact (`funFactKey`) with no additional media.
- **Notes:** Distance, presents, and Grinch distance feed into the HUD; the component also exposes an infinite mode that tracks best distance/time via `CalendarStateService`.

### Sliding Puzzle (`challengeType: slidingPuzzle`)
- **Description:** Sliding-grid puzzle (3×3 by default) that arranges festive emoji tiles into order with the blank slot in the lower-right corner.
- **How to play:** Tap/click a tile adjacent to the empty slot to slide it into place, or use the arrow keys to shift tiles around; the component listens for `keydown` to map arrows onto the target tiles.
- **Controls:** Mouse or touch taps on tiles plus keyboard arrow navigation for accessibility; there is no drag-and-drop because each move swaps the selected tile with the blank.
- **Rewards:** Day 16 awards a coupon (emoji `🃏`) with localized title and description keys.
- **Notes:** The shuffle routine performs legal moves to ensure solvability, and move counts persist per day through `CalendarStateService` for completed runs.

### Sokoban (`challengeType: sokoban`)
- **Description:** Push boxes (`B`) onto goals (`G`) inside a maze of walls (`W`) while moving the player (`P`) around; the level layout is hard-coded in the calendar config.
- **How to play:** Move toward a box with arrows or WASD; pushing a box requires an empty space beyond it and cannot be undone without using the undo feature.
- **Controls:** Desktop arrow keys/WASD plus an on-screen D-pad for mobile. `Undo` and `Reset` buttons let you step backward or restart the level.
- **Rewards:** Day 8 only surfaces a fun fact (`funFactKey`) plus the usual completion modal.
- **Notes:** Moves are recorded in `moveHistory` so undo can restore prior states, and completion saves the final move count in `CalendarStateService`.

### Word Scramble (`challengeType: wordScramble`)
- **Description:** Shuffle a festive word (English or Swedish depending on `TranslateService`) and use the clue/hint to write the correct answer.
- **How to play:** Tap “Reshuffle” if the scrambled letters look too similar to the target, type the answer in the input, and either press Enter or click Submit to validate.
- **Controls:** Keyboard text input and Enter key plus the Submit/Hint buttons; the UI does not require clicking individual letters or dragging.
- **Rewards:** Day 3 plays an audio track (`rewards/day3.mp3`), day 12 unlocks a downloadable wallpaper image, and the day 19 encounter is fun-fact-only.
- **Notes:** The scrambling logic reruns until the letters differ from the original word, and Swedish spellings (with characters like `ÅÄÖ`) appear whenever the UI locale is Swedish.

### Word Search (`challengeType: wordSearch`)
- **Description:** Word-search grid with an English or Swedish word list; found words are highlighted in gold and strikethrough on the list.
- **How to play:** Click/tap the first letter, drag in a straight line (horizontal, vertical, or diagonal), and release; reversed words are accepted, and selection resets after every mouse-up or touch-end event.
- **Controls:** Mouse click/drag plus touch gestures (`touchstart`, `touchmove`, `touchend`) that detect cells via `document.elementFromPoint`; the board enforces straight-line selections once you choose a direction.
- **Rewards:** Days 17 and 23 only provide fun facts; there are no extra media rewards for either appearance.
- **Notes:** Swedish grids include accented letters (e.g., `Å`, `Ä`, `Ö`), and once all words are found, the component fires `completed.emit()` after a short delay.
