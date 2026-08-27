/**
 * Props
 * -----
 * `KitModel` — one cloned Kenney GLB, recentred to a center-bottom pivot, with
 * optional looping of its authored animation clips (claw machines, prize
 * wheels…). `Prop` places one in the world (tile or raw world coords) and can
 * derive a fixed box collider straight from the model's bounding box, so no
 * collision shapes are ever authored by hand.
 *
 * Every model is wrapped in Suspense + an error boundary so a missing file
 * degrades to nothing instead of blanking the scene.
 */

import { Component, type ReactNode, Suspense, useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FURNITURE_SCALE, tileToWorld } from './HouseMap';

export class SafeModel extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return <Suspense fallback={null}>{this.props.children}</Suspense>;
  }
}

/**
 * A translucent copy of a material, for the build-mode placement preview.
 *
 * `depthWrite` stays ON. Turning it off is the usual reflex for transparency,
 * but it lets a model's far faces blend over its near ones, and from the
 * overhead build camera that turns a sofa into a flat coloured smear instead
 * of something you can recognise before you commit to placing it.
 */
function fadeClone(material: THREE.Material): THREE.Material {
  const m = material.clone();
  m.transparent = true;
  m.opacity = 0.7;
  return m;
}

/** Clone + recentre (XZ center, feet at y=0) + optional clip playback. */
export function KitModel({
  url,
  scale = FURNITURE_SCALE,
  animate = false,
  timeScale = 1,
  ghost = false,
}: {
  url: string;
  scale?: number;
  animate?: boolean;
  timeScale?: number;
  /**
   * Build mode's placement preview: translucent, casts no shadow, and is
   * invisible to the raycaster so it never intercepts the click meant for the
   * floor underneath it.
   */
  ghost?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url, true);

  const object = useMemo(() => {
    const cloned = skeletonClone(scene);
    const box = new THREE.Box3().setFromObject(cloned);
    const c = box.getCenter(new THREE.Vector3());
    cloned.position.set(-c.x, -box.min.y, -c.z);
    cloned.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (ghost) {
        // SkeletonUtils.clone shares materials with the cached GLB, so fading
        // them in place would fade every already-placed copy of this model
        // too. Clone per ghost instead.
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(fadeClone)
          : fadeClone(mesh.material);
        mesh.raycast = () => null;
        return;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return cloned;
  }, [scene, ghost]);

  const { actions, names } = useAnimations(animations, group);
  useEffect(() => {
    if (!animate) return;
    for (const n of names) {
      const a = actions[n];
      if (a) {
        a.timeScale = timeScale;
        a.reset().play();
      }
    }
    return () => {
      for (const n of names) actions[n]?.stop();
    };
  }, [animate, actions, names, timeScale]);

  return (
    <group ref={group} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

export interface PropSpec {
  url: string;
  /** Grid placement (fractional / out-of-grid allowed) … */
  tile?: [number, number];
  /** … or raw world x/z. */
  at?: [number, number];
  /** World-space offset added after tile/at (lift items onto tables, etc.). */
  offset?: [number, number, number];
  rotationY?: number;
  scale?: number;
  /** Auto box collider from the model's bounds. */
  collider?: boolean;
  /** Loop the GLB's authored animation clips. */
  animate?: boolean;
  /**
   * Set false to draw the model with no rigid body at all. Build mode does
   * this: a fixed RigidBody only reads `position` when it is created, so a
   * dragged prop would leave its collider behind — and remounting one per
   * pointer-move would thrash the physics world. There is no player capsule in
   * build mode anyway, so nothing needs colliding with until the layout is
   * committed and play resumes.
   */
  physics?: boolean;
}

function propPosition(spec: PropSpec): [number, number, number] {
  const base: [number, number, number] = spec.tile
    ? tileToWorld(spec.tile[0], spec.tile[1])
    : [spec.at?.[0] ?? 0, 0, spec.at?.[1] ?? 0];
  const o = spec.offset ?? [0, 0, 0];
  return [base[0] + o[0], base[1] + o[1], base[2] + o[2]];
}

function PropCollider({ url, scale }: { url: string; scale: number }) {
  const { scene } = useGLTF(url, true);
  const half = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3()).multiplyScalar(scale);
    return {
      args: [
        Math.max(0.1, size.x / 2),
        Math.max(0.1, size.y / 2),
        Math.max(0.1, size.z / 2),
      ] as [number, number, number],
      y: (size.y / 2),
    };
  }, [scene, scale]);
  return <CuboidCollider args={half.args} position={[0, half.y, 0]} />;
}

export function Prop(spec: PropSpec) {
  const position = propPosition(spec);
  // Furniture/city-kit props default to FURNITURE_SCALE, not the (bigger)
  // architecture scale — the house grows around them, they don't grow with it.
  const scale = spec.scale ?? FURNITURE_SCALE;
  const model = <KitModel url={spec.url} scale={scale} animate={spec.animate} />;

  return (
    <SafeModel>
      {spec.collider && spec.physics !== false ? (
        <RigidBody type="fixed" colliders={false} position={position} rotation={[0, spec.rotationY ?? 0, 0]}>
          <PropCollider url={spec.url} scale={scale} />
          {model}
        </RigidBody>
      ) : (
        <group position={position} rotation={[0, spec.rotationY ?? 0, 0]}>
          {model}
        </group>
      )}
    </SafeModel>
  );
}

export function Props({ items }: { items: PropSpec[] }) {
  return (
    <>
      {items.map((p, i) => (
        <Prop key={i} {...p} />
      ))}
    </>
  );
}
