import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Lightbulb, RotateCcw } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface LightPathConfig {
  cols?: number; // Grid width (3–8). Default 5
  rows?: number; // Grid height (3–9). Default 5
  targets?: number; // Houses/trees that need power. Default 3
  seed?: number; // Optional seed for a fixed puzzle
}

type Role = 'none' | 'source' | 'house' | 'tree';

interface Tile {
  id: number;
  c: number;
  r: number;
  /** Connection mask of the solved tile (N=1, E=2, S=4, W=8) */
  sol: number;
  /** Clockwise quarter turns applied so far (never wrapped, so the CSS rotation always turns forward) */
  rot: number;
  /** Arms drawn in the rotating layer, as angles in degrees (0 = north) */
  arms: number[];
  powered: boolean;
  role: Role;
  variant: number;
  /** Distance from the power source along the solution tree - drives the win cascade */
  dist: number;
  /** Parent towards the source in the solution tree (for hints) */
  parent: number;
  spinning: boolean;
}

const N = 1;
const E = 2;
const S = 4;
const W = 8;
const DIRS = [
  { bit: N, dc: 0, dr: -1, opp: S, angle: 0 },
  { bit: E, dc: 1, dr: 0, opp: W, angle: 90 },
  { bit: S, dc: 0, dr: 1, opp: N, angle: 180 },
  { bit: W, dc: -1, dr: 0, opp: E, angle: 270 },
];
const BULB_COLORS = ['#ff5a6e', '#f7c873', '#5cf2b3', '#7fb8ff', '#ffb36b', '#d58bff'];
const HOUSE_COLORS = [
  { wall: '#b8323f', dark: '#7c1d2a' },
  { wall: '#2f6f9e', dark: '#1d4766' },
  { wall: '#c2873a', dark: '#87561f' },
  { wall: '#3a8f6c', dark: '#215a43' },
];
const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];

