import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
type Item = 'key' | 'candle' | 'matches' | 'litCandle';
export type EscapeSpot = 'desk' | 'clock' | 'books' | 'cabinet' | 'window' | 'present';
@Component({
  selector: 'app-christmas-eve-escape-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './christmas-eve-escape-challenge.html',
  styleUrls: ['../shared/game-board.scss', './christmas-eve-escape-challenge.scss'],
})
export class ChristmasEveEscapeChallenge extends SeasonalGame implements OnInit {
  /** Clickable areas of the study, in the 640×400 room drawing */
  readonly spots: { id: EscapeSpot; x: number; y: number; w: number; h: number }[] = [
    { id: 'window', x: 36, y: 36, w: 128, h: 118 },
    { id: 'clock', x: 286, y: 108, w: 68, h: 66 },
    { id: 'books', x: 464, y: 52, w: 142, h: 182 },
    { id: 'desk', x: 26, y: 214, w: 170, h: 90 },
    { id: 'cabinet', x: 474, y: 240, w: 132, h: 96 },
    { id: 'present', x: 404, y: 292, w: 70, h: 70 },
  ];
  /** Places already inspected; the rest sparkle */
  visited = new Set<EscapeSpot>();
  readonly bookColors = ['#a8243a', '#2f8a5c', '#3a5aa8', '#c99a46', '#6a3a8a', '#b2562e'];
  get hourAngle(): number {
    return (this.hour % 12) * 30;
  }
  readonly symbols = ['⭐', '🔔', '🎄', '❄️', '🎁'];
  readonly slots = [0, 1, 2];
  readonly itemIcons: Record<Item, string> = {
    key: '🗝️',
    candle: '🕯️',
    matches: '🔥',
    litCandle: '🕯️🔥',
  };
  spot: EscapeSpot | null = null;
  storyKey = 'challenges.christmasEveEscape.welcome';
  items: Item[] = [];
  selected: Item | null = null;
  deskRead = false;
  hour = 7;
  clockOpen = false;
  booksOpen = false;
  cabinetOpen = false;
  codeVisible = false;
  bookOrder = [3, 0, 4];
  code = '';
  checks = 0;
  hints = 0;
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase();
    this.spot = null;
    this.visited = new Set();
    this.storyKey = 'challenges.christmasEveEscape.welcome';
    this.items = [];
    this.selected = null;
    this.deskRead = false;
    this.hour = 7;
    this.clockOpen = false;
    this.booksOpen = false;
    this.cabinetOpen = false;
    this.codeVisible = false;
    this.bookOrder = [3, 0, 4];
    this.code = '';
    this.checks = 0;
    this.hints = 0;
  }
  inspect(spot: EscapeSpot): void {
    if (this.won) return;
    this.spot = spot;
    this.visited.add(spot);
    this.status = '';
    this.sound.tap();
    this.storyKey = 'challenges.christmasEveEscape.' + spot;
    if (spot === 'desk') this.deskRead = true;
    if (spot === 'clock' && this.clockOpen)
      this.storyKey = 'challenges.christmasEveEscape.clockOpen';
    if (spot === 'books' && this.booksOpen)
      this.storyKey = 'challenges.christmasEveEscape.booksOpen';
    if (spot === 'cabinet') {
      if (!this.cabinetOpen && this.selected === 'key' && this.items.includes('key')) {
        this.cabinetOpen = true;
        this.items = this.items.filter((i) => i !== 'key');
        this.items.push('candle');
        this.selected = null;
        this.sound.bell(880, 0.16);
      }
      if (this.cabinetOpen) this.storyKey = 'challenges.christmasEveEscape.cabinetOpen';
    }
    if (spot === 'window') {
      if (!this.codeVisible && this.selected === 'litCandle') {
        this.codeVisible = true;
        this.sound.jingle();
      }
      if (this.codeVisible) this.storyKey = 'challenges.christmasEveEscape.windowOpen';
    }
  }
  turnClock(delta: number): void {
    if (this.won || this.clockOpen) return;
    this.hour = ((this.hour - 1 + delta + 12) % 12) + 1;
    this.sound.tap();
    if (this.hour === 12) {
      this.clockOpen = true;
      this.items.push('key');
      this.storyKey = 'challenges.christmasEveEscape.clockOpen';
      this.sound.bell(1046.5, 0.16);
    }
  }
  cycle(slot: number): void {
    if (!this.won && !this.booksOpen) {
      this.bookOrder[slot] = (this.bookOrder[slot] + 1) % this.symbols.length;
      this.sound.tap();
    }
  }
  openBooks(): void {
    if (this.won || this.booksOpen) return;
    if (this.bookOrder.every((value, i) => value === i)) {
      this.booksOpen = true;
      this.items.push('matches');
      this.storyKey = 'challenges.christmasEveEscape.booksOpen';
      this.sound.bell(1046.5, 0.16);
    } else {
      this.message('challenges.christmasEveEscape.wrongOrder');
      this.sound.thud();
    }
  }
  useItem(item: Item): void {
    if (this.won || !this.items.includes(item)) return;
    if (
      (item === 'candle' && this.selected === 'matches') ||
      (item === 'matches' && this.selected === 'candle')
    ) {
      this.items = this.items.filter((i) => i !== 'candle' && i !== 'matches');
      this.items.push('litCandle');
      this.selected = 'litCandle';
      this.message('challenges.christmasEveEscape.lit');
      this.sound.jingle();
    } else {
      this.selected = this.selected === item ? null : item;
      this.sound.tap();
    }
  }
  enterCode(event: Event): void {
    this.code = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4);
  }
  unlock(): void {
    if (this.won) return;
    this.checks++;
    if (this.codeVisible && this.code === '2412')
      this.finish(3000 - this.checks * 50 - this.hints * 100, {
        checks: this.checks,
        hints: this.hints,
      });
    else {
      this.message('challenges.christmasEveEscape.wrongCode');
      this.sound.thud();
    }
  }
  hint(): void {
    if (this.won) return;
    this.hints++;
    const key = !this.deskRead
      ? 'hintDesk'
      : !this.clockOpen
        ? 'hintClock'
        : !this.cabinetOpen
          ? 'hintCabinet'
          : !this.booksOpen
            ? 'hintBooks'
            : !this.items.includes('litCandle')
              ? 'hintCombine'
              : !this.codeVisible
                ? 'hintWindow'
                : 'hintPresent';
    this.message('challenges.christmasEveEscape.' + key);
  }
}
