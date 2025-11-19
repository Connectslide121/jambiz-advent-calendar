import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
  ViewChild,
  ViewContainerRef,
  ComponentRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { EXTRA_LEVELS, ExtraGameSection, ExtraLevel } from '../../config/extras-config';
import { CalendarDayConfig } from '../../models/calendar.models';
import { RiddleChallenge } from '../challenges/riddle-challenge/riddle-challenge';
import { HangmanChallenge } from '../challenges/hangman-challenge/hangman-challenge';
import { WordScrambleChallenge } from '../challenges/word-scramble-challenge/word-scramble-challenge';
import { WordSearchChallenge } from '../challenges/word-search-challenge/word-search-challenge';
import { RebusChallenge } from '../challenges/rebus-challenge/rebus-challenge';
import { MemoryCardChallenge } from '../challenges/memory-card-challenge/memory-card-challenge';
import { GeometryDashChallenge } from '../challenges/geometry-dash-challenge/geometry-dash-challenge';
import { SokobanChallengeComponent } from '../challenges/sokoban-challenge/sokoban-challenge';
import ClimberChallengeComponent from '../challenges/climber-challenge/climber-challenge';

type ViewMode = 'games' | 'levels' | 'playing';

@Component({
  selector: 'app-extras-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './extras-modal.html',
  styleUrls: ['./extras-modal.scss'],
})
export class ExtrasModalComponent {
  readonly X = X;
  @Output() close = new EventEmitter<void>();

  @ViewChild('challengeContainer', { read: ViewContainerRef })
  challengeContainer!: ViewContainerRef;

  private readonly STORAGE_KEY = 'extras-completed';
  extraLevels = EXTRA_LEVELS;

  viewMode = signal<ViewMode>('games');
  selectedGame = signal<ExtraGameSection | null>(null);
  selectedLevel = signal<ExtraLevel | null>(null);

  private completedLevels = signal<Set<string>>(this.loadCompletedLevels());
  private challengeComponentRef?: ComponentRef<any>;

  // Convert selected level to CalendarDayConfig format for challenge-host
  currentDayConfig = computed<CalendarDayConfig | null>(() => {
    const level = this.selectedLevel();
    if (!level) return null;

    return {
      day: 0, // Not used in extras context
      challengeType: level.challengeType,
      funFactKey: '', // No fun facts for extras
      challengeData: level.challengeData,
    };
  });

  constructor() {
    // Watch for level selection and load challenge component
    effect(() => {
      const level = this.selectedLevel();
      const mode = this.viewMode();
      if (mode === 'playing' && level) {
        setTimeout(() => this.loadChallengeComponent(), 0);
      }
    });
  }

  private loadCompletedLevels(): Set<string> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return new Set(parsed);
      } catch {
        return new Set();
      }
    }
    return new Set();
  }

  private saveCompletedLevels(): void {
    const levelsArray = Array.from(this.completedLevels());
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(levelsArray));
  }

  private loadChallengeComponent(): void {
    const level = this.selectedLevel();
    if (!this.challengeContainer || !level) return;

    this.challengeContainer.clear();

    let componentType: any;

    switch (level.challengeType) {
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
      case 'sokoban':
        componentType = SokobanChallengeComponent;
        break;
      case 'climber':
        componentType = ClimberChallengeComponent;
        break;
      default:
        return;
    }

    this.challengeComponentRef = this.challengeContainer.createComponent(componentType);

    // Pass config data to the challenge component
    if (level.challengeData) {
      this.challengeComponentRef.instance.config = level.challengeData;
    }

    // Pass completed state
    const isCompleted = this.isLevelCompleted(level.id);
    if (this.challengeComponentRef.instance.isCompleted !== undefined) {
      this.challengeComponentRef.instance.isCompleted = isCompleted;
    }

    // Subscribe to completion event
    if (this.challengeComponentRef.instance.completed) {
      this.challengeComponentRef.instance.completed.subscribe(() => {
        this.handleChallengeCompleted();
      });
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  selectGame(game: ExtraGameSection): void {
    this.selectedGame.set(game);
    this.viewMode.set('levels');
  }

  selectLevel(level: ExtraLevel): void {
    this.selectedLevel.set(level);
    this.viewMode.set('playing');
  }

  backToGames(): void {
    this.selectedGame.set(null);
    this.selectedLevel.set(null);
    this.viewMode.set('games');
  }

  backToLevels(): void {
    this.selectedLevel.set(null);
    this.viewMode.set('levels');
  }

  handleChallengeCompleted(): void {
    const level = this.selectedLevel();
    if (level) {
      // Mark level as completed
      this.completedLevels.update((levels) => {
        const newSet = new Set(levels);
        newSet.add(level.id);
        return newSet;
      });
      this.saveCompletedLevels();
    }
  }

  isLevelCompleted(levelId: string): boolean {
    return this.completedLevels().has(levelId);
  }

  getCompletionCount(game: ExtraGameSection): { completed: number; total: number } {
    const completed = game.levels.filter((level: ExtraLevel) =>
      this.isLevelCompleted(level.id)
    ).length;
    return {
      completed,
      total: game.levels.length,
    };
  }

  getGameIcon(gameType: string): string {
    const icons: Record<string, string> = {
      riddle: '🤔',
      hangman: '🎄',
      wordScramble: '🔤',
      wordSearch: '🔍',
      rebus: '🖼️',
      memoryCard: '🎴',
      geometryDash: '🎮',
      sokoban: '📦',
    };
    return icons[gameType] || '🎁';
  }
}
