/**
 * HouseShell
 * ----------
 * Turns the ownership grid in HouseMap into a house, using the real Kenney
 * Furniture Kit shell pieces. Nothing here is authored by hand: every wall is
 * derived from a boundary between two different owners.
 *
 *  - floors   floorFull.glb per cell, tinted per room so the rooms read apart
 *  - walls    wall.glb on every boundary edge
 *  - doors    wallDoorwayWide.glb on the edges listed in HouseMap.DOORS
 *             (roughly 86% of a tile wide — comfortably walk-through), plus a
 *             swung-open door leaf at the front step
 *  - windows  wallWindow.glb sprinkled along the exterior edges
 *  - roof     a procedural eaves band + chimney, so the place reads as a
 *             house from the garden without a ceiling that hides the rooms
 *
 * Colliders come from the same edge list — full slabs for walls and windows,
 * jambs + a header for doorways.
 */

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { InstancedKit, InstancedShapes, type KitTransform } from './InstancedKit';
import { SafeModel } from './Props';
import {
  ARCH_SCALE,
  COLS,
  ROWS,
  TILE,
  KIT_SCALE,
  WALL_HEIGHT,
  WALL_COLLIDER_T,
  EDGE_OFF,
  DOOR_GAP,
  DOOR_TOP,
  PLAYER_CLEAR,
  DOORS,
  HOUSE,
  FRONT_DOOR,
  edgeKey,
  roomAt,
  tileToWorld,
  type Room,
  type Side,
} from './HouseMap';

const F = '/models/furniture/';

/** Subtle per-room floor tints (multiplied into the kit's wood colour). */
const FLOOR_TINT: Record<Room, string> = {
  K: '#e8ded2', // pale boards, kitchen/diner
  S: '#cdb79c', // warm oak, study
  H: '#dcd0c0', // hall
  L: '#c9a887', // deeper stain, living room
  G: '#9d8672', // dark boards, games den
};

const ROOF_COLOR = '#a8574a';
/** The kit's plaster is a cool grey; a warm tint reads as a home, not an office. */
const WALL_TINT = '#fff0dd';
/**
 * Roof/chimney/porch dimensions are hand-authored absolutes (not derived from
 * a GLB), so unlike the wall/door/window kit pieces they don't grow for free
 * when ARCH_SCALE changes — each is scaled by it explicitly below.
 */
const EAVE_H = 0.18 * ARCH_SCALE;
const EAVE_OUT = 0.62 * ARCH_SCALE; // how far the roof oversails the wall

interface Collider {
  position: [number, number, number];
  half: [number, number, number];
}

interface ShellData {
  floors: Record<Room, KitTransform[]>;
  walls: KitTransform[];
  doors: KitTransform[];
  windows: KitTransform[];
  eaves: KitTransform[];
  colliders: Collider[];
}

const xc = (c: number) => tileToWorld(c, 0)[0];
const zc = (r: number) => tileToWorld(0, r)[2];

/** Exterior edges get a window on a fixed, repeatable rhythm. */
function wantsWindow(c: number, r: number, side: Side): boolean {
  return (c * 5 + r * 4 + (side === 'N' ? 0 : 2)) % 3 === 1;
}

