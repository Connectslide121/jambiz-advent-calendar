import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  Output,
  EventEmitter,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { GameService } from '../../../services/game.service';
import { KeyboardService } from '../../../services/keyboard.service';
import { SpriteService } from '../../../services/sprite.service';
import { TouchControlsComponent } from '../../touch-controls/touch-controls';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { ChallengeInfoModalComponent } from '../../shared/challenge-info-modal/challenge-info-modal.component';

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'static' | 'moving' | 'ice';
  moveRange?: number; // For moving platforms
  moveSpeed?: number; // For moving platforms
  initialX?: number; // For moving platforms
  phase?: number;
}

interface Collectible {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  moveRange?: number;
  moveSpeed?: number;
  initialX?: number;
  phase?: number;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  onGround: boolean;
  onIce: boolean;
  platformVelocityX: number; // Track platform velocity for jump momentum
  currentPlatform?: Platform;
}

interface ClimberChallengeSettings {
  worldHeight: number;
  platformGap: number;
  platformGapVariance: number;
  minPlatformWidth: number;
  maxPlatformWidth: number;
  startingPlatformWidth: number;
  movingPlatformChance: number;
  icePlatformChance: number;
  collectibles: number;
  movingRange: number;
  movingSpeed: number;
  gravity: number;
  jumpForce: number;
  moveSpeed: number;
  iceAcceleration: number;
  iceFriction: number;
  normalFriction: number;
  maxIceSpeedMultiplier: number;
  goalOffset: number;
  collectibleStartOffset: number;
  collectibleSpacing: number;
}

interface ClimberChallengeConfig {
  settings?: Partial<ClimberChallengeSettings>;
  infiniteMode?: boolean;
}

type ClimberChallengeInput =
  | ClimberChallengeConfig
  | (Partial<ClimberChallengeSettings> & { infiniteMode?: boolean });

const DEFAULT_CLIMBER_SETTINGS: ClimberChallengeSettings = {
  worldHeight: 2000,
  platformGap: 100,
  platformGapVariance: 15,
  minPlatformWidth: 80,
  maxPlatformWidth: 130,
  startingPlatformWidth: 140,
  movingPlatformChance: 0.28,
  icePlatformChance: 0.18,
  collectibles: 3,
  movingRange: 90,
  movingSpeed: 1.5,
  gravity: 0.6,
  jumpForce: -12,
  moveSpeed: 5,
  iceAcceleration: 0.16,
  iceFriction: 0.992,
  normalFriction: 0.5,
  maxIceSpeedMultiplier: 1.8,
  goalOffset: 80,
  collectibleStartOffset: 320,
  collectibleSpacing: 360,
};

