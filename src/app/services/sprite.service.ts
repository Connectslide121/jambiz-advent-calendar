import { Injectable } from '@angular/core';

/**
 * SpriteService - Manages loading and caching of game sprites
 * Used by all minigame components to efficiently load and reuse image assets
 */
@Injectable({
  providedIn: 'root',
})
export class SpriteService {
  private sprites = new Map<string, HTMLImageElement>();
  private loadingPromises = new Map<string, Promise<HTMLImageElement>>();

  /**
   * Load a sprite from the given path and cache it
   * Returns cached sprite if already loaded
   */
  async loadSprite(name: string, path: string): Promise<HTMLImageElement> {
    // Return cached sprite if available
    if (this.sprites.has(name)) {
      return this.sprites.get(name)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    // Create new loading promise
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.sprites.set(name, img);
        this.loadingPromises.delete(name);
        resolve(img);
      };

      img.onerror = () => {
        this.loadingPromises.delete(name);
        reject(new Error(`Failed to load sprite: ${path}`));
      };

      img.src = path;
    });

    this.loadingPromises.set(name, loadPromise);
    return loadPromise;
  }

  /**
   * Get a cached sprite by name
   * Returns null if sprite hasn't been loaded yet
   */
  getSprite(name: string): HTMLImageElement | null {
    return this.sprites.get(name) || null;
  }

  /**
   * Check if a sprite is already loaded
   */
  isLoaded(name: string): boolean {
    return this.sprites.has(name);
  }

  /**
   * Preload common sprites used across multiple games
   * Call this during app initialization or before first game loads
   */
  async preloadCommonSprites(): Promise<void> {
    const commonSprites = [
      { name: 'player', path: 'assets/sprites/player.png' },
      { name: 'obstacle', path: 'assets/sprites/obstacle.png' },
      { name: 'platform', path: 'assets/sprites/platform.png' },
      { name: 'collectible', path: 'assets/sprites/collectible.png' },
      { name: 'box', path: 'assets/sprites/box.png' },
      { name: 'target', path: 'assets/sprites/target.png' },
    ];

    try {
      await Promise.all(commonSprites.map((sprite) => this.loadSprite(sprite.name, sprite.path)));
    } catch (error) {
      console.warn('Some sprites failed to preload:', error);
      // Don't throw - games can still load sprites individually
    }
  }

  /**
   * Load multiple sprites at once
   * Useful for loading all sprites needed for a specific game
   */
  async loadSprites(sprites: Array<{ name: string; path: string }>): Promise<HTMLImageElement[]> {
    return Promise.all(sprites.map((s) => this.loadSprite(s.name, s.path)));
  }

  /**
   * Clear all cached sprites
   * Useful for testing or memory management
   */
  clearCache(): void {
    this.sprites.clear();
    this.loadingPromises.clear();
  }

  /**
   * Remove specific sprite from cache
   */
  removeSprite(name: string): void {
    this.sprites.delete(name);
  }
}
