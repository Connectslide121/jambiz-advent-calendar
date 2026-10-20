import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
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
import { LucideAngularModule, Check, Play, RotateCcw } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export type SortRuleId = 'wrapped' | 'color' | 'tomte' | 'naughty';
export type Side = 'left' | 'right';

export interface ToySorterConfig {
  target?: number; // Correct sorts needed to win. Default 15
  speed?: number; // Belt speed multiplier, 1 = relaxed. Default 1
  rules?: string[]; // Rule ids in order: 'wrapped' | 'color' | 'tomte' | 'naughty'. Default first three
  endless?: boolean; // No target: rules keep rotating, belt keeps speeding up, 3 mistakes ends the run
}

type Look =
  | { type: 'present'; body: string; ribbon: string }
  | { type: 'bauble'; color: string }
  | { type: 'coal'; seed: number }
  | { type: 'hay' }
  | { type: 'emoji'; char: string };

interface ItemKind {
  id: string;
  look: Look;
}

interface RuleDef {
  id: SortRuleId;
  leftIcon: string;
  rightIcon: string;
  left: ItemKind[];
  right: ItemKind[];
}

interface Item {
  uid: number;
  kind: ItemKind;
  side: Side; // Correct side under the rule it was spawned with
  progress: number; // 0 at the hatch, 1 at the end of the belt
  state: 'belt' | 'flying' | 'falling' | 'poof';
  t: number; // Timer for the current state
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  target: Side;
  vy: number;
  spin: number;
  wobble: number;
}

