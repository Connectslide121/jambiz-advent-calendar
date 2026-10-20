import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, Check, RotateCcw } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface GiftMatchConfig {
  cols?: number; // Board width (5–9). Default 7
  rows?: number; // Board height (5–10). Default 8
  kinds?: number; // Different pieces in play (4–6). Default 5
  targetScore?: number; // Points needed to win. Default 2000
  moves?: number; // Swaps available. Default 20
  endless?: boolean; // Festive time attack: no target or move limit, play until the clock runs out
  duration?: number; // Endless mode: starting seconds on the clock. Default 90
}

// #region engine
/** 0 = plain, 1 = striped (clears its row), 2 = striped (clears its column), 3 = star (clears one kind) */
export type Special = 0 | 1 | 2 | 3;

export interface Piece {
  id: number;
  /** -1 for the star, which has no colour of its own */
  kind: number;
  special: Special;
}

export interface Placed {
  p: Piece;
  c: number;
  r: number;
}

export interface Beam {
  type: 'row' | 'col' | 'kind' | 'all';
  c: number;
  r: number;
  targets?: { c: number; r: number }[];
}

export interface Step {
  combo: number;
  removed: Placed[];
  created: Placed[];
  beams: Beam[];
  points: number;
  pops: { c: number; r: number; points: number; kind: number }[];
  /** Every piece that moved during gravity; new pieces start above the board (negative row) */
  fallen: { p: Piece; c: number; fromR: number; r: number }[];
}

export interface Turn {
  steps: Step[];
  total: number;
  /** Positions after an automatic reshuffle (when no moves were left), or null */
  shuffled: Placed[] | null;
}

export const POINTS_PER_PIECE = 10;
export const STRIPE_BONUS = 30;
export const STAR_BONUS = 60;

/**
 * Pure match-3 rules, with no Angular or drawing code, so the exact same logic can be
 * simulated headless (see NOTES.md). Every turn returns a list of steps for the view to animate.
 */
export class GiftMatchEngine {
  grid: (Piece | null)[];
  private nextId = 1;

  constructor(
    public cols: number,
    public rows: number,
    public kinds: number,
    public rand: () => number = Math.random
  ) {
    this.grid = new Array(cols * rows).fill(null);
  }

  at(c: number, r: number): Piece | null {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return this.grid[r * this.cols + c];
  }

  clone(rand: () => number = Math.random): GiftMatchEngine {
    const e = new GiftMatchEngine(this.cols, this.rows, this.kinds, rand);
    e.grid = this.grid.map((p) => (p ? { ...p } : null));
    e.nextId = this.nextId;
    return e;
  }

