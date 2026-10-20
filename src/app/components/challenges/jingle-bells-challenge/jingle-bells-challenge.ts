import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Play } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface JingleBellsConfig {
  targetLength?: number; // At least the 11-note Jingle Bells opening phrase
  startSpeed?: number; // Milliseconds per note at the start. Default 650
  endless?: boolean; // Extras: no target, the first mistake ends the run
}

interface Bell {
  id: number;
  color: string;
  dark: string;
  note: number;
  labelKey: string;
}

type Phase = 'idle' | 'listening' | 'playing' | 'oops' | 'won' | 'over';

// Jingle Bells, opening refrain in C: E E E | E E E | E G C D E.
// Beats preserve the held notes and dotted rhythm; no recording is needed.
const JINGLE_BELLS = [
  { bell: 2, beats: 1 }, { bell: 2, beats: 1 }, { bell: 2, beats: 2 },
  { bell: 2, beats: 1 }, { bell: 2, beats: 1 }, { bell: 2, beats: 2 },
  { bell: 2, beats: 1 }, { bell: 3, beats: 1 }, { bell: 0, beats: 1.5 },
  { bell: 1, beats: 0.5 }, { bell: 2, beats: 4 },
] as const;

/**
 * Bell choir - Simon says with four singing bells.
 * Listen to the melody, then ring the bells back in the same order.
 * Start with the Jingle Bells opening phrase. Harder levels add notes to it.
 * A mistake replays the same phrase. Endless mode keeps random Simon sequences.
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
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  /** Calendar day or extras level id, used to store best results */
  private get statsKey(): number | string | undefined {
    return this.day ?? this.levelId;
  }

  readonly Check = Check;
  readonly Play = Play;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);

  readonly bells: Bell[] = [
    { id: 0, color: '#ff5a6e', dark: '#9b2335', note: 523.25, labelKey: 'challenges.jingleBells.bells.red' },
    { id: 1, color: '#f7c873', dark: '#a8721e', note: 587.33, labelKey: 'challenges.jingleBells.bells.gold' },
    { id: 2, color: '#5cf2b3', dark: '#17573f', note: 659.25, labelKey: 'challenges.jingleBells.bells.green' },
    { id: 3, color: '#7fb8ff', dark: '#2a4387', note: 783.99, labelKey: 'challenges.jingleBells.bells.blue' },
  ];

  phase: Phase = 'idle';
  sequence: number[] = [];
  inputIndex = 0;
  ringing: number | null = null;
  mistakes = 0;
  bestRound = 0;
  targetLength: number = JINGLE_BELLS.length;
  endless = false;
  /** Melody length reached in the last endless run */
  finalScore = 0;

  private timers: ReturnType<typeof setTimeout>[] = [];
  private clearedNotes = 0;

  get round(): number {
    return this.sequence.length;
  }

  /** Melodies fully played back so far */
  get roundsCleared(): number {
    return this.clearedNotes;
  }

  get noteSlots(): number[] {
    // Endless mode shows a window of notes that grows with the melody
    const length = this.endless ? Math.max(6, this.round + 1) : this.targetLength;
    return Array.from({ length }, (_, i) => i);
  }

  ngOnInit(): void {
    // Older stored calendar definitions requested only six notes (all E's).
    // Always include the complete phrase, including its recognisable ending.
    this.targetLength = Math.max(JINGLE_BELLS.length, Math.min(15, this.config?.targetLength ?? JINGLE_BELLS.length));
    this.endless = !!this.config?.endless;
    const stats = this.statsKey ? this.stateService.getGameStats(this.statsKey) : null;
    this.bestRound = stats?.bestRound ?? 0;
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  start(): void {
    this.clearTimers();
    this.sequence = this.endless ? [] : JINGLE_BELLS.slice(0, -1).map(note => note.bell);
    this.clearedNotes = 0;
    this.mistakes = 0;
    this.nextRound();
  }

  ring(bell: Bell): void {
    if (this.phase !== 'playing') return;
    this.flash(bell, 260);

    if (bell.id !== this.sequence[this.inputIndex]) {
      this.mistakes++;
      if (this.endless) {
        // Classic Simon: one slip ends the run
        this.finalScore = this.sequence.length - 1;
        this.phase = 'over';
        this.sound.thud();
        return;
      }
      this.phase = 'oops';
      this.later(() => this.playSequence(), 1100);
      return;
    }

    this.inputIndex++;
    if (this.inputIndex >= this.sequence.length) {
      this.clearedNotes = this.sequence.length;
      this.recordBest(this.sequence.length);
      if (!this.endless && this.sequence.length >= this.targetLength) {
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
    this.sequence.push(this.endless
      ? Math.floor(Math.random() * this.bells.length)
      : JINGLE_BELLS[this.sequence.length % JINGLE_BELLS.length].bell);
    this.playSequence();
  }

  private playSequence(): void {
    this.phase = 'listening';
    this.inputIndex = 0;
    // Keep the carol's beat steady; only the random endless mode accelerates.
    const speed = Math.max(
      320,
      (this.config?.startSpeed ?? 650) - (this.endless ? (this.sequence.length - 1) * 35 : 0)
    );
    let offset = 500;
    this.sequence.forEach((id, i) => {
      const duration = speed * (this.endless ? 1 : JINGLE_BELLS[i % JINGLE_BELLS.length].beats);
      this.later(() => this.flash(this.bells[id], duration * 0.65), offset);
      offset += duration;
    });
    this.later(() => (this.phase = 'playing'), offset);
  }

  private flash(bell: Bell, duration: number): void {
    this.ringing = bell.id;
    // The melody IS the game, so bells play even when UI sounds are muted
    this.sound.note(bell.note, 0.22);
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
    if (this.statsKey) {
      this.stateService.saveGameStats(this.statsKey, { bestRound: round });
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
