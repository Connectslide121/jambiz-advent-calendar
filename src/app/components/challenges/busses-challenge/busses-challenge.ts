import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarStateService } from '../../../services/calendar-state.service';

type Dir = 'N' | 'S' | 'E' | 'W';

interface Position {
  row: number;
  col: number;
}

interface Bus {
  id: number;
  row: number;
  col: number;
  startRow: number;
  startCol: number;
  dir: Dir;
  color: string;
  exploding: boolean;
  pathHistory: Position[];
  offsetX?: number;
  offsetY?: number;
  timing?: string;
  animating?: string;
  started?: boolean;
  angle?: number;
}

@Component({
  selector: 'app-busses-challenge',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './busses-challenge.html',
  styleUrls: ['./busses-challenge.scss'],
})
export class BussesChallenge implements OnInit, OnDestroy {
  @Input() day?: number;
  @Input() isCompleted = false;
  @Output() completed = new EventEmitter<void>();

  readonly GRID = 11;
  readonly PARK_START = 2;
  readonly PARK_END = 8;
  readonly moveDelay = 380;
  readonly colors = ['#6ec3ff', '#8af5a1', 'red', 'yellow', 'cyan'];

  cells: (Bus | null)[][] = [];
  buses: Bus[] = [];
  carsLeft = 0;
  crashes = 0;
  isSleighMode = false;

  private nextId = 1;
  private activeBusId: number | null = null;
  private animationTimer?: number;
  private returnTimer?: number;

  constructor(private stateService: CalendarStateService) {}