interface Sack {
  count: number;
  pulse: number;
  shake: number;
  flash: number; // >0 red flash after a wrong item
  recent: ItemKind[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface FloatText {
  text: string;
  x: number;
  y: number;
  t: number;
  color: string;
}

type Phase = 'ready' | 'playing' | 'rule' | 'lost' | 'won';

/* ---------------------------------- Items and rules ---------------------------------- */

const P = (id: string, body: string, ribbon: string): ItemKind => ({ id, look: { type: 'present', body, ribbon } });
const E = (id: string, char: string): ItemKind => ({ id, look: { type: 'emoji', char } });
const B = (id: string, color: string): ItemKind => ({ id, look: { type: 'bauble', color } });

const PRESENTS = [
  P('presentRed', '#d6283f', '#f7c873'),
  P('presentGreen', '#23885a', '#f7c873'),
  P('presentBlue', '#3b6fd8', '#fdf6ec'),
  P('presentGold', '#f2b84b', '#d6283f'),
  P('presentPurple', '#8e5bd8', '#5cf2b3'),
];
const TOYS = [
  E('teddy', '🧸'),
  E('train', '🚂'),
  E('yoyo', '🪀'),
  E('kite', '🪁'),
  E('robot', '🤖'),
  E('car', '🚗'),
  E('duck', '🦆'),
  E('ball', '⚽'),
  E('dice', '🎲'),
  E('doll', '🪆'),
];

export const RULES: RuleDef[] = [
  { id: 'wrapped', leftIcon: '🎁', rightIcon: '🧸', left: PRESENTS, right: TOYS },
  {
    id: 'color',
    leftIcon: '🔴',
    rightIcon: '🟢',
    left: [PRESENTS[0], B('baubleRed', '#e0475b'), E('apple', '🍎'), E('strawberry', '🍓'), E('fireTruck', '🚒'), E('mushroom', '🍄')],
    right: [PRESENTS[1], B('baubleGreen', '#3aae8a'), E('greenApple', '🍏'), E('dino', '🦖'), E('frog', '🐸'), E('broccoli', '🥦'), E('tree', '🌲')],
  },
  {
    id: 'tomte',
    leftIcon: '🥣',
    rightIcon: '🦌',
    left: [E('porridge', '🥣'), E('cookie', '🍪'), E('candle', '🕯️'), E('sock', '🧦'), E('coffee', '☕'), E('butter', '🧈')],
    right: [E('carrot', '🥕'), { id: 'hay', look: { type: 'hay' } }, E('wheat', '🌾'), E('lichen', '🌿')],
  },
  {
    id: 'naughty',
    leftIcon: '😇',
    rightIcon: '😈',
    left: [...PRESENTS.slice(0, 4), E('teddy', '🧸'), E('star', '⭐')],
    right: [
      { id: 'coal1', look: { type: 'coal', seed: 1 } },
      { id: 'coal2', look: { type: 'coal', seed: 2 } },
      { id: 'coal3', look: { type: 'coal', seed: 3 } },
    ],
  },
];

/** Pure helper: which sack does an item belong in under a rule? (null if the rule does not know it) */
export function correctSide(rule: SortRuleId, kindId: string): Side | null {
  const def = RULES.find((r) => r.id === rule);
  if (!def) return null;
  if (def.left.some((k) => k.id === kindId)) return 'left';
  if (def.right.some((k) => k.id === kindId)) return 'right';
  return null;
}

const BASE_TRAVEL = 5.4; // seconds for an item to ride the whole belt at speed 1
const SPAWN_GAP = 0.4; // belt progress between items
const ENDLESS_RULE_EVERY = 8;
const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/**
 * Elf workshop - toys ride a conveyor belt; send each one into the correct sack
 * (swipe, tap a side, or arrow keys) before it falls off the end.
 * The sorting rule changes between rounds and the belt gradually speeds up.
 */
@Component({
  selector: 'app-toy-sorter-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './toy-sorter-challenge.html',
  styleUrl: './toy-sorter-challenge.scss',
})
export class ToySorterChallenge implements OnInit, AfterViewInit, OnDestroy {
  @Input() config: ToySorterConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly Check = Check;
  readonly Play = Play;
  readonly RotateCcw = RotateCcw;
  readonly maxMistakes = 3;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);
  private zone = inject(NgZone);
  private translate = inject(TranslateService);

  // Template state
  phase: Phase = 'ready';
  score = 0;
  streak = 0;
  sorted = 0;
  mistakes = 0;
  bestScore = 0;
  newBest = false;
  target = 15;
  endless = false;
  rules: RuleDef[] = [];
  ruleIndex = 0;
  ruleFlash = false;

  // Game state (canvas)
  private items: Item[] = [];
  private sacks: Record<Side, Sack> = { left: this.newSack(), right: this.newSack() };
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private uid = 0;
  private speedFactor = 1;
  private beltOffset = 0;
  private time = 0;
  private lastSide: Side | null = null;
  private sameSideRun = 0;
  private sortedThisRule = 0;
  private lostMistakeTimer = 0;

  // Rendering
  private ctx: CanvasRenderingContext2D | null = null;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private raf = 0;
  private lastTs = 0;
  private resizeObserver?: ResizeObserver;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private pointerStart: { x: number; y: number; id: number } | null = null;
  private visibilityHandler = () => {
    this.lastTs = 0;
  };

  get rule(): RuleDef {
    return this.rules[this.ruleIndex] ?? RULES[0];
  }

  get multiplier(): number {
    return Math.min(5, 1 + Math.floor(this.streak / 5));
  }

  get livesLeft(): number[] {
    return Array.from({ length: this.maxMistakes }, (_, i) => i);
  }

  get progressPct(): number {
    return Math.min(100, (this.sorted / this.target) * 100);
  }

  /** The item the next swipe or key press will send (the one closest to the end of the belt) */
  get activeItem(): Item | null {
    let best: Item | null = null;
    for (const it of this.items) {
      if (it.state === 'belt' && (!best || it.progress > best.progress)) best = it;
    }
    return best;
  }

  /** Test/debug helper: the side the active item belongs on */
  get activeSide(): Side | null {
    return this.activeItem?.side ?? null;
  }

  private get speed(): number {
    return Math.max(0.4, Math.min(3, this.config?.speed ?? 1));
  }

  private get statsKey(): number | string | undefined {
    return this.day ?? this.levelId;
  }

  ngOnInit(): void {
    this.endless = !!this.config?.endless;
    this.target = Math.max(5, Math.min(60, this.config?.target ?? 15));
    const wanted = (this.config?.rules?.length ? this.config.rules : ['wrapped', 'color', 'tomte']) as string[];
    this.rules = wanted.map((id) => RULES.find((r) => r.id === id)).filter((r): r is RuleDef => !!r);
    if (!this.rules.length) this.rules = [RULES[0]];
    const key = this.statsKey;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestScore = typeof stats?.bestScore === 'number' ? stats.bestScore : 0;
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.stageRef.nativeElement);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.zone.runOutsideAngular(() => {
      const loop = (ts: number) => {
        this.raf = requestAnimationFrame(loop);
        if (document.hidden) {
          this.lastTs = 0;
          return;
        }
        const dt = this.lastTs ? Math.min(0.05, (ts - this.lastTs) / 1000) : 0;
        this.lastTs = ts;
        this.update(dt);
        this.draw();
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.timers.forEach(clearTimeout);
  }

  /* ---------------------------------- Controls ---------------------------------- */

  start(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.items = [];
    this.particles = [];
    this.texts = [];
    this.sacks = { left: this.newSack(), right: this.newSack() };
    this.score = 0;
    this.streak = 0;
    this.sorted = 0;
    this.mistakes = 0;
    this.newBest = false;
    this.speedFactor = 1;
    this.ruleIndex = 0;
    this.sortedThisRule = 0;
    this.lastSide = null;
    this.sameSideRun = 0;
    this.phase = 'playing';
    this.sound.doorOpen();
    this.flashRule();
  }

  showReward(): void {
    this.completed.emit();
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
      e.preventDefault();
      this.send('left');
    } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
      e.preventDefault();
      this.send('right');
    }
  }

  onPointerDown(e: PointerEvent): void {
    if (this.phase !== 'playing' && this.phase !== 'rule') return;
    this.pointerStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }

  onPointerUp(e: PointerEvent): void {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 24) {
      this.send(dx < 0 ? 'left' : 'right');
      return;
    }
    const rect = this.stageRef.nativeElement.getBoundingClientRect();
    this.send(e.clientX - rect.left < rect.width / 2 ? 'left' : 'right');
  }

