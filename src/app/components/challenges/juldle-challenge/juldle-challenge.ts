import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { LucideAngularModule, Check, Lightbulb, Delete, CornerDownLeft } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface JuldleConfig {
  wordEn?: string; // Hidden word in English (4-7 letters). Default "SLEIGH"
  wordSv?: string; // Hidden word in Swedish (4-7 letters, may use ÅÄÖ). Default "TOMTE"
  clueEn?: string; // Clue shown by the hint button
  clueSv?: string;
  maxGuesses?: number; // Number of rows. Default 6
}

type Mark = 'correct' | 'present' | 'absent';

interface Tile {
  letter: string;
  mark: Mark | null;
  /** Mark is set and the tile is flipped to show it */
  flipped: boolean;
  /** Short "pop" when a letter is typed */
  pop: boolean;
}

interface Flake {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  delay: number;
  char: string;
}

type Phase = 'playing' | 'revealing' | 'won' | 'lost';

const FLIP_STAGGER = 260; // ms between tiles
const FLIP_TIME = 560; // ms one flip takes
const KEYS_EN = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const KEYS_SV = ['QWERTYUIOPÅ', 'ASDFGHJKLÖÄ', 'ZXCVBNM'];
const MARK_NOTES: Record<Mark, number> = { correct: 1046.5, present: 783.99, absent: 392 };

/**
 * Juldle - a cosy Christmas Wordle.
 * Guess the hidden Christmas word. Tiles flip to show pine green (right spot), candle gold
 * (in the word, elsewhere) or slate (not in the word). No dictionary check: any letters will do.
 * Running out of rows simply resets the board with the same word (and the clue shown).
 */
