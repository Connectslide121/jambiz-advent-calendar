import {
  AfterViewInit,
  ChangeDetectorRef,
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

export interface SnowballTossConfig {
  /** Number of snowmen to knock down (1–7). Default 3 */
  snowmen?: number;
  /** Snowballs available (at least the number of snowmen). Default snowmen + 3 */
  snowballs?: number;
  /** Constant wind, -1 (strong, to the left) … 1 (strong, to the right). Default 0 */
  wind?: number;
  /** How many snowmen slide back and forth on ice ledges (0–3, true = 1). Default 0 */
  moving?: number | boolean;
  /** Fraction of the flight shown by the dotted aim preview (0.15–1). Default 1 */
  preview?: number;
  /** Endless bonus mode: waves of snowmen until the snowballs run out. Never emits `completed` */
  endless?: boolean;
}

type Phase = 'intro' | 'playing' | 'won' | 'lost';
type HatType = 'top' | 'beanie' | 'pot';

interface Snowman {
  id: number;
  /** World x of the snowman's centre (updated every frame for moving ones) */
  x: number;
  /** Height of the surface it stands on (0 = ground) */
  base: number;
  fortH: number;
  fortHalf: number;
  ledge: number; // -1 when static
  amp: number;
  phase: number;
  alive: boolean;
  scarf: string;
  hat: HatType;
  hit: number; // seconds since it was knocked down (for the remaining lump)
  wobble: number;
}

interface Ledge {
  cx: number;
  y: number; // height of the top surface
  halfW: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  trail: { x: number; y: number }[];
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
  kind: 'puff' | 'chunk' | 'spark';
}

interface Hat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  type: HatType;
  resting: boolean;
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

/** Physics constants (world units: the play field is 440–560 units wide) */
const G = 500;
const WIND_ACC = 95;
const POWER = 6.2;
const MAX_DRAG = 92;
const MIN_DRAG = 12;
/** The ball only moves part of the pull-back distance, so it stays on screen */
const PULL_VIS = 0.4;
const BALL_R = 7;
const STEP = 1 / 120;
const ANCHOR = { x: 66, y: -60 };
const FORT_HALF = 22;
const FORT_HEIGHTS = [0, 46, 14, 72, 30, 58, 22];
const LEDGE_HEIGHTS = [[72], [40, 140], [26, 112, 198]];
const SCARVES = ['#e0475b', '#3aae8a', '#7fb8ff', '#f7c873', '#d58bff', '#ff9f43', '#5cf2b3'];
const HATS: HatType[] = ['top', 'beanie', 'pot', 'top', 'beanie', 'top', 'pot'];
const LIGHT_COLORS = ['#ff5a6e', '#f7c873', '#5cf2b3', '#7fb8ff', '#ffb36b', '#d58bff'];
const HIT_NOTES = [783.99, 880, 987.77, 1046.5, 1174.66, 1318.51, 1567.98];

/** Small seeded PRNG so the scenery and level layouts are identical on every retry */
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
 * "Snowball Fight" - a slingshot-style throwing game in a snowy backyard at dusk.
 * Drag back from the snowball, watch the dotted preview and the windsock, release to throw.
 * Knock down every snowman before the snowballs run out.
 */
@Component({
  selector: 'app-snowball-toss-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './snowball-toss-challenge.html',
  styleUrl: './snowball-toss-challenge.scss',
})
export class SnowballTossChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: SnowballTossConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Check = Check;
  readonly RotateCcw = RotateCcw;

  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);

  // ---- State shown by the template ----
  phase: Phase = 'intro';
  totalSnowmen = 3;
  totalBalls = 6;
  ballsLeft = 6;
  snowmenLeft = 3;
  score = 0;
  bestScore: number | null = null;
  wind = 0;
  attempts = 0;
  ballSlots: number[] = [];
  endless = false;
  wave = 1;
  newBest = false;

  // ---- Level ----
  snowmen: Snowman[] = [];
  ledges: Ledge[] = [];
  private movingCount = 0;
  private previewFrac = 1;
  /** Game clock (only runs while playing) - drives the sliding snowmen */
  time = 0;

  // ---- Throwing ----
  private ball: Ball | null = null;
  private ready = true;
  private reloadT = 0;
  private aiming = false;
  private dragStart = { x: 0, y: 0 };
  /** Current pull-back in world units (ball offset from the anchor) */
  private drag = { x: 0, y: 0 };
  private keyAim = { angle: -0.85, power: 0.7, active: false };
  private pointerId: number | null = null;
  private ballAcc = 0;

  // ---- Effects ----
  private particles: Particle[] = [];
  private hats: Hat[] = [];
  private popups: Popup[] = [];
  private flakes: Flake[] = [];
  private shake = 0;
  private flash = 0;
  private winT = 0;
  private reducedMotion = false;

  // ---- Canvas / view ----
  private ctx!: CanvasRenderingContext2D;
  private bg: HTMLCanvasElement | null = null;
  private glowSprites: Record<string, HTMLCanvasElement> = {};
  private bulbs: { x: number; y: number; c: string; p: number }[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  worldW = 560;
  private portrait = false;
  private groundPad = 38;
  scale = 1;
  offX = 0;
  groundY = 0;
  private clock = 0;

  // ---- Lifecycle handles ----
  private raf = 0;
  private lastT = 0;
  private running = false;
  private ro?: ResizeObserver;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private unlisten: (() => void)[] = [];

  ngOnInit(): void {
    const c = this.config ?? {};
    this.totalSnowmen = Math.max(1, Math.min(7, Math.round(c.snowmen ?? 3)));
    this.totalBalls = Math.max(this.totalSnowmen, Math.round(c.snowballs ?? this.totalSnowmen + 3));
    this.wind = Math.max(-1.2, Math.min(1.2, c.wind ?? 0));
    const mv = c.moving === true ? 1 : c.moving === false || c.moving == null ? 0 : c.moving;
    this.movingCount = Math.max(0, Math.min(3, Math.round(mv), this.totalSnowmen));
    this.previewFrac = Math.max(0.15, Math.min(1, c.preview ?? 1));
    this.endless = !!c.endless;
    const key = this.day ?? this.levelId;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestScore = stats?.bestScore ?? null;
    try {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      this.reducedMotion = false;
    }
    this.resetLevel();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.stageRef.nativeElement);
      this.resize();

      const on = <K extends keyof HTMLElementEventMap>(
        el: HTMLElement | Document | Window,
        type: K | string,
        fn: (e: any) => void,
        opts?: AddEventListenerOptions
      ) => {
        el.addEventListener(type, fn, opts);
        this.unlisten.push(() => el.removeEventListener(type, fn, opts));
      };
      on(canvas, 'pointerdown', (e: PointerEvent) => this.onDown(e));
      on(canvas, 'pointermove', (e: PointerEvent) => this.onMove(e));
      on(canvas, 'pointerup', (e: PointerEvent) => this.onUp(e));
      on(canvas, 'pointercancel', () => this.cancelAim());
      on(canvas, 'lostpointercapture', (e: PointerEvent) => {
        if (this.aiming && e.pointerId === this.pointerId) this.onUp(e);
      });
      on(window, 'keydown', (e: KeyboardEvent) => this.onKey(e));
      on(document, 'visibilitychange', () => {
        if (document.hidden) this.stop();
        else this.start();
      });
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
  // Public actions (template)
  // =====================================================================

  startGame(): void {
    this.resetLevel();
    this.resize(true);
    this.phase = 'playing';
    this.attempts++;
    this.sound.jingle();
    this.canvasRef.nativeElement.focus({ preventScroll: true });
  }

  retry(): void {
    this.startGame();
  }

  showReward(): void {
    this.completed.emit();
  }

  get windLabel(): string {
    return Math.abs(this.wind) < 0.05 ? '' : (Math.abs(this.wind) * 10).toFixed(0);
  }

  get windArrow(): string {
    if (Math.abs(this.wind) < 0.05) return '';
    return this.wind > 0 ? '→' : '←';
  }

  // =====================================================================
  // Level setup
  // =====================================================================

  private resetLevel(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
    this.time = 0;
    this.ball = null;
    this.ready = true;
    this.reloadT = 0;
    this.aiming = false;
    this.drag = { x: 0, y: 0 };
    this.particles = [];
    this.hats = [];
    this.popups = [];
    this.shake = 0;
    this.flash = 0;
    this.winT = 0;
    this.score = 0;
    this.newBest = false;
    if (this.endless) {
      this.wave = 1;
      this.configureWave(1);
      this.totalBalls = this.totalSnowmen + 3;
    }
    this.ballsLeft = this.totalBalls;
    this.buildSnowmen();
  }

  /** Endless mode: each wave brings more snowmen, wind, sliders and a shorter preview */
  private configureWave(k: number): void {
    this.totalSnowmen = Math.min(6, 1 + k);
    this.movingCount = k >= 3 ? Math.min(2, Math.floor((k - 1) / 2)) : 0;
    this.wind = k >= 2 ? (Math.random() < 0.5 ? -1 : 1) * Math.min(0.9, 0.15 * k + Math.random() * 0.15) : 0;
    this.previewFrac = Math.max(0.3, 1 - 0.12 * (k - 1));
  }

  private nextWave(): void {
    const leftover = this.ballsLeft;
    this.zone.run(() => {
      this.wave++;
      this.popups.push({ x: this.worldW * 0.6, y: -200, text: `🌊 ${this.wave}`, life: 1.6, color: '#cfe6ff' });
    });
    this.ready = false;
    this.reloadT = 99;
    this.sound.jingle();
    this.timers.push(
      setTimeout(() => {
        if (this.phase !== 'playing') return;
        this.configureWave(this.wave);
        this.hats = this.hats.slice(-6);
        this.zone.run(() => {
          // Clearing a wave refills the snowballs (and a few leftovers carry over)
          this.ballsLeft = this.totalSnowmen + 2 + Math.min(3, leftover);
          this.totalBalls = Math.max(this.totalBalls, this.ballsLeft);
          this.buildSnowmen();
        });
        this.resize(true);
        this.ready = true;
        this.reloadT = 0;
      }, 1100)
    );
  }

  private buildSnowmen(): void {
    this.snowmenLeft = this.totalSnowmen;
    this.ballSlots = Array.from({ length: Math.max(this.totalBalls, this.ballsLeft) }, (_, i) => i);
    this.snowmen = [];
    for (let i = 0; i < this.totalSnowmen; i++) {
      this.snowmen.push({
        id: i,
        x: 0,
        base: 0,
        fortH: 0,
        fortHalf: FORT_HALF,
        ledge: -1,
        amp: 0,
        phase: i * 1.7,
        alive: true,
        scarf: SCARVES[i % SCARVES.length],
        hat: HATS[i % HATS.length],
        hit: 0,
        wobble: 0,
      });
    }
    this.layout();
  }

  /** Positions depend on the world width (portrait screens get a narrower yard) */
  private layout(): void {
    const W = this.worldW;
    const z0 = W * (this.portrait ? 0.36 : 0.42);
    const z1 = W - 24;
    const m = this.movingCount;
    const c = this.totalSnowmen - m;
    const s1 = m > 0 ? z0 + (z1 - z0) * (this.portrait ? 0.62 : 0.56) : z1;
    const spacing = (s1 - z0) / Math.max(1, c);
    // Narrow yards (phones) stack the snowmen on a staircase fort so they never hide each other
    const stairs = spacing < 62;
    const statics = this.snowmen.filter((_, i) => i < c);
    statics.forEach((s, i) => {
      s.x = z0 + (i + 0.5) * spacing;
      s.fortH = c === 1 ? 0 : stairs ? i * 44 : FORT_HEIGHTS[i % FORT_HEIGHTS.length];
      s.fortHalf = Math.min(FORT_HALF, spacing / 2 + 1);
      s.base = s.fortH;
      s.ledge = -1;
    });
    this.ledges = [];
    if (m > 0) {
      const l0 = s1 + 10;
      const halfW = (z1 - l0) / 2;
      const cx = l0 + halfW;
      LEDGE_HEIGHTS[m - 1].forEach((y) => this.ledges.push({ cx, y, halfW }));
      this.snowmen.slice(c).forEach((s, k) => {
        s.ledge = k;
        s.base = this.ledges[k].y;
        s.amp = Math.max(10, halfW - 20);
        s.fortH = 0;
        if (s.alive) s.x = this.movingX(s, this.time);
      });
    }
  }

  /** Where a snowman is at game time t (moving ones glide on their ledge) */
  movingX(s: Snowman, t: number): number {
    if (s.ledge < 0) return s.x;
    const l = this.ledges[s.ledge];
    return l.cx + s.amp * Math.sin(t * 1.25 + s.phase);
  }

  // =====================================================================
  // Physics (pure helpers - also usable for automated play testing)
  // =====================================================================

  /** Launch velocity for a pull-back vector (world units) */
  launchVelocity(dx: number, dy: number): { vx: number; vy: number } {
    const d = Math.hypot(dx, dy);
    const k = d > MAX_DRAG ? MAX_DRAG / d : 1;
    return { vx: -dx * k * POWER, vy: -dy * k * POWER };
  }

  private integrate(b: { x: number; y: number; vx: number; vy: number }): void {
    b.vx += this.wind * WIND_ACC * STEP;
    b.vy += G * STEP;
    b.x += b.vx * STEP;
    b.y += b.vy * STEP;
  }

  /** What a ball at (x, y) touches: snowman id, 'solid', 'ground', 'out' or null */
  private collide(x: number, y: number, t: number): number | 'solid' | 'ground' | 'out' | null {
    for (const s of this.snowmen) {
      if (!s.alive) continue;
      const sx = s.ledge >= 0 ? this.movingX(s, t) : s.x;
      const by = -s.base;
      if (this.hitsSnowman(x - sx, y - by, s.hat)) return s.id;
    }
    for (const s of this.snowmen) {
      if (s.fortH > 0 && Math.abs(x - s.x) < s.fortHalf + BALL_R * 0.6 && y > -s.fortH - BALL_R * 0.6) return 'solid';
    }
    for (const l of this.ledges) {
      if (Math.abs(x - l.cx) < l.halfW + 4 && y > -l.y - BALL_R * 0.7 && y < -l.y + 12) return 'solid';
    }
    if (y > -BALL_R * 0.5) return 'ground';
    if (x > this.worldW + 260 || x < -260 || y > 60) return 'out';
    return null;
  }

  private hitsSnowman(dx: number, dy: number, hat: HatType): boolean {
    const r = BALL_R + 1.5;
    const parts: [number, number][] = [
      [-17, 19],
      [-42, 14],
      [-62, 11],
    ];
    for (const [cy, pr] of parts) {
      if (dx * dx + (dy - cy) * (dy - cy) < (pr + r) * (pr + r)) return true;
    }
    if (hat && Math.abs(dx) < 11 + r * 0.6 && dy > -88 - r * 0.6 && dy < -66) return true;
    return false;
  }

  /**
   * Simulates a throw from the anchor with the given pull-back, starting at game time t0.
   * Returns the snowman id that would be hit (or -1) and the sampled path.
   */
  predictThrow(dx: number, dy: number, t0 = this.time): { hit: number; path: { x: number; y: number }[] } {
    const v = this.launchVelocity(dx, dy);
    const d = Math.min(Math.hypot(dx, dy), MAX_DRAG);
    const k = Math.hypot(dx, dy) > 0 ? d / Math.hypot(dx, dy) : 0;
    const b = { x: ANCHOR.x + dx * k * PULL_VIS, y: ANCHOR.y + dy * k * PULL_VIS, vx: v.vx, vy: v.vy };
    const path: { x: number; y: number }[] = [];
    let t = 0;
    for (let i = 0; i < 1200; i++) {
      this.integrate(b);
      t += STEP;
      if (i % 4 === 0) path.push({ x: b.x, y: b.y });
      const c = this.collide(b.x, b.y, t0 + t);
      if (c !== null) return { hit: typeof c === 'number' ? c : -1, path };
    }
    return { hit: -1, path };
  }

  // =====================================================================
  // Input
  // =====================================================================

  private toWorld(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this.offX) / this.scale,
      y: (e.clientY - rect.top - this.groundY) / this.scale,
    };
  }

  private onDown(e: PointerEvent): void {
    if (this.phase !== 'playing' || !this.ready || this.ball || this.ballsLeft <= 0) return;
    e.preventDefault();
    this.aiming = true;
    this.keyAim.active = false;
    this.pointerId = e.pointerId;
    try {
      this.canvasRef.nativeElement.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events cannot always be captured - dragging still works
    }
    this.dragStart = this.toWorld(e);
    this.drag = { x: 0, y: 0 };
  }

  private onMove(e: PointerEvent): void {
    if (!this.aiming || e.pointerId !== this.pointerId) return;
    const p = this.toWorld(e);
    let dx = p.x - this.dragStart.x;
    let dy = p.y - this.dragStart.y;
    const d = Math.hypot(dx, dy);
    if (d > MAX_DRAG) {
      dx *= MAX_DRAG / d;
      dy *= MAX_DRAG / d;
    }
    this.drag = { x: dx, y: dy };
  }

  private onUp(e: PointerEvent): void {
    if (!this.aiming || e.pointerId !== this.pointerId) return;
    this.onMove(e);
    this.aiming = false;
    this.pointerId = null;
    if (Math.hypot(this.drag.x, this.drag.y) < MIN_DRAG || this.drag.x > 0) {
      // Too small (or pulled forwards) - treat as a cancelled aim
      this.drag = { x: 0, y: 0 };
      return;
    }
    this.throwBall();
  }

  private cancelAim(): void {
    this.aiming = false;
    this.pointerId = null;
    this.drag = { x: 0, y: 0 };
  }

  private onKey(e: KeyboardEvent): void {
    if (this.phase !== 'playing') return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
    const k = e.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(k)) return;
    e.preventDefault();
    if (!this.ready || this.ball) return;
    const a = this.keyAim;
    a.active = true;
    if (k === 'ArrowUp') a.angle = Math.max(-1.45, a.angle - 0.04);
    if (k === 'ArrowDown') a.angle = Math.min(0.3, a.angle + 0.04);
    if (k === 'ArrowRight') a.power = Math.min(1, a.power + 0.03);
    if (k === 'ArrowLeft') a.power = Math.max(0.2, a.power - 0.03);
    // Throw direction is (cos, sin) of the angle - the pull-back is the opposite
    this.drag = {
      x: -Math.cos(a.angle) * a.power * MAX_DRAG,
      y: -Math.sin(a.angle) * a.power * MAX_DRAG,
    };
    if (k === ' ' || k === 'Enter') {
      a.active = false;
      this.throwBall();
    }
  }

  private throwBall(): void {
    const v = this.launchVelocity(this.drag.x, this.drag.y);
    this.ball = {
      x: ANCHOR.x + this.drag.x * PULL_VIS,
      y: ANCHOR.y + this.drag.y * PULL_VIS,
      vx: v.vx,
      vy: v.vy,
      t: 0,
      trail: [],
    };
    this.ballAcc = 0;
    this.ready = false;
    this.drag = { x: 0, y: 0 };
    this.zone.run(() => {
      this.ballsLeft--;
    });
    this.sound.whoosh();
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
    const playing = this.phase === 'playing';
    if (playing) this.time += dt;

    // Sliding snowmen
    for (const s of this.snowmen) {
      if (s.alive && s.ledge >= 0) s.x = this.movingX(s, this.time);
      if (!s.alive) s.hit += dt;
      s.wobble *= Math.pow(0.02, dt);
    }

    // Ball flight in fixed steps so it matches the preview exactly
    if (this.ball) {
      const b = this.ball;
      this.ballAcc += dt;
      while (this.ballAcc >= STEP && this.ball) {
        this.ballAcc -= STEP;
        this.integrate(b);
        b.t += STEP;
        const c = this.collide(b.x, b.y, this.time - this.ballAcc);
        if (c !== null) this.resolveBall(c);
      }
      if (this.ball) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 14) b.trail.shift();
      }
    } else if (!this.ready && playing) {
      this.reloadT -= dt;
      if (this.reloadT <= 0 && this.ballsLeft > 0) this.ready = true;
    }

    // Effects
    const drag = Math.pow(0.12, dt);
    for (const p of this.particles) {
      p.life -= dt;
      p.vx *= p.kind === 'puff' ? drag : 1;
      p.vy = p.vy * (p.kind === 'puff' ? drag : 1) + (p.kind === 'puff' ? 60 : 520) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind !== 'puff' && p.y > -1) {
        p.y = -1;
        p.vy *= -0.3;
        p.vx *= 0.6;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const h of this.hats) {
      if (h.resting) continue;
      h.vy += 520 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.vr * dt;
      const floor = this.surfaceAt(h.x);
      if (h.y > -floor - 3 && h.vy > 0) {
        h.y = -floor - 3;
        if (Math.abs(h.vy) < 90) {
          h.resting = true;
          h.rot = h.rot % (Math.PI * 2);
          h.rot = Math.abs(h.rot) > Math.PI / 2 ? Math.PI * 0.9 : 0.25 * Math.sign(h.vx || 1);
        } else {
          h.vy *= -0.35;
          h.vx *= 0.5;
          h.vr *= 0.5;
        }
      }
    }
    for (const p of this.popups) {
      p.life -= dt;
      p.y -= 34 * dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
    this.shake *= Math.pow(0.004, dt);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.phase === 'won') {
      this.winT += dt;
      if (Math.random() < dt * 9) this.burstConfetti();
    }

    // Snowfall drifts with the wind
    for (const f of this.flakes) {
      f.y += f.vy * dt;
      f.x += (Math.sin(this.clock * 0.9 + f.phase) * 10 + this.wind * 46) * f.depth * dt;
      if (f.y > this.h + 4) {
        f.y = -4;
        f.x = Math.random() * this.w;
      }
      if (f.x > this.w + 4) f.x = -4;
      if (f.x < -4) f.x = this.w + 4;
    }
  }

  /** Height of whatever a falling hat lands on */
  private surfaceAt(x: number): number {
    let top = 0;
    for (const s of this.snowmen) if (s.fortH > 0 && Math.abs(x - s.x) < s.fortHalf) top = Math.max(top, s.fortH);
    return top;
  }

  private resolveBall(c: number | 'solid' | 'ground' | 'out'): void {
    const b = this.ball!;
    this.ball = null;
    this.reloadT = 0.35;
    if (typeof c === 'number') {
      const s = this.snowmen[c];
      this.knockDown(s, b);
    } else if (c !== 'out') {
      this.puff(b.x, Math.min(b.y, -2), 12, 0.7);
      this.sound.bell(420, 0.05);
    }
    this.afterThrow();
  }

  private knockDown(s: Snowman, b: Ball): void {
    s.alive = false;
    s.hit = 0;
    const by = -s.base;
    // The snowman bursts into puffs...
    this.puff(s.x, by - 40, 34, 1.4);
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: s.x + (Math.random() - 0.5) * 10,
        y: by - 60 + Math.random() * 30,
        vx: b.vx * 0.25 + (Math.random() - 0.5) * 160,
        vy: -120 - Math.random() * 160,
        r: i === 0 ? 4 : 2.2,
        life: 1.6,
        max: 1.6,
        color: i === 0 ? '#ff8a3d' : '#1b1b28',
        kind: 'chunk',
      });
    }
    // ...and loses its hat
    this.hats.push({
      x: s.x,
      y: by - 76,
      vx: b.vx * 0.35 + 40,
      vy: -260 - Math.random() * 80,
      rot: 0,
      vr: (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 5),
      type: s.hat,
      resting: false,
    });
    if (!this.reducedMotion) this.shake = 7;
    this.flash = 0.6;
    const killed = this.totalSnowmen - this.snowmen.filter((x) => x.alive).length;
    const pts = 100 + (s.ledge >= 0 ? 50 : 0);
    this.popups.push({ x: s.x, y: by - 96, text: `+${pts}`, life: 1.2, color: '#f7c873' });
    this.sound.bell(HIT_NOTES[(killed - 1) % HIT_NOTES.length], 0.16);
    this.sound.bell(HIT_NOTES[(killed + 1) % HIT_NOTES.length] * 2, 0.05, 0.05);
    this.zone.run(() => {
      this.score += pts;
      this.snowmenLeft = this.snowmen.filter((x) => x.alive).length;
    });
  }

  private afterThrow(): void {
    if (this.snowmenLeft === 0 && this.phase === 'playing') {
      if (this.endless) this.nextWave();
      else this.win();
    } else if (this.ballsLeft <= 0 && this.phase === 'playing') {
      this.timers.push(
        setTimeout(() => {
          if (this.phase !== 'playing') return;
          this.zone.run(() => {
            this.phase = 'lost';
            if (this.endless) this.saveEndless();
            this.cdr.markForCheck();
          });
          this.sound.thud();
        }, 700)
      );
    }
  }

  private saveEndless(): void {
    const key = this.day ?? this.levelId;
    this.newBest = this.score > (this.bestScore ?? 0);
    if (this.newBest) this.bestScore = this.score;
    if (key) {
      const prev = this.stateService.getGameStats(key) ?? {};
      this.stateService.saveGameStats(key, {
        ...prev,
        bestScore: Math.max(prev.bestScore ?? 0, this.score),
        bestWave: Math.max(prev.bestWave ?? 0, this.wave),
        games: (prev.games ?? 0) + 1,
      });
    }
  }

  private win(): void {
    const bonus = this.ballsLeft * 50;
    this.zone.run(() => {
      this.phase = 'won';
      this.score += bonus;
      if (bonus > 0) {
        this.popups.push({ x: ANCHOR.x + 30, y: ANCHOR.y - 40, text: `+${bonus} ❄`, life: 1.8, color: '#cfe6ff' });
      }
      const key = this.day ?? this.levelId;
      if (key) {
        const prev = this.stateService.getGameStats(key) ?? {};
        const best = Math.max(this.bestScore ?? 0, this.score);
        this.bestScore = best;
        this.stateService.saveGameStats(key, {
          ...prev,
          bestScore: best,
          wins: (prev.wins ?? 0) + 1,
          attempts: this.attempts,
        });
      }
    });
    this.sound.fanfare();
    this.timers.push(setTimeout(() => this.zone.run(() => this.completed.emit()), 1900));
  }

  private puff(x: number, y: number, n: number, power: number): void {
    const count = this.reducedMotion ? Math.ceil(n / 2) : n;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (30 + Math.random() * 130) * power;
      this.particles.push({
        x: x + Math.cos(a) * 6,
        y: y + Math.sin(a) * 6,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        r: 3 + Math.random() * 7 * Math.min(1.2, power),
        life: 0.6 + Math.random() * 0.6,
        max: 1.2,
        color: Math.random() < 0.2 ? '#e4edff' : '#ffffff',
        kind: 'puff',
      });
    }
  }

  private burstConfetti(): void {
    const x = this.worldW * (0.3 + Math.random() * 0.6);
    const y = -120 - Math.random() * 140;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        r: 2 + Math.random() * 2,
        life: 1.4,
        max: 1.4,
        color: LIGHT_COLORS[i % LIGHT_COLORS.length],
        kind: 'spark',
      });
    }
  }

  // =====================================================================
  // Rendering
  // =====================================================================

  private resize(force = false): void {
    const el = this.stageRef.nativeElement;
    const rect = el.getBoundingClientRect();
    const w = Math.max(200, Math.round(rect.width));
    const h = Math.max(200, Math.round(rect.height));
    if (w === this.w && h === this.h && this.bg && !force) return;
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = this.canvasRef.nativeElement;
    canvas.width = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    this.portrait = w / h < 0.95;
    this.worldW = this.portrait ? 400 : 560;
    this.groundPad = this.portrait ? 64 : 38;
    this.layout();
    // Zoom in as far as the level allows: the tallest target plus some headroom must fit
    const top = Math.max(...this.snowmen.map((sm) => sm.base + 92), ...this.ledges.map((l) => l.y + 92));
    const needH = Math.max(250, top + 70) + this.groundPad;
    this.scale = Math.min(w / this.worldW, h / needH);
    this.offX = (w - this.worldW * this.scale) / 2;
    this.groundY = h - this.groundPad * this.scale;
    this.makeFlakes();
    this.renderBackground();
    if (!this.running) this.draw();
  }

  private makeFlakes(): void {
    const n = this.reducedMotion ? 30 : Math.round(Math.min(140, (this.w * this.h) / 7000));
    const rnd = seeded(7);
    this.flakes = Array.from({ length: n }, () => {
      const depth = 0.3 + rnd() * 0.9;
      return {
        x: rnd() * this.w,
        y: rnd() * this.h,
        r: 0.6 + depth * 1.6,
        vy: 12 + depth * 32,
        phase: rnd() * 10,
        depth,
      };
    });
  }

  private glow(color: string): HTMLCanvasElement {
    if (this.glowSprites[color]) return this.glowSprites[color];
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, color);
    grd.addColorStop(0.25, color + 'aa');
    grd.addColorStop(1, color + '00');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    this.glowSprites[color] = c;
    return c;
  }

  /** Everything that never moves is painted once per resize into an offscreen canvas */
  private renderBackground(): void {
    const bg = this.bg ?? document.createElement('canvas');
    this.bg = bg;
    bg.width = this.canvasRef.nativeElement.width;
    bg.height = this.canvasRef.nativeElement.height;
    const g = bg.getContext('2d')!;
    const { w, h, dpr, scale: s } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Dusk sky
    const horizon = this.groundY - 40 * s;
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#060a24');
    sky.addColorStop(0.42, '#171950');
    sky.addColorStop(0.7, '#3b2c6b');
    sky.addColorStop(0.87, '#8a4a7c');
    sky.addColorStop(1, '#f09a78');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    // Stars fade out towards the warm horizon
    const rnd = seeded(42);
    for (let i = 0; i < Math.min(260, (w * h) / 2600); i++) {
      const x = rnd() * w;
      const y = Math.pow(rnd(), 1.6) * horizon * 0.85;
      const a = (1 - y / horizon) * (0.35 + rnd() * 0.65);
      g.fillStyle = `rgba(255, 250, 235, ${a.toFixed(2)})`;
      g.beginPath();
      g.arc(x, y, 0.4 + rnd() * 1.1, 0, Math.PI * 2);
      g.fill();
    }

    // Moon with a soft halo
    const mr = Math.max(16, Math.min(44, 26 * s));
    const mx = w * 0.8;
    const my = Math.max(mr * 2.2, Math.min(horizon * 0.32, h * 0.2));
    const halo = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 5);
    halo.addColorStop(0, 'rgba(255, 240, 210, 0.5)');
    halo.addColorStop(0.3, 'rgba(255, 220, 190, 0.16)');
    halo.addColorStop(1, 'rgba(255, 240, 210, 0)');
    g.fillStyle = halo;
    g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    const md = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
    md.addColorStop(0, '#ffffff');
    md.addColorStop(0.6, '#fff6de');
    md.addColorStop(1, '#f6e2b8');
    g.fillStyle = md;
    g.beginPath();
    g.arc(mx, my, mr, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(214, 190, 150, 0.3)';
    [
      [0.3, -0.2, 0.22],
      [-0.35, 0.25, 0.16],
      [0.1, 0.45, 0.12],
    ].forEach(([dx, dy, r]) => {
      g.beginPath();
      g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2);
      g.fill();
    });

    // From here on: world units (x right, y up is negative, ground at 0)
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * this.offX, dpr * this.groundY);
    const left = -this.offX / s - 10;
    const right = (w - this.offX) / s + 10;

    // Distant mountains
    const ridge = (base: number, amp: number, seed: number, fill: string | CanvasGradient, cap?: string) => {
      const r = seeded(seed);
      const pts: [number, number][] = [];
      let y = base - amp * r();
      for (let x = left - 40; x <= right + 40; x += 28 + r() * 30) {
        y = base - amp * (0.3 + r() * 0.7);
        pts.push([x, y]);
      }
      g.beginPath();
      g.moveTo(left - 40, 10);
      pts.forEach(([x, py]) => g.lineTo(x, py));
      g.lineTo(right + 40, 10);
      g.closePath();
      g.fillStyle = fill;
      g.fill();
      if (cap) {
        g.strokeStyle = cap;
        g.lineWidth = 2.2;
        g.lineJoin = 'round';
        g.beginPath();
        pts.forEach(([x, py], i) => (i ? g.lineTo(x, py) : g.moveTo(x, py)));
        g.stroke();
      }
    };
    const mtn = g.createLinearGradient(0, -190, 0, 0);
    mtn.addColorStop(0, '#4b3f7e');
    mtn.addColorStop(1, '#2a2552');
    ridge(-46, 150, 3, mtn, 'rgba(230, 210, 255, 0.35)');
    const hill = g.createLinearGradient(0, -110, 0, 0);
    hill.addColorStop(0, '#8e93c8');
    hill.addColorStop(1, '#55578f');
    ridge(-26, 70, 9, hill, 'rgba(255, 240, 250, 0.5)');

    // Pine forest (two rows)
    const pine = (x: number, base: number, ht: number, col: string, snow: string) => {
      const wdt = ht * 0.42;
      g.fillStyle = '#2a1d1d';
      g.fillRect(x - 2, base - 8, 4, 8);
      const tiers = 4;
      for (let i = 0; i < tiers; i++) {
        const ty = base - 6 - (i * ht) / (tiers + 0.6);
        const tw = wdt * (1 - i / (tiers + 0.8));
        const th = (ht / tiers) * 1.45;
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(x - tw, ty);
        g.quadraticCurveTo(x, ty - th * 0.25, x + tw, ty);
        g.lineTo(x, ty - th);
        g.closePath();
        g.fill();
        g.fillStyle = snow;
        g.beginPath();
        g.moveTo(x - tw * 0.95, ty - 1);
        g.quadraticCurveTo(x - tw * 0.3, ty - th * 0.18, x, ty - th * 0.3);
        g.quadraticCurveTo(x + tw * 0.3, ty - th * 0.18, x + tw * 0.95, ty - 1);
        g.quadraticCurveTo(x, ty - th * 0.05, x - tw * 0.95, ty - 1);
        g.fill();
      }
    };
    const pr = seeded(11);
    for (let x = left; x < right; x += 18 + pr() * 26) pine(x, -16, 46 + pr() * 46, '#26305c', 'rgba(200, 210, 245, 0.45)');
    const pr2 = seeded(23);
    for (let x = left + 10; x < right; x += 38 + pr2() * 60) {
      if (x > this.worldW * 0.08 && x < this.worldW * 0.34) continue; // keep the cabin clear
      pine(x, -10, 70 + pr2() * 70, '#132040', 'rgba(235, 240, 255, 0.75)');
    }

    // Log cabin with warm windows
    this.drawCabin(g, this.worldW * 0.21, -12);

    // Snowy ground
    const gr = g.createLinearGradient(0, -14, 0, h / s);
    gr.addColorStop(0, '#f4f6ff');
    gr.addColorStop(0.25, '#d8def6');
    gr.addColorStop(1, '#9ba7d6');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(left, -8);
    for (let x = left; x <= right; x += 20) g.lineTo(x, -8 - Math.sin(x * 0.03) * 3 - Math.sin(x * 0.011) * 4);
    g.lineTo(right, h / s);
    g.lineTo(left, h / s);
    g.closePath();
    g.fill();

    // Fence
    const fenceTop = -40;
    g.fillStyle = '#5a3a2e';
    g.fillRect(left, fenceTop + 8, right - left, 5);
    g.fillRect(left, fenceTop + 22, right - left, 5);
    this.bulbs = [];
    const posts: number[] = [];
    for (let x = Math.floor(left / 26) * 26; x <= right; x += 26) posts.push(x);
    for (const x of posts) {
      g.fillStyle = '#6b4636';
      g.beginPath();
      g.moveTo(x - 4, -6);
      g.lineTo(x - 4, fenceTop + 3);
      g.lineTo(x, fenceTop - 2);
      g.lineTo(x + 4, fenceTop + 3);
      g.lineTo(x + 4, -6);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(x + 1.5, fenceTop + 3, 2.5, 34);
      g.fillStyle = '#f7f9ff';
      g.beginPath();
      g.ellipse(x, fenceTop + 1, 5.5, 3, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillRect(left, fenceTop + 7, right - left, 1.8);
    // Fairy light wire swags between posts
    g.strokeStyle = 'rgba(30, 30, 40, 0.8)';
    g.lineWidth = 0.9;
    g.beginPath();
    let li = 0;
    for (let i = 0; i < posts.length - 1; i++) {
      const x0 = posts[i];
      const x1 = posts[i + 1];
      const y0 = fenceTop + 2;
      g.moveTo(x0, y0);
      g.quadraticCurveTo((x0 + x1) / 2, y0 + 14, x1, y0);
      for (let k = 1; k <= 3; k++) {
        const t = k / 4;
        const bx = x0 + (x1 - x0) * t;
        const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + 14) + t * t * y0;
        this.bulbs.push({ x: bx, y: by + 2.5, c: LIGHT_COLORS[li++ % LIGHT_COLORS.length], p: (li * 1.37) % 6.28 });
      }
    }
    g.stroke();

    // Foreground snow bank with sparkles
    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.9;
    g.beginPath();
    g.moveTo(left, 4);
    for (let x = left; x <= right; x += 16) g.lineTo(x, 2 - Math.abs(Math.sin(x * 0.02)) * 4);
    g.lineTo(right, h / s);
    g.lineTo(left, h / s);
    g.fill();
    g.globalAlpha = 1;
    const sr = seeded(5);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(160, 190, 255, ${(0.3 + sr() * 0.5).toFixed(2)})`;
      g.fillRect(left + sr() * (right - left), 4 + sr() * 30, 1.2, 1.2);
    }
  }

  private drawCabin(g: CanvasRenderingContext2D, cx: number, base: number): void {
    const w = 74;
    const hgt = 40;
    const x = cx - w / 2;
    // Logs
    g.fillStyle = '#5b3424';
    g.fillRect(x, base - hgt, w, hgt);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 1;
    for (let y = base - hgt + 6; y < base; y += 6) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + w, y);
      g.stroke();
    }
    // Windows
    const win = (wx: number, wy: number) => {
      const glow = g.createRadialGradient(wx + 6, wy + 6, 1, wx + 6, wy + 6, 20);
      glow.addColorStop(0, 'rgba(255, 200, 110, 0.55)');
      glow.addColorStop(1, 'rgba(255, 200, 110, 0)');
      g.fillStyle = glow;
      g.fillRect(wx - 16, wy - 16, 44, 44);
      g.fillStyle = '#ffd27a';
      g.fillRect(wx, wy, 12, 12);
      g.fillStyle = '#5b3424';
      g.fillRect(wx + 5.4, wy, 1.4, 12);
      g.fillRect(wx, wy + 5.4, 12, 1.4);
    };
    win(x + 10, base - 30);
    win(x + w - 22, base - 30);
    // Door
    g.fillStyle = '#3a2016';
    g.fillRect(cx - 7, base - 22, 14, 22);
    g.fillStyle = '#c33c4c';
    g.beginPath();
    g.arc(cx, base - 15, 3.4, 0, Math.PI * 2);
    g.fill();
    // Chimney
    g.fillStyle = '#7a3a2c';
    g.fillRect(x + w - 20, base - hgt - 30, 10, 22);
    g.fillStyle = '#fff';
    g.fillRect(x + w - 22, base - hgt - 32, 14, 4);
    // Roof with thick snow
    g.fillStyle = '#3a2a2e';
    g.beginPath();
    g.moveTo(x - 10, base - hgt + 2);
    g.lineTo(cx, base - hgt - 30);
    g.lineTo(x + w + 10, base - hgt + 2);
    g.closePath();
    g.fill();
    g.fillStyle = '#f6f8ff';
    g.beginPath();
    g.moveTo(x - 12, base - hgt + 1);
    g.lineTo(cx, base - hgt - 34);
    g.lineTo(x + w + 12, base - hgt + 1);
    g.quadraticCurveTo(x + w * 0.75, base - hgt - 6, cx, base - hgt - 24);
    g.quadraticCurveTo(x + w * 0.25, base - hgt - 6, x - 12, base - hgt + 1);
    g.fill();
    // Icicles
    g.fillStyle = 'rgba(220, 235, 255, 0.85)';
    for (let i = 0; i < 9; i++) {
      const ix = x - 6 + i * ((w + 12) / 8);
      g.beginPath();
      g.moveTo(ix - 1.5, base - hgt + 1);
      g.lineTo(ix, base - hgt + 5 + (i % 3) * 2.5);
      g.lineTo(ix + 1.5, base - hgt + 1);
      g.fill();
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.bg) return;
    const { dpr, scale: s } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.bg, 0, 0);

    const sx = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;

    // Background snowfall (screen space, behind the action)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const f of this.flakes) {
      if (f.depth > 0.75) continue;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (this.offX + sx), dpr * (this.groundY + sy));
    this.drawLightsAndSmoke(ctx);
    this.drawWindsock(ctx);

    for (const l of this.ledges) this.drawLedge(ctx, l);
    for (const sm of this.snowmen) if (sm.fortH > 0) this.drawFort(ctx, sm.x, sm.fortH, sm.fortHalf);
    for (const sm of this.snowmen) {
      if (sm.alive) this.drawSnowman(ctx, sm);
      else this.drawLump(ctx, sm);
    }
    for (const hat of this.hats) {
      ctx.save();
      ctx.translate(hat.x, hat.y);
      ctx.rotate(hat.rot);
      this.drawHat(ctx, hat.type);
      ctx.restore();
    }

    this.drawKid(ctx);
    this.drawAim(ctx);
    this.drawBall(ctx);
    this.drawParticles(ctx);
    this.drawPopups(ctx);

    // Foreground snowfall
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const f of this.flakes) {
      if (f.depth <= 0.75) continue;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 245, 220, ${(this.flash * 0.12).toFixed(3)})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    // Soft vignette
    const v = ctx.createRadialGradient(this.w / 2, this.h * 0.55, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h * 0.55, Math.max(this.w, this.h) * 0.8);
    v.addColorStop(0, 'rgba(5, 7, 26, 0)');
    v.addColorStop(1, 'rgba(5, 7, 26, 0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  private drawLightsAndSmoke(ctx: CanvasRenderingContext2D): void {
    // Cabin chimney smoke
    const cx = this.worldW * 0.21 + 37 - 15;
    for (let i = 0; i < 6; i++) {
      const t = (this.clock * 0.25 + i / 6) % 1;
      const r = 4 + t * 12;
      ctx.fillStyle = `rgba(210, 205, 230, ${(0.28 * (1 - t)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx + Math.sin(t * 5 + i) * 4 + t * (18 + this.wind * 30), -12 - 40 - 30 - t * 70, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Twinkling fairy lights
    for (const b of this.bulbs) {
      const tw = 0.55 + 0.45 * Math.sin(this.clock * 2.2 + b.p);
      ctx.globalAlpha = 0.35 + tw * 0.5;
      ctx.drawImage(this.glow(b.c), b.x - 9, b.y - 9, 18, 18);
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.c;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 1.7, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawWindsock(ctx: CanvasRenderingContext2D): void {
    const px = this.worldW * 0.42 - 48;
    const top = -118;
    ctx.fillStyle = '#7b6a62';
    ctx.fillRect(px - 1.5, top, 3, -top);
    ctx.fillStyle = '#c9a65a';
    ctx.beginPath();
    ctx.arc(px, top, 3, 0, Math.PI * 2);
    ctx.fill();
    const strength = Math.min(1, Math.abs(this.wind));
    const dir = this.wind >= 0 ? 1 : -1;
    // Calm = hanging down, strong = straight out
    const base = Math.PI / 2 - strength * (Math.PI / 2) * 0.95;
    const flutter = Math.sin(this.clock * (4 + strength * 6)) * (0.05 + strength * 0.06);
    const ang = dir > 0 ? base + flutter : Math.PI - base - flutter;
    ctx.save();
    ctx.translate(px, top + 3);
    ctx.rotate(ang);
    const len = 36;
    for (let i = 0; i < 4; i++) {
      const x0 = (i * len) / 4;
      const x1 = ((i + 1) * len) / 4;
      const h0 = 7 - i * 1.2;
      const h1 = 7 - (i + 1) * 1.2;
      const wave = Math.sin(this.clock * 8 + i) * strength * 1.2;
      ctx.fillStyle = i % 2 ? '#fdf6ec' : '#e0475b';
      ctx.beginPath();
      ctx.moveTo(x0, -h0 + wave);
      ctx.lineTo(x1, -h1 + wave);
      ctx.lineTo(x1, h1 + wave);
      ctx.lineTo(x0, h0 + wave);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFort(ctx: CanvasRenderingContext2D, x: number, hgt: number, FORT_HALF: number): void {
    const l = x - FORT_HALF;
    const g = ctx.createLinearGradient(l, 0, x + FORT_HALF, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#c4cdee');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(l, -hgt, FORT_HALF * 2, hgt + 2, [7, 7, 2, 2]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 140, 200, 0.35)';
    ctx.lineWidth = 1;
    for (let r = 0, y = -hgt + 12; y < -2; y += 12, r++) {
      ctx.beginPath();
      ctx.moveTo(l + 2, y);
      ctx.lineTo(x + FORT_HALF - 2, y);
      ctx.stroke();
      for (let bx = l + (r % 2 ? 11 : 22); bx < x + FORT_HALF - 4; bx += 22) {
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx, Math.min(-1, y + 12));
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(x, -hgt + 1, FORT_HALF + 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLedge(ctx: CanvasRenderingContext2D, l: Ledge): void {
    const x0 = l.cx - l.halfW;
    const x1 = l.cx + l.halfW;
    // Posts
    ctx.fillStyle = '#4e3328';
    [x0 + 8, x1 - 8].forEach((px) => ctx.fillRect(px - 2.5, -l.y, 5, l.y));
    // Icy plank
    const g = ctx.createLinearGradient(0, -l.y, 0, -l.y + 10);
    g.addColorStop(0, '#e9f6ff');
    g.addColorStop(1, '#8fc3ea');
    ctx.fillStyle = '#6b4636';
    ctx.fillRect(x0 - 4, -l.y + 3, l.halfW * 2 + 8, 7);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x0 - 5, -l.y - 2, l.halfW * 2 + 10, 6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(210, 235, 255, 0.85)';
    for (let x = x0; x < x1; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x - 1.5, -l.y + 9);
      ctx.lineTo(x, -l.y + 14 + ((x * 7) % 5));
      ctx.lineTo(x + 1.5, -l.y + 9);
      ctx.fill();
    }
  }

  private drawSnowman(ctx: CanvasRenderingContext2D, sm: Snowman): void {
    const by = -sm.base;
    const sway = Math.sin(this.clock * 2 + sm.id) * 0.02 + (sm.ledge >= 0 ? Math.cos(this.time * 1.25 + sm.phase) * 0.05 : 0);
    ctx.save();
    ctx.translate(sm.x, by);
    ctx.rotate(sway);
    // Shadow
    ctx.fillStyle = 'rgba(40, 50, 110, 0.25)';
    ctx.beginPath();
    ctx.ellipse(3, 0, 21, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const ball = (y: number, r: number) => {
      const g = ctx.createRadialGradient(-r * 0.35, y - r * 0.4, r * 0.1, 0, y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.7, '#e7ecfb');
      g.addColorStop(1, '#a8b4e0');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    // Stick arms
    ctx.strokeStyle = '#5a3a2a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const wave = Math.sin(this.clock * 3 + sm.id * 2) * 0.25;
    ctx.beginPath();
    ctx.moveTo(-10, -44);
    ctx.lineTo(-27, -56 + wave * 10);
    ctx.moveTo(-22, -52 + wave * 8);
    ctx.lineTo(-27, -47);
    ctx.moveTo(10, -44);
    ctx.lineTo(27, -54);
    ctx.moveTo(22, -52);
    ctx.lineTo(25, -60);
    ctx.stroke();
    ball(-17, 19);
    ball(-42, 14);
    ball(-62, 11);
    // Buttons & face
    ctx.fillStyle = '#1b1b28';
    [-36, -44].forEach((y) => {
      ctx.beginPath();
      ctx.arc(0, y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    });
    [-3.8, 3.8].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, -65, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * 2.4, -57.5 + Math.abs(i) * -0.9, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.moveTo(-1, -63);
    ctx.lineTo(-11, -60.5);
    ctx.lineTo(-1, -60);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 120, 140, 0.35)';
    ctx.beginPath();
    ctx.arc(6, -60, 2.4, 0, Math.PI * 2);
    ctx.arc(-6.5, -59, 2, 0, Math.PI * 2);
    ctx.fill();
    // Scarf
    ctx.fillStyle = sm.scarf;
    ctx.beginPath();
    ctx.roundRect(-11, -54, 22, 5, 2.5);
    ctx.fill();
    ctx.save();
    ctx.translate(6, -51);
    ctx.rotate(0.25 + Math.sin(this.clock * 4 + sm.id) * 0.12 + this.wind * 0.2);
    ctx.fillRect(-2, 0, 5, 13);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-2, 9, 5, 1.2);
    ctx.restore();
    // Hat
    ctx.translate(0, -71);
    ctx.rotate(-0.08);
    this.drawHat(ctx, sm.hat);
    ctx.restore();
  }

  private drawHat(ctx: CanvasRenderingContext2D, type: HatType): void {
    if (type === 'top') {
      ctx.fillStyle = '#1b1b28';
      ctx.beginPath();
      ctx.roundRect(-12, -2, 24, 4, 2);
      ctx.fill();
      ctx.fillRect(-8, -17, 16, 16);
      ctx.fillStyle = '#e0475b';
      ctx.fillRect(-8, -6, 16, 3.5);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-6, -16, 3, 10);
    } else if (type === 'beanie') {
      ctx.fillStyle = '#3aae8a';
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fdf6ec';
      ctx.beginPath();
      ctx.roundRect(-11, -2.5, 22, 4.5, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -11, 3.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // A little red bucket
      ctx.fillStyle = '#c63a4a';
      ctx.beginPath();
      ctx.moveTo(-9, 1);
      ctx.lineTo(-6.5, -14);
      ctx.lineTo(6.5, -14);
      ctx.lineTo(9, 1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f7c873';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-8, -3);
      ctx.lineTo(8, -3);
      ctx.stroke();
    }
  }

  private drawLump(ctx: CanvasRenderingContext2D, sm: Snowman): void {
    const t = Math.min(1, sm.hit * 3);
    const by = -sm.base;
    ctx.fillStyle = '#eef2ff';
    ctx.beginPath();
    ctx.ellipse(sm.x, by, 16 * t, 7 * t, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    ctx.moveTo(sm.x + 4, by - 4 * t);
    ctx.lineTo(sm.x + 12, by - 2 * t);
    ctx.lineTo(sm.x + 4, by - 2.5 * t);
    ctx.fill();
  }

  private drawKid(ctx: CanvasRenderingContext2D): void {
    const x = 36;
    const bob = Math.sin(this.clock * 2.4) * 0.8;
    const pull = this.ready && !this.ball ? this.drag : { x: 0, y: 0 };
    // Ammo pile
    ctx.fillStyle = '#e9eefc';
    for (let i = 0; i < Math.min(4, this.ballsLeft); i++) {
      const bx = x - 22 + (i % 3) * 7 + (i >= 3 ? 3.5 : 0);
      const byy = -5 - (i >= 3 ? 6 : 0);
      ctx.beginPath();
      ctx.arc(bx, byy, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(x, bob);
    // Boots
    ctx.fillStyle = '#3b2a26';
    ctx.beginPath();
    ctx.roundRect(-9, -6, 8, 6, 2);
    ctx.roundRect(1, -6, 8, 6, 2);
    ctx.fill();
    // Coat
    ctx.fillStyle = '#2f7f66';
    ctx.beginPath();
    ctx.moveTo(-11, -6);
    ctx.lineTo(-9, -30);
    ctx.quadraticCurveTo(0, -36, 9, -30);
    ctx.lineTo(11, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7c873';
    ctx.fillRect(-0.7, -28, 1.4, 20);
    // Back arm
    ctx.strokeStyle = '#276b56';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -27);
    ctx.lineTo(-12, -16);
    ctx.stroke();
    // Head
    ctx.fillStyle = '#ffd9bf';
    ctx.beginPath();
    ctx.arc(0, -40, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1b18';
    ctx.beginPath();
    ctx.arc(3.2, -41, 1.1, 0, Math.PI * 2);
    ctx.arc(-1.6, -41, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 110, 120, 0.5)';
    ctx.beginPath();
    ctx.arc(5, -37.5, 2, 0, Math.PI * 2);
    ctx.fill();
    // Scarf
    ctx.fillStyle = '#e0475b';
    ctx.beginPath();
    ctx.roundRect(-8, -33, 16, 4.5, 2);
    ctx.fill();
    ctx.save();
    ctx.translate(-6, -31);
    ctx.rotate(0.6 + Math.sin(this.clock * 5) * 0.15 - this.wind * 0.3);
    ctx.fillRect(-2, 0, 4.5, 11);
    ctx.restore();
    // Beanie with pompom
    ctx.fillStyle = '#e0475b';
    ctx.beginPath();
    ctx.arc(0, -43, 8.8, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fdf6ec';
    ctx.beginPath();
    ctx.roundRect(-9.5, -45, 19, 4, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-1, -53, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Throwing arm reaches for the ball
    const hx = ANCHOR.x + pull.x * PULL_VIS;
    const hy = ANCHOR.y + pull.y * PULL_VIS;
    ctx.strokeStyle = '#2f7f66';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 6, -27 + bob);
    const ex = x + 6 + (hx - x - 6) * 0.5;
    const ey = -27 + bob + (hy + 27) * 0.5 + 4;
    ctx.quadraticCurveTo(ex, ey, hx - 3, hy + 3);
    ctx.stroke();
    ctx.fillStyle = '#e0475b';
    ctx.beginPath();
    ctx.arc(hx - 3, hy + 3, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawAim(ctx: CanvasRenderingContext2D): void {
    if (!this.ready || this.ball || this.phase !== 'playing') return;
    const d = Math.hypot(this.drag.x, this.drag.y);
    if (d < MIN_DRAG * 0.6) {
      // Idle hint: a gently pulsing ring around the ball
      const p = (this.clock * 0.8) % 1;
      ctx.strokeStyle = `rgba(247, 200, 115, ${(0.7 * (1 - p)).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ANCHOR.x, ANCHOR.y, BALL_R + 4 + p * 14, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    // Power ring
    const power = Math.min(1, d / MAX_DRAG);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ANCHOR.x, ANCHOR.y, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = power > 0.95 ? 'rgba(255, 159, 67, 0.85)' : 'rgba(247, 200, 115, 0.7)';
    ctx.beginPath();
    ctx.arc(ANCHOR.x, ANCHOR.y, 44, -Math.PI / 2, -Math.PI / 2 + power * Math.PI * 2);
    ctx.stroke();
    // Dotted trajectory preview (shortened on harder levels)
    const { path } = this.predictThrow(this.drag.x, this.drag.y);
    const n = Math.max(7, Math.floor(path.length * this.previewFrac));
    const dotR = Math.max(3.4, 3.6 / this.scale);
    for (let i = 0; i < Math.min(n, path.length); i++) {
      const p = path[i];
      const a = 1 - i / n;
      ctx.fillStyle = `rgba(20, 24, 60, ${(0.35 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x + 0.6, p.y + 0.8, dotR * 1.15 * (0.55 + a * 0.45), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 246, 220, ${Math.min(1, 1.6 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotR * (0.55 + a * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBall(ctx: CanvasRenderingContext2D): void {
    let x: number;
    let y: number;
    if (this.ball) {
      x = this.ball.x;
      y = this.ball.y;
      const tr = this.ball.trail;
      for (let i = 0; i < tr.length; i++) {
        ctx.fillStyle = `rgba(255,255,255,${((i / tr.length) * 0.35).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(tr[i].x, tr[i].y, BALL_R * (i / tr.length) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      const visTop = -this.groundY / this.scale;
      if (y < visTop - BALL_R) {
        // Above the screen: show a little marker at the top edge
        const my = visTop + 54 / this.scale;
        ctx.fillStyle = 'rgba(247, 200, 115, 0.9)';
        ctx.beginPath();
        ctx.moveTo(x, my - 6);
        ctx.lineTo(x - 6, my + 4);
        ctx.lineTo(x + 6, my + 4);
        ctx.closePath();
        ctx.fill();
        return;
      }
    } else if (this.ready && this.phase !== 'won' && this.ballsLeft > 0) {
      x = ANCHOR.x + this.drag.x * PULL_VIS;
      y = ANCHOR.y + this.drag.y * PULL_VIS;
      if (Math.hypot(this.drag.x, this.drag.y) > MIN_DRAG * 0.6) {
        // Stretchy "slingshot" band from the hand anchor to the ball
        ctx.strokeStyle = 'rgba(247, 200, 115, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(ANCHOR.x, ANCHOR.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else return;
    const g = ctx.createRadialGradient(x - 2.5, y - 2.5, 0.5, x, y, BALL_R);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.75, '#eef3ff');
    g.addColorStop(1, '#9fb0e4');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = p.kind === 'puff' ? Math.min(1, a * 1.5) : Math.min(1, a * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.kind === 'spark') ctx.rect(p.x - p.r, p.y - p.r / 2, p.r * 2, p.r);
      else ctx.arc(p.x, p.y, p.kind === 'puff' ? p.r * (1.4 - a * 0.4) : p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPopups(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      const a = Math.min(1, p.life * 2);
      const pop = 1 + Math.max(0, p.life - 1) * 0.6;
      ctx.globalAlpha = a;
      ctx.font = `800 ${(15 * pop).toFixed(1)}px Nunito, system-ui, sans-serif`;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(10, 15, 36, 0.8)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }
}
