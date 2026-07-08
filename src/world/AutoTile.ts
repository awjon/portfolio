/**
 * AutoTile
 * --------
 * Auto-tiling for the edge-based wall system (goal 3). Straight walls are just
 * the boundary edges, oriented by the generator from the edge kind. This module
 * handles the JUNCTIONS: given which of the four edges meeting at a grid vertex
 * are walls, it decides whether a corner cap is needed there and how it should
 * be rotated — all derived from adjacency, never authored.
 */

// Direction bits at a vertex.
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

function popcount(m: number): number {
  let c = 0;
  for (let i = 0; i < 4; i++) if (m & (1 << i)) c++;
  return c;
}

/** Rotate a direction mask one quarter clockwise: N→E→S→W→N. */
function rotateCW(mask: number): number {
  return ((mask << 1) | (mask >> 3)) & 0b1111;
}

/** Quarters to rotate `canonical` onto `mask`, or 0 if no match. */
function matchRotation(mask: number, canonical: number): number {
  let m = canonical;
  for (let q = 0; q < 4; q++) {
    if (m === mask) return q;
    m = rotateCW(m);
  }
  return 0;
}

export interface CornerResult {
  needed: boolean;
  /** 90° clockwise turns applied to the corner asset's canonical orientation. */
  quarters: number;
}

/**
 * Decide the corner cap for a vertex from its wall-edge mask. A cap is placed at
 * L-junctions (two adjacent walls meeting at 90°). Straight pass-throughs, dead
 * ends, and T/cross junctions are left to the overlapping wall panels.
 */
export function cornerAtVertex(mask: number): CornerResult {
  if (popcount(mask) !== 2) return { needed: false, quarters: 0 };
  if (mask === (N | S) || mask === (E | W)) return { needed: false, quarters: 0 };
  return { needed: true, quarters: matchRotation(mask, N | E) };
}

/** Convert quarter turns to a Y rotation in radians (clockwise). */
export function quartersToRadians(quarters: number): number {
  return -quarters * (Math.PI / 2);
}
