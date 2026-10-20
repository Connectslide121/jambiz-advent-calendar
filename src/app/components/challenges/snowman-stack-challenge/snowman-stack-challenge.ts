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
import { LucideAngularModule, Check, RotateCcw } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface SnowmanStackConfig {
  height?: number; // Snowballs to stack (2-12). Default 3
  speed?: number; // Swing speed multiplier (0.5-2.5). Default 1
  tolerance?: number; // How far off-centre a ball may land and still stick, as a fraction of the ball below (0.25-0.95). Default 0.6
  endless?: boolean; // Endless snow tower: no target, stack until all lives are lost. Score = height. Never completes
}

type Phase = 'playing' | 'lost' | 'won';
type BallState = 'hanging' | 'falling' | 'stacked' | 'tumbling' | 'resting';

interface Fleck {
  a: number;
  d: number;
  s: number;
  white: boolean;
}

interface Ball {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  squash: number;
  squashV: number;
  state: BallState;
  born: number;
  restT: number;
  flecks: Fleck[];
}

interface Particle {
  kind: 'puff' | 'spark' | 'confetti';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
}

interface FloatText {
  text: string;
  x: number;
  y: number;
  t: number;
  color: string;
  big: boolean;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  v: number;
  p: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  p: number;
}

interface Needle {
  t: number;
  a: number;
  l: number;
  c: string;
}

/** World units of snowy yard visible below the ground line */
const GROUND_PAD = 78;
const GRAVITY = 2300;
const PERFECT = 0.12;
/** Seconds into the win sequence when each decoration appears */
const WIN_STEPS = { eyes: 0.3, nose: 0.55, smile: 0.8, buttons: 1.05, arms: 1.25, scarf: 1.45, hat: 1.7, land: 2.05 };
const CONFETTI = ['#e0475b', '#f7c873', '#3aae8a', '#cfe6ff', '#ff9f43'];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeOutBack = (t: number) => {
  const c = 1.9;
  const x = clamp(t, 0, 1) - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};

/**
 * "Build a Snowman" - a snowball swings from a snowy pine branch; tap to drop it onto the stack.
 * Land it centred to make it stick (perfect = sparkles + bonus), land it off-centre and the
 * stack wobbles, miss by too much and it tumbles off (one of three lives).
 * When the snowman is tall enough he gets dressed up automatically.
 *
 * Everything is drawn on a canvas; the game loop runs outside Angular and only re-enters the
 * zone for the handful of values the template shows.
 */
