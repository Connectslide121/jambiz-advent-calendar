import { Component, HostListener, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';

@Component({
  selector: 'app-cryptogram-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './cryptogram-challenge.html',
  styleUrls: ['../shared/game-board.scss', './cryptogram-challenge.scss'],
})
export class CryptogramChallenge extends SeasonalGame implements OnInit {
  alphabet = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ');
  words: string[][] = [];
  guesses: Record<number, string> = {};
  given = new Set<number>();
  selected = 0;
  hints = 0;
  checks = 0;
  ngOnInit(): void {
    this.restart();
    this.watchLanguage(() => this.restart());
  }
  restart(): void {
    this.resetBase();
    this.hints = 0;
    this.checks = 0;
    this.guesses = {};
    this.given.clear();
    const sv = this.translate.getCurrentLang() === 'sv';
    const phrase = String(
      this.config[sv ? 'phraseSv' : 'phraseEn'] ??
        (sv ? 'VARMA HJÄRTAN GÖR JULEN LJUS' : 'KIND HEARTS MAKE CHRISTMAS BRIGHT')
    );
    this.words = phrase
      .toUpperCase()
      .split(/\s+/)
      .map((word) => Array.from(word).filter((c) => this.alphabet.includes(c)));
    const letters = [...new Set(this.words.flat())];
    for (const letter of letters.slice(0, 2)) {
      const code = this.code(letter);
      this.guesses[code] = letter;
      this.given.add(code);
    }
    this.selected = this.codes.find((code) => !this.given.has(code)) ?? 0;
  }
  code(letter: string): number {
    return ((this.alphabet.indexOf(letter) * 7 + 11) % 29) + 1;
  }
  get codes(): number[] {
    return [...new Set(this.words.flat().map((c) => this.code(c)))];
  }
  select(letter: string): void {
    if (!this.won && !this.given.has(this.code(letter))) this.selected = this.code(letter);
  }
  enter(letter: string): void {
    if (this.won || this.given.has(this.selected)) return;
    this.guesses[this.selected] = letter;
    this.sound.tap();
    this.status = '';
  }
  check(): void {
    if (this.won) return;
    this.checks++;
    if (this.words.flat().every((letter) => this.guesses[this.code(letter)] === letter))
      this.finish(2000 - this.hints * 100 - this.checks * 20, {
        hints: this.hints,
        checks: this.checks,
      });
    else {
      this.message('challenges.cryptogram.notYet');
      this.sound.thud();
    }
  }
  hint(): void {
    if (this.won) return;
    const letter = this.words.flat().find((c) => this.guesses[this.code(c)] !== c);
    if (!letter) {
      this.check();
      return;
    }
    const code = this.code(letter);
    this.guesses[code] = letter;
    this.given.add(code);
    this.hints++;
    this.selected = this.codes.find((c) => !this.given.has(c)) ?? code;
    this.sound.bell(880, 0.1);
  }
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.gameKey(e) || this.won) return;
    const key = e.key.toUpperCase();
    if (this.alphabet.includes(key)) {
      e.preventDefault();
      this.enter(key);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      this.enter('');
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const codes = this.codes.filter((c) => !this.given.has(c));
      const direction = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1;
      this.selected =
        codes[(codes.indexOf(this.selected) + direction + codes.length) % codes.length] ??
        this.selected;
    }
  }
}
