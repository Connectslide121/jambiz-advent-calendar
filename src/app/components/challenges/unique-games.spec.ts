import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Type } from '@angular/core';
import { TranslateModule, TranslateService, TranslationObject } from '@ngx-translate/core';
import { SeasonalGame } from './shared/seasonal-game';
import { CalendarStateService } from '../../services/calendar-state.service';
import { SoundService } from '../../services/sound.service';
import { CHALLENGE_LOADERS } from '../../config/challenge-registry';
import { CHALLENGE_ICONS } from '../../config/challenge-icons';
import { EXTRA_LEVELS } from '../../config/extras-config';
import { CalendarDayConfig } from '../../models/calendar.models';
import { CryptogramChallenge } from './cryptogram-challenge/cryptogram-challenge';
import {
  GiftPackingChallenge,
  PACKING_PIECES,
  PACKING_SOLUTION,
  packingFits,
  packingPlacement,
  rotateCells,
} from './gift-packing-challenge/gift-packing-challenge';
import {
  ChristmasDetectiveChallenge,
  detectiveClues,
} from './christmas-detective-challenge/christmas-detective-challenge';
import {
  CookieDecoratorChallenge,
  COOKIE_PATTERNS,
} from './cookie-decorator-challenge/cookie-decorator-challenge';
import { CarolConductorChallenge } from './carol-conductor-challenge/carol-conductor-challenge';
import { SnowGlobeJigsawChallenge } from './snow-globe-jigsaw-challenge/snow-globe-jigsaw-challenge';
import { RooftopRunnerChallenge } from './rooftop-runner-challenge/rooftop-runner-challenge';
import { ChimneySweeperChallenge } from './chimney-sweeper-challenge/chimney-sweeper-challenge';
import { GingerbreadBridgeChallenge } from './gingerbread-bridge-challenge/gingerbread-bridge-challenge';
import {
  analyzeBridge,
  BRIDGE_BLUEPRINT,
  BRIDGE_ROAD,
} from './gingerbread-bridge-challenge/bridge-physics';
import { ChristmasEveEscapeChallenge } from './christmas-eve-escape-challenge/christmas-eve-escape-challenge';

const newGames: Type<SeasonalGame>[] = [
  CryptogramChallenge,
  GiftPackingChallenge,
  RooftopRunnerChallenge,
  ChristmasDetectiveChallenge,
  CookieDecoratorChallenge,
  CarolConductorChallenge,
  SnowGlobeJigsawChallenge,
  ChimneySweeperChallenge,
  GingerbreadBridgeChallenge,
  ChristmasEveEscapeChallenge,
];
function permutations(values: number[]): number[][] {
  return values.length
    ? values.flatMap((v, i) =>
        permutations(values.filter((_, j) => j !== i)).map((rest) => [v, ...rest])
      )
    : [[]];
}

