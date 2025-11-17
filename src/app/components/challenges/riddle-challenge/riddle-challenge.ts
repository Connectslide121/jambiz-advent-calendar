import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface RiddleConfig {
  riddleKey: string;
  answerKey: string | string[]; // Support multiple valid answers
  hintKey?: string;
}

@Component({
  selector: 'app-riddle-challenge',
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './riddle-challenge.html',
  styleUrl: './riddle-challenge.scss',
})
export class RiddleChallenge implements OnInit {
  @Input() config!: RiddleConfig;
  @Input() isCompleted = false;
  @Output() completed = new EventEmitter<void>();

  userAnswer = '';
  showError = false;
  showHint = false;

  ngOnInit(): void {
    if (this.isCompleted) {
      // Populate the answer field with the first correct answer
      this.userAnswer = Array.isArray(this.config.answerKey)
        ? this.config.answerKey[0]
        : this.config.answerKey;
    }
  }

  onSubmit(): void {
    const normalizedAnswer = this.userAnswer.trim().toLowerCase();
    const correctAnswers = Array.isArray(this.config.answerKey)
      ? this.config.answerKey.map((a) => a.toLowerCase())
      : [this.config.answerKey.toLowerCase()];

    if (correctAnswers.includes(normalizedAnswer)) {
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

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSubmit();
    }
  }
}
