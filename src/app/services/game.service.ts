import { Injectable } from '@angular/core';

/**
 * Rectangle for collision detection
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Circle for collision detection
 */
export interface Circle {
  x: number;
  y: number;
  radius: number;
}

/**
 * GameService - Reusable game utilities and helpers
 * Provides game loop management, collision detection, physics helpers, and canvas utilities
 */
@Injectable({
  providedIn: 'root',
})
export class GameService {
  private activeLoops = new Map<number, boolean>();
  private loopIdCounter = 0;

  /**
   * Start a game loop using requestAnimationFrame
   * Returns a loop ID that can be used to stop the loop
   */
  startGameLoop(callback: (deltaTime: number) => void): number {
    const loopId = this.loopIdCounter++;
    this.activeLoops.set(loopId, true);

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (!this.activeLoops.get(loopId)) {
        return; // Loop has been stopped
      }

      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      callback(deltaTime);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    return loopId;
  }

  /**
   * Stop a running game loop
   */
  stopGameLoop(loopId: number): void {
    this.activeLoops.delete(loopId);
  }

  /**
   * Stop all active game loops
   */
  stopAllLoops(): void {
    this.activeLoops.clear();
  }

  /**
   * Check collision between two rectangles (AABB collision)
   */
  checkRectCollision(rect1: Rect, rect2: Rect): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  /**
   * Check collision between two circles
   */
  checkCircleCollision(circle1: Circle, circle2: Circle): boolean {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < circle1.radius + circle2.radius;
  }

  /**
   * Check collision between a circle and a rectangle
   */
  checkCircleRectCollision(circle: Circle, rect: Rect): boolean {
    // Find the closest point on the rectangle to the circle
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    // Calculate distance from circle center to closest point
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const distanceSquared = dx * dx + dy * dy;

    return distanceSquared < circle.radius * circle.radius;
  }

  /**
   * Apply gravity to velocity
   */
  applyGravity(velocity: number, gravity: number, deltaTime: number): number {
    return velocity + gravity * deltaTime;
  }

  /**
   * Apply friction to velocity
   */
  applyFriction(velocity: number, friction: number): number {
    if (Math.abs(velocity) < 0.01) return 0;
    return velocity * friction;
  }

  /**
   * Clamp a value between min and max
   */
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Linear interpolation between two values
   */
  lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Check if device is mobile
   */
  isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Check if device supports touch events
   */
  isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );
  }

  /**
   * Get responsive canvas size based on container
   * Maintains aspect ratio and fits within container
   */
  getResponsiveCanvasSize(
    container: HTMLElement,
    aspectRatio: number = 16 / 9
  ): { width: number; height: number } {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    let width = containerWidth;
    let height = containerWidth / aspectRatio;

    // If height exceeds container, constrain by height instead
    if (height > containerHeight) {
      height = containerHeight;
      width = containerHeight * aspectRatio;
    }

    return { width, height };
  }

  /**
   * Scale canvas for retina displays
   */
  scaleCanvasForRetina(canvas: HTMLCanvasElement): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Check if point is inside rectangle
   */
  isPointInRect(x: number, y: number, rect: Rect): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  /**
   * Get distance between two points
   */
  distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Convert degrees to radians
   */
  degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Convert radians to degrees
   */
  radiansToDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }
}
