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
import { FlappySleighChallenge } from '../challenges/flappy-sleigh-challenge/flappy-sleigh-challenge';
import { MazeRunnerChallengeComponent } from '../challenges/maze-runner-challenge/maze-runner-challenge';

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
      levelId: level.id, // Pass levelId for stats persistence
    };
  });

  constructor() {
    // Watch for level selection and load challenge component
    effect(() => {
      const level = this.selectedLevel();
      const mode = this.viewMode();
      console.log(
        '[ExtrasModal] effect triggered. mode:',
        mode,
        'level:',
        level?.id,
        'hasContainer:',
        !!this.challengeContainer
      );
      if (mode === 'playing' && level) {
        setTimeout(() => {
          console.log(
            '[ExtrasModal] setTimeout callback. hasContainer:',
            !!this.challengeContainer
          );
          this.loadChallengeComponent();
        }, 0);
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
    console.log(
      '[ExtrasModal] loadChallengeComponent called. hasContainer:',
      !!this.challengeContainer,
      'level:',
      level?.id
    );
    if (!this.challengeContainer) {
      console.warn('[ExtrasModal] ViewContainerRef not ready yet!');
      return;
    }
    if (!level) {
      console.warn('[ExtrasModal] No level selected!');
      return;
    }

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
      case 'flappySleigh':
        componentType = FlappySleighChallenge;
        break;
      case 'mazeRunner':
        componentType = MazeRunnerChallengeComponent;
        break;
      default:
        return;
    }

    // Prepare inputs before component creation
    const isCompleted = this.isLevelCompleted(level.id);

    // Create component
    this.challengeComponentRef = this.challengeContainer.createComponent(componentType);

    // Set inputs IMMEDIATELY after creation
    const instance = this.challengeComponentRef.instance as any;
    instance.levelId = level.id;
    instance.isCompleted = isCompleted;

    if (level.challengeData) {
      instance.config = level.challengeData;
    }

    // Trigger change detection
    this.challengeComponentRef.changeDetectorRef.detectChanges();

    // Subscribe to completion event when available
    const completedOutput = instance.completed;
    if (completedOutput && typeof completedOutput.subscribe === 'function') {
      completedOutput.subscribe(() => {
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
    if (level && !level.isInfinite) {
      // Mark level as completed (skip infinite levels as they can't be "completed")
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
    // Exclude infinite levels from both completed and total counts
    const completableLevels = game.levels.filter((level: ExtraLevel) => !level.isInfinite);
    const completed = completableLevels.filter((level: ExtraLevel) =>
      this.isLevelCompleted(level.id)
    ).length;
    return {
      completed,
      total: completableLevels.length,
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
      climber: '🧗',
      flappySleigh: '🛷',
      mazeRunner: '🌀',
    };
    return icons[gameType] || '🎁';
  }
}
