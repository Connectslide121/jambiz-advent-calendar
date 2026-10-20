import { Component, HostListener, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameFrame } from '../shared/game-frame';
import { SeasonalGame } from '../shared/seasonal-game';
interface Beat {
  at: number;
  lane: number;
  frequency: number;
  duration: number;
  judged: boolean;
  played: boolean;
  hit: boolean;
}
const TUNE: [number, number][] = [
  [392, 1],
  [523.25, 1],
  [523.25, 0.5],
  [587.33, 0.5],
  [523.25, 0.5],
  [493.88, 0.5],
  [440, 1],
  [440, 1],
  [440, 1],
  [587.33, 1],
  [587.33, 0.5],
  [659.25, 0.5],
  [587.33, 0.5],
  [523.25, 0.5],
  [493.88, 1],
  [392, 1],
  [392, 1],
  [659.25, 1],
  [659.25, 0.5],
  [698.46, 0.5],
  [659.25, 0.5],
  [587.33, 0.5],
  [523.25, 1],
  [440, 1],
  [392, 0.5],
  [392, 0.5],
  [440, 1],
  [587.33, 1],
  [493.88, 1],
  [523.25, 3],
];
@Component({
  selector: 'app-carol-conductor-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './carol-conductor-challenge.html',
  styleUrls: ['../shared/game-board.scss', './carol-conductor-challenge.scss'],
})
export class CarolConductorChallenge extends SeasonalGame implements OnInit {
  readonly lanes = [0, 1, 2, 3];
  readonly keys = ['D', 'F', 'J', 'K'];
  notes: Beat[] = [];
  time = 0;
  songEnd = 0;
  hits = 0;
  combo = 0;
  bestCombo = 0;
  errors = 0;
  activeLane = -1;
  private lightUntil = 0;
  private judgmentUntil = 0;
  get visibleNotes(): Beat[] {
    return this.notes.filter(
      (n) => !n.judged && n.at - this.time <= 1.8 && n.at - this.time >= -0.18
    );
  }
  get accuracy(): number {
    return this.notes.length ? Math.round((this.hits / this.notes.length) * 100) : 0;
  }
  ngOnInit(): void {
    this.restart();
  }
  restart(): void {
    this.resetBase('ready');
    this.time = 0;
    this.hits = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.errors = 0;
    this.activeLane = -1;
    this.lightUntil = 0;
    this.judgmentUntil = 0;
    let at = 2;
    const pitch = [392, 440, 493.88, 523.25, 587.33, 659.25, 698.46];
    this.notes = [...TUNE, ...TUNE].map(([frequency, beats]) => {
      const note = {
        at,
        lane: pitch.indexOf(frequency) % 4,
        frequency,
        duration: beats * 0.48,
        judged: false,
        played: false,
        hit: false,
      };
      at += note.duration;
      return note;
    });
    this.songEnd = at + 0.6;
  }
  start(): void {
    if (this.phase !== 'ready') return;
    this.phase = 'playing';
    this.focusBoard();
    this.sound.note(392, 0.025);
    this.startLoop((dt) => this.step(dt));
  }
  noteY(note: Beat): number {
    return 300 - ((note.at - this.time) / 1.8) * 300;
  }
  step(dt: number): void {
    if (this.phase !== 'playing') return;
    this.time += dt;
    for (const note of this.notes) {
      if (!note.played && this.time >= note.at) {
        note.played = true;
        this.sound.note(note.frequency, 0.12);
      }
      if (!note.judged && this.time > note.at + 0.18) {
        note.judged = true;
        this.combo = 0;
        this.errors++;
        this.message('challenges.carolConductor.miss');
        this.judgmentUntil = this.time + 0.6;
      }
    }
    if (this.time > this.lightUntil) this.activeLane = -1;
    if (this.time > this.judgmentUntil) this.status = '';
    if (this.time >= this.songEnd) {
      const required = Math.ceil(this.notes.length * 0.75);
      if (this.hits >= required && this.errors <= 20)
        this.finish(this.score, {
          hits: this.hits,
          notes: this.notes.length,
          bestCombo: this.bestCombo,
        });
      else this.lose('challenges.carolConductor.lost');
    }
  }
  hit(lane: number): void {
    if (this.phase !== 'playing') return;
    this.activeLane = lane;
    this.lightUntil = this.time + 0.12;
    const note = this.notes
      .filter((n) => n.lane === lane && !n.judged && Math.abs(n.at - this.time) <= 0.18)
      .sort((a, b) => Math.abs(a.at - this.time) - Math.abs(b.at - this.time))[0];
    if (!note) {
      this.combo = 0;
      this.errors++;
      this.sound.thud();
      this.message('challenges.carolConductor.miss');
    } else {
      const delta = Math.abs(note.at - this.time);
      note.judged = true;
      note.hit = true;
      this.hits++;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.score +=
        (delta <= 0.065 ? 1000 : delta <= 0.13 ? 700 : 400) + Math.min(200, this.combo * 10);
      this.sound.tap();
      this.message(
        delta <= 0.065 ? 'challenges.carolConductor.perfect' : 'challenges.carolConductor.good'
      );
    }
    this.judgmentUntil = this.time + 0.6;
  }
  @HostListener('document:keydown', ['$event']) onKey(e: KeyboardEvent): void {
    if (!this.gameKey(e) || e.repeat) return;
    const lane = this.keys.indexOf(e.key.toUpperCase());
    if (lane >= 0) {
      e.preventDefault();
      this.hit(lane);
    }
  }
}
