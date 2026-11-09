# Rewards 2026

The plan for the 24 rewards behind the doors. It replaces the 2025 placeholders that the redesign
imported. Swedish is the main language; every text also gets an English version.

## Principles

- **We all work remotely.** Colleagues rarely meet in an office, so every reward works alone at
  home or together in Teams: things to keep (wallpapers, Teams backgrounds), to do at home (bake,
  print, colour), to bring to a Teams meeting or the team chat, and coupons for the home-office day.
  Nothing may assume an office, a shared fika table or meeting in person.
- **Fun first, for colleagues.** Mostly playful rewards: coupons, fortunes, conversation starters,
  things to download. A handful of fun facts, each tied to the day's game or date.
- **Every fact is verified** against at least one reliable source before it's written; the
  source goes in the commit message. If a fact can't be confirmed, replace it with a different
  verified fact on the same theme.
- **Coupons are jokes, not promises.** They need nobody's approval: "valid while the Christmas
  spirit lasts", never "redeem with HR". No money, no days off, nothing a manager would have to say
  no to.
- **No 2025 media.** Videos and audio from last year go. New images are generated (Studio image
  tool), saved under `public/rewards/2026/`, and kept small (WebP or compressed PNG, under 400 kB).
- **One set of keys per day.** Texts live under `rewards.dayN.*` in `src/assets/i18n/sv.json` and
  `en.json` (UTF-8 with BOM). Reward types that share fixed texts today (pop-up card, snow globe,
  fortune cookie, Magic 8-ball, ice breaker) take per-day keys, with today's texts as the fallback.
- **Tone:** warm, lightly self-deprecating, inclusive. No in-jokes about named people, no alcohol as
  the point of a reward, nothing religious beyond tradition.

## The days

| Day | Game | Reward type | Idea |
|---:|---|---|---|
| 1 | Juldle | text (letter) | Welcome letter: "Välkommen till Jambiz julkalender 2026": a door a day, the scoreboards, a little December together even though we're spread out, see you on the 24th. |
| 2 | Jingle Bells | image (download) | Teams background #1: a cosy log cabin at night, aurora outside the window, space on the left for your face. 1920×1080. |
| 3 | Bonka tomten | coupon 📷 | Kamera av-kupong: one meeting with the camera off, no explanation (bed hair, porridge, a cat on the keyboard). |
| 4 | Ice Slide | fortune cookie | Eight home-office fortunes ("Your Wi-Fi will hold through every important meeting this month.", "Someone will say 'you're on mute' and it won't be you."). |
| 5 | Emoji Carols | text (challenge) | Emoji-utmaningen: describe your perfect Christmas in three emojis and post it in the team chat; see who can guess everyone's. |
| 6 | Snowball Toss | image (download) | Phone lock screen and desktop wallpaper of the calendar's Nordic Christmas night (aurora, cabin, snow). |
| 7 | Nonogram | ice breaker | Mötesstartare: ten Christmas questions to open your next Teams meeting ("Best or worst Christmas present you've ever had?", "Which Christmas food could you skip forever?"). |
| 8 | Gift Match | coupon 🙉 | Notisfri timme: an hour with Teams on "Do not disturb", guilt-free. |
| 9 | Chimney Drop | text (recipe) | Home-office fika: a quick recipe to make between two meetings (e.g. julkola in the microwave or spiced nuts), short ingredient list and steps. |
| 10 | Light Path | Magic 8-ball | New Christmas answers ("The tomte says yes", "Ask again after the glögg", "Unclear: too much tinsel"). |
| 11 | Spot the Difference | image (download) | Teams background #2: a snowy Swedish village street at dusk with lit windows and Advent stars. |
| 12 | Snowman Stack | image (download) | Printable colouring page: a Nordic Christmas scene for the kids at home (or for adults in long meetings, camera off). |
| 13 | Cryptogram | text (fact) | Lucia: why the 13th, and the old calendar's longest night. |
| 14 | Toy Sorter | snow globe | Shake for one of several short winter wishes for the rest of the year. |
| 15 | Gift Packing | coupon 🎁 | Inslagningsjoker: "the paper ran out, so a gift bag is official wrapping this year". |
| 16 | Rooftop Runner | coupon 🚶 | Promenadkupong: take your next one-to-one as a phone call on a winter walk instead of on camera. |
| 17 | Christmas Detective | text (fact) | Sherlock Holmes has a Christmas case: *The Adventure of the Blue Carbuncle*, the year it came out and how the goose solves it. |
| 18 | Cookie Decorator | ice breaker | Would-you-rather, Christmas edition: ten questions to drop in the team chat ("Ris à la Malta or risgrynsgröt?"). |
| 19 | Carol Conductor | text (fact) | Jingle Bells wasn't written for Christmas, and it was one of the first songs played in space. |
| 20 | Tree Lights | text (jokes) | Five terrible Christmas-cracker jokes to paste in the team chat, Swedish and English versions written natively (not translated puns). |
| 21 | Snow Globe Jigsaw | text (fact) | Winter solstice: the darkest day, how much daylight Stockholm and Kiruna get, and that it only gets lighter from here. |
| 22 | Chimney Sweeper | coupon 🛋️ | Soffkupong: one whole evening under a blanket with no guilt, laptop closed. |
| 23 | Gingerbread Bridge | text (bingo) | Julaftonsbingo: a 3×3 card for Christmas Eve at home ("someone says 'nu är det jul igen'", "Kalle Anka at 15:00", "a forgotten present"). |
| 24 | Christmas Eve Escape | pop-up card | The finale: an unfolding "God jul från Jambiz" card, thanking everyone for the year, wherever they are. |

## Cloud data

The live rewards are stored in the Cosmos `calendar` document, which was seeded before this plan.
A `rewardRevision` in `api/Data/calendar-2026.json` (like `gameRevision`) replaces every day's
`reward`/`funFactKey` once on deploy, so the new rewards ship as a migration rather than a manual
edit.
