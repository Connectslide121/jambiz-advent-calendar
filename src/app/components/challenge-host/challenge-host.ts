import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ViewContainerRef,
  OnInit,
  ComponentRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarDayConfig } from '../../models/calendar.models';
import { FunFactReveal } from '../fun-fact-reveal/fun-fact-reveal';
import { CHALLENGE_LOADERS } from '../../config/challenge-registry';

@Component({
  selector: 'app-challenge-host',
  imports: [CommonModule, LucideAngularModule, TranslateModule, FunFactReveal],
  templateUrl: './challenge-host.html',
  styleUrl: './challenge-host.scss',
})
export class ChallengeHost implements OnInit {
  readonly X = X;
  @Input() dayConfig!: CalendarDayConfig;
  @Input() isCompleted = false;
  @Output() close = new EventEmitter<void>();
  @Output() challengeCompleted = new EventEmitter<void>();

  @ViewChild('challengeContainer', { read: ViewContainerRef })
  challengeContainer!: ViewContainerRef;

  showFunFact = false;
  private challengeComponentRef?: ComponentRef<any>;

  ngOnInit(): void {
    // Dynamically load challenge component after view init
    setTimeout(() => this.loadChallengeComponent(), 0);
  }

  private async loadChallengeComponent(): Promise<void> {
    if (!this.challengeContainer || !this.dayConfig.challengeType) return;

    const loader = CHALLENGE_LOADERS[this.dayConfig.challengeType];
    if (!loader) {
      // Unknown challenge type: the template shows a placeholder
      return;
    }
    // Each game is its own chunk, downloaded the first time its door opens
    const componentType = await loader();
    this.challengeContainer.clear();

    this.challengeComponentRef = this.challengeContainer.createComponent(componentType);
    const ref = this.challengeComponentRef;

    // Every game takes the same inputs (see GAME_SPEC in the README)
    ref.setInput('config', this.dayConfig.challengeData ?? {});
    ref.setInput('isCompleted', this.isCompleted);
    if (this.dayConfig.day > 0) {
      ref.setInput('day', this.dayConfig.day);
    }
    if (this.dayConfig.levelId) {
      ref.setInput('levelId', this.dayConfig.levelId);
    }

    ref.instance.completed.subscribe(() => {
      this.onChallengeComplete();
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onChallengeComplete(): void {
    // Only show the reward screen if there is one (extras have no rewards)
    if (this.dayConfig.funFactKey || this.dayConfig.reward) {
      this.showFunFact = true;
    } else {
      this.close.emit();
    }
    this.challengeCompleted.emit();
  }

  onCloseFunFact(): void {
    this.close.emit();
  }
}
