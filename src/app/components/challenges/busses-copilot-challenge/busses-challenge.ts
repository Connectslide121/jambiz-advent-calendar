import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarStateService } from '../../../services/calendar-state.service';

type Dir = 'N' | 'S' | 'E' | 'W';

interface Bus {
  id: number;
  row: number;
  col: number;
  dir: Dir;
  color: string;
  startRow: number;
  startCol: number;
  exploding?: boolean;
}

@Component({
  selector: 'app-busses-challenge',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './busses-challenge.html',
  styleUrls: ['./busses-challenge.scss'],
})
export class BussesChallenge implements OnInit {
  @Input() isCompleted = false;
  @Input() day?: number;
  @Output() completed = new EventEmitter<void>();

  readonly GRID = 11;
  cells: (Bus | null)[][] = [];
  buses: Bus[] = [];
  carsLeft = 0;
  crashes = 0;

  private nextId = 1;

  constructor(private stateService: CalendarStateService) {}

  ngOnInit(): void {
    this.initGrid();
    this.saveStats();
  }

  initGrid(): void {
    // init empty grid
    this.cells = Array.from({ length: this.GRID }, () => Array(this.GRID).fill(null));

    // center 7x7 starts at index 2..8 (0-based)
    const start = 2;
    const end = 8;
    const colors = ['blue', 'green', 'red', 'yellow', 'cyan'];
    const useSleigh = this.isSleighMode();

    for (let r = start; r <= end; r++) {
      for (let c = start; c <= end; c++) {
        const dir = this.randomDir();
        const color = useSleigh ? 'red' : colors[Math.floor(Math.random() * colors.length)];
        const bus: Bus = {
          id: this.nextId++,
          row: r,
          col: c,
          dir,
          color,
          startRow: r,
          startCol: c,
        };
        this.buses.push(bus);
        this.cells[r][c] = bus;
      }
    }
  }

  randomDir(): Dir {
    const dirs: Dir[] = ['N', 'S', 'E', 'W'];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  isSleighMode(): boolean {
    // Use calendar service day check (Dec 24+) or date override
    const effective = this.stateService.getEffectiveDecemberDay();
    return effective >= 24;
  }

  cellClasses(r: number, c: number): string {
    // parking area center 2..8
    if (r >= 2 && r <= 8 && c >= 2 && c <= 8) {
      return 'parking';
    }
    return 'road';
  }

  iconFor(bus: Bus): string {
    return this.isSleighMode() ? 'fa-solid fa-sleigh' : 'fa-solid fa-bus';
  }

  onClickBus(bus: Bus | null): void {
    if (!bus) return;
    // Do not interact if already exploding
    if (bus.exploding) return;
    this.attemptExit(bus);
  }

  attemptExit(bus: Bus): void {
    // simulate step-by-step; if collision occurs, handle crash
    const moveVec = (d: Dir) => {
      switch (d) {
        case 'N': return [-1, 0];
        case 'S': return [1, 0];
        case 'E': return [0, 1];
        case 'W': return [0, -1];
      }
    };

    const removeFromGrid = (b: Bus) => {
      this.cells[b.row][b.col] = null;
    };

    removeFromGrid(bus);

    let r = bus.row;
    let c = bus.col;
    let dir = bus.dir;

    const step = () => {
      const [dr, dc] = moveVec(dir);
      r += dr;
      c += dc;

      // reached outside => bus left
      if (r < 0 || r >= this.GRID || c < 0 || c >= this.GRID) {
        this.carsLeft++;
        this.buses = this.buses.filter(b => b.id !== bus.id);
        this.saveStats();
        this.checkWin();
        return;
      }

      // collision with another bus
      const occupant = this.cells[r][c];
      if (occupant) {
        // show explosion on this bus
        bus.exploding = true;
        // place explosion visually at occupant cell while bus 'drives into' it
        setTimeout(() => {
          // return bus to start
          bus.exploding = false;
          bus.row = bus.startRow;
          bus.col = bus.startCol;
          this.cells[bus.row][bus.col] = bus;
          this.crashes++;
          this.saveStats();
        }, 600);
        return;
      }

      // place bus temporarily along the path (visual)
      this.cells[r][c] = bus;

      // if at edge but not corner -> rotate towards nearest corner then continue
      const atTop = r === 0;
      const atBottom = r === this.GRID - 1;
      const atLeft = c === 0;
      const atRight = c === this.GRID - 1;
      const atEdge = atTop || atBottom || atLeft || atRight;
      const atCorner = (atTop || atBottom) && (atLeft || atRight);

      if (atEdge && !atCorner) {
        // compute nearest corner
        const corners = [ [0,0],[0,this.GRID-1],[this.GRID-1,0],[this.GRID-1,this.GRID-1] ];
        let best = corners[0];
        let bestDist = Math.abs(r - best[0]) + Math.abs(c - best[1]);
        for (const cc of corners) {
          const d = Math.abs(r - cc[0]) + Math.abs(c - cc[1]);
          if (d < bestDist) { bestDist = d; best = cc; }
        }
        // choose new dir to move along the edge toward corner
        if (r === 0) {
          dir = (best[1] < c) ? 'W' : 'E';
        } else if (r === this.GRID - 1) {
          dir = (best[1] < c) ? 'W' : 'E';
        } else if (c === 0) {
          dir = (best[0] < r) ? 'N' : 'S';
        } else if (c === this.GRID - 1) {
          dir = (best[0] < r) ? 'N' : 'S';
        }
      }

      // schedule next step
      setTimeout(() => {
        // clear previous cell if bus moved on
        if (this.cells[r - (moveVec(dir)[0] || 0)] && this.cells[r - (moveVec(dir)[0] || 0)][c - (moveVec(dir)[1] || 0)] === bus) {
          this.cells[r - (moveVec(dir)[0] || 0)][c - (moveVec(dir)[1] || 0)] = null;
        }
        step();
      }, 60);
    };

    step();
  }

  checkWin(): void {
    if (this.buses.length === 0) {
      // Save final stats and emit completed
      this.saveStats();
      this.completed.emit();
    }
  }

  saveStats(): void {
    if (this.day !== undefined) {
      const timesPlayed = this.carsLeft + this.crashes;
      this.stateService.saveGameStats(this.day, {
        timesPlayed,
        carsLeft: this.carsLeft,
        crashes: this.crashes,
      });
    }
  }
}
