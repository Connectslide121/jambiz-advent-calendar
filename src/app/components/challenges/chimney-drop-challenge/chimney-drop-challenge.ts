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
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, RotateCcw } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface ChimneyDropConfig {
  /** Presents that must land in chimneys. Default 4 */
  target?: number;
  /** Presents in the sack. Default target + 5 */
  presents?: number;
  /** Sleigh speed multiplier (1 = relaxed). Default 1 */
  speed?: number;
  /** Strength of the swaying wind, 0 (none) … 1 (strong). Default 0 */
  wind?: number;
  /** Chimney width multiplier (0.7 = narrow, 1 = normal). Default 1 */
  chimneyWidth?: number;
  /** Endless bonus mode: speeds up over time, 3 misses and it's over. Never emits `completed` */
  endless?: boolean;
}

type Phase = 'intro' | 'playing' | 'won' | 'lost';

interface House {
  x: number;
  w: number;
  wallH: number;
  roofH: number;
  wall: string;
  trim: string;
  roof: string;
  cx: number;
  cw: number;
  ctop: number;
  smoke: boolean;
  lights: boolean;
  delivered: boolean;
  glow: number;
  windows: { x: number; y: number; w: number; h: number; lit: boolean }[];
  decor: 'tree' | 'lamp' | 'none';
  decorX: number;
}

interface Present {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  state: 'fall' | 'in' | 'ground';
  t: number;
  color: string;
  ribbon: string;
  touched: boolean;
  house?: House;
  counted: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  color: string;
  kind: 'puff' | 'coin' | 'spark' | 'smoke';
}

interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  depth: number;
}

const G = 820;
const BASE_SPEED = 165;
const SLEIGH_Y = -330;
const CHIMNEY_W = 46;
const PR = 8; // present half size
const STEP = 1 / 120;
const GROUND_PAD = 30;
const WALLS = [
  { wall: '#9c2f2c', trim: '#f3e6d0' }, // falu red
  { wall: '#c98d3a', trim: '#fff3dc' }, // ochre
  { wall: '#5f7fa8', trim: '#eef4ff' }, // nordic blue
  { wall: '#2f6f5a', trim: '#f3e6d0' }, // pine green
  { wall: '#e8dcc6', trim: '#9c2f2c' }, // cream
  { wall: '#7a4a6e', trim: '#f7e9f2' }, // plum
];
const ROOFS = ['#2b2f45', '#3a2f3a', '#2f3b4a'];
const PRESENTS = [
  { c: '#e0475b', r: '#f7c873' },
  { c: '#3aae8a', r: '#fdf6ec' },
  { c: '#7fb8ff', r: '#e0475b' },
  { c: '#f7c873', r: '#e0475b' },
  { c: '#d58bff', r: '#fdf6ec' },
];
const LIGHT_COLORS = ['#ff5a6e', '#f7c873', '#5cf2b3', '#7fb8ff', '#ffb36b'];
const NOTES = [783.99, 880, 987.77, 1046.5, 1174.66, 1318.51];

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * "Present Drop" - Santa's sleigh glides over a sleeping town. Tap to drop a present: it keeps
 * the sleigh's forward speed while it falls, so it must be released a little before each chimney.
 */
