import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check } from 'lucide-angular';
import { CALENDAR_DAYS } from '../../config/calendar-config';
import { CalendarStateService } from '../../services/calendar-state.service';
import { CalendarDayConfig, ChallengeType } from '../../models/calendar.models';
import { ChallengeHost } from '../challenge-host/challenge-host';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, TranslateModule, ChallengeHost, LucideAngularModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar implements OnInit {
  readonly Check = Check;
  calendarDays: CalendarDayConfig[] = CALENDAR_DAYS;
  selectedDay: CalendarDayConfig | null = null;

  // Emoji mapping for each challenge type
  private challengeEmojiMap: Record<ChallengeType, string> = {
    riddle: '🤔',
    hangman: '🔤',
    wordScramble: '🔀',
    wordSearch: '🔍',
    rebus: '🧩',
    memoryCard: '🃏',
    geometryDash: '🎅',
    sokoban: '🎁',
    climber: '🧗',
    mazeRunner: '🏃',
  };

  constructor(public stateService: CalendarStateService) {}

  ngOnInit(): void {}

  onDaySelected(day: CalendarDayConfig): void {
    // Only open challenge if day has a challenge type
    if (day.challengeType) {
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

  getChallengeEmoji(challengeType?: ChallengeType): string {
    return challengeType ? this.challengeEmojiMap[challengeType] : '';
  }
}
