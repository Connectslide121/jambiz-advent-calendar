import { Component, HostListener, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
export type Cell = [number, number];
export const PACKING_PIECES: Cell[][] = [
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
  ],
];
export const PACKING_SOLUTION = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 0, y: 2 },
  { x: 3, y: 2 },
  { x: 1, y: 3 },
  { x: 2, y: 4 },
];
export function rotateCells(cells: Cell[], turns: number): Cell[] {
  let result = cells.map((c) => [...c] as Cell);
  for (let i = 0; i < turns % 4; i++) {
    result = result.map(([x, y]) => [-y, x]);
    const minX = Math.min(...result.map((c) => c[0]));
    const minY = Math.min(...result.map((c) => c[1]));
    result = result.map(([x, y]) => [x - minX, y - minY]);
  }
  return result;
}
export function packingFits(board: number[], cells: Cell[], x: number, y: number): boolean {
  return cells.every(
    ([dx, dy]) =>
      x + dx >= 0 && x + dx < 5 && y + dy >= 0 && y + dy < 5 && board[(y + dy) * 5 + x + dx] === -1
  );
}
export interface PackingPlacement {
  x: number;
  y: number;
  cells: number[];
  fits: boolean;
}
/**
 * Where a piece lands when the player points at a square: one of the piece's own cells goes on
 * that square (never the empty corner of its bounding box). The top-left cell is tried first,
 * then the others, so pointing at any hole the piece fits into works.
 */
export function packingPlacement(board: number[], shape: Cell[], index: number): PackingPlacement {
  const px = index % 5,
    py = Math.floor(index / 5);
  const anchors = [...shape].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const at = ([ax, ay]: Cell) => {
    const x = px - ax,
      y = py - ay;
    return {
      x,
      y,
      cells: shape
        .map(([dx, dy]) => [x + dx, y + dy])
        .filter(([cx, cy]) => cx >= 0 && cx < 5 && cy >= 0 && cy < 5)
        .map(([cx, cy]) => cy * 5 + cx),
      fits: packingFits(board, shape, x, y),
    };
  };
  for (const anchor of anchors) {
    const placement = at(anchor);
    if (placement.fits) return placement;
  }
  return at(anchors[0]);
}
@Component({
  selector: 'app-gift-packing-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './gift-packing-challenge.html',
  styleUrls: ['../shared/game-board.scss', './gift-packing-challenge.scss'],
})
export class GiftPackingChallenge extends SeasonalGame implements OnInit {
  readonly pieces = PACKING_PIECES;
  readonly cells = Array.from({ length: 25 }, (_, i) => i);
  board: number[] = [];
  rotations: number[] = [];
  placed = new Set<number>();
  selected = 0;
  cursor = 0;
  moves = 0;
  history: number[] = [];
  /** Square the pointer (or keyboard cursor) is on, for the ghost preview */
  hover: number | null = null;
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase();
    this.board = Array(25).fill(-1);
    this.rotations = this.pieces.map((_, i) => i % 4);
    this.placed.clear();
    this.selected = 0;
    this.cursor = 0;
    this.moves = 0;
    this.history = [];
    this.hover = null;
  }
  shape(id: number): Cell[] {
    return rotateCells(this.pieces[id], this.rotations[id]);
  }
  select(id: number): void {
    if (!this.won && !this.placed.has(id)) {
      this.selected = id;
      this.sound.tap();
    }
  }
  rotate(): void {
    if (!this.won && this.selected >= 0) {
      this.rotations[this.selected] = (this.rotations[this.selected] + 1) % 4;
      this.sound.tap();
    }
  }
  /** Ghost of the selected present on the hovered empty square */
  get ghost(): PackingPlacement | null {
    const index = this.hover;
    if (index === null || this.won || this.selected < 0 || this.board[index] >= 0) return null;
    return packingPlacement(this.board, this.shape(this.selected), index);
  }
  /** Sides where a packed square continues into the same present, so it reads as one box */
  joins(index: number): string {
    const id = this.board[index];
    if (id < 0) return '';
    const x = index % 5;
    const same = (i: number) => this.board[i] === id;
    return [
      x < 4 && same(index + 1) ? 'join-r' : '',
      index < 20 && same(index + 5) ? 'join-b' : '',
      // Fill the gap crossing inside a 2×2 block of the same present
      x < 4 && index < 20 && same(index + 1) && same(index + 5) && same(index + 6) ? 'join-d' : '',
    ].join(' ');
  }
  /** The bow sits on each present's top-left square */
  hasBow(index: number): boolean {
    const id = this.board[index];
    return id >= 0 && this.board.indexOf(id) === index;
  }
  isGhost(index: number): boolean {
    return !!this.ghost?.cells.includes(index);
  }
  point(index: number): void {
    this.hover = index;
    this.cursor = index;
  }
  cell(index: number): void {
    if (this.won) return;
    this.cursor = index;
    const occupant = this.board[index];
    // A packed present is picked up again
    if (occupant >= 0) {
      this.remove(occupant);
      this.selected = occupant;
      return;
    }
    if (this.selected < 0) return;
    const placement = packingPlacement(this.board, this.shape(this.selected), index);
    if (!placement.fits) {
      this.message('challenges.giftPacking.noFit');
      this.sound.thud();
      return;
    }
    const id = this.selected;
    for (const i of placement.cells) this.board[i] = id;
    this.placed.add(id);
    this.history.push(id);
    this.moves++;
    this.status = '';
    this.sound.bonk(320 + id * 30);
    this.selected = this.pieces.findIndex((_, i) => !this.placed.has(i));
    if (this.board.every((value) => value >= 0))
      this.finish(2500 - this.moves * 25, { moves: this.moves });
  }
  remove(id: number): void {
    this.board = this.board.map((value) => (value === id ? -1 : value));
    this.placed.delete(id);
    this.history = this.history.filter((value) => value !== id);
    this.sound.tap();
  }
  undo(): void {
    if (this.won) return;
    const id = this.history.at(-1);
    if (id !== undefined) {
      this.remove(id);
      this.selected = id;
      this.moves++;
    }
  }
  @HostListener('document:keydown', ['$event']) onKey(e: KeyboardEvent): void {
    if (!this.gameKey(e) || this.won) return;
    if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      this.rotate();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      this.undo();
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const delta: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -5,
        ArrowDown: 5,
      };
      this.cursor = Math.max(0, Math.min(24, this.cursor + delta[e.key]));
      this.hover = this.cursor;
    } else if (
      (e.key === 'Enter' || e.key === ' ') &&
      !(e.target as HTMLElement)?.closest('button')
    ) {
      e.preventDefault();
      this.cell(this.cursor);
    }
  }
}
