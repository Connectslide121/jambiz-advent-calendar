import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Play } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface JingleBellsConfig {
  targetLength?: number; // Melody length needed to win. Default 7
  startSpeed?: number; // Milliseconds per note at the start. Default 650
}

interface Bell {
  id: number;
  color: string;
  dark: string;
  note: number;
  labelKey: string;
}

type Phase = 'idle' | 'listening' | 'playing' | 'oops' | 'won';

/**
 * Bell choir - Simon says with four singing bells.
 * Listen to the melody, then ring the bells back in the same order.
 * Each round adds a note. A mistake replays the melody so you can try again.
 */
@Component({
  selector: 'app-jingle-bells-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './jingle-bells-challenge.html',
  styleUrl: './jingle-bells-challenge.scss',
})
export class JingleBellsChallenge implements OnInit, OnDestroy {
  @Input() config: JingleBellsConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Output() completed = new EventEmitter<void>();

  readonly Check = Check;
  readonly Play = Play;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);

  readonly bells: Bell[] = [
    { id: 0, color: '#ff5a6e', dark: '#9b2335', note: 523.25, labelKey: 'challenges.jingleBells.bells.red' },
    { id: 1, color: '#f7c873', dark: '#a8721e', note: 659.25, labelKey: 'challenges.jingleBells.bells.gold' },
    { id: 2, color: '#5cf2b3', dark: '#17573f', note: 783.99, labelKey: 'challenges.jingleBells.bells.green' },
    { id: 3, color: '#7fb8ff', dark: '#2a4387', note: 1046.5, labelKey: 'challenges.jingleBells.bells.blue' },
  ];

  phase: Phase = 'idle';
  sequence: number[] = [];
  inputIndex = 0;
  ringing: number | null = null;
  mistakes = 0;
  bestRound = 0;
  targetLength = 7;

  private timers: ReturnType<typeof setTimeout>[] = [];

  get round(): number {
    return this.sequence.length;
  }

  /** Melodies fully played back so far */
  get roundsCleared(): number {
    return this.phase === 'won' ? this.targetLength : Math.max(0, this.round - 1);
  }

  get noteSlots(): number[] {
    return Array.from({ length: this.targetLength }, (_, i) => i);
  }

  ngOnInit(): void {
    this.targetLength = Math.max(3, Math.min(15, this.config?.targetLength ?? 7));
    const stats = this.day ? this.stateService.getGameStats(this.day) : null;
    this.bestRound = stats?.bestRound ?? 0;
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  start(): void {
    this.clearTimers();
    this.sequence = [];
    this.mistakes = 0;
    this.nextRound();
  }

  ring(bell: Bell): void {
    if (this.phase !== 'playing') return;
    this.flash(bell, 260);

    if (bell.id !== this.sequence[this.inputIndex]) {
      this.mistakes++;
      this.phase = 'oops';
      this.later(() => this.playSequence(), 1100);
      return;
    }

    this.inputIndex++;
    if (this.inputIndex >= this.sequence.length) {
      this.recordBest(this.sequence.length);
      if (this.sequence.length >= this.targetLength) {
        this.onWin();
      } else {
        this.phase = 'listening';
        this.later(() => this.nextRound(), 800);
      }
    }
  }

  showReward(): void {
    this.completed.emit();
  }

  private nextRound(): void {
    this.sequence.push(Math.floor(Math.random() * this.bells.length));
    this.playSequence();
  }

  private playSequence(): void {
    this.phase = 'listening';
    this.inputIndex = 0;
    // Speed up a little every round
    const speed = Math.max(
      320,
      (this.config?.startSpeed ?? 650) - (this.sequence.length - 1) * 35
    );
    this.sequence.forEach((id, i) => {
      this.later(() => this.flash(this.bells[id], speed * 0.6), 500 + i * speed);
    });
    this.later(() => (this.phase = 'playing'), 500 + this.sequence.length * speed);
  }

  private flash(bell: Bell, duration: number): void {
    this.ringing = bell.id;
    // The melody IS the game, so bells play even when UI sounds are muted
    this.sound.note(bell.note, 0.32);
    this.later(() => {
      if (this.ringing === bell.id) this.ringing = null;
    }, duration);
  }

  private onWin(): void {
    this.phase = 'won';
    this.later(() => this.sound.fanfare(), 300);
    this.later(() => this.completed.emit(), 2000);
  }

  private recordBest(round: number): void {
    if (round <= this.bestRound) return;
    this.bestRound = round;
    if (this.day) {
      this.stateService.saveGameStats(this.day, { bestRound: round });
    }
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.ringing = null;
  }
}
