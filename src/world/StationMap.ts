/**
 * StationMap
 * ----------
 * The hand-authored level. The world is a grid of cells; WALLS ARE CELLS
 * (centered on the grid), matching how the Kenney Space Station Kit is built:
 * every wall/door/window piece is a 1×1-tile block whose pivot is its
 * center-bottom, so a wall cell renders one piece at the cell's center.
 *
 * Legend:  '#' wall   'D' doorway   'W' window wall   '.' floor
 *          'P' spawn (floor)        ' ' outside
 *
 * Rooms: ARCADE (NW) · LAB (NE) · LOUNGE (SE) · HUB (SW, spawn + entrance).
 */

// ── World-space constants ────────────────────────────────────────────────────
/** World units per grid cell. Kenney kits are 1 unit/tile → KIT_SCALE = TILE. */
export const TILE = 2;
export const KIT_SCALE = TILE;
export const WALL_HEIGHT = 1 * KIT_SCALE; // station wall piece is 1 unit tall
/** Player/NPC model scale: Kenney mini characters are 0.72 units tall natively. */
export const CHAR_SCALE = 1.75;
/** Kenney Furniture Kit runs slightly larger than the mini kits; shrink it. */
export const FURNITURE_SCALE = 1.5;
/** Kenney animal pack is oversized (≈2 units); this makes them pet-sized. */
export const ANIMAL_SCALE = 0.55;

export const MAP: string[] = [
  '###W##W##W#####W##W##W###',
  '#...........#...........#',
  '#...........#...........W',
  'W...........D...........#',
  '#...........#...........W',
  '#...........#...........#',
  'W...........#...........#',
  '#...........######D######',
  '#...........#...........#',
  '#...........#...........#',
  '######D######...........W',
  '#...........#...........#',
  'W...........D...........#',
  '#.....P.....#...........W',
  'W...........#...........#',
  '#...........#...........#',
  '###W##D##W#####W##D##W###',
];

export const ROWS = MAP.length;
export const COLS = MAP[0].length;

export type Cell = '#' | 'D' | 'W' | '.' | 'P' | ' ';

export function cellAt(col: number, row: number): Cell {
  return (MAP[row]?.[col] ?? ' ') as Cell;
}

/** Anything that participates in wall connectivity. */
export function isWallish(col: number, row: number): boolean {
  const c = cellAt(col, row);
  return c === '#' || c === 'D' || c === 'W';
}

export function isFloor(col: number, row: number): boolean {
  const c = cellAt(col, row);
  return c === '.' || c === 'P' || c === 'D';
}

/** Grid is centered on the world origin. Works for fractional/out-of-grid coords. */
export function tileToWorld(col: number, row: number): [number, number, number] {
  return [(col - (COLS - 1) / 2) * TILE, 0, (row - (ROWS - 1) / 2) * TILE];
}

function findSpawn(): [number, number, number] {
  for (let r = 0; r < ROWS; r++) {
    const c = MAP[r].indexOf('P');
    if (c !== -1) {
      const [x, , z] = tileToWorld(c, r);
      return [x, 1.2, z]; // drop the capsule in just above the floor
    }
  }
  return [0, 1.2, 0];
}

export const SPAWN: [number, number, number] = findSpawn();

// ── Room bounds (tile-inclusive), used for the arcade floor overlay etc. ────
export const ROOMS = {
  arcade: { c0: 1, r0: 1, c1: 11, r1: 9 },
  lab: { c0: 13, r0: 1, c1: 23, r1: 6 },
  lounge: { c0: 13, r0: 8, c1: 23, r1: 15 },
  hub: { c0: 1, r0: 11, c1: 11, r1: 15 },
} as const;
