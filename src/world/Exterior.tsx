/**
 * Exterior
 * --------
 * A sunny suburban plot around the house: lawn, hedged boundary, a path from
 * the porch to the pavement, a quiet street with neighbouring houses, and
 * trees in the back and side gardens (which is where the animals live).
 *
 * The whole block is about half the extent of the old night-time city — see
 * the fence colliders in HouseShell for the actual walkable bounds.
 */

import { useMemo } from 'react';
import { InstancedKit, InstancedShapes, type KitTransform } from './InstancedKit';
import { Props, SafeModel, type PropSpec } from './Props';
import { FRONT_DOOR, HOUSE } from './HouseMap';

const C = '/models/city/';
const R = '/models/road/';
const F = '/models/furniture/';

const ROAD_SCALE = 4;
const ROAD_Z = 17;
const PAVEMENT_Z = 14.2;
const PATH_X = FRONT_DOOR.x;

/** Road tiles are laid on a grid anchored to the path so the crossing lines up. */
function buildRoad(): { straights: KitTransform[]; lights: KitTransform[] } {
  const straights: KitTransform[] = [];
  const lights: KitTransform[] = [];
  for (let k = -11; k <= 11; k++) {
    const x = PATH_X + k * ROAD_SCALE;
    if (k === 0) continue; // the crossing piece goes here
    straights.push({ position: [x, 0.01, ROAD_Z], scale: ROAD_SCALE });
  }
  for (const k of [-6, -3, 2, 5]) {
    lights.push({ position: [PATH_X + k * ROAD_SCALE, 0, ROAD_Z - 2.6], rotationY: Math.PI, scale: 6 });
  }
  return { straights, lights };
}

/** Low hedge round the property, with a gap where the front path crosses it. */
function buildHedge(): KitTransform[] {
  const out: KitTransform[] = [];
  const x0 = -24, x1 = 24, z0 = -21, z1 = 12.6;
  const step = 1.6;
  const box = (x: number, z: number, sx: number, sz: number) =>
    out.push({ position: [x, 0.42, z], scale: [sx, 0.84, sz] });
  for (let x = x0; x <= x1; x += step) {
    box(x, z0, step * 1.02, 0.75); // back
    if (Math.abs(x - PATH_X) > 1.8) box(x, z1, step * 1.02, 0.75); // front, minus the gate
  }
  for (let z = z0; z <= z1; z += step) {
    box(x0, z, 0.75, step * 1.02);
    box(x1, z, 0.75, step * 1.02);
  }
  return out;
}

/** [x, z, scale] — trunk + two canopy blobs are instanced from these. */
const TREES: [number, number, number][] = [
  // back garden
  [-16, -14, 1.15], [-9, -18, 0.95], [-1, -15, 1.25], [6, -18.5, 1.0], [14, -13.5, 1.1],
  [-20, -8, 0.9], [19, -8.5, 1.05],
  // side gardens
  [-15, 1, 1.0], [-17.5, 8, 0.85], [15.5, -2, 0.95], [18, 7, 1.1],
  // front garden + verge
  [-8, 10, 0.8], [7, 10.5, 0.9],
  // across the street
  [-18, 21, 1.2], [10, 20.5, 1.05], [22, 22, 0.95],
];

function buildTrees() {
  const trunks: KitTransform[] = [];
  const canopyLow: KitTransform[] = [];
  const canopyTop: KitTransform[] = [];
  TREES.forEach(([x, z, s], i) => {
    const spin = i * 1.7;
    trunks.push({ position: [x, 1.05 * s, z], rotationY: spin, scale: [0.22 * s, 2.1 * s, 0.22 * s] });
    canopyLow.push({ position: [x, 2.3 * s, z], rotationY: spin, scale: [1.5 * s, 1.15 * s, 1.5 * s] });
    canopyTop.push({ position: [x + 0.15 * s, 3.25 * s, z - 0.1 * s], rotationY: spin * 2, scale: [1.05 * s, 0.95 * s, 1.05 * s] });
  });
  return { trunks, canopyLow, canopyTop };
}

