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
import { RiddleChallenge } from '../challenges/riddle-challenge/riddle-challenge';
import { WordScrambleChallenge } from '../challenges/word-scramble-challenge/word-scramble-challenge';
import { HangmanChallenge } from '../challenges/hangman-challenge/hangman-challenge';
import { WordSearchChallenge } from '../challenges/word-search-challenge/word-search-challenge';
import { RebusChallenge } from '../challenges/rebus-challenge/rebus-challenge';
import { MemoryCardChallenge } from '../challenges/memory-card-challenge/memory-card-challenge';
import { GeometryDashChallenge } from '../challenges/geometry-dash-challenge/geometry-dash-challenge';

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

  private loadChallengeComponent(): void {
    if (!this.challengeContainer) return;

    this.challengeContainer.clear();

    let componentType: any;

    switch (this.dayConfig.challengeType) {
      case 'riddle':
        componentType = RiddleChallenge;
        break;
      case 'wordScramble':
        componentType = WordScrambleChallenge;
        break;
      case 'hangman':
        componentType = HangmanChallenge;
        break;
      case 'wordSearch':
        componentType = WordSearchChallenge;
        break;
      case 'rebus':
        componentType = RebusChallenge;
        break;
      case 'memoryCard':
        componentType = MemoryCardChallenge;
        break;
      case 'geometryDash':
        componentType = GeometryDashChallenge;
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

    // Pass day number if component has day property
    if ('day' in this.challengeComponentRef.instance) {
      this.challengeComponentRef.instance.day = this.dayConfig.day;
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
