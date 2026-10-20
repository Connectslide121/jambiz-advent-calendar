import { Component, inject } from '@angular/core';
import { SoundService } from '../../services/sound.service';

interface Bulb {
  x: number;
  y: number;
  angle: number;
  color: string;
  delay: number;
  note: number;
}

const SWAG_WIDTH = 300;
const SAG = 46;
const BULBS_PER_SWAG = 6;
const COLORS = ['#ff5a6e', '#f7c873', '#5cf2b3', '#7fb8ff', '#ff9f43', '#d58bff'];
// C major pentatonic, so any tapping order sounds nice
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

/** A gently swaying garland of twinkling bulbs. Tap a bulb to ring it. */
@Component({
  selector: 'app-string-lights',
  templateUrl: './string-lights.html',
  styleUrl: './string-lights.scss',
})
export class StringLights {
  private sound = inject(SoundService);

  readonly swagWidth = SWAG_WIDTH;
  readonly wirePath = `M0 4 Q ${SWAG_WIDTH / 2} ${SAG * 2 - 4} ${SWAG_WIDTH} 4`;
  readonly swags = Array.from({ length: 9 }, (_, i) => i);
  readonly bulbs: Bulb[] = this.buildBulbs();
  popped = new Set<string>();

  ring(swag: number, index: number, bulb: Bulb): void {
    const key = `${swag}-${index}`;
    this.popped.add(key);
    setTimeout(() => this.popped.delete(key), 500);
    this.sound.bell(bulb.note, 0.18);
  }

  private buildBulbs(): Bulb[] {
    const bulbs: Bulb[] = [];
    for (let i = 0; i < BULBS_PER_SWAG; i++) {
      const t = (i + 0.5) / BULBS_PER_SWAG;
      // Point and tangent on the quadratic curve (0,4) -> (W/2, 2*SAG-4) -> (W,4)
      const p0 = { x: 0, y: 4 };
      const p1 = { x: SWAG_WIDTH / 2, y: SAG * 2 - 4 };
      const p2 = { x: SWAG_WIDTH, y: 4 };
      const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
      const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
      const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
      bulbs.push({
        x,
        y,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI,
        color: COLORS[i % COLORS.length],
        delay: (i * 0.53) % 2.4,
        note: NOTES[i % NOTES.length],
      });
    }
    return bulbs;
  }
}
