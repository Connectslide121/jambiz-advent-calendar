import { Injectable, inject, isDevMode } from '@angular/core';
import { BackendService } from './backend.service';
import { CALENDAR_DAYS } from '../config/calendar-config';
import { CalendarDayConfig } from '../models/calendar.models';

@Injectable({ providedIn: 'root' })
export class CalendarStateService {
  private readonly DEV_MODE_KEY = 'jambiz-advent-dev-mode';
  private readonly DEV_TOOLS_KEY = 'jambiz-advent-devtools-visible';
  private _devToolsVisible = this.readPreference(this.DEV_TOOLS_KEY);
  private backend = inject(BackendService);
  private completedDays = new Set<number>();
  private gameStats = new Map<string, any>();
  private _devMode = false;
  private _dateOverride: number | null = null;
  private officialDays: CalendarDayConfig[] | null = null;
  previewLoading = false;
  previewError = false;

  private get localPreviewAllowed(): boolean { return isDevMode() && location.hostname === 'localhost'; }
  private readPreference(key: string): boolean {
    if (!this.localPreviewAllowed) return false;
    try { return localStorage.getItem(key) === 'true'; }
    catch { return false; }
  }
  private writePreference(key: string, value: boolean): void {
    try { localStorage.setItem(key, String(value)); }
    catch { /* Keep the current session usable when browser storage is unavailable. */ }
  }
  get devToolsVisible(): boolean { return this._devToolsVisible; }
  set devToolsVisible(visible: boolean) {
    if (!this.localPreviewAllowed) return;
    this._devToolsVisible = visible;
    this.writePreference(this.DEV_TOOLS_KEY, visible);
  }
  async restoreDevPreferences(): Promise<void> {
    // Restore after authentication/cloud hydration, before rendering the calendar.
    if (this.backend.player() && this.readPreference(this.DEV_MODE_KEY)) await this.setDevMode(true);
  }

  loadCloudProgress(): void {
    const player = this.backend.player();
    this.completedDays = new Set(player?.days.map(d => d.day) ?? []);
    for (const day of player?.days ?? []) this.gameStats.set(String(day.day), day.stats);
    for (const [key, stats] of Object.entries(player?.extras ?? {})) this.gameStats.set(key, stats);
  }
  get devMode(): boolean { return this._devMode; }
  async toggleDevMode(): Promise<void> { await this.setDevMode(!this.devMode); }
  async setDevMode(enabled: boolean): Promise<void> {
    if (!this.localPreviewAllowed || this.previewLoading || enabled === this.devMode) return;
    this.previewError = false;
    if (!enabled) {
      this._devMode = false;
      this.writePreference(this.DEV_MODE_KEY, false);
      this._dateOverride = null;
      CALENDAR_DAYS.splice(0, CALENDAR_DAYS.length, ...(this.officialDays ?? []));
      this.officialDays = null;
      this.gameStats.clear();
      this.loadCloudProgress();
      return;
    }
    this.previewLoading = true;
    try {
      const response = await fetch('/dev-preview/calendar-2026.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Preview content unavailable');
      const preview = await response.json() as { days: CalendarDayConfig[] };
      if (!Array.isArray(preview.days) || preview.days.length !== 24) throw new Error('Invalid preview calendar');
      this.officialDays = [...CALENDAR_DAYS];
      CALENDAR_DAYS.splice(0, CALENDAR_DAYS.length, ...preview.days);
      this._devMode = true;
      this.writePreference(this.DEV_MODE_KEY, true);
    } catch { this.previewError = true; }
    finally { this.previewLoading = false; }
  }
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
  isFullyUnlocked(): boolean { return this.devMode || this.isCalendarComplete() || this.isChristmasDay(); }
  // Cloud completion is loaded by ChallengeHost after the API commits the result.
  markDayComplete(day: number): void {
    if (this.devMode) this.completedDays.add(day);
    else this.loadCloudProgress();
  }
  markAllDaysComplete(): void {
    if (location.hostname === 'localhost') for (let day = 1; day <= 24; day++) this.completedDays.add(day);
  }
  clearAllProgress(): void {
    if (location.hostname === 'localhost') { this.completedDays.clear(); this.gameStats.clear(); }
  }
  saveGameStats(key: number | string, stats: any): void { this.gameStats.set(String(key), stats); }
  getGameStats(key: number | string): any | null { return this.gameStats.get(String(key)) ?? null; }
}
