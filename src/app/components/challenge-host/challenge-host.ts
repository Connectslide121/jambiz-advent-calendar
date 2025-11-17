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
import { CalendarDayConfig } from '../../models/calendar.models';
import { FunFactReveal } from '../fun-fact-reveal/fun-fact-reveal';
import { RiddleChallenge } from '../challenges/riddle-challenge/riddle-challenge';
import { MiniQuizChallenge } from '../challenges/mini-quiz-challenge/mini-quiz-challenge';
import { WordScrambleChallenge } from '../challenges/word-scramble-challenge/word-scramble-challenge';

@Component({
  selector: 'app-challenge-host',
  imports: [CommonModule, LucideAngularModule, FunFactReveal],
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

  private loadChallengeComponent(): void {
    if (!this.challengeContainer) return;

    this.challengeContainer.clear();

    let componentType: any;

    switch (this.dayConfig.challengeType) {
      case 'riddle':
        componentType = RiddleChallenge;
        break;
      case 'miniQuiz':
        componentType = MiniQuizChallenge;
        break;
      case 'wordScramble':
        componentType = WordScrambleChallenge;
        break;
      default:
        // For unimplemented challenge types, show placeholder
        return;
    }

    this.challengeComponentRef = this.challengeContainer.createComponent(componentType);

    // Pass config data to the challenge component
    if (this.dayConfig.challengeData) {
      this.challengeComponentRef.instance.config = this.dayConfig.challengeData;
    }

    // Pass completed state
    if (this.challengeComponentRef.instance.isCompleted !== undefined) {
      this.challengeComponentRef.instance.isCompleted = this.isCompleted;
    }

    // Subscribe to completion event
    this.challengeComponentRef.instance.completed.subscribe(() => {
      this.onChallengeComplete();
    });
  }

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
