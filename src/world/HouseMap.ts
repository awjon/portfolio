/**
 * HouseMap
 * --------
 * The hand-authored floor plan. Unlike the old station map (walls were whole
 * cells), this one is an OWNERSHIP grid — every cell belongs to a room, and
 * WALLS LIVE ON THE EDGES between cells, which is exactly how the Kenney
 * Furniture Kit models them (a wall panel is 1×1.29×0.05 with its pivot at one
 * end of the tile boundary). That buys us three things:
 *
 *  - rooms are as big as they read on the plan (no cell lost to a wall),
 *  - a room can be any shape, so the house is L-shaped/stepped instead of a
 *    grid of rectangles,
 *  - every wall, corner, door frame and window falls out of adjacency — the
 *    only things authored by hand are the letters below and the door list.
 *
 * Legend:  K kitchen/diner · S study · H hall (entrance) · L living room ·
 *          G games den (the project kiosks) · '.' outside
 *
 * North is -Z (up the plan), south is +Z, the front door is on the south porch.
 */

// ── World-space constants ────────────────────────────────────────────────────
/**
 * World units per grid cell. The Furniture Kit is authored at 1 unit per tile,
 * so KIT_SCALE === TILE makes a wall panel exactly span one cell edge.
 * At 1.5 the kit's 1.29-unit walls stand 1.94 high against a 1.26-high
 * character — a house with generous ceilings, not a warehouse.
 */
export const TILE = 1.5;
export const KIT_SCALE = TILE;
/** Arcade / space-station minis are authored ~1.35× smaller than the kit. */
export const PROP_SCALE = 1.8;
/** Wall panel: 1.29 tall and 0.05 thick, in kit units. */
export const WALL_HEIGHT = 1.29 * KIT_SCALE;
/**
 * Colliders are deliberately fatter than the 0.075-thick panels they stand for:
 * a plate that thin lets the player capsule pitch over it. The extra 0.08 a
 * side is invisible and keeps collisions stable.
 */
export const WALL_COLLIDER_T = 0.24;
/** Shifts a panel so its thickness straddles the edge line it sits on. */
export const EDGE_OFF = 0.025 * KIT_SCALE;
/** Doorway pieces: opening spans 6.8%–93.2% of the panel, 0.98 of it tall. */
export const DOOR_GAP = 0.068;
export const DOOR_TOP = 0.98 * KIT_SCALE;
/**
 * ecctrl's capsule rests with its centre 0.65 above the floor and is 1.3 tall,
 * so its crown sits at 1.3. A doorway header must clear that — nothing solid
 * may start lower, or the player wedges under the lintel.
 */
export const PLAYER_CLEAR = 1.5;
/** Player/NPC model scale: Kenney mini characters are 0.72 units tall natively. */
export const CHAR_SCALE = 1.75;
/** Kenney's animal pack is heroically oversized; this makes them pet-sized. */
export const ANIMAL_SCALE = 0.38;

export const PLAN: string[] = [
  '..KKKKKSSS..',
  '.KKKKKKSSSS.',
  'KKKKKKHSSSS.',
  'LLLLLHHSSSS.',
  'LLLLLHHGGGGG',
  'LLLLHHHGGGGG',
  'LLLLHHGGGGG.',
  '....HH......',
];

export const ROWS = PLAN.length;
export const COLS = PLAN[0].length;

export type Room = 'K' | 'S' | 'H' | 'L' | 'G';

/** The room owning a cell, or null for outdoors / off-plan. */
export function roomAt(col: number, row: number): Room | null {
  const ch = PLAN[row]?.[col];
  return ch && ch !== '.' ? (ch as Room) : null;
}

/** Grid is centered on the world origin. Fractional/out-of-grid coords are fine. */
export function tileToWorld(col: number, row: number): [number, number, number] {
  return [(col - (COLS - 1) / 2) * TILE, 0, (row - (ROWS - 1) / 2) * TILE];
}

export const HOUSE = {
  minX: -((COLS / 2) * TILE),
  maxX: (COLS / 2) * TILE,
  minZ: -((ROWS / 2) * TILE),
  maxZ: (ROWS / 2) * TILE,
} as const;

// ── Doors ────────────────────────────────────────────────────────────────────
/**
 * An edge is named by the cell on its +X/+Z side: `N` is the edge between
 * (c, r-1) and (c, r); `W` is the edge between (c-1, r) and (c, r). That gives
 * every boundary exactly one name, including the ones on the outside of the
 * grid (hence the out-of-range coordinates below).
 */
export type Side = 'N' | 'W';
export type EdgeKey = `${number},${number},${Side}`;

export const edgeKey = (c: number, r: number, side: Side): EdgeKey => `${c},${r},${side}`;

/** Hand-picked openings. Every room touches the hall, plus two shortcut loops. */
export const DOORS = new Set<EdgeKey>([
  edgeKey(5, 8, 'N'), //  front door — porch → hall
  edgeKey(2, 0, 'N'), //  back door  — kitchen → back garden
  edgeKey(12, 5, 'W'), // side door  — games den → east garden
  edgeKey(6, 2, 'N'), //  hall ↔ kitchen
  edgeKey(2, 3, 'N'), //  kitchen ↔ living room (loop)
  edgeKey(5, 4, 'W'), //  hall ↔ living room
  edgeKey(7, 3, 'W'), //  hall ↔ study
  edgeKey(7, 5, 'W'), //  hall ↔ games den
  edgeKey(9, 4, 'N'), //  study ↔ games den (loop)
]);

/** The front door's world position + the axis the garden path runs along. */
export const FRONT_DOOR = {
  x: tileToWorld(5, 0)[0],
  z: HOUSE.maxZ,
} as const;

/** Spawn on the garden path, a few steps from the porch, facing the house. */
export const SPAWN: [number, number, number] = [FRONT_DOOR.x, 1.1, FRONT_DOOR.z + 4];

// ── Room reference points (used for lighting + prop authoring) ───────────────
export const ROOM_CENTER: Record<Room, [number, number]> = {
  K: [3.2, 1],
  S: [8.5, 1.6],
  H: [5.2, 5],
  L: [2, 4.5],
  G: [9, 5],
};
