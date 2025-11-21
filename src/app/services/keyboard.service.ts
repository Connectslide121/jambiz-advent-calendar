import { Injectable } from '@angular/core';

/**
 * KeyboardService - Manages keyboard input state for games
 * Tracks which keys are currently pressed for smooth game controls
 */
@Injectable({
  providedIn: 'root',
})
export class KeyboardService {
  private keysPressed = new Set<string>();
  private keyDownListener?: (e: KeyboardEvent) => void;
  private keyUpListener?: (e: KeyboardEvent) => void;

  /**
   * Initialize keyboard listeners
   * Call this when starting a game
   */
  init(): void {
    if (this.keyDownListener) {
      return; // Already initialized
    }

    this.keyDownListener = (e: KeyboardEvent) => {
      this.keysPressed.add(e.key.toLowerCase());

      // Prevent default for game keys to avoid page scrolling
      if (this.isGameKey(e.key)) {
        e.preventDefault();
      }
    };

    this.keyUpListener = (e: KeyboardEvent) => {
      this.keysPressed.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', this.keyDownListener);
    window.addEventListener('keyup', this.keyUpListener);
  }

  /**
   * Clean up keyboard listeners
   * Call this when stopping a game
   */
  destroy(): void {
    if (this.keyDownListener) {
      window.removeEventListener('keydown', this.keyDownListener);
    }
    if (this.keyUpListener) {
      window.removeEventListener('keyup', this.keyUpListener);
    }
    this.keyDownListener = undefined;
    this.keyUpListener = undefined;
    this.keysPressed.clear();
  }

  /**
   * Check if a specific key is currently pressed
   */
  isPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase());
  }

  /**
   * Check if any of the provided keys are pressed
   */
  isAnyPressed(keys: string[]): boolean {
    return keys.some((key) => this.isPressed(key));
  }

  /**
   * Check if all provided keys are pressed
   */
  areAllPressed(keys: string[]): boolean {
    return keys.every((key) => this.isPressed(key));
  }

  /**
   * Check if arrow up or W is pressed
   */
  isUpPressed(): boolean {
    return this.isAnyPressed(['arrowup', 'w']);
  }

  /**
   * Check if arrow down or S is pressed
   */
  isDownPressed(): boolean {
    return this.isAnyPressed(['arrowdown', 's']);
  }

  /**
   * Check if arrow left or A is pressed
   */
  isLeftPressed(): boolean {
    return this.isAnyPressed(['arrowleft', 'a']);
  }

  /**
   * Check if arrow right or D is pressed
   */
  isRightPressed(): boolean {
    return this.isAnyPressed(['arrowright', 'd']);
  }

  /**
   * Check if spacebar is pressed
   */
  isSpacePressed(): boolean {
    return this.isPressed(' ') || this.isPressed('space');
  }

  /**
   * Check if escape is pressed
   */
  isEscapePressed(): boolean {
    return this.isPressed('escape') || this.isPressed('esc');
  }

  /**
   * Check if P is pressed (for pause)
   */
  isPausePressed(): boolean {
    return this.isPressed('p');
  }

  /**
   * Get all currently pressed keys
   */
  getPressedKeys(): string[] {
    return Array.from(this.keysPressed);
  }

  /**
   * Clear all pressed keys
   * Useful when game loses focus
   */
  clearAll(): void {
    this.keysPressed.clear();
  }

  /**
   * Check if key is a game control key that should prevent default behavior
   */
  private isGameKey(key: string): boolean {
    const gameKeys = [
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      ' ',
      'space',
      'w',
      'a',
      's',
      'd',
    ];
    return gameKeys.includes(key.toLowerCase());
  }

  /**
   * Get horizontal input (-1 for left, 0 for none, 1 for right)
   */
  getHorizontalAxis(): number {
    const left = this.isLeftPressed();
    const right = this.isRightPressed();

    if (left && !right) return -1;
    if (right && !left) return 1;
    return 0;
  }

  /**
   * Get vertical input (-1 for up, 0 for none, 1 for down)
   */
  getVerticalAxis(): number {
    const up = this.isUpPressed();
    const down = this.isDownPressed();

    if (up && !down) return -1;
    if (down && !up) return 1;
    return 0;
  }

  /**
   * Manually simulate a key down event
   * Useful for touch controls mapping to keyboard keys
   */
  simulateKeyDown(key: string): void {
    this.keysPressed.add(key.toLowerCase());
  }

  /**
   * Manually simulate a key up event
   */
  simulateKeyUp(key: string): void {
    this.keysPressed.delete(key.toLowerCase());
  }
}
