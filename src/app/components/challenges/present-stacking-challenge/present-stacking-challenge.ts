import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, RotateCcw, Trophy } from 'lucide-angular';
import { PresentSvgComponent } from './present-svg';
import { ChallengeInfoModalComponent } from '../../shared/challenge-info-modal/challenge-info-modal.component';
import Matter from 'matter-js';

interface Present {
  body: Matter.Body;
  width: number;
  height: number;
  color: string;
}

@Component({
  selector: 'app-present-stacking-challenge',
  imports: [
    CommonModule,
    TranslateModule,
    LucideAngularModule,
    PresentSvgComponent,
    ChallengeInfoModalComponent,
  ],
  templateUrl: './present-stacking-challenge.html',
  styleUrl: './present-stacking-challenge.scss',
})
export class PresentStackingChallenge implements OnInit, OnDestroy {
  readonly RotateCcw = RotateCcw;
  readonly Trophy = Trophy;

  @Input() config: any;
  @Input() isCompleted = false;
  @Input() autoEmitOnWin = false; // For Extras: persist completion immediately on win
  @Output() completed = new EventEmitter<void>();

  // Physics engine
  private engine!: Matter.Engine;
  private render!: Matter.Render;
  private runner!: Matter.Runner;
  private world!: Matter.World;

  // Game state
  presents: Present[] = [];
  private availablePresents: Array<{ width: number; height: number; color: string }> = [];
  currentPresent: { width: number; height: number; color: string } | null = null;
  nextPresent: { width: number; height: number; color: string } | null = null;

  presentsUsed = 0;
  maxPresents = 12;
  targetHeight = 350; // pixels from bottom
  gameWon = false;
  gameLost = false;
  showInstructions = true;

  private canvasWidth = 600;
  private canvasHeight = 700;
  private groundHeight = 50;
  readonly dropZoneY = 50; // Drop near top of canvas
  private isMobile = false;

  private presentColors = [
    '#e63946', // Christmas red
    '#2a9d8f', // Christmas green
    '#f4d35e', // Gold
    '#06d6a0', // Mint green
    '#118ab2', // Blue
    '#d62828', // Dark red
    '#457b9d', // Steel blue
    '#f77f00', // Orange
    '#9d4edd', // Purple
    '#e76f51', // Coral
    '#2ec4b6', // Turquoise
    '#ffb703', // Amber
  ];

  // Moving present state
  currentPresentX = 0;
  private movingPresentDirection = 1; // 1 for right, -1 for left
  private movingPresentSpeed = 3;
  private baseSpeed = 3;
  private speedIncrement = 0.15;
  private animationFrameId?: number;

  private towerHeight = 0;
  private settledFrames = 0;
  private completionEmitted = false;

  ngOnInit(): void {
    // If already completed, show the win state directly
    if (this.isCompleted) {
      this.gameWon = true;
      this.showInstructions = false;
    }

    // Detect mobile and adjust canvas size
    this.isMobile = window.innerWidth < 640;
    if (this.isMobile) {
      this.canvasWidth = Math.min(380, window.innerWidth - 32);
      this.canvasHeight = Math.min(500, window.innerHeight - 280);
      // Scale down target height proportionally
      this.targetHeight = Math.round(this.targetHeight * 0.5);
    }

    if (this.config) {
      if (typeof this.config.targetHeight === 'number') {
        this.targetHeight = this.config.targetHeight;
        // Apply mobile scaling if needed
        if (this.isMobile) {
          this.targetHeight = Math.round(this.targetHeight * 0.5);
        }
      }
      if (typeof this.config.maxPresents === 'number') {
        this.maxPresents = this.config.maxPresents;
      }
    }

    this.initializePresentTypes();
    this.setupPhysics();
    this.selectNextPresent();
    this.selectNextPresent(); // Fill current and next
    this.startMovingPresent();
  }

