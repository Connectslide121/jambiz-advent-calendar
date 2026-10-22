import { Component, HostListener, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
export interface InkPoint {
  x: number;
  y: number;
}
export const COOKIE_PATTERNS: InkPoint[][][] = [
  [
    Array.from({ length: 11 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 43 : 100;
      return { x: 150 + Math.cos(a) * r, y: 150 + Math.sin(a) * r };
    }),
  ],
  Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return [
      { x: 150, y: 150 },
      { x: 150 + Math.cos(a) * 100, y: 150 + Math.sin(a) * 100 },
    ];
  }),
  [
    [
      { x: 150, y: 45 },
      { x: 75, y: 125 },
      { x: 110, y: 125 },
      { x: 55, y: 200 },
      { x: 130, y: 200 },
      { x: 130, y: 250 },
      { x: 170, y: 250 },
      { x: 170, y: 200 },
      { x: 245, y: 200 },
      { x: 190, y: 125 },
      { x: 225, y: 125 },
      { x: 150, y: 45 },
    ],
  ],
];
export function samplePattern(paths: InkPoint[][]): InkPoint[] {
  const samples: InkPoint[] = [];
  for (const path of paths)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i],
        n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
      for (let j = 0; j <= n; j++)
        samples.push({ x: a.x + ((b.x - a.x) * j) / n, y: a.y + ((b.y - a.y) * j) / n });
    }
  return samples;
}
/** Cookie outline for each round: a star, a round snowflake cookie and a tree */
const starPoints = (r1: number, r2: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? r2 : r1;
    return (i ? 'L' : 'M') + (150 + Math.cos(a) * r).toFixed(1) + ',' + (150 + Math.sin(a) * r).toFixed(1);
  }).join(' ') + ' Z';
