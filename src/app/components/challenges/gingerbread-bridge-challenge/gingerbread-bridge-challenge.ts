import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
import {
  analyzeBridge,
  Beam,
  BRIDGE_BLUEPRINT,
  BRIDGE_JOINTS,
  BRIDGE_ROAD,
  Joint,
} from './bridge-physics';
@Component({
  selector: 'app-gingerbread-bridge-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './gingerbread-bridge-challenge.html',
  styleUrls: ['../shared/game-board.scss', './gingerbread-bridge-challenge.scss'],
})
export class GingerbreadBridgeChallenge extends SeasonalGame implements OnInit {
  readonly budget = 18;
  beams: Beam[] = [];
  points: Joint[] = [];
  selected = -1;
  testing = false;
  elapsed = 0;
  loadX = 70;
  deflection = 0;
  hints = 0;
  hintEdge: Beam | null = null;
  private failedFor = 0;
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase();
    this.beams = BRIDGE_ROAD.map((b) => [...b] as Beam);
    this.hints = 0;
    this.edit();
  }
  edit(): void {
    if (this.won) return;
    this.resetBase();
    this.points = BRIDGE_JOINTS.map((p) => ({ ...p }));
    this.selected = -1;
    this.testing = false;
    this.elapsed = 0;
    this.loadX = 70;
    this.deflection = 0;
    this.failedFor = 0;
    this.hintEdge = null;
  }
  connect(id: number): void {
    if (this.testing || this.won) return;
    if (this.phase === 'lost') this.edit();
    if (this.selected < 0) {
      this.selected = id;
      this.sound.tap();
      return;
    }
    const a = this.selected;
    this.selected = -1;
    if (a === id) return;
    const old = this.beams.findIndex(([x, y]) => (x === a && y === id) || (x === id && y === a));
    if (old >= 0) {
      this.beams.splice(old, 1);
      this.sound.tap();
      return;
    }
    if (
      this.beams.length >= this.budget ||
      Math.hypot(this.points[a].x - this.points[id].x, this.points[a].y - this.points[id].y) > 160
    ) {
      this.message('challenges.gingerbreadBridge.tooFar');
      this.sound.thud();
      return;
    }
    this.beams.push([a, id]);
    this.hintEdge = null;
    this.status = '';
    this.sound.bonk(380);
  }
  undo(): void {
    if (!this.testing && !this.won) {
      this.beams.pop();
      this.sound.tap();
    }
  }
  hint(): void {
    if (this.testing || this.won) return;
    this.hintEdge =
      BRIDGE_BLUEPRINT.find(
        ([a, b]) => !this.beams.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
      ) ?? null;
    this.hints++;
    this.message('challenges.gingerbreadBridge.hint');
  }
  test(): void {
    if (this.testing || this.won) return;
    this.phase = 'playing';
    this.status = '';
    this.points = BRIDGE_JOINTS.map((p) => ({ ...p }));
    this.elapsed = 0;
    this.loadX = 70;
    this.failedFor = 0;
    this.testing = true;
    this.selected = -1;
    this.sound.whoosh();
    this.startLoop((dt) => this.step(dt));
  }
  get reindeerY(): number {
    const i = Math.max(0, Math.min(4, Math.floor((this.loadX - 70) / 100))),
      t = (this.loadX - (70 + i * 100)) / 100;
    return this.points[i].y * (1 - t) + this.points[i + 1].y * t - 13;
  }
  step(dt: number): void {
    if (!this.testing || this.phase !== 'playing') return;
    this.elapsed += dt;
    this.loadX = Math.min(570, 70 + this.elapsed * 50);
    const result = analyzeBridge(this.beams, this.loadX);
    this.deflection = Number.isFinite(result.deflection) ? Math.round(result.deflection) : 99;
    if (!result.stable || result.deflection > 30 || result.strain > 0.08) {
      this.failedFor += dt;
      for (let i = 1; i < 5; i++)
        this.points[i].y = 300 + Math.min(100, this.failedFor * this.failedFor * 150);
      if (this.failedFor > 0.7) {
        this.testing = false;
        this.lose('challenges.gingerbreadBridge.failed');
      }
      return;
    }
    this.failedFor = 0;
    this.points = result.positions;
    if (this.loadX >= 570) {
      this.testing = false;
      this.finish(3000 - (this.beams.length - 5) * 60 - this.hints * 80, {
        beams: this.beams.length,
        hints: this.hints,
      });
    }
  }
}
