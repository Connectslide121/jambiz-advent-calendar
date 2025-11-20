import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CalendarStateService {
  private readonly STORAGE_KEY = 'jambiz-advent-completed-days';
  private readonly STATS_STORAGE_KEY = 'jambiz-advent-game-stats';
  private completedDays: Set<number> = new Set();
  private gameStats: Map<string, any> = new Map();

  constructor() {
    this.loadFromStorage();
    this.loadStatsFromStorage();
  }

  getCompletedDays(): number[] {
    return Array.from(this.completedDays).sort((a, b) => a - b);
  }

  isDayCompleted(day: number): boolean {
    return this.completedDays.has(day);
  }

  markDayComplete(day: number): void {
    this.completedDays.add(day);
    this.saveToStorage();
  }

  markAllDaysComplete(): void {
    // Mark days 1-24 as completed
    for (let i = 1; i <= 24; i++) {
      this.completedDays.add(i);
    }
    this.saveToStorage();
  }

  clearAllProgress(): void {
    this.completedDays.clear();
    this.gameStats.clear();
    this.saveToStorage();
    this.saveStatsToStorage();
  }

  // Game stats methods
  saveGameStats(key: number | string, stats: any): void {
    this.gameStats.set(String(key), stats);
    this.saveStatsToStorage();
  }

  getGameStats(key: number | string): any | null {
    return this.gameStats.get(String(key)) || null;
  }

  private loadStatsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STATS_STORAGE_KEY);
      if (stored) {
        const statsObj = JSON.parse(stored);
        if (statsObj && typeof statsObj === 'object') {
          // Keys are already strings in JSON
          this.gameStats = new Map(Object.entries(statsObj));
        }
      }
    } catch (error) {
      console.error('Failed to load game stats from storage', error);
      this.gameStats = new Map();
    }
  }

  private saveStatsToStorage(): void {
    try {
      const statsObj = Object.fromEntries(this.gameStats);
      localStorage.setItem(this.STATS_STORAGE_KEY, JSON.stringify(statsObj));
    } catch (error) {
      console.error('Failed to save game stats to storage', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const days = JSON.parse(stored) as number[];
        this.completedDays = new Set(days);
      }
    } catch (error) {
      console.error('Failed to load completed days from storage', error);
      this.completedDays = new Set();
    }
  }

  private saveToStorage(): void {
    try {
      const days = this.getCompletedDays();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(days));
    } catch (error) {
      console.error('Failed to save completed days to storage', error);
    }
  }
}
