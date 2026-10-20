# 2026 calendar game inventory

The ten replacements are implemented. **All 24 doors now use different game types.**
The first appearance of each original game remains on its original day; later appearances have
been replaced according to the table below. See [GAMES.md](../GAMES.md) for the current day plan.

Extras contain **83 levels across 24 game types**, including 7 endless modes, the ten archived
calendar variants and one practice round for each new game. Original bonus level IDs are preserved.

## Original inventory before replacement

The previous calendar had 14 distinct game types: ten appeared twice and four appeared once.
The original Extras menu had 63 levels. This table records that earlier layout:

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

## Implemented replacements

Each replacement introduces a different core mechanic, with mouse/touch and keyboard controls,
Swedish/English text, sound effects, replay and personal bests through the existing game contract.

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

The seed has `gameRevision: 1`. On the first calendar request after deploying the updated API,
the versioned migration updates game definitions while preserving edited rewards, grid positions,
other calendar metadata and player documents. Deploy the compatible frontend before the backend;
local dev mode reads the new seed directly.
