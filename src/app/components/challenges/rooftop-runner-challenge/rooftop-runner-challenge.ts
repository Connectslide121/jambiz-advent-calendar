import { Component, HostListener, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
interface Roof {
  x: number;
  y: number;
  width: number;
  chimney: number;
  height: number;
}
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
  readonly stars = Array.from({ length: 26 }, (_, i) => ({
    x: (i * 137) % 800,
    y: 18 + ((i * 73) % 170),
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
    this.roofs = Array.from({ length: 12 }, (_, i) => ({
      x: i * 410,
      y: 280 - (i % 3) * 12,
      width: 340,
      chimney: i * 410 + 170,
      height: 36 + (i % 3) * 7,
    }));
    this.gifts = this.roofs.flatMap((r) => [
      { x: r.x + 115, y: r.y - 95, taken: false },
      { x: r.x + 290, y: r.y - 35, taken: false },
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
