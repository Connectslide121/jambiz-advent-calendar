import { Component, OnInit, OnDestroy, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Lock, Gift, Sparkles } from 'lucide-angular';
import { CALENDAR_DAYS } from '../../config/calendar-config';
import { CalendarStateService } from '../../services/calendar-state.service';
import { SoundService } from '../../services/sound.service';
import { CalendarDayConfig, ChallengeType } from '../../models/calendar.models';
import { CHALLENGE_ICONS } from '../../config/challenge-icons';
import { ChallengeHost } from '../challenge-host/challenge-host';
import { ProgressTree } from '../progress-tree/progress-tree';

// Grid configuration for puzzle image
const GRID_COLS = 6;
const GRID_ROWS = 4;

/** Number of hand-painted door designs (see calendar.scss .theme-N) */
const DOOR_THEMES = 6;

/** How long the door swing plays before the challenge opens */
const DOOR_OPEN_MS = 650;

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, TranslateModule, ChallengeHost, LucideAngularModule, ProgressTree],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar implements OnInit, OnDestroy {
  readonly Check = Check;
  readonly Lock = Lock;
  readonly Gift = Gift;
  readonly Sparkles = Sparkles;

  @Output() openRewardsGallery = new EventEmitter<void>();
  @Output() openExtras = new EventEmitter<void>();
  @Output() calendarComplete = new EventEmitter<void>();

  private sound = inject(SoundService);

  // Sort calendar days by gridPosition for shuffled display
  calendarDays: CalendarDayConfig[] = [...CALENDAR_DAYS].sort(
    (a, b) => (a.gridPosition ?? 0) - (b.gridPosition ?? 0)
  );
  selectedDay: CalendarDayConfig | null = null;

  /** Door currently playing its opening animation */
  openingDay: number | null = null;
  /** Locked door that was just poked (plays a shiver) */
  shakingDay: number | null = null;

  /** Precomputed sparkle directions for the door-opening burst */
  readonly sparkles = Array.from({ length: 14 }, (_, i) => ({
    angle: (360 / 14) * i + (i % 2) * 12,
    distance: 38 + (i % 3) * 16,
    delay: (i % 4) * 30,
  }));

  // Puzzle image path - can be changed later
  readonly puzzleImagePath = 'assets/Calendar_puzzle.png';

  // Countdown timer
  countdown: string = '';
  nextUnlockDay: number | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private openTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(public stateService: CalendarStateService) {}

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    if (this.openTimer) clearTimeout(this.openTimer);
  }

  private startCountdown(): void {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private updateCountdown(): void {
    // Find the next locked day (first day that's not unlocked yet)
    const lockedDays = this.calendarDays
      .filter((d) => d.challengeType && !this.isDayUnlocked(d.day))
      .sort((a, b) => a.day - b.day);

    if (lockedDays.length === 0) {
      this.nextUnlockDay = null;
      this.countdown = '';
      return;
    }

    const nextDay = lockedDays[0].day;
    this.nextUnlockDay = nextDay;

    // Time until midnight of that day in December of the current year.
    // With a dev date override, pretend today is that December day.
    const now = new Date();
    const override = this.stateService.dateOverride;
    let diff: number;
    if (override !== null) {
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      diff = (nextDay - override - 1) * 86400000 + (midnight.getTime() - now.getTime());
    } else {
      diff = new Date(now.getFullYear(), 11, nextDay).getTime() - now.getTime();
    }

    if (diff <= 0) {
      this.countdown = '';
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');

    // Long waits (before December) show days, the last day shows a ticking clock
    this.countdown =
      days > 0
        ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Check if this day should show the countdown (is the next day to unlock)
   */
  isNextToUnlock(day: number): boolean {
    return this.nextUnlockDay === day;
  }

  /** The door that unlocked today gets the spotlight */
  isToday(day: number): boolean {
    return this.stateService.getEffectiveDecemberDay() === day && this.isDayUnlocked(day);
  }

  onDaySelected(day: CalendarDayConfig): void {
    if (!day.challengeType || this.openingDay !== null) return;

    if (!this.isDayUnlocked(day.day)) {
      this.sound.thud();
      this.shakingDay = day.day;
      setTimeout(() => {
        if (this.shakingDay === day.day) this.shakingDay = null;
      }, 600);
      return;
    }

    // Swing the door open, then show the challenge
    this.openingDay = day.day;
    this.sound.doorOpen();
    this.openTimer = setTimeout(() => {
      this.selectedDay = day;
    }, DOOR_OPEN_MS);
  }

  onCloseChallenge(): void {
    this.selectedDay = null;
    this.openingDay = null;
  }

  onChallengeCompleted(): void {
    if (this.selectedDay) {
      const wasAlreadyComplete = this.stateService.isCalendarComplete();
      this.stateService.markDayComplete(this.selectedDay.day);
      this.sound.fanfare();

      // Check if this completion finished the calendar
      if (!wasAlreadyComplete && this.stateService.isCalendarComplete()) {
        this.calendarComplete.emit();
      }
    }
  }

  isDayCompleted(day: number): boolean {
    return this.stateService.isDayCompleted(day);
  }

  isDayUnlocked(day: number): boolean {
    return this.stateService.isDayUnlocked(day);
  }

  /**
   * Check if day is locked (has challenge but not yet unlocked by date)
   */
  isDayLocked(dayConfig: CalendarDayConfig): boolean {
    return !!dayConfig.challengeType && !this.isDayUnlocked(dayConfig.day);
  }

  isDoorOpen(day: number): boolean {
    return this.openingDay === day || this.isDayCompleted(day);
  }

  getDoorTheme(day: number): string {
    // Spread the designs so neighbours rarely match
    return `theme-${(day * 7) % DOOR_THEMES}`;
  }

  getChallengeEmoji(challengeType?: ChallengeType): string {
    return challengeType ? CHALLENGE_ICONS[challengeType] : '';
  }

  getChallengeTitleKey(challengeType?: ChallengeType): string {
    if (!challengeType) return '';
    return `challenges.${challengeType}.title`;
  }

  /**
   * Get the background position for the puzzle image piece
   * based on the day's grid position
   */
  getPuzzlePieceStyle(gridPosition: number | undefined): { [key: string]: string } {
    if (gridPosition === undefined) {
      return {};
    }

    const col = gridPosition % GRID_COLS;
    const row = Math.floor(gridPosition / GRID_COLS);

    // Map 0-5 cols and 0-3 rows to 0-100% background positions
    const xPercent = GRID_COLS > 1 ? (col / (GRID_COLS - 1)) * 100 : 0;
    const yPercent = GRID_ROWS > 1 ? (row / (GRID_ROWS - 1)) * 100 : 0;

    return {
      'background-image': `url('${this.puzzleImagePath}')`,
      'background-size': `${GRID_COLS * 100}% ${GRID_ROWS * 100}%`,
      'background-position': `${xPercent}% ${yPercent}%`,
    };
  }

  /**
   * Check if rewards/extras are unlocked (all 24 days completed OR Christmas day)
   */
  isUnlocked(): boolean {
    return this.stateService.isFullyUnlocked();
  }

  /**
   * Get the number of completed days
   */
  getCompletedCount(): number {
    return this.stateService.getCompletedCount();
  }

  /**
   * Emit event to open rewards gallery
   */
  onOpenRewardsGallery(): void {
    this.openRewardsGallery.emit();
  }

  /**
   * Emit event to open extras
   */
  onOpenExtras(): void {
    this.openExtras.emit();
  }
}