  /** Route the active item to a sack */
  send(side: Side): void {
    if (this.phase !== 'playing') return;
    const it = this.activeItem;
    if (!it) return;
    this.sound.whoosh();
    it.state = 'flying';
    it.t = 0;
    it.target = side;
    it.fromX = it.x;
    it.fromY = it.y;
    it.spin = (side === 'left' ? -1 : 1) * (4 + Math.random() * 3);
  }

  /* ---------------------------------- Game logic ---------------------------------- */

  private update(dt: number): void {
    this.time += dt;
    const travel = BASE_TRAVEL / (this.speed * this.speedFactor);
    const beltMoving = this.phase === 'playing';
    const beltSpeed = beltMoving ? 1 / travel : this.phase === 'rule' ? 0.03 : 0;
    this.beltOffset += beltSpeed * dt * this.beltLength();

    // Spawn
    if (this.phase === 'playing') {
      const onBelt = this.items.filter((i) => i.state === 'belt');
      const newest = onBelt.reduce((m, i) => Math.min(m, i.progress), Infinity);
      if (!onBelt.length || newest > SPAWN_GAP) this.spawn();
    }

    const L = this.layout();
    for (const it of this.items) {
      it.t += dt;
      if (it.state === 'belt') {
        it.progress += beltSpeed * dt;
        it.x = L.cx;
        it.y = L.beltTop + L.itemSize * 0.55 + it.progress * (L.beltEnd - L.beltTop - L.itemSize * 0.55);
        if (it.progress >= 1) {
          it.state = 'falling';
          it.t = 0;
          it.vy = 40;
          this.zone.run(() => this.onMissed(it));
        }
      } else if (it.state === 'flying') {
        const dur = 0.42;
        const k = Math.min(1, it.t / dur);
        const sack = L.sacks[it.target];
        const e = 1 - Math.pow(1 - k, 2);
        it.x = it.fromX + (sack.x - it.fromX) * e;
        it.y = it.fromY + (sack.mouthY - it.fromY) * k - Math.sin(Math.PI * k) * L.itemSize * 1.1;
        if (k >= 1) {
          it.state = 'poof';
          it.t = 1;
          this.zone.run(() => this.onLanded(it));
        }
      } else if (it.state === 'falling') {
        it.vy += 900 * dt;
        it.y += it.vy * dt;
        it.x += Math.sin(it.uid) * 30 * dt;
      }
    }
    this.items = this.items.filter(
      (it) => !(it.state === 'poof' && it.t > 1.3) && !(it.state === 'falling' && it.y > this.H + 80)
    );

    for (const side of ['left', 'right'] as Side[]) {
      const s = this.sacks[side];
      s.pulse = Math.max(0, s.pulse - dt * 2.2);
      s.shake = Math.max(0, s.shake - dt * 2.5);
      s.flash = Math.max(0, s.flash - dt * 1.6);
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 260 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < 1.1);
  }

