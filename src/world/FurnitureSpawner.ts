/**
 * FurnitureSpawner
 * ----------------
 * Turns logical furniture placements into renderable `PlacedModel`s, resolving
 * each `FurnitureType` to an `AssetKey` via the registry (goal 4) and applying
 * optional rotation (goal 7).
 *
 * `autoFaceRotation` is the extension point for "intelligent" rotation: today it
 * turns an un-rotated chair toward the nearest table/desk; the same hook can grow
 * to align beds to walls, sofas to TVs, etc.
 */

import type { PlacedModel } from './HouseTypes';
import { type AssetKey, type AssetRegistry, getAsset } from './HouseAssets';
import {
  type FurniturePlacement,
  type FurnitureType,
  type HouseLayout,
  cellToWorld,
  gridSize,
  FLOOR_Y,
} from './HouseLayout';

/** Logical furniture → asset key. The only furniture↔asset mapping in the app. */
export const FURNITURE_ASSET: Record<FurnitureType, AssetKey> = {
  sofa: 'sofa',
  chair: 'chair',
  table: 'table',
  bed: 'bed',
  bookshelf: 'bookshelf',
  desk: 'desk',
  coffeeTable: 'coffeeTable',
  rug: 'rug',
  lamp: 'lamp',
  tv: 'tv',
  plant: 'plant',
  refrigerator: 'refrigerator',
  microwave: 'microwave',
  fruitBowl: 'fruitBowl',
  toaster: 'toaster',
  kitchenCabinet: 'kitchenCabinet',
  nightstand: 'nightstand',
  dresser: 'dresser',
  toilet: 'toilet',
  bathtub: 'bathtub',
  sink: 'sink',
};

const degToRad = (d: number) => (d * Math.PI) / 180;

export function collectPlacements(layout: HouseLayout): FurniturePlacement[] {
  return [...layout.furniture];
}

/** Intelligent-rotation hook: face chairs toward the nearest table/desk. */
export function autoFaceRotation(p: FurniturePlacement, all: FurniturePlacement[]): number {
  if (p.type !== 'chair') return 0;
  const targets = all.filter((t) => t.type === 'table' || t.type === 'desk');
  if (!targets.length) return 0;
  let best = targets[0];
  let bestDist = Infinity;
  for (const t of targets) {
    const d = (t.col - p.col) ** 2 + (t.row - p.row) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return Math.atan2(best.col - p.col, best.row - p.row);
}

export function spawnFurniture(layout: HouseLayout, registry: AssetRegistry): PlacedModel[] {
  const { cols, rows } = gridSize(layout.tiles);
  const placements = collectPlacements(layout);

  return placements.map((p) => {
    const assetKey = FURNITURE_ASSET[p.type];
    const def = getAsset(registry, assetKey);
    const [x, , z] = cellToWorld(p.col, p.row, cols, rows);
    const rotationY = p.rotation !== undefined ? degToRad(p.rotation) : autoFaceRotation(p, placements);
    return {
      assetKey,
      position: [x, FLOOR_Y, z],
      rotationY,
      footprint: def.footprint ?? [1, 1],
      source: 'furniture',
      roomId: p.roomId,
    };
  });
}
