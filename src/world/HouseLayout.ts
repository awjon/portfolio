/**
 * HouseLayout
 * -----------
 * The *logical* description of a level: a grid that says WHAT exists in each
 * cell (wall / floor / door / window / a piece of furniture / spawn), plus room
 * regions and optional explicit furniture placements. It never names a GLB — the
 * renderer + asset registry decide which model represents each logical thing
 * (goal 2). Because it is theme-agnostic, the same layout format is reused by any
 * future kit (office, school, hospital, spaceship) — you only swap the asset
 * registry, not this file.
 *
 * Two ways to author a layout:
 *   1. `parseAsciiLayout` — hand-draw a grid of characters (great for the simple
 *      "walls + floor" case in the task's example).
 *   2. `buildRoomsLayout` — describe rooms as rectangles and let the builder draw
 *      the walls, share walls between neighbours, and (optionally) carve doors
 *      between connected rooms and windows into exterior walls automatically
 *      (goals 8, 11, 12, 13).
 */

import { Randomizer } from './Randomizer';

// ── World-space constants (tunable) ─────────────────────────────────────────
export const TILE_SIZE = 4; // world units per grid cell
export const WALL_HEIGHT = 3; // wall height in world units
export const WALL_THICKNESS = 0.5; // wall depth in world units
export const FLOOR_Y = 0; // floor plane height
export const PLAYER_SPAWN_Y = 2; // capsule spawn height above the floor

// ── Logical tile vocabulary ─────────────────────────────────────────────────
/** Structural tiles that form the shell of the building. */
export type StructuralTile = 'empty' | 'floor' | 'wall' | 'door' | 'window' | 'spawn';

/** Furniture / objects that can appear either as a tile or an explicit placement. */
export type FurnitureType =
  | 'sofa'
  | 'chair'
  | 'table'
  | 'bed'
  | 'bookshelf'
  | 'desk'
  | 'coffeeTable'
  | 'rug'
  | 'lamp'
  | 'tv'
  | 'plant'
  | 'refrigerator'
  | 'microwave'
  | 'fruitBowl'
  | 'toaster'
  | 'kitchenCabinet'
  | 'nightstand'
  | 'dresser'
  | 'toilet'
  | 'bathtub'
  | 'sink';

export type TileType = StructuralTile | FurnitureType;

export type RoomType = 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'office' | 'hallway';

// ── Layout data structures ──────────────────────────────────────────────────
export interface GridRect {
  col: number;
  row: number;
  w: number;
  h: number;
}

export interface RoomDef {
  id: string;
  type: RoomType;
  /** Interior floor rectangle (excludes the wall ring). */
  rect: GridRect;
  /** Auto-populate type-appropriate decorations (goal 9). Default true. */
  decorate?: boolean;
  /** Optional prefab template this room was instantiated from (goal 11). */
  prefab?: string;
}

export interface FurniturePlacement {
  type: FurnitureType;
  col: number;
  row: number;
  /** Optional yaw in degrees (goal 7). */
  rotation?: number;
  roomId?: string;
}

export interface HouseLayout {
  seed: string | number;
  /** Row-major grid: tiles[row][col]. */
  tiles: TileType[][];
  rooms: RoomDef[];
  furniture: FurniturePlacement[];
  spawn: { col: number; row: number };
}

// ── Tile classification helpers ─────────────────────────────────────────────
export function isWallLike(t: TileType | undefined): boolean {
  return t === 'wall' || t === 'door' || t === 'window';
}
export function isOpening(t: TileType | undefined): boolean {
  return t === 'door' || t === 'window';
}
export function isStructural(t: TileType): t is StructuralTile {
  return (
    t === 'empty' || t === 'floor' || t === 'wall' || t === 'door' || t === 'window' || t === 'spawn'
  );
}
export function isFurniture(t: TileType): t is FurnitureType {
  return !isStructural(t);
}
/** Does solid ground exist under this tile? (floor, thresholds, furniture sit on floor) */
export function hasGround(t: TileType | undefined): boolean {
  return t !== undefined && t !== 'empty' && t !== 'wall' && t !== 'window';
}
/** Can an agent stand here? (used to seed a future nav mesh — goal 15) */
export function isWalkable(t: TileType | undefined): boolean {
  return t === 'floor' || t === 'spawn' || t === 'door';
}

// ── Grid geometry ───────────────────────────────────────────────────────────
export function gridSize(tiles: TileType[][]): { cols: number; rows: number } {
  return { rows: tiles.length, cols: tiles[0]?.length ?? 0 };
}

/** Centre the grid on the origin and convert a cell to a world position. */
export function cellToWorld(
  col: number,
  row: number,
  cols: number,
  rows: number,
): [number, number, number] {
  const x = (col - (cols - 1) / 2) * TILE_SIZE;
  const z = (row - (rows - 1) / 2) * TILE_SIZE;
  return [x, FLOOR_Y, z];
}

export function tileAt(tiles: TileType[][], col: number, row: number): TileType | undefined {
  return tiles[row]?.[col];
}

