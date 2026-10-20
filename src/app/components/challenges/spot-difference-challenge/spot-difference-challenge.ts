import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check, Lightbulb, RotateCcw, Shuffle } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export type SpotDifferenceScene = 'livingRoom' | 'village' | 'workshop';

export interface SpotDifferenceConfig {
  scene?: SpotDifferenceScene; // Which illustration. Default 'livingRoom'
  differences?: number | string[]; // How many differences (random pick) or exact ids. Default 6
}

/** A difference: its id and the hit circle in the 400x300 scene coordinates */
export interface DiffArea {
  id: string;
  x: number;
  y: number;
  r: number;
  subtle?: boolean; // Only used when asked for by id (or when a count needs them)
}

interface SceneDef {
  id: SpotDifferenceScene;
  diffs: DiffArea[];
  /** Renders the scene. `p` prefixes ids, `on(id)` says whether a difference is applied */
  render(p: string, on: (id: string) => boolean): string;
}

interface Miss {
  key: number;
  x: number;
  y: number;
  side: 'left' | 'right';
}

export const SCENE_W = 400;
export const SCENE_H = 300;
const MISS_PENALTY = 3; // seconds
const MIN_TOUCH_RADIUS = 24; // screen pixels - generous on phones
const CHIME = [659.25, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

/**
 * Pure helper: which (not yet found) difference does a tap at scene coordinates hit?
 * `minR` widens small targets (in scene units) so they are easy to hit with a finger.
 */
export function findHit(diffs: DiffArea[], x: number, y: number, minR = 0): DiffArea | null {
  let best: DiffArea | null = null;
  let bestScore = Infinity;
  for (const d of diffs) {
    const score = Math.hypot(d.x - x, d.y - y) / Math.max(d.r, minR);
    if (score <= 1 && score < bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

/**
 * "Spot the difference" - two hand-drawn Christmas scenes side by side.
 * The right one has a handful of changes; tap them on either picture to circle them.
 * Wrong taps add a few seconds to the clock but there is no way to lose.
 */
@Component({
  selector: 'app-spot-difference-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './spot-difference-challenge.html',
  styleUrl: './spot-difference-challenge.scss',
})
export class SpotDifferenceChallenge implements OnInit, OnDestroy {
  @Input() config: SpotDifferenceConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  readonly Check = Check;
  readonly Lightbulb = Lightbulb;
  readonly RotateCcw = RotateCcw;
  readonly Shuffle = Shuffle;
  readonly W = SCENE_W;
  readonly H = SCENE_H;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);
  private sanitizer = inject(DomSanitizer);

  scene!: SceneDef;
  active: DiffArea[] = [];
  found: DiffArea[] = [];
  misses: Miss[] = [];
  missCount = 0;
  hint: DiffArea | null = null;
  hintsUsed = 0;
  leftHtml: SafeHtml = '';
  rightHtml: SafeHtml = '';
  won = false;
  seconds = 0;
  bestTime: number | null = null;
  /** Bumped on reset so the scene SVGs restart their animations together */
  sceneKey = 0;

  private startedAt = Date.now();
  private penalty = 0;
  private missKey = 0;
  private tick: ReturnType<typeof setInterval> | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

  get remaining(): DiffArea[] {
    return this.active.filter((d) => !this.found.includes(d));
  }

  get canShuffle(): boolean {
    return !Array.isArray(this.config?.differences) && this.active.length < this.scene.diffs.length;
  }

  get timeLabel(): string {
    return formatTime(this.seconds);
  }

  get bestLabel(): string {
    return this.bestTime === null ? '' : formatTime(this.bestTime);
  }

  ngOnInit(): void {
    this.scene = SCENES.find((s) => s.id === this.config?.scene) ?? SCENES[0];
    const key = this.statsKey;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestTime = typeof stats?.bestTime === 'number' ? stats.bestTime : null;
    this.newRound(true);
    this.tick = setInterval(() => this.updateClock(), 250);
  }

  ngOnDestroy(): void {
    if (this.tick) clearInterval(this.tick);
    this.timers.forEach(clearTimeout);
  }

  /** Taps on either picture; coordinates are mapped into scene space */
  tap(event: PointerEvent, board: HTMLElement, side: 'left' | 'right'): void {
    if (this.won || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rect = board.getBoundingClientRect();
    if (!rect.width) return;
    const scale = rect.width / SCENE_W;
    const x = ((event.clientX - rect.left) / rect.width) * SCENE_W;
    const y = ((event.clientY - rect.top) / rect.height) * SCENE_H;

    // Tapping something already circled is harmless
    if (findHit(this.found, x, y, MIN_TOUCH_RADIUS / scale)) return;

    const hit = findHit(this.remaining, x, y, MIN_TOUCH_RADIUS / scale);
    if (hit) {
      this.markFound(hit);
    } else {
      this.registerMiss(x, y, side);
    }
  }

  showHint(): void {
    if (this.won) return;
    const next = this.remaining[0];
    if (!next) return;
    this.hintsUsed++;
    this.hint = null;
    // Re-trigger the pulse animation
    this.later(() => (this.hint = next), 20);
    this.later(() => {
      if (this.hint === next) this.hint = null;
    }, 3600);
  }

  /** Start over with the same differences */
  restart(): void {
    this.newRound(false);
  }

  /** Pick a fresh set of differences (only when the config asks for a count) */
  shuffle(): void {
    this.newRound(true);
  }

  showReward(): void {
    this.completed.emit();
  }

  private newRound(pickNew: boolean): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (pickNew || !this.active.length) {
      this.active = this.pickDifferences();
      const on = new Set(this.active.map((d) => d.id));
      // Scene SVGs are static markup built from our own constants, never user input
      this.leftHtml = this.sanitizer.bypassSecurityTrustHtml(this.scene.render('sdL', () => false));
      this.rightHtml = this.sanitizer.bypassSecurityTrustHtml(this.scene.render('sdR', (id) => on.has(id)));
    }
    this.found = [];
    this.misses = [];
    this.missCount = 0;
    this.hint = null;
    this.hintsUsed = 0;
    this.won = false;
    this.penalty = 0;
    this.seconds = 0;
    this.startedAt = Date.now();
    this.sceneKey++;
  }

  private pickDifferences(): DiffArea[] {
    const all = this.scene.diffs;
    const wanted = this.config?.differences;
    if (Array.isArray(wanted)) {
      const picked = all.filter((d) => wanted.includes(d.id));
      if (picked.length) return picked;
    }
    const count = Math.max(3, Math.min(all.length, typeof wanted === 'number' ? wanted : 6));
    // Prefer the clear differences; subtle ones only fill up when more are asked for
    const shuffled = [
      ...all.filter((d) => !d.subtle).sort(() => Math.random() - 0.5),
      ...all.filter((d) => d.subtle).sort(() => Math.random() - 0.5),
    ];
    // Keep the scene's natural order so hints walk around the picture sensibly
    return all.filter((d) => shuffled.slice(0, count).includes(d));
  }

  private markFound(d: DiffArea): void {
    this.found = [...this.found, d];
    if (this.hint === d) this.hint = null;
    const i = this.found.length - 1;
    this.sound.bell(CHIME[i % CHIME.length], 0.2);
    this.sound.bell(CHIME[(i + 2) % CHIME.length], 0.08, 0.09);
    if (this.found.length === this.active.length) {
      this.onWin();
    }
  }

  private registerMiss(x: number, y: number, side: 'left' | 'right'): void {
    this.missCount++;
    this.penalty += MISS_PENALTY;
    this.updateClock();
    const miss: Miss = { key: ++this.missKey, x, y, side };
    this.misses = [...this.misses, miss];
    this.sound.thud();
    this.later(() => (this.misses = this.misses.filter((m) => m !== miss)), 1100);
  }

  private onWin(): void {
    this.updateClock();
    this.won = true;
    this.hint = null;
    this.later(() => this.sound.fanfare(), 350);
    const key = this.statsKey;
    if (key) {
      const best = this.bestTime === null ? this.seconds : Math.min(this.bestTime, this.seconds);
      this.bestTime = best;
      this.stateService.saveGameStats(key, { bestTime: best, misses: this.missCount });
    }
    this.later(() => this.completed.emit(), 2000);
  }

  private updateClock(): void {
    if (this.won) return;
    this.seconds = Math.floor((Date.now() - this.startedAt) / 1000) + this.penalty;
  }

  private get statsKey(): number | string | undefined {
    return this.day ?? this.levelId;
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(setTimeout(fn, ms));
  }
}

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ==========================================================================
   Scene art - hand-built SVG. Everything is drawn in a 400 x 300 box.
   ========================================================================== */

/** Small deterministic random so both pictures get the same snow and stars */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;

function star5(cx: number, cy: number, r: number, fill: string, extra = ''): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${f(cx + rad * Math.cos(a))},${f(cy + rad * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" ${extra}/>`;
}

/** Four-point sparkle star with a soft glow */
function sparkle(p: string, cx: number, cy: number, r: number): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r * 2.6}" fill="url(#${p}glow)" opacity="0.9"/>
    <path d="M${cx} ${cy - r} Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy} Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r} Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy} Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r} Z" fill="#fffbe8" class="sd-twinkle"/>`;
}

function snowfall(seed: number, count: number, x0: number, y0: number, w: number, h: number, maxR = 1.6): string {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = f(x0 + r() * w);
    const y = f(y0 - 10 - r() * 20);
    const size = f(0.6 + r() * maxR);
    const dur = f(5 + r() * 6);
    const delay = f(-r() * 11);
    out += `<circle class="sd-snow" cx="${x}" cy="${y}" r="${size}" style="--fall:${h + 30}px;--drift:${f(r() * 12 - 6)}px;animation-duration:${dur}s;animation-delay:${delay}s"/>`;
  }
  return `<g fill="#fff" opacity="0.9">${out}</g>`;
}

function stars(seed: number, count: number, x0: number, y0: number, w: number, h: number): string {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const tw = r() < 0.35;
    out += `<circle cx="${f(x0 + r() * w)}" cy="${f(y0 + r() * h)}" r="${f(0.4 + r() * 0.9)}" fill="#fff" opacity="${f(0.4 + r() * 0.6)}"${tw ? ` class="sd-twinkle" style="animation-delay:${f(-r() * 3)}s"` : ''}/>`;
  }
  return out;
}

function present(x: number, y: number, w: number, h: number, body: string, ribbon: string): string {
  const lid = h * 0.3;
  const cx = x + w / 2;
  return `<g>
    <ellipse cx="${cx}" cy="${y + h}" rx="${w * 0.6}" ry="3" fill="#000" opacity="0.25"/>
    <rect x="${x}" y="${y + lid * 0.6}" width="${w}" height="${h - lid * 0.6}" rx="1.5" fill="${body}"/>
    <rect x="${x}" y="${y + lid * 0.6}" width="${w}" height="${h - lid * 0.6}" rx="1.5" fill="url(#__shade)" opacity="0.35"/>
    <rect x="${x - 1.5}" y="${y}" width="${w + 3}" height="${lid}" rx="1.5" fill="${body}"/>
    <rect x="${x - 1.5}" y="${y}" width="${w + 3}" height="1.6" rx="0.8" fill="#fff" opacity="0.25"/>
    <rect x="${cx - w * 0.09}" y="${y}" width="${w * 0.18}" height="${h}" fill="${ribbon}"/>
    <rect x="${x - 1.5}" y="${y + lid * 0.35}" width="${w + 3}" height="${lid * 0.35}" fill="${ribbon}" opacity="0.9"/>
    <ellipse cx="${cx - w * 0.16}" cy="${y - 2}" rx="${w * 0.17}" ry="${w * 0.1}" fill="${ribbon}" transform="rotate(-20 ${cx - w * 0.16} ${y - 2})"/>
    <ellipse cx="${cx + w * 0.16}" cy="${y - 2}" rx="${w * 0.17}" ry="${w * 0.1}" fill="${ribbon}" transform="rotate(20 ${cx + w * 0.16} ${y - 2})"/>
    <circle cx="${cx}" cy="${y - 1}" r="${w * 0.07 + 1}" fill="${ribbon}"/>
  </g>`;
}

function commonDefs(p: string): string {
  return `
    <radialGradient id="${p}glow"><stop offset="0" stop-color="#ffe7a8" stop-opacity="0.85"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>
    <radialGradient id="${p}vignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#05071a" stop-opacity="0.55"/></radialGradient>
    <linearGradient id="${p}shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0.25"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></linearGradient>
    <radialGradient id="${p}shine" cx="0.35" cy="0.3" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
}

function wrap(p: string, defs: string, body: string): string {
  return `<svg viewBox="0 0 ${SCENE_W} ${SCENE_H}" xmlns="http://www.w3.org/2000/svg" class="sd-scene" aria-hidden="true">
    <defs>${commonDefs(p)}${defs}</defs>
    ${body.replace(/__shade/g, `${p}shade`)}
    <rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#${p}vignette)" pointer-events="none"/>
  </svg>`;
}

function ornament(p: string, x: number, y: number, r: number, color: string): string {
  return `<g>
    <rect x="${x - r * 0.3}" y="${y - r - 2}" width="${r * 0.6}" height="2.6" rx="0.6" fill="#d9b25c"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#${p}shine)"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="0.8"/>
  </g>`;
}

/* ---------------------------------- Scene 1: cosy living room ---------------------------------- */

function livingRoom(p: string, on: (id: string) => boolean): string {
  const defs = `
    <linearGradient id="${p}wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e1d31"/><stop offset="1" stop-color="#7a2a3b"/></linearGradient>
    <pattern id="${p}paper" width="18" height="18" patternUnits="userSpaceOnUse">
      <rect width="9" height="18" fill="#fff" opacity="0.035"/>
      <path d="M13.5 6 l1.4 3 -1.4 3 -1.4 -3 z" fill="#f7c873" opacity="0.16"/>
    </pattern>
    <linearGradient id="${p}floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e4126"/><stop offset="1" stop-color="#3f2313"/></linearGradient>
    <linearGradient id="${p}night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1433"/><stop offset="1" stop-color="#2e4a82"/></linearGradient>
    <linearGradient id="${p}tree" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a9b69"/><stop offset="1" stop-color="#17573d"/></linearGradient>
    <linearGradient id="${p}stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a93a6"/><stop offset="1" stop-color="#6a6478"/></linearGradient>
    <radialGradient id="${p}fire" cx="0.5" cy="0.85" r="0.7"><stop offset="0" stop-color="#ffd27a"/><stop offset="0.45" stop-color="#ff7a2f" stop-opacity="0.75"/><stop offset="1" stop-color="#ff7a2f" stop-opacity="0"/></radialGradient>
    <clipPath id="${p}glass"><rect x="26" y="38" width="92" height="108"/></clipPath>
    <linearGradient id="${p}curtain" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f1f33"/><stop offset="0.5" stop-color="#c9364d"/><stop offset="1" stop-color="#8f1f33"/></linearGradient>`;

  // Fairy lights along the top of the wall
  const bulbColors = ['#ff5a6e', '#f7c873', '#5cf2b3', '#7fb8ff', '#ff9f43', '#d58bff'];
  let garland = '';
  let bi = 0;
  for (let seg = 0; seg < 4; seg++) {
    const x0 = seg * 100;
    garland += `<path d="M${x0} 13 Q${x0 + 50} 41 ${x0 + 100} 13" stroke="#173a29" stroke-width="1.4" fill="none"/>`;
    for (const t of [0.17, 0.5, 0.83]) {
      const x = x0 + 100 * t;
      const y = 13 + 28 * 2 * t * (1 - t);
      const c = bulbColors[bi++ % bulbColors.length];
      garland += `<circle cx="${f(x)}" cy="${f(y + 3)}" r="5.5" fill="${c}" opacity="0.28" class="sd-twinkle" style="animation-delay:${f(-bi * 0.37)}s"/>
        <ellipse cx="${f(x)}" cy="${f(y + 3)}" rx="2.2" ry="3" fill="${c}"/>`;
    }
  }

  // Bricks around the fireplace
  let bricks = '';
  for (let row = 0; row < 11; row++) {
    const y = 124 + row * 9;
    bricks += `<line x1="244" y1="${y}" x2="356" y2="${y}"/>`;
    for (let x = 244 + (row % 2 ? 9 : 0); x < 356; x += 18) {
      bricks += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 9}"/>`;
    }
  }

  // Floor planks
  let planks = '';
  [238, 254, 272, 292].forEach((y, i) => {
    planks += `<line x1="0" y1="${y}" x2="400" y2="${y}"/>`;
    for (let x = 30 + i * 37; x < 400; x += 120) planks += `<line x1="${x}" y1="${y - (i ? [16, 16, 18, 20][i] : 14)}" x2="${x}" y2="${y}"/>`;
  });

  const stocking = (x: number, color: string, mirrored: boolean) => `
    <g transform="translate(${x} 121)">
      <line x1="0" y1="0" x2="0" y2="3" stroke="#d9b25c" stroke-width="1"/>
      <g ${mirrored ? 'transform="scale(-1 1)"' : ''}>
        <path d="M-6 6 L-6 22 Q-6 31 3 31 L11 31 Q16.5 31 16.5 25.5 Q16.5 20.5 11 20.5 L6 20.5 L6 6 Z" fill="${color}"/>
        <path d="M-6 22 Q-6 31 3 31 L4 31 Q-1 28 0 20 L-6 20 Z" fill="#000" opacity="0.15"/>
        <path d="M9.5 20.5 Q16.5 20.5 16.5 25.5 Q16.5 31 11 31 Q13.5 26 9.5 20.5 Z" fill="#fff" opacity="0.85"/>
        <rect x="-7.5" y="2" width="15" height="6.5" rx="2" fill="#fbf6ee"/>
        ${star5(0, 15, 3, '#f7c873')}
      </g>
    </g>`;

  const candle = (x: number, h: number, i: number) => `
    <rect x="${x - 2.5}" y="${112 - h}" width="5" height="${h}" rx="1" fill="#f6ead2"/>
    <rect x="${x + 0.6}" y="${112 - h}" width="1.6" height="${h}" fill="#000" opacity="0.08"/>
    <circle cx="${x}" cy="${108 - h}" r="9" fill="url(#${p}glow)"/>
    <ellipse cx="${x}" cy="${108 - h}" rx="1.8" ry="3.6" fill="#ffcf5a" class="sd-candle" style="animation-delay:${-i * 0.23}s"/>
    <ellipse cx="${x}" cy="${109 - h}" rx="0.8" ry="1.6" fill="#fff8e0"/>`;

  return wrap(
    p,
    defs,
    `
    <rect width="400" height="224" fill="url(#${p}wall)"/>
    <rect width="400" height="224" fill="url(#${p}paper)"/>
    <ellipse cx="300" cy="200" rx="150" ry="120" fill="url(#${p}glow)" opacity="0.35"/>
    <ellipse cx="178" cy="150" rx="70" ry="100" fill="url(#${p}glow)" opacity="0.22"/>
    <rect width="400" height="9" fill="#3a1220"/>
    <rect y="9" width="400" height="2" fill="#c9a65a" opacity="0.5"/>
    ${garland}

    <!-- Window -->
    <rect x="20" y="32" width="104" height="120" rx="3" fill="#efe3cb"/>
    <rect x="26" y="38" width="92" height="108" fill="url(#${p}night)"/>
    <g clip-path="url(#${p}glass)">
      ${stars(11, 18, 26, 38, 92, 60)}
      <circle cx="98" cy="58" r="20" fill="url(#${p}glow)" opacity="0.6"/>
      <circle cx="98" cy="58" r="9" fill="#fff2cf"/>
      <circle cx="95" cy="56" r="1.6" fill="#e9dcb8"/><circle cx="101" cy="61" r="1.2" fill="#e9dcb8"/>
      ${on('star') ? sparkle(p, 48, 58, 7) : ''}
      <path d="M26 116 Q58 100 86 112 T120 106 L120 146 L26 146 Z" fill="#b9cbea"/>
      <g fill="#1d2b52">
        <polygon points="78,116 84,98 90,116"/><polygon points="88,114 95,92 102,114"/><polygon points="100,112 106,96 112,112"/>
      </g>
      <rect x="40" y="108" width="18" height="13" fill="#2a315e"/>
      <polygon points="37,109 49,99 61,109" fill="#2a315e"/>
      <path d="M37 109 L49 99 L61 109 L58 110 L49 102 L40 110 Z" fill="#f4f8ff"/>
      <rect x="46" y="112" width="5" height="5" fill="#ffcf6b"/>
      <path d="M26 130 Q72 120 120 132 L120 146 L26 146 Z" fill="#eaf1fc"/>
      ${on('cat') ? `<g fill="#151026">
          <path d="M57 143 Q70 142 66 131 Q64 126 61 128" stroke="#151026" stroke-width="3.4" fill="none" stroke-linecap="round"/>
          <ellipse cx="49" cy="135" rx="9" ry="11"/>
          <circle cx="49" cy="121" r="6.6"/>
          <polygon points="43.5,118 44.5,109.5 48.5,116"/><polygon points="49.5,116 53.5,109.5 54.5,118"/>
          <ellipse cx="46.6" cy="121" rx="1.3" ry="1.6" fill="#ffd76a"/><ellipse cx="51.4" cy="121" rx="1.3" ry="1.6" fill="#ffd76a"/>
        </g>` : ''}
      ${snowfall(21, 16, 26, 38, 92, 108)}
    </g>
    <path d="M26 38 l14 0 q-10 4 -14 14 z M118 38 l-14 0 q10 4 14 14 z" fill="#fff" opacity="0.35"/>
    <rect x="70" y="38" width="4" height="108" fill="#efe3cb"/>
    <rect x="26" y="90" width="92" height="4" fill="#efe3cb"/>
    <rect x="14" y="149" width="116" height="7" rx="2" fill="#f6ecd8"/>
    <rect x="16" y="156" width="112" height="3" fill="#000" opacity="0.22"/>
    <rect x="2" y="20" width="140" height="4" rx="2" fill="#c9a65a"/>
    <circle cx="3" cy="22" r="3.2" fill="#e3c27a"/><circle cx="141" cy="22" r="3.2" fill="#e3c27a"/>
    <path d="M6 23 Q20 23 32 25 Q26 90 36 120 Q24 152 32 186 L6 186 Z" fill="url(#${p}curtain)"/>
    <path d="M138 23 Q124 23 112 25 Q118 90 108 120 Q120 152 112 186 L138 186 Z" fill="url(#${p}curtain)"/>
    <path d="M14 30 Q18 80 16 180 M24 28 Q26 90 24 182 M130 30 Q126 80 128 180 M120 28 Q118 90 120 182" stroke="#000" stroke-opacity="0.15" stroke-width="1.4" fill="none"/>
    <rect x="22" y="116" width="16" height="5" rx="2.5" fill="#f7c873"/><rect x="106" y="116" width="16" height="5" rx="2.5" fill="#f7c873"/>

    <!-- Painting above the fireplace -->
    <g transform="translate(308 62)${on('frame') ? ' rotate(11)' : ''}">
      <path d="M-13 -21 L0 -31 L13 -21" stroke="#d9b25c" stroke-width="0.9" fill="none"/>
      <rect x="-27" y="-21" width="54" height="42" rx="2" fill="#c9a65a"/>
      <rect x="-27" y="-21" width="54" height="42" rx="2" fill="none" stroke="#7d5c23" stroke-width="1.2"/>
      <rect x="-22" y="-16" width="44" height="32" fill="#2c4a7a"/>
      <circle cx="12" cy="-8" r="3.5" fill="#fff3d0"/>
      <polygon points="-22,9 -9,-7 0,3 9,-5 22,9" fill="#e7eef8"/>
      <polygon points="-9,-7 -5,-2 -12,-3" fill="#fff"/>
      <rect x="-22" y="9" width="44" height="7" fill="#f3f6fb"/>
      <rect x="-5" y="3" width="10" height="7" fill="#c0392b"/>
      <polygon points="-7,4 0,-1.5 7,4" fill="#5a2a2a"/>
      <rect x="-1" y="5.5" width="2.5" height="2.5" fill="#ffd56b"/>
    </g>
    <circle cx="308" cy="31" r="1.4" fill="#d9b25c"/>

    <!-- Baseboard, mouse hole, floor, rug -->
    <rect y="214" width="400" height="10" fill="#2e1a12"/>
    <rect y="214" width="400" height="1.5" fill="#6b4126"/>
    <path d="M104 224 L104 214 Q114 202 124 214 L124 224 Z" fill="#140806"/>
    ${on('mouse') ? `<g>
        <ellipse cx="114" cy="219" rx="6" ry="4.6" fill="#9a93a6"/>
        <circle cx="109.5" cy="214.8" r="2.6" fill="#9a93a6"/><circle cx="109.5" cy="214.8" r="1.4" fill="#f2a7b8"/>
        <circle cx="118.5" cy="214.8" r="2.6" fill="#9a93a6"/><circle cx="118.5" cy="214.8" r="1.4" fill="#f2a7b8"/>
        <circle cx="111.8" cy="218.6" r="0.9" fill="#111"/><circle cx="116.2" cy="218.6" r="0.9" fill="#111"/>
        <circle cx="114" cy="221.6" r="1.1" fill="#ff8fa8"/>
        <path d="M110 221.5 l-6 -1 M110 222.5 l-6 1.5 M118 221.5 l6 -1 M118 222.5 l6 1.5" stroke="#ddd" stroke-width="0.4"/>
      </g>` : ''}
    <rect y="224" width="400" height="76" fill="url(#${p}floor)"/>
    <g stroke="#000" stroke-opacity="0.25" stroke-width="0.8">${planks}</g>
    <ellipse cx="205" cy="270" rx="168" ry="25" fill="#7c1f30"/>
    <ellipse cx="205" cy="270" rx="155" ry="20" fill="none" stroke="#f7c873" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.7"/>
    <ellipse cx="205" cy="270" rx="122" ry="13" fill="#9c2f43"/>
    <ellipse cx="205" cy="270" rx="70" ry="6" fill="none" stroke="#f7c873" stroke-width="1" opacity="0.4"/>

    <!-- Fireplace -->
    <rect x="244" y="122" width="112" height="94" fill="url(#${p}stone)"/>
    <g stroke="#2a2433" stroke-opacity="0.35" stroke-width="0.8">${bricks}</g>
    <path d="M262 216 L262 166 Q300 136 338 166 L338 216 Z" fill="#4b4456"/>
    <path d="M266 216 L266 168 Q300 142 334 168 L334 216 Z" fill="#170a07"/>
    <ellipse cx="300" cy="204" rx="38" ry="30" fill="url(#${p}fire)" class="sd-glow"/>
    <rect x="276" y="203" width="48" height="8" rx="4" fill="#5a3320" transform="rotate(-9 300 207)"/>
    <rect x="276" y="203" width="48" height="8" rx="4" fill="#6e3f27" transform="rotate(9 300 207)"/>
    <g>
      <path d="M286 208 C278 199 282 191 286 184 C288 193 294 195 293 206 Z" fill="#ff6a2a" class="sd-flame" style="animation-delay:-0.3s"/>
      <path d="M314 208 C322 199 318 191 314 184 C312 193 306 195 307 206 Z" fill="#ff6a2a" class="sd-flame" style="animation-delay:-0.7s"/>
      <path d="M300 207 C285 197 291 182 296 170 C298 181 306 180 304 164 C318 180 317 199 300 207 Z" fill="#ff8a2a" class="sd-flame"/>
      <path d="M300 207 C292 199 296 189 300 182 C302 190 308 192 306 184 C312 195 308 203 300 207 Z" fill="#ffd36a" class="sd-flame" style="animation-delay:-0.5s"/>
    </g>
    <circle cx="296" cy="178" r="1" fill="#ffd36a" class="sd-ember"/>
    <circle cx="306" cy="182" r="0.9" fill="#ffb347" class="sd-ember" style="animation-delay:-1.1s"/>
    <circle cx="290" cy="186" r="0.8" fill="#ffd36a" class="sd-ember" style="animation-delay:-0.6s"/>
    <rect x="234" y="214" width="132" height="10" rx="2" fill="#6e6878"/>
    <rect x="234" y="214" width="132" height="2" rx="1" fill="#a9a2b8"/>
    <rect x="232" y="111" width="136" height="11" rx="2" fill="#5b3422"/>
    <rect x="232" y="111" width="136" height="2.2" rx="1" fill="#8a5636"/>
    <rect x="236" y="122" width="128" height="3" fill="#000" opacity="0.25"/>
    ${candle(246, 16, 0)}${candle(257, 21, 1)}${candle(268, 14, 2)}${on('candles') ? candle(279, 18, 3) : ''}
    <!-- Little tomte on the mantel -->
    <g>
      <ellipse cx="352" cy="110" rx="8" ry="2" fill="#000" opacity="0.25"/>
      <path d="M345 110 Q345 99 352 98 Q359 99 359 110 Z" fill="#8a8a96"/>
      <path d="M346 101 Q352 112 358 101 Q357 106 352 108 Q347 106 346 101 Z" fill="#f4f1ea"/>
      <circle cx="352" cy="100.5" r="2" fill="#f2b7a0"/>
      <path d="M344.5 100 Q352 102 359.5 100 L353 82 Q351 80 350 84 Z" fill="${on('tomte') ? '#2e8b57' : '#c0392b'}"/>
      <circle cx="352.5" cy="82" r="1.4" fill="#fff"/>
    </g>
    <path d="M234 122 Q267 133 300 122 Q333 133 366 122" stroke="#1f6f4a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M234 122 Q267 133 300 122 Q333 133 366 122" stroke="#2f9a64" stroke-width="2" fill="none" stroke-dasharray="2 3" stroke-linecap="round"/>
    <g fill="#e0475b"><circle cx="249" cy="127" r="1.6"/><circle cx="283" cy="127" r="1.6"/><circle cx="317" cy="127" r="1.6"/><circle cx="351" cy="127" r="1.6"/></g>
    ${stocking(270, '#c0392b', false)}${stocking(300, '#2e8b57', on('stocking'))}${stocking(330, '#3b5fb0', false)}

    <!-- Tree -->
    <rect x="173" y="210" width="10" height="12" fill="#5a3324"/>
    <path d="M178 112 L230 212 Q178 226 126 212 Z" fill="url(#${p}tree)"/>
    <path d="M178 112 L230 212 Q205 220 178 222 Z" fill="#000" opacity="0.14"/>
    <path d="M178 78 L219 164 Q178 175 137 164 Z" fill="url(#${p}tree)"/>
    <path d="M178 78 L219 164 Q200 171 178 173 Z" fill="#000" opacity="0.14"/>
    <path d="M178 44 L205 116 Q178 125 151 116 Z" fill="url(#${p}tree)"/>
    <path d="M178 44 L205 116 Q192 121 178 122 Z" fill="#000" opacity="0.14"/>
    <path d="M132 210 l6 -4 4 5 5 -4 4 5 5 -4 4 5 M143 162 l6 -4 4 5 5 -4 4 5 M156 114 l5 -4 4 4 5 -4" stroke="#5fc48f" stroke-opacity="0.45" stroke-width="1" fill="none"/>
    <path d="M140 196 Q178 214 220 190" stroke="#f7c873" stroke-width="1.6" fill="none" opacity="0.85"/>
    <path d="M148 150 Q178 162 210 142" stroke="#f7c873" stroke-width="1.5" fill="none" opacity="0.85"/>
    <path d="M158 104 Q178 113 198 98" stroke="#f7c873" stroke-width="1.3" fill="none" opacity="0.85"/>
    ${[
      [150, 196],
      [166, 203],
      [196, 204],
      [214, 194],
      [158, 155],
      [184, 158],
      [204, 147],
      [168, 108],
      [188, 106],
      [178, 88],
      [146, 178],
      [208, 178],
    ]
      .map(
        ([x, y], i) =>
          `<circle cx="${x}" cy="${y}" r="3.6" fill="${bulbColors[i % 6]}" opacity="0.35" class="sd-twinkle" style="animation-delay:${f(-i * 0.41)}s"/><circle cx="${x}" cy="${y}" r="1.3" fill="#fffbe8"/>`
      )
      .join('')}
    ${ornament(p, 150, 205, 6, '#e0475b')}
    ${ornament(p, 208, 204, 6, '#f7c873')}
    ${ornament(p, 178, 192, 6.5, '#5b8def')}
    ${ornament(p, 160, 146, 5.2, '#f7c873')}
    ${ornament(p, 200, 152, 6.3, on('ornament') ? '#8e5bd8' : '#e0475b')}
    ${ornament(p, 178, 134, 5, '#d8dee8')}
    ${ornament(p, 165, 101, 4.6, '#e0475b')}
    ${ornament(p, 192, 100, 4.6, '#5cc39a')}
    ${ornament(p, 178, 70, 4, '#f7c873')}
    <circle cx="178" cy="40" r="22" fill="url(#${p}glow)"/>
    ${star5(178, 40, 11, '#ffd772', 'stroke="#e9a64a" stroke-width="1"')}

    <!-- Presents -->
    ${present(130, 222, 30, 24, '#c0392b', on('ribbon') ? '#fdf6ec' : '#f7c873')}
    ${on('present') ? '' : present(190, 225, 26, 22, '#2e8b57', '#e0475b')}
    ${present(159, 233, 20, 15, '#3b6fd8', '#fdf6ec')}
    <rect x="166" y="218" width="24" height="16" rx="3" fill="#9b2335"/>
    <rect x="166" y="222" width="24" height="3" fill="#f7c873"/>

    <!-- Teddy on the rug -->
    <g>
      <ellipse cx="72" cy="268" rx="18" ry="4" fill="#000" opacity="0.25"/>
      <ellipse cx="62" cy="264" rx="6" ry="5" fill="#9a6235"/><ellipse cx="82" cy="264" rx="6" ry="5" fill="#9a6235"/>
      <ellipse cx="62" cy="265" rx="3" ry="2.6" fill="#e8c49a"/><ellipse cx="82" cy="265" rx="3" ry="2.6" fill="#e8c49a"/>
      <ellipse cx="72" cy="254" rx="11" ry="12" fill="#a8703f"/>
      <ellipse cx="72" cy="257" rx="6" ry="7" fill="#d9ad7c"/>
      <ellipse cx="60" cy="250" rx="4" ry="6" fill="#9a6235" transform="rotate(25 60 250)"/>
      <ellipse cx="84" cy="250" rx="4" ry="6" fill="#9a6235" transform="rotate(-25 84 250)"/>
      <circle cx="63" cy="229" r="4.2" fill="#a8703f"/><circle cx="81" cy="229" r="4.2" fill="#a8703f"/>
      <circle cx="63" cy="229" r="2.2" fill="#d9ad7c"/><circle cx="81" cy="229" r="2.2" fill="#d9ad7c"/>
      <circle cx="72" cy="236" r="10" fill="#b57a45"/>
      <ellipse cx="72" cy="239.5" rx="4.6" ry="3.6" fill="#e8c49a"/>
      <ellipse cx="72" cy="238" rx="1.8" ry="1.3" fill="#2b1a12"/>
      <circle cx="68" cy="233.5" r="1.2" fill="#2b1a12"/><circle cx="76" cy="233.5" r="1.2" fill="#2b1a12"/>
      <path d="M66 246 L72 249 L78 246 L78 250 L72 248.5 L66 250 Z" fill="#e0475b"/>
      ${on('teddyHat') ? `<path d="M62 229 Q72 224 82 229 L76 214 Q71 210 66 219 Z" fill="#d6283f"/>
        <rect x="61" y="226.5" width="22" height="4.5" rx="2.2" fill="#fbf6ee"/>
        <circle cx="65.5" cy="217" r="3" fill="#fbf6ee"/>` : ''}
    </g>

    <!-- Armchair peeking in on the right -->
    <g>
      <rect x="372" y="150" width="40" height="80" rx="10" fill="#2f6f62"/>
      <rect x="360" y="196" width="40" height="18" rx="6" fill="#3b8a79"/>
      <rect x="358" y="186" width="16" height="44" rx="7" fill="#286055"/>
      <path d="M380 150 L400 150 L400 214 L388 214 Q384 180 380 150 Z" fill="#c0392b"/>
      <path d="M384 150 L386 214 M392 150 L394 214" stroke="#f7c873" stroke-width="1.2" opacity="0.7"/>
      <rect x="360" y="228" width="5" height="10" fill="#3e2414"/>
    </g>
    `
  );
}

/* ---------------------------------- Scene 2: snowy village street ---------------------------------- */

function village(p: string, on: (id: string) => boolean): string {
  const defs = `
    <linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060b28"/><stop offset="0.55" stop-color="#1a2b62"/><stop offset="1" stop-color="#3d5490"/></linearGradient>
    <linearGradient id="${p}snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f1fd"/><stop offset="1" stop-color="#b9cbe8"/></linearGradient>
    <linearGradient id="${p}tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.95"/></linearGradient>
    <filter id="${p}blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <mask id="${p}crescent"><rect width="400" height="300" fill="#fff"/><circle cx="339" cy="43" r="15.5" fill="#000"/></mask>`;

  const roofSnow = (l: number, peakX: number, peakY: number, r: number, baseY: number) => {
    let scallop = '';
    const w = r - l;
    const n = Math.round(w / 12);
    for (let i = n; i > 0; i--) {
      const x1 = l + (w * i) / n;
      const x0 = l + (w * (i - 1)) / n;
      scallop += ` Q${f((x0 + x1) / 2)} ${baseY + 6} ${f(x0)} ${baseY}`;
    }
    return `<path d="M${l} ${baseY} L${peakX} ${peakY} L${r} ${baseY}${scallop} Z" fill="#f4f8ff"/>
      <path d="M${peakX} ${peakY} L${r} ${baseY} L${r - 6} ${baseY + 1} Z" fill="#c9d8ef" opacity="0.8"/>`;
  };

  const win = (x: number, y: number, w: number, h: number, lit = true) => `
    ${lit ? `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w * 1.3}" fill="url(#${p}glow)" opacity="0.7"/>` : ''}
    <rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="1" fill="#f3ead9"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${lit ? '#ffcf6b' : '#1c2448'}"/>
    ${lit ? `<rect x="${x}" y="${y + h * 0.55}" width="${w}" height="${h * 0.45}" fill="#ffad42" opacity="0.5"/>` : `<path d="M${x} ${y} l${w * 0.5} 0 l-${w * 0.5} ${h * 0.5} z" fill="#fff" opacity="0.08"/>`}
    <rect x="${x + w / 2 - 0.9}" y="${y}" width="1.8" height="${h}" fill="#f3ead9"/>
    <rect x="${x}" y="${y + h / 2 - 0.9}" width="${w}" height="1.8" fill="#f3ead9"/>
    <rect x="${x - 3}" y="${y + h + 1}" width="${w + 6}" height="3" rx="1.5" fill="#fff"/>`;

  const siding = (x: number, y0: number, w: number, y1: number) => {
    let s = '';
    for (let y = y0 + 6; y < y1; y += 6) s += `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}"/>`;
    return `<g stroke="#000" stroke-opacity="0.12" stroke-width="0.7">${s}</g>`;
  };

  const lamp = (x: number, lit: boolean) => `
    ${lit ? `<circle cx="${x}" cy="135" r="30" fill="url(#${p}glow)" class="sd-glow"/><ellipse cx="${x}" cy="226" rx="26" ry="6" fill="#ffe7a8" opacity="0.35"/>` : ''}
    <rect x="${x - 1.6}" y="140" width="3.2" height="84" fill="#20243b"/>
    <rect x="${x - 4}" y="218" width="8" height="7" rx="1" fill="#20243b"/>
    <path d="M${x - 2.5} 172 q-6 -3 -4 -9" stroke="#20243b" stroke-width="1.2" fill="none"/>
    <path d="M${x - 7} 127 L${x + 7} 127 L${x + 5} 142 L${x - 5} 142 Z" fill="${lit ? '#ffe39a' : '#3a4166'}"/>
    <path d="M${x} 127 L${x} 142 M${x - 6} 134 L${x + 6} 134" stroke="#20243b" stroke-width="0.8"/>
    <path d="M${x - 9} 128 L${x} 119 L${x + 9} 128 Z" fill="#20243b"/>
    <path d="M${x - 8} 126 Q${x} 115 ${x + 8} 126 Q${x + 4} 124 ${x} 125 Q${x - 4} 124 ${x - 8} 126 Z" fill="#fff"/>
    <rect x="${x - 6}" y="142" width="12" height="2.5" fill="#20243b"/>`;

  // Distant pines
  const pr = rng(7);
  let pines = '';
  for (let x = -4; x < 410; x += 9 + pr() * 14) {
    const base = 150 + Math.sin(x / 60) * 8 + 10;
    const h = 12 + pr() * 14;
    pines += `<polygon points="${f(x - h * 0.3)},${f(base)} ${f(x)},${f(base - h)} ${f(x + h * 0.3)},${f(base)}"/>`;
  }

  const kid = (coat: string, hat: string, pom: string, armsUp: boolean) => `
    <rect x="-5" y="-14" width="10" height="13" rx="4" fill="${coat}"/>
    <path d="${armsUp ? 'M-4 -11 L-9 -20 M4 -11 L9 -20' : 'M-4 -9 L-9 -4 M4 -9 L9 -4'}" stroke="${coat}" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="0" cy="-19" r="5" fill="#f2c9a0"/>
    <circle cx="-1.8" cy="-19" r="0.7" fill="#2b1a12"/><circle cx="1.8" cy="-19" r="0.7" fill="#2b1a12"/>
    <circle cx="-3" cy="-17.4" r="1" fill="#f28c8c" opacity="0.7"/><circle cx="3" cy="-17.4" r="1" fill="#f28c8c" opacity="0.7"/>
    <path d="M-5.4 -20 Q-5.4 -26.5 0 -26.5 Q5.4 -26.5 5.4 -20 Z" fill="${hat}"/>
    <rect x="-5.6" y="-21.4" width="11.2" height="2.4" rx="1.2" fill="${pom}"/>
    <circle cx="0" cy="-27" r="2" fill="${pom}"/>
    <rect x="-5" y="-14.5" width="10" height="2.4" rx="1.2" fill="#f7c873"/>`;

  return wrap(
    p,
    defs,
    `
    <rect width="400" height="300" fill="url(#${p}sky)"/>
    <path d="M0 78 C70 34 150 96 230 56 S350 36 400 58 L400 84 C330 66 260 116 200 96 S80 70 0 106 Z" fill="#5cf2b3" opacity="0.16" filter="url(#${p}blur)" class="sd-aurora"/>
    ${stars(3, 46, 0, 0, 400, 140)}
    <circle cx="330" cy="48" r="38" fill="url(#${p}glow)" opacity="0.45"/>
    <g ${on('moon') ? `mask="url(#${p}crescent)"` : ''}>
      <circle cx="330" cy="48" r="17" fill="#fff3d4"/>
      <circle cx="324" cy="44" r="3.4" fill="#ece0bd"/><circle cx="335" cy="54" r="2.4" fill="#ece0bd"/><circle cx="333" cy="40" r="1.6" fill="#ece0bd"/>
    </g>
    ${on('shooting') ? `<g><line x1="86" y1="26" x2="140" y2="52" stroke="url(#${p}tail)" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="140" cy="52" r="7" fill="url(#${p}glow)"/><circle cx="140" cy="52" r="2.2" fill="#fff"/></g>` : ''}

    <path d="M0 162 Q60 132 130 152 T260 142 T400 152 L400 210 L0 210 Z" fill="#8ea4cf"/>
    <g fill="#24345f">${pines}</g>
    <path d="M0 186 Q100 166 200 182 T400 176 L400 210 L0 210 Z" fill="#c6d4ec"/>

    <!-- Red house -->
    <rect x="84" y="100" width="12" height="26" fill="#7a3b2e"/>
    <rect x="82" y="97" width="16" height="5" rx="2" fill="#fff"/>
    ${on('smoke') ? '' : `<g fill="#d3dbee">
        <circle cx="90" cy="88" r="4.5" class="sd-smoke"/>
        <circle cx="90" cy="88" r="5.5" class="sd-smoke" style="animation-delay:-1s"/>
        <circle cx="90" cy="88" r="6.5" class="sd-smoke" style="animation-delay:-2s"/>
        <circle cx="90" cy="88" r="7" class="sd-smoke" style="animation-delay:-3s"/>
      </g>`}
    <rect x="22" y="138" width="86" height="67" fill="#b8323f"/>
    ${siding(22, 138, 86, 205)}
    <rect x="22" y="138" width="3" height="67" fill="#f3ead9"/><rect x="105" y="138" width="3" height="67" fill="#f3ead9"/>
    <polygon points="14,141 65,96 116,141" fill="#3a2a35"/>
    ${roofSnow(12, 65, 93, 118, 141)}
    ${win(32, 152, 18, 18)}${win(80, 152, 18, 18)}
    <rect x="55" y="170" width="18" height="35" rx="2" fill="#f3ead9"/>
    <rect x="57" y="172" width="14" height="33" rx="1.5" fill="#e8dcc4"/>
    <circle cx="68" cy="190" r="1.2" fill="#c9a65a"/>
    ${on('wreath') ? `<circle cx="64" cy="181" r="5.2" fill="none" stroke="#1f7a4c" stroke-width="3.4"/>
        <circle cx="64" cy="181" r="5.2" fill="none" stroke="#3fae6f" stroke-width="1.2" stroke-dasharray="1.5 2"/>
        <path d="M61 186 L64 184 L67 186 L66 190 L64 186.5 L62 190 Z" fill="#e0475b"/>` : ''}
    <rect x="52" y="204" width="24" height="3" fill="#d9e2f2"/>

    <!-- Yellow house -->
    <rect x="212" y="86" width="12" height="24" fill="#7a3b2e"/>
    <rect x="210" y="83" width="16" height="5" rx="2" fill="#fff"/>
    <rect x="150" y="120" width="92" height="85" fill="#e0a93a"/>
    ${siding(150, 120, 92, 205)}
    <rect x="150" y="120" width="3" height="85" fill="#f3ead9"/><rect x="239" y="120" width="3" height="85" fill="#f3ead9"/>
    <polygon points="142,123 196,79 250,123" fill="#3a2a35"/>
    ${roofSnow(140, 196, 76, 252, 123)}
    ${on('attic') ? '' : `<circle cx="196" cy="106" r="11" fill="url(#${p}glow)" opacity="0.7"/>`}
    <circle cx="196" cy="106" r="7" fill="#f3ead9"/><circle cx="196" cy="106" r="5.4" fill="${on('attic') ? '#1c2448' : '#ffcf6b'}"/>
    <path d="M196 100.6 V111.4 M190.6 106 H201.4" stroke="#f3ead9" stroke-width="1.2"/>
    ${win(162, 132, 16, 18)}${win(214, 132, 16, 18, !on('window'))}
    ${win(162, 166, 16, 18)}
    <rect x="200" y="170" width="18" height="35" rx="2" fill="#7a2a2a"/>
    <rect x="203" y="174" width="12" height="10" rx="1" fill="#ffcf6b" opacity="0.85"/>
    <circle cx="214" cy="190" r="1.2" fill="#f7c873"/>
    <rect x="197" y="204" width="24" height="3" fill="#d9e2f2"/>
    <path d="M144 123 Q160 129 176 123 Q192 129 208 123 Q224 129 248 123" stroke="#1d1d2e" stroke-width="0.8" fill="none"/>
    ${[148, 156, 164, 172, 180, 188, 196, 204, 212, 220, 228, 236, 244]
      .map((x, i) => {
        const c = ['#ff5a6e', '#f7c873', '#5cf2b3', '#7fb8ff'][i % 4];
        return `<circle cx="${x}" cy="${f(125.5 + Math.abs(Math.sin((x - 144) / 10.2)) * 1.6)}" r="3.6" fill="${c}" opacity="0.4" class="sd-twinkle" style="animation-delay:${f(-i * 0.29)}s"/><circle cx="${x}" cy="${f(125.5 + Math.abs(Math.sin((x - 144) / 10.2)) * 1.6)}" r="1.4" fill="${c}"/>`;
      })
      .join('')}

    <!-- Blue house -->
    <rect x="352" y="112" width="11" height="22" fill="#7a3b2e"/>
    <rect x="350" y="109" width="15" height="5" rx="2" fill="#fff"/>
    <rect x="284" y="142" width="96" height="63" fill="#3b6ea8"/>
    ${siding(284, 142, 96, 205)}
    <rect x="284" y="142" width="3" height="63" fill="#f3ead9"/><rect x="377" y="142" width="3" height="63" fill="#f3ead9"/>
    <polygon points="276,145 332,104 388,145" fill="#3a2a35"/>
    ${roofSnow(274, 332, 101, 390, 145)}
    ${win(296, 154, 18, 18)}${win(350, 154, 18, 18)}
    <rect x="323" y="169" width="18" height="36" rx="2" fill="${on('door') ? '#d23c4f' : '#2e8b57'}"/>
    <rect x="326" y="173" width="12" height="12" rx="1" fill="#000" opacity="0.15"/>
    <rect x="326" y="189" width="12" height="12" rx="1" fill="#000" opacity="0.15"/>
    <circle cx="337" cy="188" r="1.2" fill="#f7c873"/>
    <rect x="320" y="204" width="24" height="3" fill="#d9e2f2"/>

    <!-- Snowy ground -->
    <path d="M0 204 Q100 199 200 205 T400 203 L400 300 L0 300 Z" fill="url(#${p}snow)"/>
    <g fill="#ffe7a8" opacity="0.28">
      <ellipse cx="41" cy="214" rx="14" ry="3"/><ellipse cx="89" cy="214" rx="14" ry="3"/><ellipse cx="171" cy="213" rx="12" ry="3"/>
      <ellipse cx="305" cy="214" rx="14" ry="3"/><ellipse cx="359" cy="214" rx="14" ry="3"/>
    </g>
    ${lamp(128, true)}${lamp(262, !on('lamp'))}

    <!-- Little decorated spruce -->
    <g>
      <rect x="103" y="232" width="4" height="7" fill="#5a3324"/>
      <polygon points="105,196 118,234 92,234" fill="#1f6f4a"/>
      <polygon points="105,196 118,234 105,234" fill="#000" opacity="0.15"/>
      <path d="M95 228 Q105 222 116 229 M98 216 Q105 212 112 216" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.9"/>
      <circle cx="100" cy="222" r="1.6" fill="#ff5a6e" class="sd-twinkle"/><circle cx="110" cy="224" r="1.6" fill="#f7c873" class="sd-twinkle" style="animation-delay:-0.8s"/>
      <circle cx="105" cy="209" r="1.5" fill="#7fb8ff" class="sd-twinkle" style="animation-delay:-1.4s"/>
      ${on('spruceStar') ? '' : star5(105, 195, 3.6, '#ffd772')}
    </g>

    <!-- Fence -->
    <g>
      <rect x="128" y="256" width="104" height="4" fill="#7a4e32"/>
      <rect x="128" y="266" width="104" height="4" fill="#7a4e32"/>
      ${[132, 150, 168, 186, 204, 222]
        .map(
          (x) => `<rect x="${x - 2.5}" y="250" width="5" height="28" fill="#8a5a3a"/>
            <polygon points="${x - 2.5},250 ${x},246 ${x + 2.5},250" fill="#8a5a3a"/>
            <ellipse cx="${x}" cy="248" rx="3.6" ry="2" fill="#fff"/>`
        )
        .join('')}
      <rect x="128" y="254" width="104" height="2" rx="1" fill="#fff"/>
      ${on('bird') ? `<g>
          <path d="M187 245 L180 247 L186 249 Z" fill="#5a3a26"/>
          <ellipse cx="193" cy="243" rx="7" ry="5.4" fill="#7a5236"/>
          <ellipse cx="196" cy="244" rx="4" ry="4" fill="#e8582f"/>
          <circle cx="198" cy="238" r="3.6" fill="#7a5236"/>
          <circle cx="199" cy="239" r="2.4" fill="#e8582f"/>
          <circle cx="199" cy="237" r="0.8" fill="#111"/>
          <polygon points="201.2,237.8 204,238.6 201.2,239.4" fill="#e7b33a"/>
        </g>` : ''}
    </g>

    <!-- Snowman -->
    <g transform="translate(-18 12)">
      <ellipse cx="58" cy="281" rx="24" ry="5" fill="#8ea4cf" opacity="0.5"/>
      <circle cx="58" cy="263" r="20" fill="#fbfdff"/><path d="M70 249 A20 20 0 0 1 58 283 A18 18 0 0 0 70 249 Z" fill="#c9d8ef"/>
      <circle cx="58" cy="236" r="14" fill="#fbfdff"/><path d="M66 225 A14 14 0 0 1 58 250 A12.5 12.5 0 0 0 66 225 Z" fill="#c9d8ef"/>
      <circle cx="58" cy="215" r="10" fill="#fbfdff"/>
      <path d="M44 234 L28 222 M31 224.5 L27 228 M72 234 L88 224 M84 226.5 L88 230" stroke="#5a3a26" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="54.5" cy="213" r="1.3" fill="#1b1b2a"/><circle cx="61.5" cy="213" r="1.3" fill="#1b1b2a"/>
      <polygon points="58,216 68,218.5 58,219.5" fill="#f08a2a"/>
      <path d="M53.5 220.5 Q58 223.5 62.5 220.5" stroke="#1b1b2a" stroke-width="1" stroke-dasharray="0.8 1.4" fill="none"/>
      <circle cx="58" cy="232" r="1.4" fill="#1b1b2a"/><circle cx="58" cy="239" r="1.4" fill="#1b1b2a"/><circle cx="58" cy="257" r="1.6" fill="#1b1b2a"/>
      <path d="M47 223.5 Q58 229 69 223.5 L69 227 Q58 232 47 227 Z" fill="#e0475b"/>
      <path d="M63 227 L66 240 L70 239 L66.5 226 Z" fill="#c0392b"/>
      ${on('snowmanHat') ? '' : `<rect x="45" y="205" width="26" height="3.4" rx="1.4" fill="#1b1b2a"/>
        <rect x="49.5" y="189" width="17" height="17" rx="1.5" fill="#1b1b2a"/>
        <rect x="49.5" y="200" width="17" height="3" fill="#e0475b"/>
        <circle cx="63" cy="200.5" r="2" fill="#2e8b57"/>`}
    </g>

    <!-- Sledding hill -->
    <path d="M236 300 Q300 262 400 222 L400 300 Z" fill="#f3f8ff"/>
    <path d="M236 300 Q300 262 400 222" stroke="#b9cbe8" stroke-width="1.5" fill="none"/>
    <path d="M300 279 Q340 260 400 236 M304 284 Q344 265 400 241" stroke="#b9cbe8" stroke-width="1" fill="none" opacity="0.8"/>
    <g transform="translate(318 266) rotate(-22)">
      <path d="M-20 4 L18 4 Q24 4 24 -2" stroke="#7a4e32" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <rect x="-18" y="-2" width="34" height="4.5" rx="1.5" fill="#c0392b"/>
      <path d="M-14 2.5 L-14 4 M10 2.5 L10 4" stroke="#7a4e32" stroke-width="1.6"/>
      <g transform="translate(6 -1)">${kid('#3b6fd8', '#f7c873', '#fff', false)}</g>
      <g transform="translate(-8 -1)">${kid('#c0392b', on('kidHat') ? '#5cc39a' : '#7b4fc9', '#fff', true)}</g>
    </g>

    ${snowfall(42, 44, 0, 0, 400, 300, 1.8)}
    `
  );
}

