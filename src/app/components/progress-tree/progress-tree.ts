import { Component, Input } from '@angular/core';

interface Ornament {
  day: number;
  x: number;
  y: number;
  r: number;
  color: string;
}

/** Candlelight whites: lit stars differ only in warmth */
const COLORS = ['#ffe7bd', '#fff4df', '#ffd99a'];
/** Ornaments per row, from the bottom of the tree to the top (sums to 24) */
const ROWS = [6, 5, 5, 4, 3, 1];
const ROW_Y = [238, 204, 170, 138, 108, 80];

/**
 * A constellation in the shape of a Christmas tree: one star per completed day,
 * lit from the bottom branches up to the star on top.
 */
@Component({
  selector: 'app-progress-tree',
  templateUrl: './progress-tree.html',
  styleUrl: './progress-tree.scss',
})
export class ProgressTree {
  @Input() set completedDays(days: number[]) {
    this.completed = new Set(days);
  }
  @Input() total = 24;

  completed = new Set<number>();
  readonly ornaments: Ornament[] = this.layout();

  get starLit(): boolean {
    return this.completed.size >= this.total;
  }

  get starGlow(): number {
    return 0.25 + 0.75 * Math.min(1, this.completed.size / this.total);
  }

  /** A faint thread through the stars in day order, like a garland */
  readonly thread = this.ornaments.map((o, i) => `${i ? 'L' : 'M'}${o.x.toFixed(1)} ${o.y.toFixed(1)}`).join(' ');

  /** Index among lit ornaments, so a fresh page load lights them in a cascade */
  litIndex(day: number): number {
    let i = 0;
    for (const d of this.completed) if (d < day) i++;
    return i;
  }

  private layout(): Ornament[] {
    const result: Ornament[] = [];
    let day = 1;
    ROWS.forEach((count, row) => {
      const y = ROW_Y[row];
      const halfWidth = (y - 40) * 0.3;
      for (let i = 0; i < count; i++) {
        // Alternate direction per row so the thread snakes up the tree
        const step = count === 1 ? 0.5 : i / (count - 1);
        const t = row % 2 ? 1 - step : step;
        // Slight zig-zag so rows don't look like a spreadsheet
        const wobble = (i % 2 ? 1 : -1) * 3;
        result.push({
          day,
          x: 110 - halfWidth + t * halfWidth * 2,
          y: y + wobble,
          r: 2.6 - row * 0.15,
          color: COLORS[(day * 5) % COLORS.length],
        });
        day++;
      }
    });
    return result;
  }
}