@Component({
  selector: 'app-juldle-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './juldle-challenge.html',
  styleUrl: './juldle-challenge.scss',
})
export class JuldleChallenge implements OnInit, OnDestroy {
  @Input() config: JuldleConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  readonly Check = Check;
  readonly Lightbulb = Lightbulb;
  readonly Delete = Delete;
  readonly Enter = CornerDownLeft;
  readonly Math = Math;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);
  private translate = inject(TranslateService);
  private host = inject(ElementRef<HTMLElement>);

  word: string[] = [];
  clue = '';
  maxGuesses = 6;
  rows: Tile[][] = [];
  row = 0;
  col = 0;
  phase: Phase = 'playing';
  keyMarks: Record<string, Mark> = {};
  keyRows: string[][] = [];
  hintShown = false;
  shakeRow: number | null = null;
  toast = '';
  danceRow: number | null = null;
  flakes: Flake[] = [];
  attempt = 1;
  bestGuesses: number | null = null;
  wins = 0;
  readonly bulbs = Array.from({ length: 11 }, (_, i) => i);

  private timers: ReturnType<typeof setTimeout>[] = [];
  private langSub?: Subscription;

  get cols(): number {
    return this.word.length;
  }

  get isSwedish(): boolean {
    return (this.translate.currentLang || this.translate.getDefaultLang() || 'sv') === 'sv';
  }

  ngOnInit(): void {
    this.maxGuesses = Math.max(3, Math.min(8, Math.round(this.config?.maxGuesses ?? 6)));
    const key = this.day ?? this.levelId;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestGuesses = stats?.bestGuesses ?? null;
    this.wins = stats?.wins ?? 0;
    this.setup();
    this.langSub = this.translate.onLangChange.subscribe(() => {
      if (this.phase !== 'won') this.setup();
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.langSub?.unsubscribe();
  }

  /** Pick the word for the current language and build an empty board */
  private setup(): void {
    const sv = this.isSwedish;
    const raw = (sv ? this.config?.wordSv : this.config?.wordEn) ?? (sv ? 'TOMTE' : 'SLEIGH');
    const clean = Array.from(raw.trim().toLocaleUpperCase(sv ? 'sv-SE' : 'en-US')).filter((c) =>
      /\p{L}/u.test(c),
    );
    this.word = clean.length >= 2 ? clean.slice(0, 8) : Array.from(sv ? 'TOMTE' : 'SLEIGH');
    this.clue =
      (sv ? this.config?.clueSv : this.config?.clueEn) ??
      this.translate.instant(sv ? 'challenges.juldle.defaultClueSv' : 'challenges.juldle.defaultClueEn');
    this.keyRows = (sv ? KEYS_SV : KEYS_EN).map((r) => Array.from(r));
    // Make sure every letter of the word is typeable on the on-screen keyboard
    const all = new Set(this.keyRows.flat());
    const missing = [...new Set(this.word.filter((c) => !all.has(c)))];
    if (missing.length) this.keyRows[2] = [...this.keyRows[2], ...missing];
    this.attempt = 1;
    this.hintShown = false;
    this.resetBoard();
  }

  private resetBoard(): void {
    this.clearTimers();
    this.rows = Array.from({ length: this.maxGuesses }, () =>
      Array.from({ length: this.cols }, () => ({ letter: '', mark: null, flipped: false, pop: false })),
    );
    this.row = 0;
    this.col = 0;
    this.keyMarks = {};
    this.phase = 'playing';
    this.shakeRow = null;
    this.danceRow = null;
    this.flakes = [];
    this.toast = '';
  }

  /** Out of guesses: same word, fresh board - and the clue comes out to help */
  tryAgain(): void {
    this.attempt++;
    this.hintShown = true;
    this.resetBoard();
  }

  toggleHint(): void {
    this.hintShown = !this.hintShown;
    if (this.hintShown) this.sound.bell(1318.51, 0.1);
  }

  showReward(): void {
    this.completed.emit();
  }

  // ---------------------------------------------------------------- input

  private ownsTarget(target: HTMLElement | null): boolean {
    return !!target && (this.host.nativeElement as HTMLElement).contains(target);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
    if (e.key === 'Enter') {
      if (tag === 'BUTTON' && this.ownsTarget(target)) return; // let our focused buttons do their thing
      e.preventDefault();
      this.submit();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      this.backspace();
    } else if (e.key.length === 1) {
      const letter = e.key.toLocaleUpperCase(this.isSwedish ? 'sv-SE' : 'en-US');
      if (this.keyRows.some((r) => r.includes(letter))) {
        e.preventDefault();
        this.type(letter);
      }
    }
  }

  type(letter: string): void {
    if (this.phase !== 'playing' || this.col >= this.cols) return;
    const tile = this.rows[this.row][this.col];
    tile.letter = letter;
    tile.pop = true;
    this.later(() => (tile.pop = false), 140);
    this.col++;
    this.sound.bell(1400 + this.col * 90, 0.04);
  }

  backspace(): void {
    if (this.phase !== 'playing' || this.col === 0) return;
    this.col--;
    this.rows[this.row][this.col].letter = '';
  }

  submit(): void {
    if (this.phase !== 'playing') return;
    if (this.col < this.cols) {
      this.flash(this.translate.instant('challenges.juldle.notEnough', { count: this.cols }));
      this.shake();
      return;
    }
    const guess = this.rows[this.row].map((t) => t.letter);
    const marks = this.score(guess);
    const rowIndex = this.row;
    this.phase = 'revealing';
    this.rows[rowIndex].forEach((t, i) => {
      t.mark = marks[i];
      t.flipped = true;
      this.later(() => this.sound.bell(MARK_NOTES[marks[i]] * (1 + i * 0.02), 0.09), i * FLIP_STAGGER + FLIP_TIME / 2);
    });

    const done = (this.cols - 1) * FLIP_STAGGER + FLIP_TIME + 60;
    this.later(() => {
      guess.forEach((letter, i) => this.upgradeKey(letter, marks[i]));
      if (marks.every((m) => m === 'correct')) {
        this.onWin(rowIndex);
      } else if (rowIndex + 1 >= this.maxGuesses) {
        this.phase = 'lost';
        this.sound.thud();
      } else {
        this.row++;
        this.col = 0;
        this.phase = 'playing';
      }
    }, done);
  }

  /** Real Wordle scoring: exact matches first, then "present" only while unused copies remain */
  private score(guess: string[]): Mark[] {
    const marks: Mark[] = guess.map(() => 'absent');
    const left = new Map<string, number>();
    this.word.forEach((c, i) => {
      if (guess[i] === c) marks[i] = 'correct';
      else left.set(c, (left.get(c) ?? 0) + 1);
    });
    guess.forEach((c, i) => {
      if (marks[i] === 'correct') return;
      const n = left.get(c) ?? 0;
      if (n > 0) {
        marks[i] = 'present';
        left.set(c, n - 1);
      }
    });
    return marks;
  }

  private upgradeKey(letter: string, mark: Mark): void {
    const rank: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };
    const current = this.keyMarks[letter];
    if (!current || rank[mark] > rank[current]) this.keyMarks[letter] = mark;
  }

  // ---------------------------------------------------------------- win

  private onWin(rowIndex: number): void {
    this.phase = 'won';
    this.danceRow = rowIndex;
    this.burstSnow();
    this.sound.fanfare();
    const guesses = rowIndex + 1;
    this.wins++;
    this.bestGuesses = this.bestGuesses === null ? guesses : Math.min(this.bestGuesses, guesses);
    const key = this.day ?? this.levelId;
    if (key) this.stateService.saveGameStats(key, { bestGuesses: this.bestGuesses, wins: this.wins });
    this.later(() => this.completed.emit(), 2300);
  }

  private burstSnow(): void {
    const chars = ['❄', '✦', '•', '❅', '✧', '•'];
    this.flakes = Array.from({ length: 46 }, (_, id) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 190;
      return {
        id,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist * 0.8 - 30,
        rot: (Math.random() - 0.5) * 540,
        size: 10 + Math.random() * 16,
        delay: Math.random() * 0.25,
        char: chars[id % chars.length],
      };
    });
  }

  // ---------------------------------------------------------------- helpers

  private shake(): void {
    this.shakeRow = this.row;
    this.sound.thud();
    this.later(() => (this.shakeRow = null), 500);
  }

  private flash(text: string): void {
    this.toast = text;
    this.later(() => {
      if (this.toast === text) this.toast = '';
    }, 1600);
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timers = this.timers.filter((x) => x !== t);
      fn();
    }, ms);
    this.timers.push(t);
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  isRowActive(r: number): boolean {
    return r === this.row && (this.phase === 'playing' || this.phase === 'revealing');
  }
}