  /** Fresh board with no ready-made matches and at least one move */
  fill(): void {
    for (let tries = 0; tries < 200; tries++) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          let kind: number;
          do {
            kind = Math.floor(this.rand() * this.kinds);
          } while (
            (c >= 2 && this.at(c - 1, r)?.kind === kind && this.at(c - 2, r)?.kind === kind) ||
            (r >= 2 && this.at(c, r - 1)?.kind === kind && this.at(c, r - 2)?.kind === kind)
          );
          this.grid[r * this.cols + c] = this.newPiece(kind);
        }
      }
      if (this.findMoves().length >= 3) return;
    }
  }

  /** All swaps (as index pairs) that do something */
  findMoves(): [number, number][] {
    const moves: [number, number][] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        if (c < this.cols - 1 && this.isValidSwap(i, i + 1)) moves.push([i, i + 1]);
        if (r < this.rows - 1 && this.isValidSwap(i, i + this.cols)) moves.push([i, i + this.cols]);
      }
    }
    return moves;
  }

  isAdjacent(a: number, b: number): boolean {
    const ac = a % this.cols;
    const bc = b % this.cols;
    const ar = Math.floor(a / this.cols);
    const br = Math.floor(b / this.cols);
    return Math.abs(ac - bc) + Math.abs(ar - br) === 1;
  }

  isValidSwap(a: number, b: number): boolean {
    const pa = this.grid[a];
    const pb = this.grid[b];
    if (!pa || !pb || !this.isAdjacent(a, b)) return false;
    if (pa.special === 3 || pb.special === 3) return true;
    if (pa.special && pb.special) return true;
    if (pa.kind === pb.kind) return false;
    this.grid[a] = pb;
    this.grid[b] = pa;
    const ok = this.matchesAt(a) || this.matchesAt(b);
    this.grid[a] = pa;
    this.grid[b] = pb;
    return ok;
  }

  /** Perform a swap. Returns null (and leaves the board untouched) when it does nothing. */
  swap(a: number, b: number): Turn | null {
    if (!this.isValidSwap(a, b)) return null;
    const pa = this.grid[a]!;
    const pb = this.grid[b]!;
    this.grid[a] = pb;
    this.grid[b] = pa;

    const steps: Step[] = [];
    let combo = 1;

    if (pa.special === 3 || pb.special === 3) {
      // Star swap: clear every piece of the other kind (or the whole board for two stars)
      const star = pa.special === 3 ? pa : pb;
      const other = star === pa ? pb : pa;
      const starIdx = this.grid.indexOf(star);
      const start = new Set<number>([starIdx]);
      const beams: Beam[] = [];
      const sc = starIdx % this.cols;
      const sr = Math.floor(starIdx / this.cols);
      if (other.special === 3) {
        this.grid.forEach((_, i) => start.add(i));
        beams.push({ type: 'all', c: sc, r: sr });
      } else {
        const targets: { c: number; r: number }[] = [];
        this.grid.forEach((p, i) => {
          if (p && p.kind === other.kind) {
            start.add(i);
            targets.push({ c: i % this.cols, r: Math.floor(i / this.cols) });
            // A striped piece swapped with a star turns that whole kind striped
            if (other.special === 1 || other.special === 2) {
              p.special = this.rand() < 0.5 ? 1 : 2;
            }
          }
        });
        beams.push({ type: 'kind', c: sc, r: sr, targets });
      }
      steps.push(this.resolveStep(start, beams, [], combo));
      combo++;
    } else if (pa.special && pb.special) {
      // Two striped pieces make a cross
      pa.special = 1;
      pb.special = 2;
      steps.push(this.resolveStep(new Set([a, b]), [], [], combo));
      combo++;
    }

    // Matches and cascades
    let swapped: number[] = [a, b];
    for (let guard = 0; guard < 60; guard++) {
      const groups = this.findGroups();
      if (!groups.length) break;
      steps.push(this.resolveGroups(groups, swapped, combo));
      swapped = [];
      combo++;
    }

    let shuffled: Placed[] | null = null;
    if (!this.findMoves().length) {
      this.shuffle();
      shuffled = this.placed();
    }

    return { steps, total: steps.reduce((s, x) => s + x.points, 0), shuffled };
  }

  /** Rearrange the pieces on the board until there are moves but no ready matches */
  shuffle(): void {
    const pieces = this.grid.filter((p): p is Piece => !!p);
    for (let tries = 0; tries < 300; tries++) {
      for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(this.rand() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
      }
      pieces.forEach((p, i) => (this.grid[i] = p));
      if (!this.findGroups().length && this.findMoves().length) return;
    }
    this.fill();
  }

  placed(): Placed[] {
    const out: Placed[] = [];
    this.grid.forEach((p, i) => {
      if (p) out.push({ p, c: i % this.cols, r: Math.floor(i / this.cols) });
    });
    return out;
  }

  private newPiece(kind: number, special: Special = 0): Piece {
    return { id: this.nextId++, kind, special };
  }

  private matchesAt(i: number): boolean {
    const p = this.grid[i];
    if (!p || p.kind < 0) return false;
    const c = i % this.cols;
    const r = Math.floor(i / this.cols);
    const same = (cc: number, rr: number) => this.at(cc, rr)?.kind === p.kind;
    let h = 1;
    for (let x = c - 1; same(x, r); x--) h++;
    for (let x = c + 1; same(x, r); x++) h++;
    if (h >= 3) return true;
    let v = 1;
    for (let y = r - 1; same(c, y); y--) v++;
    for (let y = r + 1; same(c, y); y++) v++;
    return v >= 3;
  }

  /** Connected match groups (runs of 3+ that share cells are merged into one group) */
  private findGroups(): { cells: number[]; runs: { cells: number[]; horizontal: boolean }[]; kind: number }[] {
    const runs: { cells: number[]; horizontal: boolean }[] = [];
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const k = this.at(c, r)?.kind ?? -1;
        let e = c + 1;
        while (e < this.cols && k >= 0 && this.at(e, r)?.kind === k) e++;
        if (k >= 0 && e - c >= 3) {
          runs.push({ cells: Array.from({ length: e - c }, (_, i) => r * this.cols + c + i), horizontal: true });
        }
        c = e;
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const k = this.at(c, r)?.kind ?? -1;
        let e = r + 1;
        while (e < this.rows && k >= 0 && this.at(c, e)?.kind === k) e++;
        if (k >= 0 && e - r >= 3) {
          runs.push({ cells: Array.from({ length: e - r }, (_, i) => (r + i) * this.cols + c), horizontal: false });
        }
        r = e;
      }
    }
    // Merge runs that share a cell
    const groups: { cells: Set<number>; runs: typeof runs; kind: number }[] = [];
    for (const run of runs) {
      const hit = groups.filter((g) => run.cells.some((i) => g.cells.has(i)));
      const merged = { cells: new Set(run.cells), runs: [run], kind: this.grid[run.cells[0]]!.kind };
      for (const g of hit) {
        g.cells.forEach((i) => merged.cells.add(i));
        merged.runs.push(...g.runs);
        groups.splice(groups.indexOf(g), 1);
      }
      groups.push(merged);
    }
    return groups.map((g) => ({ cells: [...g.cells], runs: g.runs, kind: g.kind }));
  }

  private resolveGroups(
    groups: ReturnType<GiftMatchEngine['findGroups']>,
    swapped: number[],
    combo: number
  ): Step {
    const start = new Set<number>();
    const creations: { at: number; piece: Piece }[] = [];
    const pops: Step['pops'] = [];
    let bonus = 0;
    for (const g of groups) {
      g.cells.forEach((i) => start.add(i));
      const longest = g.runs.reduce((m, r) => (r.cells.length > m.cells.length ? r : m), g.runs[0]);
      const hasH = g.runs.some((r) => r.horizontal);
      const hasV = g.runs.some((r) => !r.horizontal);
      let special: Special = 0;
      if (longest.cells.length >= 5) special = 3;
      else if (longest.cells.length === 4) special = longest.horizontal ? 1 : 2;
      else if (hasH && hasV) special = this.rand() < 0.5 ? 1 : 2;
      let groupBonus = 0;
      if (special) {
        const at = g.cells.find((i) => swapped.includes(i)) ?? longest.cells[Math.floor(longest.cells.length / 2)];
        creations.push({ at, piece: this.newPiece(special === 3 ? -1 : g.kind, special) });
        groupBonus = special === 3 ? STAR_BONUS : STRIPE_BONUS;
        bonus += groupBonus * combo;
      }
      const cx = g.cells.reduce((s, i) => s + (i % this.cols), 0) / g.cells.length;
      const cy = g.cells.reduce((s, i) => s + Math.floor(i / this.cols), 0) / g.cells.length;
      pops.push({ c: cx, r: cy, points: (g.cells.length * POINTS_PER_PIECE + groupBonus) * combo, kind: g.kind });
    }
    const step = this.resolveStep(start, [], creations, combo, pops);
    step.points += bonus;
    return step;
  }

  /** Remove the given cells plus everything specials blow up, place new specials, then apply gravity */
  private resolveStep(
    start: Set<number>,
    beams: Beam[],
    creations: { at: number; piece: Piece }[],
    combo: number,
    pops: Step['pops'] = []
  ): Step {
    const removed = new Set<number>();
    const queue = [...start];
    while (queue.length) {
      const i = queue.shift()!;
      if (removed.has(i)) continue;
      const p = this.grid[i];
      if (!p) continue;
      removed.add(i);
      const c = i % this.cols;
      const r = Math.floor(i / this.cols);
      if (p.special === 1) {
        beams.push({ type: 'row', c, r });
        for (let x = 0; x < this.cols; x++) queue.push(r * this.cols + x);
      } else if (p.special === 2) {
        beams.push({ type: 'col', c, r });
        for (let y = 0; y < this.rows; y++) queue.push(y * this.cols + c);
      } else if (p.special === 3 && !start.has(i)) {
        // A star caught in a blast takes out the most common kind
        const counts = new Array(this.kinds).fill(0);
        this.grid.forEach((q) => q && q.kind >= 0 && counts[q.kind]++);
        const kind = counts.indexOf(Math.max(...counts));
        const targets: { c: number; r: number }[] = [];
        this.grid.forEach((q, j) => {
          if (q && q.kind === kind) {
            queue.push(j);
            targets.push({ c: j % this.cols, r: Math.floor(j / this.cols) });
          }
        });
        beams.push({ type: 'kind', c, r, targets });
      }
    }

    const removedList: Placed[] = [];
    removed.forEach((i) => {
      removedList.push({ p: this.grid[i]!, c: i % this.cols, r: Math.floor(i / this.cols) });
      this.grid[i] = null;
    });
    const created: Placed[] = [];
    for (const cr of creations) {
      this.grid[cr.at] = cr.piece;
      created.push({ p: cr.piece, c: cr.at % this.cols, r: Math.floor(cr.at / this.cols) });
    }
    // Pieces cleared by blasts (not by the match itself) still score
    const extra = removedList.length - [...start].filter((i) => removed.has(i)).length;
    let points = removedList.length * POINTS_PER_PIECE * combo;
    if (extra > 0 && pops.length) pops[0].points += extra * POINTS_PER_PIECE * combo;
    if (!pops.length && removedList.length) {
      const cx = removedList.reduce((s, x) => s + x.c, 0) / removedList.length;
      const cy = removedList.reduce((s, x) => s + x.r, 0) / removedList.length;
      pops.push({ c: cx, r: cy, points, kind: -1 });
    }

    return { combo, removed: removedList, created, beams, points, pops, fallen: this.gravity() };
  }

  private gravity(): Step['fallen'] {
    const fallen: Step['fallen'] = [];
    for (let c = 0; c < this.cols; c++) {
      let write = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        const p = this.grid[r * this.cols + c];
        if (!p) continue;
        if (write !== r) {
          this.grid[write * this.cols + c] = p;
          this.grid[r * this.cols + c] = null;
          fallen.push({ p, c, fromR: r, r: write });
        }
        write--;
      }
      const empty = write + 1;
      for (let r = write; r >= 0; r--) {
        const p = this.newPiece(Math.floor(this.rand() * this.kinds));
        this.grid[r * this.cols + c] = p;
        fallen.push({ p, c, fromR: r - empty, r });
      }
    }
    return fallen;
  }
}
// #endregion engine


