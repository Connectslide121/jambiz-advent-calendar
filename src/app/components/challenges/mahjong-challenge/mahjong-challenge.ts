import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Check } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';

interface TilePosition {
  x: number;
  y: number;
  layer: number;
}

interface MahjongTile extends TilePosition {
  id: number;
  icon: string;
  removed: boolean;
  isSpecial: boolean;
  textColor?: string;
}

interface MahjongStats {
  points: number;
  wrongTiles: number;
  shuffleUsed: number;
  destroyUsed: number;
  hintUsed: number;
  sleighCollected: boolean;
}

const MAX_SOLVE_STEPS = 50000;

@Component({
  selector: 'app-mahjong-challenge',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './mahjong-challenge.html',
  styleUrls: ['./mahjong-challenge.scss'],
})
export class MahjongChallenge implements OnInit, OnDestroy {
  @Input() isCompleted = false;
  @Input() day?: number;
  @Output() completed = new EventEmitter<void>();

  readonly Check = Check;

  tiles: MahjongTile[] = [];
  selectedTileId: number | null = null;
  hintTileIds = new Set<number>();
  wrongTileIds = new Set<number>();

  points = 0;
  wrongTiles = 0;
  shuffleUsed = 0;
  destroyUsed = 0;
  hintUsed = 0;
  maxPoints = 0;

  sleighCollected = false;
  sleighLocked = false;
  gameCompleted = false;

  boardWidth = 0;
  boardHeight = 0;
  tileSize = 48;
  tileGap = 4;
  layerOffset = 5;

  private timers: number[] = [];

  private readonly iconPool = [
    'fa-star',
    'fa-heart',
    'fa-bell',
    'fa-snowflake',
    'fa-tree',
    'fa-gift',
    'fa-candy-cane',
    'fa-mug-hot',
  ];
  private readonly iconColors = [
    '#2563eb', // blue
    '#0891b2', // cyan
    '#22c55e', // green
    '#d946ef', // magenta
    '#a855f7', // lilac
    '#f97316', // orange
    '#a16207', // dark yellow
  ];

  constructor(private stateService: CalendarStateService) {}

  ngOnInit(): void {
    this.startNewGame();

    if (this.isCompleted) {
      this.applyCompletedState();
    }

    this.updateBoardMetrics();
  }

  ngOnDestroy(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateBoardMetrics();
  }

  startNewGame(): void {
    this.clearHighlights();
    this.selectedTileId = null;
    this.points = 0;
    this.wrongTiles = 0;
    this.shuffleUsed = 0;
    this.destroyUsed = 0;
    this.hintUsed = 0;
    this.sleighCollected = false;
    this.sleighLocked = false;
    this.gameCompleted = false;

    this.tiles = this.buildSolvableTiles();
    this.maxPoints = this.tiles.filter((tile) => !tile.isSpecial).length / 2;
    this.updateBoardSize();
  }

  showReward(): void {
    this.completed.emit();
  }

  playAgain(): void {
    this.isCompleted = false;
    this.startNewGame();
  }

  get displayPoints(): number {
    if (this.gameCompleted && this.sleighCollected) {
      return this.points * 2;
    }
    return this.points;
  }

  get showSleighBonusMessage(): boolean {
    const sleigh = this.getSleighTile();
    return !!sleigh && !sleigh.removed && !this.sleighLocked && this.isTileFree(sleigh);
  }

  get showSleighHelpMessage(): boolean {
    const sleigh = this.getSleighTile();
    return !!sleigh && !sleigh.removed && this.sleighLocked && this.isTileFree(sleigh);
  }

