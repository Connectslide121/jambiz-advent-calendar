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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { LucideAngularModule, Check, Lightbulb, RotateCcw } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface NonogramConfig {
  /** Solution rows: '#' filled, '.' empty */
  puzzle?: string[];
  /** Same shape as puzzle: a colour letter per filled cell, used for the final reveal */
  palette?: string[];
  /** Optional overrides / additions to the colour letter map */
  colors?: Record<string, string>;
  /** Name of the picture incl. article, e.g. "a Christmas tree" / "en julgran" */
  titleEn?: string;
  titleSv?: string;
}

/** 0 = empty, 1 = filled, 2 = marked with an X */
type CellState = 0 | 1 | 2;

interface Cell {
  r: number;
  c: number;
  sol: boolean;
  color: string;
  delay: number;
}

const DEFAULT_PUZZLE = ['...##...', '..####..', '...##...', '..####..', '.######.', '########', '...##...', '..####..'];
const DEFAULT_PALETTE = ['...YY...', '..GGGG..', '...GG...', '..GRGG..', '.GGGGYG.', 'GYGGGGRG', '...BB...', '..RRRR..'];

const COLORS: Record<string, string> = {
  G: '#3fbf8f', // pine
  D: '#1f7a5c', // dark pine
  Y: '#ffd166', // gold
  R: '#ef4b62', // cranberry
  W: '#f4f8ff', // snow
  K: '#141831', // coal
  O: '#ff9f43', // carrot
  B: '#7a4a2a', // bark / antler
  T: '#c58b56', // reindeer fur
  P: '#ff8fb1', // pink
  L: '#8fd0f4', // ice blue
  S: '#b6c2dd', // silver
  F: '#f6c7a1', // skin
};

const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

export function lineClues(line: boolean[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const v of line) {
    if (v) run++;
    else if (run) {
      out.push(run);
      run = 0;
    }
  }
  if (run) out.push(run);
  return out;
}

/**
 * "Christmas Picross" - a classic nonogram. Clues tell how many filled squares run together.
 * Paint by tapping or dragging, mark with X (mode toggle, long-press or right-click).
 * Mistakes are allowed; the puzzle is won as soon as the filled squares match the picture,
 * which then blooms into full colour. Every shipped puzzle has a unique, line-solvable solution.
 */
