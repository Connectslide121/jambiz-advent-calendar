import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BackendService, Board } from '../../services/backend.service';

@Component({
  selector: 'app-scoreboard', imports: [FormsModule, TranslateModule],
  template: `
    <section class="board" aria-labelledby="scoreboard-title">
      <header class="board-head">
        <div class="min-w-0">
          <span class="kicker">Jambiz 2026</span>
          <h2 id="scoreboard-title" class="board-title">{{ 'online.scoreboard' | translate }}</h2>
        </div>
        <div class="board-tools">
          <label for="board-day" class="sr-only">{{ 'online.ranking' | translate }}</label>
          <select id="board-day" class="input h-10 w-full sm:w-52" [(ngModel)]="day" (ngModelChange)="load()">
            <option value="global">{{ 'online.global' | translate }}</option>
            @for (d of days; track d) { <option [value]="d">{{ 'calendar.dayLabel' | translate: { day: d } }}</option> }
          </select>
          <button class="btn btn-outline h-10 shrink-0" (click)="load()" [disabled]="loading()">{{ 'online.refresh' | translate }}</button>
        </div>
      </header>
      <p class="board-note">{{ 'online.scoring' | translate }}</p>
      @if (loading()) { <p class="board-state" role="status">{{ 'online.loading' | translate }}</p> }
      @else if (error()) { <p class="board-state" role="alert">{{ 'online.connectionError' | translate }}</p> }
      @else {
        <ol class="rows">
          @for (entry of board()?.entries; track entry.id) {
            <li class="row" [class.is-me]="entry.id === backend.player()?.id" [class.is-top]="entry.rank <= 3">
              <span class="rank">{{ entry.rank }}</span>
              <span class="name">{{ entry.displayName }}</span>
              <span class="score">{{ entry.score }} <small>{{ 'online.points' | translate }}</small></span>
            </li>
          } @empty { <li class="board-state">{{ 'online.empty' | translate }}</li> }
        </ol>
      }
    </section>`,
  styles: `
    :host { display: block; pointer-events: auto; margin: clamp(28px, 4vw, 44px) 0 12px; }
    .board { padding: clamp(18px, 3vw, 28px); border-radius: var(--radius-lg); background: var(--glass);
      border: 1px solid var(--hairline); backdrop-filter: blur(14px); }
    .board-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 14px 20px;
      padding-bottom: 14px; border-bottom: 1px solid var(--hairline); }
    .board-title { margin: 4px 0 0; font-family: var(--font-display); font-style: italic; font-weight: 400;
      font-size: clamp(1.4rem, 3vw, 1.9rem); color: var(--color-snow); }
    .board-tools { display: flex; gap: 10px; width: 100%; }
    @media (min-width: 640px) { .board-tools { width: auto; } }
    .board-note { margin: 14px 0 6px; font-size: 0.8rem; line-height: 1.55; color: var(--color-text-muted); }
    .board-state { padding: 14px 0; color: var(--color-text-muted); }
    .rows { margin: 0; padding: 0; list-style: none; }
    .row { display: grid; grid-template-columns: 2.4rem minmax(0, 1fr) auto; align-items: baseline; gap: 12px;
      padding: 12px 4px; border-bottom: 1px solid var(--hairline); }
    .row:last-child { border-bottom: 0; }
    .rank { font-family: var(--font-display); font-style: italic; font-size: 1.15rem; color: var(--color-text-muted);
      font-variant-numeric: tabular-nums; }
    .row.is-top .rank { color: var(--color-candle); }
    .name { overflow-wrap: anywhere; color: var(--color-text); }
    .score { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--color-snow); }
    .score small { font-size: 0.7rem; font-weight: 600; color: var(--color-text-muted); }
    .row.is-me { background: rgba(255, 217, 154, 0.06); border-radius: 10px; }
    .row.is-me .name { color: var(--color-candle); font-weight: 700; }
  `,

})
export class Scoreboard {
  readonly backend = inject(BackendService);
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
