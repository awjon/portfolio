/**
 * RoomDecorator
 * -------------
 * Auto-populates each room with type-appropriate props (goal 9) using
 * deterministic randomness (goal 10). It draws from a per-room-type table
 * (data-driven, so new room types are a table entry, not new code) and never
 * places two solid items on the same cell.
 *
 * Now that walls are edges, "wall" and "corner" props HUG the wall: the piece is
 * nudged against the boundary and turned to face into the room. Each room
 * decorates from its own forked RNG stream so editing one room doesn't reshuffle
 * another.
 */

import type { PlacedModel } from './HouseTypes';
import { type AssetRegistry, getAsset } from './HouseAssets';
import {
  type FurnitureType,
  type HouseLayout,
  type RoomDef,
  type RoomType,
  cellToWorld,
  gridSize,
  ownerAt,
  FLOOR_Y,
  TILE_SIZE,
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

const DECOR: Record<RoomType, DecorEntry[]> = {
  living: [
    { type: 'coffeeTable', min: 1, max: 1, placement: 'center' },
    { type: 'rug', min: 1, max: 1, placement: 'center' },
    { type: 'lamp', min: 1, max: 2, placement: 'corner' },
    { type: 'plant', min: 1, max: 2, placement: 'corner' },
    { type: 'bookshelf', min: 1, max: 1, placement: 'wall' },
  ],
  kitchen: [
    { type: 'kitchenCabinet', min: 2, max: 3, placement: 'wall' },
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
const HUG = TILE_SIZE * 0.3; // how far to nudge a piece toward its wall

interface Cell {
  col: number;
  row: number;
}
// side → grid step, world hug offset, and yaw that faces INTO the room.
const SIDES = {
  N: { dc: 0, dr: -1, ox: 0, oz: -1, yaw: 0 },
  S: { dc: 0, dr: 1, ox: 0, oz: 1, yaw: Math.PI },
  E: { dc: 1, dr: 0, ox: 1, oz: 0, yaw: -Math.PI / 2 },
  W: { dc: -1, dr: 0, ox: -1, oz: 0, yaw: Math.PI / 2 },
} as const;
type Side = keyof typeof SIDES;

/** Which sides of a cell face a wall (a neighbour with a different owner). */
function wallSides(layout: HouseLayout, room: RoomDef, c: Cell): Side[] {
  const out: Side[] = [];
  for (const s of Object.keys(SIDES) as Side[]) {
    const { dc, dr } = SIDES[s];
    if (ownerAt(layout.owner, c.col + dc, c.row + dr) !== room.id) out.push(s);
  }
  return out;
}

function freeInteriorCells(layout: HouseLayout, room: RoomDef, occupied: Set<string>): Cell[] {
  const cells: Cell[] = [];
  const { col, row, w, h } = room.rect;
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (!occupied.has(key(c, r))) cells.push({ col: c, row: r });
    }
  }
  return cells;
}

function isCornerCell(layout: HouseLayout, room: RoomDef, c: Cell): boolean {
  const s = wallSides(layout, room, c);
  return (s.includes('N') || s.includes('S')) && (s.includes('E') || s.includes('W'));
}

function pickCell(
  placement: Placement,
  layout: HouseLayout,
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
      ? free.filter((c) => isCornerCell(layout, room, c))
      : placement === 'wall'
        ? free.filter((c) => wallSides(layout, room, c).length > 0)
        : free;
  return rng.pick(pool.length ? pool : free);
}

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
    const free = freeInteriorCells(layout, room, occupied);

    for (const entry of DECOR[room.type] ?? []) {
      const count = rng.int(entry.min, entry.max);
      for (let i = 0; i < count; i++) {
        const cell = pickCell(entry.placement, layout, room, free, rng);
        if (!cell) break;
        const assetKey = FURNITURE_ASSET[entry.type];
        const def = getAsset(registry, assetKey);
        if (def.collider !== 'none') {
          occupied.add(key(cell.col, cell.row));
          const idx = free.indexOf(cell);
          if (idx >= 0) free.splice(idx, 1);
        }
        const [x, , z] = cellToWorld(cell.col, cell.row, cols, rows);

        // Hug the wall for wall/corner placements.
        let ox = 0;
        let oz = 0;
        let rotationY = 0;
        if (entry.placement === 'wall' || entry.placement === 'corner') {
          const sides = wallSides(layout, room, cell);
          if (sides.length) {
            for (const s of sides) {
              ox += SIDES[s].ox * HUG;
              oz += SIDES[s].oz * HUG;
            }
            rotationY = SIDES[sides[0]].yaw;
          }
        }

        out.push({
          assetKey,
          position: [x + ox, FLOOR_Y, z + oz],
          rotationY,
          footprint: def.footprint ?? [1, 1],
          source: 'decoration',
          roomId: room.id,
        });
      }
    }
  }
  return out;
}
