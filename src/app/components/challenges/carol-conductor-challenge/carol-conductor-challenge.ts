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
/** Seconds per quarter note (125 bpm) */
const BEAT = 0.48;
const C = 523.25,
  D = 587.33,
  E = 659.25,
  F = 698.46,
  G = 783.99;
/** The five notes of the tune, one lane each from low to high */
const PITCHES = [C, D, E, F, G];
/** Jingle Bells chorus: [pitch, beats] in 4/4, starting on a downbeat */
const TUNE: [number, number][] = [
  // Jingle bells, jingle bells, jingle all the way
  [E, 1], [E, 1], [E, 2],
  [E, 1], [E, 1], [E, 2],
  [E, 1], [G, 1], [C, 1.5], [D, 0.5],
  [E, 4],
  // Oh what fun it is to ride in a one-horse open sleigh, hey
  [F, 1], [F, 1], [F, 1.5], [F, 0.5],
  [F, 1], [E, 1], [E, 1], [E, 0.5], [E, 0.5],
  [E, 1], [D, 1], [D, 1], [E, 1],
  [D, 2], [G, 2],
  // Jingle bells, jingle bells, jingle all the way
  [E, 1], [E, 1], [E, 2],
  [E, 1], [E, 1], [E, 2],
  [E, 1], [G, 1], [C, 1.5], [D, 0.5],
  [E, 4],
  // Oh what fun it is to ride in a one-horse open sleigh
  [F, 1], [F, 1], [F, 1], [F, 1],
  [F, 1], [E, 1], [E, 1], [E, 0.5], [E, 0.5],
  [G, 1], [G, 1], [F, 1], [D, 1],
  [C, 4],
];
/** A short-lived judgement shown in a lane */
interface Flash {
  lane: number;
  key: string;
  kind: 'perfect' | 'good' | 'miss';
  id: number;
}
@Component({
  selector: 'app-carol-conductor-challenge',
  imports: [TranslateModule, GameFrame],
  templateUrl: './carol-conductor-challenge.html',
  styleUrls: ['../shared/game-board.scss', './carol-conductor-challenge.scss'],
})
export class CarolConductorChallenge extends SeasonalGame implements OnInit {
  /** One lane per pitch, low to high like a keyboard: C D E F G */
  readonly lanes = [0, 1, 2, 3, 4];
  readonly names = ['C', 'D', 'E', 'F', 'G'];
  /** Space plays the middle E, the note the tune uses most */
  readonly keys = ['D', 'F', ' ', 'J', 'K'];
  readonly keyLabels = ['D', 'F', '␣', 'J', 'K'];
  notes: Beat[] = [];
  /** Metronome clicks: a count-in, then every quarter beat; downbeats of the 3/4 bar are accented */
  ticks: { at: number; accent: boolean; done: boolean }[] = [];
  private clockStart = 0;
  time = 0;
  songEnd = 0;
  hits = 0;
  combo = 0;
  bestCombo = 0;
  errors = 0;
  activeLane = -1;
  flashes: Flash[] = [];
  readonly staff = [0, 1, 2, 3, 4];
  private flashId = 0;
  private lightUntil = 0;
  private judgmentUntil = 0;
  get visibleNotes(): Beat[] {
    return this.notes.filter(
      (n) => !n.judged && n.at - this.time <= 1.8 && n.at - this.time >= -0.18
    );
  }
  get progress(): number {
    return this.songEnd ? Math.min(100, (this.time / this.songEnd) * 100) : 0;
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
    this.flashes = [];
    let at = 2;
    this.notes = TUNE.map(([frequency, beats]) => {
      const note = {
        at,
        lane: PITCHES.indexOf(frequency),
        frequency,
        duration: beats * BEAT,
        judged: false,
        played: false,
        hit: false,
      };
      at += note.duration;
      return note;
    });
    this.songEnd = at + 0.6;
    // A one-bar count-in, then a click every beat with the first beat of each 4/4 bar accented
    this.ticks = [];
    for (let t = 2 - 4 * BEAT; t < at - 0.01; t += BEAT)
      this.ticks.push({ at: t, accent: Math.round((t - 2) / BEAT) % 4 === 0, done: false });
  }
  start(): void {
    if (this.phase !== 'ready') return;
    this.phase = 'playing';
    this.focusBoard();
    this.sound.note(C, 0.025);
    // Follow the real clock, not summed frame times, so dropped frames never bend the tempo
    this.clockStart = performance.now() - this.time * 1000;
    this.startLoop(() => this.step((performance.now() - this.clockStart) / 1000 - this.time));
  }
  noteY(note: Beat): number {
    return 300 - ((note.at - this.time) / 1.8) * 300;
  }
  step(dt: number): void {
    if (this.phase !== 'playing') return;
    this.time += dt;
    for (const tick of this.ticks)
      if (!tick.done && this.time >= tick.at) {
        tick.done = true;
        this.sound.bell(tick.accent ? 1568 : 1175, tick.accent ? 0.05 : 0.025);
      }
    for (const note of this.notes) {
      if (!note.judged && this.time > note.at + 0.18) {
        note.judged = true;
        this.combo = 0;
        this.errors++;
        this.flash(note.lane, 'miss');
      }
    }
    if (this.time > this.lightUntil) this.activeLane = -1;
    if (this.time > this.judgmentUntil) this.flashes = [];
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
      this.flash(lane, 'miss');
    } else {
      const delta = Math.abs(note.at - this.time);
      note.judged = true;
      note.hit = true;
      this.hits++;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.score +=
        (delta <= 0.065 ? 1000 : delta <= 0.13 ? 700 : 400) + Math.min(200, this.combo * 10);
      // You play the melody: the note sounds when you hit it
      this.sound.note(note.frequency, 0.2);
      this.flash(lane, delta <= 0.065 ? 'perfect' : 'good');
    }
  }
  private flash(lane: number, kind: Flash['kind']): void {
    this.flashes = [
      ...this.flashes.filter((f) => f.lane !== lane),
      { lane, kind, key: 'challenges.carolConductor.' + kind, id: ++this.flashId },
    ];
    this.judgmentUntil = this.time + 0.6;
  }
  @HostListener('document:keydown', ['$event']) onKey(e: KeyboardEvent): void {
    if (!this.gameKey(e) || e.repeat) return;
    // A focused pad handles its own Space press
    if (e.key === ' ' && (e.target as HTMLElement)?.closest('button')) return;
    const lane = this.keys.indexOf(e.key.toUpperCase());
    if (lane >= 0) {
      e.preventDefault();
      this.hit(lane);
    }
  }
}
