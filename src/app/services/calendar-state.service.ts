import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CalendarStateService {
  private readonly STORAGE_KEY = 'jambiz-advent-completed-days';
  private completedDays: Set<number> = new Set();

  constructor() {
    this.loadFromStorage();
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

  clearAllProgress(): void {
    this.completedDays.clear();
    this.saveToStorage();
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
