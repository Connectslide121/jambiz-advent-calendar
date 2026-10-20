import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Lightbulb, RotateCcw, Undo2 } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface IceSlideConfig {
  /** Grid rows: '#' rock, '.' ice, '*' snow patch (stops you on it), 'S' start, 'G' gift */
  level?: string[];
  /** Target number of moves. Defaults to the optimal solution length */
  par?: number;
}

export type IceDir = 'up' | 'down' | 'left' | 'right';
type Pos = { r: number; c: number };

const DIRS: Record<IceDir, Pos> = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};
const DIR_ORDER: IceDir[] = ['up', 'right', 'down', 'left'];

const DEFAULT_LEVEL = ['..#...', '*.....', '##....', '.G.#S.', '.#....', '....#.'];

/** Cell size in SVG units and the snowy shore around the lake */
const CELL = 100;
const PAD = 26;

/** Where a slide from `from` in `dir` comes to rest */
export function iceSlide(grid: string[], from: Pos, dir: IceDir): Pos {
  const d = DIRS[dir];
  let { r, c } = from;
  for (;;) {
    const nr = r + d.r;
    const nc = c + d.c;
    if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) break;
    const ch = grid[nr][nc];
    if (ch === '#') break;
    r = nr;
    c = nc;
    // Snow patches and the present catch the penguin
    if (ch === '*' || ch === 'G') break;
  }
  return { r, c };
}

/** Breadth-first search over resting positions. Returns the optimal move list or null */
export function solveIce(grid: string[], from: Pos): IceDir[] | null {
  const key = (p: Pos) => p.r * 1000 + p.c;
  const prev = new Map<number, { from: number; dir: IceDir } | null>([[key(from), null]]);
  const queue: Pos[] = [from];
  while (queue.length) {
    const p = queue.shift()!;
    if (grid[p.r][p.c] === 'G') {
      const path: IceDir[] = [];
      let k = key(p);
      let step = prev.get(k);
      while (step) {
        path.unshift(step.dir);
        k = step.from;
        step = prev.get(k);
      }
      return path;
    }
    for (const dir of DIR_ORDER) {
      const n = iceSlide(grid, p, dir);
      const k = key(n);
      if (!prev.has(k)) {
        prev.set(k, { from: key(p), dir });
        queue.push(n);
      }
    }
  }
  return null;
}

interface Tile {
  r: number;
  c: number;
  x: number;
  y: number;
  ch: string;
  shade: number;
  crack: string;
  variant: number;
}

interface Particle {
  el: SVGElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

/**
 * "Frozen Lake" - an ice-sliding puzzle. The penguin slides until it hits a rock, the shore or
 * a snow patch. Reach the present in as few moves as possible. A BFS solver computes par,
 * powers the hint and detects when the present can no longer be reached.
 */
@Component({
  selector: 'app-ice-slide-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './ice-slide-challenge.html',
  styleUrl: './ice-slide-challenge.scss',
})
export class IceSlideChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: IceSlideConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  @ViewChild('penguin') penguinRef?: ElementRef<SVGGElement>;
  @ViewChild('flip') flipRef?: ElementRef<SVGGElement>;
  @ViewChild('body') bodyRef?: ElementRef<SVGGElement>;
  @ViewChild('fx') fxRef?: ElementRef<SVGGElement>;

