import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, RotateCcw, Shuffle } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';

interface Tile {
  value: number; // 0 = empty, 1-8 = tile number
  row: number;
  col: number;
}

interface SlidingPuzzleConfig {
  image?: string; // Optional: image URL to use instead of numbers
  gridSize?: number; // 3 for 3x3 (default), 4 for 4x4
}

@Component({
  selector: 'app-sliding-puzzle-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './sliding-puzzle-challenge.html',
  styleUrl: './sliding-puzzle-challenge.scss',
})
export class SlidingPuzzleChallenge implements OnInit {
  @Input() config: SlidingPuzzleConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Output() completed = new EventEmitter<void>();

  readonly Check = Check;
  readonly RotateCcw = RotateCcw;
  readonly Shuffle = Shuffle;

  tiles: Tile[] = [];
  gridSize = 3;
  moves = 0;
  gameWon = false;
  completedMoves = 0;
  isAnimating = false;

  // Christmas emojis for number mode (need enough for up to 6x6 = 35 tiles)
  private readonly christmasEmojis = [
    '🎄',
    '🎅',
    '⭐',
    '🎁',
    '🔔',
    '❄️',
    '⛄',
    '🦌',
    '🕯️',
    '🎀',
    '🧦',
    '🍪',
    '🥛',
    '🎶',
    '🌟',
    '🎊',
    '🛷',
    '🧤',
    '🎺',
    '🍬',
    '☃️',
    '🌨️',
    '⛷️',
    '🎿',
    '🧣',
    '🎩',
    '🎻',
    '🍫',
    '🧁',
    '🎂',
    '🍰',
    '🧇',
    '🫚',
    '🍯',
    '🥜',
  ];

  constructor(private stateService: CalendarStateService) {}

  ngOnInit(): void {
    this.gridSize = this.config.gridSize || 3;
    this.initializeGame();
  }

  /**
   * Initialize the puzzle grid
   */
  initializeGame(restoreCompleted: boolean = true): void {
    const totalTiles = this.gridSize * this.gridSize;
    this.tiles = [];

    // Create tiles in solved order (1 to n-1, then 0 for empty)
    for (let i = 0; i < totalTiles; i++) {
      const value = i === totalTiles - 1 ? 0 : i + 1;
      this.tiles.push({
        value,
        row: Math.floor(i / this.gridSize),
        col: i % this.gridSize,
      });
    }

    this.moves = 0;
    this.gameWon = false;
    this.isAnimating = false;

    // If already completed and we want to restore state, show solved puzzle
    if (this.isCompleted && restoreCompleted) {
      this.gameWon = true;
      // Restore the move count from localStorage
      if (this.day !== undefined) {
        const savedStats = this.stateService.getGameStats(this.day);
        if (savedStats && savedStats.moves) {
          this.moves = savedStats.moves;
          this.completedMoves = savedStats.moves;
        }
      }
    } else {
      // Shuffle the puzzle
      this.shufflePuzzle();
    }
  }

  /**
   * Shuffle the puzzle with a guaranteed solvable configuration
   */
  shufflePuzzle(): void {
    // Make random valid moves to shuffle (ensures solvability)
    const shuffleMoves = 100 + Math.floor(Math.random() * 50);

    for (let i = 0; i < shuffleMoves; i++) {
      const emptyTile = this.tiles.find((t) => t.value === 0)!;
      const neighbors = this.getMovableTiles(emptyTile);
      if (neighbors.length > 0) {
        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.swapTiles(randomNeighbor, emptyTile, false);
      }
    }

    this.moves = 0;
  }

  /**
   * Get tiles that can be moved (adjacent to empty tile)
   */
  getMovableTiles(emptyTile: Tile): Tile[] {
    return this.tiles.filter((tile) => {
      if (tile.value === 0) return false;
      const rowDiff = Math.abs(tile.row - emptyTile.row);
      const colDiff = Math.abs(tile.col - emptyTile.col);
      return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    });
  }

