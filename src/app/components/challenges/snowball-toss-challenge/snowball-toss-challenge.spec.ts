import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateModule, TranslateService, TranslationObject } from '@ngx-translate/core';
import { SnowballTossChallenge, SnowballTossConfig } from './snowball-toss-challenge';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';
import { EXTRA_LEVELS } from '../../../config/extras-config';

type Shot = { x: number; y: number };
interface PhysicsAccess {
  drag: Shot;
  ball: { x: number; y: number; vx: number; vy: number } | null;
  ballAcc: number;
  ready: boolean;
  throwBall(): void;
  update(dt: number): void;
  draw(): void;
  collide(x: number, y: number, t: number): number | string | null;
  knockDown(s: SnowballTossChallenge['snowmen'][number], b: { x: number; y: number; vx: number; vy: number }): void;
}
const STEP = 1 / 120;
const calendar = [
  { name: 'day 6', config: { snowmen: 4, snowballs: 6, wind: 0.15, moving: 2, preview: 0.22, gusts: 0.35, speed: 1.8 } },
  { name: 'day 19', config: { snowmen: 5, snowballs: 7, wind: -0.35, moving: 3, preview: 0.18, gusts: 0.55, speed: 2.2 } },
];
const extras = EXTRA_LEVELS.find(section => section.type === 'snowballToss')!.levels
  .filter(level => !level.isInfinite).map(level => ({ name: level.id, config: level.challengeData as SnowballTossConfig }));

/** Find a shot with a small aiming margin, then play it through the real fixed-step engine. */
function findShot(game: SnowballTossChallenge, required?: number): Shot | null {
  for (let a = 0; a <= 54; a++) {
    const angle = -1.4 + a * 0.025;
    for (let p = 0; p <= 35; p++) {
      const power = (0.3 + p * 0.02) * 92;
      const shot = { x: -Math.cos(angle) * power, y: -Math.sin(angle) * power };
      const hit = game.predictThrow(shot.x, shot.y).hit;
      if (hit < 0 || (required !== undefined && hit !== required)) continue;
      if ([[-1, 0], [1, 0], [0, -1], [0, 1]].every(([x, y]) => game.predictThrow(shot.x + x, shot.y + y).hit === hit)) return shot;
    }
  }
  return null;
}
function fire(game: SnowballTossChallenge, shot: Shot): void {
  const physics = game as unknown as PhysicsAccess;
  physics.drag = shot;
  physics.throwBall();
  for (let i = 0; physics.ball && i < 1200; i++) physics.update(STEP);
  expect(physics.ball).toBeNull();
  for (let i = 0; i < 48; i++) physics.update(STEP);
}

