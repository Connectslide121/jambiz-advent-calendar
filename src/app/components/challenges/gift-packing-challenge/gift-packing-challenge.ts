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
  cell(index: number): void {
    if (this.won) return;
    this.cursor = index;
    const occupant = this.board[index];
    const x = index % 5,
      y = Math.floor(index / 5),
      shape = this.selected < 0 ? [] : this.shape(this.selected);
    if (this.selected < 0 || !packingFits(this.board, shape, x, y)) {
      if (occupant >= 0) {
        this.remove(occupant);
        this.selected = occupant;
        return;
      }
      if (this.selected >= 0) {
        this.message('challenges.giftPacking.noFit');
        this.sound.thud();
      }
      return;
    }
    const id = this.selected;
    for (const [dx, dy] of shape) this.board[(y + dy) * 5 + x + dx] = id;
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
    } else if (
      (e.key === 'Enter' || e.key === ' ') &&
      !(e.target as HTMLElement)?.closest('button')
    ) {
      e.preventDefault();
      this.cell(this.cursor);
    }
  }
}