function buildShell(): ShellData {
  const d: ShellData = {
    floors: { K: [], S: [], H: [], L: [], G: [] },
    walls: [],
    doors: [],
    windows: [],
    eaves: [],
    colliders: [],
  };

  // ── Floors: one kit tile per owned cell. floorFull's pivot is the tile's
  //    (-X, +Z) corner and it is 0.05 thick, so sink it to put the top at y=0.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const room = roomAt(c, r);
      if (!room) continue;
      d.floors[room].push({
        position: [xc(c) - TILE / 2, -0.05 * KIT_SCALE, zc(r) + TILE / 2],
        scale: KIT_SCALE,
      });
    }
  }

  // ── Walls: one panel per boundary edge. `N` sits between (c, r-1) and
  //    (c, r); `W` between (c-1, r) and (c, r). Sweeping one past the grid on
  //    each axis catches the outside faces too.
  const addEdge = (c: number, r: number, side: Side) => {
    const inA = roomAt(...(side === 'N' ? ([c, r - 1] as const) : ([c - 1, r] as const)));
    const inB = roomAt(c, r);
    if (inA === inB) return; // same room (or both outdoors) — no wall
    const exterior = inA === null || inB === null;

    const isDoor = DOORS.has(edgeKey(c, r, side));
    const isWindow = !isDoor && exterior && wantsWindow(c, r, side);

    // Panels are authored along +X with their thickness in -Z; EDGE_OFF
    // straddles them over the edge line, and -90° stands them along Z.
    const runsX = side === 'N';
    const t: KitTransform = runsX
      ? { position: [xc(c) - TILE / 2, 0, zc(r) - TILE / 2 + EDGE_OFF], rotationY: 0, scale: KIT_SCALE }
      : { position: [xc(c) - TILE / 2 - EDGE_OFF, 0, zc(r) - TILE / 2], rotationY: -Math.PI / 2, scale: KIT_SCALE };

    if (isDoor) d.doors.push(t);
    else if (isWindow) d.windows.push(t);
    else d.walls.push(t);

    // ── Colliders ─────────────────────────────────────────────────────────
    // `ex`/`ez` is the middle of the edge; `slab` builds a box of a given
    // half-length along the edge and half-height, oriented with the wall.
    const ex = runsX ? xc(c) : xc(c) - TILE / 2;
    const ez = runsX ? zc(r) - TILE / 2 : zc(r);
    const slab = (halfLen: number, halfH: number, offset: number, y: number): Collider => ({
      position: runsX ? [ex + offset, y, ez] : [ex, y, ez + offset],
      half: runsX ? [halfLen, halfH, WALL_COLLIDER_T / 2] : [WALL_COLLIDER_T / 2, halfH, halfLen],
    });

    if (isDoor) {
      // Two jambs and a header, leaving a ~1-unit gap the player fits through.
      // The header starts above PLAYER_CLEAR (see HouseMap) — hung at the
      // visual lintel it would catch the capsule and tip the player over.
      const jamb = Math.max((DOOR_GAP * TILE) / 2, 0.125);
      const base = Math.max(DOOR_TOP, PLAYER_CLEAR);
      const headerH = Math.max(0.05, (WALL_HEIGHT - base) / 2);
      for (const sgn of [-1, 1]) d.colliders.push(slab(jamb, WALL_HEIGHT / 2, sgn * (TILE / 2 - jamb), WALL_HEIGHT / 2));
      d.colliders.push(slab(TILE / 2, headerH, 0, base + headerH));
    } else {
      d.colliders.push(slab(TILE / 2, WALL_HEIGHT / 2, 0, WALL_HEIGHT / 2));
    }

    // ── Eaves: only on the outside face, oversailing the wall. ────────────
    if (exterior) {
      // The outdoor side is whichever neighbour came back null.
      const outward = inB === null ? 1 : -1;
      const shift = outward * (EAVE_OUT / 2 - 0.1);
      d.eaves.push({
        position: runsX
          ? [ex, WALL_HEIGHT + EAVE_H / 2, ez + shift]
          : [ex + shift, WALL_HEIGHT + EAVE_H / 2, ez],
        scale: runsX ? [TILE + EAVE_OUT, EAVE_H, EAVE_OUT] : [EAVE_OUT, EAVE_H, TILE + EAVE_OUT],
      });
    }
  };

  for (let r = 0; r <= ROWS; r++) {
    for (let c = 0; c <= COLS; c++) {
      if (c < COLS) addEdge(c, r, 'N');
      if (r < ROWS) addEdge(c, r, 'W');
    }
  }

  return d;
}

// Pure data — computed once at module load so colliders never wait on assets.
const SHELL = buildShell();

/**
 * Footprints of everything in the shell that stands on the floor, for NavGrid.
 * Door headers are excluded — they hang above head height, so the player walks
 * straight under them and a path must be allowed through.
 */
export const WALL_BLOCKERS = SHELL.colliders
  .filter((c) => c.position[1] - c.half[1] < 0.8)
  .map((c) => ({
    minX: c.position[0] - c.half[0],
    maxX: c.position[0] + c.half[0],
    minZ: c.position[2] - c.half[2],
    maxZ: c.position[2] + c.half[2],
  }));

