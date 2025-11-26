import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  OnDestroy,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideAngularModule,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Trophy,
} from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';

type CellType = 'wall' | 'path' | 'start' | 'goal';

interface Point {
  x: number;
  y: number;
}

export interface MazeConfig {
  rows?: number;
  cols?: number;
  collectibleCount?: number;
}

@Component({
  selector: 'app-maze-runner-challenge',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './maze-runner-challenge.html',
  styleUrls: ['./maze-runner-challenge.scss'],
})
export class MazeRunnerChallengeComponent implements OnInit, OnDestroy {
  @Input() config: MazeConfig = {};
  @Output() completed = new EventEmitter<void>();

  // Icons
  readonly ArrowUp = ArrowUp;
  readonly ArrowDown = ArrowDown;
  readonly ArrowLeft = ArrowLeft;
  readonly ArrowRight = ArrowRight;
  readonly Check = Check;
  readonly RotateCcw = RotateCcw;
  readonly Trophy = Trophy;

  // Game State
  grid: CellType[][] = [];
  playerPos: Point = { x: 1, y: 1 };
  goalPos: Point = { x: 0, y: 0 };
  collectibles: Point[] = [];
  collectedCount = 0;
  isWon = false;
  moveCount = 0;

  // Configuration
  rows = 15; // Must be odd for recursive backtracking
  cols = 15; // Must be odd for recursive backtracking
  collectibleCount = 0;

  // Inputs
  @Input() isCompleted = false;
  @Input() day = 0;

  showWinOverlay = false;

  // Movement Control
  private activeKeys = new Set<string>();
  private moveInterval: any;
  readonly moveSpeed = 80; // ms between moves (lower is faster)

  constructor(private calendarState: CalendarStateService) {}

  ngOnInit() {
    // Apply config
    if (this.config.rows) this.rows = this.config.rows;
    if (this.config.cols) this.cols = this.config.cols;
    if (this.config.collectibleCount) this.collectibleCount = this.config.collectibleCount;

    // Ensure odd dimensions
    if (this.rows % 2 === 0) this.rows++;
    if (this.cols % 2 === 0) this.cols++;

    if (this.isCompleted) {
      const stats = this.calendarState.getGameStats(this.day);
      if (stats && stats.moves) {
        this.moveCount = stats.moves;
      }
      // Generate a maze to show in background
      this.generateMaze();
      this.collectedCount = this.collectibleCount; // Show all gifts as collected
      this.isWon = true; // Disable controls
      this.showWinOverlay = false; // Don't show overlay immediately
    } else {
      this.startNewGame();
    }
  }

