# 🎄 Jambiz Julkalender 2026

An interactive advent calendar for Jambiz colleagues. Every morning in December a new door opens with
a cosy Christmas minigame behind it, and beating the game unwraps a reward. Live at
**[jambizadvent.se](https://jambizadvent.se)**.

![Angular](https://img.shields.io/badge/Angular-20.3-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

> The 2025 calendar is archived on the [`advent-2025`](../../tree/advent-2025) branch.

## ✨ What's inside

- **24 doors, 24 different games.** Word, logic, action and observation games, all new for 2026, from
  *Juldle* and *Frusna sjön* to *Bonka tomten* and *Klappleveransen*. See **[GAMES.md](GAMES.md)**
  for the full list and the day-by-day plan.
- **Extras.** After all 24 doors (or on Christmas Day) a bonus menu opens with 83 levels, including the
  ten former calendar variants, practice rounds for the new games and 7 **endless ♾️ modes**.
- **"Nordic Christmas night" design.**
  - Background: an animated scene with northern lights, twinkling stars and shooting stars, parallax
    hills with a log cabin, and snow that drifts with the mouse. Click the moon to call Santa's sleigh.
  - Doors: 24 frosted windowpanes that swing open on hinges and shiver when locked; today's window glows
    like a lit candle, and finished windows show their piece of the picture.
  - Progress: a Christmas tree that lights one ornament per finished day.
  - Menus and cards: quiet glass panels with hairline borders, serif headings and paper-white buttons,
    matching the welcome page.
  - Lights: a swaying string of fairy lights; tap a bulb to ring it.
- **Sound.** Bells and chimes are synthesized with Web Audio, so there are no sound files. Sound is
  on by default, with a mute toggle in the header that remembers your choice.
- **Puzzle picture.** Each finished door reveals a piece of a hidden picture.
- **Swedish and English**, with Swedish as the default.
- **Works on phones and desktops**, with touch, mouse and keyboard.
- **Azure backend.** C#/.NET 10 Azure Functions with Cosmos DB stores rewards, progress and results. Entra sign-in uses the same tenant as podium-ops; daily and global scoreboards show each player's best runs. See [backend and deployment](docs/BACKEND.md).

## 🚀 Getting started

Requires Node.js 20.19+ (or a supported newer Angular 20 Node version), npm and .NET 10 SDK. The committed runtime configuration connects local development to the Azure backend.

```bash
git clone https://github.com/Connectslide121/jambiz-advent-calendar.git
cd jambiz-advent-calendar
npm install
npm start            # http://localhost:4200
```

| Command | What it does |
|---|---|
| `npm start` | Dev server with live reload |
| `npm run build` | Production build into `dist/` |
| `npm run deploy` | Production build published to GitHub Pages (`jambizadvent.se`) |
| `npm test` | Unit tests (Karma) |

### Testing the calendar outside December

On localhost, type **`devtools`** on the calendar page (outside an input) for UI previews. The API still enforces real dates; these controls do not create official results or reset cloud data.

- **Dev mode:** unlocks every door.
- **Date override:** pretend it's a given December day (1–31). Countdowns follow it too.
- **Mark all complete / clear progress:** test the end-of-calendar celebration and the Extras.

## 🗂️ Project structure

```
src/
├── app/
│   ├── components/
│   │   ├── winter-scene/      # Animated background: sky, aurora, moon, sleigh, hills, snow
│   │   ├── string-lights/     # Fairy-light garland
│   │   ├── landing-page/      # Title page with the countdown to December 1st
│   │   ├── calendar/          # Windowpane doors, sidebar, Christmas Day card
│   │   ├── progress-tree/     # One ornament per finished day
│   │   ├── challenge-host/    # Modal that lazy-loads a game, then shows the reward
│   │   ├── fun-fact-reveal/   # Reward screens (text, video, audio, coupons, snow globe…)
│   │   └── challenges/        # The 24 games, one folder each
│   ├── config/
│   │   ├── calendar-config.ts # Day → game, game settings and reward
│   │   ├── extras-config.ts   # Bonus levels for the Extras menu
│   │   ├── challenge-registry.ts # Lazy loaders for every game
│   │   └── challenge-icons.ts
│   ├── models/calendar.models.ts
│   └── services/
│       ├── calendar-state.service.ts # Progress, stats, unlock rules, dev tools
│       └── sound.service.ts          # Web Audio bells
├── assets/i18n/{sv,en}.json   # All text (UTF-8 with BOM)
└── styles.scss                # Design tokens and global .btn / .card / .input / .pill
public/rewards/                # Reward media (videos, audio, wallpaper)
```

## 🛠️ Configuration

### Days and rewards
`api/Data/calendar-2026.json` seeds the Cosmos calendar document with each game (`challengeType` + `challengeData`) and a
reward (`reward` or a `funFactKey`). `gridPosition` (0–23) decides where the door sits in the 6×4
grid and which piece of the puzzle picture it reveals. Reward types: `text`, `image`, `video`,
`audio`, `coupon`, `snowGlobe`, `magic8Ball`, `popupCard`, `fortuneCookie`, `iceBreaker`.

> **2026 rewards are still to be decided.** The current rewards and the puzzle picture
> (`src/assets/Calendar_puzzle.png`) are last year's placeholders. Ideas include free e-learning
> courses and releases of JambizHub modules.

### Games and extras
See [GAMES.md](GAMES.md) for every game's settings and [docs/ADDING_A_GAME.md](docs/ADDING_A_GAME.md)
to build a new one.

### Design system
The tokens in `src/styles.scss` are mirrored in `tailwind.config.js`: midnight blue `--color-bg`,
cranberry `--color-accent-red`, pine `--color-accent-green`, candle gold `--color-gold`, plus frost,
aurora and ember. The display font is Fraunces and the body font is Nunito. Games reuse the global
`.btn`, `.card`, `.input` and `.pill` classes, so a palette change reaches all of them.

### Unlock rules
- Door *n* opens on December *n*, 2026 at midnight in Europe/Stockholm, enforced by the API.
- On Christmas Day everything opens for everyone.
- The Extras menu and the rewards gallery unlock when all 24 doors are done, or on Christmas Day.

### Progress and seasons
Progress is stored per Entra user and season in Cosmos DB. Browser resets do not erase cloud results.
Developer controls cannot reset cloud progress. See [backend guide](docs/BACKEND.md).

## 🌐 Deployment

There is one production environment. GitHub Pages at [jambizadvent.se](https://jambizadvent.se) and
the Azure frontend share the same API and Cosmos database. Historical Azure resource names
containing `dev` / `develop` are retained; their environment tags are `prod`.

Azure: [Open the 2026 calendar](https://calm-water-0b43e6903.5.azurestaticapps.net).
Use ./scripts/deploy.ps1 from PowerShell. See [Azure setup and API guide](docs/BACKEND.md).

The following command targets the existing GitHub Pages site:

```bash
npm run deploy
```

This builds for production and publishes `dist/jambiz-advent-calendar/browser` to the `gh-pages`
branch. The custom domain comes from `src/CNAME`.

## 👥 Credits

Built for Jambiz with Angular, Tailwind CSS, ngx-translate and Lucide icons.
