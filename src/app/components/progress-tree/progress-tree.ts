import { Component, Input } from '@angular/core';

interface Ornament {
  day: number;
  x: number;
  y: number;
  r: number;
  color: string;
}

const COLORS = ['#ff5a6e', '#f7c873', '#5cf2b3', '#7fb8ff', '#d58bff', '#ff9f43'];
/** Ornaments per row, from the bottom of the tree to the top (sums to 24) */
const ROWS = [6, 5, 5, 4, 3, 1];
const ROW_Y = [238, 204, 170, 138, 108, 80];

/**
 * A Christmas tree that lights up one ornament per completed day,
 * from the bottom branches up to the star.
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
      const halfWidth = (y - 40) * 0.42 * 0.8;
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        // Slight zig-zag so rows don't look like a spreadsheet
        const wobble = (i % 2 ? 1 : -1) * 3;
        result.push({
          day,
          x: 110 - halfWidth + t * halfWidth * 2,
          y: y + wobble,
          r: row === ROWS.length - 1 ? 6 : 7.5 - row * 0.35,
          color: COLORS[(day * 5) % COLORS.length],
        });
        day++;
      }
    });
    return result;
  }
}