  ngOnInit(): void {
    this.isSleighMode = this.stateService.getEffectiveDecemberDay() >= 24;
    this.loadStats();
    this.resetGrid();
    if (this.isCompleted) {
      this.isCompleted = false;
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  get timesPlayed(): number {
    return this.carsLeft + this.crashes;
  }

  get moveDuration(): string {
    return `${this.moveDelay / 1000}s`;
  }

  cellClasses(row: number, col: number): string {
    if (row >= this.PARK_START && row <= this.PARK_END && col >= this.PARK_START && col <= this.PARK_END) {
      return 'parking';
    }
    if ((row === 0 && (col === 0 || col === this.GRID - 1)) || (row === this.GRID - 1 && (col === 0 || col === this.GRID - 1))) {
      return 'corner';
    }
    return 'road';
  }

  onClickBus(bus: Bus | null): void {
    if (!bus || this.activeBusId != null || this.isCompleted || bus.exploding) {
      return;
    }
    this.launchBus(bus);
  }

  private launchBus(bus: Bus): void {
    this.activeBusId = bus.id;
    this.stepForward(bus);
  }

  private stepForward(bus: Bus): void {
    const [dr, dc] = this.getDelta(bus.dir);
    const nextRow = bus.row + dr;
    const nextCol = bus.col + dc;

    const timing = bus.started ? 'linear' : 'ease-in';

    if (!this.isInside(nextRow, nextCol)) {
      this.animateExit(bus, dr, dc, 'ease-out');
      return;
    }

    const occupant = this.cells[nextRow][nextCol];
    if (occupant) {
      this.handleCrash(bus);
      return;
    }

    bus.offsetX = dc;
    bus.offsetY = dr;
    bus.timing = timing;
    bus.animating = 'animating';
    bus.started = true;

    this.animationTimer = window.setTimeout(
      () => {
        this.finalizeMove(bus, nextRow, nextCol);
      },
      this.moveDelay
    );
  }

  private animateExit(bus: Bus, dr: number, dc: number, timing: string): void {
    bus.offsetX = dc;
    bus.offsetY = dr;
    bus.timing = timing;
    this.animationTimer = window.setTimeout(() => this.handleExit(bus), this.moveDelay);
  }

  private finalizeMove(bus: Bus, nextRow: number, nextCol: number): void {
    const [dr, dc] = this.getDelta(bus.dir);
    const prevRow = bus.row;
    const prevCol = bus.col;
    this.cells[prevRow][prevCol] = null;
    bus.row = nextRow;
    bus.col = nextCol;
    this.cells[bus.row][bus.col] = bus;
    bus.pathHistory.push({ row: bus.row, col: bus.col });
    bus.animating = undefined;
    bus.offsetX = -dc;
    bus.offsetY = -dr;
    if (this.activeBusId === bus.id && this.hasLeftParking(bus)) {
      this.activeBusId = null;
    }
    requestAnimationFrame(() => {
      if (this.shouldTurnAtEdge(bus)) {
        this.turnTowardsCorner(bus);
      }
      bus.offsetX = 0;
      bus.offsetY = 0;
      bus.timing = undefined;
      bus.animating = 'animating';
      this.animationTimer = window.setTimeout(
        () => {
          bus.timing = undefined;
          this.stepForward(bus);
        },
        this.moveDelay
      );
    });
  }

  private handleExit(bus: Bus): void {
    this.cells[bus.row][bus.col] = null;
    this.buses = this.buses.filter((b) => b.id !== bus.id);
    bus.offsetX = 0;
    bus.offsetY = 0;
    bus.timing = 'none';
    this.carsLeft++;
    this.saveStats();
    this.activeBusId = null;
    this.checkWin();
    requestAnimationFrame(() => {
      bus.timing = undefined;
    });
  }

  private handleCrash(bus: Bus): void {
    bus.exploding = true;
    const history = [...bus.pathHistory];
    this.clearAnimationTimer();
    this.animateReturn(bus, history);
  }

  private animateReturn(bus: Bus, history: Position[]): void {
    const path = [...history].reverse();
    let stepIndex = 1;

    const moveBack = () => {
      if (stepIndex >= path.length) {
        this.finalizeCrash(bus);
        return;
      }

      this.cells[bus.row][bus.col] = null;
      const target = path[stepIndex++];
      bus.row = target.row;
      bus.col = target.col;
      this.cells[bus.row][bus.col] = bus;
      this.returnTimer = window.setTimeout(moveBack, this.moveDelay);
    };

    moveBack();
  }

  private finalizeCrash(bus: Bus): void {
    bus.exploding = false;
    bus.pathHistory = [{ row: bus.startRow, col: bus.startCol }];
    this.cells[bus.row][bus.col] = bus;
    this.crashes++;
    this.saveStats();
    this.activeBusId = null;
    this.returnTimer = undefined;
    bus.offsetX = 0;
    bus.offsetY = 0;
    bus.timing = undefined;
    bus.started = false;
    bus.angle = this.angleForDir(bus.dir);
  }

  private shouldTurnAtEdge(bus: Bus): boolean {
    const atTop = bus.row === 0;
    const atBottom = bus.row === this.GRID - 1;
    const atLeft = bus.col === 0;
    const atRight = bus.col === this.GRID - 1;
    const atEdge = atTop || atBottom || atLeft || atRight;
    const atCorner = (atTop || atBottom) && (atLeft || atRight);
    return atEdge && !atCorner;
  }

  private turnTowardsCorner(bus: Bus): void {
    const target = this.closestCorner(bus.row, bus.col);
    if (bus.row === 0 || bus.row === this.GRID - 1) {
      bus.dir = target.col < bus.col ? 'W' : 'E';
    } else {
      bus.dir = target.row < bus.row ? 'N' : 'S';
    }
    this.updateBusAngle(bus);
  }

  private updateBusAngle(bus: Bus): void {
    const target = this.angleForDir(bus.dir);
    const current = bus.angle ?? target;
    let diff = ((target - current + 540) % 360) - 180;
    bus.angle = current + diff;
  }

  private closestCorner(row: number, col: number): Position {
    const corners: Position[] = [
      { row: 0, col: 0 },
      { row: 0, col: this.GRID - 1 },
      { row: this.GRID - 1, col: 0 },
      { row: this.GRID - 1, col: this.GRID - 1 },
    ];
    return corners.reduce((best, current) => {
      const bestDist = Math.abs(best.row - row) + Math.abs(best.col - col);
      const currentDist = Math.abs(current.row - row) + Math.abs(current.col - col);
      return currentDist < bestDist ? current : best;
    });
  }

  private getDelta(dir: Dir): [number, number] {
    switch (dir) {
      case 'N':
        return [-1, 0];
      case 'S':
        return [1, 0];
      case 'E':
        return [0, 1];
      case 'W':
        return [0, -1];
    }
  }

  private isInside(row: number, col: number): boolean {
    return row >= 0 && row < this.GRID && col >= 0 && col < this.GRID;
  }

  private isEdge(row: number, col: number): boolean {
    return row === 0 || row === this.GRID - 1 || col === 0 || col === this.GRID - 1;
  }

  private randomDir(row: number, col: number): Dir {
    const dirs: Dir[] = ['N', 'S', 'E', 'W'];
    const opposite: Record<Dir, Dir> = {
      N: 'S',
      S: 'N',
      E: 'W',
      W: 'E',
    };

    const banned = new Set<Dir>();

    for (const cell of this.cells[row]) {
      if (cell) {
        banned.add(opposite[cell.dir]);
      }
    }

    for (let r = 0; r < this.GRID; r++) {
      const cell = this.cells[r][col];
      if (cell) {
        banned.add(opposite[cell.dir]);
      }
    }

    const choices = dirs.filter((dir) => !banned.has(dir));
    if (choices.length === 0) {
      return dirs[Math.floor(Math.random() * dirs.length)];
    }
    return choices[Math.floor(Math.random() * choices.length)];
  }

  private resetGrid(): void {
    this.clearTimers();
    this.cells = Array.from({ length: this.GRID }, () => Array(this.GRID).fill(null));
    this.buses = [];
    this.activeBusId = null;
    this.nextId = 1;

    for (let row = this.PARK_START; row <= this.PARK_END; row++) {
      for (let col = this.PARK_START; col <= this.PARK_END; col++) {
        const dir = this.randomDir(row, col);
        const color = this.isSleighMode ? 'red' : this.colors[Math.floor(Math.random() * this.colors.length)];
        const bus: Bus = {
          id: this.nextId++,
          row,
          col,
          startRow: row,
          startCol: col,
          dir,
          color,
          exploding: false,
          pathHistory: [{ row, col }],
          offsetX: 0,
          offsetY: 0,
          timing: undefined,
          started: false,
          angle: this.angleForDir(dir),
        };
        this.buses.push(bus);
        this.cells[row][col] = bus;
      }
    }
    this.saveStats();
  }

  private checkWin(): void {
    if (this.buses.length === 0) {
      this.saveStats();
      this.completed.emit();
    }
  }

  private loadStats(): void {
    if (this.day === undefined) {
      return;
    }
    const stats = this.stateService.getGameStats(this.day);
    if (stats) {
      this.carsLeft = stats.carsLeft || 0;
      this.crashes = stats.crashes || 0;
    }
  }

  private saveStats(): void {
    if (this.day !== undefined) {
      this.stateService.saveGameStats(this.day, {
        timesPlayed: this.timesPlayed,
        carsLeft: this.carsLeft,
        crashes: this.crashes,
      });
    }
  }

  private clearTimers(): void {
    if (this.animationTimer) {
      window.clearTimeout(this.animationTimer);
      this.animationTimer = undefined;
    }
    if (this.returnTimer) {
      window.clearTimeout(this.returnTimer);
      this.returnTimer = undefined;
    }
  }

  private clearAnimationTimer(): void {
    if (this.animationTimer) {
      window.clearTimeout(this.animationTimer);
      this.animationTimer = undefined;
    }
  }

  private isInParkingArea(bus: Bus): boolean {
    return (
      bus.row >= this.PARK_START &&
      bus.row <= this.PARK_END &&
      bus.col >= this.PARK_START &&
      bus.col <= this.PARK_END
    );
  }

  private hasLeftParking(bus: Bus): boolean {
    return !this.isInParkingArea(bus);
  }

  iconFor(): string {
    return this.isSleighMode ? 'fa-sleigh' : 'fa-bus-side';
  }

  getTransform(angle: number, offsetX = 0, offsetY = 0): string {
    const translateX = offsetX ? `${offsetX * 100}%` : '0';
    const translateY = offsetY ? `${offsetY * 100}%` : '0';
    return `translate(${translateX}, ${translateY}) rotate(${angle}deg)`;
  }

  angleForDir(dir: Dir): number {
    switch (dir) {
      case 'N':
        return -90;
      case 'S':
        return 90;
      case 'W':
        return 180;
      default:
        return 0;
    }
  }
}
