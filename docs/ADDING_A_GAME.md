# Adding or replacing a game

Every minigame plugs into the calendar through the same small contract, so games can be swapped
freely from year to year. This guide is the checklist for building one that feels like part of
the calendar.

## 1. The component contract

Create `src/app/components/challenges/<kebab-name>-challenge/` with `.ts`, `.html` and `.scss`:

```ts
@Component({
  selector: 'app-<kebab-name>-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './<kebab-name>-challenge.html',
  styleUrl: './<kebab-name>-challenge.scss',
})
export class <PascalName>Challenge {
  @Input() config: <PascalName>Config = {}; // every field optional, with sensible defaults
  @Input() isCompleted = false;              // the day was already completed
  @Input() day?: number;                     // set for calendar days (1–24)
  @Input() levelId?: string;                 // set for extras levels
  @Output() completed = new EventEmitter<void>();
}
```

`ChallengeHost` creates the component and passes these four inputs with `setInput`. Rules:

- **Win:** celebrate in the game (animation plus `sound.fanfare()`), save stats, then emit `completed`
  after about 1.5–2 s. The host then shows the day's reward.
- **Already completed:** show a `pill` badge "✓ {{ 'calendar.completed' | translate }}" and a
  `btn btn-primary` "{{ 'ui.showReward' | translate }}" that emits `completed`. The game stays playable.
- **Loss:** a friendly message and an instant retry. Never dead-end. Aim for 1–4 minutes of play for an
  average colleague, and keep early days easy.
- **Stats:** `const key = this.day ?? this.levelId;` then `saveGameStats(key, {...})` and
  `getGameStats(key)`. Show the personal best when there is one.
- **Endless mode** (optional, for extras): `config.endless === true` means no win target. Play until
  out of lives or time, show the final score and personal best, and offer Play again. Never emit
  `completed`. Mark the extras level with `isInfinite: true`.

## 2. Look and feel

- Use the global classes from `src/styles.scss`: `btn btn-primary | btn-secondary | btn-outline`,
  `card`, `input`, `pill`, `glow-title`. Use the design tokens (`var(--color-gold)`, `text-gold`,
  `text-text-muted`, `bg-surface`, …).
- Header pattern: an `h3` with emoji and title (`text-xl sm:text-2xl font-bold text-gold`), then a
  one-line muted instruction.
- Draw art in code (SVG, CSS, canvas). Emoji are fine as accents. Don't add image files or npm
  dependencies for a game.
- The game renders inside the challenge modal: full screen on phones, about 1400×90vh on desktop.
  It must fit 390×844 and 1280×860 with no horizontal scroll.
- Sound: `inject(SoundService)` gives `bell()`, `doorOpen()`, `jingle()`, `thud()` and `fanfare()`,
  which respect the mute toggle, plus `note()`, which always plays and is only for games built
  around audio.

## 3. Technical rules

- Pointer events plus keyboard. Use `touch-action: none` on play surfaces.
- Canvas: size it from the container with a `ResizeObserver`, cap devicePixelRatio at 2, run the
  loop in `NgZone.runOutsideAngular`, pause when `document.hidden`, and clean up every loop,
  timer and listener in `ngOnDestroy`.
- Never animate a CSS `transform` on an SVG element that has a `transform` attribute (the CSS wins).
  Animate a child element instead.
- Don't use CSS `scale` on containers at startup, because games measure their size.
- Respect `prefers-reduced-motion` where it is cheap.

## 4. Translations

All text goes through ngx-translate under `challenges.<camelType>.*` in both
`src/assets/i18n/sv.json` (the default language) and `en.json`. Generic keys live under `ui.*`.
Content that differs per language (words, song titles) belongs in translations or in config with
`…Sv` / `…En` fields. The i18n files start with a UTF-8 BOM and use 2-space indentation; keep both.

## 5. Register it

1. Add the type to `ChallengeType` in `src/app/models/calendar.models.ts`.
2. Add an icon in `src/app/config/challenge-icons.ts`.
3. Add a lazy loader in `src/app/config/challenge-registry.ts`:
   ```ts
   myGame: () =>
     import('../components/challenges/my-game-challenge/my-game-challenge').then(
       (m) => m.MyGameChallenge
     ),
   ```
4. Use it in `src/app/config/calendar-config.ts` (keep each day's `gridPosition` and `reward`).
5. Add a section to `src/app/config/extras-config.ts`, plus `extras.games.<type>` titles and level
   names in both i18n files.
6. Document it in `GAMES.md`.

## 6. Test it

```bash
npm start                                  # dev server on http://localhost:4200
npx ng build --configuration development   # must pass with no new warnings
npx ng build --configuration production    # checks the bundle budgets
```

To test any day, type `devtools` on the calendar page, then turn on dev mode or set a fake
December day. Play to a win, and check that the reward appears and the day is saved. Also check a
loss and retry, the already-completed path, and a phone-sized window.
