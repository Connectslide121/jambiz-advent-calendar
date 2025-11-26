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
import {
  LucideAngularModule,
  Check,
  ArrowLeft,
  ArrowRight,
  Keyboard,
  Smartphone,
} from 'lucide-angular';
import { GameService } from '../../../services/game.service';
import { KeyboardService } from '../../../services/keyboard.service';
import { SpriteService } from '../../../services/sprite.service';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { ChallengeInfoModalComponent } from '../../shared/challenge-info-modal/challenge-info-modal.component';

export interface GiftCatcherConfig {
  targetScore: number;
  spawnRate: number; // ms between spawns
  speed: number; // falling speed
}

interface FallingItem {
  x: number;
  y: number;
  type: 'gift' | 'coal';
  speed: number;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
}

interface ScorePopup {
  x: number;
  y: number;
  value: number;
  life: number; // 0 to 1
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
}

@Component({
  selector: 'app-gift-catcher-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule, ChallengeInfoModalComponent],
  templateUrl: './gift-catcher-challenge.html',
  styleUrl: './gift-catcher-challenge.scss',
})
export class GiftCatcherChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config!: GiftCatcherConfig;
  @Input() isCompleted = false;
  @Input() day: number = 10;
  @Output() completed = new EventEmitter<void>();
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Check = Check;
  readonly ArrowLeft = ArrowLeft;
  readonly ArrowRight = ArrowRight;
  readonly Keyboard = Keyboard;
  readonly Smartphone = Smartphone;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  gameLoopId?: number;

  // Sprites
  playerSprite: HTMLImageElement | null = null;
  giftSprite: HTMLImageElement | null = null;
  coalSprite: HTMLImageElement | null = null;

  private isMobile = false;
  private scale = 1;
  private lastSpawnTime = 0;

  score = 0;
  elapsedTime = 0;
  bestTime = 0;
  gameStarted = false;
  gameWon = false;
  gameLost = false;
  showInstructions = true;

  // Player state
  player = {
    x: 0,
    y: 0,
    width: 80,
    height: 60,
    speed: 400, // pixels per second
  };

  items: FallingItem[] = [];
  popups: ScorePopup[] = [];
  stars: Star[] = [];

  constructor(
    private gameService: GameService,
    private keyboardService: KeyboardService,
    private spriteService: SpriteService,
    private stateService: CalendarStateService
  ) {}

  ngOnInit(): void {
    if (this.isCompleted) {
      this.gameWon = true;
    }
    this.keyboardService.init();

    // Load best time
    const stats = this.stateService.getGameStats(this.day);
    if (stats && stats.bestTime) {
      this.bestTime = stats.bestTime;
    }

    // Default config
    if (!this.config) {
      this.config = {
        targetScore: 15,
        spawnRate: 1000,
        speed: 3,
      };
    }
  }

  ngAfterViewInit(): void {
    if (this.canvasRef) {
      setTimeout(() => {
        this.initCanvas(this.canvasRef.nativeElement);
        this.loadSprites();
      }, 50);
    }
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

    // 4:3 aspect ratio
    const aspectRatio = 0.75;
    canvas.width = containerWidth;
    canvas.height = containerWidth * aspectRatio;

    this.gameService.scaleCanvasForRetina(canvas);
    this.resetPlayer();
    this.generateStars();
  }

  generateStars(): void {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.canvas.width / (this.scale * dpr);
    const logicalHeight = this.canvas.height / (this.scale * dpr);

    this.stars = [];
    const count = 50;

    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * logicalWidth,
        y: Math.random() * logicalHeight,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.005 + 0.002,
      });
    }
  }

  loadSprites(): void {
    Promise.all([
      this.spriteService.loadSprite('sleigh', '/assets/sprites/sleigh.png'),
      this.spriteService.loadSprite('gift', '/assets/sprites/gift.png'),
      this.spriteService.loadSprite('coal', '/assets/sprites/coal.png').catch(() => null),
    ]).then(([sleigh, gift, coal]) => {
      this.playerSprite = sleigh;
      this.giftSprite = gift;
      this.coalSprite = coal;
      this.render();
    });
  }

  resetPlayer(): void {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.canvas.width / (this.scale * dpr);
    const logicalHeight = this.canvas.height / (this.scale * dpr);

    this.player.x = logicalWidth / 2 - this.player.width / 2;
    this.player.y = logicalHeight - this.player.height - 20;
  }

  startGame(): void {
    if (!this.ctx) return;

    this.showInstructions = false;
    this.gameStarted = true;
    this.gameWon = false;
    this.gameLost = false;
    this.score = 0;
    this.elapsedTime = 0;
    this.items = [];
    this.popups = [];
    this.lastSpawnTime = 0;
    this.resetPlayer();

    this.gameLoopId = this.gameService.startGameLoop((deltaTime) => {
      this.update(deltaTime);
      this.render();
    });
  }

  stopGame(): void {
    if (this.gameLoopId !== undefined) {
      this.gameService.stopGameLoop(this.gameLoopId);
    }
  }

  update(deltaTime: number): void {
    if (!this.gameStarted || this.gameWon || this.gameLost) return;

    this.elapsedTime += deltaTime;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.canvas.width / (this.scale * dpr);
    const logicalHeight = this.canvas.height / (this.scale * dpr);

    // Player Movement
    if (this.keyboardService.isLeftPressed()) {
      this.player.x -= this.player.speed * deltaTime;
    }
    if (this.keyboardService.isRightPressed()) {
      this.player.x += this.player.speed * deltaTime;
    }

    // Touch controls (simple tap zones)
    // Note: For better touch, we might want to add touch event listeners to canvas
    // But for now let's rely on keyboard service or add simple touch logic here if needed
    // Actually, let's add touch handling in the template or component

    // Clamp player to screen
    this.player.x = Math.max(0, Math.min(logicalWidth - this.player.width, this.player.x));

    // Spawn Items
    this.lastSpawnTime += deltaTime * 1000;
    if (this.lastSpawnTime > this.config.spawnRate) {
      this.spawnItem(logicalWidth);
      this.lastSpawnTime = 0;
      // Increase difficulty slightly
      if (this.config.spawnRate > 400) {
        this.config.spawnRate -= 10;
      }
    }

    // Update Items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.speed * deltaTime * 60; // Speed factor
      item.rotation += item.rotationSpeed * deltaTime;

      // Collision with Player
      if (this.checkCollision(this.player, item)) {
        if (item.type === 'gift') {
          this.score++;
          this.addPopup(this.player.x + this.player.width / 2, this.player.y, 1);
          if (this.score >= this.config.targetScore) {
            this.gameWon = true;

            // Save best time (lower is better)
            if (this.bestTime === 0 || this.elapsedTime < this.bestTime) {
              this.bestTime = this.elapsedTime;
              this.stateService.saveGameStats(this.day, { bestTime: this.bestTime });
            }

            this.stopGame();
            setTimeout(() => this.completed.emit(), 500);
          }
        } else {
          // Hit coal
          this.score = Math.max(0, this.score - 5);
          this.addPopup(this.player.x + this.player.width / 2, this.player.y, -5);
          // Visual feedback for hit?
        }
        this.items.splice(i, 1);
        continue;
      }

      // Remove if off screen
      if (item.y > logicalHeight) {
        this.items.splice(i, 1);
      }
    }

    // Update Popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const popup = this.popups[i];
      popup.y -= 50 * deltaTime; // Float up
      popup.life -= deltaTime;
      if (popup.life <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }

  addPopup(x: number, y: number, value: number): void {
    this.popups.push({
      x,
      y,
      value,
      life: 1.0,
    });
  }

  spawnItem(width: number): void {
    const isCoal = Math.random() < 0.2; // 20% chance of coal
    const size = 40;

    this.items.push({
      x: Math.random() * (width - size),
      y: -size,
      type: isCoal ? 'coal' : 'gift',
      speed: this.config.speed + Math.random() * 2,
      width: size,
      height: size,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 5,
    });
  }

  checkCollision(player: any, item: any): boolean {
    return (
      player.x < item.x + item.width &&
      player.x + player.width > item.x &&
      player.y < item.y + item.height &&
      player.y + player.height > item.y
    );
  }

  // Touch handling
  handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touchX = event.touches[0].clientX;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const relativeX = touchX - rect.left;
    const logicalX = relativeX / (rect.width / (this.canvas.width / (this.scale * dpr)));

    // Move towards touch
    if (logicalX < this.player.x + this.player.width / 2) {
      this.keyboardService.simulateKeyDown('ArrowLeft');
    } else {
      this.keyboardService.simulateKeyDown('ArrowRight');
    }
  }

  handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.keyboardService.simulateKeyUp('ArrowLeft');
    this.keyboardService.simulateKeyUp('ArrowRight');
  }

  startMove(direction: 'left' | 'right'): void {
    const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight';
    this.keyboardService.simulateKeyDown(key);
  }

  stopMove(direction: 'left' | 'right'): void {
    const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight';
    this.keyboardService.simulateKeyUp(key);
  }

  render(): void {
    if (!this.ctx || !this.canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = this.canvas.width / (this.scale * dpr);
    const logicalHeight = this.canvas.height / (this.scale * dpr);

    // Clear
    this.ctx.fillStyle = '#06121f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.scale(this.scale, this.scale);

    // Background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, logicalHeight);
    gradient.addColorStop(0, '#1a2332');
    gradient.addColorStop(1, '#06121f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Draw Stars
    this.ctx.save();
    for (const star of this.stars) {
      this.ctx.globalAlpha = Math.abs(Math.sin(Date.now() * star.twinkleSpeed)) * star.opacity;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();

    // Draw Items
    for (const item of this.items) {
      this.ctx.save();
      this.ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
      this.ctx.rotate(item.rotation);

      if (item.type === 'gift') {
        if (this.giftSprite) {
          this.ctx.drawImage(
            this.giftSprite,
            -item.width / 2,
            -item.height / 2,
            item.width,
            item.height
          );
        } else {
          this.ctx.fillStyle = '#e63946'; // Red gift
          this.ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height);
          this.ctx.fillStyle = '#f4d35e'; // Gold ribbon
          this.ctx.fillRect(-5, -item.height / 2, 10, item.height);
          this.ctx.fillRect(-item.width / 2, -5, item.width, 10);
        }
      } else {
        // Coal
        if (this.coalSprite) {
          this.ctx.drawImage(
            this.coalSprite,
            -item.width / 2,
            -item.height / 2,
            item.width,
            item.height
          );
        } else {
          // Fallback: Coal emoji or circle
          this.ctx.font = `${item.width}px serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('🪨', 0, 0);
        }
      }
      this.ctx.restore();
    }

    // Draw Player
    if (this.playerSprite) {
      this.ctx.drawImage(
        this.playerSprite,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height
      );
    } else {
      this.ctx.fillStyle = '#2a9d8f';
      this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    }

    // Draw Popups
    for (const popup of this.popups) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, popup.life);
      const fontSize = this.isMobile ? 40 : 30;
      this.ctx.font = `bold ${fontSize}px monospace`;
      this.ctx.textAlign = 'center';

      if (popup.value > 0) {
        this.ctx.fillStyle = '#2a9d8f'; // Green
        this.ctx.fillText(`+${popup.value}`, popup.x, popup.y);
      } else {
        this.ctx.fillStyle = '#e63946'; // Red
        this.ctx.fillText(`${popup.value}`, popup.x, popup.y);
      }

      this.ctx.restore();
    }

    this.ctx.restore();
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

  showReward(): void {
    this.completed.emit();
  }
}
