/**
 * HouseLayout
 * -----------
 * The *logical* description of a level. The world is a grid of cells that each
 * belong to a room (floor) or to nothing (empty). WALLS ARE EDGES, not cells:
 * a wall exists on the boundary between two cells with different owners (two
 * rooms, or a room and the outside). This is exactly how the Kenney Furniture
 * Kit models it — 1-unit wall panels line cell edges and corner caps sit at the
 * junctions — so rooms sit directly against each other and furniture can hug a
 * wall.
 *
 * Doors and windows are specific edges flagged as openings. No wall rotations
 * are ever authored: the generator derives every wall/corner orientation from
 * adjacency.
 *
 * Because it is theme-agnostic (it never names a GLB), the same format is reused
 * by any kit — swap the asset registry, not this file.
 */

import { Randomizer } from './Randomizer';

// ── World-space constants (tunable) ─────────────────────────────────────────
export const TILE_SIZE = 4; // world units per grid cell
export const WALL_HEIGHT = 3; // wall height in world units
export const WALL_THICKNESS = 0.4; // wall depth in world units
export const FLOOR_Y = 0; // floor plane height
export const PLAYER_SPAWN_Y = 2; // capsule spawn height above the floor

// ── Logical vocabulary ──────────────────────────────────────────────────────
export type TileType = 'empty' | 'floor' | 'spawn';

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

export type RoomType = 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'office' | 'hallway';

// ── Edges ───────────────────────────────────────────────────────────────────
/**
 * An edge between two cells.
 *  - 'V' at (col,row): vertical boundary on the LEFT of cell (col,row) — i.e.
 *    between (col-1,row) and (col,row). Runs north–south (along Z).
 *  - 'H' at (col,row): horizontal boundary on the TOP of cell (col,row) —
 *    between (col,row-1) and (col,row). Runs east–west (along X).
 */
export type EdgeKind = 'H' | 'V';
export interface EdgeRef {
  kind: EdgeKind;
  col: number;
  row: number;
}
export const edgeKey = (e: EdgeRef) => `${e.kind}:${e.col}:${e.row}`;

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
  rect: GridRect; // floor rectangle (cells)
  decorate?: boolean;
  prefab?: string;
}

export interface FurniturePlacement {
  type: FurnitureType;
  col: number;
  row: number;
  rotation?: number; // yaw in degrees (goal 7)
  roomId?: string;
}

export interface HouseLayout {
  seed: string | number;
  tiles: TileType[][]; // tiles[row][col]
  owner: (string | undefined)[][]; // room id per floor cell
  rooms: RoomDef[];
  doors: EdgeRef[]; // interior edges that are doorways
  windows: EdgeRef[]; // exterior edges that are windows
  furniture: FurniturePlacement[];
  spawn: { col: number; row: number };
}

// ── Grid geometry ───────────────────────────────────────────────────────────
export function gridSize(tiles: TileType[][]): { cols: number; rows: number } {
  return { rows: tiles.length, cols: tiles[0]?.length ?? 0 };
}

/** Centre the grid on the origin; convert a cell to its world-space centre. */
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

/** World-space centre of an edge (the midpoint of the boundary segment). */
export function edgeToWorld(e: EdgeRef, cols: number, rows: number): [number, number, number] {
  const [cx, , cz] = cellToWorld(e.col, e.row, cols, rows);
  return e.kind === 'V' ? [cx - TILE_SIZE / 2, FLOOR_Y, cz] : [cx, FLOOR_Y, cz - TILE_SIZE / 2];
}

/** World-space position of the grid vertex at the top-left corner of a cell. */
export function vertexToWorld(col: number, row: number, cols: number, rows: number): [number, number, number] {
  const [cx, , cz] = cellToWorld(col, row, cols, rows);
  return [cx - TILE_SIZE / 2, FLOOR_Y, cz - TILE_SIZE / 2];
}

export function tileAt(tiles: TileType[][], col: number, row: number): TileType | undefined {
  return tiles[row]?.[col];
}
export function ownerAt(owner: (string | undefined)[][], col: number, row: number): string | undefined {
  return owner[row]?.[col];
}

