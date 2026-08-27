/**
 * BuildControls
 * -------------
 * The in-canvas half of build mode: the overhead camera, the floor you drop
 * things onto, the drag itself, and the ghost that previews whatever is armed
 * in the palette.
 *
 * Dragging is raycast against a horizontal plane at the object's own height
 * rather than against scene geometry. That matters: tracking real geometry
 * would make a lamp climb whatever it passed over, and a dragged object would
 * fight the very surfaces you were trying to slide it past. A flat plane keeps
 * a table-top item on its table-top all the way across the room.
 *
 * Pointer-move and pointer-up are bound to the window, not to the canvas, so a
 * fast drag that outruns the cursor — or leaves the canvas entirely — still
 * tracks and still releases cleanly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useBuildStore } from '../state/useBuildStore';
import { HOUSE } from '../world/HouseMap';
import { KitModel, SafeModel } from '../world/Props';
import { baseScale } from './types';
import { dragGrab } from './dragState';

/** Rotation applied per wheel notch while dragging. */
const WHEEL_STEP = Math.PI / 12;

/** Where the camera starts: high enough to frame the whole plot. */
const CAM_START: [number, number, number] = [0, 30, 24];

export function BuildControls() {
  const dragging = useBuildStore((s) => s.draggingId !== null);

  return (
    <>
      <PerspectiveCamera makeDefault position={CAM_START} fov={45} near={0.5} far={400} />
      <BuildFov />
      <OrbitControls
        makeDefault
        // The camera must not be draggable while an object is: one gesture,
        // one effect.
        enabled={!dragging}
        target={[0, 0, 0]}
        // Stop just short of horizontal so you can never end up under the floor.
        maxPolarAngle={1.35}
        minDistance={6}
        maxDistance={90}
        // Pan across the ground rather than across the screen — panning a
        // top-down view in screen space drifts you off the plot.
        screenSpacePanning={false}
        enableDamping
        dampingFactor={0.12}
      />
      <BuildFloor />
      <DragLayer />
      <PlacementGhost />
    </>
  );
}

/**
 * A phone held upright sees a narrow slice of the world at a fixed vertical
 * FOV — narrow enough that the house runs off both sides and you cannot see
 * the room you are dragging something towards. Widening the lens on portrait
 * aspects frames the whole plot again. (Play mode does the same thing for the
 * follow camera; see AdaptiveFov in Experience.tsx.)
 */
function BuildFov() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!camera.isPerspectiveCamera) return;
    const aspect = size.width / Math.max(1, size.height);
    const fov = aspect < 0.85 ? 68 : 45;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, size]);
  return null;
}

/**
 * A large invisible plane at y=0 that catches every click the objects don't:
 * clicking it deselects, and with an item armed in the palette it is where the
 * item lands. A faint grid over the plot shows the snap lattice.
 */
function BuildFloor() {
  const select = useBuildStore((s) => s.select);
  const tool = useBuildStore((s) => s.tool);
  const setGhost = useGhostTarget();

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.button !== 0) return;
      if (useBuildStore.getState().tool === 'place') return; // handled on click
      select(null);
    },
    [select],
  );

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      const s = useBuildStore.getState();
      if (s.tool !== 'place' || !s.pending) return;
      e.stopPropagation();
      const p = s.pending;
      s.add({
        kind: p.kind,
        url: p.url,
        x: e.point.x,
        y: 0,
        z: e.point.z,
        rotationY: 0,
        scale: 1,
        // Furniture gets a collider by default so the player can't walk through
        // whatever a visitor drops in the hallway. Rugs and mats are the
        // exception — a collider on a floor mat is a trip hazard.
        collider: p.kind === 'prop' && !/rug|doormat|floor/i.test(p.url),
        ...(p.kind === 'npc'
          ? { title: p.name.toUpperCase(), pose: 'idle', label: 'Talk', panelId: 'npc-newcomer' }
          : {}),
        ...(p.kind === 'animal'
          ? {
              species: p.species,
              ambient: 'idle',
              title: p.species,
              label: 'Say hi',
              panelId: `npc-animal-${p.species}`,
            }
          : {}),
      });
      // Stay armed so a run of chairs is one click each, not a round trip to
      // the palette every time. Escape or the palette's Done button disarms.
    },
    [],
  );

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onPointerMove={setGhost}
      >
        <planeGeometry args={[160, 160]} />
        {/* Invisible, but still raycastable — `visible={false}` would drop it
            out of the raycast entirely and there would be nothing to click. */}
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <gridHelper
        args={[
          Math.max(HOUSE.maxX - HOUSE.minX, HOUSE.maxZ - HOUSE.minZ) + 24,
          48,
          '#5b7f95',
          '#3f5a6b',
        ]}
        position={[0, 0.012, 0]}
      />
    </>
  );
}

// ── Ghost tracking ──────────────────────────────────────────────────────────
// The ghost's position is local state in PlacementGhost, published through this
// tiny module-level bridge so BuildFloor's pointer-move can write to it without
// either component owning the other.
let publishGhost: ((p: THREE.Vector3 | null) => void) | null = null;

function useGhostTarget() {
  return useCallback((e: ThreeEvent<PointerEvent>) => {
    publishGhost?.(e.point);
  }, []);
}

/** Translucent preview of the armed catalog item, under the cursor. */
function PlacementGhost() {
  const pending = useBuildStore((s) => s.pending);
  const [at, setAt] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    publishGhost = (p) => setAt(p ? [p.x, 0, p.z] : null);
    return () => {
      publishGhost = null;
    };
  }, []);

  if (!pending || !at) return null;

  return (
    <group position={at}>
      {/* A ring under the preview, so the drop point is legible even before
          the model has finished streaming in. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} raycast={() => null}>
        <ringGeometry args={[0.4, 0.53, 40]} />
        <meshBasicMaterial color="#7dffb0" transparent opacity={0.85} depthTest={false} />
      </mesh>
      <SafeModel>
        <KitModel url={pending.url} scale={baseScale(pending.kind)} ghost />
      </SafeModel>
    </group>
  );
}

/**
 * Window-level pointer handling for an in-progress drag, plus wheel-to-rotate
 * (the wheel is doing nothing useful mid-drag, and reaching for a key with the
 * other hand while holding a sofa is worse).
 */
function DragLayer() {
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const el = gl.domElement;

    const onMove = (e: PointerEvent) => {
      const { draggingId, moveTo } = useBuildStore.getState();
      if (!draggingId) return;
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      // Plane at y = dragGrab.planeY (normal·p + constant = 0 ⇒ y = −constant).
      plane.constant = -dragGrab.planeY;
      if (!raycaster.ray.intersectPlane(plane, hit)) return; // camera aimed level
      moveTo(draggingId, hit.x + dragGrab.dx, hit.z + dragGrab.dz);
    };

    const onUp = () => {
      const { draggingId, endGesture, setDragging } = useBuildStore.getState();
      if (!draggingId) return;
      endGesture();
      setDragging(null);
      if (typeof document !== 'undefined') document.body.style.cursor = '';
    };

    const onWheel = (e: WheelEvent) => {
      const { draggingId, rotate } = useBuildStore.getState();
      if (!draggingId) return;
      e.preventDefault(); // don't also zoom the camera
      e.stopPropagation();
      rotate(draggingId, e.deltaY > 0 ? WHEEL_STEP : -WHEEL_STEP);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
    };
  }, [camera, gl, raycaster, ndc, plane, hit]);

  return null;
}