/** Rotate a connection mask clockwise by k quarter turns */
function rotateMask(mask: number, k: number): number {
  let m = mask;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * "Light the Village" - rotate string-light tiles so the power from the cosy cabin
 * reaches every house and tree.
 *
 * The wiring is a random spanning tree over the whole grid, so the puzzle is always solvable;
 * the tiles are then turned randomly. Power is a flood fill from the cabin through tiles
 * whose wires meet on both sides.
 */
@Component({
  selector: 'app-light-path-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './light-path-challenge.html',
  styleUrl: './light-path-challenge.scss',
})
export class LightPathChallenge implements OnInit, OnDestroy {
  @Input() config: LightPathConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  readonly Check = Check;
  readonly Lightbulb = Lightbulb;
  readonly RotateCcw = RotateCcw;
  readonly CELL = 100;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);

  cols = 5;
  rows = 5;
  tiles: Tile[] = [];
  moves = 0;
  won = false;
  bestMoves: number | null = null;
  hintId: number | null = null;
  targetCount = 3;
  poweredTargets = 0;
  /** Falling snow flakes (static data, animated in CSS) */
  flakes: { x: number; size: number; delay: number; dur: number; drift: number }[] = [];
  stars: { x: number; y: number; r: number; d: number }[] = [];

  private startRot: number[] = [];
  private rng: () => number = Math.random;
  private seed?: number;
  private timers: ReturnType<typeof setTimeout>[] = [];

  get viewW(): number {
    return this.cols * this.CELL;
  }

  get viewH(): number {
    return this.rows * this.CELL;
  }

  get ratio(): number {
    return this.cols / this.rows;
  }

  ngOnInit(): void {
    this.cols = Math.max(3, Math.min(8, Math.round(this.config?.cols ?? 5)));
    this.rows = Math.max(3, Math.min(9, Math.round(this.config?.rows ?? 5)));
    const maxTargets = Math.max(1, Math.floor((this.cols * this.rows) / 5));
    this.targetCount = Math.max(1, Math.min(maxTargets, Math.round(this.config?.targets ?? 3)));
    this.seed = this.config?.seed;
    const key = this.statsKey;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestMoves = stats?.bestMoves ?? null;
    this.flakes = Array.from({ length: 28 }, () => ({
      x: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: -Math.random() * 12,
      dur: 7 + Math.random() * 8,
      drift: (Math.random() - 0.5) * 40,
    }));
    this.newPuzzle();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private get statsKey(): number | string | undefined {
    // `||` rather than `??`: some hosts pass day 0 for extras
    return this.day || this.levelId;
  }

  // ---------------------------------------------------------------- actions

  rotate(tile: Tile): void {
    if (this.won) return;
    this.hintId = null;
    tile.rot++;
    this.moves++;
    this.spin(tile);
    const before = this.poweredTargets;
    this.updatePower();
    if (tile.powered) {
      this.sound.bell(NOTES[Math.min(NOTES.length - 1, tile.dist)], 0.08);
    }
    if (this.poweredTargets > before) {
      this.sound.bell(1318.51, 0.12, 0.05);
    }
    this.checkWin();
  }

  showHint(): void {
    if (this.won) return;
    const tile = this.findHintTile();
    if (!tile) return;
    this.hintId = tile.id;
    this.later(() => {
      if (this.won || this.hintId !== tile.id) return;
      let k = 1;
      while (k < 4 && rotateMask(tile.sol, tile.rot + k) !== tile.sol) k++;
      tile.rot += k;
      this.spin(tile);
      this.updatePower();
      this.sound.bell(1046.5, 0.1);
      this.later(() => {
        if (this.hintId === tile.id) this.hintId = null;
      }, 500);
      this.checkWin();
    }, 450);
  }

  restart(): void {
    this.clearTimers();
    this.won = false;
    this.moves = 0;
    this.hintId = null;
    this.tiles.forEach((t, i) => {
      // Keep turning forward so the reset animates nicely
      const target = this.startRot[i] % 4;
      const cur = t.rot % 4;
      t.rot += (target - cur + 4) % 4;
    });
    this.updatePower();
  }

  newPuzzle(): void {
    this.clearTimers();
    this.rng = this.seed !== undefined ? mulberry32(this.seed) : Math.random;
    if (this.seed !== undefined) this.seed++;
    this.won = false;
    this.moves = 0;
    this.hintId = null;
    this.generate();
    this.stars = Array.from({ length: 18 }, () => ({
      x: Math.random() * this.viewW,
      y: Math.random() * this.viewH,
      r: 0.8 + Math.random() * 1.6,
      d: Math.random() * 4,
    }));
  }

  showReward(): void {
    this.completed.emit();
  }

  onTileKey(event: KeyboardEvent, tile: Tile): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.rotate(tile);
      return;
    }
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const d = moves[event.key];
    if (!d) return;
    event.preventDefault();
    const c = Math.max(0, Math.min(this.cols - 1, tile.c + d[0]));
    const r = Math.max(0, Math.min(this.rows - 1, tile.r + d[1]));
    const el = document.querySelector<SVGGElement>(`[data-tile="${r * this.cols + c}"]`);
    el?.focus();
  }

  // ---------------------------------------------------------------- template helpers

  bulbColor(tile: Tile, arm: number): string {
    return BULB_COLORS[(tile.c * 3 + tile.r * 5 + arm) % BULB_COLORS.length];
  }

  twinkleDelay(tile: Tile, arm: number): string {
    return `${((tile.c * 7 + tile.r * 13 + arm * 5) % 17) * 0.13}s`;
  }

  cascadeDelay(tile: Tile): string {
    return `${tile.dist * 0.07}s`;
  }

  houseColor(tile: Tile): { wall: string; dark: string } {
    return HOUSE_COLORS[tile.variant % HOUSE_COLORS.length];
  }

  // ---------------------------------------------------------------- puzzle generation

  private generate(): void {
    const cols = this.cols;
    const rows = this.rows;
    const count = cols * rows;
    const rand = this.rng;

    let best: { masks: number[]; source: number; targets: number[] } | null = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      const masks = this.spanningTree(cols, rows, rand);
      // Source near the middle so the light spreads out evenly
      const sc = Math.floor(cols / 2) + (cols % 2 === 0 && rand() < 0.5 ? -1 : 0);
      const sr = Math.floor(rows / 2) + (rows % 2 === 0 && rand() < 0.5 ? -1 : 0);
      const source = sr * cols + sc;
      const targets = this.pickTargets(masks, source);
      if (!best || targets.length > best.targets.length) best = { masks, source, targets };
      if (targets.length >= this.targetCount) break;
    }
    const { masks, source, targets } = best!;
    const { dist, parent } = this.treeDistances(masks, source);

    this.tiles = Array.from({ length: count }, (_, id) => {
      const sol = masks[id];
      return {
        id,
        c: id % cols,
        r: Math.floor(id / cols),
        sol,
        rot: 0,
        arms: DIRS.filter((d) => sol & d.bit).map((d) => d.angle),
        powered: false,
        role: 'none' as Role,
        variant: 0,
        dist: dist[id],
        parent: parent[id],
        spinning: false,
      };
    });
    this.tiles[source].role = 'source';
    targets.forEach((t, i) => {
      // Mostly houses, with a lit-up Christmas tree every third target
      this.tiles[t].role = i % 3 === 1 ? 'tree' : 'house';
      this.tiles[t].variant = i;
    });

    // Scramble: turn every tile randomly, but make sure there is real work to do
    for (let tries = 0; tries < 50; tries++) {
      for (const t of this.tiles) t.rot = Math.floor(rand() * 4);
      const wrong = this.tiles.filter((t) => rotateMask(t.sol, t.rot) !== t.sol).length;
      this.updatePower();
      if (wrong >= Math.ceil(count * 0.55) && this.poweredTargets < this.targetCount) break;
    }
    this.startRot = this.tiles.map((t) => t.rot);
  }

  /** Random spanning tree (randomised Kruskal) - lots of branches, so plenty of T pieces */
  private spanningTree(cols: number, rows: number, rand: () => number): number[] {
    const count = cols * rows;
    const parent = Array.from({ length: count }, (_, i) => i);
    const find = (x: number): number => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const edges: [number, number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = r * cols + c;
        if (c < cols - 1) edges.push([id, id + 1, E]);
        if (r < rows - 1) edges.push([id, id + cols, S]);
      }
    }
    for (let i = edges.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [edges[i], edges[j]] = [edges[j], edges[i]];
    }
    const masks = new Array(count).fill(0);
    for (const [a, b, dir] of edges) {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) continue;
      // Avoid four-way crossings in small grids - they never need turning, so they are free
      const opp = dir === E ? W : N;
      if (rotateMask(masks[a] | dir, 0) === 15 || (masks[b] | opp) === 15) {
        if (rand() < 0.85) continue;
      }
      parent[ra] = rb;
      masks[a] |= dir;
      masks[b] |= opp;
    }
    // Skipped crossings may leave the forest split - join the remaining parts
    for (const [a, b, dir] of edges) {
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) continue;
      parent[ra] = rb;
      masks[a] |= dir;
      masks[b] |= dir === E ? W : N;
    }
    return masks;
  }

  private treeDistances(masks: number[], source: number): { dist: number[]; parent: number[] } {
    const dist = new Array(masks.length).fill(-1);
    const parent = new Array(masks.length).fill(-1);
    dist[source] = 0;
    const queue = [source];
    while (queue.length) {
      const id = queue.shift()!;
      const c = id % this.cols;
      const r = Math.floor(id / this.cols);
      for (const d of DIRS) {
        if (!(masks[id] & d.bit)) continue;
        const nc = c + d.dc;
        const nr = r + d.dr;
        const nid = nr * this.cols + nc;
        if (dist[nid] !== -1) continue;
        dist[nid] = dist[id] + 1;
        parent[nid] = id;
        queue.push(nid);
      }
    }
    return { dist, parent };
  }

  /** Targets sit on dead ends of the wiring, spread out and away from the cabin */
  private pickTargets(masks: number[], source: number): number[] {
    const { dist } = this.treeDistances(masks, source);
    const pos = (id: number) => [id % this.cols, Math.floor(id / this.cols)];
    const manhattan = (a: number, b: number) => {
      const [ac, ar] = pos(a);
      const [bc, br] = pos(b);
      return Math.abs(ac - bc) + Math.abs(ar - br);
    };
    const bits = (m: number) => ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1));
    let candidates = masks
      .map((m, id) => id)
      .filter((id) => id !== source && bits(masks[id]) === 1 && manhattan(id, source) >= 2);
    const chosen: number[] = [];
    while (chosen.length < this.targetCount) {
      if (!candidates.length) {
        // Not enough dead ends - fall back to any far-away tile
        candidates = masks
          .map((_, id) => id)
          .filter((id) => id !== source && !chosen.includes(id) && manhattan(id, source) >= 2);
        if (!candidates.length) break;
      }
      let bestId = candidates[0];
      let bestScore = -Infinity;
      for (const id of candidates) {
        const spread = Math.min(...[source, ...chosen].map((o) => manhattan(id, o)));
        const score = spread * 3 + dist[id] + this.rng() * 1.5;
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
      chosen.push(bestId);
      candidates = candidates.filter((id) => id !== bestId && manhattan(id, bestId) >= 2);
    }
    return chosen;
  }

  // ---------------------------------------------------------------- power & win

  private updatePower(): void {
    for (const t of this.tiles) t.powered = false;
    const source = this.tiles.find((t) => t.role === 'source');
    if (!source) return;
    source.powered = true;
    const queue = [source];
    while (queue.length) {
      const t = queue.shift()!;
      const mask = rotateMask(t.sol, t.rot);
      for (const d of DIRS) {
        if (!(mask & d.bit)) continue;
        const nc = t.c + d.dc;
        const nr = t.r + d.dr;
        if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
        const n = this.tiles[nr * this.cols + nc];
        if (n.powered) continue;
        if (!(rotateMask(n.sol, n.rot) & d.opp)) continue;
        n.powered = true;
        queue.push(n);
      }
    }
    this.poweredTargets = this.tiles.filter(
      (t) => (t.role === 'house' || t.role === 'tree') && t.powered
    ).length;
  }

  private checkWin(): void {
    if (this.won || this.poweredTargets < this.targetCount) return;
    this.won = true;
    this.hintId = null;
    // Snap the remaining strands into place so the whole village lights up
    this.later(() => {
      for (const t of this.tiles) {
        let k = 0;
        while (k < 4 && rotateMask(t.sol, t.rot + k) !== t.sol) k++;
        if (k > 0 && k < 4) {
          t.rot += k;
          this.spin(t);
        }
      }
      this.updatePower();
    }, 250);
    this.later(() => this.sound.fanfare(), 200);

    const key = this.statsKey;
    if (key) {
      const best = this.bestMoves === null ? this.moves : Math.min(this.bestMoves, this.moves);
      this.bestMoves = best;
      this.stateService.saveGameStats(key, { bestMoves: best });
    }
    this.later(() => this.completed.emit(), 2300);
  }

  private findHintTile(): Tile | null {
    const wrong = (t: Tile) => rotateMask(t.sol, t.rot) !== t.sol;
    const onPath = new Set<number>();
    for (const t of this.tiles) {
      if ((t.role === 'house' || t.role === 'tree') && !t.powered) {
        let id = t.id;
        while (id !== -1) {
          onPath.add(id);
          id = this.tiles[id].parent;
        }
      }
    }
    const pathWrong = this.tiles
      .filter((t) => onPath.has(t.id) && wrong(t))
      .sort((a, b) => a.dist - b.dist);
    if (pathWrong.length) return pathWrong[0];
    return this.tiles.find(wrong) ?? null;
  }

  private spin(tile: Tile): void {
    tile.spinning = true;
    this.later(() => (tile.spinning = false), 260);
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