export function hasGround(t: TileType | undefined): boolean {
  return t === 'floor' || t === 'spawn';
}
export function isWalkable(t: TileType | undefined): boolean {
  return t === 'floor' || t === 'spawn';
}

// ── Prefab room templates (goal 11) ─────────────────────────────────────────
export interface RoomPrefab {
  type: RoomType;
  w: number;
  h: number;
  furniture: FurniturePlacement[]; // local coords (0,0 = room's top-left cell)
  decorate?: boolean;
}

export const ROOM_PREFABS: Record<string, RoomPrefab> = {
  livingRoomLarge: {
    type: 'living',
    w: 7,
    h: 7,
    decorate: true,
    furniture: [
      { type: 'sofa', col: 1, row: 5, rotation: 0 },
      { type: 'tv', col: 3, row: 0, rotation: 180 },
    ],
  },
  bedroomLarge: {
    type: 'bedroom',
    w: 7,
    h: 6,
    decorate: true,
    furniture: [{ type: 'bed', col: 1, row: 1, rotation: 0 }],
  },
  bedroomSmall: {
    type: 'bedroom',
    w: 5,
    h: 5,
    decorate: true,
    furniture: [{ type: 'bed', col: 1, row: 1, rotation: 0 }],
  },
  kitchenCompact: {
    type: 'kitchen',
    w: 6,
    h: 7,
    decorate: true,
    furniture: [{ type: 'refrigerator', col: 0, row: 0, rotation: 0 }],
  },
  officeSmall: {
    type: 'office',
    w: 6,
    h: 6,
    decorate: true,
    furniture: [
      { type: 'desk', col: 1, row: 0, rotation: 180 },
      { type: 'chair', col: 1, row: 1, rotation: 0 },
    ],
  },
};

// ── Room-based floor-plan builder ───────────────────────────────────────────
export interface RoomSpec {
  id: string;
  type?: RoomType;
  /** Top-left floor cell. Rooms are placed ADJACENT (floors touch) so they
   *  share a wall edge — no gap cell between them. */
  col: number;
  row: number;
  w?: number;
  h?: number;
  prefab?: string;
  decorate?: boolean;
}

export interface BuildOptions {
  seed?: string | number;
  autoDoors?: boolean;
  autoWindows?: boolean;
  spawnRoom?: string;
}

export interface EdgeInfo {
  edge: EdgeRef;
  a: string | undefined; // owner on one side
  b: string | undefined; // owner on the other side
}

/** Enumerate every boundary edge (a wall) with the owners it separates. */
export function boundaryEdges(owner: (string | undefined)[][], cols: number, rows: number): EdgeInfo[] {
  const out: EdgeInfo[] = [];
  const isWall = (a?: string, b?: string) => a !== b && (a !== undefined || b !== undefined);
  // Vertical edges (between horizontally-adjacent cells).
  for (let col = 0; col <= cols; col++) {
    for (let row = 0; row < rows; row++) {
      const a = ownerAt(owner, col - 1, row);
      const b = ownerAt(owner, col, row);
      if (isWall(a, b)) out.push({ edge: { kind: 'V', col, row }, a, b });
    }
  }
  // Horizontal edges (between vertically-adjacent cells).
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row <= rows; row++) {
      const a = ownerAt(owner, col, row - 1);
      const b = ownerAt(owner, col, row);
      if (isWall(a, b)) out.push({ edge: { kind: 'H', col, row }, a, b });
    }
  }
  return out;
}

