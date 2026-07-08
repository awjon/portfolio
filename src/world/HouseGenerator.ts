/**
 * HouseGenerator
 * --------------
 * The pipeline. Takes a logical `HouseLayout` + an `AssetRegistry` and runs every
 * stage into a single pure-data `HouseScene` the renderer draws:
 *   - walls from ownership-boundary EDGES (Kenney-style), oriented by edge kind,
 *   - corner caps at L-junction VERTICES (AutoTile),
 *   - doors/windows as flagged edges,
 *   - furniture from cells, decorations per room,
 *   - thin edge colliders + furniture colliders,
 *   - one floor, per-room lighting, and a walkable nav grid.
 *
 * Swapping the registry (and/or layout) re-themes the whole world without
 * touching this orchestration.
 */

import type { HouseScene, PlacedLight, PlacedModel } from './HouseTypes';
import {
  type HouseLayout,
  type RoomType,
  type EdgeRef,
  boundaryEdges,
  edgeKey,
  edgeToWorld,
  vertexToWorld,
  cellToWorld,
  gridSize,
  isWalkable,
  createDefaultHouse,
  TILE_SIZE,
  WALL_HEIGHT,
  PLAYER_SPAWN_Y,
} from './HouseLayout';
import { HOUSE_ASSETS, type AssetRegistry, getAsset } from './HouseAssets';
import { N, E, S, W, cornerAtVertex, quartersToRadians } from './AutoTile';
import { collectPlacements, spawnFurniture, FURNITURE_ASSET } from './FurnitureSpawner';
import { decorateRooms } from './RoomDecorator';
import { buildColliders } from './CollisionBuilder';
import { computeFloor } from './Floor';

const LIGHTING: Record<RoomType, { color: string; intensity: number; distance: number }> = {
  living: { color: '#ffd9a8', intensity: 24, distance: 26 },
  kitchen: { color: '#eef4ff', intensity: 34, distance: 28 },
  bedroom: { color: '#ffbf80', intensity: 14, distance: 22 },
  bathroom: { color: '#eaf3ff', intensity: 20, distance: 18 },
  office: { color: '#dfe8ff', intensity: 26, distance: 22 },
  hallway: { color: '#ffcf9a', intensity: 12, distance: 18 },
};

const cellKey = (col: number, row: number) => `${col},${row}`;
// Kenney wall panels run along +X natively → V edges (running N–S) turn 90°.
const edgeRotation = (kind: 'H' | 'V') => (kind === 'V' ? Math.PI / 2 : 0);

export function generateHouse(layout: HouseLayout, registry: AssetRegistry = HOUSE_ASSETS): HouseScene {
  const { cols, rows } = gridSize(layout.tiles);
  const models: PlacedModel[] = [];

  const doorSet = new Set(layout.doors.map(edgeKey));
  const windowSet = new Set(layout.windows.map(edgeKey));
  const walls = boundaryEdges(layout.owner, cols, rows);
  const wallSet = new Set(walls.map((w) => edgeKey(w.edge)));

  // 1) Walls / doors / windows on boundary edges.
  for (const { edge } of walls) {
    const k = edgeKey(edge);
    const pos = edgeToWorld(edge, cols, rows);
    const rotationY = edgeRotation(edge.kind);
    const isDoor = doorSet.has(k);
    const isWindow = windowSet.has(k);
    models.push({
      assetKey: isDoor ? 'door' : isWindow ? 'window' : 'wallStraight',
      position: pos,
      rotationY,
      footprint: [1, 1],
      source: isDoor || isWindow ? 'opening' : 'wall',
      fit: [TILE_SIZE, WALL_HEIGHT],
    });
  }

  // 2) Corner caps at L-junction vertices.
  const hasWall = (e: EdgeRef) => wallSet.has(edgeKey(e));
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      let mask = 0;
      if (hasWall({ kind: 'V', col, row: row - 1 })) mask |= N;
      if (hasWall({ kind: 'V', col, row })) mask |= S;
      if (hasWall({ kind: 'H', col, row })) mask |= E;
      if (hasWall({ kind: 'H', col: col - 1, row })) mask |= W;
      const c = cornerAtVertex(mask);
      if (!c.needed) continue;
      models.push({
        assetKey: 'wallCorner',
        position: vertexToWorld(col, row, cols, rows),
        rotationY: quartersToRadians(c.quarters),
        footprint: [1, 1],
        source: 'corner',
        fit: [0, WALL_HEIGHT],
      });
    }
  }

  // 3) Solid-furniture occupancy (seed for decorator + nav grid).
  const occupied = new Set<string>();
  for (const p of collectPlacements(layout)) {
    if (getAsset(registry, FURNITURE_ASSET[p.type]).collider !== 'none') occupied.add(cellKey(p.col, p.row));
  }

  // 4) Explicit furniture + auto room decorations.
  models.push(...spawnFurniture(layout, registry));
  models.push(...decorateRooms(layout, registry, occupied));

  // 5) Colliders, floor, lights.
  const colliders = buildColliders(models, registry);
  const floor = computeFloor(layout.tiles);
  const lights: PlacedLight[] = layout.rooms.map((room) => {
    const cCol = room.rect.col + (room.rect.w - 1) / 2;
    const cRow = room.rect.row + (room.rect.h - 1) / 2;
    const [x, , z] = cellToWorld(cCol, cRow, cols, rows);
    const l = LIGHTING[room.type];
    return { position: [x, WALL_HEIGHT - 0.3, z], color: l.color, intensity: l.intensity, distance: l.distance, roomType: room.type, roomId: room.id };
  });

  // 6) Nav grid: walkable tiles minus solid furniture (goal 15).
  const navGrid = layout.tiles.map((line, row) =>
    line.map((t, col) => isWalkable(t) && !occupied.has(cellKey(col, row))),
  );

  const [sx, , sz] = cellToWorld(layout.spawn.col, layout.spawn.row, cols, rows);

  return { floor, models, colliders, lights, spawn: [sx, PLAYER_SPAWN_Y, sz], navGrid, grid: { cols, rows } };
}

// Memoized default scene so the renderer and the Player share one spawn/layout.
let cached: HouseScene | undefined;
export function getDefaultHouseScene(): HouseScene {
  if (!cached) cached = generateHouse(createDefaultHouse(), HOUSE_ASSETS);
  return cached;
}
