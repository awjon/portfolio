/**
 * RoomDecorator
 * -------------
 * Auto-populates each room with type-appropriate props (goal 9) using
 * deterministic randomness (goal 10) — a living room gets a coffee table, rug,
 * lamps and plants; a kitchen gets a microwave, fruit bowl, toaster and cabinets;
 * and so on. It draws from a per-room-type table (data-driven, so new room types
 * are a table entry, not new code) and never places two solid items on the same
 * cell.
 *
 * Each room decorates from its own forked RNG stream, so editing one room does
 * not shuffle another room's contents.
 */

import type { PlacedModel } from './HouseTypes';
import { type AssetRegistry, getAsset } from './HouseAssets';
import {
  type FurnitureType,
  type HouseLayout,
  type RoomDef,
  type RoomType,
  type TileType,
  cellToWorld,
  gridSize,
  isWallLike,
  tileAt,
  FLOOR_Y,
} from './HouseLayout';
import { Randomizer } from './Randomizer';
import { FURNITURE_ASSET } from './FurnitureSpawner';

type Placement = 'center' | 'corner' | 'wall' | 'any';

interface DecorEntry {
  type: FurnitureType;
  min: number;
  max: number;
  placement: Placement;
}

/** Per-room decoration recipes. Extend by adding room types / entries here. */
const DECOR: Record<RoomType, DecorEntry[]> = {
  living: [
    { type: 'coffeeTable', min: 1, max: 1, placement: 'center' },
    { type: 'rug', min: 1, max: 1, placement: 'center' },
    { type: 'lamp', min: 1, max: 2, placement: 'corner' },
    { type: 'plant', min: 1, max: 2, placement: 'corner' },
  ],
  kitchen: [
    { type: 'kitchenCabinet', min: 1, max: 2, placement: 'wall' },
    { type: 'microwave', min: 1, max: 1, placement: 'wall' },
    { type: 'fruitBowl', min: 1, max: 1, placement: 'wall' },
    { type: 'toaster', min: 1, max: 1, placement: 'wall' },
  ],
  bedroom: [
    { type: 'nightstand', min: 1, max: 2, placement: 'wall' },
    { type: 'dresser', min: 1, max: 1, placement: 'wall' },
    { type: 'lamp', min: 1, max: 1, placement: 'corner' },
  ],
  bathroom: [
    { type: 'toilet', min: 1, max: 1, placement: 'corner' },
    { type: 'sink', min: 1, max: 1, placement: 'wall' },
    { type: 'bathtub', min: 1, max: 1, placement: 'wall' },
  ],
  office: [
    { type: 'bookshelf', min: 1, max: 2, placement: 'wall' },
    { type: 'plant', min: 1, max: 1, placement: 'corner' },
  ],
  hallway: [{ type: 'plant', min: 0, max: 1, placement: 'corner' }],
};

const key = (col: number, row: number) => `${col},${row}`;

interface Cell {
  col: number;
  row: number;
}

/** Interior floor cells of a room not already occupied. */
function freeInteriorCells(tiles: TileType[][], room: RoomDef, occupied: Set<string>): Cell[] {
  const cells: Cell[] = [];
  const { col, row, w, h } = room.rect;
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      const t = tileAt(tiles, c, r);
      if ((t === 'floor' || t === 'spawn') && !occupied.has(key(c, r))) cells.push({ col: c, row: r });
    }
  }
  return cells;
}

function isCorner(tiles: TileType[][], c: Cell): boolean {
  const vert = isWallLike(tileAt(tiles, c.col, c.row - 1)) || isWallLike(tileAt(tiles, c.col, c.row + 1));
  const horiz = isWallLike(tileAt(tiles, c.col - 1, c.row)) || isWallLike(tileAt(tiles, c.col + 1, c.row));
  return vert && horiz;
}
function touchesWall(tiles: TileType[][], c: Cell): boolean {
  return (
    isWallLike(tileAt(tiles, c.col, c.row - 1)) ||
    isWallLike(tileAt(tiles, c.col, c.row + 1)) ||
    isWallLike(tileAt(tiles, c.col - 1, c.row)) ||
    isWallLike(tileAt(tiles, c.col + 1, c.row))
  );
}

function pickCell(
  placement: Placement,
  tiles: TileType[][],
  room: RoomDef,
  free: Cell[],
  rng: Randomizer,
): Cell | undefined {
  if (!free.length) return undefined;
  if (placement === 'center') {
    const cx = room.rect.col + (room.rect.w - 1) / 2;
    const cy = room.rect.row + (room.rect.h - 1) / 2;
    return free.reduce((best, cur) =>
      (cur.col - cx) ** 2 + (cur.row - cy) ** 2 < (best.col - cx) ** 2 + (best.row - cy) ** 2 ? cur : best,
    );
  }
  const pool =
    placement === 'corner'
      ? free.filter((c) => isCorner(tiles, c))
      : placement === 'wall'
        ? free.filter((c) => touchesWall(tiles, c))
        : free;
  const from = pool.length ? pool : free;
  return rng.pick(from);
}

/**
 * Decorate every room. Adds solid-decoration cells to `occupied` so callers can
 * exclude them from the nav grid.
 */
export function decorateRooms(
  layout: HouseLayout,
  registry: AssetRegistry,
  occupied: Set<string>,
): PlacedModel[] {
  const { cols, rows } = gridSize(layout.tiles);
  const root = new Randomizer(layout.seed).fork('decor');
  const out: PlacedModel[] = [];

  for (const room of layout.rooms) {
    if (room.decorate === false) continue;
    const rng = root.fork(room.id);
    const free = freeInteriorCells(layout.tiles, room, occupied);

    for (const entry of DECOR[room.type] ?? []) {
      const count = rng.int(entry.min, entry.max);
      for (let i = 0; i < count; i++) {
        const cell = pickCell(entry.placement, layout.tiles, room, free, rng);
        if (!cell) break;
        const assetKey = FURNITURE_ASSET[entry.type];
        const def = getAsset(registry, assetKey);
        // Solid props claim their cell; flat/decor props (rug, lamp) don't block.
        if (def.collider !== 'none') {
          occupied.add(key(cell.col, cell.row));
          const idx = free.indexOf(cell);
          if (idx >= 0) free.splice(idx, 1);
        }
        const [x, , z] = cellToWorld(cell.col, cell.row, cols, rows);
        out.push({
          assetKey,
          position: [x, FLOOR_Y, z],
          rotationY: 0,
          footprint: def.footprint ?? [1, 1],
          source: 'decoration',
          roomId: room.id,
        });
      }
    }
  }
  return out;
}
