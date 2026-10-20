import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
export function detectiveClues(elves: number[], gifts: number[], treats: number[]): boolean[] {
  const e = (id: number) => elves.indexOf(id),
    g = (id: number) => gifts.indexOf(id);
  return [
    elves[2] === 0,
    e(1) >= 0 && e(3) >= 0 && e(1) < e(3),
    e(2) >= 0 && e(0) >= 0 && Math.abs(e(2) - e(0)) === 1,
    e(3) > 0 && e(3) < 3,
    gifts[0] === 2,
    g(0) >= 0 && g(0) + 1 === g(3),
    g(1) >= 0 && g(1) === e(2),
    e(1) >= 0 && treats[e(1)] === 1,
    g(0) >= 0 && treats[g(0)] === 3,
    treats[2] === 0,
  ];
}
@Component({
  selector: 'app-christmas-detective-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './christmas-detective-challenge.html',
  styleUrls: ['../shared/game-board.scss', './christmas-detective-challenge.scss'],
})
export class ChristmasDetectiveChallenge extends SeasonalGame implements OnInit {
  readonly houses = [0, 1, 2, 3];
  readonly choices = [0, 1, 2, 3];
  readonly categories = ['elves', 'gifts', 'treats'];
  readonly clueIds = Array.from({ length: 10 }, (_, i) => i);
  assignments: number[][] = [];
  checked = false;
  checks = 0;
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase();
    this.assignments = Array.from({ length: 3 }, () => Array(4).fill(-1));
    this.checked = false;
    this.checks = 0;
  }
  assign(house: number, category: number, event: Event): void {
    if (this.won) return;
    this.assignments[category][house] = Number((event.target as HTMLSelectElement).value);
    this.checked = false;
    this.status = '';
    this.sound.tap();
  }
  get clues(): boolean[] {
    return detectiveClues(this.assignments[0], this.assignments[1], this.assignments[2]);
  }
  check(): void {
    if (this.won) return;
    this.checks++;
    this.checked = true;
    if (this.assignments.some((row) => row.includes(-1) || new Set(row).size !== 4)) {
      this.message('challenges.christmasDetective.unique');
      this.sound.thud();
      return;
    }
    if (this.clues.every(Boolean)) this.finish(2400 - this.checks * 40, { checks: this.checks });
    else {
      this.message('challenges.christmasDetective.recheck');
      this.sound.thud();
    }
  }
}
