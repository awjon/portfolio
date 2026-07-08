/**
 * Floor
 * -----
 * Replaces the hundreds of individual road tiles with ONE floor sized to the
 * layout (goal 5). It measures the bounding box of every ground-bearing cell and
 * returns a single rectangle; the renderer draws one large mesh (and one ground
 * collider) from it.
 */

import type { FloorSpec } from './HouseTypes';
import { TILE_SIZE, FLOOR_Y, cellToWorld, gridSize, hasGround, type TileType } from './HouseLayout';

export function computeFloor(tiles: TileType[][]): FloorSpec {
  const { cols, rows } = gridSize(tiles);

  let minC = cols;
  let minR = rows;
  let maxC = 0;
  let maxR = 0;
  let found = false;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!hasGround(tiles[r][c])) continue;
      found = true;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
    }
  }
  if (!found) {
    minC = 0;
    minR = 0;
    maxC = cols - 1;
    maxR = rows - 1;
  }

  const [x0, , z0] = cellToWorld(minC, minR, cols, rows);
  const [x1, , z1] = cellToWorld(maxC, maxR, cols, rows);

  return {
    center: [(x0 + x1) / 2, FLOOR_Y, (z0 + z1) / 2],
    // +TILE_SIZE so the floor reaches the outer edge of the boundary cells.
    width: Math.abs(x1 - x0) + TILE_SIZE,
    depth: Math.abs(z1 - z0) + TILE_SIZE,
  };
}
