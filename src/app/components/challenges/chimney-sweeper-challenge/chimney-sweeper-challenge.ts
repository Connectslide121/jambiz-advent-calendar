import { Component, HostListener, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
interface Brick {
  x: number;
  y: number;
  alive: boolean;
  gold: boolean;
}
interface Power {
  x: number;
  y: number;
}
/** A puff of soot where a brick broke */
interface Puff {
  x: number;
  y: number;
  t: number;
  gold: boolean;
}
@Component({
  selector: 'app-chimney-sweeper-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './chimney-sweeper-challenge.html',
  styleUrls: ['../shared/game-board.scss', './chimney-sweeper-challenge.scss'],
})
export class ChimneySweeperChallenge extends SeasonalGame implements OnInit {
  bricks: Brick[] = [];
  powers: Power[] = [];
  puffs: Puff[] = [];
  /** Recent ball positions for a short snowball trail */
  trail: { x: number; y: number }[] = [];
  /** Soot texture spots per brick, fixed so they do not flicker */
  readonly soot = [
    { x: 14, y: 8, r: 5 },
    { x: 40, y: 15, r: 6 },
    { x: 70, y: 9, r: 4 },
    { x: 84, y: 17, r: 5 },
  ];
  /** Background chimney bricks, alternating rows */
  readonly wallRows = Array.from({ length: 19 }, (_, i) => i);
  readonly stars = Array.from({ length: 12 }, (_, i) => ({ x: 260 + ((i * 97) % 290), y: 6 + ((i * 13) % 20) }));
  age(p: Puff): number {
    return Math.min(1, (this.elapsed - p.t) / 0.5);
  }
  paddle = 400;
  ball = { x: 400, y: 379, vx: 140, vy: -280 };
  lives = 3;
  serving = true;
  elapsed = 0;
  wideUntil = 0;
  keys = new Set<string>();
  get paddleWidth(): number {
    return this.elapsed < this.wideUntil ? 180 : 115;
  }
  get left(): number {
    return this.bricks.filter((b) => b.alive).length;
  }
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase('ready');
    this.bricks = Array.from({ length: 28 }, (_, i) => ({
      x: 30 + (i % 7) * 107,
      y: 45 + Math.floor(i / 7) * 36,
      alive: true,
      gold: i % 6 === 0,
    }));
    this.powers = [];
    this.puffs = [];
    this.trail = [];
    this.paddle = 400;
    this.lives = 3;
    this.serving = true;
    this.elapsed = 0;
    this.wideUntil = 0;
    this.keys.clear();
    this.ball = { x: 400, y: 379, vx: 140, vy: -280 };
  }
  start(): void {
    if (this.phase === 'ready') {
      this.phase = 'playing';
      this.startLoop((dt) => this.step(dt));
      this.focusBoard();
    }
    if (this.phase === 'playing' && this.serving) {
      this.serving = false;
      this.sound.whoosh();
    }
  }
  pointer(e: PointerEvent): void {
    if (this.phase !== 'playing' && this.phase !== 'ready') return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    this.paddle = Math.max(
      this.paddleWidth / 2,
      Math.min(800 - this.paddleWidth / 2, ((e.clientX - rect.left) / rect.width) * 800)
    );
    if (this.serving) this.ball.x = this.paddle;
  }
  press(e: PointerEvent): void {
    e.preventDefault();
    this.pointer(e);
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* Synthetic pointers need no capture. */
    }
    this.start();
  }
  step(dt: number): void {
    const n = Math.ceil(dt * 120);
    for (let i = 0; i < n && this.phase === 'playing'; i++) this.physics(dt / n);
  }
  private physics(dt: number): void {
    this.elapsed += dt;
    const direction =
      (this.keys.has('ArrowRight') || this.keys.has('d') ? 1 : 0) -
      (this.keys.has('ArrowLeft') || this.keys.has('a') ? 1 : 0);
    this.paddle = Math.max(
      this.paddleWidth / 2,
      Math.min(800 - this.paddleWidth / 2, this.paddle + direction * 490 * dt)
    );
    for (const power of this.powers) {
      power.y += 120 * dt;
      if (
        Math.abs(power.x - this.paddle) < this.paddleWidth / 2 + 10 &&
        Math.abs(power.y - 400) < 15
      ) {
        this.wideUntil = this.elapsed + 8;
        power.y = 500;
        this.sound.jingle();
      }
    }
    this.powers = this.powers.filter((p) => p.y < 460);
    if (this.serving) {
      this.ball.x = this.paddle;
      this.ball.y = 379;
      return;
    }
    const ball = this.ball,
      previous = { x: ball.x, y: ball.y };
    this.puffs = this.puffs.filter((p) => this.elapsed - p.t < 0.5);
    if (Math.round(this.elapsed * 120) % 3 === 0) this.trail = [{ x: ball.x, y: ball.y }, ...this.trail].slice(0, 5);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x < 10) {
      ball.x = 10;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x > 790) {
      ball.x = 790;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y < 10) {
      ball.y = 10;
      ball.vy = Math.abs(ball.vy);
    }
    if (
      ball.vy > 0 &&
      previous.y <= 387 &&
      ball.y >= 387 &&
      Math.abs(ball.x - this.paddle) < this.paddleWidth / 2 + 7
    ) {
      const hit = (ball.x - this.paddle) / (this.paddleWidth / 2);
      const speed = Math.min(520, Math.max(315, Math.hypot(ball.vx, ball.vy)));
      ball.vx = Math.sin(hit * 1.08) * speed + (Math.abs(hit) < 0.06 ? 25 : 0);
      ball.vy = -Math.cos(hit * 1.08) * speed;
      ball.y = 386;
      this.sound.bonk(360);
    }
    for (const brick of this.bricks) {
      if (
        !brick.alive ||
        ball.x + 7 < brick.x ||
        ball.x - 7 > brick.x + 96 ||
        ball.y + 7 < brick.y ||
        ball.y - 7 > brick.y + 25
      )
        continue;
      brick.alive = false;
      this.score += brick.gold ? 150 : 100;
      if (previous.x + 7 < brick.x || previous.x - 7 > brick.x + 96) ball.vx *= -1;
      else ball.vy *= -1;
      ball.vx *= 1.015;
      ball.vy *= 1.015;
      if (brick.gold) this.powers.push({ x: brick.x + 48, y: brick.y + 20 });
      this.puffs.push({ x: brick.x + 48, y: brick.y + 12, t: this.elapsed, gold: brick.gold });
      this.sound.bell(600 + ((28 - this.left) % 7) * 90, 0.09);
      break;
    }
    if (this.left === 0) {
      this.finish(this.score + this.lives * 400, { lives: this.lives });
      return;
    }
    if (ball.y > 460) {
      this.lives--;
      this.sound.thud();
      if (this.lives <= 0) this.lose('challenges.chimneySweeper.lost');
      else {
        this.serving = true;
        this.trail = [];
        ball.x = this.paddle;
        ball.y = 379;
        ball.vx = 140;
        ball.vy = -280;
      }
    }
  }
  @HostListener('document:keydown', ['$event']) onKey(e: KeyboardEvent): void {
    if (!this.gameKey(e)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (
      ['ArrowLeft', 'ArrowRight', 'a', 'd', ' ', 'Enter'].includes(k) &&
      !(e.target as HTMLElement)?.closest('button')
    ) {
      e.preventDefault();
      this.keys.add(k);
      if (!e.repeat && (k === ' ' || k === 'Enter')) this.start();
    }
  }
  @HostListener('document:keyup', ['$event']) onUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }
  @HostListener('document:visibilitychange') onVisibility(): void {
    if (document.hidden) this.keys.clear();
  }
}
