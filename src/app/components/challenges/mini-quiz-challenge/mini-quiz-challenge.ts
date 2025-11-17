import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface QuizOption {
  textKey: string;
  isCorrect: boolean;
}

export interface MiniQuizConfig {
  questionKey: string;
  options: QuizOption[];
}

@Component({
  selector: 'app-mini-quiz-challenge',
  imports: [CommonModule, TranslateModule],
  templateUrl: './mini-quiz-challenge.html',
  styleUrl: './mini-quiz-challenge.scss',
})
export class MiniQuizChallenge implements OnInit {
  @Input() config!: MiniQuizConfig;
  @Input() isCompleted = false;
  @Output() completed = new EventEmitter<void>();

  selectedOption: number | null = null;
  showResult = false;
  isCorrect = false;

  ngOnInit(): void {
    if (this.isCompleted) {
      // Find and select the correct answer
      const correctIndex = this.config.options.findIndex((opt) => opt.isCorrect);
      if (correctIndex !== -1) {
        this.selectedOption = correctIndex;
        this.showResult = true;
        this.isCorrect = true;
      }
    }
  }

  selectOption(index: number): void {
    if (this.showResult) return; // Prevent changing after submission

    this.selectedOption = index;
  }

  submitAnswer(): void {
    if (this.selectedOption === null) return;

    const selected = this.config.options[this.selectedOption];
    this.isCorrect = selected.isCorrect;
    this.showResult = true;

    if (this.isCorrect) {
      setTimeout(() => {
        this.completed.emit();
      }, 1500);
    }
  }

  reset(): void {
    this.selectedOption = null;
    this.showResult = false;
    this.isCorrect = false;
  }
}
