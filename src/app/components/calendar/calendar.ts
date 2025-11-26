import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Lock } from 'lucide-angular';
import { CALENDAR_DAYS } from '../../config/calendar-config';
import { CalendarStateService } from '../../services/calendar-state.service';
import { CalendarDayConfig, ChallengeType } from '../../models/calendar.models';
import { CHALLENGE_ICONS } from '../../config/challenge-icons';
import { ChallengeHost } from '../challenge-host/challenge-host';

// Grid configuration for puzzle image
const GRID_COLS = 6;
const GRID_ROWS = 4;

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, TranslateModule, ChallengeHost, LucideAngularModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar implements OnInit, OnDestroy {
  readonly Check = Check;
  readonly Lock = Lock;
  // Sort calendar days by gridPosition for shuffled display
  calendarDays: CalendarDayConfig[] = [...CALENDAR_DAYS].sort(
    (a, b) => (a.gridPosition ?? 0) - (b.gridPosition ?? 0)
  );
  selectedDay: CalendarDayConfig | null = null;

  // Puzzle image path - can be changed later
  readonly puzzleImagePath = 'assets/Jambiz_xmas_logo.png';

  // Countdown timer
  countdown: string = '';
  nextUnlockDay: number | null = null;
  private countdownInterval: any = null;

  constructor(public stateService: CalendarStateService) {}

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    this.updateCountdown();
    // Update every second
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
      this.stopCountdown();
      return;
    }

    const nextDay = lockedDays[0].day;
    this.nextUnlockDay = nextDay;

    // Calculate time until midnight of that day in December
    const now = new Date();
    const year = now.getMonth() === 11 ? now.getFullYear() : now.getFullYear(); // December of current year
    const targetDate = new Date(year, 11, nextDay, 0, 0, 0, 0); // December nextDay at midnight

    // If we're before December, target December of this year
    if (now.getMonth() < 11) {
      targetDate.setFullYear(now.getFullYear());
    }

    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) {
      this.countdown = '';
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // Format as HH:MM:SS
    this.countdown = `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if this day should show the countdown (is the next day to unlock)
   */
  isNextToUnlock(day: number): boolean {
    return this.nextUnlockDay === day;
  }

  onDaySelected(day: CalendarDayConfig): void {
    // Only open challenge if day has a challenge type AND is unlocked
    if (day.challengeType && this.isDayUnlocked(day.day)) {
      this.selectedDay = day;
    }
  }

  onCloseChallenge(): void {
    this.selectedDay = null;
  }

  onChallengeCompleted(): void {
    if (this.selectedDay) {
      this.stateService.markDayComplete(this.selectedDay.day);
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

    // Calculate percentage positions for background-position
    // We need to map 0-5 cols to 0-100% and 0-3 rows to 0-100%
    const xPercent = GRID_COLS > 1 ? (col / (GRID_COLS - 1)) * 100 : 0;
    const yPercent = GRID_ROWS > 1 ? (row / (GRID_ROWS - 1)) * 100 : 0;

    return {
      'background-image': `url('${this.puzzleImagePath}')`,
      'background-size': `${GRID_COLS * 100}% ${GRID_ROWS * 100}%`,
      'background-position': `${xPercent}% ${yPercent}%`,
    };
  }
}
