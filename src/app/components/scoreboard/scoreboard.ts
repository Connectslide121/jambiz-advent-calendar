import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, RefreshCw } from 'lucide-angular';
import { BackendService, Board } from '../../services/backend.service';

@Component({
  selector: 'app-scoreboard', imports: [FormsModule, TranslateModule, LucideAngularModule],
  template: `
    <section class="board" aria-labelledby="scoreboard-title">
      <header class="board-head">
        <span class="kicker">Jambiz 2026</span>
        <h2 id="scoreboard-title" class="board-title">{{ 'online.scoreboard' | translate }}</h2>
      </header>
      <div class="board-tools">
        <label for="board-day" class="sr-only">{{ 'online.ranking' | translate }}</label>
        <select id="board-day" class="input h-10 flex-1 min-w-0" [(ngModel)]="day" (ngModelChange)="load()">
          <option value="global">{{ 'online.global' | translate }}</option>
          @for (d of days; track d) { <option [value]="d">{{ 'calendar.dayLabel' | translate: { day: d } }}</option> }
        </select>
        <button class="refresh" (click)="load()" [disabled]="loading()"
          [attr.aria-label]="'online.refresh' | translate" [title]="'online.refresh' | translate">
          <lucide-icon [img]="RefreshCw" class="w-4 h-4" [class.spin]="loading()" [strokeWidth]="2"></lucide-icon>
        </button>
      </div>
      @if (loading() && !board()) { <p class="board-state" role="status">{{ 'online.loading' | translate }}</p> }
      @else if (error()) { <p class="board-state" role="alert">{{ 'online.connectionError' | translate }}</p> }
      @else {
        <ol class="rows">
          @for (entry of board()?.entries; track entry.id) {
            <li class="row" [class.is-me]="entry.id === backend.player()?.id" [class.is-top]="entry.rank <= 3">
              <span class="rank">{{ entry.rank }}</span>
              <span class="name">{{ entry.displayName }}</span>
              <span class="score">{{ entry.score }}</span>
            </li>
          } @empty { <li class="board-state">{{ 'online.empty' | translate }}</li> }
        </ol>
      }
      <p class="board-note">{{ 'online.scoring' | translate }}</p>
    </section>`,
  styles: `
    :host { display: block; pointer-events: auto; }
    .board { padding: 22px; border-radius: var(--radius-lg); background: var(--glass);
      border: 1px solid var(--hairline); backdrop-filter: blur(14px); }
    .board-title { margin: 4px 0 0; font-family: var(--font-display); font-style: italic; font-weight: 400;
      font-size: 1.35rem; line-height: 1.1; color: var(--color-snow); }
    .board-tools { display: flex; gap: 8px; margin: 14px 0 6px; }
    .refresh { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
      color: var(--color-text); background: transparent; border: 1px solid var(--hairline-strong); cursor: pointer;
      transition: background-color 0.25s ease, color 0.25s ease; }
    .refresh:hover:not(:disabled) { background: var(--color-snow); color: var(--color-bg); }
    .refresh:focus-visible { outline: 2px solid var(--color-frost); outline-offset: 3px; }
    .refresh:disabled { opacity: 0.5; cursor: default; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .board-state { padding: 12px 0; font-size: 0.85rem; color: var(--color-text-muted); }
    .rows { margin: 0; padding: 0; list-style: none; max-height: 360px; overflow-y: auto; }
    .row { display: grid; grid-template-columns: 1.8rem minmax(0, 1fr) auto; align-items: baseline; gap: 10px;
      padding: 9px 4px; border-bottom: 1px solid var(--hairline); font-size: 0.88rem; }
    .row:last-child { border-bottom: 0; }
    .rank { font-family: var(--font-display); font-style: italic; font-size: 1.05rem; color: var(--color-text-muted);
      font-variant-numeric: tabular-nums; }
    .row.is-top .rank { color: var(--color-candle); }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text); }
    .score { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--color-snow); }
    .row.is-me { background: rgba(255, 217, 154, 0.06); border-radius: 10px; }
    .row.is-me .name { color: var(--color-candle); font-weight: 700; }
    .board-note { margin: 12px 0 0; padding-top: 12px; border-top: 1px solid var(--hairline);
      font-size: 0.72rem; line-height: 1.5; color: var(--color-text-muted); }
  `,
})
export class Scoreboard {
  readonly backend = inject(BackendService);
  readonly RefreshCw = RefreshCw;
  readonly days = Array.from({ length: 24 }, (_, i) => i + 1);
  day = 'global'; readonly loading = signal(false); readonly error = signal(false);
  readonly board = signal<Board | null>(null);
  private generation = 0;
  constructor() {
    effect(() => {
      this.backend.player();
      void this.load();
    });
  }
  async load(): Promise<void> {
    const generation = ++this.generation;
    this.loading.set(true); this.error.set(false);
    try {
      const board = await this.backend.request<Board>(this.day === 'global' ? '/leaderboards/global' : `/leaderboards/days/${this.day}`);
      if (generation === this.generation) this.board.set(board);
    } catch { if (generation === this.generation) this.error.set(true); }
    finally { if (generation === this.generation) this.loading.set(false); }
  }
}
