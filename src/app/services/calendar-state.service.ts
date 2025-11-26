import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CalendarStateService {
  private readonly STORAGE_KEY = 'jambiz-advent-completed-days';
  private readonly STATS_STORAGE_KEY = 'jambiz-advent-game-stats';
  private readonly DEV_MODE_KEY = 'jambiz-advent-dev-mode';
  private readonly DATE_OVERRIDE_KEY = 'jambiz-advent-date-override';
  private completedDays: Set<number> = new Set();
  private gameStats: Map<string, any> = new Map();
  private _devMode = false;
  private _dateOverride: number | null = null; // Day of December (1-31)

  constructor() {
    this.loadFromStorage();
    this.loadStatsFromStorage();
    this.loadDevMode();
    this.loadDateOverride();
  }

  /**
   * Developer mode - when enabled, all days are unlocked regardless of date
   */
  get devMode(): boolean {
    return this._devMode;
  }

  set devMode(value: boolean) {
    this._devMode = value;
    this.saveDevMode();
  }

  toggleDevMode(): void {
    this.devMode = !this._devMode;
  }

  private loadDevMode(): void {
    try {
      const stored = localStorage.getItem(this.DEV_MODE_KEY);
      this._devMode = stored === 'true';
    } catch {
      this._devMode = false;
    }
  }

  private saveDevMode(): void {
    try {
      localStorage.setItem(this.DEV_MODE_KEY, String(this._devMode));
    } catch (error) {
      console.error('Failed to save dev mode to storage', error);
    }
  }

  /**
   * Date override - set a fake December day for testing (1-31)
   * Set to null to use the real date
   */
  get dateOverride(): number | null {
    return this._dateOverride;
  }

  set dateOverride(value: number | null) {
    this._dateOverride = value;
    this.saveDateOverride();
  }

  private loadDateOverride(): void {
    try {
      const stored = localStorage.getItem(this.DATE_OVERRIDE_KEY);
      if (stored && stored !== 'null') {
        const parsed = parseInt(stored, 10);
        this._dateOverride = isNaN(parsed) ? null : parsed;
      } else {
        this._dateOverride = null;
      }
    } catch {
      this._dateOverride = null;
    }
  }

  private saveDateOverride(): void {
    try {
      if (this._dateOverride === null) {
        localStorage.removeItem(this.DATE_OVERRIDE_KEY);
      } else {
        localStorage.setItem(this.DATE_OVERRIDE_KEY, String(this._dateOverride));
      }
    } catch (error) {
      console.error('Failed to save date override to storage', error);
    }
  }

  /**
   * Get the effective current day in December
   * Uses date override if set, otherwise the real date
   */
  getEffectiveDecemberDay(): number {
    if (this._dateOverride !== null) {
      return this._dateOverride;
    }
    const now = new Date();
    const month = now.getMonth();
    if (month === 11) {
      return now.getDate();
    }
    return 0; // Not December
  }

  /**
   * Check if a specific day is unlocked based on the current date
   * Days unlock on their corresponding December date (day 1 = Dec 1, etc.)
   * In dev mode, all days are unlocked
   */
  isDayUnlocked(day: number): boolean {
    // Dev mode unlocks everything
    if (this._devMode) {
      return true;
    }

    // Christmas day or later unlocks everything
    if (this.isChristmasDay()) {
      return true;
    }

    // If date override is set, use it (simulates being in December)
    if (this._dateOverride !== null) {
      return day <= this._dateOverride;
    }

    const now = new Date();
    const month = now.getMonth(); // 0-indexed, December = 11
    const currentDay = now.getDate();

    // Before December, nothing is unlocked
    if (month < 11) {
      return false;
    }

    // In December, unlock days up to and including today
    if (month === 11) {
      return day <= currentDay;
    }

    // After December (January onwards), everything is unlocked
    return true;
  }

  getCompletedDays(): number[] {
    return Array.from(this.completedDays).sort((a, b) => a - b);
  }

  getCompletedCount(): number {
    return this.completedDays.size;
  }

  isDayCompleted(day: number): boolean {
    return this.completedDays.has(day);
  }

  /**
   * Check if all 24 calendar days are completed
   */
  isCalendarComplete(): boolean {
    return this.completedDays.size >= 24;
  }

  /**
   * Check if it's December 25th or later (unlock everything for everyone)
   */
  isChristmasDay(): boolean {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed, so December = 11
    const day = now.getDate();
    return month === 11 && day >= 25;
  }

  /**
   * Check if extras and rewards gallery should be unlocked
   * Either all days are complete OR it's December 25th or later
   */
  isFullyUnlocked(): boolean {
    return this.isCalendarComplete() || this.isChristmasDay();
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