@Component({
  selector: 'app-snowman-stack-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './snowman-stack-challenge.html',
  styleUrl: './snowman-stack-challenge.scss',
})
export class SnowmanStackChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: SnowmanStackConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Check = Check;
  readonly RotateCcw = RotateCcw;
  readonly maxLives = 3;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);
  private zone = inject(NgZone);
  private translate = inject(TranslateService);

  // ---- Template state -------------------------------------------------------------------
  phase: Phase = 'playing';
  placed = 0;
  lives = 3;
  score = 0;
  bestScore: number | null = null;
  showTip = true;
  celebrating = false;
  targetHeight = 3;
  endless = false;
  newBest = false;
  slots: number[] = [];
  lifeSlots = [0, 1, 2];

  // ---- Engine ---------------------------------------------------------------------------
  private ctx: CanvasRenderingContext2D | null = null;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private S = 1;
  private raf = 0;
  private last = 0;
  private ro?: ResizeObserver;
  private speed = 1;
  private tol = 0.6;
  private baseR = 62;

  private stack: Ball[] = [];
  private current: Ball | null = null;
  private loose: Ball[] = [];
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private flakes: Flake[] = [];
  private stars: Star[] = [];
  private needles: Needle[] = [];
  private sparkles: Star[] = [];

  private time = 0;
  private swingPhase = 0;
  private wobA = 0;
  private wobV = 0;
  private camY = 0;
  private camX = 0;
  private zoom = 1;
  private spawnAt = 0;
  private lostAt = -1;
  private winT = -1;
  private winStart = 0;
  private winFired = new Set<string>();
  private perfectStreak = 0;
  private emitTimer: ReturnType<typeof setTimeout> | null = null;
  private reduced = false;
  private skyGrad: CanvasGradient | null = null;

  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowDown') return;
    const target = e.target instanceof Element ? e.target : null;
    if (target && (target.closest('button') || target.closest('input') || target.closest('textarea'))) return;
    if (this.phase !== 'playing') return;
    e.preventDefault();
    this.drop();
  };

  private readonly onVisibility = () => {
    this.last = performance.now();
  };

  ngOnInit(): void {
    this.endless = !!this.config?.endless;
    this.targetHeight = this.endless ? Infinity : Math.round(clamp(this.config?.height ?? 3, 2, 12));
    this.speed = clamp(this.config?.speed ?? 1, 0.5, 2.5);
    this.tol = clamp(this.config?.tolerance ?? 0.6, 0.25, 0.95);
    this.baseR = this.endless ? 58 : this.targetHeight >= 7 ? 54 : 62;
    this.slots = this.endless ? [] : Array.from({ length: this.targetHeight }, (_, i) => i);
    const key = this.day ?? this.levelId;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestScore = (this.endless ? stats?.bestHeight : stats?.bestScore) ?? null;
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.seedScenery();
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.stageRef.nativeElement);
      this.resize();
      window.addEventListener('keydown', this.onKey);
      document.addEventListener('visibilitychange', this.onVisibility);
      this.last = performance.now();
      this.spawnAt = 0.35;
      const loop = (now: number) => {
        this.raf = requestAnimationFrame(loop);
        if (document.hidden) {
          this.last = now;
          return;
        }
        const dt = Math.min(0.033, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        this.step(dt);
        this.render();
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.emitTimer) clearTimeout(this.emitTimer);
  }

  // ---- Public actions -------------------------------------------------------------------

  onPointer(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    this.drop();
  }

  restart(): void {
    if (this.emitTimer) clearTimeout(this.emitTimer);
    this.emitTimer = null;
    this.stack = [];
    this.loose = [];
    this.current = null;
    this.floats = [];
    this.placed = 0;
    this.lives = this.maxLives;
    this.score = 0;
    this.newBest = false;
    this.phase = 'playing';
    this.celebrating = false;
    this.perfectStreak = 0;
    this.winT = -1;
    this.lostAt = -1;
    this.winFired.clear();
    this.wobA = 0;
    this.wobV = 0;
    this.spawnAt = this.time + 0.35;
  }

  showReward(): void {
    this.completed.emit();
  }

  // ---- Game logic -----------------------------------------------------------------------

  private radiusFor(i: number): number {
    if (this.endless) return this.baseR * Math.max(0.55, 1 - 0.035 * i);
    const n = Math.max(1, this.targetHeight - 1);
    return this.baseR * (1 - 0.45 * (i / n));
  }

  private get viewH(): number {
    return this.H / this.S;
  }

  private get ropeLength(): number {
    return clamp(this.viewH * 0.2, 96, 170);
  }

  private get swingAmp(): number {
    return 0.55;
  }

  private get omega(): number {
    const ramp = Math.min(2.2, 1 + 0.05 * this.placed);
    return ((Math.PI * 2) / 2.5) * this.speed * ramp;
  }

  /** World y of the rope's pivot on the branch (screen-anchored near the top) */
  private get pivotY(): number {
    return this.camY + this.viewH / this.zoom - GROUND_PAD - 34;
  }

  private spawn(): void {
    const r = this.radiusFor(this.placed);
    this.current = this.makeBall(0, this.pivotY - this.ropeLength - r, r, 'hanging');
    this.current.born = this.time;
    // Start each ball from a random point of the swing so the timing never repeats
    this.swingPhase = Math.random() * Math.PI * 2;
  }

  private makeBall(x: number, y: number, r: number, state: BallState): Ball {
    const flecks: Fleck[] = [];
    for (let i = 0; i < 14; i++) {
      flecks.push({ a: Math.random() * Math.PI * 2, d: Math.sqrt(Math.random()) * 0.85, s: 0.6 + Math.random() * 1.4, white: Math.random() < 0.4 });
    }
    return { x, y, r, vx: 0, vy: 0, rot: 0, vr: 0, squash: 0, squashV: 0, state, born: this.time, restT: 0, flecks };
  }

  private drop(): void {
    const b = this.current;
    if (this.phase !== 'playing' || !b || b.state !== 'hanging' || this.time - b.born < 0.3) return;
    const L = this.ropeLength + b.r;
    const theta = this.swingAmp * Math.sin(this.swingPhase);
    const thetaDot = this.swingAmp * Math.cos(this.swingPhase) * this.omega;
    b.state = 'falling';
    b.vx = L * Math.cos(theta) * thetaDot * 0.08;
    b.vy = 0;
    this.sound.whoosh();
    if (this.showTip) this.zone.run(() => (this.showTip = false));
  }

  private land(b: Ball): void {
    const top = this.stack[this.stack.length - 1];
    const refX = top ? top.x : 0;
    const refR = top ? top.r : this.baseR;
    const allowed = top ? this.tol : Math.min(1.2, this.tol * 1.6);
    const dx = b.x - refX;
    const off = Math.abs(dx) / refR;
    const dir = Math.sign(dx) || 1;

    if (off > allowed) {
      // Too far off - it rolls off the stack
      b.state = 'tumbling';
      b.vx = dir * (170 + 140 * Math.min(off, 2));
      b.vy = top ? 260 : 120;
      b.vr = dir * 6;
      this.loose.push(b);
      this.current = null;
      this.wobV += dir * (top ? 0.9 : 0);
      this.perfectStreak = 0;
      this.puff(b.x, b.y - b.r * 0.6, 10, b.r);
      this.addFloat(this.t('oops'), b.x, b.y + b.r, '#ff8a9a', false);
      this.sound.thud();
      const lives = this.lives - 1;
      this.zone.run(() => (this.lives = lives));
      if (lives <= 0) {
        this.lostAt = performance.now() + 1100;
        if (this.endless) this.saveEndless();
      } else {
        this.spawnAt = this.time + 1.0;
      }
      return;
    }

    const perfect = off <= PERFECT;
    let points: number;
    if (perfect) {
      b.x = refX;
      this.perfectStreak++;
      points = 100 + 50 * Math.min(this.perfectStreak - 1, 4);
      this.sparkleBurst(b.x, b.y, b.r);
      this.addFloat(this.endless ? this.t('perfect') : `${this.t('perfect')} +${points}`, b.x, b.y + b.r + 10, '#ffd772', true);
      this.sound.jingle();
    } else {
      // A slightly off ball settles a little towards the middle
      b.x = refX + dx * 0.75;
      this.perfectStreak = 0;
      points = Math.round(40 + 50 * (1 - off / allowed));
      const wobbly = off > allowed * 0.6;
      const label = this.t(wobbly ? 'wobbly' : 'nice');
      this.addFloat(this.endless ? label : `${label} +${points}`, b.x, b.y + b.r + 10, wobbly ? '#cfe6ff' : '#ffffff', false);
      this.wobV += dir * (0.5 + off * 2.6);
    }
    this.wobV += dir * 0.12;
    b.state = 'stacked';
    b.vx = 0;
    b.vy = 0;
    b.squash = 0.2;
    b.squashV = 0;
    this.stack.push(b);
    this.current = null;
    // The ball below gets squished a little too
    if (top) top.squashV -= 1.5;
    this.puff(b.x, b.y - b.r * 0.85, perfect ? 6 : 10, b.r * 0.8);

    const notes = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
    this.sound.bell(notes[Math.min(this.stack.length - 1, notes.length - 1)], 0.16);

    const placed = this.stack.length;
    const score = this.endless ? placed : this.score + points;
    this.zone.run(() => {
      this.placed = placed;
      this.score = score;
    });

    if (placed >= this.targetHeight) {
      this.startWin();
    } else {
      this.spawnAt = this.time + 0.55;
    }
  }

  /** Endless mode: the height reached is the score */
  private saveEndless(): void {
    const height = this.stack.length;
    const key = this.day ?? this.levelId;
    const isBest = height > 0 && (this.bestScore === null || height > this.bestScore);
    const best = this.bestScore === null ? height : Math.max(this.bestScore, height);
    if (key) {
      const prev = this.stateService.getGameStats(key) ?? {};
      this.stateService.saveGameStats(key, { ...prev, bestHeight: best, lastHeight: height });
    }
    this.zone.run(() => {
      this.bestScore = best;
      this.newBest = isBest;
    });
  }

  private startWin(): void {
    this.winT = 0;
    this.winStart = performance.now();
    this.winFired.clear();
    const key = this.day ?? this.levelId;
    const best = this.bestScore === null ? this.score : Math.max(this.bestScore, this.score);
    if (key) {
      const prev = this.stateService.getGameStats(key) ?? {};
      this.stateService.saveGameStats(key, { ...prev, bestScore: best, lastScore: this.score, livesLeft: this.lives });
    }
    this.zone.run(() => {
      this.phase = 'won';
      this.bestScore = best;
    });
  }

  private winEvent(name: keyof typeof WIN_STEPS, freq: number): void {
    if (this.winFired.has(name) || this.winT < WIN_STEPS[name]) return;
    this.winFired.add(name);
    if (name === 'land') {
      this.sound.fanfare();
      const head = this.stack[this.stack.length - 1];
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 250 + Math.random() * 450;
        this.particles.push({
          kind: 'confetti',
          x: head.x,
          y: head.y + head.r * 1.6,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v + 300,
          life: 2.4,
          max: 2.4,
          size: 5 + Math.random() * 5,
          color: CONFETTI[i % CONFETTI.length],
          rot: Math.random() * 6,
        });
      }
      this.sparkleBurst(head.x, head.y + head.r * 1.4, head.r * 1.4);
      this.zone.run(() => (this.celebrating = true));
      this.emitTimer = setTimeout(() => this.zone.run(() => this.completed.emit()), 1900);
    } else {
      this.sound.bell(freq, 0.12);
    }
  }

  private step(dt: number): void {
    this.time += dt;
    const viewW = this.W / this.S;

    // Spawn the next ball / end the run
    if (this.phase === 'playing' && !this.current && this.spawnAt > 0 && this.time >= this.spawnAt) {
      this.spawnAt = 0;
      this.spawn();
    }
    if (this.lostAt > 0 && performance.now() >= this.lostAt) {
      this.lostAt = -1;
      this.current = null;
      this.zone.run(() => (this.phase = 'lost'));
    }

    // Swing
    const b = this.current;
    if (b && b.state === 'hanging') {
      this.swingPhase += this.omega * dt;
      const theta = this.swingAmp * Math.sin(this.swingPhase);
      const L = this.ropeLength + b.r;
      b.x = Math.sin(theta) * L;
      b.y = this.pivotY - Math.cos(theta) * L;
      b.rot = theta;
    } else if (b && b.state === 'falling') {
      b.vy -= GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const top = this.stack[this.stack.length - 1];
      const restY = top ? top.y + (top.r + b.r) * 0.9 : b.r * 0.94;
      if (b.y <= restY) {
        b.y = restY;
        this.land(b);
      }
    }

    // Loose balls (tumbling off, then rolling in the snow)
    for (const l of this.loose) {
      if (l.state === 'tumbling') {
        l.vy -= GRAVITY * dt;
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.rot += l.vr * dt;
        if (l.y <= l.r * 0.9) {
          l.y = l.r * 0.9;
          l.state = 'resting';
          l.vy = 0;
          l.vx *= 0.6;
          l.squash = 0.25;
          this.puff(l.x, 4, 12, l.r);
          this.sound.thud();
        }
      } else if (l.state === 'resting') {
        l.restT += dt;
        l.vx *= Math.exp(-2.5 * dt);
        l.x += l.vx * dt;
        l.rot += (l.vx / l.r) * dt;
      }
      this.springSquash(l, dt);
    }
    this.loose = this.loose.filter((l) => l.restT < 2.2 && Math.abs(l.x) < viewW * 2);

    // Wobble: a damped spring on the whole stack
    const k = 70;
    const c = this.phase === 'won' ? 7 : 3.2;
    this.wobV += (-k * this.wobA - c * this.wobV) * dt;
    this.wobA += this.wobV * dt;
    this.wobA = clamp(this.wobA, -0.35, 0.35);
    for (const s of this.stack) this.springSquash(s, dt);

    // Camera
    const top = this.stack[this.stack.length - 1];
    const topSurface = top ? top.y + top.r : 0;
    let camTarget = Math.max(0, topSurface - this.viewH * 0.34);
    let zoomTarget = 1;
    let camXTarget = 0;
    if ((this.phase === 'won' || (this.endless && this.phase === 'lost')) && top) {
      const needed = topSurface + top.r * 1.6 + 90 + GROUND_PAD;
      zoomTarget = Math.min(1, this.viewH / needed);
      camTarget = 0;
      camXTarget = this.stack.reduce((sum, s) => sum + s.x, 0) / this.stack.length;
    }
    const ease = 1 - Math.exp(-3.2 * dt);
    this.camY += (camTarget - this.camY) * ease;
    this.zoom += (zoomTarget - this.zoom) * ease;
    this.camX += (camXTarget - this.camX) * ease;

    // Win sequence
    if (this.winT >= 0) {
      // Real time, so the celebration keeps its rhythm even if frames are dropped
      this.winT = (performance.now() - this.winStart) / 1000;
      this.winEvent('eyes', 784);
      this.winEvent('nose', 880);
      this.winEvent('smile', 988);
      this.winEvent('buttons', 1047);
      this.winEvent('arms', 1175);
      this.winEvent('scarf', 1319);
      this.winEvent('hat', 1568);
      this.winEvent('land', 0);
    }

    // Particles
    for (const p of this.particles) {
      p.life -= dt;
      if (p.kind === 'confetti') {
        p.vy -= 900 * dt;
        p.vx *= Math.exp(-1.6 * dt);
        p.vy = Math.max(p.vy, -260);
        p.rot += dt * 8;
      } else if (p.kind === 'puff') {
        p.vx *= Math.exp(-4 * dt);
        p.vy *= Math.exp(-4 * dt);
        p.vy -= 30 * dt;
      } else {
        p.vx *= Math.exp(-3 * dt);
        p.vy *= Math.exp(-3 * dt);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter((f) => f.t < 1.3);

    // Snowfall (screen space, in CSS pixels)
    for (const f of this.flakes) {
      f.y += f.v * dt * this.S;
      f.x += Math.sin(this.time * 0.8 + f.p) * 12 * dt * this.S;
      if (f.y > this.H + 6) {
        f.y = -6;
        f.x = Math.random() * this.W;
      }
      if (f.x > this.W + 6) f.x = -6;
      if (f.x < -6) f.x = this.W + 6;
    }

    // Expose a little state for automated tests / debugging
    const stage = this.stageRef.nativeElement;
    const cur = this.current;
    const ref = this.stack[this.stack.length - 1];
    stage.dataset['hanging'] = cur && cur.state === 'hanging' && this.time - cur.born >= 0.3 ? '1' : '0';
    if (cur) stage.dataset['aim'] = ((cur.x - (ref ? ref.x : 0)) / (ref ? ref.r : this.baseR)).toFixed(3);
  }

  private springSquash(b: Ball, dt: number): void {
    b.squashV += (-260 * b.squash - 14 * b.squashV) * dt;
    b.squash += b.squashV * dt;
  }

  private puff(x: number, y: number, n: number, r: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.05 + 0.9 * Math.random());
      const side = Math.random() < 0.5 ? -1 : 1;
      this.particles.push({
        kind: 'puff',
        x: x + side * r * (0.3 + Math.random() * 0.6),
        y,
        vx: side * Math.cos(a) * (60 + Math.random() * 140),
        vy: Math.sin(a) * (30 + Math.random() * 90),
        life: 0.6 + Math.random() * 0.4,
        max: 1,
        size: 5 + Math.random() * 8,
        color: '#ffffff',
        rot: 0,
      });
    }
  }

  private sparkleBurst(x: number, y: number, r: number): void {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
      const v = 120 + Math.random() * 160;
      this.particles.push({
        kind: 'spark',
        x: x + Math.cos(a) * r * 0.8,
        y: y + Math.sin(a) * r * 0.8,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.8 + Math.random() * 0.5,
        max: 1.3,
        size: 5 + Math.random() * 6,
        color: i % 3 === 0 ? '#ffffff' : '#ffd772',
        rot: 0,
      });
    }
  }

  private addFloat(text: string, x: number, y: number, color: string, big: boolean): void {
    this.floats.push({ text, x, y, t: 0, color, big });
  }

  private t(key: string): string {
    return this.translate.instant(`challenges.snowmanStack.${key}`);
  }

  // ---- Rendering ------------------------------------------------------------------------

  private seedScenery(): void {
    const flakeCount = this.reduced ? 25 : 70;
    this.flakes = Array.from({ length: flakeCount }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 1200,
      r: 0.8 + Math.random() * 2.2,
      v: 18 + Math.random() * 40,
      p: Math.random() * 10,
    }));
    this.stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.6, r: 0.4 + Math.random() * 1.3, p: Math.random() * 10 }));
    this.sparkles = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random(), p: Math.random() * 10 }));
    const greens = ['#1f6f58', '#2a8a6c', '#17573f', '#2f9a74'];
    this.needles = Array.from({ length: 150 }, (_, i) => ({
      t: Math.random(),
      a: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.9),
      l: 10 + Math.random() * 12,
      c: greens[i % greens.length],
    }));
  }

  private resize(): void {
    const el = this.stageRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = w;
    this.H = h;
    canvas.width = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    this.S = Math.min(w / 380, h / 540);
    this.skyGrad = null;
    for (const f of this.flakes) {
      f.x = f.x % w;
      f.y = f.y % h;
    }
    if (this.ctx) this.render();
  }

  /** World → screen (CSS px) */
  private sx(x: number): number {
    return this.W / 2 + (x - this.camX) * this.S * this.zoom;
  }

  private sy(y: number): number {
    return this.H - (y - this.camY + GROUND_PAD) * this.S * this.zoom;
  }

  private render(): void {
    const ctx = this.ctx;
    if (!ctx || !this.W) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground(ctx);
    this.drawGround(ctx);

    const k = this.S * this.zoom;
    for (const l of this.loose) {
      const alpha = l.state === 'resting' ? clamp(1 - (l.restT - 1.2), 0, 1) : 1;
      this.drawBall(ctx, this.sx(l.x), this.sy(l.y), l.r * k, l.rot, l.squash, l.flecks, alpha);
    }

    this.drawStack(ctx);

    const cur = this.current;
    if (cur) {
      if (cur.state === 'hanging') this.drawAimShadow(ctx, cur);
      this.drawBranch(ctx, cur);
    } else {
      this.drawBranch(ctx, null);
    }

    this.drawParticles(ctx);
    this.drawFloats(ctx);
    this.drawSnowfall(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const { W, H, S } = this;
    if (!this.skyGrad) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#070b22');
      g.addColorStop(0.55, '#14204d');
      g.addColorStop(1, '#2a3f78');
      this.skyGrad = g;
    }
    ctx.fillStyle = this.skyGrad;
    ctx.fillRect(0, 0, W, H);

    const lift = this.camY * S * 0.08;

    // Stars
    for (const s of this.stars) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * 1.6 + s.p));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fdf6ec';
      ctx.beginPath();
      ctx.arc(s.x * W, (s.y * H + lift) % H, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Aurora ribbons
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const y0 = H * (0.16 + i * 0.05) + lift * 1.5;
      ctx.beginPath();
      ctx.moveTo(-20, y0);
      for (let x = 0; x <= W + 40; x += 40) {
        const y = y0 + Math.sin(x * 0.006 + this.time * 0.35 + i) * 22 * S + Math.sin(x * 0.017 + i * 2) * 8;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = i === 1 ? 'rgba(92, 242, 179, 0.09)' : 'rgba(92, 200, 242, 0.06)';
      ctx.lineWidth = (36 - i * 8) * S;
      ctx.stroke();
    }
    ctx.restore();

    // Moon
    const mx = W - 64 * S;
    const my = 70 * S + lift;
    const mg = ctx.createRadialGradient(mx, my, 10 * S, mx, my, 90 * S);
    mg.addColorStop(0, 'rgba(255, 240, 200, 0.35)');
    mg.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.fillStyle = mg;
    ctx.fillRect(mx - 90 * S, my - 90 * S, 180 * S, 180 * S);
    ctx.fillStyle = '#fff4d6';
    ctx.beginPath();
    ctx.arc(mx, my, 22 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214, 196, 150, 0.35)';
    ctx.beginPath();
    ctx.arc(mx - 7 * S, my - 4 * S, 5 * S, 0, Math.PI * 2);
    ctx.arc(mx + 6 * S, my + 7 * S, 3.5 * S, 0, Math.PI * 2);
    ctx.fill();

    const horizon = this.H - GROUND_PAD * S;
    // Far hills
    const far = horizon - 120 * S + this.camY * S * 0.25;
    ctx.fillStyle = '#26386d';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) {
      ctx.lineTo(x, far + Math.sin(x * 0.004 + 1) * 30 * S + Math.sin(x * 0.011) * 12 * S);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Mid hills with trees and a cottage
    const mid = horizon - 52 * S + this.camY * S * 0.45;
    const midY = (x: number) => mid + Math.sin(x * 0.006 + 2.2) * 20 * S + Math.sin(x * 0.019) * 6 * S;
    ctx.fillStyle = '#3b5291';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 16) ctx.lineTo(x, midY(x));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const treeXs = [0.04, 0.13, 0.2, 0.73, 0.86, 0.95];
    treeXs.forEach((tx, i) => {
      const x = tx * W;
      this.drawPine(ctx, x, midY(x) + 4 * S, (38 + (i % 3) * 12) * S);
    });
    const cottageX = W < 600 ? W * 0.3 : W * 0.33;
    this.drawCottage(ctx, cottageX, midY(cottageX) + 6 * S, 0.62 * S);
  }

  private drawPine(ctx: CanvasRenderingContext2D, x: number, base: number, h: number): void {
    ctx.fillStyle = '#4a3226';
    ctx.fillRect(x - h * 0.05, base - h * 0.12, h * 0.1, h * 0.14);
    for (let i = 0; i < 3; i++) {
      const top = base - h + i * h * 0.28;
      const bottom = base - h * 0.1 - (2 - i) * h * 0.2;
      const half = h * (0.2 + i * 0.1);
      ctx.fillStyle = '#123a45';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + half, bottom);
      ctx.lineTo(x - half, bottom);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(230, 240, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + half * 0.45, top + (bottom - top) * 0.45);
      ctx.quadraticCurveTo(x, top + (bottom - top) * 0.36, x - half * 0.45, top + (bottom - top) * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawCottage(ctx: CanvasRenderingContext2D, x: number, base: number, s: number): void {
    ctx.save();
    ctx.translate(x, base);
    ctx.scale(s, s);
    // Window glow on the snow
    const glow = ctx.createRadialGradient(0, -20, 5, 0, -20, 110);
    glow.addColorStop(0, 'rgba(255, 190, 100, 0.28)');
    glow.addColorStop(1, 'rgba(255, 190, 100, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-110, -130, 220, 170);
    // Chimney + smoke
    ctx.fillStyle = '#6e2a26';
    ctx.fillRect(22, -96, 14, 30);
    for (let i = 0; i < 4; i++) {
      const t = (this.time * 0.25 + i / 4) % 1;
      ctx.fillStyle = `rgba(220, 228, 255, ${0.25 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(29 + Math.sin(t * 6 + i) * 6 + t * 20, -100 - t * 60, 5 + t * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // Walls (falu red)
    ctx.fillStyle = '#9b2a2f';
    ctx.fillRect(-52, -58, 104, 58);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let i = -44; i < 52; i += 9) ctx.fillRect(i, -58, 1.5, 58);
    // White corner boards
    ctx.fillStyle = '#f3efe6';
    ctx.fillRect(-54, -58, 5, 58);
    ctx.fillRect(49, -58, 5, 58);
    // Roof with thick snow
    ctx.fillStyle = '#3a2b33';
    ctx.beginPath();
    ctx.moveTo(-64, -54);
    ctx.lineTo(0, -98);
    ctx.lineTo(64, -54);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#eef4ff';
    ctx.beginPath();
    ctx.moveTo(-68, -52);
    ctx.lineTo(0, -102);
    ctx.lineTo(68, -52);
    ctx.quadraticCurveTo(60, -44, 50, -50);
    ctx.quadraticCurveTo(38, -42, 26, -50);
    ctx.quadraticCurveTo(10, -44, -6, -50);
    ctx.quadraticCurveTo(-24, -42, -38, -50);
    ctx.quadraticCurveTo(-56, -44, -68, -52);
    ctx.closePath();
    ctx.fill();
    // Windows
    const flicker = 0.85 + 0.15 * Math.sin(this.time * 7) * Math.sin(this.time * 3.1);
    for (const wx of [-34, 18]) {
      ctx.fillStyle = '#f3efe6';
      ctx.fillRect(wx - 3, -45, 22, 24);
      ctx.fillStyle = `rgba(255, 205, 120, ${flicker})`;
      ctx.fillRect(wx, -42, 16, 18);
      ctx.fillStyle = '#f3efe6';
      ctx.fillRect(wx + 7, -42, 2, 18);
      ctx.fillRect(wx, -34, 16, 2);
    }
    // Door
    ctx.fillStyle = '#2f5e4c';
    ctx.fillRect(-8, -30, 16, 30);
    ctx.fillStyle = '#f7c873';
    ctx.beginPath();
    ctx.arc(4, -15, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    const { W, H, S } = this;
    const k = S * this.zoom;
    const g0 = this.sy(0);
    // Snowy yard
    const grad = ctx.createLinearGradient(0, g0 - 30 * k, 0, H);
    grad.addColorStop(0, '#f4f8ff');
    grad.addColorStop(0.5, '#d7e3f8');
    grad.addColorStop(1, '#a9bde4');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) {
      ctx.lineTo(x, g0 - 18 * k + Math.sin(x * 0.012 + 0.6) * 6 * k + Math.sin(x * 0.031) * 3 * k);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Fence along the back of the yard
    ctx.save();
    const fy = g0 - 22 * k;
    ctx.strokeStyle = '#6b4a36';
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    ctx.moveTo(0, fy - 20 * k);
    ctx.lineTo(W, fy - 20 * k);
    ctx.moveTo(0, fy - 8 * k);
    ctx.lineTo(W, fy - 8 * k);
    ctx.stroke();
    const step = 46 * k;
    for (let x = ((this.W / 2) % step) - step; x < W + step; x += step) {
      ctx.fillStyle = '#7a5640';
      ctx.fillRect(x - 3.5 * k, fy - 30 * k, 7 * k, 30 * k);
      ctx.fillStyle = '#f4f8ff';
      ctx.beginPath();
      ctx.ellipse(x, fy - 30 * k, 6 * k, 3 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(244, 248, 255, 0.9)';
    ctx.fillRect(0, fy - 22 * k, W, 2 * k);
    ctx.restore();

    // Front snow bank over the fence base
    ctx.fillStyle = '#eef4ff';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 20) {
      ctx.lineTo(x, g0 - 8 * k + Math.sin(x * 0.02 + 2) * 4 * k);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    const lower = ctx.createLinearGradient(0, g0, 0, H);
    lower.addColorStop(0, 'rgba(180, 200, 240, 0)');
    lower.addColorStop(1, 'rgba(120, 150, 210, 0.45)');
    ctx.fillStyle = lower;
    ctx.fillRect(0, g0, W, H - g0);

    // Glittering snow
    for (const s of this.sparkles) {
      const a = Math.max(0, Math.sin(this.time * 2.2 + s.p * 3));
      if (a < 0.6) continue;
      const x = s.x * W;
      const y = g0 + s.y * (H - g0);
      ctx.fillStyle = `rgba(255, 255, 255, ${(a - 0.6) * 2.5})`;
      this.sparkPath(ctx, x, y, 3 * s.r);
      ctx.fill();
    }

    // Target ring where the first ball goes
    if (this.stack.length === 0 && this.phase === 'playing') {
      ctx.save();
      ctx.setLineDash([6 * k, 6 * k]);
      ctx.lineDashOffset = -this.time * 12;
      ctx.strokeStyle = 'rgba(247, 200, 115, 0.75)';
      ctx.lineWidth = 2.5 * k;
      ctx.beginPath();
      ctx.ellipse(this.sx(0), g0, this.baseR * 0.9 * k, 13 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Shadow under the snowman
    const base = this.stack[0];
    if (base) {
      ctx.fillStyle = 'rgba(70, 95, 160, 0.28)';
      ctx.beginPath();
      ctx.ellipse(this.sx(base.x) + 8 * k, g0 + 2 * k, base.r * 1.05 * k, 12 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const l of this.loose) {
      const a = l.state === 'resting' ? clamp(1 - (l.restT - 1.2), 0, 1) : clamp(1 - (l.y - l.r) / 400, 0, 1);
      ctx.fillStyle = `rgba(70, 95, 160, ${0.25 * a})`;
      ctx.beginPath();
      ctx.ellipse(this.sx(l.x), g0 + 2 * k, l.r * k, 10 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Soft spot on the stack showing where the hanging ball would land */
  private drawAimShadow(ctx: CanvasRenderingContext2D, cur: Ball): void {
    const k = this.S * this.zoom;
    const top = this.stack[this.stack.length - 1];
    const y = top ? this.sy(top.y + top.r * 0.93) : this.sy(0);
    const ref = top ? top : null;
    const off = Math.abs(cur.x - (ref ? ref.x : 0)) / (ref ? ref.r : this.baseR);
    const good = off <= (ref ? this.tol : this.tol * 1.6);
    ctx.fillStyle = good ? 'rgba(60, 90, 160, 0.28)' : 'rgba(60, 90, 160, 0.14)';
    ctx.beginPath();
    ctx.ellipse(this.sx(cur.x), y, cur.r * 0.75 * k, cur.r * 0.16 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStack(ctx: CanvasRenderingContext2D): void {
    if (!this.stack.length) {
      const cur = this.current;
      if (cur && cur.state === 'falling') this.drawBall(ctx, this.sx(cur.x), this.sy(cur.y), cur.r * this.S * this.zoom, cur.rot, cur.squash, cur.flecks, 1);
      return;
    }
    const k = this.S * this.zoom;
    const base = this.stack[0];
    const totalH = this.stack[this.stack.length - 1].y;
    let angle = this.wobA * Math.min(1, 220 / Math.max(120, totalH));
    let hop = 0;
    const wt = this.winT;
    if (wt >= WIN_STEPS.land) {
      const t = wt - WIN_STEPS.land;
      const decay = Math.exp(-t * 0.9);
      hop = Math.abs(Math.sin(t * 9)) * 16 * k * decay;
      angle += Math.sin(t * 9) * 0.05 * decay;
    }
    ctx.save();
    ctx.translate(this.sx(base.x), this.sy(0) - hop);
    ctx.rotate(angle);
    const n = this.stack.length;
    this.stack.forEach((b, i) => {
      const lx = (b.x - base.x) * k;
      const ly = -b.y * k;
      if (i > 0) {
        ctx.fillStyle = 'rgba(80, 105, 170, 0.28)';
        ctx.beginPath();
        ctx.ellipse(lx, ly + b.r * 0.86 * k, b.r * 0.78 * k, b.r * 0.2 * k, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      this.drawBall(ctx, lx, ly, b.r * k, b.rot, b.squash, b.flecks, 1);
      if (wt >= 0) this.drawBodyDecor(ctx, i, n, lx, ly, b.r * k);
    });
    // The ball currently falling is drawn in the same frame so it lines up with the wobble
    ctx.restore();
    const cur = this.current;
    if (cur && cur.state === 'falling') this.drawBall(ctx, this.sx(cur.x), this.sy(cur.y), cur.r * k, cur.rot, cur.squash, cur.flecks, 1);

    if (wt >= 0) {
      ctx.save();
      ctx.translate(this.sx(base.x), this.sy(0) - hop);
      ctx.rotate(angle);
      const head = this.stack[n - 1];
      const below = n > 1 ? this.stack[n - 2] : null;
      this.drawHeadDecor(ctx, (head.x - base.x) * k, -head.y * k, head.r * k, below ? below.r * k : head.r * k);
      ctx.restore();
    }
  }

  private progress(step: keyof typeof WIN_STEPS, dur = 0.35): number {
    return clamp((this.winT - WIN_STEPS[step]) / dur, 0, 1);
  }

  private drawBodyDecor(ctx: CanvasRenderingContext2D, i: number, n: number, x: number, y: number, r: number): void {
    const isHead = i === n - 1;
    if (isHead) return;
    // Arms on the ball right under the head
    if (i === n - 2) {
      const p = easeOutBack(this.progress('arms'));
      if (p > 0) {
        const wave = this.winT > WIN_STEPS.land ? Math.sin((this.winT - WIN_STEPS.land) * 10) * 0.35 : 0;
        this.drawArm(ctx, x - r * 0.82, y - r * 0.15, -1, r, p, 0);
        this.drawArm(ctx, x + r * 0.82, y - r * 0.15, 1, r, p, wave);
      }
    }
    // Coal buttons on the body (not the bottom ball unless the snowman is tiny)
    const wantsButtons = n <= 2 ? i === 0 : i > 0;
    const pb = this.progress('buttons', 0.3);
    if (wantsButtons && pb > 0) {
      const count = i === n - 2 ? 3 : 2;
      for (let j = 0; j < count; j++) {
        const s = easeOutBack(clamp(pb * count - j, 0, 1));
        if (s <= 0) continue;
        const by = y - r * 0.35 + j * r * (count === 3 ? 0.35 : 0.45);
        this.coal(ctx, x, by, r * 0.085 * s);
      }
    }
  }

  private drawArm(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, r: number, p: number, wave: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dir * (-0.5 + wave) * p);
    ctx.scale(dir * p, p);
    ctx.strokeStyle = '#6b4428';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 1.0, -r * 0.05);
    ctx.moveTo(r * 0.62, -r * 0.03);
    ctx.lineTo(r * 0.85, -r * 0.3);
    ctx.moveTo(r * 1.0, -r * 0.05);
    ctx.lineTo(r * 1.2, -r * 0.18);
    ctx.moveTo(r * 1.0, -r * 0.05);
    ctx.lineTo(r * 1.22, r * 0.06);
    ctx.stroke();
    // Tiny mitten
    ctx.fillStyle = '#e0475b';
    ctx.beginPath();
    ctx.ellipse(r * 1.08, -r * 0.06, r * 0.13, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fdf6ec';
    ctx.fillRect(r * 0.92, -r * 0.14, r * 0.05, r * 0.17);
    ctx.restore();
  }

  private coal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.fillStyle = '#1b1b26';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHeadDecor(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rb: number): void {
    // Scarf around the neck
    const ps = this.progress('scarf', 0.4);
    if (ps > 0) {
      const sway = Math.sin(this.time * 3) * 0.08;
      const w = r * 1.0 * easeOutBack(ps);
      const ny = y + r * 0.8;
      // Hanging tail
      ctx.save();
      ctx.translate(x + r * 0.42, ny + r * 0.12);
      ctx.rotate(0.12 + sway);
      ctx.fillStyle = '#c4334a';
      const tl = r * 0.95 * ps;
      ctx.beginPath();
      ctx.roundRect(-r * 0.15, 0, r * 0.3, tl, r * 0.06);
      ctx.fill();
      ctx.fillStyle = '#f7c873';
      for (let s = 0.25; s < 0.9; s += 0.3) ctx.fillRect(-r * 0.15, tl * s, r * 0.3, r * 0.06);
      ctx.strokeStyle = '#c4334a';
      ctx.lineWidth = Math.max(1, r * 0.03);
      for (let f = -2; f <= 2; f++) {
        ctx.beginPath();
        ctx.moveTo(f * r * 0.06, tl);
        ctx.lineTo(f * r * 0.07, tl + r * 0.12);
        ctx.stroke();
      }
      ctx.restore();
      // Wrap
      const grad = ctx.createLinearGradient(0, ny - r * 0.16, 0, ny + r * 0.2);
      grad.addColorStop(0, '#ef5b6f');
      grad.addColorStop(1, '#a8243a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, ny, w, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, ny, w, r * 0.2, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(247, 200, 115, 0.85)';
      for (let s = -1; s <= 1; s += 0.4) ctx.fillRect(x + s * w - r * 0.03, ny - r * 0.3, r * 0.06, r * 0.6);
      ctx.restore();
      // Knot
      ctx.fillStyle = '#d33c52';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.42, ny + r * 0.06, r * 0.16 * ps, r * 0.14 * ps, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    const pe = easeOutBack(this.progress('eyes', 0.3));
    if (pe > 0) {
      const blink = Math.sin(this.time * 1.3) > 0.985 ? 0.2 : 1;
      for (const sxn of [-1, 1]) {
        ctx.save();
        ctx.translate(x + sxn * r * 0.3, y - r * 0.18);
        ctx.scale(1, blink);
        this.coal(ctx, 0, 0, r * 0.1 * pe);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(255, 120, 140, 0.35)';
      for (const sxn of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + sxn * r * 0.52, y + r * 0.1, r * 0.14 * pe, r * 0.08 * pe, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Smile
    const pm = this.progress('smile', 0.3);
    if (pm > 0) {
      for (let j = 0; j < 5; j++) {
        const s = easeOutBack(clamp(pm * 5 - j, 0, 1));
        if (s <= 0) continue;
        const a = Math.PI * (0.25 + 0.125 * j);
        this.coal(ctx, x + Math.cos(a) * r * 0.42, y + r * 0.0 + Math.sin(a) * r * 0.36, r * 0.05 * s);
      }
    }

    // Carrot nose
    const pn = easeOutBack(this.progress('nose', 0.35));
    if (pn > 0) {
      ctx.save();
      ctx.translate(x + r * 0.02, y + r * 0.02);
      ctx.rotate(0.12);
      const len = r * 0.72 * pn;
      const grad = ctx.createLinearGradient(0, -r * 0.1, 0, r * 0.1);
      grad.addColorStop(0, '#ffb35c');
      grad.addColorStop(1, '#e0651b');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.1);
      ctx.quadraticCurveTo(len * 0.6, -r * 0.05, len, 0);
      ctx.quadraticCurveTo(len * 0.6, r * 0.06, 0, r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(150, 60, 10, 0.55)';
      ctx.lineWidth = Math.max(1, r * 0.02);
      for (const f of [0.25, 0.45, 0.65]) {
        ctx.beginPath();
        ctx.moveTo(len * f, -r * 0.07 * (1 - f));
        ctx.lineTo(len * f + r * 0.02, r * 0.02);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Top hat drops in and bounces
    if (this.winT >= WIN_STEPS.hat) {
      const t = clamp((this.winT - WIN_STEPS.hat) / (WIN_STEPS.land - WIN_STEPS.hat), 0, 1);
      const fall = (1 - t * t) * this.H * 0.8;
      const after = Math.max(0, this.winT - WIN_STEPS.land);
      const bounce = Math.abs(Math.sin(after * 12)) * Math.exp(-after * 5) * r * 0.25;
      ctx.save();
      ctx.translate(x - r * 0.04, y - r * 0.84 - fall - bounce);
      ctx.rotate(-0.14);
      const bw = r * 0.82;
      const ch = r * 0.95;
      const cw = r * 0.56;
      // Crown
      const hg = ctx.createLinearGradient(-cw, 0, cw, 0);
      hg.addColorStop(0, '#23233a');
      hg.addColorStop(0.4, '#3a3a58');
      hg.addColorStop(1, '#16162a');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.moveTo(-cw, 0);
      ctx.lineTo(-cw * 0.92, -ch);
      ctx.quadraticCurveTo(0, -ch - r * 0.07, cw * 0.92, -ch);
      ctx.lineTo(cw, 0);
      ctx.closePath();
      ctx.fill();
      // Band
      ctx.fillStyle = '#e0475b';
      ctx.fillRect(-cw * 0.985, -r * 0.3, cw * 1.97, r * 0.18);
      // Holly
      ctx.fillStyle = '#3aae8a';
      ctx.beginPath();
      ctx.ellipse(cw * 0.5, -r * 0.28, r * 0.14, r * 0.06, -0.5, 0, Math.PI * 2);
      ctx.ellipse(cw * 0.78, -r * 0.24, r * 0.14, r * 0.06, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff3b55';
      for (const [hx, hy] of [
        [0.6, -0.2],
        [0.7, -0.15],
        [0.52, -0.14],
      ]) {
        ctx.beginPath();
        ctx.arc(cw * hx, r * hy, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      // Brim
      ctx.fillStyle = '#1b1b2e';
      ctx.beginPath();
      ctx.ellipse(0, 0, bw, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-cw * 0.7, -ch * 0.95, cw * 0.18, ch * 0.6);
      // Snow on the brim
      ctx.fillStyle = '#f4f8ff';
      ctx.beginPath();
      ctx.ellipse(-bw * 0.6, -r * 0.08, r * 0.16, r * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBall(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    rot: number,
    squash: number,
    flecks: Fleck[],
    alpha: number,
  ): void {
    if (r <= 0.5 || alpha <= 0) return;
    const sq = clamp(squash, -0.2, 0.3);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y + r);
    ctx.scale(1 + sq * 0.7, 1 - sq);
    ctx.translate(0, -r);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r * 1.05);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#eef5ff');
    g.addColorStop(0.8, '#cddcf4');
    g.addColorStop(1, '#9fb4dc');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Cool moonlit rim
    ctx.strokeStyle = 'rgba(140, 170, 230, 0.55)';
    ctx.lineWidth = Math.max(1, r * 0.035);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // Texture that rolls with the ball
    for (const f of flecks) {
      const a = f.a + rot;
      const fx = Math.cos(a) * f.d * r;
      const fy = Math.sin(a) * f.d * r;
      ctx.fillStyle = f.white ? 'rgba(255,255,255,0.95)' : 'rgba(140, 165, 215, 0.35)';
      ctx.beginPath();
      ctx.arc(fx, fy, f.s * Math.max(0.6, r / 50), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBranch(ctx: CanvasRenderingContext2D, cur: Ball | null): void {
    const { W, S } = this;
    const pivotX = this.sx(0);
    const pivotY = this.sy(this.pivotY);
    const winFade = this.phase === 'won' ? clamp(1 - this.winT * 1.5, 0, 1) : 1;
    if (winFade <= 0) return;
    ctx.save();
    ctx.globalAlpha = winFade;
    const startX = -10;
    const startY = pivotY - 16 * S;
    const endX = pivotX + 70 * S;
    const endY = pivotY - 4 * S;
    const ctrlX = (startX + endX) / 2;
    const ctrlY = pivotY - 30 * S;
    const pt = (t: number) => ({
      x: (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ctrlX + t * t * endX,
      y: (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * ctrlY + t * t * endY,
    });

    // Rope + sling holding the hanging ball
    if (cur && cur.state === 'hanging') {
      const k = this.S * this.zoom;
      const bx = this.sx(cur.x);
      const by = this.sy(cur.y);
      const r = cur.r * k * easeOutBack(clamp((this.time - cur.born) / 0.35, 0, 1));
      const ang = cur.rot;
      const topX = bx - Math.sin(ang) * r * 0.95;
      const topY = by - Math.cos(ang) * r * 0.95;
      ctx.strokeStyle = '#c9a26b';
      ctx.lineWidth = 2.2 * S;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(topX, topY);
      ctx.stroke();
      this.drawBall(ctx, bx, by, r, cur.rot * 0.5, 0, cur.flecks, 1);
      // Sling straps
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-ang);
      ctx.strokeStyle = '#b2875a';
      ctx.lineWidth = 2 * S;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.quadraticCurveTo(-r * 0.75, -r * 0.7, -r * 0.92, -r * 0.1);
      ctx.moveTo(0, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.75, -r * 0.7, r * 0.92, -r * 0.1);
      ctx.stroke();
      ctx.fillStyle = '#e0475b';
      ctx.beginPath();
      ctx.arc(0, -r * 0.97, 3.2 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Bark
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4a3226';
    ctx.lineWidth = 14 * S;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.stroke();
    ctx.strokeStyle = '#6b4a36';
    ctx.lineWidth = 5 * S;
    ctx.beginPath();
    ctx.moveTo(startX, startY - 3 * S);
    ctx.quadraticCurveTo(ctrlX, ctrlY - 3 * S, endX, endY - 3 * S);
    ctx.stroke();
    // Needles
    ctx.lineWidth = 2.4 * S;
    for (const n of this.needles) {
      const p = pt(n.t);
      const sway = Math.sin(this.time * 1.2 + n.t * 6) * 0.06;
      ctx.strokeStyle = n.c;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(n.a + 1.2 + sway) * n.l * S, p.y + Math.sin(n.a + 1.2 + sway) * n.l * S * (n.a > 0 ? 1 : -1));
      ctx.stroke();
    }
    // Snow on top of the branch
    ctx.fillStyle = '#f4f8ff';
    for (let t = 0.02; t < 1; t += 0.07) {
      const p = pt(t);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 8 * S, 11 * S, 5 * S, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Knot + bow at the pivot
    ctx.fillStyle = '#e0475b';
    ctx.beginPath();
    ctx.ellipse(pivotX - 6 * S, pivotY, 6 * S, 4 * S, -0.4, 0, Math.PI * 2);
    ctx.ellipse(pivotX + 6 * S, pivotY, 6 * S, 4 * S, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a8243a';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 3 * S, 0, Math.PI * 2);
    ctx.fill();
    // A little lantern further along the branch
    const lp = pt(0.3);
    const lx = lp.x;
    const ly = lp.y + 26 * S;
    ctx.strokeStyle = '#2b2b3a';
    ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y);
    ctx.lineTo(lx, ly - 9 * S);
    ctx.stroke();
    const lg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 40 * S);
    lg.addColorStop(0, 'rgba(255, 200, 110, 0.45)');
    lg.addColorStop(1, 'rgba(255, 200, 110, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(lx - 40 * S, ly - 40 * S, 80 * S, 80 * S);
    ctx.fillStyle = '#2b2b3a';
    ctx.fillRect(lx - 7 * S, ly - 10 * S, 14 * S, 3 * S);
    ctx.fillRect(lx - 7 * S, ly + 8 * S, 14 * S, 3 * S);
    ctx.fillStyle = `rgba(255, 210, 120, ${0.85 + 0.15 * Math.sin(this.time * 9)})`;
    ctx.fillRect(lx - 5.5 * S, ly - 7 * S, 11 * S, 15 * S);
    ctx.restore();
    void W;
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    const k = this.S * this.zoom;
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      const x = this.sx(p.x);
      const y = this.sy(p.y);
      if (p.kind === 'puff') {
        ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.85})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size * k * (1.6 - a * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        this.sparkPath(ctx, x, y, p.size * k * (0.6 + a));
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.save();
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 1.3));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size * k * 0.5, -p.size * k * 0.3, p.size * k, p.size * k * 0.6);
        ctx.restore();
      }
    }
  }

  private sparkPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.closePath();
  }

  private drawFloats(ctx: CanvasRenderingContext2D): void {
    const S = this.S;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floats) {
      const a = f.t < 0.15 ? f.t / 0.15 : clamp(1 - (f.t - 0.8) / 0.5, 0, 1);
      const pop = easeOutBack(clamp(f.t / 0.25, 0, 1));
      const size = (f.big ? 26 : 20) * S * Math.max(0.8, pop);
      const x = clamp(this.sx(f.x), 90 * S, this.W - 90 * S);
      const y = this.sy(f.y) - f.t * 40 * S;
      ctx.globalAlpha = a;
      ctx.font = `800 ${size}px Nunito, system-ui, sans-serif`;
      ctx.lineWidth = 5 * S;
      ctx.strokeStyle = 'rgba(10, 15, 36, 0.75)';
      ctx.strokeText(f.text, x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
    }
    ctx.globalAlpha = 1;
  }

  private drawSnowfall(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const f of this.flakes) {
      ctx.globalAlpha = 0.4 + f.r / 4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * Math.max(0.8, this.S), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
