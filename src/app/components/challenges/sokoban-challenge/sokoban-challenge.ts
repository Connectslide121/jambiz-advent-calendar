import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarStateService } from '../../../services/calendar-state.service';

type CellType = 'empty' | 'wall' | 'player' | 'box' | 'target' | 'boxOnTarget' | 'playerOnTarget';

interface Position {
  row: number;
  col: number;
}

interface GameState {
  playerPos: Position;
  boxPositions: Position[];
  moveHistory: { playerPos: Position; boxPositions: Position[] }[];
}

@Component({
  selector: 'app-sokoban-challenge',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './sokoban-challenge.html',
  styleUrls: ['./sokoban-challenge.scss'],
})
export class SokobanChallengeComponent implements OnInit, OnDestroy {
  @Input() challengeData?: {
    level: string[][][]; // New format: [row][col][0]
  };
  @Input() isCompleted = false;
  @Input() day?: number;
  @Output() completed = new EventEmitter<void>();

  grid: CellType[][] = [];
  playerPos: Position = { row: 0, col: 0 };
  boxPositions: Position[] = [];
  targetPositions: Position[] = [];
  moveHistory: { playerPos: Position; boxPositions: Position[] }[] = [];
  moveCount = 0;
  isWon = false;
  savedMoves = 0;

  // Touch/swipe handling
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly SWIPE_THRESHOLD = 50;

  constructor(private calendarStateService: CalendarStateService) {}

