/**
 * AutoTile
 * --------
 * Wall auto-tiling (goal 3). The layout stores only generic 'wall' tiles; this
 * module inspects the four neighbours of a wall cell and decides which variant
 * to use — straight, corner, T-junction, cross, end cap, or isolated post — plus
 * the rotation. Doors and windows count as wall-like so runs connect through
 * them; an opening is oriented along the wall run it sits in.
 *
 * No rotations are ever stored in the layout — they are derived here, purely
 * from adjacency, so editing the map never means editing angles.
 */

import type { AssetKey } from './HouseAssets';
import { isWallLike, tileAt, type TileType } from './HouseLayout';

// Direction bits.
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export interface WallResolution {
  assetKey: AssetKey;
  /** 90° clockwise turns applied to the asset's canonical orientation. */
  quarters: number;
  /** Actual connection bitmask (N|E|S|W) at this cell. */
  mask: number;
}

function popcount(m: number): number {
  let c = 0;
  for (let i = 0; i < 4; i++) if (m & (1 << i)) c++;
  return c;
}

/** Rotate a direction mask one quarter clockwise: N→E→S→W→N. */
function rotateCW(mask: number): number {
  return ((mask << 1) | (mask >> 3)) & 0b1111;
}

/** Quarters needed to rotate `canonical` onto `mask`, or 0 if no match. */
function matchRotation(mask: number, canonical: number): number {
  let m = canonical;
  for (let q = 0; q < 4; q++) {
    if (m === mask) return q;
    m = rotateCW(m);
  }
  return 0;
}

/** Connection bitmask for a cell from its wall-like neighbours. */
export function connectionMask(tiles: TileType[][], col: number, row: number): number {
  let mask = 0;
  if (isWallLike(tileAt(tiles, col, row - 1))) mask |= N;
  if (isWallLike(tileAt(tiles, col + 1, row))) mask |= E;
  if (isWallLike(tileAt(tiles, col, row + 1))) mask |= S;
  if (isWallLike(tileAt(tiles, col - 1, row))) mask |= W;
  return mask;
}

/** Classify a plain wall cell into a variant + rotation from its neighbours. */
export function resolveWall(tiles: TileType[][], col: number, row: number): WallResolution {
  const mask = connectionMask(tiles, col, row);
  const count = popcount(mask);

  if (count === 0) return { assetKey: 'wallPost', quarters: 0, mask };
  if (count === 4) return { assetKey: 'wallCross', quarters: 0, mask };
  if (count === 1) return { assetKey: 'wallEnd', quarters: matchRotation(mask, N), mask };
  if (count === 3) return { assetKey: 'wallTJunction', quarters: matchRotation(mask, N | E | S), mask };

  // count === 2: straight (opposite) or corner (adjacent).
  if (mask === (N | S) || mask === (E | W)) {
    return { assetKey: 'wallStraight', quarters: matchRotation(mask, N | S), mask };
  }
  return { assetKey: 'wallCorner', quarters: matchRotation(mask, N | E), mask };
}

/**
 * Resolve a door/window cell. It renders the opening model oriented along the
 * wall run (horizontal vs vertical) so it lines up with the adjoining walls.
 */
export function resolveOpening(
  tiles: TileType[][],
  col: number,
  row: number,
  kind: 'door' | 'window',
): WallResolution {
  const mask = connectionMask(tiles, col, row);
  const horizontal = (mask & E) !== 0 || (mask & W) !== 0;
  const vertical = (mask & N) !== 0 || (mask & S) !== 0;
  // Canonical opening spans E–W (horizontal). A purely vertical run turns 90°.
  const quarters = vertical && !horizontal ? 1 : 0;
  return { assetKey: kind, quarters, mask };
}

/** Convert quarter turns to a Y rotation in radians (clockwise). */
export function quartersToRadians(quarters: number): number {
  return -quarters * (Math.PI / 2);
}
