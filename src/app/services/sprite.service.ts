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

    // Resolve the path with base href
    const resolvedPath = this.resolveAssetPath(path);

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
        reject(new Error(`Failed to load sprite: ${resolvedPath}`));
      };

      img.src = resolvedPath;
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
   * Get the base path for assets, accounting for deployment base href
   */
  private getBasePath(): string {
    // Use document.baseURI or fall back to '/'
    const base = document.baseURI || window.location.origin + '/';
    return base.endsWith('/') ? base : base + '/';
  }

  /**
   * Resolve asset path with base href
   */
  private resolveAssetPath(path: string): string {
    // If path already starts with http/https, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // Use the base element's href if available, otherwise construct from baseURI
    const baseElement = document.querySelector('base');
    if (baseElement && baseElement.href) {
      return baseElement.href + cleanPath;
    }

    return this.getBasePath() + cleanPath;
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
      await Promise.all(
        commonSprites.map((sprite) =>
          this.loadSprite(sprite.name, this.resolveAssetPath(sprite.path))
        )
      );
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