/* ---------------------------------- Scene 3: Santa's workshop ---------------------------------- */

function workshop(p: string, on: (id: string) => boolean): string {
  const defs = `
    <linearGradient id="${p}wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3520"/><stop offset="1" stop-color="#7b4c2d"/></linearGradient>
    <linearGradient id="${p}floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f2f1b"/><stop offset="1" stop-color="#2f1b0f"/></linearGradient>
    <linearGradient id="${p}night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1433"/><stop offset="1" stop-color="#2e4a82"/></linearGradient>
    <linearGradient id="${p}wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b47e4c"/><stop offset="1" stop-color="#8a5a36"/></linearGradient>
    <linearGradient id="${p}sack" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a5824f"/><stop offset="1" stop-color="#7a5a32"/></linearGradient>
    <clipPath id="${p}glass"><path d="M170 106 L170 58 A30 30 0 0 1 230 58 L230 106 Z"/></clipPath>`;

  let planks = '';
  const r = rng(5);
  for (let x = 0; x < 400; x += 25) {
    planks += `<rect x="${x}" y="0" width="25" height="226" fill="#000" opacity="${f(r() * 0.12)}"/><line x1="${x}" y1="0" x2="${x}" y2="226"/>`;
    if (r() < 0.5) planks += `<ellipse cx="${f(x + 6 + r() * 12)}" cy="${f(20 + r() * 180)}" rx="2" ry="3.4" fill="#3e2516" opacity="0.4" stroke="none"/>`;
  }
  let floor = '';
  [240, 258, 280].forEach((y, i) => {
    floor += `<line x1="0" y1="${y}" x2="400" y2="${y}"/>`;
    for (let x = 20 + i * 45; x < 400; x += 110) floor += `<line x1="${x}" y1="${y - 16}" x2="${x}" y2="${y}"/>`;
  });

  const lantern = (x: number, lit: boolean) => `
    ${lit ? `<circle cx="${x}" cy="46" r="36" fill="url(#${p}glow)" class="sd-glow"/>` : ''}
    <line x1="${x}" y1="12" x2="${x}" y2="32" stroke="#2a1a10" stroke-width="1.2"/>
    <circle cx="${x}" cy="31" r="2.4" fill="none" stroke="#2a1a10" stroke-width="1.2"/>
    <path d="M${x - 9} 38 L${x} 32 L${x + 9} 38 Z" fill="#2a2a36"/>
    <rect x="${x - 7}" y="38" width="14" height="18" fill="${lit ? '#ffd77a' : '#3c3446'}"/>
    ${lit ? `<ellipse cx="${x}" cy="49" rx="2.2" ry="3.6" fill="#fff4c8" class="sd-candle"/>` : ''}
    <path d="M${x - 7} 38 V56 M${x} 38 V56 M${x + 7} 38 V56" stroke="#2a2a36" stroke-width="1.3"/>
    <rect x="${x - 9}" y="56" width="18" height="3" rx="1" fill="#2a2a36"/>`;

  const block = (x: number, y: number, c: string, letter: string) => `
    <rect x="${x}" y="${y}" width="15" height="15" rx="1.5" fill="${c}"/>
    <rect x="${x}" y="${y}" width="15" height="2" rx="1" fill="#fff" opacity="0.3"/>
    <text x="${x + 7.5}" y="${y + 11.5}" text-anchor="middle" font-size="10" font-weight="800" font-family="Nunito, Arial, sans-serif" fill="#fff">${letter}</text>`;

  const wheel = (x: number, y: number, rad: number) =>
    `<circle cx="${x}" cy="${y}" r="${rad}" fill="#2a2a36"/><circle cx="${x}" cy="${y}" r="${rad * 0.4}" fill="#f7c873"/>`;

  const traincar = (x: number, color: string, cargo: string) => `
    <rect x="${x}" y="130" width="27" height="13" rx="2" fill="${color}"/>
    <rect x="${x}" y="130" width="27" height="2.4" fill="#fff" opacity="0.25"/>
    ${cargo}
    ${wheel(x + 7, 145, 4)}${wheel(x + 20, 145, 4)}
    <rect x="${x - 4}" y="138" width="4" height="2" fill="#2a2a36"/>`;

  // Clock hands: angles in degrees (0 = 12 o'clock)
  const hour = on('clock') ? 120 : 300;
  const minute = on('clock') ? 180 : 60;
  const hand = (deg: number, len: number, w: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `<line x1="352" y1="72" x2="${f(352 + len * Math.cos(a))}" y2="${f(72 + len * Math.sin(a))}" stroke="#2a1a10" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    ticks += `<line x1="${f(352 + 12 * Math.sin(a))}" y1="${f(72 - 12 * Math.cos(a))}" x2="${f(352 + 14 * Math.sin(a))}" y2="${f(72 - 14 * Math.cos(a))}"/>`;
  }

  const bunting = Array.from({ length: 16 }, (_, i) => {
    const x = 6 + i * 25;
    const c = ['#e0475b', '#f7c873', '#3aae8a', '#fdf6ec'][i % 4];
    return `<polygon points="${x},16 ${x + 16},16 ${x + 8},29" fill="${c}"/>`;
  }).join('');

  return wrap(
    p,
    defs,
    `
    <rect width="400" height="226" fill="url(#${p}wall)"/>
    <g stroke="#2a1a10" stroke-opacity="0.35" stroke-width="1">${planks}</g>
    <ellipse cx="200" cy="170" rx="210" ry="140" fill="url(#${p}glow)" opacity="0.25"/>
    <rect width="400" height="15" fill="#3e2516"/>
    <rect y="15" width="400" height="2" fill="#2a1a10"/>
    <path d="M0 16 Q100 22 200 16 T400 16" stroke="#2a1a10" stroke-width="0.8" fill="none"/>
    ${bunting}

    <!-- Window -->
    <path d="M163 110 L163 58 A37 37 0 0 1 237 58 L237 110 Z" fill="#e8d6b0"/>
    <path d="M170 106 L170 58 A30 30 0 0 1 230 58 L230 106 Z" fill="url(#${p}night)"/>
    <g clip-path="url(#${p}glass)">
      ${stars(9, 14, 170, 28, 60, 44)}
      <circle cx="214" cy="48" r="14" fill="url(#${p}glow)" opacity="0.7"/>
      <circle cx="214" cy="48" r="6.4" fill="#fff2cf"/>
      ${on('star') ? sparkle(p, 185, 52, 6.5) : ''}
      <path d="M170 92 Q190 82 206 90 T232 86 L232 108 L170 108 Z" fill="#c4d3ee"/>
      <g fill="#1d2b52"><polygon points="176,94 181,78 186,94"/><polygon points="214,92 220,74 226,92"/></g>
      <path d="M170 99 Q200 94 232 100 L232 108 L170 108 Z" fill="#eaf1fc"/>
      ${snowfall(13, 10, 170, 20, 60, 90)}
    </g>
    <rect x="198.5" y="22" width="3" height="86" fill="#e8d6b0"/>
    <rect x="170" y="70" width="60" height="3" fill="#e8d6b0"/>
    <rect x="158" y="108" width="84" height="6" rx="2" fill="#c9a874"/>
    <rect x="160" y="114" width="80" height="3" fill="#000" opacity="0.25"/>
    <!-- Little plant on the sill -->
    <path d="M220 100 q-5 -8 0 -12 q5 4 0 12 M220 100 q6 -6 10 -4 q-3 6 -10 4 M220 100 q-7 -4 -10 -1 q4 5 10 1" fill="#3aae8a"/>
    <path d="M214 100 L226 100 L224 108 L216 108 Z" fill="#c0392b"/>

    ${lantern(130, true)}${lantern(270, !on('lantern'))}

    <!-- Nice list -->
    <g>
      <rect x="290" y="30" width="34" height="58" fill="#f6ecd2"/>
      <rect x="287" y="27" width="40" height="6" rx="3" fill="#e2d2ad"/>
      <rect x="287" y="85" width="40" height="6" rx="3" fill="#e2d2ad"/>
      <text x="307" y="44" text-anchor="middle" font-size="7" font-weight="800" font-family="Nunito, Arial, sans-serif" fill="#c0392b">NICE</text>
      <g stroke="#8a7a5a" stroke-width="1" stroke-linecap="round">
        <line x1="295" y1="51" x2="315" y2="51"/><line x1="295" y1="57" x2="318" y2="57"/><line x1="295" y1="63" x2="312" y2="63"/>
        <line x1="295" y1="69" x2="317" y2="69"/><line x1="295" y1="75" x2="310" y2="75"/>
      </g>
      <g fill="#3aae8a"><circle cx="320" cy="51" r="1.4"/><circle cx="321" cy="63" r="1.4"/><circle cx="320" cy="75" r="1.4"/></g>
      <circle cx="307" cy="27" r="1.6" fill="#c9a65a"/>
    </g>

    <!-- Clock with pendulum -->
    <g>
      <rect x="342" y="86" width="20" height="34" rx="3" fill="#5a3520"/>
      <rect x="345" y="89" width="14" height="28" rx="2" fill="#2a1a10"/>
      <g class="sd-pendulum" style="transform-origin: 352px 89px">
        <line x1="352" y1="89" x2="352" y2="108" stroke="#c9a65a" stroke-width="1.2"/>
        <circle cx="352" cy="110" r="3.6" fill="#f7c873"/>
      </g>
      <circle cx="352" cy="72" r="19" fill="#7a4c2d"/>
      <circle cx="352" cy="72" r="16" fill="#fbf3e0"/>
      <g stroke="#2a1a10" stroke-width="1">${ticks}</g>
      ${hand(hour, 8, 2.4)}${hand(minute, 12, 1.5)}
      <circle cx="352" cy="72" r="1.6" fill="#c0392b"/>
    </g>

    <!-- Shelves -->
    <rect x="8" y="86" width="136" height="6" rx="1" fill="url(#${p}wood)"/>
    <rect x="8" y="150" width="136" height="6" rx="1" fill="url(#${p}wood)"/>
    <g fill="#5a3520">
      <polygon points="20,92 30,92 20,104"/><polygon points="132,92 122,92 132,104"/>
      <polygon points="20,156 30,156 20,168"/><polygon points="132,156 122,156 132,168"/>
    </g>
    <rect x="8" y="92" width="136" height="3" fill="#000" opacity="0.25"/>
    <rect x="8" y="156" width="136" height="3" fill="#000" opacity="0.25"/>

    <!-- Teddy -->
    <g>
      <ellipse cx="22" cy="83" rx="5" ry="4" fill="#9a6235"/><ellipse cx="42" cy="83" rx="5" ry="4" fill="#9a6235"/>
      <ellipse cx="32" cy="74" rx="10" ry="11" fill="#a8703f"/>
      <ellipse cx="32" cy="77" rx="5.5" ry="6.5" fill="#d9ad7c"/>
      <ellipse cx="21" cy="71" rx="3.4" ry="6" fill="#9a6235" transform="rotate(30 21 71)"/>
      <ellipse cx="43" cy="71" rx="3.4" ry="6" fill="#9a6235" transform="rotate(-30 43 71)"/>
      <circle cx="24" cy="50" r="4" fill="#a8703f"/><circle cx="40" cy="50" r="4" fill="#a8703f"/>
      <circle cx="24" cy="50" r="2" fill="#d9ad7c"/><circle cx="40" cy="50" r="2" fill="#d9ad7c"/>
      <circle cx="32" cy="57" r="9.5" fill="#b57a45"/>
      <ellipse cx="32" cy="60.5" rx="4.4" ry="3.4" fill="#e8c49a"/>
      <ellipse cx="32" cy="59" rx="1.7" ry="1.2" fill="#2b1a12"/>
      <circle cx="28.4" cy="55" r="1.1" fill="#2b1a12"/><circle cx="35.6" cy="55" r="1.1" fill="#2b1a12"/>
      <path d="M24 66 L32 69.5 L40 66 L40 71 L32 69 L24 71 Z" fill="${on('teddyBow') ? '#3b6fd8' : '#e0475b'}"/>
      <circle cx="32" cy="69" r="2" fill="${on('teddyBow') ? '#2c58b5' : '#b72e45'}"/>
    </g>

    <!-- Blocks -->
    ${block(62, 71, '#e0475b', 'A')}${block(79, 71, '#3b6fd8', 'B')}${on('blocks') ? '' : block(70.5, 56, '#3aae8a', 'C')}

    <!-- Drum -->
    <g>
      <rect x="106" y="66" width="28" height="20" fill="#e0475b"/>
      <path d="M106 68 L113 84 L120 68 L127 84 L134 68" stroke="#f7c873" stroke-width="1.4" fill="none"/>
      <rect x="105" y="64" width="30" height="4" rx="1.5" fill="#fdf6ec"/>
      <rect x="105" y="83" width="30" height="4" rx="1.5" fill="#fdf6ec"/>
      <ellipse cx="120" cy="64" rx="15" ry="3.4" fill="#f4ead7"/>
      ${on('drumsticks') ? '' : `<path d="M112 62 L100 48 M128 62 L140 50" stroke="#c9a874" stroke-width="2" stroke-linecap="round"/>
      <circle cx="100" cy="48" r="2.2" fill="#fdf6ec"/><circle cx="140" cy="50" r="2.2" fill="#fdf6ec"/>`}
    </g>

    <!-- Train -->
    <g>
      <rect x="14" y="124" width="30" height="19" rx="2" fill="#2e8b57"/>
      <rect x="30" y="114" width="14" height="14" rx="1.5" fill="#2e8b57"/>
      <rect x="33" y="117" width="8" height="6" rx="1" fill="#ffd77a"/>
      <rect x="28" y="111" width="18" height="3.4" rx="1.5" fill="#c0392b"/>
      <rect x="17" y="114" width="6" height="10" fill="#2a2a36"/>
      <rect x="15.5" y="111.5" width="9" height="3" rx="1" fill="#2a2a36"/>
      <circle cx="20" cy="105" r="3" fill="#e6ecf6" opacity="0.8" class="sd-smoke"/>
      <rect x="14" y="124" width="30" height="2.4" fill="#fff" opacity="0.25"/>
      <path d="M14 139 L8 143 L14 143 Z" fill="#c0392b"/>
      ${wheel(22, 145, 4.6)}${wheel(37, 145, 4.6)}
      ${traincar(48, '#e0475b', `<rect x="52" y="122" width="9" height="8" fill="#f7c873"/><rect x="62" y="124" width="8" height="6" fill="#3b6fd8"/>`)}
      ${on('train') ? '' : traincar(79, '#3b6fd8', `<circle cx="86" cy="127" r="4" fill="#e0475b"/><circle cx="96" cy="127" r="4" fill="#3aae8a"/>`)}
    </g>

    <!-- Ball -->
    <g>
      <circle cx="128" cy="139" r="10.5" fill="#fdf6ec"/>
      <path d="M118 135 Q128 129 138 135 L138.5 139 Q128 133 117.5 139 Z" fill="#e0475b"/>
      <path d="M118 143 Q128 149 138 143 L137 146 Q128 151 119 146 Z" fill="#3b6fd8"/>
      <circle cx="128" cy="139" r="10.5" fill="url(#${p}shine)"/>
    </g>

    <!-- Floor -->
    <rect y="224" width="400" height="76" fill="url(#${p}floor)"/>
    <rect y="224" width="400" height="2" fill="#000" opacity="0.35"/>
    <g stroke="#000" stroke-opacity="0.3" stroke-width="0.8">${floor}</g>
    <g fill="#e6c38f" opacity="0.45"><circle cx="180" cy="262" r="1"/><circle cx="186" cy="266" r="0.8"/><circle cx="222" cy="270" r="1"/><circle cx="160" cy="276" r="0.8"/></g>

    <!-- Elf behind the workbench -->
    <g>
      <path d="M182 200 L186 160 Q200 152 214 160 L218 200 Z" fill="#2e8b57"/>
      <path d="M186 168 L214 168 L213 174 L187 174 Z" fill="#2a1a10"/>
      <rect x="197" y="168" width="6" height="6" fill="#f7c873"/>
      <path d="M187 159 L193 166 L200 159 L207 166 L213 159 Q200 154 187 159 Z" fill="#c0392b"/>
      <circle cx="193" cy="166" r="1.4" fill="#f7c873"/><circle cx="207" cy="166" r="1.4" fill="#f7c873"/>
      <path d="M188 162 Q178 176 184 192" stroke="#2e8b57" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="185" cy="193" r="3.4" fill="#f2c9a0"/>
      <path d="M186 146 L176 138 L188 142 Z" fill="#f2c9a0"/><path d="M214 146 L224 138 L212 142 Z" fill="#f2c9a0"/>
      <circle cx="200" cy="145" r="12" fill="#f2c9a0"/>
      <circle cx="195.5" cy="144" r="1.4" fill="#2b1a12"/><circle cx="204.5" cy="144" r="1.4" fill="#2b1a12"/>
      <circle cx="192.5" cy="148.5" r="2" fill="#f28c8c" opacity="0.7"/><circle cx="207.5" cy="148.5" r="2" fill="#f28c8c" opacity="0.7"/>
      <path d="M196 150 Q200 153.5 204 150" stroke="#8a3a2a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <ellipse cx="200" cy="147.5" rx="1.6" ry="1.2" fill="#e8a080"/>
      <path d="M187 138 Q200 132 213 138 L208 118 Q214 108 226 112 Q215 104 205 112 Q196 118 187 138 Z" fill="${on('elfHat') ? '#d6283f' : '#1f7a4c'}"/>
      <rect x="186" y="134.5" width="28" height="5.4" rx="2.7" fill="#fbf6ee"/>
      <circle cx="226" cy="112" r="3.4" fill="#f7c873"/>
      <g class="sd-hammer" style="transform-origin: 212px 162px">
        <path d="M212 162 Q222 160 224 170" stroke="#2e8b57" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="224" cy="172" r="3.4" fill="#f2c9a0"/>
        <line x1="224" y1="172" x2="224" y2="186" stroke="#8a5a36" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="218" y="183" width="12" height="7" rx="1.5" fill="#6a6a78"/>
      </g>
    </g>

    <!-- Workbench -->
    <rect x="118" y="196" width="164" height="10" rx="2" fill="url(#${p}wood)"/>
    <rect x="118" y="196" width="164" height="2" rx="1" fill="#d9a774"/>
    <rect x="124" y="206" width="152" height="8" fill="#6e4426"/>
    <rect x="128" y="214" width="9" height="66" fill="#6e4426"/><rect x="263" y="214" width="9" height="66" fill="#6e4426"/>
    <rect x="137" y="250" width="126" height="5" fill="#5a3520"/>
    <ellipse cx="200" cy="282" rx="80" ry="5" fill="#000" opacity="0.3"/>
    <!-- Toy car being built -->
    <g>
      <path d="M140 194 L140 186 Q142 180 150 180 L158 180 Q164 180 166 186 L170 186 Q172 187 172 194 Z" fill="${on('car') ? '#3b6fd8' : '#e0475b'}"/>
      <rect x="147" y="182" width="5" height="4" rx="1" fill="#cfe6ff"/><rect x="154" y="182" width="5" height="4" rx="1" fill="#cfe6ff"/>
      ${wheel(147, 194, 3.4)}${wheel(165, 194, 3.4)}
    </g>
    <!-- Paint pots -->
    <g>
      <rect x="236" y="186" width="11" height="10" rx="1.5" fill="#d8dee8"/><ellipse cx="241.5" cy="186" rx="5.5" ry="1.8" fill="#3b6fd8"/>
      <rect x="250" y="188" width="10" height="8" rx="1.5" fill="#d8dee8"/><ellipse cx="255" cy="188" rx="5" ry="1.6" fill="#f7c873"/>
      <rect x="263" y="186" width="11" height="10" rx="1.5" fill="#d8dee8"/><ellipse cx="268.5" cy="186" rx="5.5" ry="1.8" fill="#3aae8a"/>
      <line x1="244" y1="186" x2="250" y2="174" stroke="#c9a874" stroke-width="1.6" stroke-linecap="round"/>
    </g>

    <!-- Sack of presents -->
    <g>
      ${on('sackPresent') ? '' : `<g transform="rotate(14 320 214)">${present(312, 206, 18, 16, '#3b6fd8', '#f7c873')}</g>`}
      <g transform="rotate(-12 300 216)">${present(292, 206, 18, 16, '#e0475b', '#fdf6ec')}</g>
      <path d="M306 222 L306 196 Q306 190 311 190 Q316 190 316 196" stroke="#fdf6ec" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M306 222 L306 196 Q306 190 311 190" stroke="#e0475b" stroke-width="3.4" fill="none" stroke-dasharray="3 3"/>
      <path d="M288 226 Q282 254 290 280 Q312 290 336 280 Q344 254 336 226 Q312 232 288 226 Z" fill="url(#${p}sack)"/>
      <path d="M286 226 Q312 236 338 226 Q336 220 312 222 Q290 220 286 226 Z" fill="#8a6a3e"/>
      <path d="M296 240 Q300 262 298 278 M322 238 Q326 260 324 280" stroke="#000" stroke-opacity="0.15" stroke-width="1.2" fill="none"/>
      <path d="M302 250 l3 -6 3 6 -6 -3.6 h6 z" fill="#c0392b" opacity="0.8"/>
    </g>

    <!-- Rocking horse -->
    <g transform="translate(368 254)">
      <g ${on('horse') ? 'transform="scale(-1 1)"' : ''}>
        <path d="M-28 26 Q0 40 28 26" stroke="#8a2433" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M-16 6 L-20 28 M-8 6 L-10 31 M10 6 L12 31 M17 4 L22 28" stroke="#f4ead7" stroke-width="3.4" stroke-linecap="round"/>
        <ellipse cx="0" cy="2" rx="21" ry="9" fill="#f4ead7"/>
        <path d="M14 -2 Q18 -18 26 -22 Q32 -22 32 -16 Q30 -12 24 -12 Q22 -4 20 2 Z" fill="#f4ead7"/>
        <path d="M17 -6 Q16 -18 24 -24 Q20 -16 22 -8 Z M24 -24 Q22 -18 26 -14" fill="#c0392b"/>
        <path d="M-21 0 Q-30 0 -30 12 Q-26 6 -20 6" fill="#c0392b"/>
        <circle cx="26" cy="-17" r="1.3" fill="#2a1a10"/>
        <path d="M24 -24 L23 -29 L27 -25" fill="#f4ead7"/>
        <rect x="-8" y="-7" width="14" height="9" rx="3" fill="#3b6fd8"/>
        <rect x="-8" y="-7" width="14" height="2" rx="1" fill="#f7c873"/>
        <path d="M26 -14 L14 -4" stroke="#f7c873" stroke-width="1"/>
      </g>
    </g>

    <!-- Second elf with a candy cane -->
    <g>
      <ellipse cx="58" cy="284" rx="20" ry="4" fill="#000" opacity="0.3"/>
      <path d="M50 262 L49 280 M64 262 L65 280" stroke="#fdf6ec" stroke-width="5"/>
      <path d="M50 266 L49 270 M64 266 L65 270 M50 274 L49 277 M64 274 L65 277" stroke="#e0475b" stroke-width="5"/>
      <path d="M42 282 Q42 278 50 278 Q53 280 52 283 Q46 285 40 280" fill="#1f7a4c"/>
      <path d="M72 282 Q72 278 64 278 Q61 280 62 283 Q68 285 74 280" fill="#1f7a4c"/>
      <path d="M44 264 L47 232 Q57 226 67 232 L70 264 Z" fill="#c0392b"/>
      <path d="M44 264 L48 258 L52 264 L56 258 L60 264 L64 258 L70 264 Z" fill="#c0392b"/>
      <rect x="45" y="246" width="24" height="5" fill="#2a1a10"/><rect x="54" y="246" width="6" height="5" fill="#f7c873"/>
      <path d="M48 234 Q38 242 40 252" stroke="#c0392b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="40" cy="253" r="2.8" fill="#f2c9a0"/>
      <path d="M40 256 L40 236 Q40 230 34 230 Q29 230 29 235" stroke="#fdf6ec" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M40 256 L40 236 Q40 230 34 230 Q29 230 29 235" stroke="#e0475b" stroke-width="3" fill="none" stroke-dasharray="2.5 2.5"/>
      <path d="M66 234 Q74 244 72 252" stroke="#c0392b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="72" cy="253" r="2.8" fill="#f2c9a0"/>
      <path d="M46 220 L37 213 L48 216 Z" fill="#f2c9a0"/><path d="M68 220 L77 213 L66 216 Z" fill="#f2c9a0"/>
      <circle cx="57" cy="220" r="10.5" fill="#f2c9a0"/>
      <circle cx="53" cy="219.5" r="1.3" fill="#2b1a12"/><circle cx="61" cy="219.5" r="1.3" fill="#2b1a12"/>
      <circle cx="50.5" cy="223.5" r="1.8" fill="#f28c8c" opacity="0.7"/><circle cx="63.5" cy="223.5" r="1.8" fill="#f28c8c" opacity="0.7"/>
      <path d="M54 225 Q57 228 60 225" stroke="#8a3a2a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M45 214 Q57 208 69 214 Q66 200 58 194 Q50 190 42 196 Q50 198 52 202 Z" fill="#e0475b"/>
      <rect x="44" y="211" width="26" height="5" rx="2.5" fill="#fbf6ee"/>
      <circle cx="42" cy="196" r="3" fill="#fbf6ee"/>
    </g>
    `
  );
}

const SCENES: SceneDef[] = [
  {
    id: 'livingRoom',
    render: livingRoom,
    diffs: [
      { id: 'star', x: 48, y: 58, r: 15 },
      { id: 'cat', x: 50, y: 130, r: 18 },
      { id: 'teddyHat', x: 72, y: 225, r: 16 },
      { id: 'mouse', x: 114, y: 216, r: 15 },
      { id: 'ornament', x: 200, y: 152, r: 14 },
      { id: 'present', x: 203, y: 236, r: 18 },
      { id: 'candles', x: 262, y: 98, r: 20 },
      { id: 'frame', x: 308, y: 62, r: 28 },
      { id: 'stocking', x: 300, y: 138, r: 17 },
      { id: 'tomte', x: 352, y: 94, r: 14, subtle: true },
      { id: 'ribbon', x: 145, y: 232, r: 16, subtle: true },
    ],
  },
  {
    id: 'village',
    render: village,
    diffs: [
      { id: 'shooting', x: 116, y: 40, r: 22 },
      { id: 'smoke', x: 91, y: 78, r: 18 },
      { id: 'wreath', x: 64, y: 182, r: 15 },
      { id: 'snowmanHat', x: 40, y: 210, r: 16 },
      { id: 'bird', x: 194, y: 242, r: 15 },
      { id: 'window', x: 222, y: 141, r: 15 },
      { id: 'lamp', x: 262, y: 134, r: 17 },
      { id: 'moon', x: 330, y: 48, r: 23 },
      { id: 'door', x: 332, y: 187, r: 16 },
      { id: 'kidHat', x: 304, y: 247, r: 15 },
      { id: 'spruceStar', x: 105, y: 196, r: 12, subtle: true },
      { id: 'attic', x: 196, y: 106, r: 12, subtle: true },
    ],
  },
  {
    id: 'workshop',
    render: workshop,
    diffs: [
      { id: 'teddyBow', x: 32, y: 66, r: 15 },
      { id: 'blocks', x: 78, y: 63, r: 15 },
      { id: 'train', x: 92, y: 137, r: 17 },
      { id: 'star', x: 185, y: 52, r: 14 },
      { id: 'elfHat', x: 208, y: 124, r: 18 },
      { id: 'lantern', x: 270, y: 46, r: 17 },
      { id: 'clock', x: 352, y: 72, r: 20 },
      { id: 'sackPresent', x: 322, y: 213, r: 15 },
      { id: 'horse', x: 368, y: 252, r: 26 },
      { id: 'car', x: 156, y: 187, r: 14, subtle: true },
      { id: 'drumsticks', x: 120, y: 54, r: 16, subtle: true },
    ],
  },
];
