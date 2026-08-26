/**
 * NavGrid
 * -------
 * Walkability grid over the plot, plus A* over it.
 *
 * Tap-to-move needs to route *through* doorways: a straight line from the hall
 * to the kitchen runs into a wall, and the player would just grind against it.
 * The house is already grid-shaped, so a coarse grid + A* is a natural fit and
 * needs no authored navmesh — the blockers come straight off the same collider
 * boxes the physics uses (HouseShell) plus the garden's hedge and the houses
 * across the road (Exterior).
 *
 * Obstacles are fattened by roughly the player capsule's radius so paths keep
 * their distance from walls; furniture is deliberately NOT in here (its
 * colliders are derived from GLB bounds at load time, long after this is built)
 * — the follower in Player.tsx gives up if it stops making progress, which
 * covers bumping into a sofa.
 */

import { WALL_BLOCKERS } from './HouseShell';
import { EXTERIOR_BLOCKERS } from './Exterior';

export interface NavBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Matches the fence colliders in HouseShell — the walkable world. */
const MIN_X = -30;
const MAX_X = 30;
const MIN_Z = -25;
const MAX_Z = 29;
const CELL = 0.25;
/** Fattening applied to every obstacle, ~= the player capsule's radius. */
const CLEARANCE = 0.25;

const COLS = Math.round((MAX_X - MIN_X) / CELL);
const ROWS = Math.round((MAX_Z - MIN_Z) / CELL);

const blocked = new Uint8Array(COLS * ROWS);

const colOf = (x: number) => Math.floor((x - MIN_X) / CELL);
const rowOf = (z: number) => Math.floor((z - MIN_Z) / CELL);
const xOf = (c: number) => MIN_X + (c + 0.5) * CELL;
const zOf = (r: number) => MIN_Z + (r + 0.5) * CELL;
const inGrid = (c: number, r: number) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
const isBlocked = (c: number, r: number) => !inGrid(c, r) || blocked[r * COLS + c] === 1;

function rasterise(b: NavBox) {
  const c0 = Math.max(0, colOf(b.minX - CLEARANCE));
  const c1 = Math.min(COLS - 1, Math.ceil((b.maxX + CLEARANCE - MIN_X) / CELL) - 1);
  const r0 = Math.max(0, rowOf(b.minZ - CLEARANCE));
  const r1 = Math.min(ROWS - 1, Math.ceil((b.maxZ + CLEARANCE - MIN_Z) / CELL) - 1);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) blocked[r * COLS + c] = 1;
  }
}

for (const b of WALL_BLOCKERS) rasterise(b);
for (const b of EXTERIOR_BLOCKERS) rasterise(b);
// Seal the border so a path can never aim outside the fences.
for (let c = 0; c < COLS; c++) {
  blocked[c] = 1;
  blocked[(ROWS - 1) * COLS + c] = 1;
}
for (let r = 0; r < ROWS; r++) {
  blocked[r * COLS] = 1;
  blocked[r * COLS + COLS - 1] = 1;
}

/** Nearest walkable cell to (c, r), searched in rings. -1 if none in range. */
function nearestFree(c: number, r: number, maxRings = 24): number {
  if (!isBlocked(c, r)) return r * COLS + c;
  for (let ring = 1; ring <= maxRings; ring++) {
    for (let d = -ring; d <= ring; d++) {
      const candidates: [number, number][] = [
        [c + d, r - ring],
        [c + d, r + ring],
        [c - ring, r + d],
        [c + ring, r + d],
      ];
      for (const [cc, rr] of candidates) {
        if (!isBlocked(cc, rr)) return rr * COLS + cc;
      }
    }
  }
  return -1;
}

/** True if a straight walk between two world points stays on walkable cells. */
function lineIsClear(ax: number, az: number, bx: number, bz: number): boolean {
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL * 0.5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (isBlocked(colOf(ax + (bx - ax) * t), rowOf(az + (bz - az) * t))) return false;
  }
  return true;
}

// ── A* ───────────────────────────────────────────────────────────────────────
// Flat typed arrays reused between searches; `stamp` avoids clearing them.
const gScore = new Float32Array(COLS * ROWS);
const cameFrom = new Int32Array(COLS * ROWS);
const seen = new Int32Array(COLS * ROWS);
let stamp = 0;

/** Binary min-heap of cell indices keyed by f-score. */
const heapIdx: number[] = [];
const heapF: number[] = [];

function heapPush(idx: number, f: number) {
  heapIdx.push(idx);
  heapF.push(f);
  let i = heapIdx.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heapF[p] <= heapF[i]) break;
    [heapIdx[p], heapIdx[i]] = [heapIdx[i], heapIdx[p]];
    [heapF[p], heapF[i]] = [heapF[i], heapF[p]];
    i = p;
  }
}

