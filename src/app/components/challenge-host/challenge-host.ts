import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ViewContainerRef,
  OnInit,
  ComponentRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarDayConfig } from '../../models/calendar.models';
import { FunFactReveal } from '../fun-fact-reveal/fun-fact-reveal';
import { BackendService } from '../../services/backend.service';
import { CalendarStateService } from '../../services/calendar-state.service';
import { CALENDAR_DAYS } from '../../config/calendar-config';
import { CHALLENGE_LOADERS } from '../../config/challenge-registry';

@Component({
  selector: 'app-challenge-host',
  imports: [CommonModule, LucideAngularModule, TranslateModule, FunFactReveal],
  templateUrl: './challenge-host.html',
  styleUrl: './challenge-host.scss',
})
export class ChallengeHost implements OnInit, OnDestroy {
  private backend = inject(BackendService);
  private state = inject(CalendarStateService);
  private attemptId?: string;
  private destroyed = false;
  private saved = false;
  busy = false;
  error = '';
  ngOnDestroy(): void { this.destroyed = true; }
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
    try {
      if (this.dayConfig.day > 0) this.attemptId = await this.backend.startRun(this.dayConfig.day);
    } catch { this.error = 'online.startError'; return; }
    if (this.destroyed) return;
    if (!this.challengeContainer || !this.dayConfig.challengeType) return;

    const loader = CHALLENGE_LOADERS[this.dayConfig.challengeType];
    if (!loader) {
      // Unknown challenge type: the template shows a placeholder
      return;
    }
    // Each game is its own chunk, downloaded the first time its door opens
    const componentType = await loader();
    if (this.destroyed) return;
    this.challengeContainer.clear();

    this.challengeComponentRef = this.challengeContainer.createComponent(componentType);
    const ref = this.challengeComponentRef;

    // Every game takes the same inputs (see GAME_SPEC in the README)
    ref.setInput('config', this.dayConfig.challengeData ?? {});
    ref.setInput('isCompleted', this.dayConfig.day > 0 ? false : this.isCompleted);
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

  async onChallengeComplete(): Promise<void> {
    if (this.busy || this.saved || this.destroyed) return;
    this.busy = true;
    this.error = '';
    try {
      if (this.dayConfig.day > 0) {
        if (!this.attemptId) throw new Error('Missing run');
        await this.backend.complete(this.attemptId, this.state.getGameStats(this.dayConfig.day) ?? {});
        this.state.loadCloudProgress();
        this.dayConfig = CALENDAR_DAYS.find(d => d.day === this.dayConfig.day)!;
      } else if (this.dayConfig.levelId) {
        await this.backend.saveExtra(this.dayConfig.levelId, this.state.getGameStats(this.dayConfig.levelId) ?? {});
      }
      this.saved = true;
    } catch { this.error = 'online.saveError'; return; }
    finally { this.busy = false; }
    if (this.destroyed) return;
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
