/**
 * HouseTypes
 * ----------
 * The pure-data "compiled scene" the generator produces and the renderer draws.
 * Keeping these types separate from both the layout (input) and the renderer
 * (output) is what makes the pipeline data-driven: every stage adds to a plain
 * `HouseScene`, and the R3F layer just walks it. Nothing here imports Three.js,
 * so the generation half of the engine is fully testable in isolation.
 */

import type { AssetKey } from './HouseAssets';
import type { RoomType } from './HouseLayout';

/** A single model instance to render at a world transform. */
export interface PlacedModel {
  assetKey: AssetKey;
  position: [number, number, number]; // world units
  rotationY: number; // radians
  footprint: [number, number]; // tiles (w, h) — for furniture placeholder sizing
  source: 'wall' | 'opening' | 'corner' | 'furniture' | 'decoration';
  roomId?: string;
  /**
   * Shell pieces (wall/opening/corner) are stretched to fit these world dims
   * [length, height] so any kit tiles seamlessly regardless of native size.
   * Corners fit height only (length 0 → uniform scale to height).
   */
  fit?: [number, number];
}

/** An axis-aligned (optionally yaw-rotated) box collider. */
export interface ColliderSpec {
  position: [number, number, number];
  halfExtents: [number, number, number];
  rotationY: number;
}

/** A light the renderer instantiates for a room (goal 14). */
export interface PlacedLight {
  position: [number, number, number];
  color: string;
  intensity: number;
  distance: number;
  roomType: RoomType;
  roomId: string;
}

export interface FloorSpec {
  center: [number, number, number];
  width: number; // X extent, world units
  depth: number; // Z extent, world units
}

/**
 * Everything needed to build the world, as plain data.
 * `navGrid[row][col]` marks walkable cells so a nav mesh can be generated later
 * (goal 15) without re-deriving walkability from models.
 */
export interface HouseScene {
  floor: FloorSpec;
  models: PlacedModel[];
  colliders: ColliderSpec[];
  lights: PlacedLight[];
  spawn: [number, number, number];
  navGrid: boolean[][];
  grid: { cols: number; rows: number };
}