describe('Twenty-four unique calendar games', () => {
  let languages: Record<string, TranslationObject> = {};
  let days: CalendarDayConfig[] = [];
  let sound: jasmine.SpyObj<SoundService>;
  let state: jasmine.SpyObj<CalendarStateService>;
  beforeAll(async () => {
    for (const lang of ['en', 'sv'])
      languages[lang] = (await (
        await fetch('/assets/i18n/' + lang + '.json')
      ).json()) as TranslationObject;
    days = (
      (await (await fetch('/test-fixtures/calendar-2026.json')).json()) as {
        days: CalendarDayConfig[];
      }
    ).days;
  });
  beforeEach(() => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    sound = jasmine.createSpyObj('SoundService', [
      'tap',
      'bell',
      'bonk',
      'crunch',
      'bleat',
      'whoosh',
      'jingle',
      'fanfare',
      'thud',
      'doorOpen',
      'note',
    ]);
    state = jasmine.createSpyObj('State', { getGameStats: null, saveGameStats: undefined });
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: SoundService, useValue: sound },
        { provide: CalendarStateService, useValue: state },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    for (const lang of ['en', 'sv']) translate.setTranslation(lang, languages[lang]);
    translate.use('en');
  });
  function create<T extends SeasonalGame>(type: Type<T>, width = 390) {
    const fixture = TestBed.createComponent(type);
    fixture.nativeElement.style.width = width + 'px';
    fixture.componentInstance.day = 13;
    fixture.detectChanges();
    return fixture;
  }

  it('assigns 24 distinct registered types and preserves the ten old calendar variants in Extras', async () => {
    expect(days.length).toBe(24);
    expect(new Set(days.map((d) => d.challengeType)).size).toBe(24);
    for (const day of days) {
      expect(CHALLENGE_ICONS[day.challengeType!]).toBeTruthy();
      expect(await CHALLENGE_LOADERS[day.challengeType!]()).toBeTruthy();
    }
    expect(
      EXTRA_LEVELS.flatMap((s) => s.levels).filter((l) => l.id.includes('-calendar-')).length
    ).toBe(10);
    expect(EXTRA_LEVELS.flatMap((s) => s.levels).length).toBe(83);
  });

  for (const [width, language] of [[390, 'en'], [1280, 'en'], [390, 'sv']] as const)
    for (const component of newGames) {
      it(
        'renders ' +
          component.name +
          ' at ' +
          width +
          'px in ' + language + ' without page overflow or missing translations',
        () => {
          TestBed.inject(TranslateService).use(language);
          const fixture = create(component, width);
          try {
            const element = fixture.nativeElement as HTMLElement;
            element.getAnimations({ subtree: true }).forEach((a) => a.cancel());
            expect(element.scrollWidth)
              .withContext(component.name)
              .toBeLessThanOrEqual(element.clientWidth);
            expect(element.textContent).not.toContain('challenges.');
          } finally {
            fixture.destroy();
          }
        }
      );
    }

  it('solves the cryptogram through matching letter substitutions and reloads Swedish content', fakeAsync(() => {
    const fixture = create(CryptogramChallenge);
    const game = fixture.componentInstance;
    const emitted = spyOn(game.completed, 'emit');
    game.check();
    expect(game.won).toBeFalse();
    for (const letter of new Set(game.words.flat())) {
      game.select(letter);
      game.enter(letter);
    }
    game.check();
    expect(game.won).toBeTrue();
    expect(state.saveGameStats).toHaveBeenCalled();
    tick(1900);
    expect(emitted).toHaveBeenCalledTimes(1);
    game.restart();
    TestBed.inject(TranslateService).use('sv');
    expect(game.words.flat()).toContain('Ä');
    expect(game.words.flat()).toContain('Ö');
    fixture.destroy();
  }));

  it('packs all seven pieces without overlaps, rejects an impossible placement and supports undo', fakeAsync(() => {
    const fixture = create(GiftPackingChallenge);
    const game = fixture.componentInstance;
    // A lone free square cannot hold a four-square present
    game.select(1);
    game.board = Array(25).fill(6);
    game.board[24] = -1;
    game.cell(24);
    expect(game.placed.size).toBe(0);
    game.restart();
    for (let id = 0; id < PACKING_PIECES.length; id++) {
      game.select(id);
      while (game.rotations[id] !== 0) game.rotate();
      const pos = PACKING_SOLUTION[id];
      expect(packingFits(game.board, game.shape(id), pos.x, pos.y)).toBeTrue();
      // Point at the present's own top-left square, not its bounding box corner
      const [ax, ay] = [...game.shape(id)].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0];
      const target = (pos.y + ay) * 5 + pos.x + ax;
      game.cell(target);
      if (id === 0) {
        game.undo();
        expect(game.placed.size).toBe(0);
        game.cell(target);
      }
    }
    expect(game.won).toBeTrue();
    expect(game.board.filter((c) => c >= 0).length).toBe(25);
    tick(1900);
    fixture.destroy();
  }));

  it('drops a present into the hole under the pointer and previews it first', fakeAsync(() => {
    const fixture = create(GiftPackingChallenge);
    const game = fixture.componentInstance;
    // Piece 4 unrotated is an L whose bounding-box corner is empty; leave exactly its hole free,
    // with the corner square (3,2) already packed
    const hole = [14, 18, 19, 24];
    game.board = Array(25).fill(6);
    for (const i of hole) game.board[i] = -1;
    game.select(4);
    game.rotations[4] = 0;
    for (const target of [18, 14, 19, 24]) {
      const placement = packingPlacement(game.board, game.shape(4), target);
      expect(placement.fits).toBeTrue();
      expect([...placement.cells].sort((a, b) => a - b)).toEqual(hole);
    }
    game.point(18);
    expect(game.ghost?.fits).toBeTrue();
    expect(hole.every((i) => game.isGhost(i))).toBeTrue();
    game.cell(18);
    expect(game.placed.has(4)).toBeTrue();
    expect(hole.every((i) => game.board[i] === 4)).toBeTrue();
    fixture.destroy();
  }));

  it('keeps rotated packing pieces connected and returns to the original shape after four turns', () => {
    for (const piece of PACKING_PIECES) {
      expect(rotateCells(piece, 4)).toEqual(piece);
      expect(new Set(rotateCells(piece, 1).map((c) => c.join(','))).size).toBe(piece.length);
    }
  });

  it('gives the detective exactly one solution, then accepts it through the form controls', fakeAsync(() => {
    const possibilities = permutations([0, 1, 2, 3]);
    const solutions: number[][][] = [];
    for (const elves of possibilities)
      for (const gifts of possibilities)
        for (const treats of possibilities)
          if (detectiveClues(elves, gifts, treats).every(Boolean))
            solutions.push([elves, gifts, treats]);
    expect(solutions.length).toBe(1);
    const fixture = create(ChristmasDetectiveChallenge);
    const game = fixture.componentInstance;
    game.check();
    expect(game.won).toBeFalse();
    // Fill every house through its slot buttons and the picker that opens
    const element = fixture.nativeElement as HTMLElement;
    for (let house = 0; house < 4; house++)
      for (let category = 0; category < 3; category++) {
        fixture.detectChanges();
        element.querySelector<HTMLButtonElement>(`.slot[data-house="${house}"][data-category="${category}"]`)!.click();
        fixture.detectChanges();
        element.querySelector<HTMLButtonElement>(`.option[data-value="${solutions[0][category][house]}"]`)!.click();
      }
    expect(game.assignments).toEqual(solutions[0]);
    game.check();
    expect(game.won).toBeTrue();
    tick(1900);
    fixture.destroy();
  }));

  it('swaps a detective choice that is already used in another house', () => {
    const fixture = create(ChristmasDetectiveChallenge);
    const game = fixture.componentInstance;
    game.toggle(0, 1);
    game.pick(2);
    game.toggle(3, 1);
    game.pick(1);
    game.toggle(3, 1);
    game.pick(2);
    expect(game.assignments[1]).toEqual([1, -1, -1, 2]);
    fixture.destroy();
  });

  it('requires coverage and precision on every cookie, then completes all three drawings', fakeAsync(() => {
    const fixture = create(CookieDecoratorChallenge);
    const game = fixture.componentInstance;
    game.beginStroke({ x: 0, y: 0 });
    game.drawTo({ x: 300, y: 0 });
    game.up();
    game.check();
    expect(game.won).toBeFalse();
    expect(game.completedCookies).toBe(0);
    game.clearInk();
    for (const pattern of COOKIE_PATTERNS) {
      for (const stroke of pattern) {
        game.beginStroke(stroke[0]);
        for (const p of stroke.slice(1)) game.drawTo(p);
        game.up();
      }
      expect(game.coverage).toBeGreaterThanOrEqual(99);
      expect(game.precision).toBeGreaterThanOrEqual(99);
      game.check();
    }
    expect(game.won).toBeTrue();
    expect(game.completedCookies).toBe(3);
    tick(1900);
    fixture.destroy();
  }));

  it('plays a full rhythm chart with accurate inputs, then cancels pending reward on restart', fakeAsync(() => {
    const fixture = create(CarolConductorChallenge);
    const game = fixture.componentInstance;
    const emitted = spyOn(game.completed, 'emit');
    game.start();
    for (const note of game.notes) {
      game.step(note.at - game.time);
      game.hit(note.lane);
    }
    game.step(game.songEnd - game.time + 0.01);
    expect(game.won).toBeTrue();
    expect(game.hits).toBe(game.notes.length);
    expect(game.bestCombo).toBe(game.notes.length);
    // One note for the start plus the melody note of every hit
    expect(sound.note.calls.count()).toBe(game.notes.length + 1);
    expect(new Set(game.notes.map((n) => n.lane)).size).toBe(5);
    game.restart();
    tick(2000);
    expect(emitted).not.toHaveBeenCalled();
    expect(game.phase).toBe('ready');
    fixture.destroy();
  }));

  it('fails an unattended rhythm game and ignores repeated-key spam', () => {
    const fixture = create(CarolConductorChallenge);
    const game = fixture.componentInstance;
    game.start();
    game.onKey(new KeyboardEvent('keydown', { key: 'd', repeat: true }));
    expect(game.errors).toBe(0);
    game.step(game.songEnd + 0.1);
    expect(game.phase).toBe('lost');
    game.restart();
    expect(game.phase).toBe('ready');
    fixture.destroy();
  });

  it('assembles the jigsaw by rotating and placing each picture piece', fakeAsync(() => {
    const fixture = create(SnowGlobeJigsawChallenge);
    const game = fixture.componentInstance;
    for (let id = 0; id < 9; id++) {
      game.select(id);
      while (game.rotations[id] !== 0) game.rotate();
      game.place(id);
    }
    expect(game.won).toBeTrue();
    expect(game.assembled).toBe(9);
    expect(game.available.length).toBe(0);
    tick(1900);
    fixture.destroy();
  }));

  it('can complete the rooftop course using timed jumps, while an idle runner loses', fakeAsync(() => {
    const fixture = create(RooftopRunnerChallenge);
    const game = fixture.componentInstance;
    game.start();
    for (let i = 0; i < 8000 && game.phase === 'playing'; i++) {
      const roof = game.roofs.find((r) => game.x + 12 >= r.x && game.x < r.x + r.width);
      if (roof && game.grounded) {
        const chimney = roof.chimney - game.x;
        const edge = roof.x + roof.width - (game.x + 24);
        if ((chimney > 0 && chimney < 100) || edge < 45) game.jump();
      }
      game.step(1 / 120);
    }
    expect(game.phase)
      .withContext('gifts=' + game.collected + ' lives=' + game.lives + ' x=' + game.x)
      .toBe('won');
    expect(game.collected).toBeGreaterThanOrEqual(12);
    tick(1900);
    game.restart();
    game.start();
    for (let i = 0; i < 8000 && game.phase === 'playing'; i++) game.step(1 / 120);
    expect(game.phase).toBe('lost');
    fixture.destroy();
  }));

  it('can clear the brick-breaker with paddle control and supports a fresh serve after a dropped ball', fakeAsync(() => {
    const fixture = create(ChimneySweeperChallenge);
    const game = fixture.componentInstance;
    game.start();
    game.ball.y = 461;
    game.ball.vy = 280;
    game.step(1 / 120);
    expect(game.lives).toBe(2);
    expect(game.serving).toBeTrue();
    game.start();
    for (let i = 0; i < 50000 && game.phase === 'playing'; i++) {
      const target = game.bricks
        .filter((b) => b.alive)
        .sort((a, b) => Math.abs(a.x + 48 - game.ball.x) - Math.abs(b.x + 48 - game.ball.x))[0];
      const offset =
        game.ball.vy > 0 && game.ball.y > 310 && target
          ? Math.max(-0.8, Math.min(0.8, Math.atan2(target.x + 48 - game.ball.x, 300) / 1.08))
          : 0;
      game.paddle = Math.max(
        game.paddleWidth / 2,
        Math.min(800 - game.paddleWidth / 2, game.ball.x - (offset * game.paddleWidth) / 2)
      );
      if (game.serving) game.start();
      game.step(1 / 120);
    }
    expect(game.phase)
      .withContext('bricks remaining=' + game.left)
      .toBe('won');
    expect(game.left).toBe(0);
    tick(1900);
    fixture.destroy();
  }));

  it('uses structural physics: both triangulated designs carry the load, an unbraced road fails', () => {
    expect(analyzeBridge(BRIDGE_ROAD, 320).stable).toBeFalse();
    const mirror = BRIDGE_BLUEPRINT.map(
      ([a, b]) => [a < 6 ? 5 - a : 15 - a, b < 6 ? 5 - b : 15 - b] as [number, number]
    );
    for (const beams of [BRIDGE_BLUEPRINT, mirror])
      for (const x of [70, 170, 270, 320, 470, 570]) {
        const result = analyzeBridge(beams, x);
        expect(result.stable).toBeTrue();
        expect(result.deflection).toBeLessThan(30);
        expect(result.strain).toBeLessThan(0.08);
      }
  });

  it('lets a failed bridge be edited, then carries the reindeer across a built truss', fakeAsync(() => {
    const fixture = create(GingerbreadBridgeChallenge);
    const game = fixture.componentInstance;
    game.test();
    game.step(0.8);
    expect(game.phase).toBe('lost');
    game.edit();
    expect(game.beams.length).toBe(5);
    for (const [a, b] of BRIDGE_BLUEPRINT.slice(5)) {
      game.connect(a);
      game.connect(b);
    }
    expect(game.beams.length).toBe(17);
    game.test();
    for (let i = 0; i < 650 && game.phase === 'playing'; i++) game.step(1 / 60);
    expect(game.won).toBeTrue();
    tick(1900);
    fixture.destroy();
  }));

  it('requires the escape-room clue chain and completes it using collected and combined items', fakeAsync(() => {
    const fixture = create(ChristmasEveEscapeChallenge);
    const game = fixture.componentInstance;
    game.code = '2412';
    game.unlock();
    expect(game.won).toBeFalse();
    game.inspect('desk');
    game.inspect('clock');
    for (let i = 0; i < 5; i++) game.turnClock(1);
    expect(game.items).toContain('key');
    game.inspect('cabinet');
    expect(game.cabinetOpen).toBeFalse();
    game.useItem('key');
    game.inspect('cabinet');
    expect(game.items).toContain('candle');
    expect(game.items).not.toContain('key');
    game.inspect('books');
    for (let slot = 0; slot < 3; slot++) while (game.bookOrder[slot] !== slot) game.cycle(slot);
    game.openBooks();
    expect(game.items).toContain('matches');
    game.useItem('candle');
    game.useItem('matches');
    expect(game.items).toEqual(['litCandle']);
    game.inspect('window');
    expect(game.codeVisible).toBeTrue();
    game.inspect('present');
    game.code = '2412';
    game.unlock();
    expect(game.won).toBeTrue();
    tick(1900);
    fixture.destroy();
  }));

  it('cancels completion when a solved component is destroyed before its celebration ends', fakeAsync(() => {
    const fixture = create(CryptogramChallenge);
    const game = fixture.componentInstance;
    const emitted = spyOn(game.completed, 'emit');
    for (const c of new Set(game.words.flat())) {
      game.select(c);
      game.enter(c);
    }
    game.check();
    expect(game.won).toBeTrue();
    fixture.destroy();
    tick(2000);
    expect(emitted).not.toHaveBeenCalled();
  }));
});
