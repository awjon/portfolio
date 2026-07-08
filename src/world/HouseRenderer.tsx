/**
 * HouseRenderer
 * -------------
 * The only Three.js/R3F module in the engine. It walks a pure-data `HouseScene`
 * and draws it: one floor mesh, per-room lights, auto colliders, and a model for
 * every placed item — all resolved through the asset registry (goal 4).
 *
 * Walls / doors / windows are the real Kenney pieces placed on cell EDGES and
 * FITTED to the tile size (stretched to [TILE_SIZE, WALL_HEIGHT]), and corner
 * caps sit at L-junctions — so any kit tiles seamlessly regardless of its native
 * dimensions. Furniture uses the real GLBs at a uniform scale. Every model is
 * recentred (Kenney models pivot at a corner) and wrapped in a Suspense + error
 * boundary that falls back to a coloured box, so a missing file never breaks the
 * scene.
 */

import { Component, type ReactNode, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import type { HouseScene, PlacedModel, FloorSpec, PlacedLight, ColliderSpec } from './HouseTypes';
import { HOUSE_ASSETS, type AssetDef, type AssetRegistry, getAsset } from './HouseAssets';
import { getDefaultHouseScene } from './HouseGenerator';
import { TILE_SIZE, WALL_HEIGHT, WALL_THICKNESS } from './HouseLayout';

// ── Floor (single mesh + thick ground collider) ─────────────────────────────
function Floor({ floor }: { floor: FloorSpec }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh position={floor.center} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[floor.width, floor.depth]} />
        <meshStandardMaterial color="#2b2f38" roughness={0.85} metalness={0.05} />
      </mesh>
      <CuboidCollider args={[floor.width / 2, 1, floor.depth / 2]} position={[floor.center[0], -1, floor.center[2]]} />
    </RigidBody>
  );
}

function Colliders({ specs }: { specs: ColliderSpec[] }) {
  return (
    <RigidBody type="fixed" colliders={false}>
      {specs.map((c, i) => (
        <CuboidCollider key={i} args={c.halfExtents} position={c.position} rotation={[0, c.rotationY, 0]} />
      ))}
    </RigidBody>
  );
}

function RoomLights({ lights }: { lights: PlacedLight[] }) {
  return (
    <>
      {lights.map((l, i) => (
        <pointLight key={i} position={l.position} color={l.color} intensity={l.intensity} distance={l.distance} decay={2} />
      ))}
    </>
  );
}

// ── Model geometry helpers ──────────────────────────────────────────────────
/** Recentre a Kenney model (corner pivot) horizontally and rest it on y=0. */
function recentre(root: THREE.Object3D): { size: THREE.Vector3 } {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box.min.y, -c.z);
  return { size };
}

// ── Shell pieces (walls / doors / windows / corners) — real, fitted GLB ─────
function ShellGlb({ model, registry }: { model: PlacedModel; registry: AssetRegistry }) {
  const def = getAsset(registry, model.assetKey);
  const url = registry.basePath + def.parts[0].file;
  const { scene } = useGLTF(url, true);
  const { object, scale } = useMemo(() => {
    const clone = scene.clone(true);
    const { size } = recentre(clone);
    const [len, h] = model.fit ?? [TILE_SIZE, WALL_HEIGHT];
    if (len > 0) {
      const fx = len / (size.x || 1);
      return { object: clone, scale: [fx, h / (size.y || 1), fx] as [number, number, number] };
    }
    const u = h / (size.y || 1); // corners: uniform to height
    return { object: clone, scale: [u, u, u] as [number, number, number] };
  }, [scene, model.fit]);
  return (
    <group position={model.position} rotation={[0, model.rotationY, 0]} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

function ShellFallback({ model }: { model: PlacedModel }) {
  const [len, h] = model.fit ?? [TILE_SIZE, WALL_HEIGHT];
  const size: [number, number, number] = len > 0 ? [len, h, WALL_THICKNESS] : [WALL_THICKNESS * 2, h, WALL_THICKNESS * 2];
  const color = model.assetKey === 'door' ? '#9c7a4d' : model.assetKey === 'window' ? '#a9dbe8' : '#8b93a1';
  return (
    <group position={model.position} rotation={[0, model.rotationY, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.9} emissive={color} emissiveIntensity={0.08} />
      </mesh>
    </group>
  );
}

// ── Furniture — real GLB at uniform scale, recentred ────────────────────────
function FurnitureGlb({ model, registry }: { model: PlacedModel; registry: AssetRegistry }) {
  const def = getAsset(registry, model.assetKey);
  return (
    <group position={model.position} rotation={[0, model.rotationY, 0]}>
      {def.parts.map((p, i) => (
        <FurniturePart key={i} url={registry.basePath + p.file} scale={registry.scale} />
      ))}
    </group>
  );
}

function FurniturePart({ url, scale }: { url: string; scale: number }) {
  const { scene } = useGLTF(url, true);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    recentre(clone);
    return clone;
  }, [scene]);
  return <primitive object={object} scale={scale} />;
}

function FurnitureFallback({ model, def }: { model: PlacedModel; def: AssetDef }) {
  const [fw, fh] = model.footprint;
  const u = TILE_SIZE * 0.4;
  const h = def.placeholder.height;
  return (
    <group position={model.position} rotation={[0, model.rotationY, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[fw * u, h, fh * u]} />
        <meshStandardMaterial color={def.placeholder.color} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── One model: real GLB with a box fallback ─────────────────────────────────
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
  const isShell = model.source === 'wall' || model.source === 'opening' || model.source === 'corner';
  const fallback = isShell ? <ShellFallback model={model} /> : <FurnitureFallback model={model} def={def} />;
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        {isShell ? <ShellGlb model={model} registry={registry} /> : <FurnitureGlb model={model} registry={registry} />}
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
