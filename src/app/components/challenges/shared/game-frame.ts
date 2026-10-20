import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GamePhase } from './seasonal-game';

@Component({
  selector: 'app-game-frame',
  imports: [TranslateModule],
  template: ` <section class="game-frame">
    <header>
      <h3>{{ title | translate }}</h3>
      <p>{{ instruction | translate }}</p>
    </header>
    <div class="frame-tools">
      @if (best !== null) {
        <span class="pill">🏆 {{ best }}</span>
      }
      @if (isCompleted) {
        <span class="pill">✓ {{ 'calendar.completed' | translate }}</span>
      }
      <button class="btn btn-outline" type="button" (click)="restart.emit()">
        {{ 'ui.reset' | translate }}
      </button>
      @if (isCompleted && phase !== 'won') {
        <button class="btn btn-primary" type="button" (click)="reward.emit()">
          {{ 'ui.showReward' | translate }}
        </button>
      }
    </div>
    <ng-content></ng-content>
    @if (status) {
      <p class="frame-status" role="status">{{ status }}</p>
    }
    @if (phase === 'ready') {
      <button class="btn btn-primary" type="button" (click)="start.emit()">
        {{ 'ui.startGame' | translate }}
      </button>
    }
    @if (phase === 'lost') {
      <button class="btn btn-primary" type="button" (click)="restart.emit()">
        {{ 'ui.tryAgain' | translate }}
      </button>
    }
    @if (phase === 'won') {
      <div class="win" role="status">
        ✨ {{ 'challenges.shared.win' | translate }} <strong>{{ score }}</strong>
      </div>
    }
  </section>`,
  styleUrl: './game-frame.scss',
})
export class GameFrame {
  @Input() title = '';
  @Input() instruction = '';
  @Input() status = '';
  @Input() phase: GamePhase = 'playing';
  @Input() score = 0;
  @Input() best: number | null = null;
  @Input() isCompleted = false;
  @Output() restart = new EventEmitter<void>();
  @Output() start = new EventEmitter<void>();
  @Output() reward = new EventEmitter<void>();
}
