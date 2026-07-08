/**
 * HouseGenerator
 * --------------
 * The pipeline. It takes a logical `HouseLayout` + an `AssetRegistry` and runs
 * every stage — auto-tile walls, place furniture, decorate rooms, build
 * colliders, compute the floor, add room lighting, derive the nav grid — into a
 * single pure-data `HouseScene` the renderer draws. This is the one module that
 * knows about all the others; each of those has a single responsibility and no
 * knowledge of the rest.
 *
 * Swapping the registry (and/or layout) re-themes the whole world without
 * touching this orchestration, which is the extensibility goal.
 */

import type { HouseScene, PlacedLight, PlacedModel } from './HouseTypes';
import {
  type HouseLayout,
  type RoomType,
  cellToWorld,
  gridSize,
  isWalkable,
  createDefaultHouse,
  WALL_HEIGHT,
  PLAYER_SPAWN_Y,
} from './HouseLayout';
import { HOUSE_ASSETS, type AssetRegistry, getAsset } from './HouseAssets';
import { resolveWall, resolveOpening, quartersToRadians } from './AutoTile';
import { collectPlacements, spawnFurniture, FURNITURE_ASSET } from './FurnitureSpawner';
import { decorateRooms } from './RoomDecorator';
import { buildColliders } from './CollisionBuilder';
import { computeFloor } from './Floor';

/** Per-room-type lighting (goal 14). Colour/intensity are tunable. */
const LIGHTING: Record<RoomType, { color: string; intensity: number; distance: number }> = {
  living: { color: '#ffd9a8', intensity: 24, distance: 22 },
  kitchen: { color: '#eef4ff', intensity: 34, distance: 24 },
  bedroom: { color: '#ffbf80', intensity: 14, distance: 18 },
  bathroom: { color: '#eaf3ff', intensity: 20, distance: 16 },
  office: { color: '#dfe8ff', intensity: 26, distance: 20 },
  hallway: { color: '#ffcf9a', intensity: 12, distance: 16 },
};

const cellKey = (col: number, row: number) => `${col},${row}`;

export function generateHouse(layout: HouseLayout, registry: AssetRegistry = HOUSE_ASSETS): HouseScene {
  const { cols, rows } = gridSize(layout.tiles);
  const models: PlacedModel[] = [];

  // 1) Walls + openings, auto-tiled from adjacency.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const t = layout.tiles[row][col];
      const [x, , z] = cellToWorld(col, row, cols, rows);
      if (t === 'wall') {
        const r = resolveWall(layout.tiles, col, row);
        models.push({ assetKey: r.assetKey, position: [x, 0, z], rotationY: quartersToRadians(r.quarters), footprint: [1, 1], source: 'wall', wallMask: r.mask });
      } else if (t === 'door' || t === 'window') {
        const r = resolveOpening(layout.tiles, col, row, t);
        models.push({ assetKey: r.assetKey, position: [x, 0, z], rotationY: quartersToRadians(r.quarters), footprint: [1, 1], source: 'opening', wallMask: r.mask });
      }
    }
  }

  // 2) Occupancy of solid furniture cells (seed for decorator + nav grid).
  const occupied = new Set<string>();
  for (const p of collectPlacements(layout)) {
    if (getAsset(registry, FURNITURE_ASSET[p.type]).collider !== 'none') occupied.add(cellKey(p.col, p.row));
  }

  // 3) Explicit furniture + auto room decorations.
  models.push(...spawnFurniture(layout, registry));
  models.push(...decorateRooms(layout, registry, occupied));

  // 4) Colliders, floor, lights.
  const colliders = buildColliders(models, registry);
  const floor = computeFloor(layout.tiles);
  const lights: PlacedLight[] = layout.rooms.map((room) => {
    const cCol = room.rect.col + (room.rect.w - 1) / 2;
    const cRow = room.rect.row + (room.rect.h - 1) / 2;
    const [x, , z] = cellToWorld(cCol, cRow, cols, rows);
    const l = LIGHTING[room.type];
    return { position: [x, WALL_HEIGHT - 0.3, z], color: l.color, intensity: l.intensity, distance: l.distance, roomType: room.type, roomId: room.id };
  });

  // 5) Nav grid: walkable tiles minus solid furniture (goal 15).
  const navGrid = layout.tiles.map((line, row) =>
    line.map((t, col) => isWalkable(t) && !occupied.has(cellKey(col, row))),
  );

  const [sx, , sz] = cellToWorld(layout.spawn.col, layout.spawn.row, cols, rows);

  return {
    floor,
    models,
    colliders,
    lights,
    spawn: [sx, PLAYER_SPAWN_Y, sz],
    navGrid,
    grid: { cols, rows },
  };
}

// Memoized default scene so the renderer and the Player share one spawn/layout.
let cached: HouseScene | undefined;
export function getDefaultHouseScene(): HouseScene {
  if (!cached) cached = generateHouse(createDefaultHouse(), HOUSE_ASSETS);
  return cached;
}
