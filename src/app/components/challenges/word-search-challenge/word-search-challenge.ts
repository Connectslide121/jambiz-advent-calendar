import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface WordSearchConfig {
  grid: string[][]; // English 2D array of letters
  gridSv?: string[][]; // Swedish 2D array of letters
  words: string[]; // English words to find
  wordsSv?: string[]; // Swedish words to find
}

interface FoundWord {
  word: string;
  cells: { row: number; col: number }[];
}

@Component({
  selector: 'app-word-search-challenge',
  imports: [CommonModule, TranslateModule],
  templateUrl: './word-search-challenge.html',
  styleUrl: './word-search-challenge.scss',
})
export class WordSearchChallenge implements OnInit {
  @Input() config!: WordSearchConfig;
  @Input() isCompleted = false;
  @Output() completed = new EventEmitter<void>();

  currentGrid: string[][] = [];
  currentWords: string[] = [];
  foundWords: FoundWord[] = [];
  selectedCells: { row: number; col: number }[] = [];
  isSelecting = false;
  private touchStartCell: { row: number; col: number } | null = null;

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    // Determine which grid and words to use based on current language
    const currentLang = this.translate.currentLang || this.translate.defaultLang;
    this.currentGrid =
      currentLang === 'sv' && this.config.gridSv ? this.config.gridSv : this.config.grid;
    this.currentWords =
      currentLang === 'sv' && this.config.wordsSv ? this.config.wordsSv : this.config.words;

    if (this.isCompleted) {
      // Auto-complete all words
      this.currentWords.forEach((word) => {
        const found = this.findWordInGrid(word);
        if (found) {
          this.foundWords.push(found);
        }
      });
    }
  }

  get allWordsFound(): boolean {
    return this.foundWords.length === this.currentWords.length;
  }

  isWordFound(word: string): boolean {
    return this.foundWords.some((fw) => fw.word.toUpperCase() === word.toUpperCase());
  }

  isCellSelected(row: number, col: number): boolean {
    return this.selectedCells.some((cell) => cell.row === row && cell.col === col);
  }

  isCellInFoundWord(row: number, col: number): boolean {
    return this.foundWords.some((fw) =>
      fw.cells.some((cell) => cell.row === row && cell.col === col)
    );
  }

  onMouseDown(row: number, col: number): void {
    if (this.isCompleted) return;
    this.isSelecting = true;
    this.selectedCells = [{ row, col }];
  }

  onMouseEnter(row: number, col: number): void {
    if (!this.isSelecting || this.isCompleted) return;

    // Only allow straight lines (horizontal, vertical, or diagonal)
    if (this.selectedCells.length === 1) {
      this.selectedCells.push({ row, col });
    } else if (this.selectedCells.length > 1) {
      const first = this.selectedCells[0];
      const direction = this.getDirection(first, { row, col });

      if (direction) {
        // Rebuild selection in this direction
        this.selectedCells = this.getCellsInDirection(first, { row, col }, direction);
      }
    }
  }

  onMouseUp(): void {
    if (!this.isSelecting) return;
    this.isSelecting = false;

    if (this.selectedCells.length > 1) {
      this.checkSelection();
    }

    this.selectedCells = [];
  }

  onTouchStart(event: TouchEvent, row: number, col: number): void {
    if (this.isCompleted) return;
    event.preventDefault();
    this.isSelecting = true;
    this.touchStartCell = { row, col };
    this.selectedCells = [{ row, col }];
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isSelecting || this.isCompleted) return;
    event.preventDefault();

    const touch = event.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;

    if (element && element.tagName === 'BUTTON') {
      const cellText = element.textContent?.trim();
      if (cellText) {
        // Find the cell in the grid
        for (let r = 0; r < this.currentGrid.length; r++) {
          for (let c = 0; c < this.currentGrid[r].length; c++) {
            if (this.currentGrid[r][c] === cellText) {
              // Check if this could be the right cell based on position
              const alreadySelected = this.isCellSelected(r, c);
              if (!alreadySelected) {
                this.onMouseEnter(r, c);
                return;
              }
            }
          }
        }
      }
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isSelecting) return;
    event.preventDefault();
    this.isSelecting = false;

    if (this.selectedCells.length > 1) {
      this.checkSelection();
    }

    this.selectedCells = [];
    this.touchStartCell = null;
  }

  private getDirection(
    from: { row: number; col: number },
    to: { row: number; col: number }
  ): string | null {
    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;

    if (rowDiff === 0 && colDiff !== 0) return 'horizontal';
    if (rowDiff !== 0 && colDiff === 0) return 'vertical';
    if (Math.abs(rowDiff) === Math.abs(colDiff)) return 'diagonal';

    return null;
  }

  private getCellsInDirection(
    start: { row: number; col: number },
    end: { row: number; col: number },
    direction: string
  ): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];
    const rowStep = end.row > start.row ? 1 : end.row < start.row ? -1 : 0;
    const colStep = end.col > start.col ? 1 : end.col < start.col ? -1 : 0;

    let row = start.row;
    let col = start.col;

    while (row !== end.row + rowStep || col !== end.col + colStep) {
      cells.push({ row, col });
      if (row === end.row && col === end.col) break;
      row += rowStep;
      col += colStep;
    }

    return cells;
  }

  private checkSelection(): void {
    const word = this.selectedCells.map((cell) => this.currentGrid[cell.row][cell.col]).join('');

    const reversedWord = word.split('').reverse().join('');

    for (const targetWord of this.currentWords) {
      if (
        (word.toUpperCase() === targetWord.toUpperCase() ||
          reversedWord.toUpperCase() === targetWord.toUpperCase()) &&
        !this.isWordFound(targetWord)
      ) {
        this.foundWords.push({
          word: targetWord,
          cells: [...this.selectedCells],
        });

        if (this.allWordsFound) {
          setTimeout(() => {
            this.completed.emit();
          }, 500);
        }
        return;
      }
    }
  }

  private findWordInGrid(word: string): FoundWord | null {
    // Simple linear search for demonstration
    // In a real implementation, this would search in all 8 directions
    for (let row = 0; row < this.currentGrid.length; row++) {
      for (let col = 0; col < this.currentGrid[row].length; col++) {
        // Check horizontal
        const horizontal = this.checkDirection(row, col, 0, 1, word);
        if (horizontal) return horizontal;

        // Check vertical
        const vertical = this.checkDirection(row, col, 1, 0, word);
        if (vertical) return vertical;
      }
    }
    return null;
  }

  private checkDirection(
    row: number,
    col: number,
    rowStep: number,
    colStep: number,
    word: string
  ): FoundWord | null {
    const cells: { row: number; col: number }[] = [];
    let r = row;
    let c = col;

    for (let i = 0; i < word.length; i++) {
      if (
        r < 0 ||
        r >= this.currentGrid.length ||
        c < 0 ||
        c >= this.currentGrid[0].length ||
        this.currentGrid[r][c].toUpperCase() !== word[i].toUpperCase()
      ) {
        return null;
      }
      cells.push({ row: r, col: c });
      r += rowStep;
      c += colStep;
    }

    return { word, cells };
  }

  showAnswer(): void {
    this.completed.emit();
  }
}
