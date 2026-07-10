/**
 * StationShell
 * ------------
 * Draws the station building from the ASCII map with CELL-CENTERED walls,
 * using the real Kenney Space Station Kit pieces:
 *
 *  - '#'  wall.glb — a full straight per through-axis; 0.65-length "arms"
 *          (a slightly squashed wall.glb) for elbows / T-branches so corners
 *          stay watertight without guessing corner-piece orientations.
 *  - 'D'  wall-door.glb — a wall panel with an open doorway (passable; only
 *          the side posts collide).
 *  - 'W'  wall-window.glb — solid.
 *  - floors: station floor.glb (0.3 thick, sunk so its surface is y=0) with
 *          floor-detail.glb sprinkled in, plus the arcade kit's checkered
 *          floor overlaid in the arcade room.
 *
 * Everything is instanced (one draw call per unique mesh), and colliders are
 * simple per-cell boxes derived from the same map.
 */

import { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { InstancedKit, type KitTransform } from './InstancedKit';
import { SafeModel } from './Props';
import {
  COLS,
  ROWS,
  ROOMS,
  TILE,
  KIT_SCALE,
  WALL_HEIGHT,
  cellAt,
  isWallish,
  tileToWorld,
} from './StationMap';

const S = '/models/station/';
const ARM_LEN = 0.65; // fraction of a wall panel used for elbow/T arms
const ARM_OFF = (0.5 - ARM_LEN / 2) * KIT_SCALE; // shift arm toward its neighbour

interface ShellData {
  floors: KitTransform[];
  floorPanels: KitTransform[];
  arcadeFloor: KitTransform[];
  walls: KitTransform[];
  doors: KitTransform[];
  windows: KitTransform[];
  colliders: { position: [number, number, number]; half: [number, number, number] }[];
}

function buildShell(): ShellData {
  const d: ShellData = {
    floors: [],
    floorPanels: [],
    arcadeFloor: [],
    walls: [],
    doors: [],
    windows: [],
    colliders: [],
  };
  const halfWall: [number, number, number] = [TILE / 2, WALL_HEIGHT / 2, TILE / 2];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(c, r);
      if (cell === ' ') continue;
      const [x, , z] = tileToWorld(c, r);

      // Floor under every interior cell (walls included, for seamless edges).
      // Station floor tiles are 0.3 units thick — sink them so the top is y=0.
      const floorT: KitTransform = { position: [x, -0.3 * KIT_SCALE, z], scale: KIT_SCALE };
      if (cell !== '#' && cell !== 'W' && (c * 7 + r * 13) % 5 === 0) d.floorPanels.push(floorT);
      else d.floors.push(floorT);

      const n = isWallish(c, r - 1);
      const s = isWallish(c, r + 1);
      const e = isWallish(c + 1, r);
      const w = isWallish(c - 1, r);
      // Wall pieces run along X natively; N–S runs need a 90° turn.
      const runsX = e || w;
      const rotY = runsX ? 0 : Math.PI / 2;

      if (cell === 'D') {
        d.doors.push({ position: [x, 0, z], rotationY: rotY, scale: KIT_SCALE });
        // Only the door posts collide — the opening stays passable.
        const postOff = 0.4 * TILE;
        const post: [number, number, number] = runsX
          ? [0.1 * TILE, WALL_HEIGHT / 2, 0.15 * TILE]
          : [0.15 * TILE, WALL_HEIGHT / 2, 0.1 * TILE];
        for (const sgn of [-1, 1]) {
          d.colliders.push({
            position: runsX ? [x + sgn * postOff, WALL_HEIGHT / 2, z] : [x, WALL_HEIGHT / 2, z + sgn * postOff],
            half: post,
          });
        }
        continue;
      }

      if (cell === 'W') {
        d.windows.push({ position: [x, 0, z], rotationY: rotY, scale: KIT_SCALE });
        d.colliders.push({ position: [x, WALL_HEIGHT / 2, z], half: halfWall });
        continue;
      }

      if (cell === '#') {
        // Straight-through runs get a full panel per axis; lone branches get
        // a 0.65-length arm shifted toward the neighbour (covers the corner).
        if (e && w) d.walls.push({ position: [x, 0, z], rotationY: 0, scale: KIT_SCALE });
        else if (e) d.walls.push({ position: [x + ARM_OFF, 0, z], rotationY: 0, scale: [ARM_LEN * KIT_SCALE, KIT_SCALE, KIT_SCALE] });
        else if (w) d.walls.push({ position: [x - ARM_OFF, 0, z], rotationY: 0, scale: [ARM_LEN * KIT_SCALE, KIT_SCALE, KIT_SCALE] });

        if (n && s) d.walls.push({ position: [x, 0, z], rotationY: Math.PI / 2, scale: KIT_SCALE });
        else if (n) d.walls.push({ position: [x, 0, z - ARM_OFF], rotationY: Math.PI / 2, scale: [ARM_LEN * KIT_SCALE, KIT_SCALE, KIT_SCALE] });
        else if (s) d.walls.push({ position: [x, 0, z + ARM_OFF], rotationY: Math.PI / 2, scale: [ARM_LEN * KIT_SCALE, KIT_SCALE, KIT_SCALE] });

        if (!n && !s && !e && !w) d.walls.push({ position: [x, 0, z], scale: KIT_SCALE });
        d.colliders.push({ position: [x, WALL_HEIGHT / 2, z], half: halfWall });
      }
    }
  }

  // Arcade room gets the checkered arcade floor laid on top (0.03 thick).
  const a = ROOMS.arcade;
  for (let r = a.r0; r <= a.r1; r++) {
    for (let c = a.c0; c <= a.c1; c++) {
      const [x, , z] = tileToWorld(c, r);
      d.arcadeFloor.push({ position: [x, 0.005, z], scale: KIT_SCALE });
    }
  }

  return d;
}

// Pure data — computed once at module load so colliders never wait on assets.
const SHELL = buildShell();

/**
 * Physics-only half of the station. Rendered OUTSIDE every Suspense boundary
 * so the ground exists the instant physics starts — otherwise the player
 * capsule free-falls through the world while the GLBs are still streaming in.
 */
export function StationColliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* Ground slab under the whole world (station floor tops sit at y=0). */}
      <CuboidCollider args={[95, 1, 75]} position={[0, -1, 0]} />
      {/* World fences so the player can't wander off into the void. */}
      <CuboidCollider args={[95, 4, 1]} position={[0, 2, -52]} />
      <CuboidCollider args={[95, 4, 1]} position={[0, 2, 52]} />
      <CuboidCollider args={[1, 4, 75]} position={[-62, 2, 0]} />
      <CuboidCollider args={[1, 4, 75]} position={[62, 2, 0]} />
      {SHELL.colliders.map((c, i) => (
        <CuboidCollider key={i} args={c.half} position={c.position} />
      ))}
    </RigidBody>
  );
}

export function StationShell() {
  const shell = SHELL;

  return (
    <>
      <SafeModel>
        <InstancedKit url={S + 'floor.glb'} transforms={shell.floors} castShadow={false} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url={S + 'floor-detail.glb'} transforms={shell.floorPanels} castShadow={false} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url="/models/arcade/floor.glb" transforms={shell.arcadeFloor} castShadow={false} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url={S + 'wall.glb'} transforms={shell.walls} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url={S + 'wall-door.glb'} transforms={shell.doors} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url={S + 'wall-window.glb'} transforms={shell.windows} />
      </SafeModel>
    </>
  );
}