  getTileStyle(tile: MahjongTile): Record<string, string> {
    const left = tile.x * (this.tileSize + this.tileGap) + tile.layer * this.layerOffset;
    const top = tile.y * (this.tileSize + this.tileGap) - tile.layer * this.layerOffset;
    const baseColor = tile.isSpecial ? '#ef4444' : '#f7f0df';
    const textColor = tile.isSpecial ? '#ffffff' : tile.textColor;
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${this.tileSize}px`,
      height: `${this.tileSize}px`,
      zIndex: String(tile.layer * 10 + 1),
      '--tile-background': baseColor ?? '#ffffff',
      '--tile-color': textColor ?? '#1f2937',
    };
  }

  onTileClick(tile: MahjongTile): void {
    if (this.gameCompleted || tile.removed || !this.isTileFree(tile)) {
      return;
    }

    if (tile.isSpecial) {
      if (this.sleighLocked) {
        return;
      }
      this.collectSleigh(tile);
      return;
    }

    if (this.selectedTileId === tile.id) {
      this.selectedTileId = null;
      return;
    }

    if (this.selectedTileId === null) {
      this.selectedTileId = tile.id;
      return;
    }

    const firstTile = this.tiles.find((candidate) => candidate.id === this.selectedTileId);
    if (!firstTile || firstTile.removed || !this.isTileFree(firstTile)) {
      this.selectedTileId = tile.id;
      return;
    }

    if (firstTile.icon === tile.icon) {
      this.removeTiles([firstTile, tile], true);
    } else {
      this.wrongTiles += 1;
      this.flashWrongTiles([firstTile, tile]);
    }

    this.selectedTileId = null;
  }

  reshuffle(): void {
    if (this.gameCompleted) {
      return;
    }

    const remainingTiles = this.tiles.filter((tile) => !tile.removed && !tile.isSpecial);
    if (remainingTiles.length < 2) {
      return;
    }

    const positions = remainingTiles.map((tile) => ({
      x: tile.x,
      y: tile.y,
      layer: tile.layer,
    }));

    const previousState = remainingTiles.map((tile) => ({
      id: tile.id,
      x: tile.x,
      y: tile.y,
      layer: tile.layer,
    }));

    this.shuffleUsed += 1;
    this.clearHighlights();
    this.selectedTileId = null;

    let success = false;

    for (let attempt = 0; attempt < 80; attempt += 1) {
      this.shuffleArray(positions);
      remainingTiles.forEach((tile, index) => {
        const position = positions[index];
        tile.x = position.x;
        tile.y = position.y;
        tile.layer = position.layer;
      });

      if (this.isSolvable(this.tiles)) {
        success = true;
        break;
      }
    }

    if (!success) {
      previousState.forEach((prev) => {
        const tile = remainingTiles.find((candidate) => candidate.id === prev.id);
        if (tile) {
          tile.x = prev.x;
          tile.y = prev.y;
          tile.layer = prev.layer;
        }
      });
    }
  }

  destroyPair(): void {
    if (this.gameCompleted) {
      return;
    }

    const freeTiles = this.tiles.filter(
      (tile) => !tile.removed && !tile.isSpecial && this.isTileFree(tile)
    );

    const pairs = this.groupTilesByIcon(freeTiles);
    const options = Array.from(pairs.values()).filter((group) => group.length >= 2);

    if (options.length === 0) {
      return;
    }

    const group = options[Math.floor(Math.random() * options.length)];
    const [first, second] = group.slice(0, 2);
    const sleighWasFree = this.getSleighTile()
      ? this.isTileFree(this.getSleighTile()!)
      : false;
    this.destroyUsed += 1;
    this.selectedTileId = null;
    this.removeTiles([first, second], false);
    const sleighTile = this.getSleighTile();
    if (sleighTile && !sleighWasFree && this.isTileFree(sleighTile)) {
      this.sleighLocked = true;
    }
  }

  showHint(): void {
    if (this.gameCompleted) {
      return;
    }

    const freeTiles = this.tiles.filter(
      (tile) => !tile.removed && !tile.isSpecial && this.isTileFree(tile)
    );

    this.hintTileIds.clear();

    if (this.selectedTileId !== null) {
      const selected = freeTiles.find((tile) => tile.id === this.selectedTileId);
      if (!selected) {
        return;
      }
      const matches = freeTiles.filter(
        (tile) => tile.icon === selected.icon && tile.id !== selected.id
      );
      if (matches.length === 0) {
        return;
      }
      this.hintUsed += 1;
      this.hintTileIds.add(selected.id);
      matches.forEach((tile) => this.hintTileIds.add(tile.id));
    } else {
      const pairs = this.groupTilesByIcon(freeTiles);
      const options = Array.from(pairs.values()).filter((group) => group.length >= 2);
      if (options.length === 0) {
        return;
      }
      this.hintUsed += 1;
      options.forEach((group) => {
        group.forEach((tile) => this.hintTileIds.add(tile.id));
      });
    }

    this.timers.push(
      window.setTimeout(() => {
        this.hintTileIds.clear();
      }, 1800)
    );
  }

  isTileSelected(tile: MahjongTile): boolean {
    return this.selectedTileId === tile.id;
  }

  isHinted(tile: MahjongTile): boolean {
    return this.hintTileIds.has(tile.id);
  }

  isWrong(tile: MahjongTile): boolean {
    return this.wrongTileIds.has(tile.id);
  }

  isTileFree(tile: MahjongTile): boolean {
    if (tile.removed) {
      return false;
    }
    return this.isTileFreeWithTiles(tile, this.tiles);
  }

  isTileBlocked(tile: MahjongTile): boolean {
    if (tile.isSpecial && this.sleighLocked) {
      return true;
    }
    return !this.isTileFree(tile);
  }

  private collectSleigh(tile: MahjongTile): void {
    if (this.sleighCollected) {
      return;
    }
    tile.removed = true;
    this.sleighCollected = true;
  }

  private getSleighTile(): MahjongTile | undefined {
    return this.tiles.find((tile) => tile.isSpecial);
  }

  private removeTiles(tiles: MahjongTile[], countForPoints: boolean): void {
    tiles.forEach((tile) => {
      tile.removed = true;
    });

    if (countForPoints) {
      this.points += 1;
    }

    this.checkWin();
  }

  private flashWrongTiles(tiles: MahjongTile[]): void {
    tiles.forEach((tile) => this.wrongTileIds.add(tile.id));
    this.timers.push(
      window.setTimeout(() => {
        tiles.forEach((tile) => this.wrongTileIds.delete(tile.id));
      }, 1400)
    );
  }

  private clearHighlights(): void {
    this.hintTileIds.clear();
    this.wrongTileIds.clear();
  }

  private checkWin(): void {
    const remaining = this.tiles.filter((tile) => !tile.isSpecial && !tile.removed);
    if (remaining.length > 0) {
      return;
    }

    this.gameCompleted = true;
    this.saveStats();

    this.timers.push(
      window.setTimeout(() => {
        this.completed.emit();
      }, 600)
    );
  }

  private saveStats(): void {
    if (this.day === undefined) {
      return;
    }

    const stats: MahjongStats = {
      points: this.points,
      wrongTiles: this.wrongTiles,
      shuffleUsed: this.shuffleUsed,
      destroyUsed: this.destroyUsed,
      hintUsed: this.hintUsed,
      sleighCollected: this.sleighCollected,
    };

    this.stateService.saveGameStats(this.day, stats);
  }

  private applyCompletedState(): void {
    this.gameCompleted = true;
    if (this.day === undefined) {
      return;
    }
    const stats = this.stateService.getGameStats(this.day) as MahjongStats | null;
    if (!stats) {
      return;
    }
    this.points = stats.points ?? this.points;
    this.wrongTiles = stats.wrongTiles ?? this.wrongTiles;
    this.shuffleUsed = stats.shuffleUsed ?? this.shuffleUsed;
    this.destroyUsed = stats.destroyUsed ?? this.destroyUsed;
    this.hintUsed = stats.hintUsed ?? this.hintUsed;
    this.sleighCollected = stats.sleighCollected ?? this.sleighCollected;

    this.tiles
      .filter((tile) => !tile.isSpecial)
      .forEach((tile) => {
        tile.removed = true;
      });

    if (this.sleighCollected) {
      const sleighTile = this.tiles.find((tile) => tile.isSpecial);
      if (sleighTile) {
        sleighTile.removed = true;
      }
    }
  }

  private buildSolvableTiles(): MahjongTile[] {
    const layout = this.getLayoutPositions();
    const specialPosition = layout.special;
    const normalPositions = layout.tiles;
    const totalPairs = normalPositions.length / 2;
    const iconPool = this.createIconPool(totalPairs);
    const iconColors = this.assignIconColors(iconPool);

    let tiles: MahjongTile[] = [];
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const shuffledIcons = this.shuffleArray([...iconPool]);
      tiles = normalPositions.map((pos, index) => ({
        id: index + 1,
        icon: shuffledIcons[index],
        x: pos.x,
        y: pos.y,
        layer: pos.layer,
        removed: false,
        isSpecial: false,
        textColor: iconColors.get(shuffledIcons[index]),
      }));

      const specialTile: MahjongTile = {
        id: tiles.length + 1,
        icon: 'fa-sleigh',
        x: specialPosition.x,
        y: specialPosition.y,
        layer: specialPosition.layer,
        removed: false,
        isSpecial: true,
      };

      const allTiles = [...tiles, specialTile];
      if (this.isSolvable(allTiles)) {
        return allTiles;
      }
    }

    if (tiles.length === 0) {
      tiles = normalPositions.map((pos, index) => ({
        id: index + 1,
        icon: iconPool[index % iconPool.length],
        x: pos.x,
        y: pos.y,
        layer: pos.layer,
        removed: false,
        isSpecial: false,
        textColor: iconColors.get(iconPool[index % iconPool.length]),
      }));
    }

    const fallbackSpecial: MahjongTile = {
      id: tiles.length + 1,
      icon: 'fa-sleigh',
      x: specialPosition.x,
      y: specialPosition.y,
      layer: specialPosition.layer,
      removed: false,
      isSpecial: true,
    };

    return [...tiles, fallbackSpecial];
  }

  private getLayoutPositions(): { tiles: TilePosition[]; special: TilePosition } {
    const tiles: TilePosition[] = [];
    const baseRows = 7;
    const baseCols = 7;

    for (let y = 0; y < baseRows; y += 1) {
      for (let x = 0; x < baseCols; x += 1) {
        tiles.push({ x, y, layer: 0 });
      }
    }

    const special = this.pickSpecialPosition(baseRows, baseCols);
    const tileFilter = (pos: TilePosition) =>
      !(pos.x === special.x && pos.y === special.y && pos.layer === special.layer);

    const baseTiles = tiles.filter(tileFilter);

    const layer1: TilePosition[] = [];
    const layer1Size = 7;
    const layer1Start = Math.floor((baseCols - layer1Size) / 2);
    for (let y = 0; y < layer1Size; y += 1) {
      for (let x = 0; x < layer1Size; x += 1) {
        layer1.push({ x: layer1Start + x, y: layer1Start + y, layer: 1 });
      }
    }

    const layer2: TilePosition[] = [];
    const layer2Size = 3;
    const layer2Start = Math.floor((baseCols - layer2Size) / 2);
    for (let y = 0; y < layer2Size; y += 1) {
      for (let x = 0; x < layer2Size; x += 1) {
        layer2.push({ x: layer2Start + x, y: layer2Start + y, layer: 2 });
      }
    }

    return {
      tiles: [...baseTiles, ...layer1, ...layer2],
      special,
    };
  }

  private createIconPool(pairCount: number): string[] {
    const pool: string[] = [];
    for (let i = 0; i < pairCount; i += 1) {
      const icon = this.iconPool[i % this.iconPool.length];
      pool.push(icon, icon);
    }
    return pool;
  }

  private updateBoardSize(): void {
    const positions = this.tiles;
    const maxX = Math.max(...positions.map((tile) => tile.x));
    const maxY = Math.max(...positions.map((tile) => tile.y));
    this.boardWidth =
      (maxX + 1) * (this.tileSize + this.tileGap) + this.layerOffset * 2;
    this.boardHeight =
      (maxY + 1) * (this.tileSize + this.tileGap) + this.layerOffset * 2;
  }

  private updateBoardMetrics(): void {
    if (this.tiles.length === 0) {
      return;
    }

    const maxX = Math.max(...this.tiles.map((tile) => tile.x));
    const maxY = Math.max(...this.tiles.map((tile) => tile.y));

    const availableWidth = Math.max(window.innerWidth - 32, 280);
    const availableHeight = Math.max(window.innerHeight - 360, 260);

    const maxTileWidth = Math.floor(
      (availableWidth - this.layerOffset * 2) / (maxX + 1) - this.tileGap
    );
    const maxTileHeight = Math.floor(
      (availableHeight - this.layerOffset * 2) / (maxY + 1) - this.tileGap
    );

    const nextTileSize = Math.min(maxTileWidth, maxTileHeight, 56);
    this.tileSize = Math.max(nextTileSize, 26);
    this.tileGap = Math.max(Math.floor(this.tileSize * 0.08), 3);
    this.layerOffset = Math.max(Math.floor(this.tileSize * 0.12), 4);

    this.updateBoardSize();
  }

  private isSolvable(tiles: MahjongTile[]): boolean {
    const memo = new Map<string, boolean>();
    let steps = 0;
    const tileOrder = tiles.filter((tile) => !tile.isSpecial);

    const search = (): boolean => {
      if (steps > MAX_SOLVE_STEPS) {
        return false;
      }
      steps += 1;

      if (tileOrder.every((tile) => tile.removed)) {
        return true;
      }

      const key = tileOrder.map((tile) => (tile.removed ? '1' : '0')).join('');
      const cached = memo.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const freeTiles = tileOrder.filter(
        (tile) => !tile.removed && this.isTileFreeWithTiles(tile, tiles)
      );

      if (freeTiles.length === 0) {
        memo.set(key, false);
        return false;
      }

      const byIcon = this.groupTilesByIcon(freeTiles);
      const groups = Array.from(byIcon.values()).filter((group) => group.length >= 2);

      for (const group of groups) {
        for (let i = 0; i < group.length - 1; i += 1) {
          for (let j = i + 1; j < group.length; j += 1) {
            group[i].removed = true;
            group[j].removed = true;
            if (search()) {
              memo.set(key, true);
              group[i].removed = false;
              group[j].removed = false;
              return true;
            }
            group[i].removed = false;
            group[j].removed = false;
          }
        }
      }

      memo.set(key, false);
      return false;
    };

    return search();
  }

  private groupTilesByIcon(tiles: MahjongTile[]): Map<string, MahjongTile[]> {
    const byIcon = new Map<string, MahjongTile[]>();
    tiles.forEach((tile) => {
      const list = byIcon.get(tile.icon) ?? [];
      list.push(tile);
      byIcon.set(tile.icon, list);
    });
    return byIcon;
  }

  private isTileFreeWithTiles(tile: MahjongTile, tiles: MahjongTile[]): boolean {
    const covered = tiles.some(
      (candidate) =>
        !candidate.removed &&
        candidate.layer > tile.layer &&
        candidate.x === tile.x &&
        candidate.y === tile.y
    );
    if (covered) {
      return false;
    }

    const leftBlocked = tiles.some(
      (candidate) =>
        !candidate.removed &&
        candidate.layer === tile.layer &&
        candidate.y === tile.y &&
        candidate.x === tile.x - 1
    );
    const rightBlocked = tiles.some(
      (candidate) =>
        !candidate.removed &&
        candidate.layer === tile.layer &&
        candidate.y === tile.y &&
        candidate.x === tile.x + 1
    );

    return !leftBlocked || !rightBlocked;
  }

  private shuffleArray<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  private assignIconColors(iconPool: string[]): Map<string, string> {
    const uniqueIcons = Array.from(new Set(iconPool));
    const palette = this.shuffleArray([...this.iconColors]);
    const colors = new Map<string, string>();
    uniqueIcons.forEach((icon, index) => {
      colors.set(icon, palette[index % palette.length]);
    });
    return colors;
  }

  private pickSpecialPosition(rows: number, cols: number): TilePosition {
    const position: TilePosition = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
      layer: 0,
    };
    return position;
  }
}