export function buildRoomsLayout(rooms: RoomSpec[], opts: BuildOptions = {}): HouseLayout {
  const seed = opts.seed ?? 0;
  const rng = new Randomizer(seed).fork('floorplan');

  const resolved = rooms.map((r) => {
    const prefab = r.prefab ? ROOM_PREFABS[r.prefab] : undefined;
    const w = r.w ?? prefab?.w ?? 4;
    const h = r.h ?? prefab?.h ?? 4;
    const type = r.type ?? prefab?.type ?? 'hallway';
    const decorate = r.decorate ?? prefab?.decorate ?? true;
    return { ...r, w, h, type, decorate, prefabDef: prefab };
  });

  const cols = resolved.reduce((m, r) => Math.max(m, r.col + r.w), 0);
  const rows = resolved.reduce((m, r) => Math.max(m, r.row + r.h), 0);

  const tiles: TileType[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'empty' as TileType),
  );
  const owner: (string | undefined)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => undefined),
  );

  // Fill room floors + ownership.
  for (const r of resolved) {
    for (let dr = 0; dr < r.h; dr++) {
      for (let dc = 0; dc < r.w; dc++) {
        tiles[r.row + dr][r.col + dc] = 'floor';
        owner[r.row + dr][r.col + dc] = r.id;
      }
    }
  }

  const walls = boundaryEdges(owner, cols, rows);
  const wallSet = new Set(walls.map((w) => edgeKey(w.edge)));

  // Auto-doors (goal 12): one opening per adjacent room pair.
  const doors: EdgeRef[] = [];
  if (opts.autoDoors ?? true) {
    const byPair = new Map<string, EdgeInfo[]>();
    for (const w of walls) {
      if (w.a && w.b) {
        const key = [w.a, w.b].sort().join('|');
        (byPair.get(key) ?? byPair.set(key, []).get(key)!).push(w);
      }
    }
    for (const [, edges] of byPair) doors.push(edges[rng.int(0, edges.length - 1)].edge);
  }
  const doorSet = new Set(doors.map(edgeKey));

  // Auto-windows (goal 13): exterior walls, spaced so two never touch.
  const windows: EdgeRef[] = [];
  if (opts.autoWindows ?? true) {
    const winSet = new Set<string>();
    const collinear = (e: EdgeRef): EdgeRef[] =>
      e.kind === 'V'
        ? [{ kind: 'V', col: e.col, row: e.row - 1 }, { kind: 'V', col: e.col, row: e.row + 1 }]
        : [{ kind: 'H', col: e.col - 1, row: e.row }, { kind: 'H', col: e.col + 1, row: e.row }];
    const exterior = rng.shuffle(walls.filter((w) => w.a === undefined || w.b === undefined));
    for (const w of exterior) {
      if (doorSet.has(edgeKey(w.edge))) continue;
      if (collinear(w.edge).some((n) => winSet.has(edgeKey(n)))) continue;
      if (rng.bool(0.6)) {
        windows.push(w.edge);
        winSet.add(edgeKey(w.edge));
      }
    }
  }

  // Collect room defs + prefab furniture (local → grid coords).
  const roomDefs: RoomDef[] = [];
  const furniture: FurniturePlacement[] = [];
  for (const r of resolved) {
    roomDefs.push({ id: r.id, type: r.type, rect: { col: r.col, row: r.row, w: r.w, h: r.h }, decorate: r.decorate, prefab: r.prefab });
    for (const f of r.prefabDef?.furniture ?? []) {
      furniture.push({ ...f, col: r.col + f.col, row: r.row + f.row, roomId: r.id });
    }
  }

  const spawnRoom =
    resolved.find((r) => r.id === opts.spawnRoom || r.type === opts.spawnRoom) ?? resolved[0];
  const spawn = spawnRoom
    ? { col: spawnRoom.col + Math.floor(spawnRoom.w / 2), row: spawnRoom.row + Math.floor(spawnRoom.h / 2) }
    : { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
  tiles[spawn.row][spawn.col] = 'spawn';

  // (wallSet kept implicit — the generator recomputes edges from `owner`.)
  void wallSet;

  return { seed, tiles, owner, rooms: roomDefs, doors, windows, furniture, spawn };
}

// ── The default house used by the app ───────────────────────────────────────
export const DEFAULT_SEED = 'jon-house-01';

export function createDefaultHouse(seed: string | number = DEFAULT_SEED): HouseLayout {
  // Four rooms tiling one solid block; walls fall on the shared/exterior edges.
  return buildRoomsLayout(
    [
      { id: 'living', prefab: 'livingRoomLarge', col: 0, row: 0 },
      { id: 'kitchen', prefab: 'kitchenCompact', col: 7, row: 0 },
      { id: 'bedroom', prefab: 'bedroomLarge', col: 0, row: 7 },
      { id: 'office', prefab: 'officeSmall', col: 7, row: 7 },
    ],
    { seed, autoDoors: true, autoWindows: true, spawnRoom: 'living' },
  );
}
