import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, Check, Play } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface TomteWhackConfig {
  targetScore?: number; // Points needed to win. Default 150
  duration?: number; // Seconds on the candle. Default 40
  rows?: number; // Rows of snow mounds (2-4). Default 3
  cols?: number; // Columns of snow mounds (2-4). Default 3
  speed?: number; // Pace multiplier (0.6-2). Default 1
  endless?: boolean; // Survival mode: no target or timer, 3 lives, ever faster. Never completes
}

type Kind = 'tomte' | 'golden' | 'coal' | 'goat';
type Phase = 'ready' | 'countdown' | 'playing' | 'won' | 'over';

interface Popup {
  id: number;
  text: string;
  bad: boolean;
  big: boolean;
}

interface Hole {
  id: number;
  kind: Kind;
  up: boolean;
  hit: boolean;
  downAt: number;
  popups: Popup[];
}

const POINTS: Record<Kind, number> = { tomte: 10, golden: 30, coal: -10, goat: -15 };
const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.51];

/**
 * "Whack-a-Tomte" - Swedish tomtar pop out of snow mounds in front of a red cottage.
 * Bonk the tomtar (golden ones are worth extra), leave the coal and the julbock alone.
 * Reach the target score before the candle burns down. Consecutive hits build a combo.
 *
 * The timer runs in a requestAnimationFrame loop outside Angular; the zone is only entered
 * when something the template shows changes (a tomte pops up or hides, the seconds tick).
 */
