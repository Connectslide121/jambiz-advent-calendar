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
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check } from 'lucide-angular';
import { GameService } from '../../../services/game.service';
import { KeyboardService } from '../../../services/keyboard.service';
import { SpriteService } from '../../../services/sprite.service';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { ChallengeInfoModalComponent } from '../../shared/challenge-info-modal/challenge-info-modal.component';

export interface FlappySleighConfig {
  levelLength: number; // Distance to finish
  scrollSpeed: number; // Pixels per second
  flapForce: number; // Upward velocity on flap
  gravity: number; // Gravity strength
  gapSize: number; // Size of the gap between pipes
  obstacleFrequency: number; // Distance between obstacles
  infiniteMode?: boolean; // Endless survival variant
}

@Component({
  selector: 'app-flappy-sleigh-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule, ChallengeInfoModalComponent],
  templateUrl: './flappy-sleigh-challenge.html',
  styleUrl: './flappy-sleigh-challenge.scss',
})
export class FlappySleighChallenge implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() config!: FlappySleighConfig;
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string; // Used for extras levels to store stats
  @Output() completed = new EventEmitter<void>();
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Check = Check;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  gameLoopId?: number;
  playerSprite: HTMLImageElement | null = null;
  treeSprite: HTMLImageElement | null = null;

  private isMobile = false;
  private scale = 1;
  private mobileOffset = 0;
  private playableHeight = 0;
  private wasSpacePressed = false;
  public isInfiniteMode = false;
  private survivalTime = 0;
  private furthestDistance = 0;
  private nextObstacleX = 0;
  private readonly INFINITE_LOOKAHEAD = 4000;
  private readonly INFINITE_PRUNE_OFFSET = 200;

  bestDistance = 0;
  bestTime = 0;
  bestTimeFormatted = '00:00.000';
  lastDistance = 0;
  lastTime = 0;
  lastTimeFormatted = '00:00.000';

  // Player state
  player = {
    x: 100,
    y: 300,
    width: 50,
    height: 35,
    velocityY: 0,
    rotation: 0,
  };

  // Game state
  cameraX = 0;
  gameStarted = false;
  gameWon = false;
  gameLost = false;
  showInstructions = true;

  // Obstacles
  obstacles: Array<{ x: number; topHeight: number; bottomY: number; width: number }> = [];

  constructor(
    private gameService: GameService,
    private keyboardService: KeyboardService,
    private spriteService: SpriteService,
    private stateService: CalendarStateService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Detect input changes if needed
  }

  ngOnInit(): void {
    console.log(
      '[Flappy] ngOnInit. levelId:',
      this.levelId,
      'day:',
      this.day,
      'isInfinite:',
      this.isInfiniteMode
    );
    if (this.isCompleted) {
      this.gameWon = true;
      this.showInstructions = false; // Skip instructions for completed challenges
    }
    this.keyboardService.init();

    // Default config if not provided
    if (!this.config) {
      this.config = {
        levelLength: 3000,
        scrollSpeed: 200,
        flapForce: 350,
        gravity: 1000,
        gapSize: 180,
        obstacleFrequency: 350,
      };
    }

    this.isInfiniteMode = !!this.config.infiniteMode;
    if (this.isInfiniteMode) {
      this.gameWon = false;
      // Only reset runtime stats, not best scores
      this.lastDistance = 0;
      this.lastTime = 0;
      this.lastTimeFormatted = '00:00.000';
      this.survivalTime = 0;
      this.furthestDistance = 0;
    }

    // Load persisted best scores for infinite mode
    if (this.isInfiniteMode) {
      const storageKey = this.getStorageKey();
      if (storageKey) {
        const savedStats = this.stateService.getGameStats(storageKey);
        if (savedStats) {
          this.bestDistance = savedStats.bestDistance || 0;
          this.bestTime = savedStats.bestTime || 0;
          this.bestTimeFormatted = this.formatTime(this.bestTime);
        }
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.canvasRef) {
      setTimeout(() => {
        this.initCanvas(this.canvasRef.nativeElement);

        // Load sprites
        Promise.all([
          this.spriteService.loadSprite('sleigh', '/assets/sprites/sleigh.png'),
          this.spriteService.loadSprite('tree', '/assets/sprites/tree.png'),
        ])
          .then(([sleigh, tree]) => {
            this.playerSprite = sleigh;
            this.treeSprite = tree;
            this.render();
          })
          .catch(() => {
            this.render();
          });
      }, 50);
    }

    // Add resize listener
    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnDestroy(): void {
    this.stopGame();
    this.keyboardService.destroy();
    window.removeEventListener('resize', this.onResize.bind(this));
  }

  onResize(): void {
    if (this.canvasRef) {
      this.initCanvas(this.canvasRef.nativeElement);
      if (!this.gameStarted) {
        this.render();
      }
    }
  }

  initCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) return;
    this.ctx = context;

    const containerWidth = canvas.parentElement!.clientWidth;
    this.isMobile = containerWidth < 640;
    this.scale = this.isMobile ? 0.5 : 1;

    // Use standard 16:9 aspect ratio for consistency with other games
    const aspectRatio = 0.5625;

    canvas.width = containerWidth;
    canvas.height = containerWidth * aspectRatio;

    this.mobileOffset = this.isMobile ? 40 : 0;
    this.playableHeight = canvas.height / this.scale - this.mobileOffset;
    if (this.playableHeight <= 0) {
      this.playableHeight = canvas.height / this.scale;
    }

    // Only reset player if game hasn't started to avoid resetting position during resize
    if (!this.gameStarted) {
      this.resetPlayer();
    }

    // Regenerate obstacles to fit new height
    this.generateObstacles();

    this.gameService.scaleCanvasForRetina(canvas);
  }

  resetPlayer(): void {
    const height = this.playableHeight || (this.canvas ? this.canvas.height / this.scale : 400);
    this.player.y = height / 2;
    this.player.velocityY = 0;
    this.player.rotation = 0;
    this.player.x = this.isMobile ? 60 : 100;
  }

  generateObstacles(): void {
    this.obstacles = [];
    if (!this.canvas) return;

    const startX = 500;
    const height = this.playableHeight || this.canvas.height / this.scale;
    const endX = this.isInfiniteMode
      ? this.cameraX + this.INFINITE_LOOKAHEAD
      : this.config.levelLength - 300;

    let x = startX;
    while (x < endX) {
      this.obstacles.push(this.createObstacle(x, height));
      const spacing = this.isInfiniteMode
        ? this.getInfiniteSpacing()
        : this.config.obstacleFrequency;
      x += spacing;
    }

    this.nextObstacleX = x;
  }

  private createObstacle(
    x: number,
    height: number
  ): {
    x: number;
    topHeight: number;
    bottomY: number;
    width: number;
  } {
    const minHeight = 30;
    const availableHeight = Math.max(height - this.config.gapSize - minHeight, minHeight + 50);
    const topHeight = minHeight + Math.random() * (availableHeight - minHeight);

    return {
      x,
      topHeight,
      bottomY: topHeight + this.config.gapSize,
      width: 40,
    };
  }

  private getInfiniteSpacing(): number {
    const base = this.config.obstacleFrequency;
    const variance = base * 0.3;
    const spacing = base + (Math.random() * 2 - 1) * variance;
    return Math.max(220, spacing);
  }

  private extendInfiniteObstacles(): void {
    if (!this.canvas) return;

    const height = this.playableHeight || this.canvas.height / this.scale;
    const targetX = this.cameraX + this.INFINITE_LOOKAHEAD;

    while (this.nextObstacleX < targetX) {
      this.obstacles.push(this.createObstacle(this.nextObstacleX, height));
      this.nextObstacleX += this.getInfiniteSpacing();
    }

    const pruneThreshold = this.cameraX - this.INFINITE_PRUNE_OFFSET;
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x > pruneThreshold);
  }

  startGame(): void {
    if (!this.ctx) return;

    this.gameStarted = true;
    this.gameWon = false;
    this.gameLost = false;
    this.showInstructions = false;
    this.cameraX = 0;
    this.survivalTime = 0;
    this.furthestDistance = 0;
    this.resetPlayer();
    this.generateObstacles();

    // Initial flap
    this.flap();

    this.gameLoopId = this.gameService.startGameLoop((deltaTime) => {
      this.update(deltaTime);
      this.render();
    });
  }

  stopGame(): void {
    if (this.gameLoopId !== undefined) {
      this.gameService.stopGameLoop(this.gameLoopId);
      this.gameLoopId = undefined;
    }
  }

  flap(): void {
    if (this.gameLost || this.gameWon) return;
    this.player.velocityY = -this.config.flapForce;
  }

  handleCanvasTap(): void {
    if (!this.gameStarted) {
      this.startGame();
    } else {
      this.flap();
    }
  }

  reset(): void {
    this.stopGame();
    this.gameStarted = false;
    this.gameWon = false;
    this.gameLost = false;
    this.cameraX = 0;
    this.survivalTime = 0;
    this.furthestDistance = 0;

    if (this.canvas) {
      this.resetPlayer();
      this.render();
    }
  }

  update(deltaTime: number): void {
    if (!this.gameStarted || this.gameWon || this.gameLost) return;

    if (this.isInfiniteMode) {
      this.survivalTime += deltaTime;
    }

    this.cameraX += this.config.scrollSpeed * deltaTime;

    if (this.isInfiniteMode) {
      this.extendInfiniteObstacles();
      this.furthestDistance = Math.max(this.furthestDistance, this.cameraX);
    }

    // Input
    const isSpacePressed =
      this.keyboardService.isSpacePressed() || this.keyboardService.isUpPressed();
    if (isSpacePressed && !this.wasSpacePressed) {
      this.flap();
    }
    this.wasSpacePressed = isSpacePressed;

    // Gravity
    this.player.velocityY += this.config.gravity * deltaTime;
    this.player.y += this.player.velocityY * deltaTime;

    // Rotation based on velocity
    this.player.rotation = Math.min(
      Math.PI / 4,
      Math.max(-Math.PI / 4, (this.player.velocityY * 0.1 * Math.PI) / 180)
    );

    // Bounds checking (Floor and Ceiling)
    const height = this.playableHeight || this.canvas.height / this.scale;
    if (this.player.y + this.player.height > height || this.player.y < 0) {
      this.crash();
      return;
    }

    // Obstacle collision
    const playerRect = {
      x: this.player.x,
      y: this.player.y + 5, // slightly smaller hitbox
      width: this.player.width - 10,
      height: this.player.height - 10,
    };

    for (const obs of this.obstacles) {
      const screenX = obs.x - this.cameraX;
      if (screenX > -obs.width && screenX < this.canvas.width / this.scale) {
        // Top pipe
        if (
          this.gameService.checkRectCollision(playerRect, {
            x: screenX,
            y: 0,
            width: obs.width,
            height: obs.topHeight,
          })
        ) {
          this.crash();
          return;
        }
        // Bottom pipe
        if (
          this.gameService.checkRectCollision(playerRect, {
            x: screenX,
            y: obs.bottomY,
            width: obs.width,
            height: height - obs.bottomY,
          })
        ) {
          this.crash();
          return;
        }
      }
    }

    // Win condition
    if (!this.isInfiniteMode && this.cameraX >= this.config.levelLength - 200) {
      // Reached tree
      this.gameWon = true;
      this.stopGame();
      setTimeout(() => this.completed.emit(), 500);
    }
  }

  crash(): void {
    if (this.gameLost) return;
    this.gameLost = true;

    if (this.isInfiniteMode) {
      const distance = Math.floor(this.furthestDistance / 100); // Convert pixels to meters roughly
      const time = this.survivalTime;

      this.lastDistance = distance;
      this.lastTime = time;
      this.lastTimeFormatted = this.formatTime(time);

      if (distance > this.bestDistance) {
        this.bestDistance = distance;
      }
      if (time > this.bestTime) {
        this.bestTime = time;
        this.bestTimeFormatted = this.lastTimeFormatted;
      }

      // Persist best scores
      const storageKey = this.getStorageKey();
      console.log('[Flappy] crash. Saving stats? Key:', storageKey, 'Stats:', {
        bestDistance: this.bestDistance,
        bestTime: this.bestTime,
      });
      if (storageKey) {
        this.stateService.saveGameStats(storageKey, {
          bestDistance: this.bestDistance,
          bestTime: this.bestTime,
        });
      }
    }

    this.stopGame();
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

    const logicalHeight = this.playableHeight || this.canvas.height / this.scale;

    // Draw sky gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, logicalHeight);
    gradient.addColorStop(0, '#1a2332');
    gradient.addColorStop(1, '#06121f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width / this.scale, logicalHeight);

    // Draw obstacles (Candy Canes)
    for (const obs of this.obstacles) {
      const screenX = obs.x - this.cameraX;

      // Only draw if on screen
      if (screenX + obs.width > 0 && screenX < this.canvas.width / this.scale) {
        // Top Pipe
        this.drawCandyPipe(screenX, 0, obs.width, obs.topHeight, true);

        // Bottom Pipe
        this.drawCandyPipe(screenX, obs.bottomY, obs.width, logicalHeight - obs.bottomY, false);
      }
    }

    // Draw finish line / Tree
    if (!this.isInfiniteMode) {
      const finishX = this.config.levelLength - 180 - this.cameraX;
      if (finishX > -100 && finishX < this.canvas.width / this.scale) {
        if (this.treeSprite) {
          const treeWidth = 400;
          const treeHeight = 550;
          this.ctx.drawImage(
            this.treeSprite,
            finishX,
            logicalHeight / 2 - treeHeight / 2,
            treeWidth,
            treeHeight
          );
        } else {
          this.ctx.fillStyle = '#2a9d8f';
          this.ctx.fillRect(finishX, logicalHeight / 2 - 75, 100, 150);
        }
      }
    }

    // Draw player
    this.ctx.save();
    this.ctx.translate(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );
    this.ctx.rotate(this.player.rotation);

    if (this.playerSprite) {
      this.ctx.drawImage(
        this.playerSprite,
        -this.player.width / 2,
        -this.player.height / 2,
        this.player.width,
        this.player.height
      );
    } else {
      this.ctx.fillStyle = '#e63946';
      this.ctx.fillRect(
        -this.player.width / 2,
        -this.player.height / 2,
        this.player.width,
        this.player.height
      );
    }
    this.ctx.restore();

    this.ctx.restore();

    if (this.isInfiniteMode) {
      this.drawInfiniteHud();
      return;
    }

    // Draw progress bar (outside scaled context)
    const progress = Math.min(this.cameraX / (this.config.levelLength - 200), 1);

    // Keep left margin at 20, but reduce width to prevent overflow on the right
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

  private drawInfiniteHud(): void {
    const timeString = this.formatTime(this.survivalTime);
    const currentDistance = Math.max(0, Math.floor(this.cameraX / 10));
    const bestDistance = Math.max(this.bestDistance, Math.floor(this.furthestDistance / 10));

    const padding = this.isMobile ? 10 : 20;
    const hudWidth = this.canvas.width;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(padding, padding, 210, 70);
    this.ctx.fillRect(hudWidth - 170 - padding, padding, 170, 50);

    this.ctx.fillStyle = '#f4d35e';
    this.ctx.font = this.isMobile ? '16px monospace' : '20px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`⏱ ${timeString}`, padding + 10, padding + (this.isMobile ? 24 : 30));
    this.ctx.fillText(`🛷 ${currentDistance}m`, padding + 10, padding + (this.isMobile ? 50 : 56));

    this.ctx.textAlign = 'right';
    this.ctx.fillText(
      `⭐ ${bestDistance}m`,
      hudWidth - padding - 10,
      padding + (this.isMobile ? 36 : 42)
    );
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

  private resetEndlessStats(): void {
    // Only reset last run stats, not best scores (those persist in localStorage)
    this.lastDistance = 0;
    this.lastTime = 0;
    this.lastTimeFormatted = '00:00.000';
    this.survivalTime = 0;
    this.furthestDistance = 0;
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

  drawCandyPipe(x: number, y: number, width: number, height: number, isTop: boolean): void {
    this.ctx.fillStyle = '#e63946';
    this.ctx.fillRect(x, y, width, height);

    // Stripes
    this.ctx.fillStyle = '#ffffff';
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();

    for (let i = -height; i < width + height; i += 20) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + i, y);
      this.ctx.lineTo(x + i + 10, y);
      this.ctx.lineTo(x + i - height + 10, y + height);
      this.ctx.lineTo(x + i - height, y + height);
      this.ctx.fill();
    }
    this.ctx.restore();

    // Cap
    this.ctx.fillStyle = '#e63946';
    const capHeight = 20;
    const capY = isTop ? y + height - capHeight : y;
    this.ctx.fillRect(x - 5, capY, width + 10, capHeight);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.strokeRect(x - 5, capY, width + 10, capHeight);
  }

  showReward(): void {
    this.completed.emit();
  }
}