const BUILDINGS: PropSpec[] = [
  // Neighbouring houses across the street, facing back this way.
  ...(['a', 'b', 'c', 'd', 'e', 'f'] as const).map((v, i) => ({
    url: `${C}building-${v}.glb`,
    at: [-30 + i * 12, 24] as [number, number],
    rotationY: Math.PI,
    scale: 4,
    collider: true,
  })),
  // The rest of the neighbourhood, out past the back hedge.
  { url: C + 'low-detail-building-a.glb', at: [-26, -28], scale: 4 },
  { url: C + 'low-detail-building-c.glb', at: [-9, -30], scale: 4 },
  { url: C + 'low-detail-building-e.glb', at: [8, -29], scale: 4 },
  { url: C + 'low-detail-building-wide-b.glb', at: [26, -28], scale: 4 },
];

const DETAILS: PropSpec[] = [
  { url: R + 'road-crossing.glb', at: [PATH_X, ROAD_Z], offset: [0, 0.011, 0], scale: ROAD_SCALE },
  // Front garden
  { url: F + 'bench.glb', at: [4.5, 9], rotationY: Math.PI, scale: 2, collider: true },
  { url: F + 'pottedPlant.glb', at: [PATH_X - 1.6, 6.6], scale: 1.8 },
  { url: F + 'pottedPlant.glb', at: [PATH_X + 1.6, 6.6], scale: 1.8 },
  // Back garden — where most of the animals hang out
  { url: C + 'detail-parasol-a.glb', at: [-4, -10], scale: 5 },
  { url: F + 'bench.glb', at: [-7.5, -9.4], rotationY: -Math.PI / 2, scale: 2, collider: true },
  { url: F + 'bench.glb', at: [2, -11.5], rotationY: 0.4, scale: 2, collider: true },
  { url: F + 'pottedPlant.glb', at: [-6.6, -6.9], scale: 1.6 },
  { url: F + 'pottedPlant.glb', at: [-3.9, -6.9], scale: 1.6 },
  // Side gardens
  { url: C + 'detail-parasol-b.glb', at: [13, 3], scale: 5 },
  { url: F + 'bench.glb', at: [11.5, 5.4], rotationY: -Math.PI / 2, scale: 2, collider: true },
  { url: F + 'pottedPlant.glb', at: [10.6, 1.4], scale: 1.6 },
  { url: F + 'pottedPlant.glb', at: [-11, -1], scale: 1.6 },
  { url: F + 'pottedPlant.glb', at: [-11, 3.5], scale: 1.6 },
];

/** Paving: the front path, plus small pads at the back and side doors. */
const PAVING: { pos: [number, number, number]; size: [number, number] }[] = [
  { pos: [PATH_X, 0.008, (HOUSE.maxZ + PAVEMENT_Z) / 2], size: [2.2, PAVEMENT_Z - HOUSE.maxZ + 0.6] },
  { pos: [0, 0.006, PAVEMENT_Z], size: [96, 1.8] },
  { pos: [-5.25, 0.008, HOUSE.minZ - 1.3], size: [2.2, 2.6] },
  { pos: [HOUSE.maxX + 1.3, 0.008, 2.25], size: [2.6, 2.2] },
];

export function Exterior() {
  const road = useMemo(buildRoad, []);
  const hedge = useMemo(buildHedge, []);
  const trees = useMemo(buildTrees, []);

  return (
    <>
      {/* Lawn. The physics slab lives in HouseShell so it never waits on assets. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 4]} receiveShadow>
        <planeGeometry args={[96, 76]} />
        <meshStandardMaterial color="#6f9c4f" roughness={1} />
      </mesh>

      {PAVING.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={p.pos} receiveShadow>
          <planeGeometry args={p.size} />
          <meshStandardMaterial color="#cfc8b8" roughness={1} />
        </mesh>
      ))}

      <SafeModel>
        <InstancedKit url={R + 'road-straight.glb'} transforms={road.straights} castShadow={false} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url={R + 'light-curved.glb'} transforms={road.lights} />
      </SafeModel>

      <InstancedShapes transforms={hedge} receiveShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3f6b34" roughness={1} />
      </InstancedShapes>

      <InstancedShapes transforms={trees.trunks}>
        <cylinderGeometry args={[0.42, 0.55, 1, 7]} />
        <meshStandardMaterial color="#7a5637" roughness={1} />
      </InstancedShapes>
      <InstancedShapes transforms={trees.canopyLow}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4e8f42" roughness={1} flatShading />
      </InstancedShapes>
      <InstancedShapes transforms={trees.canopyTop}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#5da84d" roughness={1} flatShading />
      </InstancedShapes>

      <Props items={BUILDINGS} />
      <Props items={DETAILS} />
    </>
  );
}