// ------------------------------------------------------------------ view

interface Vis {
  x: number; // in cells
  y: number;
  scale: number;
  alpha: number;
}

interface Particle {
  x: number; // px (css)
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  spark: boolean;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  big: boolean;
}

interface BeamFx {
  beam: Beam;
  life: number;
  max: number;
}

interface Tween {
  t: number;
  dur: number;
  fn: (k: number) => void;
  resolve: () => void;
}

type Phase = 'playing' | 'won' | 'lost' | 'over';

const KIND_COLORS = ['#ff4d6a', '#ffd04a', '#3fcf8e', '#7cc4ff', '#d98a4a', '#ff7aa8'];
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/**
 * "Gift Match" - a festive match-3. Swap neighbouring pieces to line up three or more.
 * Four in a row makes a striped piece that clears its line, five makes a star that clears
 * every piece of the kind it is swapped with. Reach the target score within the move budget.
 *
 * Rules live in GiftMatchEngine (pure, simulated headless for tuning); this component only
 * animates the steps the engine returns, on a canvas driven by requestAnimationFrame.
 */
@Component({
  selector: 'app-gift-match-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './gift-match-challenge.html',
  styleUrl: './gift-match-challenge.scss',
})
export class GiftMatchChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: GiftMatchConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Check = Check;
  readonly RotateCcw = RotateCcw;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);
  private zone = inject(NgZone);
  private translate = inject(TranslateService);

  cols = 7;
  rows = 8;
  kinds = 5;
  targetScore = 2000;
  totalMoves = 20;
  endless = false;
  duration = 90;
  /** Endless mode clock (seconds); shown rounded up */
  timeLeft = 90;
  timeShown = 90;
  clockStarted = false;
  newBest = false;

  score = 0;
  movesLeft = 20;
  phase: Phase = 'playing';
  bestScore: number | null = null;
  scoreBump = 0;
  attempts = 1;

  private engine!: GiftMatchEngine;
  private display = new Map<number, { p: Piece; v: Vis }>();
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private beams: BeamFx[] = [];
  private tweens: Tween[] = [];
  private flakes: { x: number; y: number; r: number; s: number }[] = [];
  private sprites = new Map<string, HTMLCanvasElement>();
  private bg: HTMLCanvasElement | null = null;

  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private cell = 40;
  private time = 0;
  private raf = 0;
  private last = 0;
  private busy = false;
  private selected: number | null = null;
  private cursor: number | null = null;
  private hintPair: [number, number] | null = null;
  private idle = 0;
  private flash = 0;
  private winTime = -1;
  private comboText: { text: string; life: number } | null = null;
  private resizeObs?: ResizeObserver;
  private drag: { id: number; cell: number; x: number; y: number; done: boolean } | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private cleanup: (() => void)[] = [];
  private destroyed = false;
  private pendingRetry = false;

  get ratio(): number {
    return this.cols / this.rows;
  }

  get progress(): number {
    return Math.min(1, this.score / this.targetScore);
  }

  ngOnInit(): void {
    const c = this.config ?? {};
    this.cols = Math.max(5, Math.min(9, Math.round(c.cols ?? 7)));
    this.rows = Math.max(5, Math.min(10, Math.round(c.rows ?? 8)));
    this.kinds = Math.max(4, Math.min(6, Math.round(c.kinds ?? 5)));
    this.targetScore = Math.max(100, Math.round(c.targetScore ?? 2000));
    this.totalMoves = Math.max(3, Math.round(c.moves ?? 20));
    this.endless = !!c.endless;
    this.duration = Math.max(20, Math.min(600, Math.round(c.duration ?? 90)));
    const key = this.statsKey;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestScore = stats?.bestScore ?? null;
    this.flakes = Array.from({ length: 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.8,
      s: 0.02 + Math.random() * 0.04,
    }));
    this.newBoard(false);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    this.zone.runOutsideAngular(() => {
      this.resizeObs = new ResizeObserver(() => this.resize());
      this.resizeObs.observe(this.wrapRef.nativeElement);
      this.resize();

      const on = <K extends keyof HTMLElementEventMap>(
        el: HTMLElement,
        type: K,
        fn: (e: HTMLElementEventMap[K]) => void
      ) => {
        el.addEventListener(type, fn as EventListener);
        this.cleanup.push(() => el.removeEventListener(type, fn as EventListener));
      };
      on(canvas, 'pointerdown', (e) => this.onPointerDown(e));
      on(canvas, 'pointermove', (e) => this.onPointerMove(e));
      on(canvas, 'pointerup', () => this.onPointerUp());
      on(canvas, 'pointercancel', () => (this.drag = null));
      on(canvas, 'keydown', (e) => this.onKey(e));
      const onVis = () => (this.last = performance.now());
      document.addEventListener('visibilitychange', onVis);
      this.cleanup.push(() => document.removeEventListener('visibilitychange', onVis));

      this.last = performance.now();
      const loop = (now: number) => {
        if (this.destroyed) return;
        const dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        if (!document.hidden) this.frame(dt);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    this.cleanup.forEach((fn) => fn());
    this.timers.forEach(clearTimeout);
    this.tweens = [];
  }

  private get statsKey(): number | string | undefined {
    // `||` rather than `??`: some hosts pass day 0 for extras
    return this.day || this.levelId;
  }

  // ---------------------------------------------------------------- public actions

  retry(): void {
    if (this.phase === 'won') return;
    if (this.busy && this.phase === 'playing') {
      // Let the running cascade finish first
      this.pendingRetry = true;
      return;
    }
    this.attempts++;
    this.newBoard(true);
  }

  showReward(): void {
    this.completed.emit();
  }

  private newBoard(animate: boolean): void {
    this.tweens.forEach((t) => t.resolve());
    this.tweens = [];
    this.engine = new GiftMatchEngine(this.cols, this.rows, this.kinds);
    this.engine.fill();
    this.score = 0;
    this.movesLeft = this.totalMoves;
    this.timeLeft = this.duration;
    this.timeShown = this.duration;
    this.clockStarted = false;
    this.newBest = false;
    this.phase = 'playing';
    this.selected = null;
    this.hintPair = null;
    this.idle = 0;
    this.busy = false;
    this.winTime = -1;
    this.particles = [];
    this.floaters = [];
    this.beams = [];
    this.comboText = null;
    this.display.clear();
    for (const pl of this.engine.placed()) {
      // Drop the board in from above, column by column
      const v: Vis = { x: pl.c, y: animate ? pl.r - this.rows - 1 : pl.r, scale: 1, alpha: 1 };
      this.display.set(pl.p.id, { p: pl.p, v });
    }
    if (animate) {
      this.busy = true;
      const all = this.engine.placed();
      Promise.all(
        all.map((pl) => {
          const d = this.display.get(pl.p.id)!.v;
          const from = d.y;
          return this.wait(pl.c * 35 + (this.rows - pl.r) * 18).then(() =>
            this.tween(420, (k) => (d.y = from + (pl.r - from) * this.fallEase(k)))
          );
        })
      ).then(() => {
        this.busy = false;
        this.pendingRetry = false;
      });
    }
  }

  // ---------------------------------------------------------------- input

  private cellAt(e: PointerEvent): number | null {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * this.cols);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * this.rows);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return r * this.cols + c;
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.phase !== 'playing') return;
    const cell = this.cellAt(e);
    if (cell === null) return;
    this.canvasRef.nativeElement.setPointerCapture?.(e.pointerId);
    this.drag = { id: e.pointerId, cell, x: e.clientX, y: e.clientY, done: false };
    this.idle = 0;
    this.hintPair = null;
    this.cursor = null;
  }

  private onPointerMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || d.done || d.id !== e.pointerId || this.busy) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const cellPx = rect.width / this.cols;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cellPx * 0.35) return;
    d.done = true;
    const c = d.cell % this.cols;
    const r = Math.floor(d.cell / this.cols);
    const [nc, nr] = Math.abs(dx) > Math.abs(dy) ? [c + Math.sign(dx), r] : [c, r + Math.sign(dy)];
    if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) return;
    this.selected = null;
    this.trySwap(d.cell, nr * this.cols + nc);
  }

  private onPointerUp(): void {
    const d = this.drag;
    this.drag = null;
    if (!d || d.done || this.busy || this.phase !== 'playing') return;
    this.tapCell(d.cell);
  }

  private tapCell(cell: number): void {
    if (this.selected === null) {
      this.selected = cell;
      this.sound.bell(1318.51, 0.05);
    } else if (this.selected === cell) {
      this.selected = null;
    } else if (this.engine.isAdjacent(this.selected, cell)) {
      const from = this.selected;
      this.selected = null;
      this.trySwap(from, cell);
    } else {
      this.selected = cell;
      this.sound.bell(1318.51, 0.05);
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (this.phase !== 'playing') return;
    const dirs: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const cur = this.cursor ?? this.selected ?? Math.floor(this.rows / 2) * this.cols + Math.floor(this.cols / 2);
    if (dirs[e.key]) {
      e.preventDefault();
      const [dc, dr] = dirs[e.key];
      const c = Math.max(0, Math.min(this.cols - 1, (cur % this.cols) + dc));
      const r = Math.max(0, Math.min(this.rows - 1, Math.floor(cur / this.cols) + dr));
      this.cursor = r * this.cols + c;
      this.idle = 0;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!this.busy) this.tapCell(cur);
      this.cursor = cur;
    } else if (e.key === 'Escape') {
      this.selected = null;
    }
  }

  // ---------------------------------------------------------------- turn flow

  private async trySwap(a: number, b: number): Promise<void> {
    if (this.busy || this.phase !== 'playing') return;
    if (this.endless && this.timeLeft <= 0) return;
    this.clockStarted = true;
    this.busy = true;
    this.hintPair = null;
    this.idle = 0;
    const pa = this.engine.grid[a]!;
    const pb = this.engine.grid[b]!;
    const va = this.display.get(pa.id)!.v;
    const vb = this.display.get(pb.id)!.v;
    const ax = va.x;
    const ay = va.y;
    const bx = vb.x;
    const by = vb.y;
    const turn = this.engine.swap(a, b);

    this.sound.bell(880, 0.05);
    await this.tween(170, (k) => {
      const e = easeInOut(k);
      va.x = ax + (bx - ax) * e;
      va.y = ay + (by - ay) * e;
      vb.x = bx + (ax - bx) * e;
      vb.y = by + (ay - by) * e;
    });

    if (!turn) {
      this.sound.thud();
      await this.tween(220, (k) => {
        const e = easeOut(k);
        va.x = bx + (ax - bx) * e;
        va.y = by + (ay - by) * e;
        vb.x = ax + (bx - ax) * e;
        vb.y = ay + (by - ay) * e;
      });
      this.busy = false;
      if (this.pendingRetry) {
        this.pendingRetry = false;
        this.zone.run(() => this.retry());
      }
      return;
    }

    if (!this.endless) this.zone.run(() => (this.movesLeft = Math.max(0, this.movesLeft - 1)));

    for (const step of turn.steps) {
      if (this.destroyed) return;
      await this.playStep(step);
    }

    if (turn.shuffled) {
      this.showCombo(this.translate.instant('challenges.giftMatch.shuffle'));
      await this.wait(300);
      await Promise.all(
        turn.shuffled.map((pl) => {
          const v = this.display.get(pl.p.id)!.v;
          const fx = v.x;
          const fy = v.y;
          return this.tween(520, (k) => {
            const e = easeInOut(k);
            v.x = fx + (pl.c - fx) * e;
            v.y = fy + (pl.r - fy) * e;
            v.scale = 1 - Math.sin(k * Math.PI) * 0.35;
          });
        })
      );
    }

    this.busy = false;
    if (this.pendingRetry) {
      this.pendingRetry = false;
      this.zone.run(() => this.retry());
      return;
    }
    this.checkEnd();
  }

  private async playStep(step: Step): Promise<void> {
    const cell = this.cell;
    if (step.combo >= 2) {
      this.showCombo(this.translate.instant('challenges.giftMatch.combo', { n: step.combo }));
    }
    const note = SCALE[Math.min(SCALE.length - 1, step.combo - 1 + 2)];
    this.sound.bell(note, 0.12);
    if (step.beams.length) {
      this.sound.jingle();
      for (const b of step.beams) this.beams.push({ beam: b, life: 0, max: b.type === 'kind' ? 0.55 : 0.4 });
      if (step.beams.some((b) => b.type === 'all')) this.flash = 1;
    }
    if (this.endless) {
      // Big combos and specials buy extra time
      const bonus =
        (step.combo >= 3 ? 1 : 0) +
        step.created.filter((c) => c.p.special === 1 || c.p.special === 2).length +
        step.created.filter((c) => c.p.special === 3).length * 3;
      if (bonus > 0 && this.timeLeft > 0) {
        this.timeLeft += bonus;
        this.floaters.push({ x: this.w / 2, y: cell * 0.6, text: `+${bonus}s ⏱`, life: 0, max: 1.2, big: true });
      }
    }
    if (step.created.some((c) => c.p.special === 3)) this.sound.fanfare();
    else if (step.created.length) this.sound.bell(1567.98, 0.1, 0.08);

    // Pop the cleared pieces
    const removedVis = step.removed.map((r) => this.display.get(r.p.id)).filter((d) => !!d);
    await this.tween(130, (k) => removedVis.forEach((d) => (d.v.scale = 1 + 0.18 * Math.sin(k * Math.PI * 0.5))));
    for (const r of step.removed) {
      this.burst((r.c + 0.5) * cell, (r.r + 0.5) * cell, r.p.kind >= 0 ? KIND_COLORS[r.p.kind] : '#fff6d0');
      this.display.delete(r.p.id);
    }
    for (const pop of step.pops) {
      this.floaters.push({
        x: (pop.c + 0.5) * cell,
        y: (pop.r + 0.5) * cell,
        text: '+' + pop.points,
        life: 0,
        max: 1.1,
        big: pop.points >= 100,
      });
    }
    this.zone.run(() => {
      this.score += step.points;
      this.scoreBump++;
    });

    // New specials appear where the match was made
    for (const cr of step.created) {
      const v: Vis = { x: cr.c, y: cr.r, scale: 0, alpha: 1 };
      this.display.set(cr.p.id, { p: cr.p, v });
    }
    if (step.created.length) {
      await this.tween(260, (k) => {
        for (const cr of step.created) {
          const d = this.display.get(cr.p.id);
          if (d) d.v.scale = this.backOut(k);
        }
      });
    } else {
      await this.wait(90);
    }

    // Gravity
    const falls = step.fallen.map((f) => {
      let d = this.display.get(f.p.id);
      if (!d) {
        d = { p: f.p, v: { x: f.c, y: f.fromR, scale: 1, alpha: 1 } };
        this.display.set(f.p.id, d);
      }
      const v = d.v;
      const from = f.fromR;
      const dist = f.r - from;
      return this.tween(140 + Math.sqrt(dist) * 110, (k) => (v.y = from + dist * this.fallEase(k)));
    });
    await Promise.all(falls);
    if (step.fallen.length) this.sound.bell(SCALE[0] / 2, 0.03);
  }

  private checkEnd(): void {
    if (this.phase !== 'playing') return;
    if (this.endless) {
      if (this.timeLeft <= 0) this.zone.run(() => this.finishEndless());
      return;
    }
    if (this.score >= this.targetScore) {
      this.zone.run(() => this.onWin());
    } else if (this.movesLeft <= 0) {
      this.zone.run(() => {
        this.phase = 'lost';
        this.saveBest();
      });
      this.sound.thud();
    }
  }

  /** Endless mode: the clock ran out - show the final score. Never emits `completed`. */
  private finishEndless(): void {
    if (this.phase !== 'playing') return;
    this.phase = 'over';
    this.selected = null;
    this.hintPair = null;
    this.newBest = this.score > 0 && (this.bestScore === null || this.score > this.bestScore);
    this.saveBest();
    if (this.newBest) {
      this.sound.fanfare();
      this.winTime = this.time;
    } else {
      this.sound.bell(659.25, 0.15);
    }
  }

  private onWin(): void {
    this.phase = 'won';
    this.winTime = this.time;
    this.selected = null;
    this.sound.fanfare();
    this.saveBest();
    this.timers.push(setTimeout(() => this.completed.emit(), 2200));
  }

  private saveBest(): void {
    const key = this.statsKey;
    if (!key) return;
    const best = Math.max(this.bestScore ?? 0, this.score);
    this.bestScore = best;
    this.stateService.saveGameStats(key, { bestScore: best });
  }

  private showCombo(text: string): void {
    this.comboText = { text, life: 0 };
  }

  // ---------------------------------------------------------------- animation helpers

  private tween(dur: number, fn: (k: number) => void): Promise<void> {
    return new Promise((resolve) => {
      if (this.destroyed) return resolve();
      this.tweens.push({ t: 0, dur: Math.max(1, dur) / 1000, fn, resolve });
    });
  }

  private wait(ms: number): Promise<void> {
    return this.tween(ms, () => undefined);
  }

  /** Accelerate like gravity, then a tiny bounce on landing */
  private fallEase(k: number): number {
    if (k < 0.82) {
      const t = k / 0.82;
      return t * t;
    }
    const t = (k - 0.82) / 0.18;
    return 1 - Math.sin(t * Math.PI) * 0.06;
  }

  private backOut(k: number): number {
    const c1 = 2.2;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  }

  private burst(x: number, y: number, color: string): void {
    const cell = this.cell;
    const n = this.particles.length > 500 ? 4 : 10;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (1.5 + Math.random() * 4) * cell;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - cell * 2,
        life: 0,
        max: 0.5 + Math.random() * 0.4,
        color: i % 3 === 0 ? '#fff8e0' : color,
        size: cell * (0.05 + Math.random() * 0.07),
        spark: i % 3 === 0,
      });
    }
  }

  // ---------------------------------------------------------------- frame

  private frame(dt: number): void {
    this.time += dt;

    // Tweens (copy: finishing one may start the next)
    if (this.tweens.length) {
      const list = this.tweens;
      this.tweens = [];
      const keep: Tween[] = [];
      for (const tw of list) {
        tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur);
        tw.fn(k);
        if (k >= 1) tw.resolve();
        else keep.push(tw);
      }
      this.tweens = keep.concat(this.tweens);
    }

    // Endless clock (starts with the first swap)
    if (this.endless && this.phase === 'playing' && this.clockStarted && this.timeLeft > 0) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      const shown = Math.ceil(this.timeLeft);
      if (shown !== this.timeShown) {
        this.zone.run(() => (this.timeShown = shown));
        if (shown <= 5 && shown > 0) this.sound.bell(1567.98, 0.06);
      }
      if (this.timeLeft <= 0 && !this.busy) this.zone.run(() => this.finishEndless());
    }

    // Idle hint for players who are stuck
    if (this.phase === 'playing' && !this.busy) {
      this.idle += dt;
      if (this.idle > 7 && !this.hintPair) {
        const moves = this.engine.findMoves();
        if (moves.length) this.hintPair = moves[Math.floor(Math.random() * moves.length)];
      }
    }

    // Particles
    const g = this.cell * 14;
    this.particles = this.particles.filter((p) => {
      p.life += dt;
      p.vy += g * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return p.life < p.max;
    });
    this.floaters = this.floaters.filter((f) => (f.life += dt) < f.max);
    this.beams = this.beams.filter((b) => (b.life += dt) < b.max);
    if (this.comboText && (this.comboText.life += dt) > 1.1) this.comboText = null;
    this.flash = Math.max(0, this.flash - dt * 2.5);
    for (const f of this.flakes) {
      f.y += f.s * dt;
      if (f.y > 1.02) {
        f.y = -0.02;
        f.x = Math.random();
      }
    }

    // Celebration fireworks
    if ((this.phase === 'won' || (this.phase === 'over' && this.newBest)) && this.time - this.winTime < 2.2 && Math.random() < dt * 9) {
      const colors = ['#ffd04a', '#ff4d6a', '#3fcf8e', '#7cc4ff', '#fff'];
      this.burst(Math.random() * this.w, Math.random() * this.h * 0.8, colors[Math.floor(Math.random() * colors.length)]);
    }

    this.draw();
  }

  private resize(): void {
    const wrap = this.wrapRef.nativeElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (!w || !h) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = this.canvasRef.nativeElement;
    canvas.width = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    this.w = w;
    this.h = h;
    this.cell = w / this.cols;
    this.sprites.clear();
    this.bg = null;
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.w) return;
    const cell = this.cell;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    if (!this.bg) this.bg = this.renderBackground();
    ctx.drawImage(this.bg, 0, 0, this.w, this.h);

    // Snow drifting behind the pieces
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const f of this.flakes) {
      ctx.beginPath();
      ctx.arc(f.x * this.w + Math.sin(this.time * 0.8 + f.y * 9) * 6, f.y * this.h, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Selection / keyboard cursor
    const mark = (i: number, color: string, pulse: boolean) => {
      const c = i % this.cols;
      const r = Math.floor(i / this.cols);
      const a = pulse ? 0.55 + Math.sin(this.time * 6) * 0.25 : 0.9;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, cell * 0.06);
      ctx.shadowColor = color;
      ctx.shadowBlur = cell * 0.3;
      this.roundRect(ctx, c * cell + cell * 0.06, r * cell + cell * 0.06, cell * 0.88, cell * 0.88, cell * 0.22);
      ctx.stroke();
      ctx.restore();
    };
    if (this.selected !== null) mark(this.selected, '#fff3c4', true);
    if (this.cursor !== null && this.cursor !== this.selected) mark(this.cursor, '#7cc4ff', false);

    // Pieces (clipped so new ones slide in from behind the top edge)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.w, this.h);
    ctx.clip();
    const won = this.phase === 'won';
    for (const { p, v } of this.display.values()) {
      if (v.scale <= 0.01 || v.y < -1.2) continue;
      let scale = v.scale;
      let dy = 0;
      let rot = 0;
      if (this.hintPair) {
        const idx = Math.round(v.y) * this.cols + Math.round(v.x);
        if (idx === this.hintPair[0] || idx === this.hintPair[1]) {
          rot = Math.sin(this.time * 14) * 0.12 * Math.max(0, Math.sin(this.time * 2.5));
        }
      }
      if (this.selected !== null) {
        const idx = Math.round(v.y) * this.cols + Math.round(v.x);
        if (idx === this.selected) scale *= 1.08 + Math.sin(this.time * 6) * 0.03;
      }
      if (won) {
        const t = this.time - this.winTime - (v.x + v.y) * 0.06;
        if (t > 0 && t < 0.6) {
          dy = -Math.sin((t / 0.6) * Math.PI) * 0.22;
          scale *= 1 + Math.sin((t / 0.6) * Math.PI) * 0.12;
        }
      }
      const cx = (v.x + 0.5) * cell;
      const cy = (v.y + 0.5 + dy) * cell;
      ctx.save();
      ctx.globalAlpha = v.alpha;
      ctx.translate(cx, cy);
      if (rot) ctx.rotate(rot);
      ctx.scale(scale, scale);
      if (p.special === 3) {
        this.drawStarBomb(ctx, cell);
      } else {
        const sprite = this.sprite(p.kind, p.special);
        ctx.drawImage(sprite, -cell / 2, -cell / 2, cell, cell);
        if (p.special) {
          // Gentle shimmer on striped pieces
          ctx.globalAlpha = 0.12 + Math.sin(this.time * 5 + v.x) * 0.08;
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(sprite, -cell / 2, -cell / 2, cell, cell);
        }
      }
      ctx.restore();
    }
    ctx.restore();

    // Beams
    for (const b of this.beams) this.drawBeam(ctx, b);

    // Particles
    for (const p of this.particles) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.spark) {
        const s = p.size * 1.6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.quadraticCurveTo(p.x, p.y, p.x + s, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s);
        ctx.quadraticCurveTo(p.x, p.y, p.x - s, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Floating scores
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floaters) {
      const k = f.life / f.max;
      const size = cell * (f.big ? 0.62 : 0.48) * (k < 0.15 ? 0.6 + (k / 0.15) * 0.4 : 1);
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.font = `900 ${size}px Nunito, system-ui, sans-serif`;
      const y = f.y - easeOut(k) * cell * 0.9;
      ctx.lineWidth = size * 0.18;
      ctx.strokeStyle = 'rgba(40, 14, 4, 0.85)';
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.big ? '#fff3c4' : '#ffd04a';
      ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1;

    // Combo banner
    if (this.comboText) {
      const k = this.comboText.life / 1.1;
      const s = k < 0.2 ? this.backOut(k / 0.2) : 1;
      const size = Math.min(cell * 0.9, this.w / 8);
      ctx.save();
      ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      ctx.translate(this.w / 2, this.h * 0.42);
      ctx.scale(s, s);
      ctx.rotate(-0.06);
      ctx.font = `900 ${size}px Fraunces, Georgia, serif`;
      ctx.lineWidth = size * 0.16;
      ctx.strokeStyle = '#5a1020';
      ctx.shadowColor = 'rgba(255, 200, 90, 0.9)';
      ctx.shadowBlur = size * 0.5;
      ctx.strokeText(this.comboText.text, 0, 0);
      ctx.shadowBlur = 0;
      const grad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      grad.addColorStop(0, '#fff8e0');
      grad.addColorStop(0.55, '#ffd04a');
      grad.addColorStop(1, '#f08a24');
      ctx.fillStyle = grad;
      ctx.fillText(this.comboText.text, 0, 0);
      ctx.restore();
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 248, 224, ${this.flash * 0.6})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  private drawBeam(ctx: CanvasRenderingContext2D, fx: BeamFx): void {
    const cell = this.cell;
    const k = fx.life / fx.max;
    const a = 1 - k;
    const b = fx.beam;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (b.type === 'row' || b.type === 'col') {
      const thick = cell * (0.75 - k * 0.5);
      const grad =
        b.type === 'row'
          ? ctx.createLinearGradient(0, (b.r + 0.5) * cell - thick / 2, 0, (b.r + 0.5) * cell + thick / 2)
          : ctx.createLinearGradient((b.c + 0.5) * cell - thick / 2, 0, (b.c + 0.5) * cell + thick / 2, 0);
      grad.addColorStop(0, 'rgba(255, 210, 120, 0)');
      grad.addColorStop(0.5, `rgba(255, 252, 235, ${a})`);
      grad.addColorStop(1, 'rgba(255, 210, 120, 0)');
      ctx.fillStyle = grad;
      if (b.type === 'row') ctx.fillRect(0, (b.r + 0.5) * cell - thick / 2, this.w, thick);
      else ctx.fillRect((b.c + 0.5) * cell - thick / 2, 0, thick, this.h);
    } else if (b.type === 'kind' && b.targets) {
      const sx = (b.c + 0.5) * cell;
      const sy = (b.r + 0.5) * cell;
      ctx.strokeStyle = `rgba(255, 246, 210, ${a})`;
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      ctx.shadowColor = '#ffd04a';
      ctx.shadowBlur = cell * 0.4;
      for (const t of b.targets) {
        const tx = (t.c + 0.5) * cell;
        const ty = (t.r + 0.5) * cell;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const segs = 5;
        for (let i = 1; i < segs; i++) {
          const f = i / segs;
          const jitter = (Math.random() - 0.5) * cell * 0.35;
          ctx.lineTo(sx + (tx - sx) * f + jitter, sy + (ty - sy) * f - jitter);
        }
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    } else if (b.type === 'all') {
      const r = Math.max(this.w, this.h) * easeOut(k) * 1.2;
      const grad = ctx.createRadialGradient((b.c + 0.5) * cell, (b.r + 0.5) * cell, 0, (b.c + 0.5) * cell, (b.r + 0.5) * cell, r + 1);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.85, `rgba(255, 240, 200, ${a * 0.8})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- art

  private renderBackground(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = Math.round(this.w * this.dpr);
    cv.height = Math.round(this.h * this.dpr);
    const ctx = cv.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);
    const cell = this.cell;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * cell + cell * 0.04;
        const y = r * cell + cell * 0.04;
        const s = cell * 0.92;
        const grad = ctx.createLinearGradient(0, y, 0, y + s);
        const light = (c + r) % 2 === 0;
        grad.addColorStop(0, light ? 'rgba(160, 190, 255, 0.16)' : 'rgba(160, 190, 255, 0.1)');
        grad.addColorStop(1, light ? 'rgba(120, 140, 230, 0.08)' : 'rgba(120, 140, 230, 0.04)');
        ctx.fillStyle = grad;
        this.roundRect(ctx, x, y, s, s, cell * 0.2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    return cv;
  }

  private sprite(kind: number, special: Special): HTMLCanvasElement {
    const key = `${kind}_${special}`;
    let cv = this.sprites.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas');
    const size = Math.max(16, Math.round(this.cell * this.dpr));
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext('2d')!;
    ctx.translate(size / 2, size / 2);
    ctx.scale(size / 100, size / 100);
    // Soft contact shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 20, 0.35)';
    ctx.filter = 'blur(3px)';
    ctx.beginPath();
    ctx.ellipse(0, 38, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (special) {
      ctx.shadowColor = 'rgba(255, 255, 240, 0.95)';
      ctx.shadowBlur = 14 * (size / 100);
    }
    drawPiece(ctx, kind);
    ctx.shadowBlur = 0;
    if (special === 1 || special === 2) {
      // Candy stripes painted only onto the piece itself
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (let i = -50; i < 50; i += 16) {
        if (special === 1) ctx.fillRect(-50, i, 100, 7);
        else ctx.fillRect(i, -50, 7, 100);
      }
      ctx.restore();
      // Arrows showing which way it blasts
      ctx.fillStyle = '#fffbe8';
      ctx.shadowColor = '#ffd04a';
      ctx.shadowBlur = 6 * (size / 100);
      const arrow = (rot: number) => {
        ctx.save();
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(48, 0);
        ctx.lineTo(38, -8);
        ctx.lineTo(38, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      if (special === 1) {
        arrow(0);
        arrow(Math.PI);
      } else {
        arrow(Math.PI / 2);
        arrow(-Math.PI / 2);
      }
    }
    this.sprites.set(key, cv);
    return cv;
  }

  private drawStarBomb(ctx: CanvasRenderingContext2D, cell: number): void {
    const s = cell / 100;
    const t = this.time;
    ctx.save();
    ctx.scale(s, s);
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 50);
    glow.addColorStop(0, 'rgba(255, 245, 200, 0.85)');
    glow.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    // Rainbow ring
    ctx.rotate(t * 1.6);
    const anyCtx = ctx as CanvasRenderingContext2D & {
      createConicGradient?: (a: number, x: number, y: number) => CanvasGradient;
    };
    if (anyCtx.createConicGradient) {
      const cg = anyCtx.createConicGradient(0, 0, 0);
      ['#ff4d6a', '#ffd04a', '#3fcf8e', '#7cc4ff', '#c58bff', '#ff4d6a'].forEach((c, i) => cg.addColorStop(i / 5, c));
      ctx.fillStyle = cg;
    } else {
      ctx.fillStyle = '#ffd04a';
    }
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();
    const core = ctx.createRadialGradient(-6, -6, 2, 0, 0, 26);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.6, '#fff1b8');
    core.addColorStop(1, '#f2b53c');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(-t * 2.6);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10 * s;
    starPath(ctx, 0, 0, 19, 8);
    ctx.fill();
    ctx.restore();
    // Orbiting sparkles
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      const a = t * 2.2 + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * cell * 0.4, Math.sin(a) * cell * 0.4, cell * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

// ------------------------------------------------------------------ piece art (100-unit space, centred)

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function gloss(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, alpha = 0.75): void {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPiece(ctx: CanvasRenderingContext2D, kind: number): void {
  switch (kind) {
    case 0:
      return drawBauble(ctx);
    case 1:
      return drawGoldStar(ctx);
    case 2:
      return drawTree(ctx);
    case 3:
      return drawSnowflake(ctx);
    case 4:
      return drawGingerbread(ctx);
    default:
      return drawCandyCane(ctx);
  }
}

function drawBauble(ctx: CanvasRenderingContext2D): void {
  // Hanging loop and cap
  ctx.strokeStyle = '#e9c46a';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, -38, 5.5, 0, Math.PI * 2);
  ctx.stroke();
  const cap = ctx.createLinearGradient(-10, 0, 10, 0);
  cap.addColorStop(0, '#9a6a1c');
  cap.addColorStop(0.5, '#ffe7a0');
  cap.addColorStop(1, '#9a6a1c');
  ctx.fillStyle = cap;
  ctx.fillRect(-10, -35, 20, 9);
  // Sphere
  const g = ctx.createRadialGradient(-12, -8, 3, 0, 4, 40);
  g.addColorStop(0, '#ffb3bd');
  g.addColorStop(0.3, '#ff3d5c');
  g.addColorStop(0.75, '#b5122f');
  g.addColorStop(1, '#6a0619');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 4, 34, 0, Math.PI * 2);
  ctx.fill();
  // Golden band
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 4, 34, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 215, 120, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -36; x <= 36; x += 6) {
    const y = 8 + (((x + 36) / 6) % 2 === 0 ? -4 : 4);
    if (x === -36) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 230, 160, 0.9)';
  for (const x of [-20, 0, 20]) {
    ctx.beginPath();
    ctx.arc(x, 20, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  gloss(ctx, -13, -10, 12, 7, -0.6, 0.85);
  gloss(ctx, 16, 24, 5, 3, -0.6, 0.35);
}

function drawGoldStar(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, -42, 0, 42);
  g.addColorStop(0, '#fff6c2');
  g.addColorStop(0.45, '#ffd23f');
  g.addColorStop(1, '#d98a0c');
  starPath(ctx, 0, 4, 44, 20);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#a8620a';
  ctx.stroke();
  // Facets
  ctx.save();
  starPath(ctx, 0, 4, 44, 20);
  ctx.clip();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const b = a + Math.PI / 5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(Math.cos(a) * 44, 4 + Math.sin(a) * 44);
    ctx.lineTo(Math.cos(b) * 20, 4 + Math.sin(b) * 20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  gloss(ctx, -7, -8, 9, 6, -0.5, 0.8);
}

function drawTree(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#6b3b1f';
  ctx.fillRect(-6, 28, 12, 12);
  const tiers = [
    { top: -40, base: -6, half: 22 },
    { top: -24, base: 12, half: 30 },
    { top: -8, base: 32, half: 38 },
  ];
  ctx.lineJoin = 'round';
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i];
    const g = ctx.createLinearGradient(-t.half, t.top, t.half, t.base);
    g.addColorStop(0, '#6ff0b4');
    g.addColorStop(0.45, '#25b06f');
    g.addColorStop(1, '#0d5e3c');
    ctx.fillStyle = g;
    ctx.strokeStyle = '#0a4a2f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, t.top);
    ctx.quadraticCurveTo(t.half * 0.4, (t.top + t.base) / 2, t.half, t.base);
    ctx.quadraticCurveTo(0, t.base + 6, -t.half, t.base);
    ctx.quadraticCurveTo(-t.half * 0.4, (t.top + t.base) / 2, 0, t.top);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Garland and ornaments
  ctx.strokeStyle = 'rgba(255, 220, 130, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, 2);
  ctx.quadraticCurveTo(0, 10, 20, 4);
  ctx.moveTo(-26, 22);
  ctx.quadraticCurveTo(0, 32, 28, 22);
  ctx.stroke();
  const orns: [number, number, string][] = [
    [-10, -14, '#ff4d6a'],
    [12, 6, '#7cc4ff'],
    [-16, 20, '#ffd04a'],
    [8, 26, '#ff4d6a'],
    [22, 22, '#fff'],
  ];
  for (const [x, y, c] of orns) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd23f';
  starPath(ctx, 0, -42, 9, 4);
  ctx.fill();
  gloss(ctx, -8, -18, 6, 10, 0.4, 0.45);
}

function drawSnowflake(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(-10, -12, 4, 0, 0, 44);
  g.addColorStop(0, '#e6f6ff');
  g.addColorStop(0.35, '#7cc4ff');
  g.addColorStop(0.8, '#2f6fd6');
  g.addColorStop(1, '#1b3f8f');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    const x = Math.cos(a) * 40;
    const y = Math.sin(a) * 40;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.fill();
  ctx.strokeStyle = '#173a85';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -27);
    ctx.moveTo(0, -13);
    ctx.lineTo(-7, -20);
    ctx.moveTo(0, -13);
    ctx.lineTo(7, -20);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  gloss(ctx, -12, -16, 12, 7, -0.5, 0.6);
}

function drawGingerbread(ctx: CanvasRenderingContext2D): void {
  const body = (w: number, color: string | CanvasGradient) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = 15 + w;
    ctx.beginPath();
    ctx.moveTo(-27, -4);
    ctx.lineTo(27, -4);
    ctx.moveTo(-3, 10);
    ctx.lineTo(-17, 34);
    ctx.moveTo(3, 10);
    ctx.lineTo(17, 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 4, 15 + w / 2, 19 + w / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -25, 14 + w / 2, 0, Math.PI * 2);
    ctx.fill();
  };
  body(4, '#6b3413');
  const g = ctx.createLinearGradient(-20, -40, 20, 40);
  g.addColorStop(0, '#f0a55e');
  g.addColorStop(0.5, '#cf7a35');
  g.addColorStop(1, '#9c5221');
  body(0, g);
  // Icing
  ctx.strokeStyle = '#fffaf0';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  const zig = (x: number, y: number, vertical: boolean) => {
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const o = i % 2 === 0 ? -2.5 : 2.5;
      const px = vertical ? x + o : x - 6 + i * 3;
      const py = vertical ? y - 6 + i * 3 : y + o;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };
  zig(-24, -4, true);
  zig(24, -4, true);
  zig(-15, 30, false);
  zig(15, 30, false);
  ctx.beginPath();
  ctx.arc(0, -24, 7, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#2a1206';
  ctx.beginPath();
  ctx.arc(-5, -28, 2.4, 0, Math.PI * 2);
  ctx.arc(5, -28, 2.4, 0, Math.PI * 2);
  ctx.fill();
  const btn: [number, string][] = [
    [-2, '#ff4d6a'],
    [8, '#3fcf8e'],
  ];
  for (const [y, c] of btn) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  gloss(ctx, -6, -32, 6, 4, -0.5, 0.45);
}

function drawCandyCane(ctx: CanvasRenderingContext2D): void {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(10, 38);
    ctx.lineTo(10, -14);
    ctx.arc(-6, -14, 16, 0, Math.PI, true);
    ctx.lineTo(-22, -4);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path();
  ctx.strokeStyle = '#7a0a2a';
  ctx.lineWidth = 20;
  ctx.stroke();
  path();
  ctx.strokeStyle = '#fff5f8';
  ctx.lineWidth = 15;
  ctx.stroke();
  path();
  ctx.setLineDash([7, 8]);
  ctx.strokeStyle = '#ff2f6a';
  ctx.lineCap = 'butt';
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(6, 34);
  ctx.lineTo(6, -14);
  ctx.arc(-6, -14, 12, 0, -Math.PI * 0.55, true);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 3;
  ctx.stroke();
}