  ngOnDestroy(): void {
    this.cleanup();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private startMovingPresent(): void {
    const animate = () => {
      if (!this.gameWon && !this.gameLost && !this.showInstructions && this.currentPresent) {
        // Move the present
        this.currentPresentX += this.movingPresentSpeed * this.movingPresentDirection;

        // Calculate boundaries considering present width
        const presentWidth = this.currentPresent?.width || 0;
        const minX = 20 + presentWidth / 2; // Left wall + half present width
        const maxX = this.canvasWidth - 20 - presentWidth / 2; // Right wall - half present width

        // Bounce at edges
        if (this.currentPresentX >= maxX) {
          this.currentPresentX = maxX;
          this.movingPresentDirection = -1;
        } else if (this.currentPresentX <= minX) {
          this.currentPresentX = minX;
          this.movingPresentDirection = 1;
        }
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    // Initialize starting position
    this.resetMovingPresentPosition();
    animate();
  }

  private resetMovingPresentPosition(): void {
    // Random starting position between 25% and 75% of canvas width
    const minX = this.canvasWidth * 0.25;
    const maxX = this.canvasWidth * 0.75;
    this.currentPresentX = minX + Math.random() * (maxX - minX);

    // Random direction
    this.movingPresentDirection = Math.random() < 0.5 ? -1 : 1;

    // Increase speed with each present dropped
    this.movingPresentSpeed = this.baseSpeed + this.presentsUsed * this.speedIncrement;
  }

  private evaluateTowerState = (): void => {
    if (this.showInstructions || this.gameWon || this.gameLost) {
      return;
    }

    if (this.presents.length === 0) {
      this.towerHeight = 0;
      return;
    }

    const settlingThreshold = 0.15;
    const allSettled = this.presents.every(
      (p) =>
        p.body.isSleeping ||
        (p.body.speed < settlingThreshold && Math.abs(p.body.angularVelocity) < settlingThreshold)
    );

    if (!allSettled) {
      this.settledFrames = 0;
      return;
    }

    this.settledFrames += 1;
    const requiredSettledFrames = 8;
    if (this.settledFrames < requiredSettledFrames) {
      return;
    }

    let highestPoint = this.canvasHeight;
    for (const p of this.presents) {
      const topY = p.body.position.y - p.height / 2;
      if (topY < highestPoint) {
        highestPoint = topY;
      }
    }

    const groundY = this.canvasHeight - this.groundHeight;
    const newHeight = Math.max(0, groundY - highestPoint);
    this.towerHeight = newHeight;
    this.settledFrames = requiredSettledFrames;

    // Win condition: reached target height with at least 1 present
    if (
      !this.gameWon &&
      !this.gameLost &&
      this.presentsUsed >= 1 &&
      newHeight >= this.targetHeight
    ) {
      this.gameWon = true;
      // Emit immediately in Extras mode if configured; otherwise wait for Continue
      if (this.autoEmitOnWin) {
        this.emitCompletionOnce();
      }
      return;
    }

    // Loss condition: used all presents but didn't reach target height
    if (
      !this.gameWon &&
      !this.gameLost &&
      this.presentsUsed >= this.maxPresents &&
      !this.currentPresent &&
      newHeight < this.targetHeight
    ) {
      this.gameLost = true;
    }
  };

  private initializePresentTypes(): void {
    // Define available present sizes (width x height)
    const baseSizes = [
      { width: 80, height: 60 },
      { width: 70, height: 70 },
      { width: 90, height: 50 },
      { width: 60, height: 80 },
      { width: 100, height: 40 },
    ];

    // Scale down presents for mobile
    // Increased from 0.5 to 0.65 to make it easier on mobile (presents were too small)
    const scale = this.isMobile ? 0.65 : 1;
    const sizes = baseSizes.map((size) => ({
      width: Math.round(size.width * scale),
      height: Math.round(size.height * scale),
    }));

    // Create a pool of presents with random colors
    this.availablePresents = Array(this.maxPresents)
      .fill(0)
      .map(() => ({
        ...sizes[Math.floor(Math.random() * sizes.length)],
        color: this.presentColors[Math.floor(Math.random() * this.presentColors.length)],
      }));
  }

  private setupPhysics(): void {
    // Create engine
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.2 },
    });
    this.engine.enableSleeping = true;
    this.world = this.engine.world;

    // Create renderer
    const canvas = document.getElementById('present-stacking-canvas') as HTMLCanvasElement;
    this.render = Matter.Render.create({
      canvas: canvas,
      engine: this.engine,
      options: {
        width: this.canvasWidth,
        height: this.canvasHeight,
        wireframes: false,
        background: '#06121f',
      },
    });

    // Create ground
    const ground = Matter.Bodies.rectangle(
      this.canvasWidth / 2,
      this.canvasHeight - this.groundHeight / 2,
      this.canvasWidth,
      this.groundHeight,
      {
        isStatic: true,
        render: {
          fillStyle: '#102437',
        },
      }
    );

    // Create walls
    const leftWall = Matter.Bodies.rectangle(0, this.canvasHeight / 2, 20, this.canvasHeight, {
      isStatic: true,
      render: {
        fillStyle: '#102437',
      },
    });

    const rightWall = Matter.Bodies.rectangle(
      this.canvasWidth,
      this.canvasHeight / 2,
      20,
      this.canvasHeight,
      {
        isStatic: true,
        render: {
          fillStyle: '#102437',
        },
      }
    );

    // Add target line visualization
    const targetLine = Matter.Bodies.rectangle(
      this.canvasWidth / 2,
      this.canvasHeight - this.groundHeight - this.targetHeight,
      this.canvasWidth - 40,
      2,
      {
        isStatic: true,
        isSensor: true,
        render: {
          fillStyle: '#f4d35e',
          opacity: 0.5,
        },
      }
    );

    Matter.World.add(this.world, [ground, leftWall, rightWall, targetLine]);

    // Run renderer and engine
    Matter.Render.run(this.render);
    this.runner = Matter.Runner.create();
    Matter.Runner.run(this.runner, this.engine);

    Matter.Events.on(this.engine, 'afterUpdate', this.evaluateTowerState);

    // Add custom rendering for presents with ribbons
    Matter.Events.on(this.render, 'afterRender', () => {
      this.drawPresentDecorations();
    });

    this.towerHeight = 0;
  }