export const COOKIE_SHAPES = [
  starPoints(138, 72),
  'M150,20 A130,130 0 1 1 149.9,20 Z',
  'M150,14 L58,128 L88,128 L32,214 L112,214 L112,276 L188,276 L188,214 L268,214 L212,128 L242,128 Z',
];
/** Pass marks for each cookie */
export const COOKIE_COVERAGE = 86;
export const COOKIE_PRECISION = 78;
@Component({
  selector: 'app-cookie-decorator-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './cookie-decorator-challenge.html',
  styleUrls: ['../shared/game-board.scss', './cookie-decorator-challenge.scss'],
})
export class CookieDecoratorChallenge extends SeasonalGame implements OnInit {
  round = 0;
  strokes: InkPoint[][] = [];
  covered = new Set<number>();
  samples: InkPoint[] = [];
  ink = 0;
  goodInk = 0;
  pen = { x: 150, y: 150 };
  drawing = false;
  completedCookies = 0;
  results: number[] = [];
  private lastSound = 0;
  readonly coverageGoal = COOKIE_COVERAGE;
  readonly precisionGoal = COOKIE_PRECISION;
  readonly tray = [0, 1, 2];
  /** Deterministic sprinkles for finished cookies */
  readonly sprinkles = Array.from({ length: 14 }, (_, i) => ({
    x: 90 + ((i * 53) % 120),
    y: 90 + ((i * 89) % 120),
    a: (i * 47) % 180,
    c: ['#e0475b', '#3aae8a', '#7fb8ff', '#f7c873'][i % 4],
  }));
  /** Speckles baked into the dough */
  readonly speckles = Array.from({ length: 40 }, (_, i) => ({
    x: 40 + ((i * 71 + i * i * 13) % 220),
    y: 40 + ((i * 97 + i * i * 7) % 220),
  }));
  get shape(): string {
    return COOKIE_SHAPES[this.round];
  }
  shapeOf(round: number): string {
    return COOKIE_SHAPES[round];
  }
  get reference(): InkPoint[][] {
    return COOKIE_PATTERNS[this.round];
  }
  get coverage(): number {
    return this.samples.length ? Math.round((this.covered.size / this.samples.length) * 100) : 0;
  }
  get precision(): number {
    return this.ink ? Math.round((this.goodInk / this.ink) * 100) : 100;
  }
  path(points: InkPoint[]): string {
    return points.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  }
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase();
    this.round = 0;
    this.completedCookies = 0;
    this.results = [];
    this.clearInk();
  }
  clearInk(): void {
    if (this.won) return;
    this.strokes = [];
    this.covered.clear();
    this.ink = 0;
    this.goodInk = 0;
    this.drawing = false;
    this.samples = samplePattern(this.reference);
    this.status = '';
  }
  private point(e: PointerEvent): InkPoint {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(300, ((e.clientX - r.left) / r.width) * 300)),
      y: Math.max(0, Math.min(300, ((e.clientY - r.top) / r.height) * 300)),
    };
  }
  down(e: PointerEvent): void {
    if (this.won) return;
    e.preventDefault();
    this.focusBoard();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* Synthetic pointer. */
    }
    this.beginStroke(this.point(e));
  }
  move(e: PointerEvent): void {
    if (this.drawing && !this.won) this.drawTo(this.point(e));
  }
  up(): void {
    this.drawing = false;
  }
  beginStroke(p: InkPoint): void {
    if (this.won) return;
    this.drawing = true;
    this.pen = { ...p };
    this.strokes.push([{ ...p }]);
    this.mark(p);
  }
  drawTo(p: InkPoint): void {
    if (!this.drawing || this.won) return;
    const previous = this.pen;
    const n = Math.max(1, Math.ceil(Math.hypot(p.x - previous.x, p.y - previous.y) / 3));
    for (let i = 1; i <= n; i++)
      this.mark({
        x: previous.x + ((p.x - previous.x) * i) / n,
        y: previous.y + ((p.y - previous.y) * i) / n,
      });
    this.pen = { ...p };
    this.strokes[this.strokes.length - 1].push({ ...p });
    if (performance.now() - this.lastSound > 130) {
      this.lastSound = performance.now();
      this.sound.tap();
    }
  }
  private mark(p: InkPoint): void {
    this.ink++;
    let good = false;
    this.samples.forEach((s, i) => {
      if (Math.hypot(s.x - p.x, s.y - p.y) <= 10) {
        this.covered.add(i);
        good = true;
      }
    });
    if (good) this.goodInk++;
  }
  check(): void {
    if (this.won) return;
    this.drawing = false;
    if (this.coverage < COOKIE_COVERAGE || this.precision < COOKIE_PRECISION) {
      this.message('challenges.cookieDecorator.notYet');
      this.sound.thud();
      return;
    }
    this.results.push(Math.round((this.coverage + this.precision) * 5));
    this.completedCookies++;
    this.sound.jingle();
    if (this.completedCookies === 3) {
      this.finish(
        this.results.reduce((a, b) => a + b, 0),
        { precision: this.precision, coverage: this.coverage }
      );
      return;
    }
    this.round++;
    this.clearInk();
    this.message('challenges.cookieDecorator.next');
  }
  @HostListener('document:keydown', ['$event']) onKey(e: KeyboardEvent): void {
    if (!this.gameKey(e) || this.won || (e.target as HTMLElement)?.closest('button')) return;
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const d: Record<string, InkPoint> = {
        ArrowLeft: { x: -5, y: 0 },
        ArrowRight: { x: 5, y: 0 },
        ArrowUp: { x: 0, y: -5 },
        ArrowDown: { x: 0, y: 5 },
      };
      const p = {
        x: Math.max(0, Math.min(300, this.pen.x + d[e.key].x)),
        y: Math.max(0, Math.min(300, this.pen.y + d[e.key].y)),
      };
      if (this.drawing) this.drawTo(p);
      else this.pen = p;
    } else if (e.key === ' ') {
      e.preventDefault();
      if (this.drawing) this.up();
      else this.beginStroke(this.pen);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.check();
    }
  }
}
