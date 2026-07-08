/**
 * HouseRenderer
 * -------------
 * The only Three.js/R3F module in the engine. It walks a pure-data `HouseScene`
 * and draws it: one floor mesh, per-room lights, auto-generated colliders, and a
 * model for every placed item — resolved through the asset registry (goal 4), so
 * no path is hardcoded here.
 *
 * The shell (walls / doors / windows) is drawn as procedural geometry so it
 * always tiles seamlessly — the Kenney wall pieces are edge-based (1u panels,
 * 0.55u corner caps) and don't fill a cell grid, so forcing them into one leaves
 * gaps. Their GLBs still live in the registry for anyone who wants to swap them
 * in and calibrate.
 *
 * Furniture uses the real Kenney GLBs, each wrapped in a Suspense + error
 * boundary that falls back to a coloured box — so a missing/renamed file never
 * breaks the scene. Kenney models pivot at a corner, so GlbPart recentres each
 * one on its cell.
 */

import { Component, type ReactNode, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import type { HouseScene, PlacedModel, FloorSpec, PlacedLight, ColliderSpec } from './HouseTypes';
import { HOUSE_ASSETS, type AssetDef, type AssetRegistry, type AssetPart, getAsset } from './HouseAssets';
import { getDefaultHouseScene } from './HouseGenerator';
import { TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS } from './HouseLayout';
import { N, E, S, W } from './AutoTile';

// ── Floor (single mesh + ground collider) ───────────────────────────────────
function Floor({ floor }: { floor: FloorSpec }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh position={floor.center} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[floor.width, floor.depth]} />
        <meshStandardMaterial color="#2b2f38" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Thick slab (top at y=0) so the capsule can't tunnel through at low fps. */}
      <CuboidCollider
        args={[floor.width / 2, 1, floor.depth / 2]}
        position={[floor.center[0], -1, floor.center[2]]}
      />
    </RigidBody>
  );
}

// ── Colliders (all static, one rigid body) ──────────────────────────────────
function Colliders({ specs }: { specs: ColliderSpec[] }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      {specs.map((c, i) => (
        <CuboidCollider key={i} args={c.halfExtents} position={c.position} rotation={[0, c.rotationY, 0]} />
      ))}
    </RigidBody>
  );
}

// ── Per-room lighting (goal 14) ─────────────────────────────────────────────
function RoomLights({ lights }: { lights: PlacedLight[] }) {
  return (
    <>
      {lights.map((l, i) => (
        <pointLight key={i} position={l.position} color={l.color} intensity={l.intensity} distance={l.distance} decay={2} />
      ))}
    </>
  );
}