  private drawPresentDecorations(): void {
    const context = this.render.context;

    this.presents.forEach((present) => {
      const body = present.body;
      const pos = body.position;
      const angle = body.angle;

      context.save();
      context.translate(pos.x, pos.y);
      context.rotate(angle);

      const ribbonWidth = 8;

      // Draw vertical ribbon with gradient and borders
      const verticalGradient = context.createLinearGradient(
        -ribbonWidth / 2,
        0,
        ribbonWidth / 2,
        0
      );
      verticalGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      verticalGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      verticalGradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
      context.fillStyle = verticalGradient;
      context.fillRect(-ribbonWidth / 2, -present.height / 2, ribbonWidth, present.height);

      // Ribbon borders
      context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(-ribbonWidth / 2, -present.height / 2);
      context.lineTo(-ribbonWidth / 2, present.height / 2);
      context.moveTo(ribbonWidth / 2, -present.height / 2);
      context.lineTo(ribbonWidth / 2, present.height / 2);
      context.stroke();

      // Draw horizontal ribbon with gradient and borders
      const horizontalGradient = context.createLinearGradient(
        0,
        -ribbonWidth / 2,
        0,
        ribbonWidth / 2
      );
      horizontalGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      horizontalGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      horizontalGradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
      context.fillStyle = horizontalGradient;
      context.fillRect(-present.width / 2, -ribbonWidth / 2, present.width, ribbonWidth);

      // Ribbon borders
      context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      context.beginPath();
      context.moveTo(-present.width / 2, -ribbonWidth / 2);
      context.lineTo(present.width / 2, -ribbonWidth / 2);
      context.moveTo(-present.width / 2, ribbonWidth / 2);
      context.lineTo(present.width / 2, ribbonWidth / 2);
      context.stroke();

      // Draw bow on top (matching CSS teardrop/petal style)
      const bowY = -present.height / 2 - 8;
      const loopWidth = 16;
      const loopHeight = 20;
      const knotSize = 10;

      // Add shadow for depth
      context.shadowColor = 'rgba(0, 0, 0, 0.3)';
      context.shadowBlur = 4;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 2;

      // Left bow loop (teardrop/petal shape - border-radius: 50% 50% 50% 0)
      context.save();
      context.translate(-loopWidth * 0.4, bowY);
      context.rotate(-Math.PI / 4);

      // Draw teardrop shape using quadratic curves
      context.fillStyle = 'rgba(255, 255, 255, 0.95)';
      context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      context.lineWidth = 1;
      context.beginPath();

      // Teardrop shape
      const hw = loopWidth / 2;
      const hh = loopHeight / 2;
      context.moveTo(0, -hh);
      context.bezierCurveTo(hw, -hh, hw, hh, 0, hh);
      context.bezierCurveTo(-hw, hh, -hw, -hh, 0, -hh);

      context.fill();
      context.stroke();
      context.restore();

      // Right bow loop (mirrored teardrop)
      context.save();
      context.translate(loopWidth * 0.4, bowY);
      context.rotate(Math.PI / 4 + Math.PI); // Flip for mirror effect

      context.fillStyle = 'rgba(255, 255, 255, 0.95)';
      context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      context.lineWidth = 1;
      context.beginPath();

      // Teardrop shape
      context.moveTo(0, -hh);
      context.bezierCurveTo(hw, -hh, hw, hh, 0, hh);
      context.bezierCurveTo(-hw, hh, -hw, -hh, 0, -hh);

      context.fill();
      context.stroke();
      context.restore();

      // Bow center knot (circle with shadow)
      context.fillStyle = 'rgba(255, 255, 255, 1)';
      context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      context.lineWidth = 1;
      context.beginPath();
      context.arc(0, bowY, knotSize / 2, 0, Math.PI * 2);
      context.fill();
      context.stroke();

      // Reset shadow
      context.shadowColor = 'transparent';
      context.shadowBlur = 0;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;

      context.restore();
    });
  }

