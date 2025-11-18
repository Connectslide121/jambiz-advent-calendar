import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, Lightbulb, LightbulbOff } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';

export interface HangmanConfig {
  word: string; // English word
  wordSv?: string; // Swedish word
  clueKey: string;
  hintKey?: string;
}

@Component({
  selector: 'app-hangman-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './hangman-challenge.html',
  styleUrl: './hangman-challenge.scss',
})
export class HangmanChallenge implements OnInit {
  @Input() config!: HangmanConfig;
  @Input() isCompleted = false;
  @Input() day?: number;
  @Output() completed = new EventEmitter<void>();

  currentWord = '';
  guessedLetters: Set<string> = new Set();
  wrongGuesses = 0;
  maxWrongGuesses = 6;
  alphabet: string[] = [];
  showHint = false;
  completedWrongGuesses = 0;

  readonly LightbulbIcon = Lightbulb;
  readonly LightbulbOffIcon = LightbulbOff;

  constructor(private translate: TranslateService, private calendarState: CalendarStateService) {}

  ngOnInit(): void {
    // Determine which word to use based on current language
    const currentLang = this.translate.currentLang || this.translate.defaultLang;
    this.currentWord =
      currentLang === 'sv' && this.config.wordSv ? this.config.wordSv : this.config.word;

    // Set alphabet based on language
    if (currentLang === 'sv') {
      this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');
    } else {
      this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    }

    // If already completed, reveal all letters and load saved stats
    if (this.isCompleted) {
      this.currentWord.split('').forEach((letter) => {
        if (letter !== ' ') {
          this.guessedLetters.add(letter.toUpperCase());
        }
      });

      // Load saved wrong guesses count
      if (this.day !== undefined) {
        const stats = this.calendarState.getGameStats(this.day);
        console.log('Loading hangman stats for day', this.day, ':', stats);
        if (stats && stats.wrongGuesses !== undefined) {
          this.completedWrongGuesses = stats.wrongGuesses;
        }
      }
    }
  }

  get displayWord(): string {
    return this.currentWord
      .split('')
      .map((letter) => {
        if (letter === ' ') return ' ';
        return this.guessedLetters.has(letter.toUpperCase()) ? letter : '_';
      })
      .join('');
  }

  get displayWrongGuesses(): number {
    // When completed and replaying, show the saved wrong guesses
    // When actively playing (even if previously completed), show current wrong guesses
    return this.isCompleted && this.wrongGuesses === 0 && this.completedWrongGuesses > 0
      ? this.completedWrongGuesses
      : this.wrongGuesses;
  }

  get isWon(): boolean {
    return this.currentWord
      .split('')
      .every((letter) => letter === ' ' || this.guessedLetters.has(letter.toUpperCase()));
  }

  get isLost(): boolean {
    return this.wrongGuesses >= this.maxWrongGuesses;
  }

  get isGameOver(): boolean {
    return this.isWon || this.isLost;
  }

  guessLetter(letter: string): void {
    if (this.isGameOver || this.guessedLetters.has(letter)) return;

    this.guessedLetters.add(letter);

    const normalizedWord = this.currentWord.toUpperCase();
    if (!normalizedWord.includes(letter)) {
      this.wrongGuesses++;
    }

    if (this.isWon) {
      // Save wrong guesses count
      if (this.day !== undefined) {
        this.completedWrongGuesses = this.wrongGuesses;
        this.calendarState.saveGameStats(this.day, {
          wrongGuesses: this.wrongGuesses,
        });
        console.log('Saving hangman stats for day', this.day, ':', {
          wrongGuesses: this.wrongGuesses,
        });
      }

      setTimeout(() => {
        this.completed.emit();
      }, 500);
    }
  }

  isLetterGuessed(letter: string): boolean {
    return this.guessedLetters.has(letter);
  }

  isLetterCorrect(letter: string): boolean {
    return this.guessedLetters.has(letter) && this.currentWord.toUpperCase().includes(letter);
  }

  isLetterWrong(letter: string): boolean {
    return this.guessedLetters.has(letter) && !this.currentWord.toUpperCase().includes(letter);
  }

  reset(): void {
    this.guessedLetters.clear();
    this.wrongGuesses = 0;
    this.showHint = false;
    // Do NOT call this.completed.emit() - preserve completion status
  }

  toggleHint(): void {
    this.showHint = !this.showHint;
  }

  showAnswer(): void {
    this.completed.emit();
  }
}
