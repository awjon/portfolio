/**
 * CollisionBuilder
 * ----------------
 * Generates colliders from the placed models automatically (goal 6). The policy
 * lives in the asset registry (`collider: 'none' | 'cuboid' | 'doorframe'`), so
 * walls, cabinets, tables and bookshelves block while rugs, lamps and plants do
 * not — no collision meshes are maintained by hand.
 *
 *  - Walls/windows → thin segments following the actual connection mask, so a
 *    corner blocks an L (not the whole cell) and rooms keep their floor space.
 *  - Doors → two side jambs with a passable gap in the middle, so the player can
 *    still walk between rooms.
 *  - Solid furniture → a single box sized from its footprint.
 */

import type { ColliderSpec, PlacedModel } from './HouseTypes';
import { type AssetRegistry, getAsset } from './HouseAssets';
import { TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS } from './HouseLayout';
import { N, E, S, W } from './AutoTile';

const T = WALL_THICKNESS / 2; // half wall thickness
const ARM = TILE_SIZE / 4; // half length of a wall arm (centre → edge is TILE/2)

function wallArms(model: PlacedModel): ColliderSpec[] {
  const [x, , z] = model.position;
  const hy = WALL_HEIGHT / 2;
  const mask = model.wallMask ?? 0;
  const specs: ColliderSpec[] = [];

  if (mask === 0) {
    // Isolated post.
    specs.push({ position: [x, hy, z], halfExtents: [T * 1.5, hy, T * 1.5], rotationY: 0 });
    return specs;
  }
  if (mask & N) specs.push({ position: [x, hy, z - ARM], halfExtents: [T, hy, ARM], rotationY: 0 });
  if (mask & S) specs.push({ position: [x, hy, z + ARM], halfExtents: [T, hy, ARM], rotationY: 0 });
  if (mask & E) specs.push({ position: [x + ARM, hy, z], halfExtents: [ARM, hy, T], rotationY: 0 });
  if (mask & W) specs.push({ position: [x - ARM, hy, z], halfExtents: [ARM, hy, T], rotationY: 0 });
  return specs;
}

function doorFrame(model: PlacedModel): ColliderSpec[] {
  const [x, , z] = model.position;
  const hy = WALL_HEIGHT / 2;
  const mask = model.wallMask ?? 0;
  const horizontal = (mask & (E | W)) !== 0 || (mask & (N | S)) === 0; // default horizontal
  const gapHalf = TILE_SIZE * 0.35; // clear opening ≈ 2.8 units
  const jambHalf = (TILE_SIZE / 2 - gapHalf) / 2;
  const jambCentre = gapHalf + jambHalf;

  if (horizontal) {
    return [
      { position: [x - jambCentre, hy, z], halfExtents: [jambHalf, hy, T], rotationY: 0 },
      { position: [x + jambCentre, hy, z], halfExtents: [jambHalf, hy, T], rotationY: 0 },
    ];
  }
  return [
    { position: [x, hy, z - jambCentre], halfExtents: [T, hy, jambHalf], rotationY: 0 },
    { position: [x, hy, z + jambCentre], halfExtents: [T, hy, jambHalf], rotationY: 0 },
  ];
}

function furnitureBox(model: PlacedModel, height: number): ColliderSpec {
  const [x, , z] = model.position;
  const [fw, fh] = model.footprint;
  // Objects are smaller than their 4-unit cell; ~0.2·TILE per tile of footprint.
  const halfX = Math.max(0.4, fw * TILE_SIZE * 0.2);
  const halfZ = Math.max(0.4, fh * TILE_SIZE * 0.2);
  const halfY = Math.max(0.3, height / 2);
  return { position: [x, halfY, z], halfExtents: [halfX, halfY, halfZ], rotationY: model.rotationY };
}

export function buildColliders(models: PlacedModel[], registry: AssetRegistry): ColliderSpec[] {
  const out: ColliderSpec[] = [];
  for (const model of models) {
    const def = getAsset(registry, model.assetKey);
    if (def.collider === 'none') continue;
    if (def.collider === 'doorframe') {
      out.push(...doorFrame(model));
    } else if (model.source === 'wall' || model.source === 'opening') {
      out.push(...wallArms(model)); // solid windows included
    } else {
      out.push(furnitureBox(model, def.placeholder.height));
    }
  }
  return out;
}
