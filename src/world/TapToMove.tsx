/**
 * TapToMove
 * ---------
 * Touch movement: double-tap the ground and the player walks there.
 *
 * Only TOUCH pointers are handled, so the desktop mouse is untouched (drag
 * still orbits the camera, WASD still walks). On touch that leaves a clean
 * split with ecctrl's own gestures, which we don't have to fight:
 *
 *     double tap  → walk there        (this module)
 *     one finger  → look around       (ecctrl's touchmove)
 *     two fingers → zoom              (ecctrl's pinch)
 *
 * A single tap deliberately does nothing: tapping is also how you steady the
 * camera, and a stray tap sending the character across the garden feels awful.
 *
 * The tap is raycast onto the ground plane rather than onto scene geometry, so
 * tapping *past* a doorway or over a wall still gives a sensible destination —
 * NavGrid snaps it to the nearest walkable spot and routes there.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../state/useGameStore';
import { snapToWalkable } from './NavGrid';

const DOUBLE_TAP_MS = 450; // gap allowed between the two taps
const TAP_SLOP_PX = 26; // movement that still counts as a tap, not a drag
const TAP_HOLD_MS = 450; // a longer press is a drag/hold, not a tap

/**
 * When the tap HAPPENED, not when we got round to handling it. On a phone
 * this scene can leave the main thread busy for a few hundred ms, and timing
 * the gap with `performance.now()` inside the handler measures that lag
 * instead of the user's fingers — legitimate double-taps get rejected.
 * Falls back if a browser reports a timestamp off the page timeline.
 */
const tapTime = (e: PointerEvent) => {
  const nowish = performance.now();
  return e.timeStamp > 0 && e.timeStamp <= nowish ? e.timeStamp : nowish;
};

export function TapToMove() {
  const { camera, gl } = useThree();
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const el = gl.domElement;
    // Stop the browser's own double-tap-to-zoom / pan from eating the gesture.
    const previousTouchAction = el.style.touchAction;
    el.style.touchAction = 'none';

    let downX = 0;
    let downY = 0;
    let downAt = 0;
    let lastTapAt = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      downX = e.clientX;
      downY = e.clientY;
      downAt = tapTime(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      // A panel covers the scene and freezes the render loop; a tap landing on
      // the exposed canvas behind it must not queue a walk for when it closes.
      if (useGameStore.getState().activePanel) return;
      const now = tapTime(e);
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > TAP_SLOP_PX || now - downAt > TAP_HOLD_MS) return; // a drag

      const isSecondTap =
        now - lastTapAt < DOUBLE_TAP_MS &&
        Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < TAP_SLOP_PX * 2;

      if (!isSecondTap) {
        lastTapAt = now;
        lastTapX = e.clientX;
        lastTapY = e.clientY;
        return;
      }
      lastTapAt = 0; // consumed — a third tap starts a fresh pair

      const rect = el.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(groundPlane, hit)) return; // aimed at the sky

      const spot = snapToWalkable(hit.x, hit.z);
      if (spot) useGameStore.getState().setMoveTarget(spot[0], spot[1]);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointerup', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerUp);
      el.style.touchAction = previousTouchAction;
    };
  }, [camera, gl, groundPlane, ndc, raycaster, hit]);

  return <DestinationMarker />;
}

const MARKER_COLOR = '#ffcf1f';

/**
 * Where the player has been told to walk.
 *
 * The follow camera sits barely a unit above the floor, so anything lying flat
 * on the ground is seen at a ~10° grazing angle and squashes to a sliver. Hence
 * the standing post: the ground rings read when you are looking down at a
 * destination, the post reads when you are not.
 */
function DestinationMarker() {
  const moveTarget = useGameStore((s) => s.moveTarget);
  const ring = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ring.current) return;
    const pulse = (state.clock.elapsedTime * 1.5) % 1;
    ring.current.scale.setScalar(0.6 + pulse * 1.1);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - pulse);
  });

  if (!moveTarget) return null;

  return (
    <group position={[moveTarget.x, 0.04, moveTarget.z]}>
      {/* Expanding pulse. */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.56, 32]} />
        <meshBasicMaterial color={MARKER_COLOR} transparent depthWrite={false} />
      </mesh>
      {/* Steady ring, so the spot is still marked between pulses. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.5, 32]} />
        <meshBasicMaterial color={MARKER_COLOR} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      {/* Standing post — the part you can actually see from player height. */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 1, 6]} />
        <meshBasicMaterial color={MARKER_COLOR} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
}
