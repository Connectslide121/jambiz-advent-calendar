import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';
import { CalendarDayConfig } from '../../models/calendar.models';

@Component({
  selector: 'app-challenge-host',
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './challenge-host.html',
  styleUrl: './challenge-host.scss',
})
export class ChallengeHost {
  readonly X = X;
  @Input() dayConfig!: CalendarDayConfig;
  @Output() close = new EventEmitter<void>();
  @Output() challengeCompleted = new EventEmitter<void>();

  showFunFact = false;

  onClose(): void {
    this.close.emit();
  }

  onChallengeComplete(): void {
    this.showFunFact = true;
    this.challengeCompleted.emit();
  }

  onCloseFunFact(): void {
    this.close.emit();
  }
}