@Component({
  selector: 'app-chimney-drop-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './chimney-drop-challenge.html',
  styleUrl: './chimney-drop-challenge.scss',
})
export class ChimneyDropChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: ChimneyDropConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Check = Check;
  readonly RotateCcw = RotateCcw;

  private zone = inject(NgZone);
  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);

  // ---- Template state ----
  phase: Phase = 'intro';
  target = 4;
  totalPresents = 9;
  presentsLeft = 9;
  delivered = 0;
  endless = false;
  lives = 3;
  score = 0;
  streak = 0;
  best: number | null = null;
  newBest = false;
  windStrength = 0;
  /** -1 … 1, current wind direction & strength for the HUD arrow */
  windNow = 0;
  progressSlots: number[] = [];

  // ---- World ----
  houses: House[] = [];
  presents: Present[] = [];
  camX = 0;
  speed = BASE_SPEED;
  time = 0;
  private baseSpeed = BASE_SPEED;
  private chimneyScale = 1;
  private nextHouseX = 0;
  private rng = seeded(1);
  private cooldown = 0;
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private flakes: Flake[] = [];
  private clock = 0;
  private winT = 0;
  private reducedMotion = false;
  private acc = 0;

  // ---- View ----
  private ctx!: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private layers: { canvas: HTMLCanvasElement; factor: number }[] = [];
  private glowSprites: Record<string, HTMLCanvasElement> = {};
  private w = 0;
  private h = 0;
  private dpr = 1;
  scale = 1;
  groundY = 0;
  viewW = 400;
  sleighOff = 90;

  // ---- Lifecycle ----
  private raf = 0;
  private lastT = 0;
  private running = false;
  private ro?: ResizeObserver;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private unlisten: (() => void)[] = [];

  ngOnInit(): void {
    const c = this.config ?? {};
    this.endless = !!c.endless;
    this.target = Math.max(1, Math.round(c.target ?? 4));
    this.totalPresents = Math.max(this.target, Math.round(c.presents ?? this.target + 5));
    this.baseSpeed = BASE_SPEED * Math.max(0.6, Math.min(2, c.speed ?? 1));
    this.windStrength = Math.max(0, Math.min(1.2, c.wind ?? 0));
    this.chimneyScale = Math.max(0.6, Math.min(1.3, c.chimneyWidth ?? 1));
    const key = this.day ?? this.levelId;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.best = this.endless ? stats?.bestScore ?? null : stats?.bestLeft ?? null;
    try {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      this.reducedMotion = false;
    }
    this.reset();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.stageRef.nativeElement);
      this.resize();
      const on = (el: HTMLElement | Document | Window, type: string, fn: (e: any) => void) => {
        el.addEventListener(type, fn);
        this.unlisten.push(() => el.removeEventListener(type, fn));
      };
      on(canvas, 'pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        this.drop();
      });
      on(window, 'keydown', (e: KeyboardEvent) => {
        if (this.phase !== 'playing') return;
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (!e.repeat) this.drop();
        }
      });
      on(document, 'visibilitychange', () => (document.hidden ? this.stop() : this.start()));
      this.start();
    });
  }

  ngOnDestroy(): void {
    this.stop();
    this.ro?.disconnect();
    this.unlisten.forEach((u) => u());
    this.unlisten = [];
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  // =====================================================================
  // Template actions
  // =====================================================================

  startGame(): void {
    this.reset();
    this.phase = 'playing';
    this.sound.jingle();
    this.canvasRef.nativeElement.focus({ preventScroll: true });
  }

  showReward(): void {
    this.completed.emit();
  }

  get windTransform(): string {
    return `rotate(${this.windNow >= 0 ? 0 : 180}deg) scale(${(0.55 + Math.abs(this.windNow) * 0.75).toFixed(2)})`;
  }

  // =====================================================================
  // Setup
  // =====================================================================

  private reset(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    this.rng = seeded(this.endless ? Math.floor(Math.random() * 1e9) : 2026 + this.target * 7);
    this.time = 0;
    this.camX = 0;
    this.speed = this.baseSpeed;
    this.presents = [];
    this.particles = this.particles.filter((p) => p.kind === 'smoke');
    this.popups = [];
    this.delivered = 0;
    this.presentsLeft = this.totalPresents;
    this.lives = 3;
    this.score = 0;
    this.streak = 0;
    this.newBest = false;
    this.winT = 0;
    this.cooldown = 0;
    this.progressSlots = Array.from({ length: this.target }, (_, i) => i);
    this.houses = [];
    // The first house starts a little way ahead so the player has time to get ready
    this.nextHouseX = 420;
    this.fillHouses();
  }

  private fillHouses(): void {
    const ahead = this.camX + Math.max(this.viewW, 400) + 300;
    while (this.nextHouseX < ahead) this.addHouse();
    this.houses = this.houses.filter((h) => h.x + h.w + 140 > this.camX);
  }

  private addHouse(): void {
    const r = this.rng;
    const w = 118 + r() * 62;
    const wallH = 58 + r() * 72;
    const roofH = 34 + r() * 28;
    const x = this.nextHouseX;
    const palette = WALLS[Math.floor(r() * WALLS.length)];
    const left = r() < 0.5;
    const frac = 0.2 + r() * 0.16;
    const cx = left ? x + w * frac : x + w * (1 - frac);
    const narrow = this.endless ? Math.max(0.78, 1 - this.time / 400) : 1;
    const cw = CHIMNEY_W * this.chimneyScale * narrow;
    const ctop = this.roofY({ x, w, wallH, roofH } as House, cx) - (24 + r() * 18);
    const windows: House['windows'] = [];
    const cols = w > 150 ? 3 : 2;
    const rows = wallH > 100 ? 2 : 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ww = 16;
        const wh = 18;
        windows.push({
          x: x + ((col + 0.5) * w) / cols - ww / 2,
          y: -wallH + 16 + row * 42,
          w: ww,
          h: wh,
          lit: r() < 0.78,
        });
      }
    }
    const gap = (48 + r() * 150) * (this.endless ? 1 : 1);
    const decorR = r();
    this.houses.push({
      x,
      w,
      wallH,
      roofH,
      wall: palette.wall,
      trim: palette.trim,
      roof: ROOFS[Math.floor(r() * ROOFS.length)],
      cx,
      cw,
      ctop,
      smoke: r() < 0.45,
      lights: r() < 0.45,
      delivered: false,
      glow: 0,
      windows,
      decor: gap > 90 ? (decorR < 0.6 ? 'tree' : 'lamp') : 'none',
      decorX: x + w + gap / 2,
    });
    this.nextHouseX = x + w + gap;
  }

  /** Height of the gabled roof surface at world x (negative = above ground) */
  roofY(h: House, x: number): number {
    const mid = h.x + h.w / 2;
    const half = h.w / 2 + 10;
    const t = Math.max(0, 1 - Math.abs(x - mid) / half);
    return -h.wallH + 4 - (h.roofH + 4) * t;
  }

  // =====================================================================
  // Physics
  // =====================================================================

  windAcc(t: number): number {
    const amp = this.endless ? Math.min(0.8, Math.max(0, (t - 30) / 120)) : this.windStrength;
    return amp * 150 * Math.sin(t * 0.85 + 0.6);
  }

  /** Where the sleigh releases presents (world coordinates) */
  get dropPoint(): { x: number; y: number } {
    return { x: this.camX + this.sleighOff - 10, y: SLEIGH_Y + this.bob() + 8 };
  }

  private bob(): number {
    return Math.sin(this.clock * 2.1) * 3;
  }

  /**
   * Pure prediction: index of the house whose chimney a present released now would land in
   * (ignores roof bounces), or -1. Handy for tests and tuning.
   */
  predictDrop(): number {
    return this.predictLanding().house;
  }

  /** Like predictDrop, plus how far from the chimney centre the present would land */
  predictLanding(): { house: number; dx: number } {
    const p = { ...this.dropPoint, vx: this.speed, vy: 30 };
    let t = this.time;
    for (let i = 0; i < 400; i++) {
      const py = p.y;
      p.vx += this.windAcc(t) * STEP;
      p.vy += G * STEP;
      p.x += p.vx * STEP;
      p.y += p.vy * STEP;
      t += STEP;
      for (let k = 0; k < this.houses.length; k++) {
        const h = this.houses[k];
        if (py < h.ctop && p.y >= h.ctop) {
          if (Math.abs(p.x - h.cx) <= h.cw / 2 + 3) return { house: k, dx: p.x - h.cx };
        }
      }
      if (p.y > 0) break;
    }
    return { house: -1, dx: 0 };
  }

  private drop(): void {
    if (this.phase !== 'playing' || this.cooldown > 0) return;
    if (!this.endless && this.presentsLeft <= 0) return;
    const d = this.dropPoint;
    const look = PRESENTS[Math.floor(Math.random() * PRESENTS.length)];
    this.presents.push({
      x: d.x,
      y: d.y,
      vx: this.speed,
      vy: 30,
      rot: 0,
      vr: (Math.random() - 0.5) * 3,
      state: 'fall',
      t: 0,
      color: look.c,
      ribbon: look.r,
      touched: false,
      counted: false,
    });
    this.cooldown = 0.28;
    if (!this.endless) {
      this.zone.run(() => this.presentsLeft--);
    }
    this.sound.bell(1568, 0.04);
  }

  private stepPresent(p: Present): void {
    const prevY = p.y;
    p.vx += this.windAcc(this.time) * STEP;
    p.vy += G * STEP;
    p.x += p.vx * STEP;
    p.y += p.vy * STEP;
    p.rot += p.vr * STEP;

    for (const h of this.houses) {
      if (p.x < h.x - 30 || p.x > h.x + h.w + 30) continue;
      const half = h.cw / 2;
      const dx = p.x - h.cx;
      // Into the chimney!
      if (!p.touched && prevY < h.ctop && p.y >= h.ctop && Math.abs(dx) <= half + 3) {
        this.deliver(p, h);
        return;
      }
      // Rim / chimney side
      // (presents whose centre is over the opening are left alone - they will drop in)
      // Once a present has bounced it only collides with roofs and the ground (it can never get wedged)
      if (!p.touched && p.y + PR > h.ctop && Math.abs(dx) < half + PR && Math.abs(dx) > half + 3) {
        if (prevY + PR <= h.ctop + 2) {
          p.y = h.ctop - PR;
          p.vy = -Math.abs(p.vy) * 0.3;
          p.vx += Math.sign(dx || 1) * 70;
        } else {
          p.x = h.cx + Math.sign(dx || 1) * (half + PR);
          p.vx = Math.sign(dx || 1) * Math.max(30, Math.abs(p.vx) * 0.3);
        }
        p.vr = (Math.random() - 0.5) * 10;
        this.touch(p);
      }
      // Gabled roof
      if (p.x > h.x - 10 && p.x < h.x + h.w + 10) {
        const ry = this.roofY(h, p.x);
        if (p.y + PR > ry) {
          p.y = ry - PR;
          const mid = h.x + h.w / 2;
          const slope = ((h.roofH + 4) / (h.w / 2 + 10)) * (p.x < mid ? -1 : 1); // dy/dx
          const len = Math.hypot(1, slope);
          // Normal pointing up/out of the roof
          const nx = slope / len;
          const ny = -1 / len;
          const vn = p.vx * nx + p.vy * ny;
          if (vn < 0) {
            p.vx -= 1.3 * vn * nx;
            p.vy -= 1.3 * vn * ny;
          }
          p.vx *= 0.985;
          // Keep it sliding off the roof
          const down = p.x < mid ? -1 : 1;
          p.vx += down * 220 * STEP;
          if (!p.touched) {
            p.vr = down * 6;
            this.touch(p);
          }
        }
      }
    }
    if (p.y + PR >= 0) {
      p.y = -PR;
      p.state = 'ground';
      p.t = 0;
      p.vx = 0;
      p.vy = 0;
      p.rot = Math.round(p.rot / (Math.PI / 2)) * (Math.PI / 2) + 0.15;
      this.puff(p.x, -4, 10, '#ffffff');
      this.miss(p);
    }
  }

  private touch(p: Present): void {
    if (p.touched) return;
    p.touched = true;
    this.sound.bell(330, 0.05);
    this.puff(p.x, p.y + PR, 6, '#ffffff');
  }

  private miss(p: Present): void {
    if (p.counted) return;
    p.counted = true;
    this.zone.run(() => {
      this.streak = 0;
      if (this.endless && this.phase === 'playing') {
        this.lives--;
        this.popups.push({ x: p.x, y: p.y - 30, text: '💔', life: 1.1, color: '#ff9aa8' });
        if (this.lives <= 0) this.gameOver();
      }
    });
  }

  private deliver(p: Present, h: House): void {
    p.state = 'in';
    p.t = 0;
    p.house = h;
    p.x = h.cx;
    p.y = h.ctop;
    p.counted = true;
    const first = !h.delivered;
    h.delivered = true;
    h.glow = 1;
    // Coins of light spiral up out of the chimney
    for (let i = 0; i < (this.reducedMotion ? 10 : 22); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const sp = 90 + Math.random() * 170;
      this.particles.push({
        x: h.cx,
        y: h.ctop - 6,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 2.5 + Math.random() * 2.5,
        life: 1 + Math.random() * 0.6,
        max: 1.6,
        color: i % 3 ? '#f7c873' : '#fff4c4',
        kind: 'coin',
      });
    }
    this.sound.jingle();
    this.zone.run(() => {
      this.streak++;
      if (this.endless) {
        const pts = 100 + (this.streak - 1) * 25;
        this.score += pts;
        this.delivered++;
        this.popups.push({ x: h.cx, y: h.ctop - 40, text: `+${pts}`, life: 1.3, color: '#f7c873' });
      } else {
        if (first) {
          this.delivered++;
          this.sound.bell(NOTES[(this.delivered - 1) % NOTES.length], 0.14, 0.12);
        }
        this.popups.push({
          x: h.cx,
          y: h.ctop - 40,
          text: this.streak > 1 ? `×${this.streak}` : '+1',
          life: 1.2,
          color: '#f7c873',
        });
        if (this.delivered >= this.target && this.phase === 'playing') this.win();
      }
    });
  }

  private checkEnd(): void {
    if (this.endless || this.phase !== 'playing') return;
    if (this.presentsLeft <= 0 && this.presents.every((p) => p.state !== 'fall')) {
      this.zone.run(() => {
        this.phase = 'lost';
      });
      this.sound.thud();
    }
  }

  private win(): void {
    this.phase = 'won';
    this.sound.fanfare();
    const key = this.day ?? this.levelId;
    if (key) {
      const prev = this.stateService.getGameStats(key) ?? {};
      const bestLeft = Math.max(prev.bestLeft ?? 0, this.presentsLeft);
      this.best = bestLeft;
      this.stateService.saveGameStats(key, { ...prev, bestLeft, wins: (prev.wins ?? 0) + 1 });
    }
    this.timers.push(setTimeout(() => this.zone.run(() => this.completed.emit()), 2000));
  }

  private gameOver(): void {
    this.phase = 'lost';
    this.sound.thud();
    const key = this.day ?? this.levelId;
    this.newBest = this.score > (this.best ?? 0);
    if (this.newBest) this.best = this.score;
    if (key) {
      const prev = this.stateService.getGameStats(key) ?? {};
      this.stateService.saveGameStats(key, {
        ...prev,
        bestScore: Math.max(prev.bestScore ?? 0, this.score),
        bestDelivered: Math.max(prev.bestDelivered ?? 0, this.delivered),
        games: (prev.games ?? 0) + 1,
      });
    }
  }

  // =====================================================================
  // Loop
  // =====================================================================

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0, (now - this.lastT) / 1000));
      this.lastT = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private update(dt: number): void {
    this.clock += dt;
    const flying = this.phase !== 'intro';
    if (flying) {
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        if (this.phase === 'playing') this.time += STEP;
        if (this.endless && this.phase === 'playing') {
          this.speed = this.baseSpeed * (1 + Math.min(0.75, this.time / 150));
        }
        this.camX += this.speed * STEP;
        for (const p of this.presents) if (p.state === 'fall') this.stepPresent(p);
      }
      this.fillHouses();
    } else {
      // Gentle idle drift behind the intro card
      this.camX += 40 * dt;
      this.fillHouses();
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
    const wn = this.windAcc(this.time) / 150;
    if (Math.abs(wn - this.windNow) > 0.08) this.zone.run(() => (this.windNow = wn));

    for (const p of this.presents) {
      p.t += dt;
      if (p.state === 'fall' && p.t > 6) {
        // Safety net: nothing should fall for this long
        p.state = 'ground';
        p.t = 3;
        this.miss(p);
      }
    }
    this.presents = this.presents.filter(
      (p) => !(p.state === 'in' && p.t > 0.5) && !(p.state === 'ground' && (p.t > 4 || p.x < this.camX - 60))
    );
    this.checkEnd();

    // Chimney smoke
    for (const h of this.houses) {
      h.glow = Math.max(0, h.glow - dt * 0.6);
      if (h.smoke && Math.random() < dt * 5 && h.cx > this.camX - 40 && h.cx < this.camX + this.viewW + 40) {
        this.particles.push({
          x: h.cx + (Math.random() - 0.5) * 8,
          y: h.ctop - 4,
          vx: 4,
          vy: -26 - Math.random() * 10,
          r: 5 + Math.random() * 3,
          life: 2.4,
          max: 2.4,
          color: '#d8d6ea',
          kind: 'smoke',
        });
      }
    }
    // Magic sparkles trailing the sleigh
    if (flying && Math.random() < dt * (this.reducedMotion ? 6 : 26)) {
      const d = this.dropPoint;
      this.particles.push({
        x: d.x - 26 + Math.random() * 10,
        y: d.y - 4 + (Math.random() - 0.5) * 10,
        vx: this.speed * 0.6,
        vy: 10 + Math.random() * 20,
        r: 1 + Math.random() * 1.6,
        life: 0.9,
        max: 0.9,
        color: Math.random() < 0.5 ? '#f7c873' : '#cfe6ff',
        kind: 'spark',
      });
    }
    const wind = this.windAcc(this.time);
    for (const p of this.particles) {
      p.life -= dt;
      if (p.kind === 'coin') {
        p.vy += 260 * dt;
        p.vx *= Math.pow(0.4, dt);
      } else if (p.kind === 'puff') {
        p.vx *= Math.pow(0.05, dt);
        p.vy = p.vy * Math.pow(0.05, dt) + 30 * dt;
      } else if (p.kind === 'smoke') {
        p.vx += (wind * 0.25 - 10) * dt;
        p.r += 7 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) {
      p.life -= dt;
      p.y -= 30 * dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
    if (this.phase === 'won') {
      this.winT += dt;
      if (Math.random() < dt * 8) this.fireworks();
    }

    for (const f of this.flakes) {
      f.y += f.vy * dt;
      f.x += (Math.sin(this.clock + f.phase) * 8 - (flying ? this.speed * 0.25 : 10) + wind * 0.25) * f.depth * dt;
      if (f.y > this.h + 4) {
        f.y = -4;
        f.x = Math.random() * this.w;
      }
      if (f.x < -4) f.x = this.w + 4;
      if (f.x > this.w + 4) f.x = -4;
    }
  }

  private puff(x: number, y: number, n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * Math.random();
      const sp = 30 + Math.random() * 90;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: 2 + Math.random() * 4,
        life: 0.5 + Math.random() * 0.5,
        max: 1,
        color,
        kind: 'puff',
      });
    }
  }

  private fireworks(): void {
    const x = this.camX + this.viewW * (0.3 + Math.random() * 0.6);
    const y = -260 - Math.random() * 160;
    const col = LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * 110 + this.speed,
        vy: Math.sin(a) * 110,
        r: 2,
        life: 1.2,
        max: 1.2,
        color: col,
        kind: 'coin',
      });
    }
  }

  // =====================================================================
  // Rendering
  // =====================================================================

  private resize(): void {
    const rect = this.stageRef.nativeElement.getBoundingClientRect();
    const w = Math.max(200, Math.round(rect.width));
    const h = Math.max(200, Math.round(rect.height));
    if (w === this.w && h === this.h && this.bg) return;
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = this.canvasRef.nativeElement;
    canvas.width = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    this.scale = Math.min(h / (400 + GROUND_PAD), w / 390);
    this.groundY = h - GROUND_PAD * this.scale;
    this.viewW = w / this.scale;
    this.sleighOff = Math.max(84, Math.min(190, this.viewW * 0.22));
    this.makeFlakes();
    this.renderSky();
    this.renderLayers();
    this.fillHouses();
    if (!this.running) this.draw();
  }

  private makeFlakes(): void {
    const n = this.reducedMotion ? 30 : Math.round(Math.min(150, (this.w * this.h) / 6500));
    const r = seeded(9);
    this.flakes = Array.from({ length: n }, () => {
      const depth = 0.3 + r() * 0.9;
      return { x: r() * this.w, y: r() * this.h, r: 0.6 + depth * 1.5, vy: 14 + depth * 30, phase: r() * 10, depth };
    });
  }

  private glow(color: string): HTMLCanvasElement {
    if (this.glowSprites[color]) return this.glowSprites[color];
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, color);
    grd.addColorStop(0.3, color + '88');
    grd.addColorStop(1, color + '00');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    this.glowSprites[color] = c;
    return c;
  }

  private renderSky(): void {
    const bg = this.bg ?? document.createElement('canvas');
    this.bg = bg;
    bg.width = this.canvasRef.nativeElement.width;
    bg.height = this.canvasRef.nativeElement.height;
    const g = bg.getContext('2d')!;
    const { w, h, dpr } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#040720');
    sky.addColorStop(0.5, '#0d1745');
    sky.addColorStop(0.85, '#22306a');
    sky.addColorStop(1, '#3a4485');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    // Aurora ribbons
    const ar = seeded(77);
    for (let band = 0; band < 2; band++) {
      const y0 = h * (0.16 + band * 0.1);
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.filter = `blur(${Math.round(6 * dpr)}px)`;
      for (let x = -20; x < w + 20; x += 6) {
        const yy = y0 + Math.sin(x * 0.006 + band * 2) * h * 0.05 + Math.sin(x * 0.017) * 8;
        const hh = h * (0.1 + 0.06 * Math.sin(x * 0.01 + band));
        const grd = g.createLinearGradient(0, yy - hh, 0, yy);
        const a = 0.05 + 0.04 * Math.sin(x * 0.02 + ar() * 0.5);
        grd.addColorStop(0, 'rgba(92, 242, 179, 0)');
        grd.addColorStop(0.7, `rgba(92, 242, 179, ${a.toFixed(3)})`);
        grd.addColorStop(1, 'rgba(127, 184, 255, 0)');
        g.fillStyle = grd;
        g.fillRect(x, yy - hh, 7, hh);
      }
      g.restore();
    }

    // Stars
    const sr = seeded(5);
    for (let i = 0; i < Math.min(300, (w * h) / 2200); i++) {
      const x = sr() * w;
      const y = Math.pow(sr(), 1.3) * this.groundY * 0.8;
      g.fillStyle = `rgba(255, 250, 235, ${(0.3 + sr() * 0.7).toFixed(2)})`;
      g.beginPath();
      g.arc(x, y, 0.4 + sr() * 1.2, 0, Math.PI * 2);
      g.fill();
    }
    // Big moon
    const mr = Math.max(22, Math.min(54, 34 * this.scale));
    const mx = w * 0.78;
    const my = Math.max(mr * 2, h * 0.17);
    const halo = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 5);
    halo.addColorStop(0, 'rgba(255, 244, 214, 0.45)');
    halo.addColorStop(0.35, 'rgba(200, 210, 255, 0.12)');
    halo.addColorStop(1, 'rgba(200, 210, 255, 0)');
    g.fillStyle = halo;
    g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    const md = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
    md.addColorStop(0, '#ffffff');
    md.addColorStop(0.7, '#fff3d6');
    md.addColorStop(1, '#f1ddb0');
    g.fillStyle = md;
    g.beginPath();
    g.arc(mx, my, mr, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(214, 190, 150, 0.3)';
    [
      [0.32, -0.15, 0.2],
      [-0.3, 0.3, 0.15],
      [0.05, 0.42, 0.1],
      [-0.2, -0.4, 0.09],
    ].forEach(([dx, dy, rr]) => {
      g.beginPath();
      g.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, Math.PI * 2);
      g.fill();
    });
  }

  /** Parallax layers are painted once into seamless tiles and scrolled each frame */
  private renderLayers(): void {
    const { w, h, dpr, scale: s } = this;
    const tileW = Math.max(w, 600);
    const make = (factor: number, paint: (g: CanvasRenderingContext2D, tw: number) => void) => {
      const c = document.createElement('canvas');
      c.width = Math.round(tileW * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Paint three times so shapes crossing the tile edges wrap seamlessly
      for (const off of [-tileW, 0, tileW]) {
        g.save();
        g.translate(off, 0);
        paint(g, tileW);
        g.restore();
      }
      return { canvas: c, factor };
    };
    const gy = this.groundY;
    this.layers = [
      make(0.05, (g, tw) => {
        const r = seeded(31);
        const grd = g.createLinearGradient(0, gy - 230 * s, 0, gy);
        grd.addColorStop(0, '#3b4385');
        grd.addColorStop(1, '#1d2557');
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(0, gy);
        const pts: [number, number][] = [];
        for (let x = 0; x <= tw; x += tw / 9) pts.push([x, gy - (120 + r() * 110) * s]);
        pts[pts.length - 1][1] = pts[0][1];
        pts.forEach(([x, y], i) => {
          if (i === 0) g.lineTo(x, y);
          else {
            const [px, py] = pts[i - 1];
            g.lineTo((px + x) / 2, Math.max(py, y) + 40 * s * r());
            g.lineTo(x, y);
          }
        });
        g.lineTo(tw, gy);
        g.closePath();
        g.fill();
        // Snow caps
        g.strokeStyle = 'rgba(220, 230, 255, 0.45)';
        g.lineWidth = 2.5 * s;
        g.beginPath();
        pts.forEach(([x, y]) => {
          g.moveTo(x - 22 * s, y + 18 * s);
          g.lineTo(x, y);
          g.lineTo(x + 22 * s, y + 18 * s);
        });
        g.stroke();
      }),
      make(0.18, (g, tw) => {
        // Rolling hills with a sleeping village
        const r = seeded(57);
        g.fillStyle = '#26306a';
        g.beginPath();
        g.moveTo(0, gy);
        for (let x = 0; x <= tw; x += 8) g.lineTo(x, gy - (70 + Math.sin((x / tw) * Math.PI * 4) * 22) * s);
        g.lineTo(tw, gy);
        g.closePath();
        g.fill();
        for (let x = 20; x < tw - 20; x += (26 + r() * 40) * s) {
          const hy = gy - (70 + Math.sin((x / tw) * Math.PI * 4) * 22) * s;
          const bw = (14 + r() * 12) * s;
          const bh = (12 + r() * 14) * s;
          g.fillStyle = '#1a2253';
          if (r() < 0.12) {
            // church with steeple
            g.fillRect(x, hy - bh * 1.6, bw, bh * 1.6 + 6 * s);
            g.beginPath();
            g.moveTo(x - 1, hy - bh * 1.6);
            g.lineTo(x + bw / 2, hy - bh * 3.2);
            g.lineTo(x + bw + 1, hy - bh * 1.6);
            g.fill();
          } else {
            g.fillRect(x, hy - bh, bw, bh + 6 * s);
            g.beginPath();
            g.moveTo(x - 2, hy - bh);
            g.lineTo(x + bw / 2, hy - bh - bw * 0.45);
            g.lineTo(x + bw + 2, hy - bh);
            g.fill();
          }
          g.fillStyle = 'rgba(255, 210, 122, 0.9)';
          if (r() < 0.8) g.fillRect(x + bw * 0.3, hy - bh * 0.7, 2.5 * s, 3 * s);
          if (r() < 0.5) g.fillRect(x + bw * 0.65, hy - bh * 0.7, 2.5 * s, 3 * s);
        }
        g.fillStyle = 'rgba(220, 228, 255, 0.35)';
        g.beginPath();
        for (let x = 0; x <= tw; x += 8) {
          const y = gy - (70 + Math.sin((x / tw) * Math.PI * 4) * 22) * s;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        for (let x = tw; x >= 0; x -= 8) g.lineTo(x, gy - (66 + Math.sin((x / tw) * Math.PI * 4) * 22) * s);
        g.fill();
      }),
      make(0.42, (g, tw) => {
        // Pine forest band
        const r = seeded(91);
        for (let x = 0; x < tw; x += (10 + r() * 16) * s) {
          const ht = (40 + r() * 46) * s;
          const base = gy - 6 * s;
          const wd = ht * 0.36;
          g.fillStyle = '#121c3e';
          g.beginPath();
          g.moveTo(x - wd, base);
          g.lineTo(x, base - ht);
          g.lineTo(x + wd, base);
          g.fill();
          g.fillStyle = 'rgba(225, 232, 255, 0.55)';
          for (let k = 1; k <= 3; k++) {
            const ty = base - (ht * k) / 3.6;
            const tw2 = wd * (1 - k / 3.6);
            g.beginPath();
            g.moveTo(x - tw2, ty);
            g.quadraticCurveTo(x, ty - 5 * s, x + tw2 * 0.4, ty - 1);
            g.lineTo(x - tw2 * 0.2, ty + 2);
            g.fill();
          }
        }
        g.fillStyle = '#1b2754';
        g.fillRect(0, gy - 8 * s, tw, 10 * s);
      }),
    ];
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.bg) return;
    const { dpr, scale: s } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);
    // Twinkle a few stars live
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < 14; i++) {
      const x = ((i * 977) % 1000) / 1000 * this.w;
      const y = (((i * 631) % 1000) / 1000) * this.groundY * 0.55;
      const a = Math.max(0, Math.sin(this.clock * 1.7 + i * 2.3));
      ctx.globalAlpha = a * 0.9;
      ctx.drawImage(this.glow('#fff6dc'), x - 6, y - 6, 12, 12);
    }
    ctx.globalAlpha = 1;
    // Parallax tiles
    for (const l of this.layers) {
      const tw = l.canvas.width;
      const off = ((this.camX * s * l.factor * dpr) % tw + tw) % tw;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(l.canvas, -off, 0);
      ctx.drawImage(l.canvas, tw - off, 0);
    }
    // Far snowflakes
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const f of this.flakes) {
      if (f.depth > 0.8) continue;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // World
    ctx.setTransform(dpr * s, 0, 0, dpr * s, -this.camX * s * dpr, this.groundY * dpr);
    const left = this.camX - 60;
    const right = this.camX + this.viewW + 60;
    // Ground
    const gg = ctx.createLinearGradient(0, -6, 0, GROUND_PAD + 10);
    gg.addColorStop(0, '#eef2ff');
    gg.addColorStop(1, '#a9b6e2');
    ctx.fillStyle = gg;
    ctx.fillRect(left, -6, right - left, GROUND_PAD + 20);
    for (const h of this.houses) {
      if (h.x > right || h.x + h.w < left - 60) continue;
      this.drawDecor(ctx, h);
    }
    for (const h of this.houses) {
      if (h.x > right || h.x + h.w < left) continue;
      this.drawHouse(ctx, h);
    }
    for (const p of this.particles) if (p.kind === 'smoke') this.drawParticle(ctx, p);
    for (const h of this.houses) if (h.delivered && h.x < right && h.x + h.w > left) this.drawBadge(ctx, h);
    // Presents sliding into chimneys are clipped at the chimney top
    for (const p of this.presents) {
      if (p.state !== 'in' || !p.house) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.house.cx - 40, p.house.ctop - 80, 80, 80);
      ctx.clip();
      const k = Math.min(1, p.t / 0.35);
      this.drawPresent(ctx, p.house.cx, p.house.ctop - PR + k * 22, 0, p.color, p.ribbon, 1 - k * 0.3);
      ctx.restore();
    }
    for (const p of this.presents) {
      if (p.state === 'in') continue;
      const a = p.state === 'ground' ? Math.min(1, (4 - p.t) / 0.6) : 1;
      this.drawPresent(ctx, p.x, p.y, p.rot, p.color, p.ribbon, a);
    }
    for (const p of this.particles) if (p.kind !== 'smoke') this.drawParticle(ctx, p);
    this.drawSleigh(ctx);
    this.drawPopups(ctx);

    // Near snowflakes + vignette
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const f of this.flakes) {
      if (f.depth <= 0.8) continue;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    const v = ctx.createRadialGradient(this.w / 2, this.h * 0.5, Math.min(this.w, this.h) * 0.4, this.w / 2, this.h * 0.5, Math.max(this.w, this.h) * 0.8);
    v.addColorStop(0, 'rgba(4, 7, 32, 0)');
    v.addColorStop(1, 'rgba(4, 7, 32, 0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  private drawDecor(ctx: CanvasRenderingContext2D, h: House): void {
    const x = h.decorX;
    if (h.decor === 'tree') {
      ctx.fillStyle = '#4a2f24';
      ctx.fillRect(x - 3, -12, 6, 12);
      for (let i = 0; i < 3; i++) {
        const ty = -10 - i * 20;
        const tw = 26 - i * 7;
        ctx.fillStyle = '#1d4a3c';
        ctx.beginPath();
        ctx.moveTo(x - tw, ty);
        ctx.lineTo(x, ty - 30);
        ctx.lineTo(x + tw, ty);
        ctx.fill();
        ctx.fillStyle = 'rgba(245, 248, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(x - tw * 0.7, ty - 9);
        ctx.quadraticCurveTo(x, ty - 22, x + tw * 0.7, ty - 9);
        ctx.lineTo(x, ty - 26);
        ctx.fill();
      }
      // Tiny lights on the tree
      for (let i = 0; i < 6; i++) {
        const lx = x + Math.sin(i * 2.4) * (16 - i * 2.2);
        const ly = -16 - i * 9;
        const col = LIGHT_COLORS[i % LIGHT_COLORS.length];
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.clock * 3 + i + h.x);
        ctx.drawImage(this.glow(col), lx - 6, ly - 6, 12, 12);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#f7c873';
      ctx.beginPath();
      ctx.arc(x, -78, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (h.decor === 'lamp') {
      ctx.fillStyle = '#20253f';
      ctx.fillRect(x - 1.5, -54, 3, 54);
      ctx.fillRect(x - 6, -60, 12, 8);
      ctx.drawImage(this.glow('#ffd27a'), x - 26, -82, 52, 52);
      ctx.fillStyle = '#ffe2a0';
      ctx.fillRect(x - 4, -58, 8, 5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 7, -62, 14, 2.5);
    }
  }

  private drawHouse(ctx: CanvasRenderingContext2D, h: House): void {
    const { x, w, wallH, roofH } = h;
    // Wall
    const wg = ctx.createLinearGradient(x, 0, x + w, 0);
    wg.addColorStop(0, h.wall);
    wg.addColorStop(1, this.shade(h.wall, -0.25));
    ctx.fillStyle = wg;
    ctx.fillRect(x, -wallH, w, wallH);
    // Board lines
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let bx = x + 7; bx < x + w; bx += 7) {
      ctx.moveTo(bx, -wallH);
      ctx.lineTo(bx, 0);
    }
    ctx.stroke();
    // Corner trims
    ctx.fillStyle = h.trim;
    ctx.fillRect(x, -wallH, 3.5, wallH);
    ctx.fillRect(x + w - 3.5, -wallH, 3.5, wallH);
    // Windows with warm glow
    for (const win of h.windows) {
      if (win.lit) {
        ctx.drawImage(this.glow('#ffc86b'), win.x - 16, win.y - 14, win.w + 32, win.h + 28);
      }
      ctx.fillStyle = h.trim;
      ctx.fillRect(win.x - 2, win.y - 2, win.w + 4, win.h + 4);
      ctx.fillStyle = win.lit ? '#ffd27a' : '#232a52';
      ctx.fillRect(win.x, win.y, win.w, win.h);
      ctx.fillStyle = h.trim;
      ctx.fillRect(win.x + win.w / 2 - 0.8, win.y, 1.6, win.h);
      ctx.fillRect(win.x, win.y + win.h / 2 - 0.8, win.w, 1.6);
      ctx.fillStyle = '#f6f8ff';
      ctx.fillRect(win.x - 3, win.y + win.h + 1, win.w + 6, 2.5);
    }
    // Door with wreath
    if (wallH > 70) {
      const dx = x + w * 0.5 - 9;
      ctx.fillStyle = this.shade(h.wall, -0.45);
      ctx.beginPath();
      ctx.roundRect(dx, -26, 18, 26, [6, 6, 0, 0]);
      ctx.fill();
      ctx.strokeStyle = '#2f8a5e';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(dx + 9, -17, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#e0475b';
      ctx.fillRect(dx + 8, -14, 2, 2);
    }
    // Chimney (behind the roof edge)
    const cl = h.cx - h.cw / 2;
    const cbase = this.roofY(h, h.cx) + 10;
    const glowA = h.delivered ? 0.35 + h.glow * 0.65 : 0;
    if (glowA > 0) {
      ctx.globalAlpha = glowA;
      ctx.drawImage(this.glow('#f7c873'), h.cx - h.cw * 1.4, h.ctop - h.cw * 1.4, h.cw * 2.8, h.cw * 2.8);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#8a3a2e';
    ctx.fillRect(cl, h.ctop, h.cw, cbase - h.ctop);
    ctx.strokeStyle = 'rgba(40, 10, 10, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let yy = h.ctop + 7, row = 0; yy < cbase; yy += 7, row++) {
      ctx.moveTo(cl, yy);
      ctx.lineTo(cl + h.cw, yy);
      for (let bx = cl + (row % 2 ? 6 : 12); bx < cl + h.cw; bx += 12) {
        ctx.moveTo(bx, yy - 7);
        ctx.lineTo(bx, yy);
      }
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(cl + h.cw * 0.7, h.ctop, h.cw * 0.3, cbase - h.ctop);
    // Opening + snowy cap
    ctx.fillStyle = h.delivered ? '#ffcf73' : '#1a0e10';
    ctx.fillRect(cl + 4, h.ctop - 1, h.cw - 8, 4);
    ctx.fillStyle = '#6e2c24';
    ctx.fillRect(cl - 3, h.ctop, h.cw + 6, 5);
    ctx.fillStyle = '#f6f8ff';
    ctx.beginPath();
    ctx.roundRect(cl - 4, h.ctop - 3, 9, 5, 2.5);
    ctx.roundRect(cl + h.cw - 5, h.ctop - 3, 9, 5, 2.5);
    ctx.fill();
    // Roof
    const mid = x + w / 2;
    const eaveY = -wallH + 4;
    const peakY = -wallH - roofH;
    ctx.fillStyle = h.roof;
    ctx.beginPath();
    ctx.moveTo(x - 10, eaveY);
    ctx.lineTo(mid, peakY);
    ctx.lineTo(x + w + 10, eaveY);
    ctx.lineTo(x + w + 10, eaveY + 5);
    ctx.lineTo(x - 10, eaveY + 5);
    ctx.closePath();
    ctx.fill();
    // Thick snow layer
    ctx.fillStyle = '#f4f7ff';
    ctx.beginPath();
    ctx.moveTo(x - 12, eaveY + 1);
    ctx.lineTo(mid, peakY - 5);
    ctx.lineTo(x + w + 12, eaveY + 1);
    ctx.quadraticCurveTo(x + w * 0.78, eaveY - roofH * 0.25, mid, peakY + roofH * 0.35);
    ctx.quadraticCurveTo(x + w * 0.22, eaveY - roofH * 0.25, x - 12, eaveY + 1);
    ctx.fill();
    ctx.fillStyle = 'rgba(160, 180, 230, 0.4)';
    ctx.beginPath();
    ctx.moveTo(mid, peakY - 5);
    ctx.lineTo(x + w + 12, eaveY + 1);
    ctx.quadraticCurveTo(x + w * 0.85, eaveY - roofH * 0.2, mid, peakY + roofH * 0.2);
    ctx.fill();
    // Icicles
    ctx.fillStyle = 'rgba(215, 232, 255, 0.85)';
    for (let ix = x - 6; ix < x + w + 8; ix += 8) {
      const len = 4 + ((ix * 13) % 7);
      ctx.beginPath();
      ctx.moveTo(ix - 1.6, eaveY + 4);
      ctx.lineTo(ix, eaveY + 4 + len);
      ctx.lineTo(ix + 1.6, eaveY + 4);
      ctx.fill();
    }
    // Fairy lights along the eaves
    if (h.lights) {
      for (let k = 0, lx = x - 4; lx < x + w + 6; lx += 11, k++) {
        const ly = eaveY + 7 + Math.sin((lx - x) * 0.3) * 1.5;
        const col = LIGHT_COLORS[k % LIGHT_COLORS.length];
        ctx.globalAlpha = 0.45 + 0.55 * Math.max(0, Math.sin(this.clock * 2.5 + k * 1.3));
        ctx.drawImage(this.glow(col), lx - 7, ly - 7, 14, 14);
        ctx.globalAlpha = 1;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(lx, ly, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawBadge(ctx: CanvasRenderingContext2D, h: House): void {
    const y = h.ctop - 30 + Math.sin(this.clock * 3 + h.x) * 2;
    ctx.globalAlpha = 0.8;
    ctx.drawImage(this.glow('#5cf2b3'), h.cx - 22, y - 22, 44, 44);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1f6f58';
    ctx.beginPath();
    ctx.arc(h.cx, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(h.cx - 4, y);
    ctx.lineTo(h.cx - 1, y + 3.5);
    ctx.lineTo(h.cx + 4.5, y - 3.5);
    ctx.stroke();
  }

  private drawPresent(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, color: string, ribbon: string, alpha: number): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-PR, -PR + 2, PR * 2, PR * 2 - 2, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(PR * 0.3, -PR + 2, PR * 0.7, PR * 2 - 2);
    ctx.fillStyle = ribbon;
    ctx.fillRect(-1.6, -PR + 2, 3.2, PR * 2 - 2);
    ctx.fillRect(-PR, -1, PR * 2, 3);
    // Bow
    ctx.beginPath();
    ctx.ellipse(-3, -PR + 1, 3.4, 2.2, -0.5, 0, Math.PI * 2);
    ctx.ellipse(3, -PR + 1, 3.4, 2.2, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const a = Math.max(0, p.life / p.max);
    if (p.kind === 'smoke') {
      ctx.globalAlpha = 0.22 * a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'coin') {
      // Little spinning coins of light
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.drawImage(this.glow(p.color), p.x - p.r * 3, p.y - p.r * 3, p.r * 6, p.r * 6);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * Math.abs(Math.sin(this.clock * 9 + p.x)), p.r, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = Math.min(1, a * 1.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (p.kind === 'puff' ? 1.5 - a * 0.5 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawSleigh(ctx: CanvasRenderingContext2D): void {
    const x = this.camX + this.sleighOff;
    const y = SLEIGH_Y + this.bob();
    const gallop = this.clock * 10;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(this.clock * 2.1 + 0.6) * 0.03);

    // Reindeer team + reins
    const deer = (dx: number, phase: number, nose: boolean) => {
      const dy = Math.sin(gallop + phase) * 2.5;
      ctx.save();
      ctx.translate(dx, -12 + dy);
      // legs
      ctx.strokeStyle = '#5a3a28';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      const l1 = Math.sin(gallop + phase) * 0.7;
      const l2 = Math.sin(gallop + phase + Math.PI) * 0.7;
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.lineTo(-8 - 9 * Math.sin(l1 + 0.6), 2 + 9 * Math.cos(l1 + 0.6));
      ctx.moveTo(8, 2);
      ctx.lineTo(8 + 9 * Math.sin(l2 + 0.6), 2 + 9 * Math.cos(l2 + 0.6));
      ctx.stroke();
      // body
      ctx.fillStyle = '#8a5a3c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9b48c';
      ctx.beginPath();
      ctx.ellipse(1, 2.5, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // neck & head
      ctx.fillStyle = '#8a5a3c';
      ctx.beginPath();
      ctx.moveTo(8, -3);
      ctx.lineTo(14, -13);
      ctx.lineTo(18, -11);
      ctx.lineTo(13, -1);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(18, -13, 5.5, 3.6, 0.25, 0, Math.PI * 2);
      ctx.fill();
      // antlers
      ctx.strokeStyle = '#e9d3a8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(15, -16);
      ctx.lineTo(12, -24);
      ctx.moveTo(13, -20);
      ctx.lineTo(9, -22);
      ctx.moveTo(17, -16);
      ctx.lineTo(18, -25);
      ctx.moveTo(18, -21);
      ctx.lineTo(22, -24);
      ctx.stroke();
      // eye, collar bell, nose
      ctx.fillStyle = '#1b1b28';
      ctx.beginPath();
      ctx.arc(18.5, -14.5, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c33c4c';
      ctx.fillRect(9, -5, 6, 2.4);
      ctx.fillStyle = '#f7c873';
      ctx.beginPath();
      ctx.arc(12, -2, 1.6, 0, Math.PI * 2);
      ctx.fill();
      if (nose) {
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.clock * 6);
        ctx.drawImage(this.glow('#ff3b4f'), 14, -23, 20, 20);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = nose ? '#ff3b4f' : '#3a2620';
      ctx.beginPath();
      ctx.arc(23.4, -12.6, nose ? 2.2 : 1.5, 0, Math.PI * 2);
      ctx.fill();
      // tail
      ctx.fillStyle = '#f3e6d0';
      ctx.beginPath();
      ctx.arc(-13, -3, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    ctx.strokeStyle = '#c9a65a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(22, -16);
    ctx.quadraticCurveTo(45, -6, 60, -14 + Math.sin(gallop) * 2.5);
    ctx.moveTo(60, -14);
    ctx.quadraticCurveTo(80, -8, 98, -14 + Math.sin(gallop + 1.2) * 2.5);
    ctx.stroke();
    deer(60, 0, false);
    deer(98, 1.2, true);

    // Sack with presents peeking out
    ctx.fillStyle = '#8a6a4a';
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.quadraticCurveTo(-34, -30, -18, -34);
    ctx.quadraticCurveTo(-4, -34, -8, -6);
    ctx.fill();
    ctx.fillStyle = '#e0475b';
    ctx.fillRect(-23, -40, 8, 8);
    ctx.fillStyle = '#3aae8a';
    ctx.fillRect(-16, -38, 7, 6);
    ctx.fillStyle = '#f7c873';
    ctx.fillRect(-20.5, -40, 2, 8);
    ctx.strokeStyle = '#5a3a28';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-26, -31);
    ctx.quadraticCurveTo(-17, -28, -9, -31);
    ctx.stroke();

    // Santa
    ctx.fillStyle = '#c6283b';
    ctx.beginPath();
    ctx.ellipse(2, -14, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd9bf';
    ctx.beginPath();
    ctx.arc(4, -27, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-1, -26);
    ctx.quadraticCurveTo(4, -12, 10, -25);
    ctx.quadraticCurveTo(5, -22, -1, -26);
    ctx.fill();
    ctx.fillStyle = '#1b1b28';
    ctx.beginPath();
    ctx.arc(6.2, -28.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c6283b';
    ctx.beginPath();
    ctx.moveTo(-2, -30);
    ctx.quadraticCurveTo(2, -40, 9, -31);
    ctx.lineTo(-2, -30);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.quadraticCurveTo(-6, -40, -8, -33);
    ctx.lineTo(-4, -33);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -31.5, 13, 3);
    ctx.beginPath();
    ctx.arc(-8, -32, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Arm holding reins
    ctx.strokeStyle = '#c6283b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6, -17);
    ctx.lineTo(16, -14);
    ctx.stroke();
    ctx.fillStyle = '#1b1b28';
    ctx.beginPath();
    ctx.arc(17, -14, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Sleigh body
    const body = ctx.createLinearGradient(0, -16, 0, 4);
    body.addColorStop(0, '#e0475b');
    body.addColorStop(1, '#8e1c2e');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-32, -18);
    ctx.quadraticCurveTo(-36, -2, -24, 2);
    ctx.lineTo(16, 2);
    ctx.quadraticCurveTo(26, 0, 24, -10);
    ctx.quadraticCurveTo(30, -12, 28, -6);
    ctx.lineTo(26, -4);
    ctx.quadraticCurveTo(20, -6, 14, -8);
    ctx.lineTo(-20, -8);
    ctx.quadraticCurveTo(-26, -10, -32, -18);
    ctx.fill();
    ctx.strokeStyle = '#f7c873';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-31, -15);
    ctx.quadraticCurveTo(-26, -6, -18, -6);
    ctx.lineTo(14, -6);
    ctx.stroke();
    // Gold swirl
    ctx.beginPath();
    ctx.arc(-14, -2, 3, 0, Math.PI * 1.5);
    ctx.stroke();
    // Runners
    ctx.strokeStyle = '#f7c873';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, 2);
    ctx.lineTo(-20, 7);
    ctx.moveTo(10, 2);
    ctx.lineTo(10, 7);
    ctx.moveTo(-30, 7);
    ctx.lineTo(24, 7);
    ctx.quadraticCurveTo(34, 7, 32, -1);
    ctx.quadraticCurveTo(30, -5, 27, -2);
    ctx.stroke();
    ctx.restore();
  }

  private drawPopups(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      const pop = 1 + Math.max(0, p.life - 0.9) * 0.8;
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.font = `800 ${(16 * pop).toFixed(1)}px Nunito, system-ui, sans-serif`;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(10, 15, 36, 0.8)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  private shade(hex: string, amt: number): string {
    const n = parseInt(hex.slice(1), 16);
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
    const r = f((n >> 16) & 255);
    const g = f((n >> 8) & 255);
    const b = f(n & 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
}
