import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Play } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface JingleBellsConfig {
  targetLength?: number; // Sequence length needed to win. Default 8
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

// We Wish You a Merry Christmas: G C C D C B A A.
// The pickup and first phrase make an eight-note memory challenge.
const CAROL_FRAGMENT = [
  { bell: 0, beats: 1 }, { bell: 3, beats: 1 }, { bell: 3, beats: 0.5 },
  { bell: 4, beats: 0.5 }, { bell: 3, beats: 0.5 }, { bell: 2, beats: 0.5 },
  { bell: 1, beats: 1 }, { bell: 1, beats: 1 },
] as const;

// Continue where the fragment ends, through the verse's final cadence.
// The two extra bells for E and F join the choir only after the player wins.
const CAROL_CONTINUATION = [
  { note: 440, beats: 1 }, { note: 587.33, beats: 1 },
  { note: 587.33, beats: 0.5 }, { note: 659.25, beats: 0.5 },
  { note: 587.33, beats: 0.5 }, { note: 523.25, beats: 0.5 },
  { note: 493.88, beats: 1 }, { note: 392, beats: 1 }, { note: 392, beats: 1 },
  { note: 659.25, beats: 1 }, { note: 659.25, beats: 0.5 },
  { note: 698.46, beats: 0.5 }, { note: 659.25, beats: 0.5 },
  { note: 587.33, beats: 0.5 }, { note: 523.25, beats: 1 }, { note: 440, beats: 1 },
  { note: 392, beats: 0.5 }, { note: 392, beats: 0.5 },
  { note: 440, beats: 1 }, { note: 587.33, beats: 1 },
  { note: 493.88, beats: 1 }, { note: 523.25, beats: 3 },
] as const;

/**
 * Bell choir - Simon says with five singing bells.
 * Listen to the melody, then ring the bells back in the same order.
 * Start with one note and add one only after the player repeats the sequence.
 * Mistakes replay the current sequence. Endless mode keeps random Simon sequences.
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
    { id: 0, color: '#ff5a6e', dark: '#9b2335', note: 392, labelKey: 'challenges.jingleBells.bells.red' },
    { id: 1, color: '#f7c873', dark: '#a8721e', note: 440, labelKey: 'challenges.jingleBells.bells.gold' },
    { id: 2, color: '#5cf2b3', dark: '#17573f', note: 493.88, labelKey: 'challenges.jingleBells.bells.green' },
    { id: 3, color: '#7fb8ff', dark: '#2a4387', note: 523.25, labelKey: 'challenges.jingleBells.bells.blue' },
    { id: 4, color: 'var(--color-frost)', dark: 'var(--color-text-muted)', note: 587.33, labelKey: 'challenges.jingleBells.bells.frost' },
  ];

  private readonly fullChoir: Bell[] = [
    ...this.bells,
    { id: 5, color: 'var(--color-gold)', dark: '#a8721e', note: 659.25, labelKey: 'challenges.jingleBells.bells.highGold' },
    { id: 6, color: 'var(--color-accent-green)', dark: '#17573f', note: 698.46, labelKey: 'challenges.jingleBells.bells.highGreen' },
  ];

  get visibleBells(): Bell[] {
    return this.phase === 'won' ? this.fullChoir : this.bells;
  }

  phase: Phase = 'idle';
  sequence: number[] = [];
  inputIndex = 0;
  ringing: number | null = null;
  mistakes = 0;
  bestRound = 0;
  targetLength = 8;
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
    // Older cloud calendars used six or eleven notes for day 2. Keep this
    // revised day at eight even before that calendar document is reseeded.
    this.targetLength = this.day === 2 ? 8 : Math.max(8, Math.min(15, this.config?.targetLength ?? 8));
    this.endless = !!this.config?.endless;
    const stats = this.statsKey ? this.stateService.getGameStats(this.statsKey) : null;
    this.bestRound = stats?.bestRound ?? 0;
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  start(): void {
    this.clearTimers();
    this.sequence = [];
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
      : CAROL_FRAGMENT[this.sequence.length % CAROL_FRAGMENT.length].bell);
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
      const duration = speed * (this.endless ? 1 : CAROL_FRAGMENT[i % CAROL_FRAGMENT.length].beats);
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
    this.clearTimers();
    const speed = Math.max(320, this.config?.startSpeed ?? 650);
    let offset = 500;
    for (const { note, beats } of CAROL_CONTINUATION) {
      const duration = beats * speed;
      this.later(() => {
        const bell = this.fullChoir.find(b => b.note === note);
        if (bell) this.flash(bell, duration * 0.65);
      }, offset);
      offset += duration;
    }
    // Let the final chord ring before the host replaces this game with its reward.
    this.later(() => this.completed.emit(), offset + 1000);
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
