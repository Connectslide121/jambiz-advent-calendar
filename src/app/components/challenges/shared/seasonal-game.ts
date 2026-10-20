import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export type GamePhase = 'ready' | 'playing' | 'won' | 'lost';

/** Shared lifecycle only. Each game owns its rules and input. */
@Directive()
export abstract class SeasonalGame implements OnDestroy {
  @Input() config: Record<string, unknown> = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();
  protected sound = inject(SoundService);
  protected translate = inject(TranslateService);
  protected state = inject(CalendarStateService);
  protected host = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private raf = 0;
  private subscriptions: Subscription[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  phase: GamePhase = 'playing';
  score = 0;
  bestScore: number | null = null;
  status = '';
  get won(): boolean {
    return this.phase === 'won';
  }
  protected get statsKey(): number | string | undefined {
    return this.day ?? this.levelId;
  }

  protected watchLanguage(restart: () => void): void {
    this.subscriptions.push(this.translate.onLangChange.subscribe(restart));
  }
  protected resetBase(phase: GamePhase = 'playing'): void {
    this.cancelPending();
    this.phase = phase;
    this.score = 0;
    this.status = '';
    this.bestScore =
      this.statsKey === undefined
        ? null
        : (this.state.getGameStats(this.statsKey)?.bestScore ?? null);
  }
  protected finish(score: number, stats: Record<string, number> = {}): void {
    if (this.won) return;
    this.phase = 'won';
    this.score = Math.max(0, Math.round(score));
    this.bestScore = Math.max(this.bestScore ?? 0, this.score);
    if (this.statsKey !== undefined)
      this.state.saveGameStats(this.statsKey, {
        ...this.state.getGameStats(this.statsKey),
        ...stats,
        bestScore: this.bestScore,
      });
    this.sound.fanfare();
    this.later(() => this.completed.emit(), 1900);
  }
  protected lose(key: string): void {
    this.phase = 'lost';
    this.status = this.translate.instant(key);
    this.sound.thud();
  }
  protected message(key: string, params?: Record<string, unknown>): void {
    this.status = this.translate.instant(key, params);
  }
  protected later(fn: () => void, delay: number): void {
    this.timers.push(setTimeout(fn, delay));
  }
  protected startLoop(step: (dt: number) => void): void {
    cancelAnimationFrame(this.raf);
    let last = performance.now();
    this.zone.runOutsideAngular(() => {
      const frame = (now: number) => {
        const dt = Math.min(0.04, Math.max(0, (now - last) / 1000));
        last = now;
        if (!document.hidden && this.phase === 'playing') {
          step(dt);
          this.cdr.detectChanges();
        }
        if (this.phase === 'playing') this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    });
  }
  protected gameKey(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    return (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !target?.closest('input, textarea, select, [contenteditable="true"]')
    );
  }
  protected focusBoard(): void {
    this.host.nativeElement.querySelector<HTMLElement>('[data-game-board]')?.focus();
  }
  private cancelPending(): void {
    cancelAnimationFrame(this.raf);
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
  ngOnDestroy(): void {
    this.cancelPending();
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
