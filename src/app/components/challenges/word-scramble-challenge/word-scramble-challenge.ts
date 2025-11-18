import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, Shuffle, Lightbulb, LightbulbOff } from 'lucide-angular';

export interface WordScrambleConfig {
  word: string; // English word
  wordSv?: string; // Swedish word
  clueKey: string;
  hintKey?: string;
}

@Component({
  selector: 'app-word-scramble-challenge',
  imports: [CommonModule, FormsModule, TranslateModule, LucideAngularModule],
  templateUrl: './word-scramble-challenge.html',
  styleUrl: './word-scramble-challenge.scss',
})
export class WordScrambleChallenge implements OnInit {
  @Input() config!: WordScrambleConfig;
  @Input() isCompleted = false;
  @Output() completed = new EventEmitter<void>();

  readonly ShuffleIcon = Shuffle;
  readonly LightbulbIcon = Lightbulb;
  readonly LightbulbOffIcon = LightbulbOff;

  scrambledWord = '';
  userAnswer = '';
  showError = false;
  showHint = false;
  private currentWord = '';

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    // Determine which word to use based on current language
    const currentLang = this.translate.currentLang || this.translate.defaultLang;
    this.currentWord =
      currentLang === 'sv' && this.config.wordSv ? this.config.wordSv : this.config.word;
    this.scrambledWord = this.scrambleWord(this.currentWord);

    // If already completed, show the answer
    if (this.isCompleted) {
      this.userAnswer = this.currentWord;
    }
  }

  private scrambleWord(word: string): string {
    const letters = word.split('');
    // Fisher-Yates shuffle
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    // Ensure it's actually scrambled (not the same as original)
    const scrambled = letters.join('');
    return scrambled.toLowerCase() === word.toLowerCase() ? this.scrambleWord(word) : scrambled;
  }

  onSubmit(): void {
    const normalizedAnswer = this.userAnswer.trim().toLowerCase().normalize('NFC');
    const correctAnswer = this.currentWord.toLowerCase().normalize('NFC');

    if (normalizedAnswer === correctAnswer) {
      this.completed.emit();
    } else {
      this.showError = true;
      setTimeout(() => {
        this.showError = false;
      }, 2000);
    }
  }

  toggleHint(): void {
    this.showHint = !this.showHint;
  }

  reshuffleWord(): void {
    this.scrambledWord = this.scrambleWord(this.currentWord);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSubmit();
    }
  }
}
