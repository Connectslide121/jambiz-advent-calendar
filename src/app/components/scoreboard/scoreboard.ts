import { Component, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, RefreshCw, X } from 'lucide-angular';
import { BackendService, Board } from '../../services/backend.service';
import { CalendarStateService } from '../../services/calendar-state.service';

/** How many players the sidebar shows before "See all" */
const SIDEBAR_ROWS = 10;

@Component({
  selector: 'app-scoreboard', imports: [NgTemplateOutlet, TranslateModule, LucideAngularModule],
  template: `
    <section class="board" aria-labelledby="scoreboard-title">
      <header class="board-head">
        <div class="min-w-0">
          <span class="kicker">{{ 'online.global' | translate }}</span>
          <h2 id="scoreboard-title" class="board-title">{{ 'online.scoreboard' | translate }}</h2>
        </div>
        <button class="refresh" (click)="loadGlobal()" [disabled]="globalLoading()"
          [attr.aria-label]="'online.refresh' | translate" [title]="'online.refresh' | translate">
          <lucide-icon [img]="RefreshCw" class="w-4 h-4" [class.spin]="globalLoading()" [strokeWidth]="2"></lucide-icon>
        </button>
      </header>
      <ng-container
        *ngTemplateOutlet="rows; context: { board: global(), loading: globalLoading(), error: globalError(), limit: SIDEBAR_ROWS }"
      ></ng-container>
      <button class="see-all" (click)="openAll()">
        <span>{{ 'online.showAll' | translate }}</span>
        <span class="arrow" aria-hidden="true">→</span>
      </button>
    </section>

    @if (showAll()) {
      <div class="modal-overlay" (click)="closeAll()">
        <div class="modal-content w-full h-full lg:w-[90vw] lg:max-w-2xl lg:max-h-[90vh] flex flex-col overflow-hidden"
          (click)="$event.stopPropagation()" role="dialog" aria-labelledby="all-boards-title">
          <header class="modal-head">
            <div class="min-w-0">
              <span class="kicker">Jambiz 2026</span>
              <h2 id="all-boards-title" class="modal-title">{{ 'online.scoreboard' | translate }}</h2>
            </div>
            <button (click)="closeAll()" class="close-btn" aria-label="Close">
              <lucide-icon [img]="X" class="w-5 h-5" [strokeWidth]="1.75"></lucide-icon>
            </button>
          </header>

          <!-- Only days that have opened can have results -->
          <div class="day-picker" role="tablist" [attr.aria-label]="'online.ranking' | translate">
            <button role="tab" class="day-chip wide" [class.on]="day() === 'global'" [attr.aria-selected]="day() === 'global'"
              (click)="pick('global')">{{ 'online.global' | translate }}</button>
            @for (d of openDays(); track d) {
              <button role="tab" class="day-chip" [class.on]="day() === d" [attr.aria-selected]="day() === d"
                [attr.aria-label]="'calendar.dayLabel' | translate: { day: d }" (click)="pick(d)">{{ d }}</button>
            }
          </div>

          <div class="flex-1 overflow-y-auto pr-1">
            <ng-container
              *ngTemplateOutlet="rows; context: { board: selected(), loading: selectedLoading(), error: selectedError(), limit: 100 }"
            ></ng-container>
            <p class="board-note">{{ 'online.scoring' | translate }}</p>
          </div>
        </div>
      </div>
    }

    <ng-template #rows let-board="board" let-loading="loading" let-error="error" let-limit="limit">
      @if (loading && !board) { <p class="board-state" role="status">{{ 'online.loading' | translate }}</p> }
      @else if (error) { <p class="board-state" role="alert">{{ 'online.connectionError' | translate }}</p> }
      @else {
        <ol class="rows">
          @for (entry of board?.entries?.slice(0, limit); track entry.id) {
            <li class="row" [class.is-me]="entry.id === backend.player()?.id" [class.is-top]="entry.rank <= 3">
              <span class="rank">{{ entry.rank }}</span>
              <span class="name">{{ entry.displayName }}</span>
              <span class="score">{{ entry.score }} <small>{{ 'online.points' | translate }}</small></span>
            </li>
          } @empty { <li class="board-state">{{ 'online.empty' | translate }}</li> }
        </ol>
      }
    </ng-template>`,
  styles: `
    :host { display: block; pointer-events: auto; }
    .board { padding: 22px; border-radius: var(--radius-lg); background: var(--glass);
      border: 1px solid var(--hairline); backdrop-filter: blur(14px); }
    .board-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding-bottom: 12px; margin-bottom: 4px; border-bottom: 1px solid var(--hairline); }
    .board-title { margin: 4px 0 0; font-family: var(--font-display); font-style: italic; font-weight: 400;
      font-size: 1.35rem; line-height: 1.1; color: var(--color-snow); }
    .refresh { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%;
      color: var(--color-text); background: transparent; border: 1px solid var(--hairline-strong); cursor: pointer;
      transition: background-color 0.25s ease, color 0.25s ease; }
    .refresh:hover:not(:disabled) { background: var(--color-snow); color: var(--color-bg); }
    .refresh:focus-visible, .see-all:focus-visible, .day-chip:focus-visible {
      outline: 2px solid var(--color-frost); outline-offset: 3px; }
    .refresh:disabled { opacity: 0.5; cursor: default; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .board-state { padding: 12px 0; font-size: 0.85rem; color: var(--color-text-muted); }
    .rows { margin: 0; padding: 0; list-style: none; }
    .row { display: grid; grid-template-columns: 1.8rem minmax(0, 1fr) auto; align-items: baseline; gap: 10px;
      padding: 9px 4px; border-bottom: 1px solid var(--hairline); font-size: 0.88rem; }
    .row:last-child { border-bottom: 0; }
    .rank { font-family: var(--font-display); font-style: italic; font-size: 1.05rem; color: var(--color-text-muted);
      font-variant-numeric: tabular-nums; }
    .row.is-top .rank { color: var(--color-candle); }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text); }
    .score { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--color-snow); }
    .score small { font-size: 0.68rem; font-weight: 600; color: var(--color-text-muted); }
    .row.is-me { background: rgba(255, 217, 154, 0.06); border-radius: 10px; }
    .row.is-me .name { color: var(--color-candle); font-weight: 700; }
    .see-all { width: 100%; display: flex; align-items: center; justify-content: space-between; margin-top: 8px;
      padding: 12px 2px 0; border: 0; border-top: 1px solid var(--hairline); background: none; cursor: pointer;
      font-weight: 700; font-size: 0.88rem; color: var(--color-snow); transition: color 0.25s ease; }
    .see-all .arrow { transition: transform 0.3s var(--ease-out); }
    .see-all:hover { color: var(--color-candle); }
    .see-all:hover .arrow { transform: translateX(3px); }
    .day-picker { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; flex-shrink: 0; }
    .day-chip { min-width: 2.4rem; height: 2.4rem; padding: 0 10px; border-radius: 999px; cursor: pointer;
      font-family: var(--font-display); font-style: italic; font-size: 1rem; color: var(--color-text);
      background: transparent; border: 1px solid var(--hairline); transition: all 0.2s ease; }
    .day-chip.wide { font-family: var(--font-sans); font-style: normal; font-weight: 700; font-size: 0.8rem;
      padding: 0 16px; }
    .day-chip:hover { border-color: var(--hairline-strong); }
    .day-chip.on { background: var(--color-snow); border-color: var(--color-snow); color: var(--color-bg); }
    .board-note { margin: 16px 0 0; padding-top: 12px; border-top: 1px solid var(--hairline);
      font-size: 0.75rem; line-height: 1.55; color: var(--color-text-muted); }
  `,
})
export class Scoreboard {
  readonly backend = inject(BackendService);
  private readonly state = inject(CalendarStateService);
  readonly RefreshCw = RefreshCw;
  readonly X = X;
  readonly SIDEBAR_ROWS = SIDEBAR_ROWS;

