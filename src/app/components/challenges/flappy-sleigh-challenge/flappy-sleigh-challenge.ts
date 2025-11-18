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
import { LucideAngularModule, Check } from 'lucide-angular';
import { GameService } from '../../../services/game.service';
import { KeyboardService } from '../../../services/keyboard.service';
import { SpriteService } from '../../../services/sprite.service';

export interface FlappySleighConfig {
  levelLength: number; // Distance to finish
  scrollSpeed: number; // Pixels per second
  flapForce: number; // Upward velocity on flap
  gravity: number; // Gravity strength
  gapSize: number; // Size of the gap between pipes
  obstacleFrequency: number; // Distance between obstacles
}

@Component({
  selector: 'app-flappy-sleigh-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './flappy-sleigh-challenge.html',
  styleUrl: './flappy-sleigh-challenge.scss',
})
export class FlappySleighChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config!: FlappySleighConfig;
  @Input() isCompleted = false;
  @Input() day?: number;
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

  // Obstacles
  obstacles: Array<{ x: number; topHeight: number; bottomY: number; width: number }> = [];

  constructor(
    private gameService: GameService,
    private keyboardService: KeyboardService,
    private spriteService: SpriteService
  ) {}

  ngOnInit(): void {
    if (this.isCompleted) {
      this.gameWon = true;
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
    const endX = this.config.levelLength - 300; // Leave room for finish
    const height = this.playableHeight || this.canvas.height / this.scale;

    for (let x = startX; x < endX; x += this.config.obstacleFrequency) {
      const minHeight = 30;
      const maxHeight = height - this.config.gapSize - minHeight;
      const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

      this.obstacles.push({
        x,
        topHeight,
        bottomY: topHeight + this.config.gapSize,
        width: 40,
      });
    }
  }

  startGame(): void {
    if (!this.ctx) return;

    this.gameStarted = true;
    this.gameWon = false;
    this.gameLost = false;
    this.cameraX = 0;
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

    if (this.canvas) {
      this.resetPlayer();
      this.render();
    }
  }

  update(deltaTime: number): void {
    if (!this.gameStarted || this.gameWon || this.gameLost) return;

    this.cameraX += this.config.scrollSpeed * deltaTime;

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
    if (this.cameraX >= this.config.levelLength - 200) {
      // Reached tree
      this.gameWon = true;
      this.stopGame();
      setTimeout(() => this.completed.emit(), 500);
    }
  }

  crash(): void {
    this.gameLost = true;
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
}
