import { Component, HostListener, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
interface Roof {
  x: number;
  y: number;
  width: number;
  /** Chimney x; the first roof has none so the run starts calmly */
  chimney: number;
  height: number;
  /** Which wall colour and window pattern the house uses */
  look: number;
}
/** Hand-tuned course: roof widths, the gap after each roof and the chimney position on it */
const WIDTHS = [380, 320, 300, 340, 280, 360, 300, 330, 290, 340, 310, 400];
const GAPS = [70, 80, 75, 90, 80, 95, 85, 90, 100, 90, 100];
const RISE = [0, 12, 24, 12, 0, 24, 12, 0, 24, 12, 0, 12];
const CHIMNEY_AT = [0, 0.5, 0.42, 0.6, 0.45, 0.55, 0.4, 0.62, 0.5, 0.45, 0.58, 0.5];
const NO_CHIMNEY = -10000;
interface Gift {
  x: number;
  y: number;
  taken: boolean;
}
@Component({
  selector: 'app-rooftop-runner-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './rooftop-runner-challenge.html',
  styleUrls: ['../shared/game-board.scss', './rooftop-runner-challenge.scss'],
})
export class RooftopRunnerChallenge extends SeasonalGame implements OnInit {
  roofs: Roof[] = [];
  gifts: Gift[] = [];
  x = 40;
  y = 240;
  vy = 0;
  camera = 0;
  grounded = true;
  lives = 3;
  collected = 0;
  elapsed = 0;
  invulnerable = 0;
  checkpoint = 0;
  goal = 12;
  readonly stars = Array.from({ length: 34 }, (_, i) => ({
    x: (i * 263 + i * i * 37) % 800,
    y: 12 + ((i * i * 53 + i * 97) % 160),
    r: i % 5 === 0 ? 1.8 : 1.1,
  }));
  /** Far-away town silhouette, scrolled slower than the roofs */
  readonly skyline = Array.from({ length: 22 }, (_, i) => ({
    x: i * 70,
    w: 46 + ((i * 29) % 30),
    h: 50 + ((i * 47) % 70),
    roof: i % 3 === 0,
  }));
  private jumpBuffer = 0;
  private coyote = 0;
  get viewWidth(): number {
    return this.host.nativeElement.clientWidth < 600 ? 480 : 800;
  }
  get viewBox(): string {
    return '0 0 ' + this.viewWidth + ' 360';
  }
  get distance(): number {
    return Math.min(100, Math.floor((this.x / this.finishX) * 100));
  }
  get finishX(): number {
    const last = this.roofs.at(-1);
    return last ? last.x + last.width - 35 : 1;
  }
  get visibleRoofs(): Roof[] {
    return this.roofs.filter(
      (r) => r.x + r.width > this.camera - 40 && r.x < this.camera + this.viewWidth + 40
    );
  }
  /** Running pose: legs swing while grounded */
  get stride(): number {
    return this.grounded && this.phase === 'playing' ? Math.sin(this.elapsed * 22) * 5 : 0;
  }
  get finishLocal(): number {
    return this.finishX - this.camera;
  }
  get visibleGifts(): Gift[] {
    return this.gifts.filter(
      (g) => !g.taken && g.x > this.camera - 30 && g.x < this.camera + this.viewWidth + 30
    );
  }
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase('ready');
    let x = 0;
    this.roofs = WIDTHS.map((width, i) => {
      const roof = {
        x,
        y: 280 - RISE[i],
        width,
        chimney: i === 0 ? NO_CHIMNEY : x + Math.round(width * CHIMNEY_AT[i]),
        height: 36 + (i % 3) * 7,
        look: i % 4,
      };
      x += width + (GAPS[i] ?? 0);
      return roof;
    });
    // A high present floats over each chimney (grab it while jumping), a low one waits near the edge
    this.gifts = this.roofs.flatMap((r) => [
      r.chimney === NO_CHIMNEY
        ? { x: r.x + 190, y: r.y - 95, taken: false }
        : { x: r.chimney + 14, y: r.y - r.height - 58, taken: false },
      { x: r.x + r.width - 60, y: r.y - 30, taken: false },
    ]);
    this.x = 40;
    this.y = 240;
    this.vy = 0;
    this.camera = 0;
    this.grounded = true;
    this.lives = 3;
    this.collected = 0;
    this.elapsed = 0;
    this.checkpoint = 0;
    this.invulnerable = 0;
    this.jumpBuffer = 0;
    this.coyote = 0;
  }
  start(): void {
    if (this.phase !== 'ready') return;
    this.phase = 'playing';
    this.sound.doorOpen();
    this.focusBoard();
    this.startLoop((dt) => this.step(dt));
  }
  jump(): void {
    if (this.phase === 'ready') {
      this.start();
      return;
    }
    if (this.phase === 'playing') this.jumpBuffer = 0.14;
  }
  step(dt: number): void {
    const n = Math.ceil(dt * 120);
    for (let i = 0; i < n && this.phase === 'playing'; i++) this.physics(dt / n);
  }
  private physics(dt: number): void {
    this.elapsed += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = this.grounded ? 0.09 : Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = -445;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.sound.whoosh();
    }
    const previousBottom = this.y + 40;
    this.x += (175 + Math.min(30, this.x / 170)) * dt;
    this.vy += 1050 * dt;
    this.y += this.vy * dt;
    this.grounded = false;
    for (let i = 0; i < this.roofs.length; i++) {
      const roof = this.roofs[i];
      if (
        this.x + 24 > roof.x &&
        this.x < roof.x + roof.width &&
        this.vy >= 0 &&
        previousBottom <= roof.y + 2 &&
        this.y + 40 >= roof.y
      ) {
        this.y = roof.y - 40;
        this.vy = 0;
        this.grounded = true;
        this.checkpoint = i;
      }
    }
    for (const roof of this.roofs) {
      if (
        this.invulnerable <= 0 &&
        this.x + 24 > roof.chimney &&
        this.x < roof.chimney + 28 &&
        this.y + 40 > roof.y - roof.height &&
        this.y < roof.y
      ) {
        this.hurt();
        return;
      }
    }
    for (const gift of this.gifts) {
      if (!gift.taken && Math.hypot(this.x + 12 - gift.x, this.y + 20 - gift.y) < 28) {
        gift.taken = true;
        this.collected++;
        this.sound.bell(700 + (this.collected % 5) * 90, 0.09);
      }
    }
    if (this.y > 390) {
      this.hurt();
      return;
    }
    this.camera = Math.max(0, this.x - 100);
    if (this.x >= this.finishX) {
      if (this.collected >= this.goal)
        this.finish(this.collected * 100 + this.lives * 300, {
          gifts: this.collected,
          lives: this.lives,
        });
      else this.lose('challenges.rooftopRunner.needGifts');
    }
  }
  private hurt(): void {
    this.lives--;
    this.sound.thud();
    if (this.lives <= 0) {
      this.lose('challenges.rooftopRunner.lost');
      return;
    }
    const roof = this.roofs[this.checkpoint];
    this.x = roof.x + 35;
    this.y = roof.y - 40;
    this.vy = 0;
    this.grounded = true;
    this.camera = Math.max(0, this.x - 100);
    this.invulnerable = 1.1;
    this.jumpBuffer = 0;
  }
  @HostListener('document:keydown', ['$event']) onKey(e: KeyboardEvent): void {
    if (
      this.gameKey(e) &&
      [' ', 'ArrowUp', 'w', 'W'].includes(e.key) &&
      !(e.target as HTMLElement)?.closest('button')
    ) {
      e.preventDefault();
      if (!e.repeat) this.jump();
    }
  }
}
