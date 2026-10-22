import { Component, HostListener, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
@Component({
  selector: 'app-snow-globe-jigsaw-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './snow-globe-jigsaw-challenge.html',
  styleUrls: ['../shared/game-board.scss', './snow-globe-jigsaw-challenge.scss'],
})
export class SnowGlobeJigsawChallenge extends SeasonalGame implements OnInit {
  readonly slots = Array.from({ length: 9 }, (_, i) => i);
  readonly order = [5, 0, 7, 3, 8, 1, 6, 2, 4];
  readonly image = 'assets/games/snow-globe-jigsaw.svg';
  board: number[] = [];
  rotations: number[] = [];
  selected = -1;
  moves = 0;
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase();
    this.board = Array(9).fill(-1);
    this.rotations = this.slots.map((i) => (i * 3 + 1) % 4);
    this.selected = -1;
    this.moves = 0;
  }
  get available(): number[] {
    return this.order.filter((id) => !this.board.includes(id));
  }
  get assembled(): number {
    return this.board.filter((id, i) => id === i && this.rotations[id] === 0).length;
  }
  position(id: number): string {
    return (id % 3) * 50 + '% ' + Math.floor(id / 3) * 50 + '%';
  }
  /** Snowflakes drifting inside the glass */
  readonly flakes = Array.from({ length: 18 }, (_, i) => ({
    x: 6 + ((i * 37) % 88),
    delay: -((i * 0.77) % 6),
    size: 3 + (i % 3) * 2,
  }));
  select(id: number): void {
    if (this.won) return;
    // Tapping the selected piece again turns it
    if (this.selected === id) {
      this.rotate();
      return;
    }
    this.selected = id;
    this.sound.tap();
  }
  rotate(): void {
    if (this.selected < 0 || this.won) return;
    this.rotations[this.selected] = (this.rotations[this.selected] + 1) % 4;
    this.moves++;
    this.sound.tap();
  }
  place(slot: number): void {
    if (this.won) return;
    const old = this.board[slot];
    if (this.selected < 0) {
      if (old >= 0) {
        this.board[slot] = -1;
        this.selected = old;
        this.moves++;
        this.sound.tap();
      }
      return;
    }
    this.board[slot] = this.selected;
    this.selected = old;
    this.moves++;
    this.sound.bonk(400 + slot * 35);
    if (this.assembled === 9) this.finish(3000 - this.moves * 25, { moves: this.moves });
  }
  @HostListener('document:keydown', ['$event']) onKey(e: KeyboardEvent): void {
    if (this.gameKey(e) && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      this.rotate();
    }
  }
}
