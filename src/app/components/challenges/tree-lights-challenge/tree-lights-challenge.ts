import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Lightbulb, RotateCcw } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface TreeLightsConfig {
  rows?: number; // Rows of bulbs (row n has n + 1 bulbs). Default 5
  scrambleTaps?: number; // How many random taps scramble the tree. Default 5
}

interface Bulb {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  lit: boolean;
  color: string;
}

const COLORS = ['#ff5a6e', '#f7c873', '#5cf2b3', '#7fb8ff', '#d58bff', '#ff9f43'];
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

/**
 * "Light up the tree" - a lights-out puzzle on a triangular Christmas tree.
 * Tapping a bulb toggles it and its neighbours. Light every bulb to win.
 *
 * The puzzle is made by scrambling a fully lit tree with random taps, so it is always
 * solvable, and pressing the same bulbs again solves it - which also powers the hint.
 */
@Component({
  selector: 'app-tree-lights-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './tree-lights-challenge.html',
  styleUrl: './tree-lights-challenge.scss',
})
export class TreeLightsChallenge implements OnInit, OnDestroy {
  @Input() config: TreeLightsConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  /** Calendar day or extras level id, used to store best results */
  private get statsKey(): number | string | undefined {
    return this.day ?? this.levelId;
  }

  readonly Check = Check;
  readonly Lightbulb = Lightbulb;
  readonly RotateCcw = RotateCcw;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);

  bulbs: Bulb[] = [];
  moves = 0;
  won = false;
  hintId: number | null = null;
  bestMoves: number | null = null;
  rippleId: number | null = null;

  private rows = 5;
  private initialLit: boolean[] = [];
  private initialSolution = new Set<number>();
  /** Bulbs that still need one press to solve from the current state */
  private solution = new Set<number>();
  private winTimer: ReturnType<typeof setTimeout> | null = null;

  /** SVG viewBox grows with the number of rows */
  get viewHeight(): number {
    return 70 + this.rows * 52 + 50;
  }

  get halfWidth(): number {
    return 30 + this.rows * 26;
  }

  get viewWidth(): number {
    return this.halfWidth * 2 + 20;
  }

  get centerX(): number {
    return this.viewWidth / 2;
  }

  get litCount(): number {
    return this.bulbs.filter((b) => b.lit).length;
  }

  ngOnInit(): void {
    this.rows = Math.max(3, Math.min(7, this.config?.rows ?? 5));
    const stats = this.statsKey ? this.stateService.getGameStats(this.statsKey) : null;
    this.bestMoves = stats?.bestMoves ?? null;
    this.newPuzzle();
  }

  ngOnDestroy(): void {
    if (this.winTimer) clearTimeout(this.winTimer);
  }

  /** Tree outline path, scaled to the number of rows */
  get treePath(): string {
    const top = 34;
    const bottom = 70 + (this.rows - 1) * 52 + 40;
    const c = this.centerX;
    return `M${c} ${top} L${c + this.halfWidth} ${bottom} L${c - this.halfWidth} ${bottom} Z`;
  }

  get trunkY(): number {
    return 70 + (this.rows - 1) * 52 + 40;
  }

  press(bulb: Bulb): void {
    if (this.won) return;
    this.hintId = null;
    this.moves++;
    this.rippleId = bulb.id;
    setTimeout(() => {
      if (this.rippleId === bulb.id) this.rippleId = null;
    }, 400);
    this.toggleAround(bulb);
    // Pressing a bulb twice cancels out, so the remaining solution flips membership
    if (this.solution.has(bulb.id)) this.solution.delete(bulb.id);
    else this.solution.add(bulb.id);

    this.sound.bell(NOTES[(bulb.row + bulb.col) % NOTES.length], 0.14);

    if (this.bulbs.every((b) => b.lit)) {
      this.onWin();
    }
  }

  showHint(): void {
    if (this.won) return;
    const next = [...this.solution][0];
    this.hintId = next ?? null;
  }

  /** Back to the starting position of this puzzle */
  restart(): void {
    this.bulbs.forEach((b, i) => (b.lit = this.initialLit[i]));
    this.solution = new Set(this.initialSolution);
    this.moves = 0;
    this.won = false;
    this.hintId = null;
  }

  newPuzzle(): void {
    if (this.winTimer) clearTimeout(this.winTimer);
    this.won = false;
    this.moves = 0;
    this.hintId = null;
    this.bulbs = this.buildBulbs();

    const taps = Math.max(2, Math.min(this.bulbs.length - 1, this.config?.scrambleTaps ?? 5));
    do {
      this.bulbs.forEach((b) => (b.lit = true));
      this.solution.clear();
      const ids = this.bulbs.map((b) => b.id).sort(() => Math.random() - 0.5);
      for (const id of ids.slice(0, taps)) {
        this.toggleAround(this.bulbs[id]);
        this.solution.add(id);
      }
    } while (this.bulbs.every((b) => b.lit));

    this.initialLit = this.bulbs.map((b) => b.lit);
    this.initialSolution = new Set(this.solution);
  }

  showReward(): void {
    this.completed.emit();
  }

  private onWin(): void {
    this.won = true;
    this.sound.fanfare();
    if (this.statsKey) {
      const best = this.bestMoves === null ? this.moves : Math.min(this.bestMoves, this.moves);
      this.bestMoves = best;
      this.stateService.saveGameStats(this.statsKey, { bestMoves: best });
    }
    // Let the star light up before the reward slides in
    this.winTimer = setTimeout(() => this.completed.emit(), 1800);
  }

  private toggleAround(bulb: Bulb): void {
    for (const b of this.neighbours(bulb)) {
      b.lit = !b.lit;
    }
  }

  /** The bulb itself and its triangular-lattice neighbours */
  private neighbours(bulb: Bulb): Bulb[] {
    const { row, col } = bulb;
    const coords = [
      [row, col],
      [row, col - 1],
      [row, col + 1],
      [row - 1, col - 1],
      [row - 1, col],
      [row + 1, col],
      [row + 1, col + 1],
    ];
    return coords
      .map(([r, c]) => this.bulbs.find((b) => b.row === r && b.col === c))
      .filter((b): b is Bulb => !!b);
  }

  private buildBulbs(): Bulb[] {
    const bulbs: Bulb[] = [];
    let id = 0;
    for (let row = 0; row < this.rows; row++) {
      const count = row + 1;
      const spacing = 58;
      for (let col = 0; col < count; col++) {
        bulbs.push({
          id: id,
          row,
          col,
          x: this.centerX + (col - (count - 1) / 2) * spacing,
          y: 70 + row * 52,
          lit: true,
          color: COLORS[(row * 2 + col) % COLORS.length],
        });
        id++;
      }
    }
    return bulbs;
  }
}