describe('Snowball Fight skill and fairness', () => {
  let translations: TranslationObject;
  beforeAll(async () => {
    translations = await (await fetch('/assets/i18n/en.json')).json() as TranslationObject;
  });
  beforeEach(() => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()], providers: [
      { provide: CalendarStateService, useValue: jasmine.createSpyObj('State', { getGameStats: null, saveGameStats: undefined }) },
      { provide: SoundService, useValue: jasmine.createSpyObj('Sound', ['jingle', 'whoosh', 'crunch', 'bell', 'thud', 'fanfare']) },
    ] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', translations);
    translate.use('en');
  });

  function create(config: SnowballTossConfig, width = 1280) {
    const fixture = TestBed.createComponent(SnowballTossChallenge);
    fixture.nativeElement.style.width = `${width}px`;
    fixture.nativeElement.style.height = '700px';
    fixture.componentInstance.config = config;
    fixture.detectChanges();
    fixture.componentInstance.startGame();
    return fixture;
  }

  for (const width of [390, 1280]) {
    for (const profile of [...calendar, ...extras]) {
      it(`can complete ${profile.name} at ${width}px with carefully aimed shots`, fakeAsync(() => {
        const fixture = create(profile.config, width);
        const game = fixture.componentInstance;
        const completed = spyOn(game.completed, 'emit');
        try {
          for (let i = 0; i < game.totalSnowmen; i++) {
            let shot = findShot(game);
            for (let wait = 0; !shot && wait < 12; wait++) {
              // Wait for a slider to leave cover rather than forcing a blocked shot.
              (game as unknown as PhysicsAccess).update(0.25);
              shot = findShot(game);
            }
            expect(shot).withContext(`No reachable target; remaining: ${game.snowmen.filter(s => s.alive).map(s => s.id)}`).not.toBeNull();
            if (!shot) break;
            const before = game.snowmenLeft;
            fire(game, shot);
            expect(game.snowmenLeft).toBe(before - 1);
          }
          expect(game.phase).toBe('won');
          expect(game.streak).toBe(game.totalSnowmen);
          tick(1900);
          expect(completed).toHaveBeenCalledTimes(1);
          (game as unknown as PhysicsAccess).draw();
          fixture.detectChanges();
          expect(fixture.nativeElement.scrollWidth).toBeLessThanOrEqual(fixture.nativeElement.clientWidth);
        } finally { fixture.destroy(); }
      }));
    }
  }

  it('keeps endless waves winnable, limits spare throws, and never completes the calendar day', fakeAsync(() => {
    const fixture = create({ endless: true }, 390);
    const game = fixture.componentInstance;
    const physics = game as unknown as PhysicsAccess;
    const completed = spyOn(game.completed, 'emit');
    try {
      for (let wave = 1; wave <= 3; wave++) {
        const targets = game.totalSnowmen;
        expect(game.snowmen.some(s => s.ledge >= 0)).toBeTrue();
        for (let target = 0; target < targets; target++) {
          let shot = findShot(game);
          for (let wait = 0; !shot && wait < 12; wait++) {
            physics.update(0.25);
            shot = findShot(game);
          }
          expect(shot).not.toBeNull();
          if (shot) fire(game, shot);
        }
        expect(game.snowmenLeft).toBe(0);
        physics.update(0.7);
        tick(1100);
        expect(game.phase).toBe('playing');
        expect(game.wave).toBe(wave + 1);
        expect(game.ballsLeft).toBeLessThanOrEqual(game.totalSnowmen + 2);
      }
      expect(completed).not.toHaveBeenCalled();
    } finally { fixture.destroy(); }
  }));

  it('shows only the early arc and never changes the guide based on target collisions', () => {
    const fixture = create({ ...calendar[0].config, preview: 1 }); // Legacy full-flight config.
    const game = fixture.componentInstance;
    const shot = findShot(game)!;
    expect(shot).not.toBeNull();
    const full = game.predictThrow(shot.x, shot.y);
    const guide = game.aimPreview(shot.x, shot.y);
    expect(guide.length).toBeLessThanOrEqual(10);
    expect(guide.length).toBeLessThan(full.path.length);
    game.snowmen.forEach(s => s.alive = false);
    expect(game.aimPreview(shot.x, shot.y)).toEqual(guide);
    fixture.destroy();
  });

  it('has readable, deterministic gusts and real misses that can exhaust ammunition, then retry', fakeAsync(() => {
    const fixture = create({ snowmen: 1, snowballs: 1, moving: false });
    const game = fixture.componentInstance;
    expect(game.windAt(0)).not.toBe(game.windAt(1));
    expect(game.windAt(1)).toBe(game.windAt(1));
    game.streak = 2;
    fire(game, { x: -14, y: 0 });
    expect(game.streak).toBe(0);
    expect(game.snowmenLeft).toBe(1);
    tick(700);
    expect(game.phase).toBe('lost');
    game.retry();
    expect(game.phase).toBe('playing');
    expect(game.ballsLeft).toBe(1);
    expect(game.time).toBe(0);
    expect(game.streak).toBe(0);
    fixture.destroy();
  }));

  it('requires timing for sliders and gives most arbitrary throws no hit', () => {
    const fixture = create(calendar[0].config);
    const game = fixture.componentInstance;
    const mover = game.snowmen.find(s => s.ledge >= 0)!;
    const shot = findShot(game, mover.id)!;
    expect(shot).not.toBeNull();
    const outcomes = Array.from({ length: 16 }, (_, i) => game.predictThrow(shot.x, shot.y, i * 0.35).hit);
    expect(outcomes).toContain(mover.id);
    expect(outcomes.some(hit => hit !== mover.id)).toBeTrue();
    let misses = 0;
    let total = 0;
    for (let a = 0; a < 20; a++) for (let p = 0; p < 10; p++) {
      const angle = -1.4 + a * 0.07;
      const power = (0.3 + p * 0.075) * 92;
      if (game.predictThrow(-Math.cos(angle) * power, -Math.sin(angle) * power).hit < 0) misses++;
      total++;
    }
    expect(misses / total).toBeGreaterThan(0.5);
    fixture.destroy();
  });

  it('scores precise headshots above body hits and gives consecutive-hit bonuses', () => {
    const fixture = create({ snowmen: 3, moving: false, gusts: 0, wind: 0 });
    const game = fixture.componentInstance;
    const physics = game as unknown as PhysicsAccess;
    const first = game.snowmen[0];
    const second = game.snowmen[1];
    physics.knockDown(first, { x: first.x, y: -first.base - 62 * 0.82, vx: 300, vy: 0 });
    expect(game.score).toBe(175);
    physics.knockDown(second, { x: second.x, y: -second.base - 17 * 0.82, vx: 300, vy: 0 });
    expect(game.score).toBe(300); // 100 body + 25 streak.
    expect(physics.collide(game.snowmen[2].x, -game.snowmen[2].base - 85 * 0.82, game.time)).not.toBe(2);
    fixture.destroy();
  });
});