  ngOnInit(): void {
    if (this.challengeData) {
      this.initializeGame();
      // Load saved stats if day is completed
      if (this.isCompleted && this.day) {
        const stats = this.calendarStateService.getGameStats(this.day);
        if (stats && stats.moves !== undefined) {
          this.savedMoves = stats.moves;
          // Load the saved count directly into moveCount
          this.moveCount = this.savedMoves;
        }
      }
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  initializeGame(): void {
    if (!this.challengeData || !this.challengeData.level) return;

    const levelGrid = this.challengeData.level;

    // Parse the level grid to extract player, boxes, and targets
    this.grid = [];
    this.boxPositions = [];
    this.targetPositions = [];
    const initialBoxes: Position[] = [];

    for (let row = 0; row < levelGrid.length; row++) {
      const gridRow: CellType[] = [];
      for (let col = 0; col < levelGrid[row].length; col++) {
        const cell = levelGrid[row][col][0]; // Get the single character

        switch (cell) {
          case 'W':
            gridRow.push('wall');
            break;
          case 'B':
            gridRow.push('empty'); // Box is separate from grid
            initialBoxes.push({ row, col });
            break;
          case 'P':
            gridRow.push('empty'); // Player is separate from grid
            this.playerPos = { row, col };
            break;
          case 'G':
            gridRow.push('empty'); // Goal/target is separate from grid
            this.targetPositions.push({ row, col });
            break;
          case ' ':
          default:
            gridRow.push('empty');
            break;
        }
      }
      this.grid.push(gridRow);
    }

    // Set initial box positions
    this.boxPositions = initialBoxes.map((pos) => ({ ...pos }));

    // Clear history and stats
    this.moveHistory = [];
    this.moveCount = 0;
    this.isWon = false;

    // Save initial state for undo
    this.saveState();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    if (this.isWon) return;

    const key = event.key.toLowerCase();
    let direction: 'up' | 'down' | 'left' | 'right' | null = null;

    if (key === 'arrowup' || key === 'w') direction = 'up';
    else if (key === 'arrowdown' || key === 's') direction = 'down';
    else if (key === 'arrowleft' || key === 'a') direction = 'left';
    else if (key === 'arrowright' || key === 'd') direction = 'right';

    if (direction) {
      event.preventDefault();
      this.move(direction);
    }
  }

  onTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.isWon) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > this.SWIPE_THRESHOLD) {
        this.move(deltaX > 0 ? 'right' : 'left');
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > this.SWIPE_THRESHOLD) {
        this.move(deltaY > 0 ? 'down' : 'up');
      }
    }
  }

  move(direction: 'up' | 'down' | 'left' | 'right'): void {
    const newPlayerPos = this.getNewPosition(this.playerPos, direction);

    // Check if move is valid
    if (!this.isValidPosition(newPlayerPos)) return;

    // Check if there's a box at the new position
    const boxIndex = this.boxPositions.findIndex(
      (box) => box.row === newPlayerPos.row && box.col === newPlayerPos.col
    );

    if (boxIndex !== -1) {
      // Try to push the box
      const newBoxPos = this.getNewPosition(newPlayerPos, direction);

      // Check if box can be pushed
      if (!this.isValidPosition(newBoxPos)) return;
      if (this.hasBox(newBoxPos)) return; // Can't push into another box

      // Move box
      this.boxPositions[boxIndex] = newBoxPos;
    }

    // Move player
    this.playerPos = newPlayerPos;
    this.moveCount++;
    this.saveState();

    // Check win condition
    this.checkWinCondition();
  }

  getNewPosition(pos: Position, direction: 'up' | 'down' | 'left' | 'right'): Position {
    const newPos = { ...pos };
    if (direction === 'up') newPos.row--;
    else if (direction === 'down') newPos.row++;
    else if (direction === 'left') newPos.col--;
    else if (direction === 'right') newPos.col++;
    return newPos;
  }

  isValidPosition(pos: Position): boolean {
    if (pos.row < 0 || pos.row >= this.grid.length) return false;
    if (pos.col < 0 || pos.col >= this.grid[0].length) return false;
    return this.grid[pos.row][pos.col] !== 'wall';
  }

  hasBox(pos: Position): boolean {
    return this.boxPositions.some((box) => box.row === pos.row && box.col === pos.col);
  }

  isTarget(pos: Position): boolean {
    return this.targetPositions.some((target) => target.row === pos.row && target.col === pos.col);
  }

  isPlayerPosition(row: number, col: number): boolean {
    return this.playerPos.row === row && this.playerPos.col === col;
  }

  getBoxAt(row: number, col: number): Position | undefined {
    return this.boxPositions.find((box) => box.row === row && box.col === col);
  }

  getCellClass(row: number, col: number): string {
    const cell = this.grid[row][col];
    const hasBox = this.getBoxAt(row, col);
    const isPlayer = this.isPlayerPosition(row, col);
    const isTargetCell = this.isTarget({ row, col });

    if (cell === 'wall') return 'wall';
    if (isPlayer && isTargetCell) return 'player-on-target';
    if (isPlayer) return 'player';
    if (hasBox && isTargetCell) return 'box-on-target';
    if (hasBox) return 'box';
    if (isTargetCell) return 'target';
    return 'empty';
  }

  saveState(): void {
    this.moveHistory.push({
      playerPos: { ...this.playerPos },
      boxPositions: this.boxPositions.map((box) => ({ ...box })),
    });
  }

  undo(): void {
    if (this.moveHistory.length <= 1) return; // Keep initial state

    // Remove current state
    this.moveHistory.pop();

    // Restore previous state
    const previousState = this.moveHistory[this.moveHistory.length - 1];
    this.playerPos = { ...previousState.playerPos };
    this.boxPositions = previousState.boxPositions.map((box) => ({ ...box }));
    this.moveCount = Math.max(0, this.moveCount - 1);
  }

  checkWinCondition(): void {
    const allBoxesOnTargets = this.boxPositions.every((box) =>
      this.targetPositions.some((target) => target.row === box.row && target.col === box.col)
    );

    if (allBoxesOnTargets) {
      this.isWon = true;

      // Save stats to localStorage
      if (this.day) {
        this.calendarStateService.saveGameStats(this.day, { moves: this.moveCount });
        this.savedMoves = this.moveCount;
      }

      if (!this.isCompleted) {
        this.completed.emit();
      }
    }
  }

  reset(): void {
    this.initializeGame();
  }
}