  private selectNextPresent(): void {
    if (this.currentPresent === null && this.nextPresent) {
      this.currentPresent = this.nextPresent;
      this.resetMovingPresentPosition();
    }

    if (this.presentsUsed + (this.currentPresent ? 1 : 0) < this.maxPresents) {
      const index = this.presentsUsed + (this.currentPresent ? 1 : 0);
      this.nextPresent =
        index < this.availablePresents.length ? this.availablePresents[index] : null;
    } else {
      this.nextPresent = null;
    }
  }

  dropPresent(): void {
    if (this.gameWon || this.gameLost || !this.currentPresent || this.showInstructions) {
      return;
    }

    // Use the current X position of the moving present
    const x = this.currentPresentX;

    // Create present body
    const presentBody = Matter.Bodies.rectangle(
      x,
      this.dropZoneY,
      this.currentPresent.width,
      this.currentPresent.height,
      {
        restitution: 0.3,
        friction: 0.8,
        density: 0.001,
        render: {
          fillStyle: this.currentPresent.color,
          strokeStyle: '#ffffff',
          lineWidth: 2,
        },
      }
    );

    const present: Present = {
      body: presentBody,
      width: this.currentPresent.width,
      height: this.currentPresent.height,
      color: this.currentPresent.color,
    };

    this.presents.push(present);
    Matter.World.add(this.world, presentBody);

    this.presentsUsed++;
    this.settledFrames = 0;
    this.currentPresent = this.nextPresent;
    if (this.currentPresent) {
      this.resetMovingPresentPosition();
    }
    this.selectNextPresent();
  }

  resetGame(): void {
    this.cleanup();
    this.presents = [];
    this.presentsUsed = 0;
    this.gameWon = false;
    this.gameLost = false;
    this.currentPresent = null;
    this.nextPresent = null;
    this.towerHeight = 0;
    this.settledFrames = 0;
    this.movingPresentSpeed = this.baseSpeed;
    this.resetMovingPresentPosition();
    this.initializePresentTypes();
    this.setupPhysics();
    this.selectNextPresent();
    this.selectNextPresent();
  }

  startGame(): void {
    this.showInstructions = false;
    this.resetMovingPresentPosition();
    this.settledFrames = 0;
  }

  emitCompletionOnce(): void {
    if (this.completionEmitted) return;
    this.completionEmitted = true;
    this.completed.emit();
  }

  showReward(): void {
    this.emitCompletionOnce();
  }

  private cleanup(): void {
    if (this.render) {
      Matter.Render.stop(this.render);
      // Don't remove the canvas, we need to reuse it
      this.render.textures = {};
    }
    if (this.runner) {
      Matter.Runner.stop(this.runner);
    }
    if (this.world) {
      Matter.World.clear(this.world, false);
    }
    if (this.engine) {
      Matter.Events.off(this.engine, 'afterUpdate', this.evaluateTowerState);
      Matter.Engine.clear(this.engine);
    }
  }

  get heightProgress(): number {
    if (this.towerHeight <= 0) {
      return 0;
    }

    const progress = (this.towerHeight / this.targetHeight) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  getPresentStyle(
    present: { width: number; height: number; color: string } | null,
    scale: number = 1
  ): any {
    if (!present) return {};
    return {
      width: `${present.width * scale}px`,
      height: `${present.height * scale}px`,
      backgroundColor: present.color,
      position: 'relative' as const,
    };
  }
}