@Component({
  selector: 'app-nonogram-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './nonogram-challenge.html',
  styleUrl: './nonogram-challenge.scss',
})
export class NonogramChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: NonogramConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  @ViewChild('wrap') wrapRef?: ElementRef<HTMLElement>;
  @ViewChild('grid') gridRef?: ElementRef<HTMLElement>;

  readonly Check = Check;
  readonly Lightbulb = Lightbulb;
  readonly RotateCcw = RotateCcw;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);
  private translate = inject(TranslateService);
  private zone = inject(NgZone);

  rows = 8;
  cols = 8;
  cells: Cell[] = [];
  state: CellState[] = [];
  rowClues: number[][] = [];
  colClues: number[][] = [];
  rowDone: boolean[] = [];
  colDone: boolean[] = [];
  maxRowClues = 1;
  maxColClues = 1;
  sep = 5;

  cellSize = 32;
  mode: 'fill' | 'x' = 'fill';
  won = false;
  seconds = 0;
  bestTime: number | null = null;
  hintsUsed = 0;
  wrong = new Set<number>();
  hinted: number | null = null;
  message = '';
  name = '';
  hoverR = -1;
  hoverC = -1;
  cursor = -1;
  justDone = new Set<string>();

  private started = false;
  private interval: ReturnType<typeof setInterval> | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private resizeObserver?: ResizeObserver;
  private langSub?: Subscription;
  private stroke: {
    id: number;
    tool: 1 | 2;
    target: CellState;
    start: number;
    startPrev: CellState;
    axis: 'r' | 'c' | null;
    last: number;
    longPress: ReturnType<typeof setTimeout> | null;
  } | null = null;

  get filledCount(): number {
    return this.state.filter((s) => s === 1).length;
  }

  get timeLabel(): string {
    return this.fmt(this.seconds);
  }

  fmt(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.load();
    const key = this.day ?? this.levelId;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestTime = stats?.bestTime ?? null;
    // First estimate before the container can be measured (the ResizeObserver refines it)
    this.cellSize = this.computeCell(Math.min(window.innerWidth - 32, 760));
    this.updateName();
    this.langSub = this.translate.onLangChange.subscribe(() => this.updateName());
  }

  ngAfterViewInit(): void {
    const wrap = this.wrapRef?.nativeElement;
    if (!wrap) return;
    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        const size = this.computeCell(wrap.clientWidth);
        if (size !== this.cellSize) this.zone.run(() => (this.cellSize = size));
      });
      this.resizeObserver.observe(wrap);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.langSub?.unsubscribe();
    if (this.interval) clearInterval(this.interval);
    this.timers.forEach(clearTimeout);
    if (this.stroke?.longPress) clearTimeout(this.stroke.longPress);
  }

  private load(): void {
    let puzzle = this.config?.puzzle?.length ? this.config.puzzle : DEFAULT_PUZZLE;
    let palette = this.config?.puzzle?.length ? this.config.palette : DEFAULT_PALETTE;
    const width = Math.max(...puzzle.map((r) => r.length));
    puzzle = puzzle.map((r) => r.padEnd(width, '.'));
    if (!puzzle.some((r) => r.includes('#'))) {
      puzzle = DEFAULT_PUZZLE;
      palette = DEFAULT_PALETTE;
    }
    const colors = { ...COLORS, ...(this.config?.colors ?? {}) };
    this.rows = puzzle.length;
    this.cols = width;
    this.sep = this.cols % 5 === 0 || this.cols > 8 ? 5 : 4;
    const cr = (this.rows - 1) / 2;
    const cc = (this.cols - 1) / 2;
    this.cells = [];
    puzzle.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        const letter = palette?.[r]?.[c];
        const color = letter && colors[letter] ? colors[letter] : (r + c) % 3 ? '#3fbf8f' : '#ffd166';
        this.cells.push({
          r,
          c,
          sol: ch === '#',
          color,
          delay: Math.round(Math.hypot(r - cr, c - cc) * 55),
        });
      })
    );
    const sol = (r: number, c: number) => this.cells[r * this.cols + c].sol;
    this.rowClues = Array.from({ length: this.rows }, (_, r) =>
      lineClues(Array.from({ length: this.cols }, (_, c) => sol(r, c)))
    );
    this.colClues = Array.from({ length: this.cols }, (_, c) =>
      lineClues(Array.from({ length: this.rows }, (_, r) => sol(r, c)))
    );
    this.maxRowClues = Math.max(1, ...this.rowClues.map((c) => c.length));
    this.maxColClues = Math.max(1, ...this.colClues.map((c) => c.length));
    this.state = this.cells.map(() => 0);
    this.updateDone(false);
  }

  private updateName(): void {
    const sv = (this.translate.currentLang || this.translate.defaultLang || 'sv') === 'sv';
    this.name = (sv ? this.config?.titleSv : this.config?.titleEn) ?? '';
    if (!this.config?.puzzle?.length) this.name = sv ? 'en julgran' : 'a Christmas tree';
  }

  /** Cells shrink to fit the width and the height left over for the board, clamped 20..48px */
  private computeCell(width: number): number {
    const clueW = 0.62;
    const fromW = (width - 12) / (this.cols + this.maxRowClues * clueW);
    const desktop = window.innerWidth >= 1024;
    const availH = desktop ? window.innerHeight * 0.9 - 390 : window.innerHeight - 360;
    const fromH = availH / (this.rows + this.maxColClues * clueW);
    return Math.max(20, Math.min(48, Math.floor(Math.min(fromW, fromH))));
  }

  // ---------------------------------------------------------------- input

  onPointerDown(e: PointerEvent): void {
    if (this.won) return;
    const idx = this.cellAt(e);
    if (idx < 0) return;
    e.preventDefault();
    this.gridRef?.nativeElement.setPointerCapture?.(e.pointerId);
    this.cursor = -1;
    const tool: 1 | 2 = e.button === 2 || this.mode === 'x' ? 2 : 1;
    const prev = this.state[idx];
    this.stroke = {
      id: e.pointerId,
      tool,
      target: prev === tool ? 0 : tool,
      start: idx,
      startPrev: prev,
      axis: null,
      last: idx,
      longPress: null,
    };
    this.apply(idx);
    if (e.pointerType !== 'mouse' && tool === 1) {
      const stroke = this.stroke;
      stroke.longPress = setTimeout(() => {
        if (this.stroke !== stroke || stroke.last !== stroke.start) return;
        // Long-press: this stroke marks X instead
        this.state[stroke.start] = stroke.startPrev;
        stroke.tool = 2;
        stroke.target = stroke.startPrev === 2 ? 0 : 2;
        this.apply(stroke.start);
        navigator.vibrate?.(15);
      }, 420);
    }
  }

  onPointerMove(e: PointerEvent): void {
    const idx = this.cellAt(e);
    const r = idx >= 0 ? Math.floor(idx / this.cols) : -1;
    const c = idx >= 0 ? idx % this.cols : -1;
    if (r !== this.hoverR || c !== this.hoverC) {
      this.hoverR = r;
      this.hoverC = c;
    }
    const s = this.stroke;
    if (!s || s.id !== e.pointerId || idx < 0 || idx === s.last) return;
    const sr = Math.floor(s.start / this.cols);
    const sc = s.start % this.cols;
    if (!s.axis) s.axis = Math.abs(r - sr) >= Math.abs(c - sc) ? 'c' : 'r';
    // Lock painting to the starting row or column, filling any skipped cells
    const tr = s.axis === 'r' ? sr : r;
    const tc = s.axis === 'c' ? sc : c;
    const target = tr * this.cols + tc;
    if (target === s.last) return;
    const lr = Math.floor(s.last / this.cols);
    const lc = s.last % this.cols;
    const steps = Math.max(Math.abs(tr - lr), Math.abs(tc - lc));
    for (let i = 1; i <= steps; i++) {
      const rr = lr + Math.sign(tr - lr) * i;
      const ccc = lc + Math.sign(tc - lc) * i;
      this.apply(rr * this.cols + ccc);
    }
    s.last = target;
  }

  onPointerUp(e: PointerEvent): void {
    if (!this.stroke || this.stroke.id !== e.pointerId) return;
    if (this.stroke.longPress) clearTimeout(this.stroke.longPress);
    this.stroke = null;
  }

  onPointerLeave(): void {
    if (!this.stroke) {
      this.hoverR = -1;
      this.hoverC = -1;
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (this.won) return;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (moves[e.key]) {
      e.preventDefault();
      if (this.cursor < 0) this.cursor = 0;
      else {
        const r = Math.min(this.rows - 1, Math.max(0, Math.floor(this.cursor / this.cols) + moves[e.key][0]));
        const c = Math.min(this.cols - 1, Math.max(0, (this.cursor % this.cols) + moves[e.key][1]));
        this.cursor = r * this.cols + c;
      }
      this.hoverR = Math.floor(this.cursor / this.cols);
      this.hoverC = this.cursor % this.cols;
    } else if (this.cursor >= 0 && (e.key === ' ' || e.key === 'Enter' || e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      const tool: 1 | 2 = e.key === 'x' || e.key === 'X' || this.mode === 'x' ? 2 : 1;
      this.stroke = null;
      const prev = this.state[this.cursor];
      this.setCell(this.cursor, prev === tool ? 0 : tool);
    }
  }

  private cellAt(e: PointerEvent): number {
    const grid = this.gridRef?.nativeElement;
    if (!grid) return -1;
    const rect = grid.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * this.cols);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * this.rows);
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return -1;
    return r * this.cols + c;
  }

  // ---------------------------------------------------------------- game

  private apply(idx: number): void {
    const s = this.stroke;
    if (!s) return;
    const cur = this.state[idx];
    if (s.target === 0) {
      if (cur === s.tool) this.setCell(idx, 0);
    } else if (cur === 0 || idx === s.start) {
      this.setCell(idx, s.target);
    }
  }

  private setCell(idx: number, value: CellState): void {
    if (this.won || this.state[idx] === value) return;
    this.startTimer();
    this.state[idx] = value;
    this.wrong.delete(idx);
    if (this.hinted === idx) this.hinted = null;
    const c = idx % this.cols;
    if (value === 1) this.sound.bell(NOTES[c % NOTES.length], 0.05);
    else this.sound.tap();
    this.updateDone(true);
    this.checkWin();
  }

  private updateDone(chime: boolean): void {
    const filled = (r: number, c: number) => this.state[r * this.cols + c] === 1;
    const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
    const rowDone = this.rowClues.map((clue, r) =>
      same(clue, lineClues(Array.from({ length: this.cols }, (_, c) => filled(r, c))))
    );
    const colDone = this.colClues.map((clue, c) =>
      same(clue, lineClues(Array.from({ length: this.rows }, (_, r) => filled(r, c))))
    );
    if (chime) {
      const newly: string[] = [];
      rowDone.forEach((d, i) => d && !this.rowDone[i] && newly.push('r' + i));
      colDone.forEach((d, i) => d && !this.colDone[i] && newly.push('c' + i));
      if (newly.length) {
        this.sound.bell(1567.98, 0.06, 0.05);
        newly.forEach((k) => this.justDone.add(k));
        this.later(() => newly.forEach((k) => this.justDone.delete(k)), 600);
      }
    }
    this.rowDone = rowDone;
    this.colDone = colDone;
  }

  private checkWin(): void {
    if (this.cells.every((cell, i) => cell.sol === (this.state[i] === 1))) this.onWin();
  }

  private onWin(): void {
    this.won = true;
    this.stroke = null;
    this.cursor = -1;
    this.hoverR = -1;
    this.hoverC = -1;
    this.message = '';
    this.wrong.clear();
    this.hinted = null;
    if (this.interval) clearInterval(this.interval);
    this.sound.fanfare();
    const key = this.day ?? this.levelId;
    if (key) {
      const best = this.bestTime === null ? this.seconds : Math.min(this.bestTime, this.seconds);
      this.bestTime = best;
      this.stateService.saveGameStats(key, { bestTime: best, hintsUsed: this.hintsUsed });
    }
    this.later(() => this.completed.emit(), 2200);
  }

  private startTimer(): void {
    if (this.started) return;
    this.started = true;
    this.zone.runOutsideAngular(() => {
      this.interval = setInterval(() => {
        if (document.hidden || this.won) return;
        this.zone.run(() => this.seconds++);
      }, 1000);
    });
  }

  setMode(mode: 'fill' | 'x'): void {
    this.mode = mode;
  }

  /** Flash mistakes if there are any, otherwise fill in one correct square */
  showHint(): void {
    if (this.won) return;
    this.hintsUsed++;
    const wrong = this.cells
      .map((cell, i) => ({ cell, i }))
      .filter(({ cell, i }) => (this.state[i] === 1 && !cell.sol) || (this.state[i] === 2 && cell.sol))
      .map(({ i }) => i);
    if (wrong.length) {
      this.wrong = new Set(wrong);
      this.message = this.translate.instant('challenges.nonogram.mistakes', { count: wrong.length });
      this.sound.thud();
      this.later(() => (this.wrong = new Set()), 2400);
      this.clearMessageLater();
      return;
    }
    // Prefer a square in the line closest to being finished
    const missing = this.cells.map((cell, i) => ({ cell, i })).filter(({ cell, i }) => cell.sol && this.state[i] !== 1);
    if (!missing.length) return;
    const left = (r: number) => missing.filter(({ cell }) => cell.r === r).length;
    missing.sort((a, b) => left(a.cell.r) - left(b.cell.r));
    const pick = missing[0].i;
    this.message = this.translate.instant('challenges.nonogram.revealed');
    this.clearMessageLater();
    this.stroke = null;
    this.setCell(pick, 1);
    if (!this.won) {
      this.hinted = pick;
      this.later(() => {
        if (this.hinted === pick) this.hinted = null;
      }, 1600);
    }
  }

  reset(): void {
    if (this.won) {
      this.won = false;
      this.timers.forEach(clearTimeout);
      this.timers = [];
    }
    this.state = this.cells.map(() => 0);
    this.wrong = new Set();
    this.hinted = null;
    this.message = '';
    this.updateDone(false);
  }

  showReward(): void {
    this.completed.emit();
  }

  private clearMessageLater(): void {
    const msg = this.message;
    this.later(() => {
      if (this.message === msg) this.message = '';
    }, 3200);
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  // ---------------------------------------------------------------- template helpers

  isSepRight(c: number): boolean {
    return (c + 1) % this.sep === 0 && c < this.cols - 1;
  }

  isSepBottom(r: number): boolean {
    return (r + 1) % this.sep === 0 && r < this.rows - 1;
  }

  clueOrZero(clue: number[]): number[] {
    return clue.length ? clue : [0];
  }
}