  startNewGame() {
    this.generateMaze();
    this.playerPos = { x: 1, y: 1 };
    this.moveCount = 0;
    this.collectedCount = 0;
    this.isWon = false;
    this.showWinOverlay = false;
    this.activeKeys.clear();
    this.stopMoveLoop();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (this.isWon) return;

    const key = event.key.toLowerCase();
    if (['arrowup', 'w', 'arrowdown', 's', 'arrowleft', 'a', 'arrowright', 'd'].includes(key)) {
      event.preventDefault(); // Prevent scrolling

      if (!this.activeKeys.has(key)) {
        this.activeKeys.add(key);
        this.processMove(); // Move immediately on first press
        this.startMoveLoop();
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    this.activeKeys.delete(key);
    if (this.activeKeys.size === 0) {
      this.stopMoveLoop();
    }
  }

  startMoveLoop() {
    if (!this.moveInterval) {
      this.moveInterval = setInterval(() => {
        this.processMove();
      }, this.moveSpeed);
    }
  }

  stopMoveLoop() {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }

  processMove() {
    if (this.isWon) return;

    let dx = 0;
    let dy = 0;

    // Prioritize vertical then horizontal, or just check all
    // Since we want single cell movement, we should probably pick one direction if multiple are held.
    // But for now, let's just check in order.
    if (this.activeKeys.has('arrowup') || this.activeKeys.has('w')) dy = -1;
    else if (this.activeKeys.has('arrowdown') || this.activeKeys.has('s')) dy = 1;
    else if (this.activeKeys.has('arrowleft') || this.activeKeys.has('a')) dx = -1;
    else if (this.activeKeys.has('arrowright') || this.activeKeys.has('d')) dx = 1;

    if (dx !== 0 || dy !== 0) {
      this.attemptMove(dx, dy);
    }
  }

  attemptMove(dx: number, dy: number) {
    const newPos = { x: this.playerPos.x + dx, y: this.playerPos.y + dy };

    if (this.isValidMove(newPos)) {
      this.playerPos = newPos;
      this.moveCount++;
      this.checkCollectibles();
      this.checkWin();
    }
  }

  ngOnDestroy() {
    this.stopMoveLoop();
  }

  move(direction: 'up' | 'down' | 'left' | 'right') {
    if (this.isWon) return;

    let dx = 0;
    let dy = 0;
    switch (direction) {
      case 'up':
        dy = -1;
        break;
      case 'down':
        dy = 1;
        break;
      case 'left':
        dx = -1;
        break;
      case 'right':
        dx = 1;
        break;
    }
    this.attemptMove(dx, dy);
  }

  isValidMove(pos: Point): boolean {
    // Check bounds
    if (pos.x < 0 || pos.x >= this.cols || pos.y < 0 || pos.y >= this.rows) {
      return false;
    }
    // Check walls
    return this.grid[pos.y][pos.x] !== 'wall';
  }

  checkCollectibles() {
    const index = this.collectibles.findIndex(
      (c) => c.x === this.playerPos.x && c.y === this.playerPos.y
    );
    if (index !== -1) {
      this.collectibles.splice(index, 1);
      this.collectedCount++;
      // Play sound?
    }
  }

  checkWin() {
    if (this.playerPos.x === this.goalPos.x && this.playerPos.y === this.goalPos.y) {
      if (this.collectibles.length === 0) {
        this.isWon = true;
        this.showWinOverlay = true;
        this.calendarState.saveGameStats(this.day, { moves: this.moveCount });
      }
    }
  }

  reset() {
    this.startNewGame();
  }

  // Maze Generation using Recursive Backtracking
  generateMaze() {
    // Initialize grid with walls
    this.grid = Array(this.rows)
      .fill(null)
      .map(() => Array(this.cols).fill('wall'));

    const stack: Point[] = [];
    const start: Point = { x: 1, y: 1 };

    this.grid[start.y][start.x] = 'path';
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length > 0) {
        // Choose random neighbor
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];

        // Remove wall between current and next
        const wallY = current.y + (next.y - current.y) / 2;
        const wallX = current.x + (next.x - current.x) / 2;
        this.grid[wallY][wallX] = 'path';

        // Mark next as visited (path)
        this.grid[next.y][next.x] = 'path';
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // Set Start and Goal
    this.grid[1][1] = 'start';

    // Find a goal far away (bottom right area)
    let goalPlaced = false;
    for (let y = this.rows - 2; y > 0 && !goalPlaced; y--) {
      for (let x = this.cols - 2; x > 0 && !goalPlaced; x--) {
        if (this.grid[y][x] === 'path') {
          this.grid[y][x] = 'goal';
          this.goalPos = { x, y };
          goalPlaced = true;
        }
      }
    }

    // Place Collectibles
    this.collectibles = [];
    let placed = 0;
    let attempts = 0;
    while (placed < this.collectibleCount && attempts < 1000) {
      const rx = Math.floor(Math.random() * this.cols);
      const ry = Math.floor(Math.random() * this.rows);

      // Must be path, not start, not goal, not already a collectible
      if (
        this.grid[ry][rx] === 'path' &&
        !(rx === 1 && ry === 1) &&
        !(rx === this.goalPos.x && ry === this.goalPos.y) &&
        !this.collectibles.some((c) => c.x === rx && c.y === ry)
      ) {
        this.collectibles.push({ x: rx, y: ry });
        placed++;
      }
      attempts++;
    }
  }

  getUnvisitedNeighbors(p: Point): Point[] {
    const neighbors: Point[] = [];
    const directions = [
      { dx: 0, dy: -2 }, // Up
      { dx: 0, dy: 2 }, // Down
      { dx: -2, dy: 0 }, // Left
      { dx: 2, dy: 0 }, // Right
    ];

    for (const dir of directions) {
      const nx = p.x + dir.dx;
      const ny = p.y + dir.dy;

      if (nx > 0 && nx < this.cols - 1 && ny > 0 && ny < this.rows - 1) {
        if (this.grid[ny][nx] === 'wall') {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }

    return neighbors;
  }

  getCellClass(rowIndex: number, colIndex: number): string {
    const cellType = this.grid[rowIndex][colIndex];

    // Use viewport units for mobile to maximize width (21 cols * 4.2vw ≈ 88vw)
    let classes = 'w-[4.2vw] h-[4.2vw] sm:w-6 sm:h-6 lg:w-8 lg:h-8 border border-white/5 ';

    if (cellType === 'wall') {
      classes += 'bg-slate-600 shadow-inner';
    } else {
      classes += 'bg-black/40';
    }

    if (cellType === 'start') {
      classes += ' relative';
    } else if (cellType === 'goal') {
      classes += ' relative';
    }

    return classes;
  }

  isCollectible(x: number, y: number): boolean {
    return this.collectibles.some((c) => c.x === x && c.y === y);
  }

  showReward(): void {
    this.completed.emit();
  }
}
