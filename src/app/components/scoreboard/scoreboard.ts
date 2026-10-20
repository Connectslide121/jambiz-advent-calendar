import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BackendService, Board } from '../../services/backend.service';

@Component({
  selector: 'app-scoreboard', imports: [FormsModule, TranslateModule],
  template: `
    <section class="card p-4 sm:p-6 my-6" aria-labelledby="scoreboard-title">
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <h2 id="scoreboard-title" class="text-xl flex-1">{{ 'online.scoreboard' | translate }}</h2>
        <label for="board-day">{{ 'online.ranking' | translate }}</label>
        <select id="board-day" class="input" [(ngModel)]="day" (ngModelChange)="load()">
          <option value="global">{{ 'online.global' | translate }}</option>
          @for (d of days; track d) { <option [value]="d">{{ 'calendar.dayLabel' | translate: { day: d } }}</option> }
        </select>
        <button class="btn btn-outline" (click)="load()" [disabled]="loading()">{{ 'online.refresh' | translate }}</button>
      </div>
      <p class="text-text-muted text-sm mb-3">{{ 'online.scoring' | translate }}</p>
      @if (loading()) { <p role="status">{{ 'online.loading' | translate }}</p> }
      @else if (error()) { <p role="alert">{{ 'online.connectionError' | translate }}</p> }
      @else {
        <ol>
          @for (entry of board()?.entries; track entry.id) {
            <li class="flex gap-3 py-2 border-b border-white/10" [class.text-gold]="entry.id === backend.player()?.id">
              <span>{{ entry.rank }}.</span><span class="flex-1 break-words min-w-0">{{ entry.displayName }}</span>
              <span>{{ entry.score }} {{ 'online.points' | translate }}</span>
            </li>
          } @empty { <li>{{ 'online.empty' | translate }}</li> }
        </ol>
      }
    </section>`,
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
