import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-challenge-info-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div *ngIf="show" class="instructions-overlay">
      <div class="instructions-card">
        <ng-content></ng-content>
        <button class="btn btn-primary w-full mt-6" (click)="onStart()">
          {{ 'ui.startGame' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .instructions-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(6, 18, 31, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }

    .instructions-card {
      background: var(--color-surface);
      border: 2px solid var(--color-accent-red);
      border-radius: 1rem;
      padding: 2rem;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    :host ::ng-deep h2 {
      color: var(--color-gold);
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 1rem;
    }

    :host ::ng-deep p {
      margin-bottom: 0.75rem;
      text-align: left;
    }

    @media (max-width: 640px) {
      .instructions-card {
        padding: 1.25rem;
      }
    }
  `]
})
export class ChallengeInfoModalComponent {
  @Input() show = false;
  @Output() start = new EventEmitter<void>();

  onStart() {
    this.start.emit();
  }
}
