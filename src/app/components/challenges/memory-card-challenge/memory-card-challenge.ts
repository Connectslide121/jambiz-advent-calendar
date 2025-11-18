import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarStateService } from '../../../services/calendar-state.service';

interface Card {
  id: number;
  icon: string;
  flipped: boolean;
  matched: boolean;
}

interface MemoryCardConfig {
  gridSize: number; // 4 for 4x4, 6 for 6x6
  icons: string[]; // Card icons/emojis
}

@Component({
  selector: 'app-memory-card-challenge',
  imports: [CommonModule, TranslateModule],
  templateUrl: './memory-card-challenge.html',
  styleUrl: './memory-card-challenge.scss',
})
export class MemoryCardChallenge implements OnInit {
  @Input() config!: MemoryCardConfig;
  @Input() isCompleted = false;
  @Input() day?: number;
  @Output() completed = new EventEmitter<void>();

  cards: Card[] = [];
  flippedCards: Card[] = [];
  moves = 0;
  matches = 0;
  isChecking = false;
  gameWon = false;
  completedMoves = 0; // Store moves when game is won

  constructor(private stateService: CalendarStateService) {}

  ngOnInit(): void {
    this.initializeGame();
  }

  /**
   * Initialize the card grid
   */
  initializeGame(restoreCompleted: boolean = true): void {
    const totalPairs = (this.config.gridSize * this.config.gridSize) / 2;
    const selectedIcons = this.config.icons.slice(0, totalPairs);

    // Create pairs of cards
    const cardPairs: Card[] = [];
    selectedIcons.forEach((icon, index) => {
      cardPairs.push(
        { id: index * 2, icon, flipped: false, matched: false },
        { id: index * 2 + 1, icon, flipped: false, matched: false }
      );
    });

    // Shuffle cards
    this.cards = this.shuffleArray(cardPairs);

    // Reset game state
    this.flippedCards = [];
    this.moves = 0;
    this.matches = 0;
    this.isChecking = false;
    this.gameWon = false;

    // If already completed and we want to restore state, reveal all cards
    if (this.isCompleted && restoreCompleted) {
      this.cards.forEach((card) => {
        card.flipped = true;
        card.matched = true;
      });
      this.matches = totalPairs;
      this.gameWon = true;
      // Restore the move count from localStorage
      if (this.day !== undefined) {
        const savedStats = this.stateService.getGameStats(this.day);
        if (savedStats && savedStats.moves) {
          this.moves = savedStats.moves;
          this.completedMoves = savedStats.moves;
        }
      }
    }
  }

  /**
   * Handle card click
   */
  onCardClick(card: Card): void {
    // Prevent interaction if game is won, card is matched, already flipped, or checking
    if (this.gameWon || card.matched || card.flipped || this.isChecking) {
      return;
    }

    // Prevent flipping more than 2 cards
    if (this.flippedCards.length >= 2) {
      return;
    }

    // Flip the card
    card.flipped = true;
    this.flippedCards.push(card);

    // Check for match when 2 cards are flipped
    if (this.flippedCards.length === 2) {
      this.moves++;
      this.checkForMatch();
    }
  }

  /**
   * Check if two flipped cards match
   */
  checkForMatch(): void {
    this.isChecking = true;
    const [card1, card2] = this.flippedCards;

    if (card1.icon === card2.icon) {
      // Match found
      setTimeout(() => {
        card1.matched = true;
        card2.matched = true;
        this.matches++;
        this.flippedCards = [];
        this.isChecking = false;

        // Check for win
        if (this.matches === (this.config.gridSize * this.config.gridSize) / 2) {
          this.gameWon = true;
          this.completedMoves = this.moves; // Save the move count
          // Save stats to localStorage
          if (this.day !== undefined) {
            this.stateService.saveGameStats(this.day, { moves: this.moves });
          }
          this.completed.emit();
        }
      }, 500);
    } else {
      // No match - flip cards back
      setTimeout(() => {
        card1.flipped = false;
        card2.flipped = false;
        this.flippedCards = [];
        this.isChecking = false;
      }, 1000);
    }
  }

  /**
   * Reset the game
   */
  resetGame(): void {
    this.initializeGame(false); // Don't restore completed state when resetting
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get grid columns CSS class based on grid size
   */
  getGridClass(): string {
    return `grid-cols-${this.config.gridSize}`;
  }
}
