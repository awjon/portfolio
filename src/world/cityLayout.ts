/**
 * TILE-BASED CITY LAYOUT
 * ----------------------
 * The city is a grid. Each cell is TILE_SIZE units square. You design the city
 * by editing the CITY_MAP below — one character per cell. The World reads this,
 * places the matching GLB tile, and (for buildings) adds a collider.
 *
 * Because Kenney pieces repeat, identical tiles are rendered as INSTANCES
 * (one draw call per tile type) which keeps the whole city cheap at 60fps.
 *
 * Legend:
 *   .  empty ground (no tile, reflective floor shows through)
 *   R  straight road
 *   X  crossroad / intersection
 *   B  building (large commercial)
 *   S  building (small / shop)
 *   T  detail prop (lightpost, tree, etc.)
 *   P  plaza / open space where billboards + NPCs live (kept clear)
 *
 * Coordinates: column = x, row = z. The grid is centered on the origin so the
 * player spawns in the middle plaza.
 */

export const TILE_SIZE = 4; // world units per grid cell

// 15x15 city. The center rows/cols form an open plaza (P) for interactables.
// Roads frame the plaza; buildings fill the outer blocks.
export const CITY_MAP: string[] = [
  'BBSB.RXR.BSBB.T',
  'BSBB.R.R.BBSB..',
  'SBBS.R.R.SBBS.T',
  '....RXRXR......',
  'RRRRXR.RXRRRR..',
  '....R.....R...T',
  'XRRRX.PPP.XRRRX',
  '....R.PPP.R....',
  'XRRRX.PPP.XRRRX',
  '....R.....R...T',
  'RRRRXR.RXRRRR..',
  '....RXRXR......',
  'SBBS.R.R.SBBS.T',
  'BSBB.R.R.BBSB..',
  'BBSB.RXR.BSBB.T',
];

export const GRID_W = CITY_MAP[0].length;
export const GRID_H = CITY_MAP.length;

/** Convert a grid cell (col,row) to a centered world position. */
export function cellToWorld(col: number, row: number): [number, number, number] {
  const x = (col - (GRID_W - 1) / 2) * TILE_SIZE;
  const z = (row - (GRID_H - 1) / 2) * TILE_SIZE;
  return [x, 0, z];
}

/** Which Kenney GLB (in /public/models/city/) each symbol maps to. */
export interface TileDef {
  model: string; // path to GLB
  collider: boolean; // does the player collide with it?
  // Random y-rotation choices (in quarter turns) so repeated tiles don't look
  // identical. Buildings pick one at random; roads use context if you extend this.
  rotations?: number[];
  yOffset?: number;
}

// NOTE: filenames follow Kenney's City Kit naming. If your extracted GLB names
// differ, edit the `model` paths here — this is the single place to remap.
export const TILE_DEFS: Record<string, TileDef> = {
  R: { model: '/models/city/road-straight.glb', collider: false, rotations: [0, 1, 2, 3] },
  X: { model: '/models/city/road-crossroad.glb', collider: false },
  B: { model: '/models/city/building-large.glb', collider: true, rotations: [0, 1, 2, 3] },
  S: { model: '/models/city/building-small.glb', collider: true, rotations: [0, 1, 2, 3] },
  T: { model: '/models/city/detail-lightpost.glb', collider: false, rotations: [0, 1, 2, 3] },
};

export const HALF_PI = Math.PI / 2;
