import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Triangle, Keyboard, Smartphone } from 'lucide-angular';
import { GameService } from '../../../services/game.service';
import { KeyboardService } from '../../../services/keyboard.service';
import { SpriteService } from '../../../services/sprite.service';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { ChallengeInfoModalComponent } from '../../shared/challenge-info-modal/challenge-info-modal.component';

export type GeometryDashDifficulty = 'easy' | 'medium' | 'hard' | 'custom';

export interface GeometryDashDifficultyConfig {
  infiniteMode?: boolean;
  levelLength: number;
  scrollSpeed: number;
  jumpForce: number;
  gravity: number;
  minObstacleSpacing: number;
  maxObstacleSpacing: number;
  candyChance: number;
  platformChance: number;
  pitChance: number;
  ceilingCandyChance: number;
  minCandyHeight: number;
  maxCandyHeight: number;
  candyWidth: number;
  minPlatformWidth: number;
  maxPlatformWidth: number;
  platformHeightRange: [number, number];
  minPitWidth: number;
  maxPitWidth: number;
  ceilingCandyLength: [number, number];
  assistPlatformOffset: number;
}

export interface GeometryDashConfig {
  difficulty?: GeometryDashDifficulty;
  difficultyConfig?: Partial<GeometryDashDifficultyConfig>;
  infiniteMode?: boolean; // If true, level continues indefinitely with timer score
  // Legacy support for manual obstacle arrays
  levelLength?: number;
  scrollSpeed?: number;
  jumpForce?: number;
  gravity?: number;
  obstacles?: Array<{
    x: number;
    width: number;
    height: number;
    type: 'candy' | 'pit' | 'platform' | 'ceilingCandy';
  }>;
}

const DIFFICULTY_PRESETS: Record<GeometryDashDifficulty, GeometryDashDifficultyConfig> = {
  easy: {
    levelLength: 4000,
    scrollSpeed: 200,
    jumpForce: 760,
    gravity: 1800,
    minObstacleSpacing: 200,
    maxObstacleSpacing: 350,
    candyChance: 0.65,
    platformChance: 0.15,
    pitChance: 0.1,
    ceilingCandyChance: 0.1,
    minCandyHeight: 60,
    maxCandyHeight: 100,
    candyWidth: 40,
    minPlatformWidth: 80,
    maxPlatformWidth: 140,
    platformHeightRange: [50, 80],
    minPitWidth: 80,
    maxPitWidth: 120,
    ceilingCandyLength: [100, 150],
    assistPlatformOffset: 220,
  },
  medium: {
    levelLength: 4000,
    scrollSpeed: 240,
    jumpForce: 850,
    gravity: 2000,
    minObstacleSpacing: 220,
    maxObstacleSpacing: 400,
    candyChance: 0.55,
    platformChance: 0.1,
    pitChance: 0.2,
    ceilingCandyChance: 0.15,
    minCandyHeight: 70,
    maxCandyHeight: 120,
    candyWidth: 40,
    minPlatformWidth: 70,
    maxPlatformWidth: 120,
    platformHeightRange: [50, 90],
    minPitWidth: 90,
    maxPitWidth: 140,
    ceilingCandyLength: [120, 180],
    assistPlatformOffset: 200,
  },
  hard: {
    levelLength: 8000,
    scrollSpeed: 280,
    jumpForce: 800,
    gravity: 2200,
    minObstacleSpacing: 200,
    maxObstacleSpacing: 380,
    candyChance: 0.5,
    platformChance: 0.1,
    pitChance: 0.2,
    ceilingCandyChance: 0.2,
    minCandyHeight: 80,
    maxCandyHeight: 140,
    candyWidth: 40,
    minPlatformWidth: 60,
    maxPlatformWidth: 100,
    platformHeightRange: [60, 100],
    minPitWidth: 100,
    maxPitWidth: 160,
    ceilingCandyLength: [140, 220],
    assistPlatformOffset: 180,
  },
  custom: {
    levelLength: 3000,
    scrollSpeed: 240,
    jumpForce: 850,
    gravity: 2000,
    minObstacleSpacing: 220,
    maxObstacleSpacing: 400,
    candyChance: 0.4,
    platformChance: 0.3,
    pitChance: 0.15,
    ceilingCandyChance: 0.15,
    minCandyHeight: 70,
    maxCandyHeight: 120,
    candyWidth: 40,
    minPlatformWidth: 70,
    maxPlatformWidth: 120,
    platformHeightRange: [50, 90],
    minPitWidth: 90,
    maxPitWidth: 140,
    ceilingCandyLength: [120, 180],
    assistPlatformOffset: 200,
  },
};