function heapPop(): number {
  const top = heapIdx[0];
  const lastIdx = heapIdx.pop()!;
  const lastF = heapF.pop()!;
  if (heapIdx.length) {
    heapIdx[0] = lastIdx;
    heapF[0] = lastF;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let s = i;
      if (l < heapF.length && heapF[l] < heapF[s]) s = l;
      if (r < heapF.length && heapF[r] < heapF[s]) s = r;
      if (s === i) break;
      [heapIdx[s], heapIdx[i]] = [heapIdx[i], heapIdx[s]];
      [heapF[s], heapF[i]] = [heapF[i], heapF[s]];
      i = s;
    }
  }
  return top;
}

const DIRS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

const MAX_EXPANSIONS = 40000;

/**
 * Walkable route from one world point to another, as [x, z] waypoints
 * (already simplified, so the player walks diagonals rather than stair-steps).
 * Returns null if there is no route. Both ends snap to the nearest walkable
 * cell, so standing against a wall or tapping into one still works.
 */
export function findPath(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): [number, number][] | null {
  const start = nearestFree(colOf(fromX), rowOf(fromZ));
  const goal = nearestFree(colOf(toX), rowOf(toZ));
  if (start < 0 || goal < 0) return null;
  if (start === goal) return [[xOf(goal % COLS), zOf(Math.floor(goal / COLS))]];

  const gc = goal % COLS;
  const gr = Math.floor(goal / COLS);
  const h = (i: number) => {
    const dc = Math.abs((i % COLS) - gc);
    const dr = Math.abs(Math.floor(i / COLS) - gr);
    // Octile distance — admissible for 8-way movement.
    return (dc + dr) + (Math.SQRT2 - 2) * Math.min(dc, dr);
  };

  stamp++;
  heapIdx.length = 0;
  heapF.length = 0;
  seen[start] = stamp;
  gScore[start] = 0;
  cameFrom[start] = -1;
  heapPush(start, h(start));

  let expansions = 0;
  let found = false;
  while (heapIdx.length) {
    const cur = heapPop();
    if (cur === goal) {
      found = true;
      break;
    }
    if (++expansions > MAX_EXPANSIONS) break;

    const cc = cur % COLS;
    const cr = Math.floor(cur / COLS);
    for (const [dc, dr, cost] of DIRS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (isBlocked(nc, nr)) continue;
      // Don't cut corners diagonally through a wall junction.
      if (dc && dr && (isBlocked(cc + dc, cr) || isBlocked(cc, cr + dr))) continue;
      const ni = nr * COLS + nc;
      const tentative = gScore[cur] + cost;
      if (seen[ni] === stamp && tentative >= gScore[ni]) continue;
      seen[ni] = stamp;
      gScore[ni] = tentative;
      cameFrom[ni] = cur;
      heapPush(ni, tentative + h(ni));
    }
  }
  if (!found) return null;

  // Walk the parents back to the start.
  const cells: number[] = [];
  for (let i = goal; i !== -1; i = cameFrom[i]) cells.push(i);
  cells.reverse();

  // String-pull: keep a waypoint only where the straight line would clip a wall.
  const points: [number, number][] = [];
  let anchorX = fromX;
  let anchorZ = fromZ;
  for (let i = 1; i < cells.length; i++) {
    const px = xOf(cells[i] % COLS);
    const pz = zOf(Math.floor(cells[i] / COLS));
    if (!lineIsClear(anchorX, anchorZ, px, pz)) {
      const keep = cells[i - 1];
      anchorX = xOf(keep % COLS);
      anchorZ = zOf(Math.floor(keep / COLS));
      points.push([anchorX, anchorZ]);
    }
  }
  points.push([xOf(gc), zOf(gr)]);
  return points;
}

/** Is this world point somewhere the player could stand? */
export function isWalkable(x: number, z: number): boolean {
  return !isBlocked(colOf(x), rowOf(z));
}

/** Snaps a world point onto the nearest walkable spot, or null if far off-grid. */
export function snapToWalkable(x: number, z: number): [number, number] | null {
  const i = nearestFree(colOf(x), rowOf(z), 16);
  if (i < 0) return null;
  return [xOf(i % COLS), zOf(Math.floor(i / COLS))];
}

// Debug hook, matching the existing `window.__game`: lets DevTools or a test
// script probe walkability and routes without touching the running scene.
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__nav = {
    findPath,
    isWalkable,
    snapToWalkable,
    grid: { COLS, ROWS, CELL, MIN_X, MIN_Z },
  };
}