// ── Real GLB model (one or more parts) ──────────────────────────────────────
function GlbPart({ url, part, globalScale }: { url: string; part: AssetPart; globalScale: number }) {
  // `true` enables Draco decompression, matching the rest of the app + the
  // `npm run compress` output.
  const { scene } = useGLTF(url, true);
  // Kenney models pivot at a corner (x:0→w, z:-d→0) sitting on the floor. Recentre
  // horizontally and rest on y=0 so the piece sits centred on its cell.
  const object = useMemo(() => {
    const clone = scene.clone(true) as THREE.Group;
    const box = new THREE.Box3().setFromObject(clone);
    const c = box.getCenter(new THREE.Vector3());
    clone.position.set(-c.x, -box.min.y, -c.z);
    return clone;
  }, [scene]);
  const s = part.scale ?? 1;
  const scale: [number, number, number] = Array.isArray(s)
    ? [s[0] * globalScale, s[1] * globalScale, s[2] * globalScale]
    : [s * globalScale, s * globalScale, s * globalScale];
  return (
    <group position={part.offset ?? [0, 0, 0]} rotation={[0, part.rotationY ?? 0, 0]} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

function RealModel({ def, registry }: { def: AssetDef; registry: AssetRegistry }) {
  return (
    <>
      {def.parts.map((p, i) => (
        <GlbPart key={i} url={registry.basePath + p.file} part={p} globalScale={registry.scale} />
      ))}
    </>
  );
}

// ── Placeholders (used until real GLBs exist) ───────────────────────────────
const HALF_T = WALL_THICKNESS / 2;
const ARM = TILE_SIZE / 4;

/** Wall family: draw an arm toward each connected direction from the mask. */
function WallPlaceholder({ model, color }: { model: PlacedModel; color: string }) {
  const hy = WALL_HEIGHT / 2;
  const mask = model.wallMask ?? 0;
  const arms: ReactNode[] = [];
  const box = (k: string, pos: [number, number, number], size: [number, number, number]) => (
    <mesh key={k} position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      {/* Faint self-illumination so walls never read as pure black in dim corners. */}
      <meshStandardMaterial color={color} roughness={0.95} emissive={color} emissiveIntensity={0.1} />
    </mesh>
  );
  if (mask === 0) arms.push(box('post', [0, hy, 0], [WALL_THICKNESS * 1.5, WALL_HEIGHT, WALL_THICKNESS * 1.5]));
  if (mask & N) arms.push(box('n', [0, hy, -ARM], [WALL_THICKNESS, WALL_HEIGHT, ARM * 2]));
  if (mask & S) arms.push(box('s', [0, hy, ARM], [WALL_THICKNESS, WALL_HEIGHT, ARM * 2]));
  if (mask & E) arms.push(box('e', [ARM, hy, 0], [ARM * 2, WALL_HEIGHT, WALL_THICKNESS]));
  if (mask & W) arms.push(box('w', [-ARM, hy, 0], [ARM * 2, WALL_HEIGHT, WALL_THICKNESS]));
  return <group position={model.position}>{arms}</group>;
}

function DoorPlaceholder({ model }: { model: PlacedModel }) {
  const mask = model.wallMask ?? 0;
  const horizontal = (mask & (E | W)) !== 0 || (mask & (N | S)) === 0;
  const gapHalf = TILE_SIZE * 0.35;
  const jambHalf = (TILE_SIZE / 2 - gapHalf) / 2;
  const jambC = gapHalf + jambHalf;
  const hy = WALL_HEIGHT / 2;
  const jamb = (k: string, pos: [number, number, number], size: [number, number, number]) => (
    <mesh key={k} position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#9c7a4d" roughness={0.8} emissive="#9c7a4d" emissiveIntensity={0.22} />
    </mesh>
  );
  const lintel = (
    <mesh position={[0, WALL_HEIGHT - 0.3, 0]} castShadow>
      <boxGeometry args={horizontal ? [TILE_SIZE, 0.6, WALL_THICKNESS] : [WALL_THICKNESS, 0.6, TILE_SIZE]} />
      <meshStandardMaterial color="#9c7a4d" roughness={0.8} emissive="#9c7a4d" emissiveIntensity={0.22} />
    </mesh>
  );
  return (
    <group position={model.position}>
      {horizontal
        ? [
            jamb('l', [-jambC, hy, 0], [jambHalf * 2, WALL_HEIGHT, WALL_THICKNESS]),
            jamb('r', [jambC, hy, 0], [jambHalf * 2, WALL_HEIGHT, WALL_THICKNESS]),
          ]
        : [
            jamb('l', [0, hy, -jambC], [WALL_THICKNESS, WALL_HEIGHT, jambHalf * 2]),
            jamb('r', [0, hy, jambC], [WALL_THICKNESS, WALL_HEIGHT, jambHalf * 2]),
          ]}
      {lintel}
    </group>
  );
}

function WindowPlaceholder({ model }: { model: PlacedModel }) {
  const mask = model.wallMask ?? 0;
  const horizontal = (mask & (E | W)) !== 0 || (mask & (N | S)) === 0;
  const size: [number, number, number] = horizontal
    ? [TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS]
    : [WALL_THICKNESS, WALL_HEIGHT, TILE_SIZE];
  return (
    <group position={model.position}>
      <mesh position={[0, WALL_HEIGHT / 2, 0]} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#a9dbe8" emissive="#6bb8cc" emissiveIntensity={0.4} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

function FurniturePlaceholder({ model, def }: { model: PlacedModel; def: AssetDef }) {
  const [fw, fh] = model.footprint;
  const u = TILE_SIZE * 0.4;
  const h = def.placeholder.height;
  return (
    <group position={model.position} rotation={[0, model.rotationY, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[fw * u, h, fh * u]} />
        <meshStandardMaterial color={def.placeholder.color} roughness={0.8} emissive={def.placeholder.color} emissiveIntensity={0.28} />
      </mesh>
    </group>
  );
}

function Structure({ model, def }: { model: PlacedModel; def: AssetDef }) {
  if (model.assetKey === 'door') return <DoorPlaceholder model={model} />;
  if (model.assetKey === 'window') return <WindowPlaceholder model={model} />;
  if (model.source === 'wall') return <WallPlaceholder model={model} color={def.placeholder.color} />;
  return <FurniturePlaceholder model={model} def={def} />;
}

// ── One model: real GLB with a placeholder fallback ─────────────────────────
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function AssetModel({ model, registry }: { model: PlacedModel; registry: AssetRegistry }) {
  const def = getAsset(registry, model.assetKey);
  const structure = <Structure model={model} def={def} />;
  // The shell (walls / doors / windows) is drawn procedurally so it always tiles
  // seamlessly: the Kenney wall pieces are edge-based (1u panels, 0.55u corner
  // caps) and don't fill a cell grid. Their GLBs still live in the registry for
  // anyone who wants to swap them in and calibrate. Furniture uses the real
  // GLBs, with the procedural box as a fallback if a file is missing.
  if (model.source === 'wall' || model.source === 'opening') return structure;
  return (
    <ModelBoundary fallback={structure}>
      <Suspense fallback={structure}>
        <group position={model.position} rotation={[0, model.rotationY, 0]}>
          <RealModel def={def} registry={registry} />
        </group>
      </Suspense>
    </ModelBoundary>
  );
}

// ── Public component ────────────────────────────────────────────────────────
export function HouseRenderer({
  scene = getDefaultHouseScene(),
  registry = HOUSE_ASSETS,
}: {
  scene?: HouseScene;
  registry?: AssetRegistry;
}) {
  return (
    <>
      <Floor floor={scene.floor} />
      <Colliders specs={scene.colliders} />
      <RoomLights lights={scene.lights} />
      {scene.models.map((m, i) => (
        <AssetModel key={i} model={m} registry={registry} />
      ))}
    </>
  );
}
