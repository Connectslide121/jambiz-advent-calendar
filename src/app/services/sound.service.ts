import { Injectable, signal } from '@angular/core';

/**
 * Tiny Web Audio synth for cozy UI sounds (bells, chimes, sparkles).
 * Everything is generated on the fly, so there are no audio files to load.
 * Sound is on by default; an explicit mute choice is remembered per browser.
 */
@Injectable({
  providedIn: 'root',
})
export class SoundService {
  private readonly STORAGE_KEY = 'jambiz-advent-sound';
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  readonly enabled = signal(true);

  constructor() {
    try {
      this.enabled.set(localStorage.getItem(this.STORAGE_KEY) !== 'off');
    } catch {
      this.enabled.set(true);
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

  /** Short wooden hit; combo streaks can raise its pitch. */
  bonk(pitch = 260): void {
    this.sweep([pitch, pitch * 0.42], 0.12, 'triangle', 0.3);
  }

  /** Dry, gritty impact for coal. */
  crunch(): void {
    this.noise(0.14, 850, 200, 0.2);
  }

  /** A short nasal bleat for the Christmas goat. */
  bleat(): void {
    this.sweep([210, 155, 195, 125], 0.28, 'sawtooth', 0.055);
  }

  /** Air rushing past a thrown, falling or sliding object. */
  whoosh(): void {
    this.noise(0.2, 1800, 350, 0.09);
  }

  /** Quiet feedback for pencil marks and erasing. */
  tap(): void {
    this.sweep([700, 400], 0.045, 'sine', 0.08);
  }

  private sweep(pitches: number[], duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.context();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(pitches[0], now);
    pitches.slice(1).forEach((pitch, i) => {
      osc.frequency.exponentialRampToValueAtTime(pitch, now + duration * (i + 1) / (pitches.length - 1));
    });
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noise(duration: number, startFrequency: number, endFrequency: number, volume: number): void {
    const ctx = this.context();
    if (!ctx || !this.master) return;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(startFrequency, now);
    filter.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + duration);
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
