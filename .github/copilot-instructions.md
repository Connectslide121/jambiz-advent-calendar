# Contributor & AI assistant instructions

These instructions are for anyone working on the repo, including AI coding assistants (Copilot,
Claude, …). Read [README.md](../README.md) for the overview, [GAMES.md](../GAMES.md) for the games,
and [docs/ADDING_A_GAME.md](../docs/ADDING_A_GAME.md) before touching a game.

## Project in one paragraph

**Jambiz Julkalender** is an Angular 20 app with a C# Azure Functions backend: an advent calendar with 24 doors, each
hiding a Christmas minigame and a reward. It is bilingual (Swedish by default, English), stores
progress and rewards in Cosmos DB, with single-tenant Entra authentication. Read [docs/BACKEND.md](../docs/BACKEND.md) for the Azure development deployment. The existing GitHub Pages site at jambizadvent.se remains separate. Each season gets
a new branch: 2025 lives on `advent-2025`, and 2026 is developed on the main development branch.

## Tech stack

- Angular 20 standalone components (no NgModules), signals where they help
- TypeScript 5.9 in strict mode
- Tailwind CSS 3 plus SCSS for component styles
- ngx-translate 17 (`src/assets/i18n/sv.json`, `en.json`)
- Lucide icons (`lucide-angular`)
- Web Audio for sound (`SoundService`), with no audio files for UI sounds

## Architecture

```
src/app/
├── models/      # ChallengeType union, RewardConfig, CalendarDayConfig
├── config/      # calendar-config, extras-config, challenge-registry (lazy loaders), icons
├── services/    # CalendarStateService (progress/stats/unlocks/dev tools), SoundService
└── components/  # winter-scene, string-lights, landing-page, calendar, progress-tree,
                 # challenge-host, fun-fact-reveal, challenges/<game>/
```

- `ChallengeHost` looks up `CHALLENGE_LOADERS[type]`, lazy-loads the game, and passes `config`,
  `isCompleted`, `day` (calendar only) and `levelId` (extras only) with `setInput`. It listens to
  `completed`, then shows the reward from `FunFactReveal`.
- Every game must follow the contract in `docs/ADDING_A_GAME.md`. Don't add game-specific code to
  the host.
- `CalendarStateService` is the single source of truth for completed days, game stats, dev mode,
  the local date override and the hydrated cloud progress. `BackendService` owns Entra/API access.

## Styling

- Prefer Tailwind utilities and the global classes in `src/styles.scss`: `.btn` (`-primary`,
  `-secondary`, `-outline`), `.card`, `.input`, `.pill`, `.modal-overlay` / `.modal-content`.
- Use the tokens (`--color-bg`, `--color-gold`, `--color-accent-red`, `--color-accent-green`,
  `--color-frost`, …) and the Tailwind names that mirror them (`text-gold`, `bg-surface`,
  `text-text-muted`, …). Don't hard-code new palettes.
- Headings use Fraunces (`h1`–`h3` automatically, or `.font-display`); body text uses Nunito.
- The landing page and headings use a restrained ivory/frost style. Keep gold as an accent, not a
  gradient fill on large text.
- `.card` sets only `background-color`, so `bg-*` utilities can recolour it.
- Performance: avoid large CSS `filter: blur()` or `backdrop-filter` on animated, full-screen
  layers. The winter scene pauses itself while a modal is open.
- Every screen must work at 390×844 without horizontal scroll, and honour `prefers-reduced-motion`.

## Translations

- All visible text goes through `| translate`. Add keys to **both** `sv.json` and `en.json`.
- The JSON files start with a UTF-8 BOM and use 2-space indentation. Preserve both. When editing
  with a script, read with `utf-8-sig` and write the BOM back.
- Key layout: `app.*`, `landing.*`, `calendar.*`, `challenges.<type>.*`, `extras.games.<type>.*`,
  `rewards.*`, `funFacts.*`, `info.*`, `ui.*` (generic buttons such as showReward, playAgain, reset).

## Seasons and progress

Cloud progress is partitioned by season and Entra user. The old browser version-reset mechanism is removed. Local dev tools do not reset cloud data.

## Secret dev tools

Type `devtools` on the page (not in an input) to show:
- dev mode (unlocks all doors)
- the December date override (1–31)
- mark all complete
- clear progress

They are session-only, localhost-only previews. The API still enforces real dates and saved completions.

## Checks before committing

```bash
npx ng build --configuration development   # no new warnings
npx ng build --configuration production    # bundle budgets
```

For UI changes, look at the page at phone and desktop sizes and play the affected game to a win.
Keep commits focused, and don't commit `dist/` or `.claude/worktrees/`.
