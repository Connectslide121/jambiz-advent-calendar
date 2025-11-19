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

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'static' | 'moving' | 'ice';
  moveRange?: number; // For moving platforms
  moveSpeed?: number; // For moving platforms
  initialX?: number; // For moving platforms
}

interface Collectible {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
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
}

type ClimberChallengeInput = ClimberChallengeConfig | Partial<ClimberChallengeSettings>;

const DEFAULT_CLIMBER_SETTINGS: ClimberChallengeSettings = {
  worldHeight: 2000,
  platformGap: 120,
  platformGapVariance: 30,
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
  imports: [CommonModule, TranslateModule, TouchControlsComponent],
  templateUrl: './climber-challenge.html',
  styleUrls: ['./climber-challenge.scss'],
})
export default class ClimberChallengeComponent
  implements OnInit, AfterViewInit, OnDestroy, OnChanges
{
  @Input() config?: ClimberChallengeInput;
  @Input() isCompleted = false;
  @Input() day = 0;
  @Output() completed = new EventEmitter<void>();

  @ViewChild('gameCanvas', { static: false })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  // Game state signals
  gameStarted = signal(false);
  gameWon = signal(false);
  gameLost = signal(false);
  isMobile = signal(false);

  private ctx!: CanvasRenderingContext2D;
  private gameLoopId: number | null = null;
  private readonly CANVAS_WIDTH = 400;
  private readonly CANVAS_HEIGHT = 600;

  private settings: ClimberChallengeSettings = { ...DEFAULT_CLIMBER_SETTINGS };
  private initialized = false;

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
  };

  // Physics constants
  private readonly MAX_FALL_SPEED = 15;

  // Camera
  private cameraY = 0;

  // Game objects
  private platforms: Platform[] = [];
  private collectibles: Collectible[] = [];
  private goalStar = { x: 200, y: 50, width: 40, height: 40 };

  // Touch controls
  private touchDirection = { x: 0, y: 0 };

  // Stats (public for template access)
  collectedCount = 0;
  totalCollectibles = DEFAULT_CLIMBER_SETTINGS.collectibles;

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
    this.isMobile.set(this.gameService.isMobileDevice());
    this.applyConfig(this.config);
    this.generateLevel();
    this.initialized = true;

    // Load saved stats if completed
    if (this.isCompleted && this.day > 0) {
      const savedStats = this.stateService.getGameStats(this.day);
      if (savedStats) {
        this.collectedCount = savedStats.collected || 0;
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
    this.gameWon.set(false);
    this.gameLost.set(false);

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

    if (config) {
      if (this.hasSettings(config)) {
        overrides = config.settings ?? {};
      } else {
        overrides = config as Partial<ClimberChallengeSettings>;
      }
    }

    this.settings = { ...DEFAULT_CLIMBER_SETTINGS, ...overrides };
    this.totalCollectibles = this.settings.collectibles;
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
    this.cameraY = Math.max(0, this.settings.worldHeight - this.CANVAS_HEIGHT);
  }

  private generateLevel(): void {
    this.platforms = [];
    this.collectibles = [];

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

    while (currentY > this.settings.goalOffset + 100) {
      const roll = Math.random();
      let platformType: Platform['type'] = 'static';
      if (roll < this.settings.movingPlatformChance) {
        platformType = 'moving';
      } else if (roll < this.settings.movingPlatformChance + this.settings.icePlatformChance) {
        platformType = 'ice';
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

      if (platformType === 'moving') {
        platform.initialX = x;
        platform.moveRange = this.settings.movingRange;
        platform.moveSpeed = this.settings.movingSpeed;
      }

      this.platforms.push(platform);
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

      this.collectibles.push({
        x: Math.random() * (this.CANVAS_WIDTH - 30) + 15,
        y,
        width: 20,
        height: 20,
        collected: false,
      });
    }

    // Place goal star at the top
    this.goalStar.x = this.CANVAS_WIDTH / 2 - this.goalStar.width / 2;
    this.goalStar.y = this.settings.goalOffset;

    this.totalCollectibles = this.collectibles.length;
  }

  private gameLoop(deltaTime: number): void {
    this.updateGame(deltaTime);
    this.renderGame();
  }

  private updateGame(deltaTime: number): void {
    // Update moving platforms
    this.platforms.forEach((platform) => {
      if (platform.type === 'moving' && platform.initialX !== undefined) {
        const time = Date.now() / 1000;
        platform.x =
          platform.initialX! +
          Math.sin(time * (platform.moveSpeed ?? this.settings.movingSpeed)) *
            (platform.moveRange ?? this.settings.movingRange);
      }
    });

    // Get input
    const input = this.getInput();

    // Apply horizontal movement with ice physics
    if (this.player.onIce && this.player.onGround) {
      // Ice physics - reduced control and lingering momentum
      if (input.x !== 0) {
        this.player.velocityX += input.x * this.settings.iceAcceleration;
      }
      this.player.velocityX *= this.settings.iceFriction;
      const maxIceSpeed = this.settings.moveSpeed * this.settings.maxIceSpeedMultiplier;
      this.player.velocityX = Math.max(-maxIceSpeed, Math.min(maxIceSpeed, this.player.velocityX));
      if (Math.abs(this.player.velocityX) < 0.01) {
        this.player.velocityX = 0;
      }
    } else if (this.player.onGround) {
      // Normal ground movement - responsive control
      this.player.velocityX = input.x * this.settings.moveSpeed;
      if (input.x === 0) {
        this.player.velocityX *= this.settings.normalFriction;
        if (Math.abs(this.player.velocityX) < 0.05) {
          this.player.velocityX = 0;
        }
      }
    } else {
      // In air - limited influence
      this.player.velocityX += input.x * (this.settings.moveSpeed * 0.08);
      this.player.velocityX *= 0.9;
      const maxAirSpeed = this.settings.moveSpeed * 1.2;
      this.player.velocityX = Math.max(-maxAirSpeed, Math.min(maxAirSpeed, this.player.velocityX));
    }

    // Apply gravity
    if (!this.player.onGround) {
      this.player.velocityY += this.settings.gravity;
      this.player.velocityY = Math.min(this.player.velocityY, this.MAX_FALL_SPEED);
    }

    // Jump
    if (input.jump && this.player.onGround) {
      this.player.velocityY = this.settings.jumpForce;
      this.player.onGround = false;
    }

    // Update position
    this.player.x += this.player.velocityX;
    this.player.y += this.player.velocityY;

    // Screen wrapping (horizontal)
    if (this.player.x < -this.player.width / 2) {
      this.player.x = this.CANVAS_WIDTH - this.player.width / 2;
    } else if (this.player.x > this.CANVAS_WIDTH - this.player.width / 2) {
      this.player.x = -this.player.width / 2;
    }

    // Platform collision
    this.player.onGround = false;
    this.player.onIce = false;

    for (const platform of this.platforms) {
      if (this.checkPlatformCollision(this.player, platform)) {
        if (this.player.velocityY > 0) {
          // Landing on platform
          this.player.y = platform.y - this.player.height;
          this.player.velocityY = 0;
          this.player.onGround = true;
          this.player.onIce = platform.type === 'ice';
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

    // Check goal star
    if (
      this.gameService.checkRectCollision(
        {
          x: this.player.x,
          y: this.player.y,
          width: this.player.width,
          height: this.player.height,
        },
        this.goalStar
      )
    ) {
      this.winGame();
    }

    // Camera follow
    const targetCameraY = this.player.y - this.CANVAS_HEIGHT / 2;
    this.cameraY = this.gameService.lerp(this.cameraY, targetCameraY, 0.1);
    this.cameraY = Math.max(
      0,
      Math.min(this.cameraY, this.settings.worldHeight - this.CANVAS_HEIGHT)
    );

    // Fall off bottom
    if (this.player.y > this.settings.worldHeight + 100) {
      this.loseGame();
    }
  }

  private checkPlatformCollision(player: Player, platform: Platform): boolean {
    return (
      player.x + player.width > platform.x &&
      player.x < platform.x + platform.width &&
      player.y + player.height > platform.y &&
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

    // Draw goal star
    this.drawGoalStar();

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

  private drawGoalStar(): void {
    const { x, y, width, height } = this.goalStar;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const spikes = 5;
    const outerRadius = width / 2;
    const innerRadius = outerRadius * 0.5;

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
    this.ctx.strokeStyle = 'rgba(244, 211, 94, 0.5)';
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

  private getInput(): { x: number; jump: boolean } {
    if (this.isMobile()) {
      return {
        x: this.touchDirection.x,
        jump: false, // Jump only via button on mobile
      };
    } else {
      const x = this.keyboardService.getHorizontalAxis();
      const jump = this.keyboardService.isSpacePressed();
      return { x, jump };
    }
  }

  onDirectionChange(direction: { x: number; y: number }): void {
    this.touchDirection = direction;
  }

  onJump(): void {
    if (this.player.onGround) {
      this.player.velocityY = this.settings.jumpForce;
      this.player.onGround = false;
    }
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
    this.stopGame();
  }
}
