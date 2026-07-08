/**
 * CollisionBuilder
 * ----------------
 * Generates colliders from the placed models automatically (goal 6). Policy lives
 * in the asset registry (`collider: 'none' | 'cuboid' | 'doorframe'`), so walls,
 * cabinets, tables and bookshelves block while rugs, lamps and plants don't — no
 * collision meshes are maintained by hand.
 *
 *  - Walls / windows → a thin box along the edge (orientation from the model's
 *    yaw), so rooms keep their full floor space.
 *  - Doors → passable (the opening spans the edge).
 *  - Corner caps → cosmetic, no collider (the wall panels already block).
 *  - Solid furniture → one box sized from its footprint.
 */

import type { ColliderSpec, PlacedModel } from './HouseTypes';
import { type AssetRegistry, getAsset } from './HouseAssets';
import { TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS } from './HouseLayout';

const HALF_T = WALL_THICKNESS / 2;
const HALF_LEN = TILE_SIZE / 2;
const HALF_H = WALL_HEIGHT / 2;

function wallBox(model: PlacedModel): ColliderSpec {
  const [x, , z] = model.position;
  // rotationY 0 → runs along X (H edge); ~90° → runs along Z (V edge).
  const vertical = Math.abs(model.rotationY) > 0.1;
  const halfExtents: [number, number, number] = vertical
    ? [HALF_T, HALF_H, HALF_LEN]
    : [HALF_LEN, HALF_H, HALF_T];
  return { position: [x, HALF_H, z], halfExtents, rotationY: 0 };
}

function furnitureBox(model: PlacedModel, height: number): ColliderSpec {
  const [x, , z] = model.position;
  const [fw, fh] = model.footprint;
  const halfX = Math.max(0.4, fw * TILE_SIZE * 0.2);
  const halfZ = Math.max(0.4, fh * TILE_SIZE * 0.2);
  const halfY = Math.max(0.3, height / 2);
  return { position: [x, halfY, z], halfExtents: [halfX, halfY, halfZ], rotationY: model.rotationY };
}

export function buildColliders(models: PlacedModel[], registry: AssetRegistry): ColliderSpec[] {
  const out: ColliderSpec[] = [];
  for (const model of models) {
    if (model.source === 'corner') continue; // cosmetic
    if (model.source === 'wall') {
      out.push(wallBox(model));
      continue;
    }
    if (model.source === 'opening') {
      if (model.assetKey === 'window') out.push(wallBox(model)); // solid; doors stay passable
      continue;
    }
    // furniture / decoration
    const def = getAsset(registry, model.assetKey);
    if (def.collider === 'none') continue;
    out.push(furnitureBox(model, def.placeholder.height));
  }
  return out;
}
