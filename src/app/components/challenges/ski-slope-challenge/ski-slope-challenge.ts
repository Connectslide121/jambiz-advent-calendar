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
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideAngularModule,
  Check,
  Keyboard,
  Smartphone,
  ArrowLeft,
  ArrowRight,
} from 'lucide-angular';
import { GameService } from '../../../services/game.service';
import { KeyboardService } from '../../../services/keyboard.service';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { ChallengeInfoModalComponent } from '../../shared/challenge-info-modal/challenge-info-modal.component';

export type SkiSlopeDifficulty = 'easy' | 'medium' | 'hard' | 'custom';

export interface SkiSlopeDifficultyConfig {
  // Slope configuration
  slopeLength: number; // Total length of the slope in pixels
  baseSpeed: number; // Base scrolling speed (pixels per second)
  speedIncreaseRate: number; // How much speed increases as you progress

  // Santa configuration
  santaLateralSpeed: number; // How fast Santa moves left/right
  santaWidth: number;
  santaHeight: number;

  // Obstacle configuration
  treeChance: number; // Chance of spawning a tree (0-1)
  rockChance: number; // Chance of spawning a rock (0-1)
  snowdriftChance: number; // Chance of spawning a snowdrift (slows you down)
  presentChance: number; // Chance of spawning a present (collectible)
  minObstacleSpacing: number; // Minimum vertical space between obstacles
  maxObstacleSpacing: number; // Maximum vertical space between obstacles
  minObstaclesPerRow: number; // Minimum obstacles per row
  maxObstaclesPerRow: number; // Maximum obstacles per row

  // Grinch configuration
  grinchStartDistance: number; // Initial distance behind Santa
  grinchSpeed: number; // Grinch's base speed
  grinchSpeedBoostOnSlow: number; // Extra speed when Santa is slowed
  slowdownDuration: number; // How long Santa is slowed after hitting snowdrift (seconds)
  slowdownMultiplier: number; // Speed multiplier when slowed (0.5 = half speed)

  // Infinite mode
  infiniteMode?: boolean;
}

export interface SkiSlopeConfig {
  difficulty?: SkiSlopeDifficulty;
  difficultyConfig?: Partial<SkiSlopeDifficultyConfig>;
  infiniteMode?: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'tree' | 'rock' | 'snowdrift' | 'present';
  collected?: boolean; // For presents
}

const DIFFICULTY_PRESETS: Record<SkiSlopeDifficulty, SkiSlopeDifficultyConfig> = {
  easy: {
    slopeLength: 5000,
    baseSpeed: 250,
    speedIncreaseRate: 0.02,
    santaLateralSpeed: 300,
    santaWidth: 48,
    santaHeight: 48,
    treeChance: 0.4,
    rockChance: 0.2,
    snowdriftChance: 0.15,
    presentChance: 0.25,
    minObstacleSpacing: 120,
    maxObstacleSpacing: 200,
    minObstaclesPerRow: 1,
    maxObstaclesPerRow: 2,
    grinchStartDistance: 250,
    grinchSpeed: 120,
    grinchSpeedBoostOnSlow: 50, // ~75 pixels lost per snowdrift (1.5s * 50), survives 3+ hits
    slowdownDuration: 1.5,
    slowdownMultiplier: 0.4,
  },
  medium: {
    slopeLength: 7000,
    baseSpeed: 300,
    speedIncreaseRate: 0.025,
    santaLateralSpeed: 350,
    santaWidth: 48,
    santaHeight: 48,
    treeChance: 0.45,
    rockChance: 0.25,
    snowdriftChance: 0.18,
    presentChance: 0.2,
    minObstacleSpacing: 100,
    maxObstacleSpacing: 180,
    minObstaclesPerRow: 1,
    maxObstaclesPerRow: 3,
    grinchStartDistance: 250,
    grinchSpeed: 145,
    grinchSpeedBoostOnSlow: 60, // ~108 pixels lost per snowdrift (1.8s * 60), survives 3+ hits
    slowdownDuration: 1.8,
    slowdownMultiplier: 0.35,
  },
  hard: {
    slopeLength: 10000,
    baseSpeed: 350,
    speedIncreaseRate: 0.03,
    santaLateralSpeed: 400,
    santaWidth: 48,
    santaHeight: 48,
    treeChance: 0.5,
    rockChance: 0.3,
    snowdriftChance: 0.2,
    presentChance: 0.15,
    minObstacleSpacing: 80,
    maxObstacleSpacing: 150,
    minObstaclesPerRow: 2,
    maxObstaclesPerRow: 4,
    grinchStartDistance: 250,
    grinchSpeed: 180,
    grinchSpeedBoostOnSlow: 70, // ~140 pixels lost per snowdrift (2s * 70), survives 3 hits barely
    slowdownDuration: 2.0,
    slowdownMultiplier: 0.3,
  },
  custom: {
    slopeLength: 6000,
    baseSpeed: 230,
    speedIncreaseRate: 0.018,
    santaLateralSpeed: 330,
    santaWidth: 48,
    santaHeight: 48,
    treeChance: 0.45,
    rockChance: 0.25,
    snowdriftChance: 0.17,
    presentChance: 0.2,
    minObstacleSpacing: 100,
    maxObstacleSpacing: 180,
    minObstaclesPerRow: 1,
    maxObstaclesPerRow: 3,
    grinchStartDistance: 250,
    grinchSpeed: 150,
    grinchSpeedBoostOnSlow: 55, // Balanced for custom difficulty
    slowdownDuration: 1.8,
    slowdownMultiplier: 0.35,
  },
};