  readonly Check = Check;
  readonly Lightbulb = Lightbulb;
  readonly RotateCcw = RotateCcw;
  readonly Undo2 = Undo2;
  readonly CELL = CELL;
  readonly PAD = PAD;
  readonly dirs = DIR_ORDER;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);
  private zone = inject(NgZone);

  grid: string[] = DEFAULT_LEVEL;
  rows = 6;
  cols = 6;
  tiles: Tile[] = [];
  rocks: Tile[] = [];
  snows: Tile[] = [];
  start: Pos = { r: 0, c: 0 };
  goal: Pos = { r: 0, c: 0 };
  pos: Pos = { r: 0, c: 0 };
  par = 0;
  moves = 0;
  bestMoves: number | null = null;
  history: Pos[] = [];
  won = false;
  stuck = false;
  hintDir: IceDir | null = null;
  hintTarget: Pos | null = null;
  pressedDir: IceDir | null = null;
  stars = 0;

  private animating = false;
  private queued: IceDir | null = null;
  private facing = 1;
  private raf = 0;
  private fxRaf = 0;
  private particles: Particle[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private swipe: { x: number; y: number; id: number } | null = null;
  private reducedMotion = false;

  get viewBox(): string {
    return `${-PAD} ${-PAD} ${this.cols * CELL + PAD * 2} ${this.rows * CELL + PAD * 2}`;
  }

  get aspect(): string {
    return `${this.cols * CELL + PAD * 2} / ${this.rows * CELL + PAD * 2}`;
  }

  get aspectRatio(): number {
    return (this.cols * CELL + PAD * 2) / (this.rows * CELL + PAD * 2);
  }

  get lakeW(): number {
    return this.cols * CELL;
  }

  get lakeH(): number {
    return this.rows * CELL;
  }

  ngOnInit(): void {
    this.reducedMotion =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.loadLevel();
    const key = this.day ?? this.levelId;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestMoves = stats?.bestMoves ?? null;
  }

  ngAfterViewInit(): void {
    this.placePenguin(this.pos.c * CELL, this.pos.r * CELL);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    cancelAnimationFrame(this.fxRaf);
    this.timers.forEach(clearTimeout);
  }

  private loadLevel(): void {
    const raw = this.config?.level?.length ? this.config.level : DEFAULT_LEVEL;
    const width = Math.max(...raw.map((r) => r.length));
    let grid = raw.map((r) => r.padEnd(width, '#'));
    if (!grid.some((r) => r.includes('S')) || !grid.some((r) => r.includes('G'))) grid = DEFAULT_LEVEL;
    this.grid = grid;
    this.rows = grid.length;
    this.cols = grid[0].length;

    this.tiles = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    grid.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (ch === 'S') this.start = { r, c };
        if (ch === 'G') this.goal = { r, c };
        this.tiles.push({
          r,
          c,
          x: c * CELL,
          y: r * CELL,
          ch,
          shade: (r + c) % 2 ? 0.05 : 0,
          crack: this.crackPath(rand),
          variant: Math.floor(rand() * 3),
        });
      })
    );
    this.rocks = this.tiles.filter((t) => t.ch === '#');
    this.snows = this.tiles.filter((t) => t.ch === '*');
    // The start square is plain ice once the penguin leaves it
    this.grid = grid.map((row) => row.replace('S', '.'));
    const solution = solveIce(this.grid, this.start);
    this.par = this.config?.par ?? solution?.length ?? 0;
    this.pos = { ...this.start };
  }

  /** A few thin hairline cracks per ice tile, deterministic per level */
  private crackPath(rand: () => number): string {
    if (rand() < 0.35) return '';
    let x = 15 + rand() * 70;
    let y = 15 + rand() * 70;
    let d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
    const angle = rand() * Math.PI * 2;
    for (let i = 0; i < 3; i++) {
      const a = angle + (rand() - 0.5) * 1.2;
      x = Math.max(4, Math.min(96, x + Math.cos(a) * (10 + rand() * 14)));
      y = Math.max(4, Math.min(96, y + Math.sin(a) * (10 + rand() * 14)));
      d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    if (rand() < 0.6) {
      const a = angle + Math.PI / 2;
      d += ` M${x.toFixed(0)} ${y.toFixed(0)} l${(Math.cos(a) * 12).toFixed(0)} ${(Math.sin(a) * 12).toFixed(0)}`;
    }
    return d;
  }

  // ---------------------------------------------------------------- input

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const map: Record<string, IceDir> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right',
      W: 'up',
      S: 'down',
      A: 'left',
      D: 'right',
    };
    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      this.flashButton(dir);
      this.move(dir);
    } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
      this.undo();
    } else if (e.key === 'r' || e.key === 'R') {
      this.reset();
    }
  }

  onPointerDown(e: PointerEvent): void {
    this.swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }

  onPointerUp(e: PointerEvent, board: Element): void {
    if (!this.swipe || this.swipe.id !== e.pointerId) return;
    const dx = e.clientX - this.swipe.x;
    const dy = e.clientY - this.swipe.y;
    this.swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) {
      this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      return;
    }
    // A tap: slide towards the tapped spot along its dominant axis
    const rect = board.getBoundingClientRect();
    const scale = rect.width / (this.cols * CELL + PAD * 2);
    const px = rect.left + (PAD + this.pos.c * CELL + CELL / 2) * scale;
    const py = rect.top + (PAD + this.pos.r * CELL + CELL / 2) * scale;
    const tx = e.clientX - px;
    const ty = e.clientY - py;
    if (Math.max(Math.abs(tx), Math.abs(ty)) < (CELL / 2) * scale) return;
    this.move(Math.abs(tx) > Math.abs(ty) ? (tx > 0 ? 'right' : 'left') : ty > 0 ? 'down' : 'up');
  }

  private flashButton(dir: IceDir): void {
    this.pressedDir = dir;
    this.later(() => {
      if (this.pressedDir === dir) this.pressedDir = null;
    }, 140);
  }

  // ---------------------------------------------------------------- game

  move(dir: IceDir): void {
    if (this.won) return;
    if (this.animating) {
      this.queued = dir;
      return;
    }
    const dest = iceSlide(this.grid, this.pos, dir);
    this.hintDir = null;
    this.hintTarget = null;
    if (dir === 'left' || dir === 'right') this.setFacing(dir === 'right' ? 1 : -1);

    if (dest.r === this.pos.r && dest.c === this.pos.c) {
      this.bump(dir);
      return;
    }
    this.history.push({ ...this.pos });
    this.moves++;
    this.sound.whoosh();
    this.animateSlide(this.pos, dest, dir);
    this.pos = dest;
  }

  undo(): void {
    if (this.animating || this.won || !this.history.length) return;
    this.pos = this.history.pop()!;
    this.moves = Math.max(0, this.moves - 1);
    this.stuck = false;
    this.hintDir = null;
    this.hintTarget = null;
    this.placePenguin(this.pos.c * CELL, this.pos.r * CELL);
    this.wobble();
    this.sound.bell(660, 0.06);
  }

  reset(): void {
    if (this.animating) return;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.pos = { ...this.start };
    this.history = [];
    this.moves = 0;
    this.won = false;
    this.stuck = false;
    this.stars = 0;
    this.hintDir = null;
    this.hintTarget = null;
    this.setFacing(1);
    this.placePenguin(this.pos.c * CELL, this.pos.r * CELL);
    this.wobble();
  }

  showHint(): void {
    if (this.won || this.animating) return;
    const path = solveIce(this.grid, this.pos);
    if (!path || !path.length) {
      this.stuck = true;
      return;
    }
    this.hintDir = path[0];
    this.hintTarget = iceSlide(this.grid, this.pos, path[0]);
    this.sound.bell(1318.5, 0.08);
  }

  showReward(): void {
    this.completed.emit();
  }

  private afterMove(): void {
    if (this.grid[this.pos.r][this.pos.c] === 'G') {
      this.onWin();
      return;
    }
    this.stuck = solveIce(this.grid, this.pos) === null;
    if (this.queued) {
      const q = this.queued;
      this.queued = null;
      this.move(q);
    }
  }

  private onWin(): void {
    this.won = true;
    this.queued = null;
    this.stars = this.moves <= this.par ? 3 : this.moves <= this.par + 2 ? 2 : 1;
    this.sound.fanfare();
    const key = this.day ?? this.levelId;
    if (key) {
      const best = this.bestMoves === null ? this.moves : Math.min(this.bestMoves, this.moves);
      this.bestMoves = best;
      this.stateService.saveGameStats(key, { bestMoves: best, par: this.par });
    }
    this.burst();
    this.later(() => this.completed.emit(), 2000);
  }

  // ---------------------------------------------------------------- animation

  private animateSlide(from: Pos, to: Pos, dir: IceDir): void {
    this.animating = true;
    const dist = Math.abs(to.r - from.r) + Math.abs(to.c - from.c);
    const duration = this.reducedMotion ? 60 : 110 + dist * 70;
    const x0 = from.c * CELL;
    const y0 = from.r * CELL;
    const x1 = to.c * CELL;
    const y1 = to.r * CELL;
    const body = this.bodyRef?.nativeElement;
    body?.classList.remove('wobble');
    body?.classList.add(dir === 'up' || dir === 'down' ? 'slide-v' : 'slide-h');
    this.sound.bell(1568 + Math.random() * 300, 0.035);

    const t0 = performance.now();
    let lastSpawn = 0;
    this.zone.runOutsideAngular(() => {
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        // Quick push-off, long glide, soft stop
        const ease = 1 - Math.pow(1 - t, 2.2);
        const x = x0 + (x1 - x0) * ease;
        const y = y0 + (y1 - y0) * ease;
        this.placePenguin(x, y);
        if (!this.reducedMotion && now - lastSpawn > 16 && t < 0.97) {
          lastSpawn = now;
          this.spawnSparkle(x + CELL / 2, y + CELL * 0.82, dir);
        }
        this.tickParticles();
        if (t < 1) {
          this.raf = requestAnimationFrame(step);
        } else {
          body?.classList.remove('slide-v', 'slide-h');
          this.runParticles();
          this.zone.run(() => {
            this.animating = false;
            const stopCh = this.grid[to.r][to.c];
            if (stopCh === '*') this.sound.bell(880, 0.05);
            else if (stopCh !== 'G') this.sound.thud();
            this.wobble();
            this.afterMove();
          });
        }
      };
      this.raf = requestAnimationFrame(step);
    });
  }

  /** Tried to move into a wall: lean in and spring back */
  private bump(dir: IceDir): void {
    const d = DIRS[dir];
    const x = this.pos.c * CELL;
    const y = this.pos.r * CELL;
    this.placePenguin(x + d.c * 10, y + d.r * 10);
    this.sound.thud();
    this.later(() => {
      this.placePenguin(x, y);
      this.wobble();
    }, 90);
  }

  private placePenguin(x: number, y: number): void {
    this.penguinRef?.nativeElement.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }

  private setFacing(f: number): void {
    this.facing = f;
    this.flipRef?.nativeElement.setAttribute('transform', f < 0 ? 'translate(100 0) scale(-1 1)' : '');
  }

  private wobble(): void {
    const body = this.bodyRef?.nativeElement;
    if (!body || this.reducedMotion) return;
    body.classList.remove('wobble');
    // Force a reflow so the animation restarts
    void body.getBoundingClientRect();
    body.classList.add('wobble');
  }

  private spawnSparkle(x: number, y: number, dir: IceDir): void {
    const fx = this.fxRef?.nativeElement;
    if (!fx) return;
    const d = DIRS[dir];
    for (let i = 0; i < 2; i++) {
      const star = Math.random() < 0.35;
      const el = document.createElementNS('http://www.w3.org/2000/svg', star ? 'path' : 'circle');
      if (star) {
        el.setAttribute('d', 'M0 -1 L0.25 -0.25 L1 0 L0.25 0.25 L0 1 L-0.25 0.25 L-1 0 L-0.25 -0.25 Z');
        el.setAttribute('fill', '#ffffff');
      } else {
        el.setAttribute('r', '1');
        el.setAttribute('fill', Math.random() < 0.5 ? '#e6f7ff' : '#9fe3ff');
      }
      fx.appendChild(el);
      this.particles.push({
        el,
        x: x + (Math.random() - 0.5) * 34,
        y: y + (Math.random() - 0.5) * 16 - (d.r ? 30 : 0),
        vx: -d.c * (0.4 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.6,
        vy: -d.r * (0.4 + Math.random() * 0.8) - Math.random() * 0.6,
        life: 0,
        max: 28 + Math.random() * 22,
        size: star ? 7 + Math.random() * 6 : 2.5 + Math.random() * 3,
      });
    }
  }

  private burst(): void {
    const fx = this.fxRef?.nativeElement;
    if (!fx || this.reducedMotion) return;
    const cx = this.goal.c * CELL + CELL / 2;
    const cy = this.goal.r * CELL + CELL / 2;
    const colors = ['#f7c873', '#ff5a6e', '#5cf2b3', '#ffffff', '#9fe3ff'];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + Math.random() * 0.3;
      const sp = 3 + Math.random() * 5;
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', 'M0 -1 L0.3 -0.3 L1 0 L0.3 0.3 L0 1 L-0.3 0.3 L-1 0 L-0.3 -0.3 Z');
      el.setAttribute('fill', colors[i % colors.length]);
      fx.appendChild(el);
      this.particles.push({
        el,
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.5,
        life: 0,
        max: 55 + Math.random() * 30,
        size: 6 + Math.random() * 8,
      });
    }
    this.zone.runOutsideAngular(() => this.runParticles());
  }

  /** Keep particles fading after the penguin has stopped */
  private runParticles(): void {
    cancelAnimationFrame(this.fxRaf);
    const loop = () => {
      // While sliding, the slide loop ticks the particles itself
      if (this.animating) return;
      this.tickParticles();
      if (this.particles.length) this.fxRaf = requestAnimationFrame(loop);
    };
    this.fxRaf = requestAnimationFrame(loop);
  }

  private tickParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy = p.vy * 0.95 + 0.04;
      const k = 1 - p.life / p.max;
      if (k <= 0) {
        p.el.remove();
        this.particles.splice(i, 1);
        continue;
      }
      const s = p.size * (0.4 + 0.6 * k);
      p.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${s.toFixed(2)})`);
      p.el.setAttribute('opacity', (k * 0.95).toFixed(2));
    }
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  // ---------------------------------------------------------------- template helpers

  rockPath(v: number): string {
    return [
      'M14 80 C6 62 16 36 36 28 C52 18 74 22 86 40 C96 56 92 78 82 84 C62 94 30 94 14 80 Z',
      'M10 82 C10 64 22 44 40 38 C48 24 70 22 80 36 C94 46 94 74 86 84 C64 92 28 94 10 82 Z',
      'M16 84 C8 70 14 46 30 40 C36 26 56 18 70 28 C88 34 94 62 88 80 C70 92 34 94 16 84 Z',
    ][v];
  }

  capPath(v: number): string {
    return [
      'M26 38 C36 22 62 16 80 34 C74 40 68 36 62 42 C56 36 48 44 40 40 C36 46 28 44 26 38 Z',
      'M34 44 C40 30 52 24 66 26 C76 28 82 34 82 40 C76 44 70 40 64 46 C56 40 48 48 42 44 C38 48 34 48 34 44 Z',
      'M24 44 C30 30 46 20 62 22 C76 24 84 34 84 40 C78 44 72 40 66 46 C60 40 50 46 44 42 C36 48 28 48 24 44 Z',
    ][v];
  }

  isHint(dir: IceDir): boolean {
    return this.hintDir === dir;
  }

  arrow(dir: IceDir): string {
    return { up: '▲', down: '▼', left: '◀', right: '▶' }[dir];
  }

  get starList(): boolean[] {
    return [1, 2, 3].map((i) => i <= this.stars);
  }
}