  readonly global = signal<Board | null>(null);
  readonly globalLoading = signal(false);
  readonly globalError = signal(false);

  readonly showAll = signal(false);
  readonly day = signal<'global' | number>('global');
  readonly selected = signal<Board | null>(null);
  readonly selectedLoading = signal(false);
  readonly selectedError = signal(false);

  private globalGeneration = 0;
  private selectedGeneration = 0;

  constructor() {
    effect(() => {
      this.backend.player();
      void this.loadGlobal();
    });
  }

  /** Days that have opened so far; later days cannot have results yet */
  openDays(): number[] {
    return Array.from({ length: 24 }, (_, i) => i + 1).filter(d => this.state.isDayUnlocked(d));
  }

  async loadGlobal(): Promise<void> {
    const generation = ++this.globalGeneration;
    this.globalLoading.set(true); this.globalError.set(false);
    try {
      const board = await this.backend.request<Board>('/leaderboards/global');
      if (generation === this.globalGeneration) this.global.set(board);
    } catch { if (generation === this.globalGeneration) this.globalError.set(true); }
    finally { if (generation === this.globalGeneration) this.globalLoading.set(false); }
  }

  openAll(): void {
    this.showAll.set(true);
    void this.pick('global');
  }

  closeAll(): void { this.showAll.set(false); }

  async pick(day: 'global' | number): Promise<void> {
    this.day.set(day);
    const generation = ++this.selectedGeneration;
    // The overall board is already loaded for the sidebar
    if (day === 'global' && this.global()) {
      this.selected.set(this.global()); this.selectedError.set(false); this.selectedLoading.set(false);
      return;
    }
    this.selected.set(null); this.selectedLoading.set(true); this.selectedError.set(false);
    try {
      const board = await this.backend.request<Board>(day === 'global' ? '/leaderboards/global' : `/leaderboards/days/${day}`);
      if (generation === this.selectedGeneration) this.selected.set(board);
    } catch { if (generation === this.selectedGeneration) this.selectedError.set(true); }
    finally { if (generation === this.selectedGeneration) this.selectedLoading.set(false); }
  }
}
