# 2026 calendar game inventory and replacement proposal

This is an inventory and design proposal, not an implementation of the new games.
The inventory is taken from `api/Data/calendar-2026.json`; bonus levels are in
`src/app/config/extras-config.ts`.

## Current calendar

- 24 calendar doors use 14 distinct game types.
- 10 game types appear twice, accounting for 20 doors.
- 4 game types appear once.
- That leaves 10 repeat slots to replace to reach 24 distinct calendar games.
- Repeats have different words, boards, scenes or difficulty, but reuse the same core game.
- Extras contain 63 bonus levels across these same 14 game types, including 7 endless modes.
  Those are intentional bonus variations and are outside this proposal to remove calendar repeats.

| Game | Calendar days | Core mechanic |
|---|---|---|
| Juldle | 1, 13 | Wordle-style word deduction |
| Bell Choir | 2 | Repeat a growing musical sequence |
| Whack-a-Tomte | 3, 16 | Hit good targets; avoid hazards |
| Frozen Lake | 4, 15 | Sliding movement puzzle |
| Emoji Carols | 5, 17 | Decode songs/films/food from emoji |
| Snowball Fight | 6, 19 | Aim ballistic throws at snowmen |
| Christmas Picross | 7, 21 | Reveal pictures using number clues |
| Gift Match | 8, 18 | Match-three with cascades and special pieces |
| Present Drop | 9, 22 | Time drops from a moving sleigh |
| Light the Village | 10, 23 | Rotate connections to route power |
| Spot the Difference | 11, 24 | Find differences between two scenes |
| Build a Snowman | 12 | Time drops to balance a stack |
| Elf Workshop | 14 | Sort moving objects under changing rules |
| Light Up the Tree | 20 | Lights-out toggle puzzle |

## Suggested replacements

Keep each game’s first appearance, including Elf Workshop on day 14 and Light Up the Tree on
day 20. Replace the ten later repetitions. Each idea below introduces a different core mechanic.
Target short, replayable rounds of roughly 1–3 minutes, with mouse/touch and keyboard controls,
Swedish/English instructions, sound effects, and results through the existing game contract.

| Day | Replaces | New game | How it plays | What makes it different |
|---|---|---|---|---|
| 13 | Juldle | Christmas Cryptogram | Decode a short festive message using a substitution cipher. Shared letter mappings make each deduction useful. | Language deduction, distinct from Wordle guesses. |
| 15 | Frozen Lake | Gift Packing | Rotate and place differently shaped presents until they fit inside Santa’s sack. | Spatial packing; no sliding-character puzzle. |
| 16 | Whack-a-Tomte | Rooftop Runner | Jump across snowy rooftops, dodge chimneys and collect presents on a short course. | Platforming with jumps and momentum. |
| 17 | Emoji Carols | Christmas Detective | Use clues to work out which elf owns each present, lives in each house and likes each treat. | Logic-grid deduction rather than a quiz. |
| 18 | Gift Match | Cookie Decorator | Trace icing patterns on gingerbread, balancing accuracy and speed. | Freehand precision drawing rather than matching tiles. |
| 19 | Snowball Fight | Carol Conductor | Tap four lanes in time with a short Christmas melody; build combos for accurate beats. | Rhythm and timing, distinct from Bell Choir’s sequence memory. |
| 21 | Christmas Picross | Snow Globe Jigsaw | Rotate and assemble picture pieces to reveal a Christmas scene. | Shape matching and assembly rather than a nonogram. |
| 22 | Present Drop | Chimney Sweeper | Move a paddle to bounce a snowball through soot bricks; catch helpful power-ups. | Brick-breaker control, rebounds and aiming. |
| 23 | Light the Village | Gingerbread Bridge | Build a bridge with a small supply of planks, then test whether the reindeer can cross. | Physics construction and resource budgeting. |
| 24 | Spot the Difference | Christmas Eve Escape | Explore Santa’s study, combine a few objects and solve linked clues to unlock the final present. | A short point-and-click escape-room finale. |

Adopting all ten replacements gives 24 distinct games across 24 doors, with no repeated game type.
Existing harder variants can remain in Extras.

I would prototype Gift Packing, Rooftop Runner and Carol Conductor first: they add particularly
clear differences in interaction (spatial arrangement, platforming and rhythm). Keep Christmas
Eve Escape small and polished as the final-day surprise rather than making it a long adventure.