/**
 * Physics-only half of the house. Rendered OUTSIDE every Suspense boundary so
 * the ground exists the instant physics starts — otherwise the player capsule
 * free-falls through the world while the GLBs are still streaming in.
 */
export function HouseColliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* Ground slab under the whole world (floor tops sit at y=0). */}
      <CuboidCollider args={[48, 1, 40]} position={[0, -1, 0]} />
      {/* Boundary so the player can't wander off into the void: the plot, plus
          the street and the pavement in front of the neighbours' houses. */}
      <CuboidCollider args={[34, 4, 1]} position={[0, 2, -26]} />
      <CuboidCollider args={[34, 4, 1]} position={[0, 2, 30]} />
      <CuboidCollider args={[1, 4, 30]} position={[-31, 2, 2]} />
      <CuboidCollider args={[1, 4, 30]} position={[31, 2, 2]} />
      {SHELL.colliders.map((c, i) => (
        <CuboidCollider key={i} args={c.half} position={c.position} />
      ))}
    </RigidBody>
  );
}

export function HouseShell() {
  return (
    <>
      {(Object.keys(SHELL.floors) as Room[]).map((room) => (
        <SafeModel key={room}>
          <InstancedKit
            url={F + 'floorFull.glb'}
            transforms={SHELL.floors[room]}
            tint={FLOOR_TINT[room]}
            castShadow={false}
          />
        </SafeModel>
      ))}

      <SafeModel>
        <InstancedKit url={F + 'wall.glb'} transforms={SHELL.walls} tint={WALL_TINT} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url={F + 'wallDoorwayWide.glb'} transforms={SHELL.doors} tint={WALL_TINT} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url={F + 'wallWindow.glb'} transforms={SHELL.windows} tint={WALL_TINT} />
      </SafeModel>

      {/* Roof: an eaves band round the outside plus a chimney on the west
          gable. No ceiling — the rooms have to stay visible from above. */}
      <InstancedShapes transforms={SHELL.eaves} receiveShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.85} />
      </InstancedShapes>
      <mesh position={[HOUSE.minX + 0.05 * ARCH_SCALE, WALL_HEIGHT + 0.75 * ARCH_SCALE, 0.75 * ARCH_SCALE]} castShadow>
        <boxGeometry args={[0.75 * ARCH_SCALE, 1.5 * ARCH_SCALE, 0.85 * ARCH_SCALE]} />
        <meshStandardMaterial color="#9c6a55" roughness={0.9} />
      </mesh>
      <mesh position={[HOUSE.minX + 0.05 * ARCH_SCALE, WALL_HEIGHT + 1.55 * ARCH_SCALE, 0.75 * ARCH_SCALE]} castShadow>
        <boxGeometry args={[0.95 * ARCH_SCALE, 0.18 * ARCH_SCALE, 1.05 * ARCH_SCALE]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.85} />
      </mesh>

      {/* Porch: a canopy over the front step on two posts. */}
      <mesh position={[FRONT_DOOR.x, WALL_HEIGHT + EAVE_H / 2, FRONT_DOOR.z + 0.75 * ARCH_SCALE]} castShadow>
        <boxGeometry args={[3 * ARCH_SCALE, EAVE_H, 1.7 * ARCH_SCALE]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.85} />
      </mesh>
      {[-1.25 * ARCH_SCALE, 1.25 * ARCH_SCALE].map((dx) => (
        <mesh key={dx} position={[FRONT_DOOR.x + dx, WALL_HEIGHT / 2, FRONT_DOOR.z + 1.35 * ARCH_SCALE]} castShadow>
          <boxGeometry args={[0.15 * ARCH_SCALE, WALL_HEIGHT, 0.15 * ARCH_SCALE]} />
          <meshStandardMaterial color="#e8e2d6" roughness={0.9} />
        </mesh>
      ))}

      {/* The front door itself, standing open against the porch wall. */}
      <SafeModel>
        <InstancedKit
          url={F + 'doorwayFront.glb'}
          transforms={[
            {
              position: [FRONT_DOOR.x - TILE * 0.42, 0, FRONT_DOOR.z - 0.1 * ARCH_SCALE],
              rotationY: -Math.PI / 2.3,
              scale: KIT_SCALE,
            },
          ]}
        />
      </SafeModel>
    </>
  );
}
