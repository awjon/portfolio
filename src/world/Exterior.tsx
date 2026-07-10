/**
 * Exterior
 * --------
 * The night-time city block around the station, built from the Kenney city +
 * road kits: a street along the south edge with streetlights and a crosswalk
 * at the station entrance, a row of storefront buildings across the road, a
 * skyline of skyscrapers / low-detail blocks to the north, a small park to
 * the east, and roadwork details. Purely dressing — buildings collide, the
 * rest doesn't.
 */

import { useMemo } from 'react';
import { InstancedKit, type KitTransform } from './InstancedKit';
import { Props, SafeModel, type PropSpec } from './Props';

const C = '/models/city/';
const R = '/models/road/';

const ROAD_SCALE = 4;
const ROAD_Z = 30;
const ENTRANCE_X = -12; // aligned with the station's main (hub) door

function buildRoad(): { straights: KitTransform[]; lights: KitTransform[] } {
  const straights: KitTransform[] = [];
  const lights: KitTransform[] = [];
  for (let x = -48; x <= 48; x += ROAD_SCALE) {
    if (x === ENTRANCE_X) continue; // crossing piece placed separately
    straights.push({ position: [x, 0.01, ROAD_Z], scale: ROAD_SCALE });
  }
  for (const x of [-44, -32, -20, -2, 10, 22, 36, 46]) {
    lights.push({ position: [x, 0, ROAD_Z - 2.4], rotationY: Math.PI, scale: ROAD_SCALE });
  }
  return { straights, lights };
}

const BUILDINGS: PropSpec[] = [
  // Storefront row across the road, facing the station.
  ...(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] as const).map((v, i) => ({
    url: `${C}building-${v}.glb`,
    at: [-45 + i * 9, 39] as [number, number],
    rotationY: Math.PI,
    scale: 5,
    collider: true,
  })),
  // Skyline behind the station.
  { url: C + 'building-skyscraper-a.glb', at: [-34, -34], scale: 5, collider: true },
  { url: C + 'building-skyscraper-b.glb', at: [-14, -37], scale: 5, collider: true },
  { url: C + 'building-skyscraper-c.glb', at: [6, -35], scale: 5, collider: true },
  { url: C + 'building-skyscraper-d.glb', at: [26, -37], scale: 5, collider: true },
  { url: C + 'building-skyscraper-e.glb', at: [44, -34], scale: 4.5, collider: true },
  { url: C + 'low-detail-building-a.glb', at: [-46, -28], scale: 4 },
  { url: C + 'low-detail-building-b.glb', at: [-24, -28], scale: 4 },
  { url: C + 'low-detail-building-c.glb', at: [-4, -28], scale: 4 },
  { url: C + 'low-detail-building-d.glb', at: [16, -28], scale: 4 },
  { url: C + 'low-detail-building-e.glb', at: [36, -28], scale: 4 },
  { url: C + 'low-detail-building-f.glb', at: [52, -28], scale: 4 },
  { url: C + 'low-detail-building-wide-a.glb', at: [-56, -32], scale: 4 },
  { url: C + 'low-detail-building-wide-b.glb', at: [56, -33], scale: 4 },
];

const DETAILS: PropSpec[] = [
  // Crosswalk connects the entrance path to the sidewalk.
  { url: R + 'road-crossing.glb', at: [ENTRANCE_X, ROAD_Z], offset: [0, 0.011, 0], scale: ROAD_SCALE },
  // Roadwork near the crossing.
  { url: R + 'construction-cone.glb', at: [-5, 27.5], scale: ROAD_SCALE },
  { url: R + 'construction-cone.glb', at: [-3.6, 26.6], rotationY: 0.7, scale: ROAD_SCALE },
  { url: R + 'construction-barrier.glb', at: [-1, 27], rotationY: 0.15, scale: ROAD_SCALE },
  { url: R + 'construction-light.glb', at: [1.6, 27.2], scale: ROAD_SCALE },
  { url: R + 'sign-highway.glb', at: [50, 26.5], rotationY: Math.PI, scale: ROAD_SCALE },
  // Little park east of the station (the animals hang out here).
  { url: C + 'detail-parasol-a.glb', at: [32, 1], scale: 4 },
  { url: C + 'detail-parasol-b.glb', at: [36, 6], scale: 4 },
  { url: '/models/furniture/bench.glb', at: [31, 3], rotationY: -Math.PI / 2, scale: 1.5, collider: true },
  { url: '/models/furniture/bench.glb', at: [35, -1.5], rotationY: Math.PI, scale: 1.5, collider: true },
  { url: '/models/furniture/pottedPlant.glb', at: [29, -3], scale: 1.5 },
  // West yard planters.
  { url: '/models/furniture/pottedPlant.glb', at: [-30, 8], scale: 1.8 },
  { url: '/models/furniture/pottedPlant.glb', at: [-33, -3], scale: 1.8 },
];

// Walkway pads from the hub door down to the crosswalk.
const WALKWAY: KitTransform[] = [18, 20, 22, 24, 26].map((z) => ({
  position: [ENTRANCE_X, 0.004, z] as [number, number, number],
  scale: 2,
}));

export function Exterior() {
  const road = useMemo(buildRoad, []);

  return (
    <>
      {/* Ground plane (dark night grass); the physics slab lives in StationShell. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[190, 150]} />
        <meshStandardMaterial color="#1a2420" roughness={1} />
      </mesh>

      <SafeModel>
        <InstancedKit url={R + 'road-straight.glb'} transforms={road.straights} castShadow={false} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url={R + 'light-curved.glb'} transforms={road.lights} />
      </SafeModel>
      <SafeModel>
        <InstancedKit url="/models/station/structure-panel.glb" transforms={WALKWAY} castShadow={false} />
      </SafeModel>

      <Props items={BUILDINGS} />
      <Props items={DETAILS} />
    </>
  );
}