// ── ASCII authoring ─────────────────────────────────────────────────────────
export const DEFAULT_LEGEND: Record<string, TileType> = {
  '#': 'wall',
  '.': 'floor',
  ' ': 'empty',
  D: 'door',
  O: 'window',
  '@': 'spawn',
};

/**
 * Parse a block of text into a layout. Every row is padded to the widest row so
 * the grid stays rectangular. Unknown characters fall back to 'empty'.
 */
export function parseAsciiLayout(
  rows: string[],
  opts: { seed?: string | number; legend?: Record<string, TileType> } = {},
): HouseLayout {
  const legend = { ...DEFAULT_LEGEND, ...opts.legend };
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const tiles: TileType[][] = rows.map((r) =>
    Array.from({ length: width }, (_, c) => legend[r[c] ?? ' '] ?? 'empty'),
  );

  let spawn = { col: Math.floor(width / 2), row: Math.floor(rows.length / 2) };
  tiles.forEach((line, row) =>
    line.forEach((t, col) => {
      if (t === 'spawn') spawn = { col, row };
    }),
  );

  return { seed: opts.seed ?? 0, tiles, rooms: [], furniture: [], spawn };
}

// ── Prefab room templates (goal 11) ─────────────────────────────────────────
/**
 * A reusable room template. Furniture coordinates are LOCAL to the room's
 * interior (0,0 = top-left interior cell). `decorate` lets the RoomDecorator add
 * extra type-appropriate props on top of the fixed pieces.
 */
export interface RoomPrefab {
  type: RoomType;
  w: number;
  h: number;
  furniture: FurniturePlacement[];
  decorate?: boolean;
}

export const ROOM_PREFABS: Record<string, RoomPrefab> = {
  livingRoomLarge: {
    type: 'living',
    w: 6,
    h: 6,
    decorate: true,
    furniture: [
      { type: 'sofa', col: 1, row: 4, rotation: 0 },
      { type: 'tv', col: 3, row: 0, rotation: 180 },
    ],
  },
  bedroomLarge: {
    type: 'bedroom',
    w: 6,
    h: 5,
    decorate: true,
    furniture: [{ type: 'bed', col: 2, row: 1, rotation: 0 }],
  },
  bedroomSmall: {
    type: 'bedroom',
    w: 4,
    h: 4,
    decorate: true,
    furniture: [{ type: 'bed', col: 1, row: 1, rotation: 0 }],
  },
  kitchenCompact: {
    type: 'kitchen',
    w: 5,
    h: 6,
    decorate: true,
    furniture: [
      { type: 'refrigerator', col: 0, row: 0, rotation: 0 },
      { type: 'kitchenCabinet', col: 1, row: 0, rotation: 0 },
      { type: 'kitchenCabinet', col: 2, row: 0, rotation: 0 },
    ],
  },
  officeSmall: {
    type: 'office',
    w: 5,
    h: 5,
    decorate: true,
    furniture: [
      { type: 'desk', col: 1, row: 1, rotation: 90 },
      { type: 'chair', col: 2, row: 1, rotation: 270 },
    ],
  },
};

// ── Room-based floor-plan builder ───────────────────────────────────────────
export interface RoomSpec {
  id: string;
  type?: RoomType;
  /** Top-left INTERIOR cell. Rooms are separated by one shared wall cell. */
  col: number;
  row: number;
  /** Interior size in tiles. Omitted when `prefab` supplies it. */
  w?: number;
  h?: number;
  prefab?: string;
  decorate?: boolean;
}

export interface BuildOptions {
  seed?: string | number;
  autoDoors?: boolean;
  autoWindows?: boolean;
  /** Room id (or type) the player should spawn in. */
  spawnRoom?: string;
}

/**
 * Turn a set of room rectangles into a full logical layout: floors, a shared
 * wall ring, auto-carved doors between neighbours, and windows in exterior walls.
 */
