import { Injectable, inject } from '@angular/core';
import { BackendService } from './backend.service';

@Injectable({ providedIn: 'root' })
export class CalendarStateService {
  private backend = inject(BackendService);
  private completedDays = new Set<number>();
  private gameStats = new Map<string, any>();
  private _devMode = false;
  private _dateOverride: number | null = null;

  loadCloudProgress(): void {
    const player = this.backend.player();
    this.completedDays = new Set(player?.days.map(d => d.day) ?? []);
    for (const day of player?.days ?? []) this.gameStats.set(String(day.day), day.stats);
    for (const [key, stats] of Object.entries(player?.extras ?? {})) this.gameStats.set(key, stats);
  }
  get devMode(): boolean { return this._devMode; }
  set devMode(value: boolean) { this._devMode = location.hostname === 'localhost' && value; }
  toggleDevMode(): void { this.devMode = !this.devMode; }
  get dateOverride(): number | null { return this._dateOverride; }
  set dateOverride(value: number | null) { if (location.hostname === 'localhost') this._dateOverride = value; }
  private stockholmDate(): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  getEffectiveDecemberDay(): number {
    if (this._dateOverride !== null) return this._dateOverride;
    const date = this.stockholmDate();
    return date.startsWith('2026-12-') ? Number(date.slice(-2)) : 0;
  }
  isDayUnlocked(day: number): boolean {
    if (this.devMode) return true;
    if (this.dateOverride !== null) return day <= this.dateOverride;
    return this.stockholmDate() >= `2026-12-${String(day).padStart(2, '0')}`;
  }
  getCompletedDays(): number[] { return [...this.completedDays].sort((a, b) => a - b); }
  getCompletedCount(): number { return this.completedDays.size; }
  isDayCompleted(day: number): boolean { return this.completedDays.has(day); }
  isCalendarComplete(): boolean { return this.completedDays.size === 24; }
  isChristmasDay(): boolean { return this.stockholmDate() >= '2026-12-25'; }
  isFullyUnlocked(): boolean { return this.isCalendarComplete() || this.isChristmasDay(); }
  // Cloud completion is loaded by ChallengeHost after the API commits the result.
  markDayComplete(_day: number): void { this.loadCloudProgress(); }
  markAllDaysComplete(): void {
    if (location.hostname === 'localhost') for (let day = 1; day <= 24; day++) this.completedDays.add(day);
  }
  clearAllProgress(): void {
    if (location.hostname === 'localhost') { this.completedDays.clear(); this.gameStats.clear(); }
  }
  saveGameStats(key: number | string, stats: any): void { this.gameStats.set(String(key), stats); }
  getGameStats(key: number | string): any | null { return this.gameStats.get(String(key)) ?? null; }
}