@Component({
  selector: 'app-climber-challenge',
  standalone: true,
  imports: [CommonModule, TranslateModule, TouchControlsComponent, ChallengeInfoModalComponent],
  templateUrl: './climber-challenge.html',
  styleUrls: ['./climber-challenge.scss'],
})
export default class ClimberChallengeComponent
  implements OnInit, AfterViewInit, OnDestroy, OnChanges
{
  @Input() config?: ClimberChallengeInput;
  @Input() isCompleted = false;
  @Input() day = 0;
  @Input() levelId?: string; // Used for extras levels to store stats
  @Output() completed = new EventEmitter<void>();

  @ViewChild('gameCanvas', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  // Game state signals
  gameStarted = signal(false);
  gameWon = signal(false);
  gameLost = signal(false);
  isMobile = signal(false);
  showInstructions = signal(true);

  public isInfiniteMode = false;

  private ctx!: CanvasRenderingContext2D;
  private gameLoopId: number | null = null;
  private readonly CANVAS_WIDTH = 400;
  private readonly CANVAS_HEIGHT = 600;

  private settings: ClimberChallengeSettings = { ...DEFAULT_CLIMBER_SETTINGS };
  private initialized = false;
  private jumpBuffer = 0;
  private survivalTime = 0;
  private maxHeightReached = 0;
  private startingY = 0;
  private nextPlatformY = 0;
  private highestGeneratedY = 0;
  private readonly INFINITE_GENERATION_BUFFER = 900;
  private readonly INFINITE_PRUNE_DISTANCE = 1200;

  // Player
  private player: Player = {
    x: 200,
    y: 500,
    width: 32,
    height: 32,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    onIce: false,
    platformVelocityX: 0,
  };

  // Physics constants
  private readonly MAX_FALL_SPEED = 15;

  // Camera
  private cameraY = 0;

  // Game objects
  private platforms: Platform[] = [];
  private collectibles: Collectible[] = [];
  private goalZone = { x: 0, y: 50, width: 400, height: 60 };

  // Touch controls
  private touchDirection = { x: 0, y: 0 };

  // Stats (public for template access)
  collectedCount = 0;
  totalCollectibles = DEFAULT_CLIMBER_SETTINGS.collectibles;
  bestHeight = 0;
  bestTime = 0;
  bestTimeFormatted = '00:00.000';
  lastRunHeight = 0;
  lastRunTime = 0;
  lastRunTimeFormatted = '00:00.000';

  constructor(
    private gameService: GameService,
    private keyboardService: KeyboardService,
    private spriteService: SpriteService,
    private stateService: CalendarStateService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.applyConfig(this.config);

      if (this.initialized) {
        this.generateLevel();
        this.resetPlayer();
        this.collectedCount = 0;

        if (!this.gameStarted() && this.ctx) {
          this.renderGame();
        }
      }
    }
  }

  ngOnInit(): void {
    console.log(
      '[Climber] ngOnInit. levelId:',
      this.levelId,
      'day:',
      this.day,
      'isInfinite:',
      this.isInfiniteMode
    );
    this.isMobile.set(this.gameService.isMobileDevice());
    this.applyConfig(this.config);
    this.generateLevel();
    this.initialized = true;

    // Skip instructions and show win state if already completed
    if (this.isCompleted) {
      this.showInstructions.set(false);
      this.gameWon.set(true);
    }

    // Load saved stats if completed
    if (this.isCompleted && this.day > 0) {
      const savedStats = this.stateService.getGameStats(this.day);
      if (savedStats) {
        this.collectedCount = savedStats.collected || 0;
      }
    }

    // Load persisted best scores for infinite mode
    if (this.isInfiniteMode) {
      const storageKey = this.getStorageKey();
      if (storageKey) {
        const savedStats = this.stateService.getGameStats(storageKey);
        if (savedStats) {
          this.bestHeight = savedStats.bestHeight || 0;
          this.bestTime = savedStats.bestTime || 0;
          this.bestTimeFormatted = this.formatTime(this.bestTime);
        }
      }
    }
  }

  ngAfterViewInit(): void {
    // Initialize canvas immediately so it's always visible
    setTimeout(() => {
      this.setupCanvas();

      // Preload player sprite and re-render once available
      this.spriteService
        .loadSprite('player', 'assets/sprites/player.png')
        .then(() => {
          if (!this.gameStarted()) {
            this.renderGame();
          }
        })
        .catch(() => {
          console.warn('Could not load player sprite, using fallback');
        });
    }, 0);
  }

  ngOnDestroy(): void {
    this.stopGame();
    this.keyboardService.destroy();
  }

  startGame(): void {
    if (this.gameStarted()) return;

    this.gameStarted.set(true);
    this.gameStarted.set(true);
    this.gameWon.set(false);
    this.gameLost.set(false);
    this.showInstructions.set(false);

    // Initialize keyboard and start game loop
    this.keyboardService.init();
    this.resetPlayer();
    this.gameLoopId = this.gameService.startGameLoop((deltaTime) => this.gameLoop(deltaTime));
  }

  restartGame(): void {
    this.stopGame();
    this.gameWon.set(false);
    this.gameLost.set(false);
    this.generateLevel();
    this.resetPlayer();
    this.collectedCount = 0;
    this.startGame();
  }

  private setupCanvas(): void {
    if (!this.canvasRef) {
      console.error('Canvas element not found');
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }
    this.ctx = ctx;

    // Set canvas size
    canvas.width = this.CANVAS_WIDTH;
    canvas.height = this.CANVAS_HEIGHT;

    // Initialize player position for initial render
    this.resetPlayer();

    // Render initial static frame
    this.renderGame();
  }

  stopGame(): void {
    if (this.gameLoopId !== null) {
      this.gameService.stopGameLoop(this.gameLoopId);
      this.gameLoopId = null;
    }
    this.keyboardService.destroy();
    this.gameStarted.set(false);
  }

  private applyConfig(config?: ClimberChallengeInput): void {
    let overrides: Partial<ClimberChallengeSettings> = {};
    let infiniteMode = false;

    if (config) {
      if (this.hasSettings(config)) {
        overrides = config.settings ?? {};
        infiniteMode = !!config.infiniteMode;
      } else {
        const { infiniteMode: maybeInfinite, ...rest } = config as Partial<
          ClimberChallengeSettings & { infiniteMode?: boolean }
        >;
        overrides = rest;
        infiniteMode = !!maybeInfinite;
      }
    }

    this.settings = { ...DEFAULT_CLIMBER_SETTINGS, ...overrides };
    this.isInfiniteMode = infiniteMode;
    // Don't reset endless stats here - they should persist across sessions
    // Only reset runtime stats (survivalTime, maxHeightReached)
    this.survivalTime = 0;
    this.maxHeightReached = 0;
    this.totalCollectibles = this.isInfiniteMode ? 0 : this.settings.collectibles;
  }

  private hasSettings(value: ClimberChallengeInput): value is ClimberChallengeConfig {
    return typeof value === 'object' && value !== null && 'settings' in value;
  }

  private resetPlayer(): void {
    this.player.x = this.CANVAS_WIDTH / 2 - this.player.width / 2;
    this.player.y = this.settings.worldHeight - 100;
    this.player.velocityX = 0;
    this.player.velocityY = 0;
    this.player.onGround = false;
    this.player.onIce = false;
    this.player.platformVelocityX = 0;
    this.player.currentPlatform = undefined;
    if (this.isInfiniteMode) {
      this.cameraY = this.player.y - this.CANVAS_HEIGHT / 2;
    } else {
      this.cameraY = Math.max(0, this.settings.worldHeight - this.CANVAS_HEIGHT);
    }
    this.jumpBuffer = 0;
    this.startingY = this.player.y;
    this.survivalTime = 0;
    this.maxHeightReached = 0;
  }

  private generateLevel(): void {
    this.platforms = [];
    this.collectibles = [];

    if (this.isInfiniteMode) {
      this.generateInfiniteLevel();
      this.totalCollectibles = 0;
      return;
    }

    // Starting platform
    const startingWidth = this.settings.startingPlatformWidth;
    this.platforms.push({
      x: (this.CANVAS_WIDTH - startingWidth) / 2,
      y: this.settings.worldHeight - 50,
      width: startingWidth,
      height: 15,
      type: 'static',
    });

    // Generate platforms going upward
    let currentY = this.settings.worldHeight - this.settings.platformGap;
    let lastPlatformType: Platform['type'] = 'static';

    while (currentY > this.settings.goalOffset + 100) {
      let platformType: Platform['type'] = 'static';

      // If last was static, force moving platform (gold) to allow X-traversal
      if (lastPlatformType === 'static') {
        platformType = 'moving';
      } else {
        const roll = Math.random();
        if (roll < this.settings.movingPlatformChance) {
          platformType = 'moving';
        } else if (roll < this.settings.movingPlatformChance + this.settings.icePlatformChance) {
          platformType = 'ice';
        }
      }

      const widthRange = this.settings.maxPlatformWidth - this.settings.minPlatformWidth;
      const width = this.settings.minPlatformWidth + Math.random() * Math.max(10, widthRange);
      const x = Math.random() * (this.CANVAS_WIDTH - width);

      const platform: Platform = {
        x,
        y: currentY,
        width,
        height: 15,
        type: platformType,
      };

      if (platformType === 'moving' || platformType === 'ice') {
        // Center the oscillation point so it covers full width
        const centerX = (this.CANVAS_WIDTH - width) / 2;
        platform.initialX = centerX;

        // Full width range
        platform.moveRange = (this.CANVAS_WIDTH - width) / 2;

        // Random speed (0.8x to 1.4x of base speed)
        platform.moveSpeed = this.settings.movingSpeed * (0.8 + Math.random() * 0.6);

        // Random phase for independence
        platform.phase = Math.random() * Math.PI * 2;
      }

      this.platforms.push(platform);
      lastPlatformType = platformType;
      const variance = (Math.random() * 2 - 1) * this.settings.platformGapVariance;
      const gap = Math.max(80, this.settings.platformGap + variance);
      currentY -= gap;
    }

    // Add collectibles at various heights
    for (let i = 0; i < this.totalCollectibles; i++) {
      const y =
        this.settings.worldHeight -
        this.settings.collectibleStartOffset -
        i * this.settings.collectibleSpacing;

      if (y <= this.settings.goalOffset + 40) {
        break;
      }

      const x = this.CANVAS_WIDTH / 2;
      this.collectibles.push({
        x,
        y,
        width: 20,
        height: 20,
        collected: false,
        initialX: x,
        moveRange: this.CANVAS_WIDTH / 2 - 40,
        moveSpeed: this.settings.movingSpeed * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Place goal zone at the top
    this.goalZone.x = 0;
    this.goalZone.width = this.CANVAS_WIDTH;
    this.goalZone.y = this.settings.goalOffset;

    this.totalCollectibles = this.collectibles.length;
  }

  private generateInfiniteLevel(): void {
    const startingWidth = this.settings.startingPlatformWidth;
    const startY = this.settings.worldHeight - 50;

    this.platforms.push({
      x: (this.CANVAS_WIDTH - startingWidth) / 2,
      y: startY,
      width: startingWidth,
      height: 15,
      type: 'static',
    });

    this.nextPlatformY = startY - this.settings.platformGap;
    this.highestGeneratedY = this.nextPlatformY;

    // Pre-generate a buffer of platforms above the starting area
    this.extendInfinitePlatforms(startY - this.INFINITE_GENERATION_BUFFER * 2);

    // Disable goal zone visuals in endless mode
    this.goalZone.x = 0;
    this.goalZone.y = -10000;
    this.goalZone.width = this.CANVAS_WIDTH;
    this.goalZone.height = 0;

    this.collectibles = [];
  }

  private extendInfinitePlatforms(targetY: number): void {
    let lastPlatformType: Platform['type'] =
      this.platforms.length > 0 ? this.platforms[this.platforms.length - 1].type : 'static';

    while (this.nextPlatformY > targetY) {
      let platformType: Platform['type'] = 'static';

      if (lastPlatformType === 'static') {
        platformType = 'moving';
      } else {
        const roll = Math.random();
        if (roll < this.settings.movingPlatformChance) {
          platformType = 'moving';
        } else if (roll < this.settings.movingPlatformChance + this.settings.icePlatformChance) {
          platformType = 'ice';
        }
      }

      const widthRange = this.settings.maxPlatformWidth - this.settings.minPlatformWidth;
      const width = this.settings.minPlatformWidth + Math.random() * Math.max(10, widthRange);
      const x = Math.random() * (this.CANVAS_WIDTH - width);

      const platform: Platform = {
        x,
        y: this.nextPlatformY,
        width,
        height: 15,
        type: platformType,
      };

      if (platformType === 'moving' || platformType === 'ice') {
        const centerX = (this.CANVAS_WIDTH - width) / 2;
        platform.initialX = centerX;
        platform.moveRange = (this.CANVAS_WIDTH - width) / 2;
        platform.moveSpeed = this.settings.movingSpeed * (0.8 + Math.random() * 0.6);
        platform.phase = Math.random() * Math.PI * 2;
      }

      this.platforms.push(platform);
      lastPlatformType = platformType;

      const variance = (Math.random() * 2 - 1) * this.settings.platformGapVariance;
      const gap = Math.max(80, this.settings.platformGap + variance);
      this.nextPlatformY -= gap;
    }

    this.highestGeneratedY = Math.min(this.highestGeneratedY, this.nextPlatformY);
  }

  private pruneInfinitePlatforms(): void {
    const cutoff = this.player.y + this.INFINITE_PRUNE_DISTANCE;
    this.platforms = this.platforms.filter((platform) => platform.y <= cutoff);
  }

  private resetEndlessStats(): void {
    // Only reset last run stats, not best scores (those persist in localStorage)
    this.lastRunHeight = 0;
    this.lastRunTime = 0;
    this.lastRunTimeFormatted = '00:00.000';
    this.survivalTime = 0;
    this.maxHeightReached = 0;
  }

  private gameLoop(deltaTime: number): void {
    this.updateGame(deltaTime);
    this.renderGame();
  }

  private updateGame(deltaTime: number): void {
    const time = Date.now() / 1000;

    if (this.isInfiniteMode) {
      this.survivalTime += deltaTime;
    }

    // Update moving platforms (both 'moving' and 'ice' types move now)
    this.platforms.forEach((platform) => {
      if (
        (platform.type === 'moving' || platform.type === 'ice') &&
        platform.initialX !== undefined
      ) {
        const oldX = platform.x;
        platform.x =
          platform.initialX! +
          Math.sin(
            time * (platform.moveSpeed ?? this.settings.movingSpeed) + (platform.phase ?? 0)
          ) *
            (platform.moveRange ?? this.settings.movingRange);

        // If player is on this platform, move them with it (unless it's ice)
        if (this.player.onGround && this.player.currentPlatform === platform) {
          const dx = platform.x - oldX;
          this.player.platformVelocityX = dx; // Store for jump momentum

          if (platform.type === 'moving') {
            this.player.x += dx;
          }
          // Ice platforms move but don't drag the player
        }
      }
    });

    // Update collectibles
    this.collectibles.forEach((collectible) => {
      if (collectible.initialX !== undefined) {
        collectible.x =
          collectible.initialX +
          Math.sin(time * (collectible.moveSpeed ?? 1) + (collectible.phase ?? 0)) *
            (collectible.moveRange ?? 50);
      }
    });

    // Update jump buffer
    if (this.jumpBuffer > 0) {
      this.jumpBuffer -= deltaTime;
    }

    // Check keyboard input (refresh buffer if pressed)
    if (
      !this.isMobile() &&
      (this.keyboardService.isSpacePressed() || this.keyboardService.isUpPressed())
    ) {
      this.jumpBuffer = 0.1; // Keep buffer active while holding key
    }

    // Apply physics
    if (this.player.onGround) {
      // On ground - no horizontal control, just stick to platform or slide
      this.player.velocityX = 0;
    } else {
      // In air - keep momentum from platform + slight air control?
      // User said "no movement", so maybe no air control either.
      // But we need to apply the momentum from the jump.
      // We'll just let velocityX persist (which we set on jump).
    }

    // Apply gravity
    if (!this.player.onGround) {
      this.player.velocityY += this.settings.gravity;
      this.player.velocityY = Math.min(this.player.velocityY, this.MAX_FALL_SPEED);
    }

    // Jump
    if (this.jumpBuffer > 0 && this.player.onGround) {
      this.player.velocityY = this.settings.jumpForce;
      this.player.onGround = false;
      this.player.velocityX = 0; // Jump straight up
      this.jumpBuffer = 0; // Consume buffer
    }

    // Update position
    this.player.x += this.player.velocityX;
    this.player.y += this.player.velocityY;

    if (this.isInfiniteMode) {
      const generationTarget = this.player.y - this.INFINITE_GENERATION_BUFFER;
      this.extendInfinitePlatforms(generationTarget);

      const heightClimbed = Math.max(0, this.startingY - this.player.y);
      if (heightClimbed > this.maxHeightReached) {
        this.maxHeightReached = heightClimbed;
      }
    }

    // Screen wrapping (horizontal)
    if (this.player.x < -this.player.width / 2) {
      this.player.x = this.CANVAS_WIDTH - this.player.width / 2;
    } else if (this.player.x > this.CANVAS_WIDTH - this.player.width / 2) {
      this.player.x = -this.player.width / 2;
    }

    // Platform collision
    this.player.onGround = false;
    this.player.onIce = false;
    this.player.platformVelocityX = 0; // Reset, will be set if on moving platform
    this.player.currentPlatform = undefined;

    for (const platform of this.platforms) {
      if (this.checkPlatformCollision(this.player, platform)) {
        if (this.player.velocityY >= 0) {
          // Landing on platform or staying on it
          this.player.y = platform.y - this.player.height;
          this.player.velocityY = 0;
          this.player.velocityX = 0; // Stop horizontal movement on landing
          this.player.onGround = true;
          this.player.onIce = platform.type === 'ice';
          this.player.currentPlatform = platform;
        }
      }
    }

    // Check collectibles
    this.collectibles.forEach((collectible) => {
      if (!collectible.collected) {
        if (
          this.gameService.checkRectCollision(
            {
              x: this.player.x,
              y: this.player.y,
              width: this.player.width,
              height: this.player.height,
            },
            collectible
          )
        ) {
          collectible.collected = true;
          this.collectedCount++;
        }
      }
    });

    if (this.isInfiniteMode) {
      this.pruneInfinitePlatforms();
    }

    // Check goal zone
    if (!this.isInfiniteMode) {
      if (
        this.gameService.checkRectCollision(
          {
            x: this.player.x,
            y: this.player.y,
            width: this.player.width,
            height: this.player.height,
          },
          this.goalZone
        )
      ) {
        this.winGame();
      }
    }

    // Camera follow
    const targetCameraY = this.player.y - this.CANVAS_HEIGHT / 2;
    this.cameraY = this.gameService.lerp(this.cameraY, targetCameraY, 0.1);
    if (this.isInfiniteMode) {
      const maxCamera = this.settings.worldHeight - this.CANVAS_HEIGHT;
      this.cameraY = Math.min(this.cameraY, maxCamera);
    } else {
      this.cameraY = Math.max(
        0,
        Math.min(this.cameraY, this.settings.worldHeight - this.CANVAS_HEIGHT)
      );
    }

    // Fall off bottom
    if (this.player.y > this.settings.worldHeight + 100) {
      this.loseGame();
    }
  }

  private checkPlatformCollision(player: Player, platform: Platform): boolean {
    return (
      player.x + player.width > platform.x &&
      player.x < platform.x + platform.width &&
      player.y + player.height >= platform.y &&
      player.y + player.height < platform.y + platform.height + 10 &&
      player.velocityY >= 0
    );
  }

  private renderGame(): void {
    // Clear canvas
    this.ctx.fillStyle = '#0a1929';
    this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    // Draw stars background
    this.drawStars();

    // Save context for camera transform
    this.ctx.save();
    this.ctx.translate(0, -this.cameraY);

    // Draw platforms
    this.platforms.forEach((platform) => {
      this.drawPlatform(platform);
    });

    // Draw collectibles
    this.collectibles.forEach((collectible) => {
      if (!collectible.collected) {
        this.drawCollectible(collectible);
      }
    });

    // Draw goal
    if (!this.isInfiniteMode) {
      this.drawGoal();
    }

    // Draw player
    this.drawPlayer();

    // Restore context
    this.ctx.restore();

    // Draw UI
    this.drawUI();
  }

  private drawStars(): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % this.CANVAS_WIDTH;
      const y = (i * 117) % this.CANVAS_HEIGHT;
      this.ctx.fillRect(x, y, 2, 2);
    }
  }

  private drawPlatform(platform: Platform): void {
    let color = '#2a9d8f'; // Green
    if (platform.type === 'ice') {
      color = '#a8dadc'; // Light blue
    } else if (platform.type === 'moving') {
      color = '#f4d35e'; // Gold
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    // Add border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
  }

  private drawCollectible(collectible: Collectible): void {
    // Draw ornament
    this.ctx.fillStyle = '#e63946';
    this.ctx.beginPath();
    this.ctx.arc(
      collectible.x + collectible.width / 2,
      collectible.y + collectible.height / 2,
      collectible.width / 2,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Add shine
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(
      collectible.x + collectible.width / 2 - 3,
      collectible.y + collectible.height / 2 - 3,
      3,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
  }

  private drawGoal(): void {
    // Draw finish line ribbon
    this.ctx.fillStyle = 'rgba(244, 211, 94, 0.2)';
    this.ctx.fillRect(this.goalZone.x, this.goalZone.y, this.goalZone.width, this.goalZone.height);

    // Draw checkered pattern or stars across
    this.ctx.fillStyle = 'rgba(244, 211, 94, 0.6)';
    const starSize = 20;
    const spacing = 40;
    const count = Math.ceil(this.CANVAS_WIDTH / spacing);

    for (let i = 0; i < count; i++) {
      const x = i * spacing + 10;
      const y = this.goalZone.y + this.goalZone.height / 2 - starSize / 2;
      this.ctx.fillRect(x, y, starSize, starSize);
    }

    // Draw main star in middle
    const centerX = this.CANVAS_WIDTH / 2;
    const centerY = this.goalZone.y + this.goalZone.height / 2;
    const spikes = 5;
    const outerRadius = 25;
    const innerRadius = 12;

    this.ctx.fillStyle = '#f4d35e';
    this.ctx.beginPath();

    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;

      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }

    this.ctx.closePath();
    this.ctx.fill();

    // Add glow effect
    this.ctx.strokeStyle = 'rgba(244, 211, 94, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  private drawPlayer(): void {
    const sprite = this.spriteService.getSprite('player');

    if (sprite && sprite.complete) {
      this.ctx.drawImage(
        sprite,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height
      );
    } else {
      // Fallback rectangle
      this.ctx.fillStyle = '#e63946';
      this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    }
  }

  private drawUI(): void {
    if (this.isInfiniteMode) {
      this.drawInfiniteUI();
      return;
    }

    // Progress bar
    const progress = Math.max(
      0,
      Math.min(1, 1 - this.player.y / Math.max(this.settings.worldHeight, 1))
    );
    const barWidth = this.CANVAS_WIDTH - 40;
    const barHeight = 10;
    const barX = 20;
    const barY = 20;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    this.ctx.fillStyle = '#2a9d8f';
    this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    // Collectibles counter
    this.ctx.fillStyle = '#f8f9fa';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(
      `Ornaments: ${this.collectedCount}/${this.totalCollectibles}`,
      barX,
      barY + barHeight + 25
    );
  }

  private drawInfiniteUI(): void {
    const timeString = this.formatTime(this.survivalTime);

    const currentHeight = Math.max(0, this.startingY - this.player.y);
    const heightDisplay = `${Math.max(0, Math.floor(currentHeight))}m`;
    const bestDisplay = `${Math.max(
      0,
      Math.floor(Math.max(this.bestHeight, this.maxHeightReached))
    )}m`;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(15, 15, 180, 70);
    this.ctx.fillRect(this.CANVAS_WIDTH - 135, 15, 120, 50);

    this.ctx.fillStyle = '#f4d35e';
    this.ctx.font = '18px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`⏱ ${timeString}`, 25, 38);
    this.ctx.fillText(`⬆️ ${heightDisplay}`, 25, 63);

    this.ctx.textAlign = 'right';
    this.ctx.fillText(`⭐ ${bestDisplay}`, this.CANVAS_WIDTH - 25, 45);
    this.ctx.restore();
  }

  private formatTime(totalSeconds: number): string {
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

  private getStorageKey(): number | string | null {
    // For extras, use levelId; for calendar days, use day number
    if (this.levelId) {
      return this.levelId;
    }
    if (this.day > 0) {
      return this.day;
    }
    return null;
  }

  private getInput(): { x: number; jump: boolean } {
    if (this.isMobile()) {
      return {
        x: 0, // No horizontal control on mobile
        jump: false, // Jump handled via buffer
      };
    } else {
      // Also disable horizontal control on desktop for consistency
      const jump = this.keyboardService.isSpacePressed() || this.keyboardService.isUpPressed();
      return { x: 0, jump };
    }
  }

  onDirectionChange(direction: { x: number; y: number }): void {
    this.touchDirection = direction;
  }

  onJump(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.jumpBuffer = 0.15; // 150ms buffer
  }

  private winGame(): void {
    this.gameWon.set(true);
    this.stopGame();

    // Save stats
    if (this.day > 0) {
      this.stateService.saveGameStats(this.day, {
        collected: this.collectedCount,
      });
    }

    this.completed.emit();
  }

  private loseGame(): void {
    this.gameLost.set(true);
    if (this.isInfiniteMode) {
      const heightValue = Math.max(0, Math.floor(this.maxHeightReached));
      const lastTimeValue = this.survivalTime;

      this.lastRunHeight = heightValue;
      this.lastRunTime = lastTimeValue;
      this.lastRunTimeFormatted = this.formatTime(lastTimeValue);

      if (heightValue > this.bestHeight) {
        this.bestHeight = heightValue;
      }

      if (lastTimeValue > this.bestTime) {
        this.bestTime = lastTimeValue;
        this.bestTimeFormatted = this.lastRunTimeFormatted;
      }

      // Persist best scores for infinite mode
      const storageKey = this.getStorageKey();
      console.log('[Climber] loseGame. Saving stats? Key:', storageKey, 'Stats:', {
        bestHeight: this.bestHeight,
        bestTime: this.bestTime,
      });
      if (storageKey) {
        this.stateService.saveGameStats(storageKey, {
          bestHeight: this.bestHeight,
          bestTime: this.bestTime,
        });
      }
    }
    this.stopGame();
  }

  showReward(): void {
    this.completed.emit();
  }
}