  private spawn(): void {
    const rule = this.rule;
    let side: Side = Math.random() < 0.5 ? 'left' : 'right';
    // Avoid long runs on the same side so both sacks get used
    if (side === this.lastSide && this.sameSideRun >= 2) side = side === 'left' ? 'right' : 'left';
    this.sameSideRun = side === this.lastSide ? this.sameSideRun + 1 : 1;
    this.lastSide = side;
    const pool = side === 'left' ? rule.left : rule.right;
    const kind = pool[Math.floor(Math.random() * pool.length)];
    const L = this.layout();
    this.items.push({
      uid: ++this.uid,
      kind,
      side,
      progress: 0,
      state: 'belt',
      t: 0,
      x: L.cx,
      y: L.beltTop,
      fromX: 0,
      fromY: 0,
      target: side,
      vy: 0,
      spin: 0,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  private onLanded(it: Item): void {
    const L = this.layout();
    const sack = this.sacks[it.target];
    const pos = L.sacks[it.target];
    sack.count++;
    sack.pulse = 1;
    sack.recent = [it.kind, ...sack.recent].slice(0, 3);
    if (this.phase !== 'playing') return;

    if (it.target === it.side) {
      this.streak++;
      this.sorted++;
      this.sortedThisRule++;
      const pts = 10 * this.multiplier;
      this.score += pts;
      this.speedFactor = Math.min(this.endless ? 3 : 2.2, this.speedFactor * (this.endless ? 1.035 : 1.03));
      this.burst(pos.x, pos.mouthY, ['#ffd772', '#fff3c4', '#5cf2b3', '#ff9f43'], 14);
      this.texts.push({ text: `+${pts}`, x: pos.x, y: pos.mouthY - 10, t: 0, color: '#ffd772' });
      if (this.multiplier > 1 && this.streak % 5 === 0) {
        this.texts.push({ text: `×${this.multiplier}!`, x: L.cx, y: L.beltEnd * 0.45, t: -0.15, color: '#5cf2b3' });
      }
      this.sound.bell(NOTES[Math.min(NOTES.length - 1, this.streak % NOTES.length)], 0.16);
      if (!this.endless && this.sorted >= this.target) {
        this.onWin();
        return;
      }
      const every = this.endless ? ENDLESS_RULE_EVERY : Math.ceil(this.target / this.rules.length);
      if (this.rules.length > 1 && this.sortedThisRule >= every) this.nextRule();
    } else {
      sack.shake = 1;
      sack.flash = 1;
      this.burst(pos.x, pos.mouthY, ['#e0475b', '#ff8fa0', '#6a6478'], 10);
      this.texts.push({ text: this.translate.instant('challenges.toySorter.oops'), x: pos.x, y: pos.mouthY - 12, t: 0, color: '#ff8fa0' });
      this.registerMistake();
    }
  }

  private onMissed(it: Item): void {
    if (this.phase !== 'playing') return;
    const L = this.layout();
    this.texts.push({ text: this.translate.instant('challenges.toySorter.missed'), x: L.cx, y: L.beltEnd - 10, t: 0, color: '#ff8fa0' });
    this.registerMistake();
  }

  private registerMistake(): void {
    this.streak = 0;
    this.mistakes++;
    this.sound.thud();
    if (this.mistakes >= this.maxMistakes) {
      this.phase = 'lost';
      this.saveBest();
      this.later(() => this.sound.bell(196, 0.15), 200);
      // Sweep what is left on the belt off the end
      for (const i of this.items) if (i.state === 'belt') i.state = 'poof';
    }
  }

  private nextRule(): void {
    this.ruleIndex = (this.ruleIndex + 1) % this.rules.length;
    this.sortedThisRule = 0;
    this.phase = 'rule';
    // Items from the old rule vanish in a puff
    for (const i of this.items) {
      if (i.state === 'belt') {
        i.state = 'poof';
        i.t = 0.6;
        this.burst(i.x, i.y, ['#fff', '#cfe6ff'], 6);
      }
    }
    this.sound.jingle();
    this.flashRule();
    this.later(() => {
      if (this.phase === 'rule') this.phase = 'playing';
    }, 2000);
  }

  private flashRule(): void {
    this.ruleFlash = false;
    this.later(() => (this.ruleFlash = true), 20);
    this.later(() => (this.ruleFlash = false), 1900);
  }

  private onWin(): void {
    this.phase = 'won';
    this.saveBest();
    for (const i of this.items) if (i.state === 'belt') i.state = 'poof';
    const L = this.layout();
    for (let k = 0; k < 4; k++) {
      this.later(() => this.burst(L.cx + (Math.random() - 0.5) * L.W * 0.6, L.H * 0.35, ['#ffd772', '#e0475b', '#5cf2b3', '#7fb8ff', '#fff'], 26), k * 220);
    }
    this.later(() => this.sound.fanfare(), 250);
    if (!this.endless) this.later(() => this.completed.emit(), 1900);
  }

  private saveBest(): void {
    const key = this.statsKey;
    if (this.score > this.bestScore) {
      this.newBest = this.bestScore > 0 || this.endless;
      this.bestScore = this.score;
    }
    if (key && this.bestScore > 0) this.stateService.saveGameStats(key, { bestScore: this.bestScore });
  }

  private burst(x: number, y: number, colors: string[], n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 160;
      const max = 0.5 + Math.random() * 0.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 120,
        life: max,
        max,
        color: colors[i % colors.length],
        size: 2 + Math.random() * 3,
      });
    }
  }

  private newSack(): Sack {
    return { count: 0, pulse: 0, shake: 0, flash: 0, recent: [] };
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(
      setTimeout(() => {
        this.zone.run(fn);
      }, ms)
    );
  }

  /* ---------------------------------- Layout & drawing ---------------------------------- */

  private resize(): void {
    const el = this.stageRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = rect.width;
    this.H = rect.height;
    canvas.width = Math.round(this.W * this.dpr);
    canvas.height = Math.round(this.H * this.dpr);
    canvas.style.width = `${this.W}px`;
    canvas.style.height = `${this.H}px`;
  }

