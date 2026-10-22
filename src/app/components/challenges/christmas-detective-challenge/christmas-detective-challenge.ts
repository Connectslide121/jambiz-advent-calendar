import { Component, HostListener, OnInit } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
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
  imports: [NgTemplateOutlet, TranslateModule, GameFrame],
  templateUrl: './christmas-detective-challenge.html',
  styleUrls: ['../shared/game-board.scss', './christmas-detective-challenge.scss'],
})
export class ChristmasDetectiveChallenge extends SeasonalGame implements OnInit {
  readonly houses = [0, 1, 2, 3];
  readonly choices = [0, 1, 2, 3];
  readonly categories = ['elves', 'gifts', 'treats'];
  readonly clueIds = Array.from({ length: 10 }, (_, i) => i);
  /** Gift and treat icons; treat 0 (Lucia bun) is drawn as a saffron curl instead */
  readonly icons: string[][] = [[], ['🚂', '🧸', '📖', '⚽'], ['', '🍪', '🍫', '🍬']];
  /** Each elf wears their own hat colour */
  readonly elfHats = ['#e0475b', '#3aae8a', '#7fb8ff', '#f7c873'];
  assignments: number[][] = [];
  checked = false;
  checks = 0;
  /** The slot whose picker is open */
  open: { house: number; category: number } | null = null;
  /** Clues the player has ticked off on the notepad */
  crossed = new Set<number>();
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase();
    this.assignments = Array.from({ length: 3 }, () => Array(4).fill(-1));
    this.checked = false;
    this.checks = 0;
    this.open = null;
    this.crossed.clear();
  }
  toggle(house: number, category: number): void {
    if (this.won) return;
    const same = this.open?.house === house && this.open.category === category;
    this.open = same ? null : { house, category };
    this.sound.tap();
  }
  /** House that already holds this choice, or -1 */
  usedBy(category: number, value: number): number {
    return this.assignments[category].indexOf(value);
  }
  /** Place a choice; if another house has it, the two houses swap */
  pick(value: number): void {
    if (!this.open || this.won) return;
    const { house, category } = this.open;
    const row = this.assignments[category];
    const other = row.indexOf(value);
    if (other >= 0 && other !== house) row[other] = row[house];
    row[house] = value;
    this.open = null;
    this.checked = false;
    this.status = '';
    this.sound.tap();
  }
  clear(): void {
    if (!this.open || this.won) return;
    this.assignments[this.open.category][this.open.house] = -1;
    this.open = null;
    this.checked = false;
  }
  cross(id: number): void {
    if (this.crossed.has(id)) this.crossed.delete(id);
    else this.crossed.add(id);
  }
  @HostListener('document:keydown.escape') closePicker(): void {
    this.open = null;
  }
  get clues(): boolean[] {
    return detectiveClues(this.assignments[0], this.assignments[1], this.assignments[2]);
  }
  check(): void {
    if (this.won) return;
    this.checks++;
    this.checked = true;
    this.open = null;
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
