import { Component, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Calendar } from './components/calendar/calendar';
import { ChallengeHost } from './components/challenge-host/challenge-host';
import { LandingPage } from './components/landing-page/landing-page';
import { EXTRA_LEVELS, ExtraGameSection, ExtraLevel } from './config/extras-config';
import { CALENDAR_DAYS } from './config/calendar-config';
import { CalendarDayConfig, ChallengeType } from './models/calendar.models';
import { CHALLENGE_ICONS, DEFAULT_CHALLENGE_ICON } from './config/challenge-icons';
import {
  LucideAngularModule,
  X,
  ArrowLeft,
  Check,
  CheckCheck,
  XCircle,
  Lock,
} from 'lucide-angular';
import { CalendarStateService } from './services/calendar-state.service';

interface Snowflake {
  left: number;
  animationDuration: number;
  animationDelay: number;
  startY: number;
  fontSize: number;
  opacity: number;
}

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    TranslateModule,
    Calendar,
    ChallengeHost,
    LucideAngularModule,
    LandingPage,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly X = X;
  readonly ArrowLeft = ArrowLeft;
  readonly Check = Check;
  readonly CheckCheck = CheckCheck;
  readonly XCircle = XCircle;
  readonly Lock = Lock;
  currentLanguage: string;
  snowflakes: Snowflake[] = [];
  showLandingPage = true;
  showExtrasMenu = false;
  showExtraChallenge = false;
  showRewardsGallery = false;
  selectedGame: ExtraGameSection | null = null;
  selectedExtraConfig: CalendarDayConfig | null = null;
  selectedExtraId: string | null = null;
  extraLevels = EXTRA_LEVELS;
  calendarDays = CALENDAR_DAYS;
  private readonly STORAGE_KEY = 'extras-completed';
  private completedExtras = new Set<string>();

  constructor(private translate: TranslateService, public calendarState: CalendarStateService) {
    // Initialize language from localStorage or default to Swedish
    const savedLang = localStorage.getItem('language') || 'sv';
    this.currentLanguage = savedLang;
    this.translate.use(savedLang);
    this.loadCompletedExtras();
  }

  ngOnInit(): void {
    this.generateSnowflakes();
  }

  switchLanguage(lang: string): void {
    this.currentLanguage = lang;
    this.translate.use(lang);
    localStorage.setItem('language', lang);
  }

  toggleLanguage(): void {
    const newLang = this.currentLanguage === 'sv' ? 'en' : 'sv';
    this.switchLanguage(newLang);
  }

  startCalendar(): void {
    this.showLandingPage = false;
  }

  // Check if extras and rewards gallery are unlocked
  isUnlocked(): boolean {
    return this.calendarState.isFullyUnlocked();
  }

  openExtras(): void {
    if (!this.isUnlocked()) return;
    this.showExtrasMenu = true;
    this.selectedGame = null;
  }

  closeExtrasMenu(): void {
    this.showExtrasMenu = false;
    this.selectedGame = null;
  }

  openRewardsGallery(): void {
    if (!this.isUnlocked()) return;
    this.showRewardsGallery = true;
  }

  closeRewardsGallery(): void {
    this.showRewardsGallery = false;
  }

  // Get all days sorted by day number for rewards gallery
  getSortedCalendarDays(): CalendarDayConfig[] {
    return [...this.calendarDays].sort((a, b) => a.day - b.day);
  }

  // Get the reward text for a day (either from reward config or funFactKey)
  getRewardText(day: CalendarDayConfig): string {
    if (day.reward?.textKey) {
      return day.reward.textKey;
    }
    if (day.funFactKey) {
      return day.funFactKey;
    }
    return '';
  }

  // Check if day has a video reward
  hasVideoReward(day: CalendarDayConfig): boolean {
    return day.reward?.type === 'video';
  }

  selectGame(game: ExtraGameSection): void {
    this.selectedGame = game;
  }

  backToGameSelection(): void {
    this.selectedGame = null;
  }

  selectExtra(level: ExtraLevel): void {
    this.selectedExtraId = level.id;
    this.selectedExtraConfig = {
      day: 0,
      challengeType: level.challengeType,
      funFactKey: '',
      challengeData: level.challengeData,
      levelId: level.id, // Add levelId for stats persistence
    };
    this.showExtraChallenge = true;
    this.showExtrasMenu = false;
  }

  closeExtraChallenge(): void {
    this.showExtraChallenge = false;
    this.selectedExtraConfig = null;
    this.showExtrasMenu = true;
  }

  onExtraChallengeCompleted(): void {
    if (this.selectedExtraId) {
      this.completedExtras.add(this.selectedExtraId);
      this.saveCompletedExtras();
    }
  }

  isExtraCompleted(levelId: string): boolean {
    return this.completedExtras.has(levelId);
  }

  getCompletionCount(game: ExtraGameSection): { completed: number; total: number } {
    const completableLevels = game.levels.filter((level) => !level.isInfinite);
    const completed = completableLevels.filter((level) => this.isExtraCompleted(level.id)).length;
    return { completed, total: completableLevels.length };
  }

  getGameIcon(gameType: string): string {
    return CHALLENGE_ICONS[gameType as ChallengeType] || DEFAULT_CHALLENGE_ICON;
  }

  markAllComplete(): void {
    if (confirm(this.translate.instant('admin.confirmMarkAll'))) {
      // Mark all calendar days (1-24) as completed
      this.calendarState.markAllDaysComplete();

      // Mark all extras as completed (excluding infinite levels)
      EXTRA_LEVELS.forEach((game) => {
        game.levels.forEach((level) => {
          if (!level.isInfinite) {
            this.completedExtras.add(level.id);
          }
        });
      });
      this.saveCompletedExtras();

      alert(this.translate.instant('admin.allMarkedComplete'));
    }
  }

  clearAllProgress(): void {
    if (confirm(this.translate.instant('admin.confirmClearAll'))) {
      // Clear all calendar days
      this.calendarState.clearAllProgress();

      // Clear all extras
      this.completedExtras.clear();
      this.saveCompletedExtras();

      alert(this.translate.instant('admin.allCleared'));
    }
  }

  private loadCompletedExtras(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.completedExtras = new Set(parsed);
      } catch {
        this.completedExtras = new Set();
      }
    }
  }

  private saveCompletedExtras(): void {
    const array = Array.from(this.completedExtras);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(array));
  }

  private generateSnowflakes(): void {
    const count = 100;
    for (let i = 0; i < count; i++) {
      this.snowflakes.push({
        left: Math.random() * 100,
        animationDuration: 10 + Math.random() * 20,
        animationDelay: Math.random() * 10,
        startY: -(Math.random() * 100),
        fontSize: 10 + Math.random() * 20,
        opacity: 0.3 + Math.random() * 0.5,
      });
    }
  }
}