  private beltLength(): number {
    const L = this.layout();
    return L.beltEnd - L.beltTop;
  }

  private layout() {
    const W = this.W || 1;
    const H = this.H || 1;
    const cx = W / 2;
    const bw = Math.max(92, Math.min(W * 0.26, 170, H * 0.34));
    const beltTop = Math.max(44, H * 0.1);
    const beltEnd = H * 0.64;
    const sackW = Math.max(96, Math.min(W * 0.3, H * 0.27, 170));
    const off = bw / 2 + sackW * 0.66;
    const sackBottom = H - 8;
    const sackH = sackW * 0.95;
    const mk = (dir: number) => ({
      x: cx + dir * off,
      bottom: sackBottom,
      mouthY: sackBottom - sackH * 0.92,
    });
    return {
      W,
      H,
      cx,
      bw,
      beltTop,
      beltEnd,
      sackW,
      sackH,
      itemSize: bw * 0.58,
      sacks: { left: mk(-1), right: mk(1) } as Record<Side, { x: number; bottom: number; mouthY: number }>,
    };
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.W) return;
    const L = this.layout();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, L.W, L.H);

    this.drawBelt(ctx, L);
    // Sacks (back halves), items flying in, then sack fronts
    for (const side of ['left', 'right'] as Side[]) this.drawSack(ctx, L, side, false);

    const active = this.phase === 'playing' ? this.activeItem : null;
    if (active) this.drawActiveCue(ctx, L, active);

    // Items on the belt first, then airborne ones on top
    const order = [...this.items].sort((a, b) => (a.state === 'belt' ? 0 : 1) - (b.state === 'belt' ? 0 : 1));
    for (const it of order) this.drawItem(ctx, L, it, it === active);

    for (const side of ['left', 'right'] as Side[]) this.drawSack(ctx, L, side, true);

    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      if (t.t < 0) continue;
      const a = 1 - t.t / 1.1;
      ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5));
      const size = Math.round(18 + Math.min(1, t.t * 6) * 6);
      ctx.font = `800 ${size}px Nunito, system-ui, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(5,7,26,0.75)';
      ctx.strokeText(t.text, t.x, t.y - t.t * 40);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y - t.t * 40);
    }
    ctx.globalAlpha = 1;
  }

  private drawBelt(ctx: CanvasRenderingContext2D, L: ReturnType<ToySorterChallenge['layout']>): void {
    const { cx, bw, beltTop, beltEnd } = L;
    const x0 = cx - bw / 2;
    const len = beltEnd - beltTop;

    // Legs and shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, beltEnd + 26, bw * 0.75, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a2a';
    ctx.fillRect(x0 + 8, beltEnd - 4, 8, 30);
    ctx.fillRect(x0 + bw - 16, beltEnd - 4, 8, 30);

    // Rails
    const rail = ctx.createLinearGradient(x0 - 12, 0, x0 + bw + 12, 0);
    rail.addColorStop(0, '#6d7590');
    rail.addColorStop(0.05, '#c3cad8');
    rail.addColorStop(0.1, '#59607a');
    rail.addColorStop(0.9, '#59607a');
    rail.addColorStop(0.95, '#c3cad8');
    rail.addColorStop(1, '#6d7590');
    ctx.fillStyle = rail;
    this.roundRect(ctx, x0 - 12, beltTop - 6, bw + 24, len + 18, 14);
    ctx.fill();

    // Belt surface with moving slats
    ctx.save();
    this.roundRect(ctx, x0, beltTop, bw, len, 8);
    ctx.clip();
    const surf = ctx.createLinearGradient(x0, 0, x0 + bw, 0);
    surf.addColorStop(0, '#1d1a26');
    surf.addColorStop(0.5, '#34303f');
    surf.addColorStop(1, '#1d1a26');
    ctx.fillStyle = surf;
    ctx.fillRect(x0, beltTop, bw, len);
    const gap = 22;
    const off = this.beltOffset % gap;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 3;
    for (let y = beltTop - gap + off; y < beltEnd + gap; y += gap) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + bw, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    for (let y = beltTop - gap + off + 3; y < beltEnd + gap; y += gap) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + bw, y);
      ctx.stroke();
    }
    // Shading at the top (coming out of the hatch)
    const fade = ctx.createLinearGradient(0, beltTop, 0, beltTop + 50);
    fade.addColorStop(0, 'rgba(0,0,0,0.6)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(x0, beltTop, bw, 50);
    ctx.restore();

    // Rivets with little running lights
    for (let y = beltTop + 14; y < beltEnd - 4; y += 26) {
      for (const x of [x0 - 6, x0 + bw + 6]) {
        const lit = Math.floor((this.time * 4 - y / 26) % 4) === 0 && this.phase === 'playing';
        ctx.fillStyle = lit ? '#ffd772' : '#3b3f55';
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        if (lit) {
          ctx.fillStyle = 'rgba(255,215,114,0.35)';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // End roller
    const roll = ctx.createLinearGradient(0, beltEnd - 6, 0, beltEnd + 12);
    roll.addColorStop(0, '#d8deea');
    roll.addColorStop(0.5, '#7a8299');
    roll.addColorStop(1, '#3a3f55');
    ctx.fillStyle = roll;
    this.roundRect(ctx, x0 - 14, beltEnd - 4, bw + 28, 16, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    const ro = (this.beltOffset * 0.6) % 10;
    for (let x = x0 - 10 + ro; x < x0 + bw + 12; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, beltEnd - 2);
      ctx.lineTo(x, beltEnd + 10);
      ctx.stroke();
    }

    // Hatch at the top: a little wooden arch with a garland
    const hw = bw + 40;
    const hx = cx - hw / 2;
    const hy = beltTop - 4;
    ctx.fillStyle = '#5a3520';
    this.roundRect(ctx, hx, hy - 30, hw, 40, 12);
    ctx.fill();
    ctx.fillStyle = '#120a06';
    this.roundRect(ctx, cx - bw / 2 + 2, hy - 20, bw - 4, 30, 10);
    ctx.fill();
    // Garland with bulbs
    ctx.strokeStyle = '#1f6f4a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(hx + 4, hy - 26);
    ctx.quadraticCurveTo(cx, hy - 8, hx + hw - 4, hy - 26);
    ctx.stroke();
    const bulbs = ['#ff5a6e', '#f7c873', '#5cf2b3', '#7fb8ff', '#ff9f43'];
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const bx = (1 - t) * (1 - t) * (hx + 4) + 2 * t * (1 - t) * cx + t * t * (hx + hw - 4);
      const by = (1 - t) * (1 - t) * (hy - 26) + 2 * t * (1 - t) * (hy - 8) + t * t * (hy - 26) + 3;
      const on = Math.sin(this.time * 3 + i * 1.3) > -0.3;
      ctx.fillStyle = bulbs[i % bulbs.length];
      ctx.globalAlpha = on ? 1 : 0.4;
      ctx.beginPath();
      ctx.ellipse(bx, by, 2.6, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      if (on) {
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // An elf peeking over the hatch, waving
    const bob = Math.sin(this.time * 2.4) * 2;
    ctx.font = `${Math.round(bw * 0.32)}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText('🧝', hx + hw + bw * 0.12, hy - 6 + bob);
  }

  private drawActiveCue(ctx: CanvasRenderingContext2D, L: ReturnType<ToySorterChallenge['layout']>, it: Item): void {
    const r = L.itemSize * 0.72;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
    ctx.fillStyle = `rgba(255,215,114,${0.12 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,227,163,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -this.time * 20;
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Chevrons on both sides
    ctx.strokeStyle = `rgba(255,227,163,${0.45 + pulse * 0.5})`;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    const d = L.bw / 2 + 16 + pulse * 4;
    for (const dir of [-1, 1]) {
      const x = it.x + dir * d;
      ctx.beginPath();
      ctx.moveTo(x - dir * 2, it.y - 9);
      ctx.lineTo(x + dir * 6, it.y);
      ctx.lineTo(x - dir * 2, it.y + 9);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  private drawItem(ctx: CanvasRenderingContext2D, L: ReturnType<ToySorterChallenge['layout']>, it: Item, active: boolean): void {
    const s = L.itemSize;
    let alpha = 1;
    let scale = 1;
    let rot = 0;
    let lift = 0;
    if (it.state === 'belt') {
      // Little hops as the slats pass underneath
      lift = Math.abs(Math.sin(this.time * 7 + it.wobble)) * 3;
      rot = Math.sin(this.time * 3 + it.wobble) * 0.06;
      if (it.progress < 0.06) alpha = it.progress / 0.06;
      if (active) scale = 1.06;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(it.x, it.y + s * 0.42, s * 0.36 - lift, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (it.state === 'flying') {
      const k = Math.min(1, it.t / 0.42);
      scale = 1 - k * 0.35;
      rot = it.spin * k * 0.5;
    } else if (it.state === 'falling') {
      rot = it.t * 4;
      alpha = Math.max(0, 1 - it.t * 1.2);
    } else {
      // poof (already in the sack or swept away)
      return;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(it.x, it.y - lift);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    this.drawLook(ctx, it.kind.look, s);
    ctx.restore();
  }

  private drawLook(ctx: CanvasRenderingContext2D, look: Look, s: number): void {
    switch (look.type) {
      case 'present': {
        const w = s * 0.78;
        const h = s * 0.66;
        const top = -h / 2 + s * 0.05;
        ctx.fillStyle = look.body;
        this.roundRect(ctx, -w / 2, top + h * 0.22, w, h * 0.78, 4);
        ctx.fill();
        // Side shade
        const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        g.addColorStop(0, 'rgba(255,255,255,0.18)');
        g.addColorStop(0.6, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.28)');
        ctx.fillStyle = g;
        this.roundRect(ctx, -w / 2, top + h * 0.22, w, h * 0.78, 4);
        ctx.fill();
        // Lid
        ctx.fillStyle = look.body;
        this.roundRect(ctx, -w / 2 - 3, top, w + 6, h * 0.26, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        this.roundRect(ctx, -w / 2 - 3, top, w + 6, 3, 2);
        ctx.fill();
        // Ribbon
        ctx.fillStyle = look.ribbon;
        ctx.fillRect(-w * 0.09, top, w * 0.18, h);
        ctx.fillRect(-w / 2 - 3, top + h * 0.08, w + 6, h * 0.1);
        // Bow
        ctx.beginPath();
        ctx.ellipse(-w * 0.17, top - 3, w * 0.18, w * 0.1, -0.4, 0, Math.PI * 2);
        ctx.ellipse(w * 0.17, top - 3, w * 0.18, w * 0.1, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, top - 1, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'bauble': {
        const r = s * 0.36;
        ctx.fillStyle = '#d9b25c';
        ctx.fillRect(-r * 0.3, -r - 6, r * 0.6, 7);
        ctx.strokeStyle = '#d9b25c';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -r - 9, 3.5, 0, Math.PI * 2);
        ctx.stroke();
        const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.25, look.color);
        g.addColorStop(1, this.shade(look.color));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.3, 0, 0.15, Math.PI - 0.15);
        ctx.stroke();
        break;
      }
      case 'coal': {
        const r = s * 0.34;
        const pts = 7 + look.seed;
        ctx.fillStyle = '#1b1a22';
        ctx.beginPath();
        for (let i = 0; i < pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const rr = r * (0.75 + 0.25 * Math.abs(Math.sin(i * 2.3 + look.seed)));
          const x = Math.cos(a) * rr * 1.1;
          const y = Math.sin(a) * rr * 0.85;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3c3a48';
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.3);
        ctx.lineTo(-r * 0.05, -r * 0.6);
        ctx.lineTo(r * 0.2, -r * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#56536a';
        ctx.beginPath();
        ctx.arc(-r * 0.2, -r * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
        // Sooty smudge eyes make it a grumpy lump
        ctx.fillStyle = '#ff6a4a';
        ctx.globalAlpha *= 0.85;
        ctx.beginPath();
        ctx.arc(-r * 0.3, r * 0.1, 1.8, 0, Math.PI * 2);
        ctx.arc(r * 0.3, r * 0.1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'hay': {
        const w = s * 0.8;
        const h = s * 0.55;
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, '#f3d27a');
        g.addColorStop(1, '#c99a3a');
        ctx.fillStyle = g;
        this.roundRect(ctx, -w / 2, -h / 2, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(140,95,30,0.6)';
        ctx.lineWidth = 1.2;
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-w / 2 + 4, (i * h) / 8);
          ctx.lineTo(w / 2 - 4, (i * h) / 8 + Math.sin(i) * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-w * 0.28, -h / 2, 4, h);
        ctx.fillRect(w * 0.24, -h / 2, 4, h);
        ctx.strokeStyle = '#f3d27a';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(-w / 2 + 6 + i * 8, -h / 2 + 1);
          ctx.lineTo(-w / 2 + 3 + i * 8, -h / 2 - 5);
          ctx.stroke();
        }
        break;
      }
      case 'emoji': {
        ctx.font = `${Math.round(s * 0.78)}px ${EMOJI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Emoji glyphs pick up the fill alpha, so make it opaque
        ctx.fillStyle = '#000';
        ctx.fillText(look.char, 0, s * 0.04);
        break;
      }
    }
  }

  private drawSack(ctx: CanvasRenderingContext2D, L: ReturnType<ToySorterChallenge['layout']>, side: Side, front: boolean): void {
    const sack = this.sacks[side];
    const pos = L.sacks[side];
    const bulge = 1 + Math.min(sack.count, 14) * 0.022;
    const spring = Math.sin(sack.pulse * Math.PI * 3) * sack.pulse * 0.08;
    const shake = Math.sin(sack.shake * 40) * sack.shake * 6;
    const w = L.sackW * bulge * (1 + spring);
    const h = L.sackH * (1 + Math.min(sack.count, 14) * 0.012) * (1 - spring * 0.6);
    const x = pos.x + shake;
    const bottom = pos.bottom;
    const mouthY = bottom - h * 0.92;
    const mouthW = w * 0.62;

    ctx.save();
    if (!front) {
      // Shadow and the open back rim
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, bottom - 2, w * 0.55, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5c4122';
      ctx.beginPath();
      ctx.ellipse(x, mouthY, mouthW / 2 + 6, 12, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a0c';
      ctx.beginPath();
      ctx.ellipse(x, mouthY, mouthW / 2, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Things poking out once there is something inside
      sack.recent.forEach((k, i) => {
        ctx.save();
        ctx.translate(x + (i - 1) * mouthW * 0.28, mouthY - 4 - (i === 1 ? 6 : 0));
        ctx.rotate((i - 1) * 0.35);
        ctx.scale(0.55, 0.55);
        this.drawLook(ctx, k.look, L.itemSize);
        ctx.restore();
      });
      ctx.restore();
      return;
    }

    // Body
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#a5824f');
    g.addColorStop(0.45, '#c49a62');
    g.addColorStop(1, '#7a5a32');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - mouthW / 2, mouthY + 4);
    ctx.bezierCurveTo(x - w * 0.62, mouthY + h * 0.3, x - w * 0.6, bottom - 6, x - w * 0.3, bottom);
    ctx.quadraticCurveTo(x, bottom + 6, x + w * 0.3, bottom);
    ctx.bezierCurveTo(x + w * 0.6, bottom - 6, x + w * 0.62, mouthY + h * 0.3, x + mouthW / 2, mouthY + 4);
    ctx.quadraticCurveTo(x, mouthY + 14, x - mouthW / 2, mouthY + 4);
    ctx.fill();
    // Burlap weave
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(90,60,25,0.18)';
    ctx.lineWidth = 1;
    for (let yy = mouthY; yy < bottom; yy += 5) {
      ctx.beginPath();
      ctx.moveTo(x - w, yy);
      ctx.lineTo(x + w, yy);
      ctx.stroke();
    }
    for (let xx = x - w; xx < x + w; xx += 5) {
      ctx.beginPath();
      ctx.moveTo(xx, mouthY);
      ctx.lineTo(xx, bottom);
      ctx.stroke();
    }
    if (sack.flash > 0) {
      ctx.fillStyle = `rgba(224,71,91,${sack.flash * 0.45})`;
      ctx.fillRect(x - w, mouthY, w * 2, h + 10);
    }
    ctx.restore();
    // Front rim
    ctx.strokeStyle = '#6e4e2a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, mouthY + 2, mouthW / 2 + 3, 10, 0, 0.05, Math.PI - 0.05);
    ctx.stroke();
    // Ribbon band in the side colour
    ctx.strokeStyle = side === 'left' ? '#d6283f' : '#23885a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(x, mouthY + h * 0.2, w * 0.4, 9, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
    // Patch star
    ctx.fillStyle = 'rgba(247,200,115,0.75)';
    this.starPath(ctx, x - w * 0.18, bottom - h * 0.32, 7);
    ctx.fill();

    // Tag with the rule icon
    const tagX = x + (side === 'left' ? -1 : 1) * w * 0.22;
    const tagY = mouthY + h * 0.5;
    const swing = Math.sin(this.time * 2 + (side === 'left' ? 0 : 1.5)) * 0.08;
    ctx.save();
    ctx.translate(tagX, mouthY + h * 0.22);
    ctx.rotate(swing);
    ctx.strokeStyle = '#f7c873';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, tagY - (mouthY + h * 0.22) - 16);
    ctx.stroke();
    const ts = Math.max(30, L.sackW * 0.34);
    ctx.translate(0, tagY - (mouthY + h * 0.22));
    ctx.fillStyle = '#fdf6ec';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    this.roundRect(ctx, -ts / 2, -ts / 2, ts, ts, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = side === 'left' ? '#d6283f' : '#23885a';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, -ts / 2 + 2, -ts / 2 + 2, ts - 4, ts - 4, 6);
    ctx.stroke();
    ctx.font = `${Math.round(ts * 0.6)}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(side === 'left' ? this.rule.leftIcon : this.rule.rightIcon, 0, 2);
    ctx.restore();

    // Count badge
    if (sack.count > 0) {
      const bx = x + (side === 'left' ? 1 : -1) * w * 0.3;
      const by = bottom - h * 0.2;
      ctx.fillStyle = 'rgba(5,7,26,0.7)';
      ctx.beginPath();
      ctx.arc(bx, by, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd772';
      ctx.font = '800 13px Nunito, system-ui, sans-serif';
      ctx.fillText(String(sack.count), bx, by + 1);
    }
    ctx.restore();
  }

  private starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r * 0.45 : r;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = cx + rad * Math.cos(a);
      const y = cy + rad * Math.sin(a);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  private shade(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * 0.5);
    const g = Math.round(((n >> 8) & 255) * 0.5);
    const b = Math.round((n & 255) * 0.5);
    return `rgb(${r},${g},${b})`;
  }
}
