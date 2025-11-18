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
import { GameService } from '../../../services/game.service';
import { KeyboardService } from '../../../services/keyboard.service';
import { SpriteService } from '../../../services/sprite.service';

export interface GeometryDashConfig {
  levelLength: number; // Distance to finish
  scrollSpeed: number; // Pixels per second
  jumpForce: number; // Jump velocity
  gravity: number; // Gravity strength
  obstacles: Array<{
    x: number;
    width: number;
    height: number;
    type: 'candy' | 'pit' | 'platform';
  }>;
}

@Component({
  selector: 'app-geometry-dash-challenge',
  imports: [CommonModule, TranslateModule],
  templateUrl: './geometry-dash-challenge.html',
  styleUrl: './geometry-dash-challenge.scss',
})
export class GeometryDashChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config!: GeometryDashConfig;
  @Input() isCompleted = false;
  @Input() day?: number;
  @Output() completed = new EventEmitter<void>();
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  gameLoopId?: number;
  playerSprite: HTMLImageElement | null = null;
  private jumpKeyPressed = false;

  // Player state
  player = {
    x: 100, // Fixed x position
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
  groundY = 450;

  constructor(
    private gameService: GameService,
    private keyboardService: KeyboardService,
    private spriteService: SpriteService
  ) {}

  ngOnInit(): void {
    // If already completed, show win state
    if (this.isCompleted) {
      this.gameWon = true;
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

  initCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) return;
    this.ctx = context;

    // Set canvas size - fit to container with good aspect ratio
    const containerWidth = canvas.parentElement!.clientWidth;
    const targetWidth = containerWidth;
    const targetHeight = containerWidth * 0.5625; // 16:9 aspect ratio

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Adjust ground based on canvas height
    this.groundY = canvas.height - 50;
    this.player.y = this.groundY - this.player.height;

    this.gameService.scaleCanvasForRetina(canvas);
  }

  startGame(): void {
    if (!this.ctx) return;

    this.gameStarted = true;
    this.gameWon = false;
    this.gameLost = false;
    this.cameraX = 0;
    this.player.y = this.groundY - this.player.height;
    this.player.velocityY = 0;
    this.player.isOnGround = true;
    this.jumpKeyPressed = false;

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

  update(deltaTime: number): void {
    if (!this.gameStarted || this.gameWon || this.gameLost) return;

    // Auto-scroll camera
    this.cameraX += this.config.scrollSpeed * deltaTime;

    // Handle jump input (keyboard or mobile tap)
    const jumpKeyDown = this.keyboardService.isSpacePressed() || this.keyboardService.isUpPressed();

    if (jumpKeyDown && !this.jumpKeyPressed && this.player.isOnGround) {
      this.jump();
    }
    this.jumpKeyPressed = jumpKeyDown;

    // Apply gravity
    this.player.velocityY = this.gameService.applyGravity(
      this.player.velocityY,
      this.config.gravity,
      deltaTime
    );

    // Update player position
    this.player.y += this.player.velocityY * deltaTime;

    // Check if player is over a pit (before ground collision)
    let isOverPit = false;
    for (const obstacle of this.config.obstacles) {
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
    for (const obstacle of this.config.obstacles) {
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

    // Check win condition
    if (this.cameraX >= this.config.levelLength) {
      this.gameWon = true;
      this.stopGame();
      setTimeout(() => {
        this.completed.emit();
      }, 500);
    }
  }

  render(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.fillStyle = '#06121f'; // Dark background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw sky gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1a2332');
    gradient.addColorStop(1, '#06121f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw ground
    this.ctx.fillStyle = '#2a9d8f'; // Christmas green
    this.ctx.fillRect(0, this.groundY, this.canvas.width, this.canvas.height - this.groundY);

    // Draw ground decoration
    this.ctx.fillStyle = '#ffffff';
    for (let x = 0; x < this.canvas.width; x += 40) {
      const offsetX = this.cameraX % 40;
      this.ctx.fillRect(x - offsetX, this.groundY, 30, 5);
    }

    // Draw obstacles
    for (const obstacle of this.config.obstacles) {
      const screenX = obstacle.x - this.cameraX;

      // Only draw if on screen
      if (screenX + obstacle.width > 0 && screenX < this.canvas.width) {
        if (obstacle.type === 'pit') {
          // Draw pit (dark void)
          this.ctx.fillStyle = '#000000';
          this.ctx.fillRect(
            screenX,
            this.groundY,
            obstacle.width,
            this.canvas.height - this.groundY
          );

          // Draw danger stripes at edges
          this.ctx.fillStyle = '#f4d35e';
          this.ctx.fillRect(screenX, this.groundY, 5, this.canvas.height - this.groundY);
          this.ctx.fillRect(
            screenX + obstacle.width - 5,
            this.groundY,
            5,
            this.canvas.height - this.groundY
          );
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

    // Draw finish line
    const finishX = this.config.levelLength - this.cameraX;
    if (finishX > 0 && finishX < this.canvas.width) {
      this.ctx.strokeStyle = '#f4d35e'; // Gold
      this.ctx.lineWidth = 4;
      this.ctx.setLineDash([10, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(finishX, 0);
      this.ctx.lineTo(finishX, this.canvas.height);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw star at finish
      this.drawStar(finishX, this.groundY - 80, 20, '#f4d35e');
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

    // Draw progress bar
    const progress = Math.min(this.cameraX / this.config.levelLength, 1);
    const barWidth = this.canvas.width - 40;
    const barHeight = 10;
    const barX = 20;
    const barY = 20;

    this.ctx.fillStyle = '#102437';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    this.ctx.fillStyle = '#f4d35e';
    this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
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
    if (this.player.isOnGround) {
      this.player.velocityY = -this.config.jumpForce;
      this.player.isOnGround = false;
      this.jumpKeyPressed = true; // Immediately mark as pressed to prevent double jumps
    }
  }

  handleCanvasTap(): void {
    if (!this.gameStarted) {
      this.startGame();
    } else if (!this.gameWon && !this.gameLost && this.player.isOnGround) {
      // Jump immediately on tap without waiting for next frame
      this.player.velocityY = -this.config.jumpForce;
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
}