@Component({
  selector: 'app-ski-slope-challenge',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule, ChallengeInfoModalComponent],
  templateUrl: './ski-slope-challenge.html',
  styleUrl: './ski-slope-challenge.scss',
})
export class SkiSlopeChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config!: SkiSlopeConfig;
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();
  @ViewChild('desktopCanvas') desktopCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('mobileCanvas') mobileCanvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Check = Check;
  readonly Keyboard = Keyboard;
  readonly Smartphone = Smartphone;
  readonly ArrowLeft = ArrowLeft;
  readonly ArrowRight = ArrowRight;

  // Mobile controls state
  private moveLeft = false;
  private moveRight = false;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  gameLoopId?: number;

  isMobile = false;
  private scale = 1;
  private logicalWidth = 0;
  private logicalHeight = 0;

  // Active difficulty settings and generated obstacles
  private activeDifficulty!: SkiSlopeDifficultyConfig;
  private obstacles: Obstacle[] = [];

  // Infinite mode properties
  isInfiniteMode = false;
  private lastObstacleY = 0;

  // Best scores for infinite mode
  bestDistance = 0;
  bestPresents = 0;
  lastRunDistance = 0;
  lastRunPresents = 0;

  // Santa state
  private santa = {
    x: 200,
    y: 220, // Lower on screen to give room for Grinch above
    width: 48,
    height: 48,
    velocityX: 0,
  };

  // Grinch state
  private grinch = {
    distance: 250, // Distance behind Santa (positive = behind)
    width: 56,
    height: 56,
  };

  // Game state
  private cameraY = 0;
  private currentSpeed = 150;
  private isSlowed = false;
  private slowdownTimer = 0;
  private isBeingCaught = false; // Grinch catch animation in progress
  private catchAnimationTimer = 0;
  private readonly CATCH_ANIMATION_DURATION = 1.2; // seconds for Grinch to catch Santa
  gameStarted = false;
  gameWon = false;
  gameLost = false;
  showInstructions = true;
  presentsCollected = 0;
  distanceTraveled = 0;
  private groundY = 0;
  elapsedTime = 0;

  // Touch controls
  private touchDirection = { x: 0, y: 0 };

  // Visual effects
  private snowflakes: Array<{ x: number; y: number; speed: number; size: number }> = [];

  constructor(
    private gameService: GameService,
    private keyboardService: KeyboardService,
    private stateService: CalendarStateService
  ) {}

  ngOnInit(): void {
    if (this.isCompleted) {
      this.gameWon = true;
      this.showInstructions = false; // Skip instructions for completed challenges
    }

    this.initializeDifficulty();
    this.isInfiniteMode = this.activeDifficulty.infiniteMode || false;
    this.generateObstacles();
    this.initSnowflakes();

    // Load persisted best scores for infinite mode
    if (this.isInfiniteMode) {
      const storageKey = this.getStorageKey();
      if (storageKey) {
        const savedStats = this.stateService.getGameStats(storageKey);
        if (savedStats) {
          this.bestDistance = savedStats.bestDistance || 0;
          this.bestPresents = savedStats.bestPresents || 0;
        }
      }
    }

    this.keyboardService.init();
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.setupCanvas();
  }

  private setupCanvas(): void {
    // Determine mode based on window width
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 640;

    // Select appropriate canvas
    const targetCanvasRef = this.isMobile ? this.mobileCanvasRef : this.desktopCanvasRef;

    if (targetCanvasRef) {
      // If switching modes or first init
      if (this.canvas !== targetCanvasRef.nativeElement || wasMobile !== this.isMobile) {
        this.initCanvas(targetCanvasRef.nativeElement);

        // If game was running, we might need to adjust positions, but for now just render
        if (!this.gameStarted) {
          this.render();
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.stopGame();
    this.keyboardService.destroy();
  }

  private initializeDifficulty(): void {
    const difficulty = this.config?.difficulty || 'medium';
    const preset = DIFFICULTY_PRESETS[difficulty];

    this.activeDifficulty = {
      ...preset,
      ...(this.config?.difficultyConfig || {}),
    };

    if (this.config?.infiniteMode) {
      this.activeDifficulty.infiniteMode = true;
    }

    // Initialize Santa and Grinch from config
    this.santa.width = this.activeDifficulty.santaWidth;
    this.santa.height = this.activeDifficulty.santaHeight;
    this.grinch.distance = this.activeDifficulty.grinchStartDistance;
    this.currentSpeed = this.activeDifficulty.baseSpeed;
  }

  private generateObstacles(): void {
    this.obstacles = [];
    const config = this.activeDifficulty;

    let currentY = 300; // Start generating obstacles after initial safe zone
    const endY = this.isInfiniteMode ? 2000 : config.slopeLength - 200;

    this.lastObstacleY = currentY;

    while (currentY < endY) {
      const spacing =
        config.minObstacleSpacing +
        Math.random() * (config.maxObstacleSpacing - config.minObstacleSpacing);

      currentY += spacing;

      if (currentY >= endY) break;

      // Determine how many obstacles in this row
      const obstacleCount =
        config.minObstaclesPerRow +
        Math.floor(Math.random() * (config.maxObstaclesPerRow - config.minObstaclesPerRow + 1));

      for (let i = 0; i < obstacleCount; i++) {
        const type = this.selectObstacleType();
        const obstacle = this.createObstacle(type, currentY);
        this.obstacles.push(obstacle);
      }

      this.lastObstacleY = currentY;
    }
  }

  private generateMoreObstacles(): void {
    if (!this.isInfiniteMode) return;

    const config = this.activeDifficulty;
    const generateAheadDistance = 1500;
    const targetY = this.cameraY + generateAheadDistance;

    while (this.lastObstacleY < targetY) {
      const spacing =
        config.minObstacleSpacing +
        Math.random() * (config.maxObstacleSpacing - config.minObstacleSpacing);

      this.lastObstacleY += spacing;
      const currentY = this.lastObstacleY;

      const obstacleCount =
        config.minObstaclesPerRow +
        Math.floor(Math.random() * (config.maxObstaclesPerRow - config.minObstaclesPerRow + 1));

      for (let i = 0; i < obstacleCount; i++) {
        const type = this.selectObstacleType();
        const obstacle = this.createObstacle(type, currentY);
        this.obstacles.push(obstacle);
      }
    }

    // Clean up obstacles that are far behind
    const cleanupDistance = 500;
    this.obstacles = this.obstacles.filter((obs) => obs.y > this.cameraY - cleanupDistance);
  }

  private selectObstacleType(): 'tree' | 'rock' | 'snowdrift' | 'present' {
    const config = this.activeDifficulty;
    const total =
      config.treeChance + config.rockChance + config.snowdriftChance + config.presentChance;

    let random = Math.random() * total;

    if (random < config.treeChance) return 'tree';
    random -= config.treeChance;

    if (random < config.rockChance) return 'rock';
    random -= config.rockChance;

    if (random < config.snowdriftChance) return 'snowdrift';

    return 'present';
  }

  private createObstacle(type: 'tree' | 'rock' | 'snowdrift' | 'present', y: number): Obstacle {
    const canvasWidth = this.logicalWidth || 400;
    const margin = 40;
    const scale = this.isMobile ? 0.6 : 1;

    let width: number;
    let height: number;

    switch (type) {
      case 'tree':
        width = (40 + Math.random() * 20) * scale;
        height = (60 + Math.random() * 30) * scale;
        break;
      case 'rock':
        width = (30 + Math.random() * 20) * scale;
        height = (25 + Math.random() * 15) * scale;
        break;
      case 'snowdrift':
        width = (50 + Math.random() * 30) * scale;
        height = (20 + Math.random() * 10) * scale;
        break;
      case 'present':
        width = 30 * scale;
        height = 30 * scale;
        break;
    }

    return {
      x: margin + Math.random() * (canvasWidth - margin * 2 - width),
      y,
      width,
      height,
      type,
      collected: false,
    };
  }

  private initSnowflakes(): void {
    this.snowflakes = [];
    for (let i = 0; i < 50; i++) {
      this.snowflakes.push({
        x: Math.random() * 500,
        y: Math.random() * 600,
        speed: 50 + Math.random() * 100,
        size: 2 + Math.random() * 4,
      });
    }
  }

  initCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) return;
    this.ctx = context;

    const containerWidth = canvas.parentElement!.clientWidth;

    // Don't use scaling - just use canvas dimensions directly
    this.scale = 1;

    // Set dimensions based on mode
    if (this.isMobile) {
      // Mobile: Vertical aspect ratio (9:16)
      this.logicalWidth = containerWidth;
      this.logicalHeight = containerWidth * (16 / 9);
    } else {
      // Desktop: Landscape (4:3)
      this.logicalWidth = containerWidth;
      this.logicalHeight = containerWidth * 0.75;
    }

    // Set canvas dimensions to logical size first (will be updated by retina scale)
    canvas.width = this.logicalWidth;
    canvas.height = this.logicalHeight;

    // Also set CSS height to match
    canvas.style.height = `${this.logicalHeight}px`;

    this.groundY = this.logicalHeight;

    // Center Santa horizontally
    this.santa.x = (this.logicalWidth - this.santa.width) / 2;

    // Position Santa
    this.santa.y = this.isMobile ? this.logicalHeight * 0.4 : this.logicalHeight * 0.3;

    // Update object sizes based on platform
    const objectScale = this.isMobile ? 0.6 : 1;

    this.santa.width = this.activeDifficulty.santaWidth * objectScale;
    this.santa.height = this.activeDifficulty.santaHeight * objectScale;

    // Grinch base size is 56
    this.grinch.width = 56 * objectScale;
    this.grinch.height = 56 * objectScale;

    this.gameService.scaleCanvasForRetina(canvas);

    // Regenerate obstacles to fit new dimensions (only if game hasn't started)
    if (!this.gameStarted) {
      this.generateObstacles();
    }
  }
  startGame(): void {
    this.elapsedTime = 0;
    this.distanceTraveled = 0;
    this.presentsCollected = 0;
    this.cameraY = 0;
    this.currentSpeed = this.activeDifficulty.baseSpeed;
    this.grinch.distance = this.activeDifficulty.grinchStartDistance;
    this.isSlowed = false;
    this.slowdownTimer = 0;

    this.generateObstacles();
    this.gameStarted = true;
    this.showInstructions = false;

    this.gameLoopId = this.gameService.startGameLoop((deltaTime) => {
      this.update(deltaTime);
      this.render();
    });
  }

  private getStorageKey(): number | string | null {
    if (this.levelId) return this.levelId;
    if (this.day && this.day > 0) return this.day;
    return null;
  }

  stopGame(): void {
    if (this.gameLoopId !== undefined) {
      this.gameService.stopGameLoop(this.gameLoopId);
      this.gameLoopId = undefined;
    }

    // Save stats for infinite mode
    if (this.isInfiniteMode && this.gameLost) {
      this.lastRunDistance = Math.floor(this.distanceTraveled);
      this.lastRunPresents = this.presentsCollected;

      if (this.distanceTraveled > this.bestDistance) {
        this.bestDistance = Math.floor(this.distanceTraveled);
      }
      if (this.presentsCollected > this.bestPresents) {
        this.bestPresents = this.presentsCollected;
      }

      const storageKey = this.getStorageKey();
      if (storageKey) {
        this.stateService.saveGameStats(storageKey, {
          bestDistance: this.bestDistance,
          bestPresents: this.bestPresents,
        });
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.gameStarted || this.gameWon || this.gameLost) return;

    this.elapsedTime += deltaTime;

    // Handle catch animation - Grinch quickly catches up to crashed Santa
    if (this.isBeingCaught) {
      this.catchAnimationTimer += deltaTime;

      // Grinch rushes toward Santa during catch animation
      const catchSpeed = this.activeDifficulty.grinchStartDistance / this.CATCH_ANIMATION_DURATION;
      this.grinch.distance -= catchSpeed * deltaTime;

      // Update snowflakes for visual continuity
      this.updateSnowflakes(deltaTime);

      // When Grinch reaches Santa, end the game
      if (this.grinch.distance <= 0 || this.catchAnimationTimer >= this.CATCH_ANIMATION_DURATION) {
        this.grinch.distance = 0;
        this.gameLost = true;
        this.stopGame();
      }
      return; // Skip normal update logic during catch animation
    }

    // Handle slowdown timer
    if (this.isSlowed) {
      this.slowdownTimer -= deltaTime;
      if (this.slowdownTimer <= 0) {
        this.isSlowed = false;
        this.slowdownTimer = 0;
      }
    }

    // Calculate current speed
    const speedMultiplier = this.isSlowed ? this.activeDifficulty.slowdownMultiplier : 1;
    const progressBonus =
      1 + this.distanceTraveled * this.activeDifficulty.speedIncreaseRate * 0.001;
    this.currentSpeed = this.activeDifficulty.baseSpeed * speedMultiplier * progressBonus;

    // Move camera (Santa moves down the slope)
    this.cameraY += this.currentSpeed * deltaTime;
    this.distanceTraveled += this.currentSpeed * deltaTime;

    // Generate more obstacles in infinite mode
    if (this.isInfiniteMode) {
      this.generateMoreObstacles();
    }

    // Handle input
    this.handleInput(deltaTime);

    // Keep Santa within bounds
    const canvasWidth = this.logicalWidth;
    this.santa.x = Math.max(0, Math.min(canvasWidth - this.santa.width, this.santa.x));

    // Update Grinch position
    this.updateGrinch(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Update snowflakes
    this.updateSnowflakes(deltaTime);

    // Check win condition (only in non-infinite mode)
    if (!this.isInfiniteMode) {
      if (this.distanceTraveled >= this.activeDifficulty.slopeLength) {
        this.gameWon = true;
        this.stopGame();
        setTimeout(() => {
          this.completed.emit();
        }, 500);
      }
    }

    // Check if Grinch caught Santa
    if (this.grinch.distance <= 0) {
      this.gameLost = true;
      this.stopGame();
    }
  }

  // Mobile control handlers
  startMove(direction: 'left' | 'right'): void {
    if (direction === 'left') this.moveLeft = true;
    if (direction === 'right') this.moveRight = true;
  }

  stopMove(direction: 'left' | 'right'): void {
    if (direction === 'left') this.moveLeft = false;
    if (direction === 'right') this.moveRight = false;
  }

  private handleInput(deltaTime: number): void {
    let moveX = 0;

    // Keyboard input
    if (this.keyboardService.isLeftPressed()) {
      moveX = -1;
    } else if (this.keyboardService.isRightPressed()) {
      moveX = 1;
    }

    // Touch input (buttons)
    if (this.moveLeft) {
      moveX = -1;
    } else if (this.moveRight) {
      moveX = 1;
    }

    // Legacy Touch input (joystick - kept for compatibility if needed, but buttons override)
    if (moveX === 0 && this.touchDirection.x !== 0) {
      moveX = this.touchDirection.x;
    }

    this.santa.x += moveX * this.activeDifficulty.santaLateralSpeed * deltaTime;
  }

  private updateGrinch(deltaTime: number): void {
    // SkiFree-style Grinch behavior:
    // - When Santa is going fast (not slowed): Santa PULLS AWAY from Grinch
    // - When Santa is slowed (hit snowdrift): Grinch CATCHES UP quickly
    let distanceChange: number;

    if (this.isSlowed) {
      // When slowed, Grinch catches up FAST
      distanceChange = -this.activeDifficulty.grinchSpeedBoostOnSlow;
    } else {
      // When going fast, Santa pulls away from the Grinch
      const pullAwaySpeed = 30; // Santa gains distance when going full speed
      distanceChange = pullAwaySpeed;
    }

    // Apply the distance change
    this.grinch.distance += distanceChange * deltaTime;

    // Clamp Grinch distance - can't go below 0 or above starting distance
    this.grinch.distance = Math.max(
      0,
      Math.min(this.activeDifficulty.grinchStartDistance, this.grinch.distance)
    );
  }

  private checkCollisions(): void {
    const santaRect = {
      x: this.santa.x,
      y: this.santa.y + this.cameraY,
      width: this.santa.width,
      height: this.santa.height,
    };

    for (const obstacle of this.obstacles) {
      if (obstacle.collected) continue;

      const screenY = obstacle.y - this.cameraY;

      // Only check obstacles that are near Santa
      if (screenY < -100 || screenY > this.groundY + 100) continue;

      const obstacleRect = {
        x: obstacle.x,
        y: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
      };

      // Use a slightly smaller hitbox for fairness
      const collisionMargin = 8;
      const santaCollisionRect = {
        x: santaRect.x + collisionMargin,
        y: santaRect.y + collisionMargin,
        width: santaRect.width - collisionMargin * 2,
        height: santaRect.height - collisionMargin * 2,
      };

      if (this.gameService.checkRectCollision(santaCollisionRect, obstacleRect)) {
        switch (obstacle.type) {
          case 'tree':
          case 'rock':
            // Deadly obstacles - Santa crashes, Grinch catches up!
            if (!this.isBeingCaught) {
              this.isBeingCaught = true;
              this.catchAnimationTimer = 0;
              this.currentSpeed = 0; // Santa stops
            }
            return;

          case 'snowdrift':
            // Slow down Santa
            if (!this.isSlowed) {
              this.isSlowed = true;
              this.slowdownTimer = this.activeDifficulty.slowdownDuration;
              obstacle.collected = true; // Mark as hit so it doesn't trigger again
            }
            break;

          case 'present':
            // Collect present
            if (!obstacle.collected) {
              obstacle.collected = true;
              this.presentsCollected++;
              // Push Grinch back - presents are valuable!
              this.grinch.distance += 40;
              // Clamp to max starting distance
              this.grinch.distance = Math.min(
                this.grinch.distance,
                this.activeDifficulty.grinchStartDistance
              );
            }
            break;
        }
      }
    }
  }

  private updateSnowflakes(deltaTime: number): void {
    const canvasWidth = this.logicalWidth;
    const canvasHeight = this.logicalHeight;

    for (const flake of this.snowflakes) {
      flake.y += flake.speed * deltaTime;
      flake.x += Math.sin(flake.y * 0.01) * 20 * deltaTime;

      // Wrap around
      if (flake.y > canvasHeight) {
        flake.y = -10;
        flake.x = Math.random() * canvasWidth;
      }
      if (flake.x < 0) flake.x = canvasWidth;
      if (flake.x > canvasWidth) flake.x = 0;
    }
  }

  render(): void {
    if (!this.ctx || !this.canvas) return;

    const canvasWidth = this.logicalWidth;
    const canvasHeight = this.logicalHeight;

    // Clear canvas
    this.ctx.fillStyle = '#87CEEB'; // Sky blue
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw snow slope background
    this.drawSlope(canvasWidth, canvasHeight);

    // Draw ski tracks
    this.drawSkiTracks(canvasWidth, canvasHeight);

    // Draw obstacles
    this.drawObstacles();

    // Draw Santa
    this.drawSanta();

    // Draw Grinch
    this.drawGrinch(canvasHeight);

    // Draw snowflakes
    this.drawSnowflakes();

    // Draw UI
    this.drawUI(canvasWidth, canvasHeight);
  }

  private drawSlope(width: number, height: number): void {
    // Snow gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#F0F8FF'); // Alice blue at top
    gradient.addColorStop(0.5, '#E8E8E8');
    gradient.addColorStop(1, '#DCDCDC'); // Gainsboro at bottom

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Add some snow texture
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 20; i++) {
      const x = (i * 73 + this.cameraY * 0.2) % width;
      const y = (i * 117) % height;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 20 + Math.random() * 20, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawSkiTracks(width: number, height: number): void {
    // Draw subtle ski tracks
    this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
    this.ctx.lineWidth = 3;

    const trackOffset = (this.cameraY * 0.5) % 40;

    for (let y = -trackOffset; y < height; y += 40) {
      // Left track
      this.ctx.beginPath();
      this.ctx.moveTo(width / 2 - 30, y);
      this.ctx.lineTo(width / 2 - 25, y + 40);
      this.ctx.stroke();

      // Right track
      this.ctx.beginPath();
      this.ctx.moveTo(width / 2 + 30, y);
      this.ctx.lineTo(width / 2 + 25, y + 40);
      this.ctx.stroke();
    }
  }

  private drawObstacles(): void {
    for (const obstacle of this.obstacles) {
      const screenY = obstacle.y - this.cameraY;

      // Only draw if on screen
      if (screenY < -100 || screenY > this.logicalHeight + 100) continue;
      if (obstacle.collected && obstacle.type === 'present') continue;

      switch (obstacle.type) {
        case 'tree':
          this.drawTree(obstacle.x, screenY, obstacle.width, obstacle.height);
          break;
        case 'rock':
          this.drawRock(obstacle.x, screenY, obstacle.width, obstacle.height);
          break;
        case 'snowdrift':
          if (!obstacle.collected) {
            this.drawSnowdrift(obstacle.x, screenY, obstacle.width, obstacle.height);
          }
          break;
        case 'present':
          this.drawPresent(obstacle.x, screenY, obstacle.width, obstacle.height);
          break;
      }
    }

    // Draw finish line (only in non-infinite mode)
    if (!this.isInfiniteMode) {
      this.drawFinishLine();
    }
  }

  private drawFinishLine(): void {
    const finishY = this.activeDifficulty.slopeLength - this.cameraY;
    const canvasWidth = this.logicalWidth;

    // Only draw if finish line is on screen
    if (finishY < -50 || finishY > this.logicalHeight + 100) return;

    // Draw checkered finish line pattern
    const lineHeight = 30;
    const squareSize = 20;

    for (let x = 0; x < canvasWidth; x += squareSize) {
      const isEven = Math.floor(x / squareSize) % 2 === 0;

      // Top row
      this.ctx.fillStyle = isEven ? '#000000' : '#FFFFFF';
      this.ctx.fillRect(x, finishY, squareSize, lineHeight / 2);

      // Bottom row (alternated)
      this.ctx.fillStyle = isEven ? '#FFFFFF' : '#000000';
      this.ctx.fillRect(x, finishY + lineHeight / 2, squareSize, lineHeight / 2);
    }

    // Draw "FINISH" text above the line
    this.ctx.fillStyle = '#e63946';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText('🏁 FINISH 🏁', canvasWidth / 2, finishY - 15);
    this.ctx.fillText('🏁 FINISH 🏁', canvasWidth / 2, finishY - 15);
  }

  private drawTree(x: number, y: number, width: number, height: number): void {
    // Tree trunk
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(x + width / 2 - 5, y + height - 15, 10, 15);

    // Tree foliage (triangle)
    this.ctx.fillStyle = '#228B22';
    this.ctx.beginPath();
    this.ctx.moveTo(x + width / 2, y);
    this.ctx.lineTo(x, y + height - 15);
    this.ctx.lineTo(x + width, y + height - 15);
    this.ctx.closePath();
    this.ctx.fill();

    // Snow on tree
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.moveTo(x + width / 2, y);
    this.ctx.lineTo(x + width / 4, y + height / 3);
    this.ctx.lineTo(x + (3 * width) / 4, y + height / 3);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawRock(x: number, y: number, width: number, height: number): void {
    // Rock body
    this.ctx.fillStyle = '#696969';
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Rock highlight
    this.ctx.fillStyle = '#808080';
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 3, y + height / 3, width / 4, height / 4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Snow on rock
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 2, y + 5, width / 3, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSnowdrift(x: number, y: number, width: number, height: number): void {
    // Main snowdrift
    this.ctx.fillStyle = '#B0E0E6'; // Powder blue to indicate it's special
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 2, y + height, width / 2, height, 0, Math.PI, 0);
    this.ctx.fill();

    // Highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.ellipse(x + width / 2, y + height - 3, width / 3, height / 2, 0, Math.PI, 0);
    this.ctx.fill();

    // Warning pattern (subtle stripes)
    this.ctx.strokeStyle = 'rgba(173, 216, 230, 0.5)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + 10 + i * 15, y + height);
      this.ctx.lineTo(x + 15 + i * 15, y);
      this.ctx.stroke();
    }
  }

  private drawPresent(x: number, y: number, width: number, height: number): void {
    // Present box
    this.ctx.fillStyle = '#e63946'; // Christmas red
    this.ctx.fillRect(x, y, width, height);

    // Ribbon vertical
    this.ctx.fillStyle = '#f4d35e'; // Gold
    this.ctx.fillRect(x + width / 2 - 3, y, 6, height);

    // Ribbon horizontal
    this.ctx.fillRect(x, y + height / 2 - 3, width, 6);

    // Bow
    this.ctx.fillStyle = '#f4d35e';
    this.ctx.beginPath();
    this.ctx.arc(x + width / 2 - 8, y - 5, 8, 0, Math.PI * 2);
    this.ctx.arc(x + width / 2 + 8, y - 5, 8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawSanta(): void {
    const x = this.santa.x;
    const y = this.santa.y;
    const w = this.santa.width;
    const h = this.santa.height;

    // Sleigh base
    this.ctx.fillStyle = '#8B4513';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + h - 10);
    this.ctx.quadraticCurveTo(x + w / 2, y + h + 5, x + w, y + h - 10);
    this.ctx.lineTo(x + w, y + h - 15);
    this.ctx.quadraticCurveTo(x + w / 2, y + h - 5, x, y + h - 15);
    this.ctx.closePath();
    this.ctx.fill();

    // Sleigh runner
    this.ctx.strokeStyle = '#DAA520';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 5, y + h);
    this.ctx.quadraticCurveTo(x + w / 2, y + h + 10, x + w + 5, y + h);
    this.ctx.stroke();

    // Santa body (red suit)
    this.ctx.fillStyle = '#e63946';
    this.ctx.beginPath();
    this.ctx.ellipse(x + w / 2, y + h / 2 - 5, w / 3, h / 3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Santa head
    this.ctx.fillStyle = '#FFE4C4'; // Bisque (skin color)
    this.ctx.beginPath();
    this.ctx.arc(x + w / 2, y + 10, 12, 0, Math.PI * 2);
    this.ctx.fill();

    // Santa hat
    this.ctx.fillStyle = '#e63946';
    this.ctx.beginPath();
    this.ctx.moveTo(x + w / 2 - 12, y + 8);
    this.ctx.lineTo(x + w / 2, y - 15);
    this.ctx.lineTo(x + w / 2 + 12, y + 8);
    this.ctx.closePath();
    this.ctx.fill();

    // Hat pom-pom
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(x + w / 2, y - 15, 5, 0, Math.PI * 2);
    this.ctx.fill();

    // Hat brim
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(x + w / 2 - 14, y + 5, 28, 5);

    // Beard
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.ellipse(x + w / 2, y + 20, 10, 8, 0, 0, Math.PI);
    this.ctx.fill();

    // Slowdown indicator
    if (this.isSlowed) {
      this.ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(x + w / 2, y + h / 2, w / 2 + 10, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawGrinch(canvasHeight: number): void {
    // Map Grinch distance to screen position
    // Grinch is ALWAYS visible - at top of screen when far, moves down as he gets closer
    const maxVisibleDistance = this.activeDifficulty.grinchStartDistance;
    const minY = 10; // Top of screen (always visible) when at max distance
    const maxY = this.santa.y - 10; // Just above Santa when caught

    // Linear interpolation: as distance decreases, Grinch moves down toward Santa
    const t = 1 - Math.min(1, this.grinch.distance / maxVisibleDistance);
    const grinchY = minY + t * (maxY - minY);
    const grinchX = this.santa.x + (this.santa.width - this.grinch.width) / 2;

    // Always draw the Grinch (he's always chasing!)
    {
      // Grinch body (green)
      this.ctx.fillStyle = '#228B22'; // Forest green
      this.ctx.beginPath();
      this.ctx.ellipse(
        grinchX + this.grinch.width / 2,
        grinchY + this.grinch.height / 2,
        this.grinch.width / 2,
        this.grinch.height / 2,
        0,
        0,
        Math.PI * 2
      );
      this.ctx.fill();

      // Grinch face
      this.ctx.fillStyle = '#32CD32'; // Lime green
      this.ctx.beginPath();
      this.ctx.arc(grinchX + this.grinch.width / 2, grinchY + 15, 18, 0, Math.PI * 2);
      this.ctx.fill();

      // Evil eyes
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.beginPath();
      this.ctx.ellipse(grinchX + this.grinch.width / 2 - 8, grinchY + 12, 4, 6, 0, 0, Math.PI * 2);
      this.ctx.ellipse(grinchX + this.grinch.width / 2 + 8, grinchY + 12, 4, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Pupils
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(grinchX + this.grinch.width / 2 - 8, grinchY + 14, 2, 0, Math.PI * 2);
      this.ctx.arc(grinchX + this.grinch.width / 2 + 8, grinchY + 14, 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Evil grin
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(grinchX + this.grinch.width / 2, grinchY + 22, 10, 0.1 * Math.PI, 0.9 * Math.PI);
      this.ctx.stroke();

      // Grinch hands reaching
      this.ctx.fillStyle = '#228B22';
      this.ctx.beginPath();
      this.ctx.ellipse(grinchX + 5, grinchY + this.grinch.height - 10, 8, 12, -0.3, 0, Math.PI * 2);
      this.ctx.ellipse(
        grinchX + this.grinch.width - 5,
        grinchY + this.grinch.height - 10,
        8,
        12,
        0.3,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }

    // Draw warning indicator at top of screen
    if (this.grinch.distance < 150) {
      const warningAlpha = Math.min(1, (150 - this.grinch.distance) / 100);
      this.ctx.fillStyle = `rgba(255, 0, 0, ${warningAlpha * 0.3})`;
      this.ctx.fillRect(0, 0, this.logicalWidth, 50);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚠️ THE GRINCH IS CLOSE! ⚠️', this.logicalWidth / 2, 30);
    }
  }

  private drawSnowflakes(): void {
    this.ctx.fillStyle = '#FFFFFF';
    for (const flake of this.snowflakes) {
      this.ctx.beginPath();
      this.ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawUI(canvasWidth: number, canvasHeight: number): void {
    const padding = this.isMobile ? 10 : 20;

    // Distance/Progress display
    if (this.isInfiniteMode) {
      // Infinite mode - show distance
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(padding, padding, 150, 70);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 16px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`📏 ${Math.floor(this.distanceTraveled)}m`, padding + 10, padding + 25);
      this.ctx.fillText(`🎁 ${this.presentsCollected}`, padding + 10, padding + 50);
    } else {
      // Standard mode - show progress bar
      const progress = Math.min(this.distanceTraveled / this.activeDifficulty.slopeLength, 1);
      const barWidth = canvasWidth - padding * 2;
      const barHeight = 12;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(padding, padding, barWidth, barHeight);

      this.ctx.fillStyle = '#2a9d8f';
      this.ctx.fillRect(padding, padding, barWidth * progress, barHeight);

      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(padding, padding, barWidth, barHeight);

      // Presents counter
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(padding, padding + barHeight + 10, 80, 30);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`🎁 ${this.presentsCollected}`, padding + 10, padding + barHeight + 30);
    }

    // Grinch distance indicator
    const grinchIndicatorWidth = 120;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(
      canvasWidth - grinchIndicatorWidth - padding,
      padding,
      grinchIndicatorWidth,
      40
    );

    const grinchPercent = Math.max(0, Math.min(100, (this.grinch.distance / 250) * 100));
    this.ctx.fillStyle =
      grinchPercent < 30 ? '#FF4444' : grinchPercent < 60 ? '#FFAA00' : '#44FF44';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `👹 ${Math.floor(grinchPercent)}% away`,
      canvasWidth - grinchIndicatorWidth / 2 - padding,
      padding + 25
    );
  }

  // Touch controls handler
  onDirectionChange(direction: { x: number; y: number }): void {
    this.touchDirection = direction;
  }

  reset(): void {
    this.stopGame();
    this.gameStarted = false;
    this.gameWon = false;
    this.gameLost = false;
    this.isBeingCaught = false;
    this.catchAnimationTimer = 0;
    this.presentsCollected = 0;
    this.distanceTraveled = 0;
    this.cameraY = 0;
    this.currentSpeed = this.activeDifficulty.baseSpeed;
    this.grinch.distance = this.activeDifficulty.grinchStartDistance;
    this.isSlowed = false;
    this.slowdownTimer = 0;

    if (this.canvas) {
      this.santa.x = (this.logicalWidth - this.santa.width) / 2;
      this.santa.y = this.isMobile ? this.logicalHeight * 0.4 : this.logicalHeight * 0.3;
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
