/**
 * InstancedKit
 * ------------
 * Renders MANY copies of one Kenney GLB (floor tiles, wall panels, road
 * segments…) as instanced meshes: one draw call per unique mesh in the model
 * instead of one scene graph per tile. Each instance gets its own position /
 * yaw / (possibly non-uniform) scale.
 */

import { type ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface KitTransform {
  position: [number, number, number];
  rotationY?: number; // radians
  scale?: number | [number, number, number];
}

/** Writes one instance matrix per transform. Shared by kits and raw shapes. */
function writeMatrices(mesh: THREE.InstancedMesh, transforms: KitTransform[], local?: THREE.Matrix4) {
  const m = new THREE.Matrix4();
  const axis = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    p.set(...t.position);
    q.setFromAxisAngle(axis, t.rotationY ?? 0);
    const sc = t.scale ?? 1;
    if (typeof sc === 'number') s.set(sc, sc, sc);
    else s.set(...sc);
    m.compose(p, q, s);
    if (local) m.multiply(local);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Many copies of a plain geometry (roof eaves, hedges, tree trunks…). Pass the
 * geometry + material as children, exactly like a normal mesh.
 */
export function InstancedShapes({
  transforms,
  children,
  castShadow = true,
  receiveShadow = true,
}: {
  transforms: KitTransform[];
  children: ReactNode;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (ref.current) writeMatrices(ref.current, transforms);
  }, [transforms]);

  if (!transforms.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, transforms.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    >
      {children}
    </instancedMesh>
  );
}

interface SubMesh {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  local: THREE.Matrix4; // mesh's transform within the GLB
}

function InstancedSubMesh({
  sub,
  transforms,
  castShadow,
  receiveShadow,
}: {
  sub: SubMesh;
  transforms: KitTransform[];
  castShadow: boolean;
  receiveShadow: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (ref.current) writeMatrices(ref.current, transforms, sub.local);
  }, [sub, transforms]);

  return (
    <instancedMesh
      ref={ref}
      args={[sub.geometry, sub.material, transforms.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    />
  );
}

/** Clones a material (or array) and multiplies its base colour by `tint`. */
function tinted(material: THREE.Material | THREE.Material[], tint: string) {
  const c = new THREE.Color(tint);
  const one = (m: THREE.Material) => {
    const copy = m.clone() as THREE.MeshStandardMaterial;
    if (copy.color) copy.color.multiply(c);
    return copy;
  };
  return Array.isArray(material) ? material.map(one) : one(material);
}

export function InstancedKit({
  url,
  transforms,
  castShadow = true,
  receiveShadow = true,
  tint,
}: {
  url: string;
  transforms: KitTransform[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Multiplied into the GLB's own colours — lets one kit floor vary per room. */
  tint?: string;
}) {
  const { scene } = useGLTF(url, true);

  const subs = useMemo(() => {
    scene.updateMatrixWorld(true);
    const list: SubMesh[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        list.push({
          geometry: mesh.geometry,
          material: tint ? tinted(mesh.material, tint) : mesh.material,
          local: mesh.matrixWorld.clone(),
        });
      }
    });
    return list;
  }, [scene, tint]);

  if (!transforms.length) return null;
  return (
    <>
      {subs.map((sub, i) => (
        <InstancedSubMesh
          key={i}
          sub={sub}
          transforms={transforms}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </>
  );
}
