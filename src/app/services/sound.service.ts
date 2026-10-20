import { Injectable, signal } from '@angular/core';

/**
 * Tiny Web Audio synth for cozy UI sounds (bells, chimes, sparkles).
 * Everything is generated on the fly, so there are no audio files to load.
 * Sound is off by default and the choice is remembered per browser.
 */
@Injectable({
  providedIn: 'root',
})
export class SoundService {
  private readonly STORAGE_KEY = 'jambiz-advent-sound';
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  readonly enabled = signal(false);

  constructor() {
    try {
      this.enabled.set(localStorage.getItem(this.STORAGE_KEY) === 'on');
    } catch {
      this.enabled.set(false);
    }
  }

  toggle(): void {
    this.enabled.set(!this.enabled());
    try {
      localStorage.setItem(this.STORAGE_KEY, this.enabled() ? 'on' : 'off');
    } catch {
      // Storage unavailable (private mode) - keep the in-memory choice
    }
    if (this.enabled()) {
      this.jingle();
    }
  }

  /** A single bell strike: a fundamental plus inharmonic partials that ring out */
  bell(frequency = 880, volume = 0.25, delay = 0, force = false): void {
    const ctx = this.context(force);
    if (!ctx || !this.master) return;
    const start = ctx.currentTime + delay;
    const partials = [
      { ratio: 1, gain: 1, decay: 1.6 },
      { ratio: 2.76, gain: 0.45, decay: 0.9 },
      { ratio: 5.4, gain: 0.25, decay: 0.5 },
      { ratio: 8.93, gain: 0.12, decay: 0.3 },
    ];
    for (const p of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency * p.ratio;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume * p.gain, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + p.decay);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(start + p.decay + 0.05);
    }
  }

  /** Short rising arpeggio, used when a door opens */
  doorOpen(): void {
    [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => this.bell(f, 0.16, i * 0.07));
  }

  /** Sleigh-bell shimmer, used for celebrations */
  jingle(): void {
    for (let i = 0; i < 10; i++) {
      this.bell(1800 + Math.random() * 1600, 0.05, i * 0.045 + Math.random() * 0.02);
    }
    this.bell(1046.5, 0.18, 0.05);
    this.bell(1318.51, 0.14, 0.2);
  }

  /** Soft click for locked doors */
  thud(): void {
    const ctx = this.context();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  /** Victory fanfare: "ding-ding-diiing" */
  fanfare(): void {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => this.bell(f, 0.2, i * 0.12));
    setTimeout(() => this.jingle(), 650);
  }

  /** Plays a note even when UI sounds are muted - games that ARE about sound use this */
  note(frequency: number, volume = 0.3): void {
    this.bell(frequency, volume, 0, true);
  }

  private context(force = false): AudioContext | null {
    if (!this.enabled() && !force) return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }
}
