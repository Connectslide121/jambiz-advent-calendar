# Rewards 2026

The plan for the 24 rewards behind the doors. It replaces the 2025 placeholders that the redesign
imported. Swedish is the main language; every text also gets an English version.

## Principles

- **Fun first, for colleagues.** Mostly playful office rewards: coupons, fortunes, conversation
  starters. A handful of fun facts, each tied to the day's game or date.
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
| 1 | Juldle | text (letter) | Welcome letter: "Välkommen till Jambiz julkalender 2026": how it works, a door a day, scoreboards, see you on the 24th. |
| 2 | Jingle Bells | text (fact) | Kalle Anka on Swedish TV at 15:00 on Christmas Eve, and how long it's been a tradition. |
| 3 | Bonka tomten | coupon 🍪 | Fikakupong: you choose the biscuit at the next fika. |
| 4 | Ice Slide | fortune cookie | Eight new Christmas-at-work fortunes ("A meeting you dread will be cancelled. Possibly by you."). |
| 5 | Emoji Carols | text (fact) | Gävlebocken: when it was first built and how often it has burned. |
| 6 | Snowball Toss | image (download) | A phone and desktop wallpaper of the calendar's Nordic Christmas night (aurora, cabin, snow). |
| 7 | Nonogram | ice breaker | Fikafrågor: ten Christmas-memory questions for the coffee break ("Best or worst Christmas present you've ever had?"). |
| 8 | Gift Match | coupon 🙉 | Notisfri timme: an hour with Teams on "Do not disturb", guilt-free. |
| 9 | Chimney Drop | text (recipe) | Five-minute recipe card: a quick julkola or spiced nuts, short ingredient list and steps. |
| 10 | Light Path | Magic 8-ball | New Christmas answers ("The tomte says yes", "Ask again after the glögg", "Unclear: too much tinsel"). |
| 11 | Spot the Difference | coupon 🎧 | DJ-kupong: you pick the office music (or the Teams waiting music in your head) for an hour. |
| 12 | Snowman Stack | image (download) | A printable colouring page: a Nordic Christmas scene for kids (or adults in long meetings). |
| 13 | Cryptogram | text (fact) | Lucia: why the 13th, and the old calendar's longest night. |
| 14 | Toy Sorter | snow globe | Shake for one of several short winter wishes for the rest of the year. |
| 15 | Gift Packing | coupon 🎁 | Inslagningsjoker: "the paper ran out, so a gift bag is official wrapping this year". |
| 16 | Rooftop Runner | coupon 🃏 | Jokerkort: one "no" this December, no explanation needed. |
| 17 | Christmas Detective | text (fact) | Sherlock Holmes has a Christmas case: *The Adventure of the Blue Carbuncle*, the year it came out and how the goose solves it. |
| 18 | Cookie Decorator | ice breaker | Would-you-rather, Christmas edition: ten questions ("Ris à la Malta or risgrynsgröt?"). |
| 19 | Carol Conductor | text (fact) | Jingle Bells wasn't written for Christmas, and it was one of the first songs played in space. |
| 20 | Tree Lights | text (jokes) | Five terrible Christmas-cracker jokes, Swedish and English versions written natively (not translated puns). |
| 21 | Snow Globe Jigsaw | text (fact) | Winter solstice: the darkest day, how much daylight Stockholm and Kiruna get, and that it only gets lighter from here. |
| 22 | Chimney Sweeper | coupon 🛋️ | Soffkupong: one whole evening under a blanket with no guilt. |
| 23 | Gingerbread Bridge | text (bingo) | Julaftonsbingo: a 3×3 card for Christmas Eve ("someone says 'nu är det jul igen'", "Kalle Anka at 15:00", "a forgotten present"). |
| 24 | Christmas Eve Escape | pop-up card | The finale: an unfolding "God jul från Jambiz" card, thanking everyone for the year. |

## Cloud data

The live rewards are stored in the Cosmos `calendar` document, which was seeded before this plan.
A `rewardRevision` in `api/Data/calendar-2026.json` (like `gameRevision`) replaces every day's
`reward`/`funFactKey` once on deploy, so the new rewards ship as a migration rather than a manual
edit.