@Component({
  selector: 'app-geometry-dash-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule, ChallengeInfoModalComponent],
  templateUrl: './geometry-dash-challenge.html',
  styleUrl: './geometry-dash-challenge.scss',
})
export class GeometryDashChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config!: GeometryDashConfig;
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Check = Check;
  readonly Triangle = Triangle;
  readonly Keyboard = Keyboard;
  readonly Smartphone = Smartphone;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  gameLoopId?: number;
  playerSprite: HTMLImageElement | null = null;
  private jumpKeyPressed = false;
  private isMobile = false;
  private scale = 1;

  // Active difficulty settings and generated obstacles
  private activeDifficulty!: GeometryDashDifficultyConfig;
  private obstacles: Array<{
    x: number;
    width: number;
    height: number;
    type: 'candy' | 'pit' | 'platform' | 'ceilingCandy';
  }> = [];

  // Infinite mode properties
  isInfiniteMode = false;
  private survivalTime = 0; // Time survived in seconds
  private lastObstacleX = 0; // Track last generated obstacle position
  private lastObstacleType: 'candy' | 'platform' | 'pit' | 'ceilingCandy' | null = null;

  // Best scores for infinite mode
  bestTime = 0;
  bestTimeFormatted = '00:00.000';
  lastRunTime = 0;
  lastRunTimeFormatted = '00:00.000';

  // Player state
  player = {
    x: 100, // Fixed x position (adjusted for mobile in initCanvas)
    y: 300,
    width: 40,
    height: 40,
    velocityY: 0,
    isOnGround: false,
  };

  // Game state
  cameraX = 0;
  gameStarted = false;
  gameWon = false;
  gameLost = false;
  showInstructions = true;
  groundY = 450;
  elapsedTime = 0;

  constructor(
    private gameService: GameService,
    private keyboardService: KeyboardService,
    private spriteService: SpriteService,
    private stateService: CalendarStateService
  ) {}

  ngOnInit(): void {
    // If already completed, show win state
    if (this.isCompleted) {
      this.gameWon = true;
    }

    // Initialize difficulty and generate obstacles
    this.initializeDifficulty();

    // Check if infinite mode (must be after initializeDifficulty)
    this.isInfiniteMode = this.activeDifficulty.infiniteMode || false;
    this.generateObstacles();

    // Load persisted best scores for infinite mode
    if (this.isInfiniteMode) {
      const storageKey = this.getStorageKey();
      if (storageKey) {
        const savedStats = this.stateService.getGameStats(storageKey);
        if (savedStats) {
          this.bestTime = savedStats.bestTime || 0;
          this.bestTimeFormatted = this.formatTime(this.bestTime);
        }
      }
    }

    // Initialize keyboard service
    this.keyboardService.init();
  }

  ngAfterViewInit(): void {
    if (this.canvasRef) {
      // Small delay to ensure modal is fully rendered with correct width
      setTimeout(() => {
        this.initCanvas(this.canvasRef.nativeElement);
        // Load player sprite
        this.spriteService
          .loadSprite('player', '/assets/sprites/player.png')
          .then((sprite) => {
            this.playerSprite = sprite;
            this.render(); // Draw initial state with sprite
          })
          .catch(() => {
            // Fallback to render without sprite if load fails
            this.render();
          });
      }, 50);
    }
  }

  ngOnDestroy(): void {
    this.stopGame();
    this.keyboardService.destroy();
  }

  private initializeDifficulty(): void {
    // Check if using legacy obstacle array format
    if (this.config.obstacles && this.config.obstacles.length > 0) {
      // Legacy format - convert to difficulty config
      this.activeDifficulty = {
        levelLength: this.config.levelLength || 3000,
        scrollSpeed: this.config.scrollSpeed || 240,
        jumpForce: this.config.jumpForce || 850,
        gravity: this.config.gravity || 2000,
        minObstacleSpacing: 250,
        maxObstacleSpacing: 500,
        candyChance: 0.35,
        platformChance: 0.3,
        pitChance: 0.2,
        ceilingCandyChance: 0.15,
        minCandyHeight: 70,
        maxCandyHeight: 130,
        candyWidth: 40,
        minPlatformWidth: 70,
        maxPlatformWidth: 120,
        platformHeightRange: [50, 90],
        minPitWidth: 90,
        maxPitWidth: 140,
        ceilingCandyLength: [120, 180],
        assistPlatformOffset: 180,
      };
      this.obstacles = this.config.obstacles;
      return;
    }

    // Use difficulty preset
    const difficulty = this.config.difficulty || 'medium';
    const preset = DIFFICULTY_PRESETS[difficulty];

    // Merge with custom overrides if provided
    this.activeDifficulty = {
      ...preset,
      ...(this.config.difficultyConfig || {}),
    };
  }

  private generateObstacles(): void {
    // Skip if using legacy obstacle array
    if (this.config.obstacles && this.config.obstacles.length > 0) {
      return;
    }

    this.obstacles = [];
    const config = this.activeDifficulty;

    // Calculate max jumpable height based on physics
    const maxJumpableHeight = this.calculateMaxJumpHeight();

    let currentX = 500; // Start generating after initial safe zone
    const endX = this.isInfiniteMode ? 2000 : config.levelLength - 300; // In infinite mode, generate initial batch

    this.lastObstacleX = currentX;

    while (currentX < endX) {
      // Determine spacing for this obstacle
      const spacing =
        config.minObstacleSpacing +
        Math.random() * (config.maxObstacleSpacing - config.minObstacleSpacing);

      currentX += spacing;

      if (currentX >= endX) break;

      // Select obstacle type based on weighted probabilities
      const obstacleType = this.selectObstacleType();

      if (obstacleType === 'candy') {
        const height =
          config.minCandyHeight + Math.random() * (config.maxCandyHeight - config.minCandyHeight);

        // Check if candy is too tall and needs a platform before it
        if (height > maxJumpableHeight) {
          // ALWAYS insert assist platform for tall candies
          const platformX = currentX - config.assistPlatformOffset;
          const lastObstacleX =
            this.obstacles.length > 0 ? this.obstacles[this.obstacles.length - 1].x : 0;

          // Ensure platform doesn't overlap with previous obstacle
          const safeX = Math.max(platformX, lastObstacleX + 100);

          // Only skip if platform would be too close to the candy itself
          if (currentX - safeX > 120) {
            const platformWidth =
              config.minPlatformWidth +
              Math.random() * (config.maxPlatformWidth - config.minPlatformWidth);
            const platformHeight =
              config.platformHeightRange[0] +
              Math.random() * (config.platformHeightRange[1] - config.platformHeightRange[0]);

            this.obstacles.push({
              x: safeX,
              width: platformWidth,
              height: platformHeight,
              type: 'platform',
            });
          } else {
            // If we can't fit a platform, reduce the candy height to be jumpable
            const reducedHeight = maxJumpableHeight - 10;
            this.obstacles.push({
              x: currentX,
              width: config.candyWidth,
              height: reducedHeight,
              type: 'candy',
            });
            continue;
          }
        }

        this.obstacles.push({
          x: currentX,
          width: config.candyWidth,
          height,
          type: 'candy',
        });
        this.lastObstacleType = 'candy';
      } else if (obstacleType === 'platform') {
        const width =
          config.minPlatformWidth +
          Math.random() * (config.maxPlatformWidth - config.minPlatformWidth);
        const height =
          config.platformHeightRange[0] +
          Math.random() * (config.platformHeightRange[1] - config.platformHeightRange[0]);

        this.obstacles.push({
          x: currentX,
          width,
          height,
          type: 'platform',
        });
        this.lastObstacleType = 'platform';
      } else if (obstacleType === 'pit') {
        const width =
          config.minPitWidth + Math.random() * (config.maxPitWidth - config.minPitWidth);

        // Ensure pit is jumpable (check horizontal distance)
        const maxJumpableGap = this.calculateMaxJumpDistance();
        const finalWidth = Math.min(width, maxJumpableGap);

        this.obstacles.push({
          x: currentX,
          width: finalWidth,
          height: 0, // Pits have no height
          type: 'pit',
        });
        this.lastObstacleType = 'pit';

        // Add spacing to account for pit width
        currentX += finalWidth;
      } else if (obstacleType === 'ceilingCandy') {
        const length =
          config.ceilingCandyLength[0] +
          Math.random() * (config.ceilingCandyLength[1] - config.ceilingCandyLength[0]);

        // Random height that player must duck under
        const height = 200 + Math.random() * 200;

        this.obstacles.push({
          x: currentX,
          width: length,
          height,
          type: 'ceilingCandy',
        });
        this.lastObstacleType = 'ceilingCandy';

        // Add spacing to account for ceiling candy length
        currentX += length;
      }

      // Update last obstacle position
      this.lastObstacleX = Math.max(this.lastObstacleX, currentX);
    }
  }

  private generateMoreObstacles(): void {
    // Only for infinite mode
    if (!this.isInfiniteMode) return;

    const config = this.activeDifficulty;
    const maxJumpableHeight = this.calculateMaxJumpHeight();

    // Generate obstacles up to a certain distance ahead of camera
    const generateAheadDistance = 1500;
    const targetX = this.cameraX + generateAheadDistance;

    while (this.lastObstacleX < targetX) {
      const spacing =
        config.minObstacleSpacing +
        Math.random() * (config.maxObstacleSpacing - config.minObstacleSpacing);

      this.lastObstacleX += spacing;
      const currentX = this.lastObstacleX;

      const obstacleType = this.selectObstacleType();

      if (obstacleType === 'candy') {
        const height =
          config.minCandyHeight + Math.random() * (config.maxCandyHeight - config.minCandyHeight);

        if (height > maxJumpableHeight) {
          const platformX = currentX - config.assistPlatformOffset;
          const lastObstacleInArrayX =
            this.obstacles.length > 0 ? this.obstacles[this.obstacles.length - 1].x : 0;
          const safeX = Math.max(platformX, lastObstacleInArrayX + 100);

          if (currentX - safeX > 120) {
            const platformWidth =
              config.minPlatformWidth +
              Math.random() * (config.maxPlatformWidth - config.minPlatformWidth);
            const platformHeight =
              config.platformHeightRange[0] +
              Math.random() * (config.platformHeightRange[1] - config.platformHeightRange[0]);

            this.obstacles.push({
              x: safeX,
              width: platformWidth,
              height: platformHeight,
              type: 'platform',
            });
          } else {
            const reducedHeight = maxJumpableHeight - 10;
            this.obstacles.push({
              x: currentX,
              width: config.candyWidth,
              height: reducedHeight,
              type: 'candy',
            });
            continue;
          }
        }

        this.obstacles.push({
          x: currentX,
          width: config.candyWidth,
          height,
          type: 'candy',
        });
        this.lastObstacleType = 'candy';
      } else if (obstacleType === 'platform') {
        const width =
          config.minPlatformWidth +
          Math.random() * (config.maxPlatformWidth - config.minPlatformWidth);
        const height =
          config.platformHeightRange[0] +
          Math.random() * (config.platformHeightRange[1] - config.platformHeightRange[0]);

        this.obstacles.push({
          x: currentX,
          width,
          height,
          type: 'platform',
        });
        this.lastObstacleType = 'platform';
      } else if (obstacleType === 'pit') {
        const width =
          config.minPitWidth + Math.random() * (config.maxPitWidth - config.minPitWidth);
        const maxJumpableGap = this.calculateMaxJumpDistance();
        const finalWidth = Math.min(width, maxJumpableGap);

        this.obstacles.push({
          x: currentX,
          width: finalWidth,
          height: 0,
          type: 'pit',
        });
        this.lastObstacleType = 'pit';

        this.lastObstacleX += finalWidth;
      } else if (obstacleType === 'ceilingCandy') {
        const length =
          config.ceilingCandyLength[0] +
          Math.random() * (config.ceilingCandyLength[1] - config.ceilingCandyLength[0]);
        const height = 200 + Math.random() * 200;

        this.obstacles.push({
          x: currentX,
          width: length,
          height,
          type: 'ceilingCandy',
        });
        this.lastObstacleType = 'ceilingCandy';

        this.lastObstacleX += length;
      }
    }

    // Clean up obstacles that are far behind the camera to save memory
    const cleanupDistance = 1000;
    this.obstacles = this.obstacles.filter((obs) => obs.x > this.cameraX - cleanupDistance);
  }

  private selectObstacleType(): 'candy' | 'platform' | 'pit' | 'ceilingCandy' {
    const config = this.activeDifficulty;

    // If last obstacle was ceiling candy, exclude it from this selection
    let candyChance = config.candyChance;
    let platformChance = config.platformChance;
    let pitChance = config.pitChance;
    let ceilingCandyChance =
      this.lastObstacleType === 'ceilingCandy' ? 0 : config.ceilingCandyChance;

    // Normalize chances to ensure they sum to 1.0
    const total = candyChance + platformChance + pitChance + ceilingCandyChance;
    const normalizedCandyChance = candyChance / total;
    const normalizedPlatformChance = platformChance / total;
    const normalizedPitChance = pitChance / total;

    const random = Math.random();

    if (random < normalizedCandyChance) {
      return 'candy';
    } else if (random < normalizedCandyChance + normalizedPlatformChance) {
      return 'platform';
    } else if (random < normalizedCandyChance + normalizedPlatformChance + normalizedPitChance) {
      return 'pit';
    } else {
      return 'ceilingCandy';
    }
  }

  private calculateMaxJumpHeight(): number {
    // Calculate max height player can reach with a jump
    // Using kinematic equation: v^2 = u^2 + 2as
    // At max height, v = 0, u = jumpForce, a = -gravity
    const jumpForce = this.activeDifficulty.jumpForce;
    const gravity = this.activeDifficulty.gravity;

    // Max height = (jumpForce^2) / (2 * gravity)
    // Subtract player height and add buffer
    return (jumpForce * jumpForce) / (2 * gravity) - this.player.height - 20;
  }

  private calculateMaxJumpDistance(): number {
    // Calculate max horizontal distance player can cover in a jump
    // Time in air = 2 * jumpForce / gravity
    // Distance = scrollSpeed * time
    const jumpForce = this.activeDifficulty.jumpForce;
    const gravity = this.activeDifficulty.gravity;
    const scrollSpeed = this.activeDifficulty.scrollSpeed;

    const airTime = (2 * jumpForce) / gravity;
    const distance = scrollSpeed * airTime;

    // Return conservative estimate (80% of theoretical max)
    return distance * 0.8;
  }

  initCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) return;
    this.ctx = context;

    // Set canvas size - fit to container with good aspect ratio
    const containerWidth = canvas.parentElement!.clientWidth;
    const targetWidth = containerWidth;

    // Detect mobile and apply zoom-out scale
    this.isMobile = containerWidth < 640;
    this.scale = this.isMobile ? 0.5 : 1; // Zoom out 50% on mobile

    const aspectRatio = 0.5625; // 16:9 aspect ratio
    const targetHeight = containerWidth * aspectRatio;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Set ground position based on device
    if (this.isMobile) {
      // On mobile, position ground at about 40% from top instead of bottom
      // This reduces the teal ground area significantly
      this.groundY = (canvas.height / this.scale) * 0.7;
    } else {
      // Desktop: standard bottom position
      this.groundY = canvas.height - 50;
    }

    this.player.y = this.groundY - this.player.height;

    // Position player closer to left edge on mobile for better view distance
    this.player.x = this.isMobile ? 60 : 100;

    this.gameService.scaleCanvasForRetina(canvas);
  }

  startGame(): void {
    this.gameStarted = true;
    this.showInstructions = false;
    this.elapsedTime = 0;
    this.survivalTime = 0;
    // Regenerate obstacles for replay variety
    this.generateObstacles();

    this.gameLoopId = this.gameService.startGameLoop((deltaTime) => {
      this.update(deltaTime);
      this.render();
    });
  }

  private getStorageKey(): number | string | null {
    // For extras, use levelId; for calendar days, use day number
    if (this.levelId) {
      return this.levelId;
    }
    if (this.day && this.day > 0) {
      return this.day;
    }
    return null;
  }

  formatTime(totalSeconds: number): string {
    if (!isFinite(totalSeconds) || totalSeconds <= 0) {
      return '00:00.000';
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  stopGame(): void {
    if (this.gameLoopId !== undefined) {
      this.gameService.stopGameLoop(this.gameLoopId);
      this.gameLoopId = undefined;
    }

    // Save stats when infinite mode ends
    if (this.isInfiniteMode && this.gameLost) {
      const time = this.survivalTime;
      this.lastRunTime = time;
      this.lastRunTimeFormatted = this.formatTime(time);

      if (time > this.bestTime) {
        this.bestTime = time;
        this.bestTimeFormatted = this.lastRunTimeFormatted;
      }

      // Persist best scores
      const storageKey = this.getStorageKey();
      if (storageKey) {
        this.stateService.saveGameStats(storageKey, {
          bestTime: this.bestTime,
        });
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.gameStarted || this.gameWon || this.gameLost) return;

    // Track survival time in infinite mode
    // Track survival time in infinite mode
    this.elapsedTime += deltaTime;
    if (this.isInfiniteMode) {
      this.survivalTime += deltaTime;
    }

    // Auto-scroll camera
    this.cameraX += this.activeDifficulty.scrollSpeed * deltaTime;

    // Generate more obstacles in infinite mode
    if (this.isInfiniteMode) {
      this.generateMoreObstacles();
    }

    // Handle jump input (keyboard or mobile tap)
    const jumpKeyDown = this.keyboardService.isSpacePressed() || this.keyboardService.isUpPressed();

    if (jumpKeyDown && !this.jumpKeyPressed && this.player.isOnGround) {
      this.jump();
    }
    this.jumpKeyPressed = jumpKeyDown;

    // Apply gravity
    this.player.velocityY = this.gameService.applyGravity(
      this.player.velocityY,
      this.activeDifficulty.gravity,
      deltaTime
    );

    // Update player position
    this.player.y += this.player.velocityY * deltaTime;

    // Check if player is over a pit (before ground collision)
    let isOverPit = false;
    for (const obstacle of this.obstacles) {
      if (obstacle.type === 'pit') {
        const screenX = obstacle.x - this.cameraX;
        // Only consider over pit if the front edge has fully entered the pit
        if (this.player.x > screenX && this.player.x < screenX + obstacle.width) {
          isOverPit = true;

          // Check if fallen deep into pit (wait until player falls well below ground)
          if (this.player.y + this.player.height > this.groundY + 80) {
            this.gameLost = true;
            // Delay stopping the game to show the fall animation
            setTimeout(() => {
              this.stopGame();
            }, 300);
            return;
          }
          break;
        }
      }
    }

    // Ground collision (only if not over a pit)
    if (!isOverPit && this.player.y >= this.groundY - this.player.height) {
      this.player.y = this.groundY - this.player.height;
      this.player.velocityY = 0;
      this.player.isOnGround = true;
    } else {
      this.player.isOnGround = false;
    }

    // Check obstacle collisions and platform landings
    for (const obstacle of this.obstacles) {
      const screenX = obstacle.x - this.cameraX;

      if (obstacle.type === 'pit') {
        // Pit already handled above
        continue;
      } else if (obstacle.type === 'platform') {
        // Platform - can land on top
        const platformTop = this.groundY - obstacle.height;
        const platformRect = {
          x: screenX,
          y: platformTop,
          width: obstacle.width,
          height: obstacle.height,
        };

        const playerRect = {
          x: this.player.x,
          y: this.player.y,
          width: this.player.width,
          height: this.player.height,
        };

        // Check if landing on top of platform
        if (
          this.player.x + this.player.width > screenX &&
          this.player.x < screenX + obstacle.width &&
          this.player.y + this.player.height <= platformTop + 10 &&
          this.player.y + this.player.height >= platformTop - 5 &&
          this.player.velocityY >= 0
        ) {
          // Land on platform
          this.player.y = platformTop - this.player.height;
          this.player.velocityY = 0;
          this.player.isOnGround = true;
        }
      } else if (obstacle.type === 'ceilingCandy') {
        // Ceiling candy - hangs from top, need to duck under
        const obstacleRect = {
          x: screenX,
          y: 0,
          width: obstacle.width,
          height: obstacle.height,
        };

        const playerRect = {
          x: this.player.x,
          y: this.player.y,
          width: this.player.width,
          height: this.player.height,
        };

        if (this.gameService.checkRectCollision(playerRect, obstacleRect)) {
          this.gameLost = true;
          this.stopGame();
          return;
        }
      } else {
        // Candy obstacle - normal collision
        const obstacleRect = {
          x: screenX,
          y: this.groundY - obstacle.height,
          width: obstacle.width,
          height: obstacle.height,
        };

        const playerRect = {
          x: this.player.x,
          y: this.player.y,
          width: this.player.width,
          height: this.player.height,
        };

        if (this.gameService.checkRectCollision(playerRect, obstacleRect)) {
          this.gameLost = true;
          this.stopGame();
          return;
        }
      }
    }

    // Check win condition - player crosses the finish line (only in standard mode)
    if (!this.isInfiniteMode) {
      const finishLineX = this.activeDifficulty.levelLength;
      const playerFrontX = this.cameraX + this.player.x + this.player.width;
      if (playerFrontX >= finishLineX) {
        this.gameWon = true;
        this.stopGame();
        setTimeout(() => {
          this.completed.emit();
        }, 500);
      }
    }
  }

  render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.fillStyle = '#06121f'; // Dark background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply zoom scale for mobile
    this.ctx.save();
    this.ctx.scale(this.scale, this.scale);

    // On mobile, shift the whole gameplay band down a bit
    const offsetY = this.isMobile ? 40 : 0;
    this.ctx.translate(0, offsetY);

    // Draw sky gradient
    const logicalHeight = this.canvas.height / this.scale - offsetY;
    const gradient = this.ctx.createLinearGradient(0, 0, 0, logicalHeight);
    gradient.addColorStop(0, '#1a2332');
    gradient.addColorStop(1, '#06121f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width / this.scale, logicalHeight);

    // Draw ground
    this.ctx.fillStyle = '#2a9d8f'; // Christmas green
    const groundHeight = logicalHeight - this.groundY;
    this.ctx.fillRect(0, this.groundY, this.canvas.width / this.scale, groundHeight);

    // Draw ground decoration
    this.ctx.fillStyle = '#ffffff';
    for (let x = 0; x < this.canvas.width / this.scale; x += 40) {
      const offsetX = this.cameraX % 40;
      this.ctx.fillRect(x - offsetX, this.groundY, 30, 5);
    }

    // Draw obstacles
    for (const obstacle of this.obstacles) {
      const screenX = obstacle.x - this.cameraX;

      // Only draw if on screen
      if (screenX + obstacle.width > 0 && screenX < this.canvas.width / this.scale) {
        if (obstacle.type === 'pit') {
          // Draw pit (dark void)
          const pitHeight = logicalHeight - this.groundY;
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(screenX, this.groundY, obstacle.width, pitHeight);

          // Draw danger stripes at edges
          this.ctx.fillStyle = '#f4d35e';
          this.ctx.fillRect(screenX, this.groundY, 5, pitHeight);
          this.ctx.fillRect(screenX + obstacle.width - 5, this.groundY, 5, pitHeight);
        } else if (obstacle.type === 'platform') {
          // Draw platform (floating)
          const platformY = this.groundY - obstacle.height;

          // Platform base
          this.ctx.fillStyle = '#2a9d8f';
          this.ctx.fillRect(screenX, platformY, obstacle.width, obstacle.height);

          // Platform top edge (snow)
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(screenX, platformY, obstacle.width, 5);

          // Platform sides
          this.ctx.strokeStyle = '#1a7a6e';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(screenX, platformY, obstacle.width, obstacle.height);
        } else if (obstacle.type === 'ceilingCandy') {
          // Draw ceiling candy (hangs from top)
          this.ctx.fillStyle = '#e63946';
          this.ctx.fillRect(screenX, 0, obstacle.width, obstacle.height);

          // Add white stripes
          this.ctx.fillStyle = '#ffffff';
          for (let y = 0; y < obstacle.height; y += 20) {
            this.ctx.fillRect(screenX, y, obstacle.width, 10);
          }

          // Draw chain/rope attachment at top
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(screenX + obstacle.width / 2, 0);
          this.ctx.lineTo(screenX + obstacle.width / 2, -20);
          this.ctx.stroke();
        } else {
          // Draw candy obstacle
          const obstacleY = this.groundY - obstacle.height;

          this.ctx.fillStyle = '#e63946';
          this.ctx.fillRect(screenX, obstacleY, obstacle.width, obstacle.height);

          // Add white stripes
          this.ctx.fillStyle = '#ffffff';
          for (let y = obstacleY; y < obstacleY + obstacle.height; y += 20) {
            this.ctx.fillRect(screenX, y, obstacle.width, 10);
          }
        }
      }
    }

    // Draw finish line (only in standard mode)
    if (!this.isInfiniteMode) {
      const finishX = this.activeDifficulty.levelLength - this.cameraX;
      if (finishX > 0 && finishX < this.canvas.width / this.scale) {
        this.ctx.strokeStyle = '#f4d35e'; // Gold
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(finishX, 0);
        this.ctx.lineTo(finishX, logicalHeight);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw star at finish
        this.drawStar(finishX, this.groundY - 80, 20, '#f4d35e');
      }
    }

    // Draw player (sprite or fallback cube)
    this.ctx.save();
    this.ctx.translate(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );

    // Rotate based on velocity for effect
    const rotation = this.player.velocityY * 0.001;
    this.ctx.rotate(rotation);

    if (this.playerSprite) {
      // Draw sprite
      this.ctx.drawImage(
        this.playerSprite,
        -this.player.width / 2,
        -this.player.height / 2,
        this.player.width,
        this.player.height
      );
    } else {
      // Fallback: Gold cube
      this.ctx.fillStyle = '#f4d35e';
      this.ctx.fillRect(
        -this.player.width / 2,
        -this.player.height / 2,
        this.player.width,
        this.player.height
      );

      // Cube outline
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        -this.player.width / 2,
        -this.player.height / 2,
        this.player.width,
        this.player.height
      );
    }

    this.ctx.restore();

    // Restore scale before drawing UI
    this.ctx.restore();

    // Draw progress bar or timer depending on mode
    if (this.isInfiniteMode) {
      // Draw survival timer for infinite mode
      const minutes = Math.floor(this.survivalTime / 60);
      const seconds = Math.floor(this.survivalTime % 60);
      const milliseconds = Math.floor((this.survivalTime % 1) * 1000);
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;

      const timerX = this.isMobile ? 10 : 20;
      const timerY = this.isMobile ? 25 : 35;

      this.ctx.font = this.isMobile ? '16px monospace' : '20px monospace';
      this.ctx.fillStyle = '#f4d35e';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(timeString, timerX, timerY);
    } else {
      // Draw progress bar for standard mode
      const progress = Math.min(this.cameraX / this.activeDifficulty.levelLength, 1);

      const barX = this.isMobile ? 10 : 20;
      const barRightMargin = this.isMobile ? 350 : 20;
      const barWidth = this.canvas.width - barX - barRightMargin;
      const barHeight = 10;
      const barY = this.isMobile ? 10 : 20;

      this.ctx.fillStyle = '#102437';
      this.ctx.fillRect(barX, barY, barWidth, barHeight);

      this.ctx.fillStyle = '#f4d35e';
      this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);

      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }

  drawStar(x: number, y: number, radius: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  jump(): void {
    if (this.player.isOnGround && this.gameStarted && !this.gameWon && !this.gameLost) {
      this.player.velocityY = -this.activeDifficulty.jumpForce;
      this.player.isOnGround = false;
      this.jumpKeyPressed = true; // Immediately mark as pressed to prevent double jumps
      // Render immediately for instant visual feedback
      this.render();
    }
  }

  handleCanvasTap(): void {
    if (!this.gameStarted) {
      this.startGame();
    } else if (!this.gameWon && !this.gameLost && this.player.isOnGround) {
      // Jump immediately on tap without waiting for next frame
      this.player.velocityY = -this.activeDifficulty.jumpForce;
      this.player.isOnGround = false;
    }
  }

  reset(): void {
    this.stopGame();
    this.gameStarted = false;
    this.gameWon = false;
    this.gameLost = false;
    this.cameraX = 0;

    if (this.canvas) {
      this.player.y = this.groundY - this.player.height;
      this.player.velocityY = 0;
      this.player.isOnGround = true;

      // Clear and render initial state
      this.render();
    }
  }

  restartGame(): void {
    this.reset();
    this.startGame();
  }

  showReward(): void {
    this.completed.emit();
  }
}
