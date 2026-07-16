/**
 * InstancedKit
 * ------------
 * Renders MANY copies of one Kenney GLB (floor tiles, wall panels, road
 * segments…) as instanced meshes: one draw call per unique mesh in the model
 * instead of one scene graph per tile. Each instance gets its own position /
 * yaw / (possibly non-uniform) scale.
 */

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface KitTransform {
  position: [number, number, number];
  rotationY?: number; // radians
  scale?: number | [number, number, number];
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
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < transforms.length; i++) {
      const t = transforms[i];
      p.set(...t.position);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rotationY ?? 0);
      const sc = t.scale ?? 1;
      if (typeof sc === 'number') s.set(sc, sc, sc);
      else s.set(...sc);
      m.compose(p, q, s);
      m.multiply(sub.local);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
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

export function InstancedKit({
  url,
  transforms,
  castShadow = true,
  receiveShadow = true,
}: {
  url: string;
  transforms: KitTransform[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const { scene } = useGLTF(url, true);

  const subs = useMemo(() => {
    scene.updateMatrixWorld(true);
    const list: SubMesh[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        list.push({ geometry: mesh.geometry, material: mesh.material, local: mesh.matrixWorld.clone() });
      }
    });
    return list;
  }, [scene]);

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