  /**
   * Check if a tile can be moved
   */
  canMove(tile: Tile): boolean {
    if (tile.value === 0 || this.gameWon || this.isAnimating) return false;
    const emptyTile = this.tiles.find((t) => t.value === 0)!;
    const rowDiff = Math.abs(tile.row - emptyTile.row);
    const colDiff = Math.abs(tile.col - emptyTile.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  /**
   * Handle tile click
   */
  onTileClick(tile: Tile): void {
    if (!this.canMove(tile)) return;

    const emptyTile = this.tiles.find((t) => t.value === 0)!;
    this.swapTiles(tile, emptyTile, true);
  }

  /**
   * Swap two tiles
   */
  private swapTiles(tile1: Tile, tile2: Tile, countMove: boolean): void {
    const tempRow = tile1.row;
    const tempCol = tile1.col;
    tile1.row = tile2.row;
    tile1.col = tile2.col;
    tile2.row = tempRow;
    tile2.col = tempCol;

    if (countMove) {
      this.moves++;
      this.checkWin();
    }
  }

  /**
   * Check if the puzzle is solved
   */
  checkWin(): void {
    const totalTiles = this.gridSize * this.gridSize;
    const isSolved = this.tiles.every((tile) => {
      const expectedValue = tile.row * this.gridSize + tile.col + 1;
      // Last position should be empty (0)
      if (tile.row === this.gridSize - 1 && tile.col === this.gridSize - 1) {
        return tile.value === 0;
      }
      return tile.value === expectedValue;
    });

    if (isSolved) {
      this.gameWon = true;
      this.completedMoves = this.moves;
      // Save stats to localStorage
      if (this.day !== undefined) {
        this.stateService.saveGameStats(this.day, { moves: this.moves });
      }
      // Delay completion to let user see the solved puzzle
      setTimeout(() => {
        this.completed.emit();
      }, 1000);
    }
  }

  /**
   * Reset the game
   */
  resetGame(): void {
    this.initializeGame(false);
  }

  /**
   * Show reward/fun fact
   */
  showReward(): void {
    this.completed.emit();
  }

  /**
   * Get tile position style
   */
  getTileStyle(tile: Tile): Record<string, string> {
    const tileSize = 100 / this.gridSize;
    return {
      width: `calc(${tileSize}% - 4px)`,
      height: `calc(${tileSize}% - 4px)`,
      left: `calc(${tile.col * tileSize}% + 2px)`,
      top: `calc(${tile.row * tileSize}% + 2px)`,
    };
  }

  /**
   * Get display content for a tile
   */
  getTileDisplay(tile: Tile): string {
    if (tile.value === 0) return '';
    // Use Christmas emoji instead of number
    return this.christmasEmojis[(tile.value - 1) % this.christmasEmojis.length];
  }

  /**
   * Get tile classes
   */
  getTileClasses(tile: Tile): string {
    const classes = ['tile'];
    if (tile.value === 0) classes.push('empty');
    if (this.canMove(tile)) classes.push('movable');
    if (this.gameWon) classes.push('solved');
    return classes.join(' ');
  }

  /**
   * Get sorted tiles for rendering
   */
  getSortedTiles(): Tile[] {
    return [...this.tiles].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
  }

  /**
   * Get array of goal tile values for the goal hint display
   */
  getGoalTiles(): number[] {
    const total = this.gridSize * this.gridSize;
    const tiles: number[] = [];
    for (let i = 1; i < total; i++) {
      tiles.push(i);
    }
    tiles.push(0); // Empty tile at the end
    return tiles;
  }

  /**
   * Handle keyboard navigation
   */
  onKeyDown(event: KeyboardEvent): void {
    if (this.gameWon || this.isAnimating) return;

    const emptyTile = this.tiles.find((t) => t.value === 0)!;
    let targetTile: Tile | undefined;

    switch (event.key) {
      case 'ArrowUp':
        // Move tile below empty space up
        targetTile = this.tiles.find((t) => t.row === emptyTile.row + 1 && t.col === emptyTile.col);
        break;
      case 'ArrowDown':
        // Move tile above empty space down
        targetTile = this.tiles.find((t) => t.row === emptyTile.row - 1 && t.col === emptyTile.col);
        break;
      case 'ArrowLeft':
        // Move tile to the right of empty space left
        targetTile = this.tiles.find((t) => t.row === emptyTile.row && t.col === emptyTile.col + 1);
        break;
      case 'ArrowRight':
        // Move tile to the left of empty space right
        targetTile = this.tiles.find((t) => t.row === emptyTile.row && t.col === emptyTile.col - 1);
        break;
    }

    if (targetTile) {
      event.preventDefault();
      this.onTileClick(targetTile);
    }
  }
}
