import { Injectable, signal } from '@angular/core';
import type { PublicClientApplication } from '@azure/msal-browser';
import { CalendarDayConfig } from '../models/calendar.models';
import { CALENDAR_DAYS } from '../config/calendar-config';

interface RuntimeConfig { tenantId: string; spaClientId: string; apiClientId: string; apiBaseUrl: string; }
export interface PlayerResult {
  id: string; displayName: string;
  extras: Record<string, Record<string, unknown>>;
  days: { day: number; score: number; elapsedSeconds: number; stats: Record<string, unknown> }[];
}
export interface Board {
  entries: { rank: number; id: string; displayName: string; score: number; completedDays: number; elapsedSeconds: number }[];
}

@Injectable({ providedIn: 'root' })
export class BackendService {
  readonly ready = signal(false);
  readonly signedIn = signal(false);
  readonly error = signal('');
  readonly player = signal<PlayerResult | null>(null);
  private msal?: PublicClientApplication;
  private msalLibrary?: typeof import('@azure/msal-browser');
  private config?: RuntimeConfig;
  private get scopes(): string[] { return [`api://${this.config!.apiClientId}/access_as_user`]; }

  async initialize(): Promise<void> {
    try {
      const response = await fetch('app-config.json', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('config');
      this.config = await response.json();
      const c = this.config!;
      if (!c.tenantId || !c.spaClientId || !c.apiClientId || !c.apiBaseUrl) throw new Error('config');
      this.msalLibrary = await import('@azure/msal-browser');
      this.msal = new this.msalLibrary.PublicClientApplication({ auth: {
        clientId: c.spaClientId, authority: `https://login.microsoftonline.com/${c.tenantId}`,
        redirectUri: location.origin, postLogoutRedirectUri: location.origin,
      }, cache: { cacheLocation: 'sessionStorage' } });
      await this.msal.initialize();
      const result = await this.msal.handleRedirectPromise();
      const account = result?.account ?? this.msal.getAllAccounts().find(a => a.tenantId === c.tenantId);
      if (account) {
        this.msal.setActiveAccount(account);
        this.signedIn.set(true);
        await this.refresh();
      }
    } catch { this.error.set('online.connectionError'); }
    finally { this.ready.set(true); }
  }
  async login(): Promise<void> {
    this.error.set('');
    if (!this.msal) { this.error.set('online.configError'); return; }
    try { await this.msal.loginRedirect({ scopes: this.scopes, prompt: 'select_account' }); }
    catch { this.error.set('online.loginError'); }
  }
  async logout(): Promise<void> { await this.msal?.logoutRedirect(); }
  async request<T>(path: string, body?: unknown): Promise<T> {
    if (!this.msal || !this.config) throw new Error('online.configError');
    let accessToken: string;
    try { accessToken = (await this.msal.acquireTokenSilent({ scopes: this.scopes })).accessToken; }
    catch (error) {
      if (this.msalLibrary && error instanceof this.msalLibrary.InteractionRequiredAuthError) {
        this.signedIn.set(false); this.player.set(null); this.error.set('online.loginError');
      }
      throw error;
    }
    const response = await fetch(`${this.config.apiBaseUrl.replace(/\/$/, '')}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  }
  async refresh(): Promise<void> {
    const result = await this.request<{ days: CalendarDayConfig[]; player: PlayerResult }>('/calendar');
    CALENDAR_DAYS.splice(0, CALENDAR_DAYS.length, ...result.days);
    this.player.set(result.player); this.error.set('');
  }
  async startRun(day: number): Promise<string> {
    return (await this.request<{ id: string }>(`/days/${day}/attempts`, {})).id;
  }
  async complete(attemptId: string, stats: unknown): Promise<void> {
    await this.request('/attempts/complete', { attemptId, stats });
    await this.refresh();
  }
  async saveExtra(levelId: string, stats: unknown): Promise<void> {
    this.player.set(await this.request<PlayerResult>('/me/extras', { levelId, stats }));
  }
}