@Component({
  selector: 'app-tomte-whack-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './tomte-whack-challenge.html',
  styleUrl: './tomte-whack-challenge.scss',
})
export class TomteWhackChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: TomteWhackConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  @ViewChild('wax', { static: true }) waxRef!: ElementRef<HTMLDivElement>;

  readonly Check = Check;
  readonly Play = Play;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);
  private zone = inject(NgZone);
  private translate = inject(TranslateService);

  phase: Phase = 'ready';
  holes: Hole[] = [];
  rows = 3;
  cols = 3;
  target = 150;
  duration = 40;
  score = 0;
  combo = 0;
  bestCombo = 0;
  bestScore: number | null = null;
  secondsLeft = 40;
  countdown = 3;
  shake = false;
  lowTime = false;
  endless = false;
  lives = 3;
  newBest = false;
  readonly lifeSlots = [0, 1, 2];

  private speed = 1;
  private elapsed = 0;
  private nextSpawn = 0;
  private cdT = 0;
  private raf = 0;
  private last = 0;
  private lastHole = -1;
  private popupId = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  private readonly onKey = (e: KeyboardEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target && (target.closest('input') || target.closest('textarea'))) return;
    if (/^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i < this.holes.length && this.phase === 'playing') {
        e.preventDefault();
        this.zone.run(() => this.whack(i));
      }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && (this.phase === 'ready' || this.phase === 'over')) {
      if (target && target.closest('button')) return;
      e.preventDefault();
      this.zone.run(() => this.start());
    }
  };

  private readonly onVisibility = () => {
    this.last = performance.now();
  };

  /** Width/height ratio of the mound grid, used by CSS to fit it on screen */
  get gridRatio(): number {
    return (this.cols / this.rows) * (120 / 104);
  }

  get progress(): number {
    return Math.min(100, (this.score / this.target) * 100);
  }

  get multiplier(): number {
    return Math.min(3, 1 + Math.floor(this.combo / 5));
  }

  ngOnInit(): void {
    this.endless = !!this.config?.endless;
    this.rows = Math.round(Math.max(2, Math.min(4, this.config?.rows ?? 3)));
    this.cols = Math.round(Math.max(2, Math.min(4, this.config?.cols ?? 3)));
    this.target = Math.max(30, this.config?.targetScore ?? 150);
    this.duration = Math.max(15, Math.min(120, this.config?.duration ?? 40));
    this.speed = Math.max(0.6, Math.min(2, this.config?.speed ?? 1));
    this.secondsLeft = Math.ceil(this.duration);
    const key = this.day ?? this.levelId;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestScore = stats?.bestScore ?? null;
    this.holes = Array.from({ length: this.rows * this.cols }, (_, id) => ({
      id,
      kind: 'tomte' as Kind,
      up: false,
      hit: false,
      downAt: 0,
      popups: [],
    }));
  }

  ngAfterViewInit(): void {
    this.setWax(1);
    this.zone.runOutsideAngular(() => {
      window.addEventListener('keydown', this.onKey);
      document.addEventListener('visibilitychange', this.onVisibility);
      this.last = performance.now();
      const loop = (now: number) => {
        this.raf = requestAnimationFrame(loop);
        if (document.hidden) {
          this.last = now;
          return;
        }
        const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        this.tick(dt);
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  start(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.elapsed = 0;
    this.lives = 3;
    this.newBest = false;
    this.lowTime = false;
    this.secondsLeft = Math.ceil(this.duration);
    this.holes.forEach((h) => {
      h.up = false;
      h.hit = false;
      h.popups = [];
    });
    this.setWax(1);
    this.countdown = 3;
    this.cdT = 2.1;
    this.phase = 'countdown';
    this.sound.bell(659.25, 0.12);
  }

  whack(i: number, event?: Event): void {
    event?.preventDefault();
    if (this.phase !== 'playing') return;
    const h = this.holes[i];
    if (!h || !h.up || h.hit) return;
    h.hit = true;
    h.downAt = this.elapsed + 0.45;
    const base = POINTS[h.kind];

    if (base > 0) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const pts = base * this.multiplier;
      this.score += pts;
      this.addPopup(h, `+${pts}`, false, h.kind === 'golden' || this.multiplier > 1);
      if (h.kind === 'golden') this.sound.jingle();
      else this.sound.bell(NOTES[Math.min(this.combo - 1, NOTES.length - 1)], 0.14);
    } else {
      this.combo = 0;
      if (this.endless) {
        this.addPopup(h, '💔', true, false);
        this.loseLife();
      } else {
        this.score = Math.max(0, this.score + base);
        this.addPopup(h, `${base}`, true, false);
      }
      this.sound.thud();
      this.shake = true;
      this.later(() => (this.shake = false), 380);
    }

    if (!this.endless && this.score >= this.target) this.win();
  }

  showReward(): void {
    this.completed.emit();
  }

  private tick(dt: number): void {
    if (this.phase === 'countdown') {
      this.cdT -= dt;
      const v = Math.max(1, Math.ceil(this.cdT / 0.7));
      if (this.cdT <= 0) {
        this.zone.run(() => {
          this.phase = 'playing';
          this.nextSpawn = 0.2;
        });
        this.sound.bell(1046.5, 0.16);
      } else if (v !== this.countdown) {
        this.zone.run(() => (this.countdown = v));
        this.sound.bell(659.25, 0.12);
      }
      return;
    }
    if (this.phase !== 'playing') return;

    this.elapsed += dt;
    const left = this.endless ? Infinity : Math.max(0, this.duration - this.elapsed);
    if (!this.endless) this.setWax(left / this.duration);
    const secs = Math.ceil(left);
    let dirty = secs !== this.secondsLeft;

    // Hide tomtar whose time is up
    for (const h of this.holes) {
      if (h.up && this.elapsed >= h.downAt) {
        h.up = false;
        dirty = true;
        if (!h.hit && POINTS[h.kind] > 0 && this.combo > 0) this.combo = 0;
        if (this.endless && !h.hit && h.kind === 'tomte') {
          this.zone.run(() => {
            this.addPopup(h, this.translate.instant('challenges.tomteWhack.missed'), true, false);
            this.loseLife();
          });
          if (this.phase !== 'playing') return;
        }
      }
    }

    // Pop up new ones - faster and more at once as the candle burns down
    if (this.elapsed >= this.nextSpawn) {
      // Endless mode keeps ramping: progress passes 1 after 50 s and keeps growing (capped)
      const p = this.endless ? Math.min(1.8, this.elapsed / 50) : this.elapsed / this.duration;
      const interval = Math.max(0.3, (0.9 - 0.42 * Math.min(1, p) - 0.15 * Math.max(0, p - 1)) / this.speed);
      this.nextSpawn = this.elapsed + interval * (0.7 + Math.random() * 0.6);
      if (this.spawn(p)) dirty = true;
    }

    if (!this.endless && left <= 0) {
      this.zone.run(() => this.timeUp());
      return;
    }
    if (dirty) {
      this.zone.run(() => {
        this.secondsLeft = secs;
        this.lowTime = left <= 10;
      });
    }
  }

  private spawn(p: number): boolean {
    const extra = this.holes.length > 9 ? 1 : 0;
    const maxUp = Math.min(this.holes.length - 1, 2 + Math.floor(Math.min(p, 1.4) * 1.5) + extra);
    const upCount = this.holes.filter((h) => h.up).length;
    if (upCount >= maxUp) return false;
    const free = this.holes.filter((h) => !h.up && h.id !== this.lastHole);
    if (!free.length) return false;
    const h = free[Math.floor(Math.random() * free.length)];
    const r = Math.random();
    let kind: Kind = 'tomte';
    if (r < 0.06) kind = 'golden';
    else if (r < 0.2) kind = 'coal';
    else if (r < 0.31 && p > 0.12) kind = 'goat';
    const upTime = ((kind === 'golden' ? 0.95 : 1.3) - 0.5 * Math.min(1, p) - 0.15 * Math.max(0, p - 1)) / this.speed;
    h.kind = kind;
    h.hit = false;
    h.up = true;
    h.downAt = this.elapsed + Math.max(0.55, upTime);
    this.lastHole = h.id;
    return true;
  }

  private win(): void {
    this.phase = 'won';
    this.saveStats();
    this.sound.fanfare();
    this.setWax(Math.max(0, (this.duration - this.elapsed) / this.duration));
    // Every tomte comes out to dance
    this.later(() => {
      this.holes.forEach((h, i) => {
        h.kind = i % 4 === 1 ? 'golden' : 'tomte';
        h.hit = false;
        h.up = true;
      });
    }, 350);
    this.later(() => this.completed.emit(), 2000);
  }

  private loseLife(): void {
    if (this.phase !== 'playing') return;
    this.lives = Math.max(0, this.lives - 1);
    this.sound.thud();
    this.shake = true;
    this.later(() => (this.shake = false), 380);
    if (this.lives <= 0) {
      const prevBest = this.bestScore;
      this.timeUp();
      this.newBest = this.score > 0 && (prevBest === null || this.score > prevBest);
    }
  }

  private timeUp(): void {
    this.phase = 'over';
    this.secondsLeft = 0;
    this.holes.forEach((h) => (h.up = false));
    this.saveStats();
    this.sound.thud();
  }

  private saveStats(): void {
    const best = this.bestScore === null ? this.score : Math.max(this.bestScore, this.score);
    this.bestScore = best;
    const key = this.day ?? this.levelId;
    if (key) {
      const prev = this.stateService.getGameStats(key) ?? {};
      this.stateService.saveGameStats(key, {
        ...prev,
        bestScore: best,
        bestCombo: Math.max(prev.bestCombo ?? 0, this.bestCombo),
      });
    }
  }

  private addPopup(h: Hole, text: string, bad: boolean, big: boolean): void {
    const popup = { id: ++this.popupId, text, bad, big };
    h.popups = [...h.popups, popup];
    this.later(() => (h.popups = h.popups.filter((p) => p.id !== popup.id)), 900);
  }

  private setWax(fraction: number): void {
    const el = this.waxRef?.nativeElement;
    if (el) el.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }
}
