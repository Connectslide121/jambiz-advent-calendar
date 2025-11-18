import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check } from 'lucide-angular';

export interface RebusConfig {
  rebusKey: string; // Translation key for the rebus display (could be emoji or text)
  answerKey: string | string[]; // Accept multiple valid answers
  hintKey?: string;
}

@Component({
  selector: 'app-rebus-challenge',
  imports: [CommonModule, FormsModule, TranslateModule, LucideAngularModule],
  templateUrl: './rebus-challenge.html',
  styleUrl: './rebus-challenge.scss',
})
export class RebusChallenge implements OnInit {
  @Input() config!: RebusConfig;
  @Input() isCompleted = false;
  @Output() completed = new EventEmitter<void>();

  userAnswer = '';
  showError = false;
  showHint = false;

  readonly Check = Check;

  ngOnInit(): void {
    if (this.isCompleted) {
      // Populate the answer field with the first correct answer
      this.userAnswer = Array.isArray(this.config.answerKey)
        ? this.config.answerKey[0]
        : this.config.answerKey;
    }
  }

  onSubmit(): void {
    const normalizedAnswer = this.userAnswer.trim().toLowerCase().normalize('NFC');
    const correctAnswers = Array.isArray(this.config.answerKey)
      ? this.config.answerKey.map((a) => a.toLowerCase().normalize('NFC'))
      : [this.config.answerKey.toLowerCase().normalize('NFC')];

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

  reset(): void {
    this.userAnswer = '';
    this.showError = false;
    this.showHint = false;
    // Do NOT call this.completed.emit() - preserve completion status
  }
}