export function buildRoomsLayout(rooms: RoomSpec[], opts: BuildOptions = {}): HouseLayout {
  const seed = opts.seed ?? 0;
  const rng = new Randomizer(seed).fork('floorplan');

  // Empty margin kept around the whole plan so every exterior wall has an
  // 'empty' cell outside it (needed for window detection on all four sides).
  const MARGIN = 1;

  // Resolve prefab sizes + shift by the margin, collect concrete room defs.
  const resolved = rooms.map((r) => {
    const prefab = r.prefab ? ROOM_PREFABS[r.prefab] : undefined;
    const w = r.w ?? prefab?.w ?? 4;
    const h = r.h ?? prefab?.h ?? 4;
    const type = r.type ?? prefab?.type ?? 'hallway';
    const decorate = r.decorate ?? prefab?.decorate ?? true;
    return { ...r, col: r.col + MARGIN, row: r.row + MARGIN, w, h, type, decorate, prefabDef: prefab };
  });

  // Grid must fit each room's wall ring (interior + 1) plus the far-side margin.
  const cols = resolved.reduce((m, r) => Math.max(m, r.col + r.w + 1), 0) + MARGIN;
  const rows = resolved.reduce((m, r) => Math.max(m, r.row + r.h + 1), 0) + MARGIN;

  const tiles: TileType[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'empty' as TileType),
  );
  // Ownership of each floor cell, so we can detect walls shared by two rooms.
  const owner: (string | undefined)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => undefined),
  );

  // 1) Carve interior floors + record ownership.
  for (const r of resolved) {
    for (let dr = 0; dr < r.h; dr++) {
      for (let dc = 0; dc < r.w; dc++) {
        const c = r.col + dc;
        const rr = r.row + dr;
        tiles[rr][c] = 'floor';
        owner[rr][c] = r.id;
      }
    }
  }

  // 2) Draw wall rings around each room (never overwrite a floor → shared walls).
  for (const r of resolved) {
    for (let dr = -1; dr <= r.h; dr++) {
      for (let dc = -1; dc <= r.w; dc++) {
        const onBorder = dr === -1 || dr === r.h || dc === -1 || dc === r.w;
        if (!onBorder) continue;
        const c = r.col + dc;
        const rr = r.row + dr;
        if (tiles[rr]?.[c] !== undefined && tiles[rr][c] !== 'floor') tiles[rr][c] = 'wall';
      }
    }
  }

  // 3) Auto-doors between adjacent rooms (goal 12): a wall cell with floor from
  //    two DIFFERENT rooms on opposite sides is a candidate connector.
  if (opts.autoDoors ?? true) {
    const candidates = new Map<string, { col: number; row: number }[]>();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (tiles[row][col] !== 'wall') continue;
        const pairs: [string | undefined, string | undefined][] = [
          [owner[row - 1]?.[col], owner[row + 1]?.[col]], // N/S
          [owner[row]?.[col - 1], owner[row]?.[col + 1]], // W/E
        ];
        for (const [a, b] of pairs) {
          if (a && b && a !== b) {
            const key = [a, b].sort().join('|');
            (candidates.get(key) ?? candidates.set(key, []).get(key)!).push({ col, row });
          }
        }
      }
    }
    for (const [, cells] of candidates) {
      const pick = cells[rng.int(0, cells.length - 1)];
      tiles[pick.row][pick.col] = 'door';
    }
  }

  // 4) Auto-windows in straight exterior walls (goal 13): wall with 'empty'
  //    outside and 'floor' inside, spaced so two never sit adjacent.
  if (opts.autoWindows ?? true) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (tiles[row][col] !== 'wall') continue;
        const n = tiles[row - 1]?.[col];
        const s = tiles[row + 1]?.[col];
        const e = tiles[row]?.[col + 1];
        const w = tiles[row]?.[col - 1];
        const horizontalRun = isWallLike(e) && isWallLike(w); // wall runs E–W
        const verticalRun = isWallLike(n) && isWallLike(s); // wall runs N–S
        const exteriorHoriz = horizontalRun && ((n === 'empty' && s === 'floor') || (s === 'empty' && n === 'floor'));
        const exteriorVert = verticalRun && ((e === 'empty' && w === 'floor') || (w === 'empty' && e === 'floor'));
        if (!exteriorHoriz && !exteriorVert) continue;
        // Don't place next to an existing window along the run.
        const runNeighbours = horizontalRun ? [w, e] : [n, s];
        if (runNeighbours.includes('window')) continue;
        if (rng.bool(0.5)) tiles[row][col] = 'window';
      }
    }
  }

  // 5) Collect room defs + prefab furniture (offset from local → grid coords).
  const roomDefs: RoomDef[] = [];
  const furniture: FurniturePlacement[] = [];
  for (const r of resolved) {
    roomDefs.push({
      id: r.id,
      type: r.type,
      rect: { col: r.col, row: r.row, w: r.w, h: r.h },
      decorate: r.decorate,
      prefab: r.prefab,
    });
    for (const f of r.prefabDef?.furniture ?? []) {
      furniture.push({
        ...f,
        col: r.col + f.col,
        row: r.row + f.row,
        roomId: r.id,
      });
    }
  }

  // 6) Spawn: centre of the chosen room (or the first room).
  const spawnRoom =
    resolved.find((r) => r.id === opts.spawnRoom || r.type === opts.spawnRoom) ?? resolved[0];
  const spawn = spawnRoom
    ? {
        col: spawnRoom.col + Math.floor(spawnRoom.w / 2),
        row: spawnRoom.row + Math.floor(spawnRoom.h / 2),
      }
    : { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
  tiles[spawn.row][spawn.col] = 'spawn';

  return { seed, tiles, rooms: roomDefs, furniture, spawn };
}

// ── The default house used by the app ───────────────────────────────────────
export const DEFAULT_SEED = 'jon-house-01';

export function createDefaultHouse(seed: string | number = DEFAULT_SEED): HouseLayout {
  return buildRoomsLayout(
    [
      { id: 'living', prefab: 'livingRoomLarge', col: 1, row: 1 },
      { id: 'kitchen', prefab: 'kitchenCompact', col: 8, row: 1 },
      { id: 'bedroom', prefab: 'bedroomLarge', col: 1, row: 8 },
      { id: 'office', prefab: 'officeSmall', col: 8, row: 8 },
    ],
    { seed, autoDoors: true, autoWindows: true, spawnRoom: 'living' },
  );
}
