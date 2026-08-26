import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Ecctrl, { useJoystickControls } from 'ecctrl';
import * as THREE from 'three';
import { Character } from './Character';
import { useGameStore } from '../state/useGameStore';
import { SPAWN, CHAR_SCALE } from '../world/HouseMap';
import { findPath } from '../world/NavGrid';
import { isTouchDevice } from '../ui/useIsTouch';
import type { RapierRigidBody } from '@react-three/rapier';

const RUN_THRESHOLD = 3.8; // horizontal speed above which we play Sprint
const AIR_WINDOW = 0.12; // sample window (s) for vertical displacement
const AIR_DISP = 0.22; // net rise/drop within a window that counts as airborne

// ── Tap-to-move follower ────────────────────────────────────────────────────
const WAYPOINT_REACHED = 0.45; // how close counts as "at this corner"
const DESTINATION_REACHED = 0.35;
const RUN_IF_FURTHER_THAN = 5; // jog for long trips, stroll for short ones
const STUCK_WINDOW = 0.7; // s between progress checks
const STUCK_DISTANCE = 0.25; // less progress than this in a window = stuck
// ecctrl accelerates over a few tenths of a second, and on a slow phone that
// is only a handful of frames — start checking for progress too early and
// every walk is cancelled before it begins.
const STUCK_GRACE = 1;

// ecctrl reads these once, at construction, so the check has to be synchronous.
const TOUCH = isTouchDevice();

/**
 * ecctrl gives us a floating-capsule physics controller with WASD movement,
 * Shift-to-run, Space-to-jump, and a collision-aware follow camera.
 * We read its velocity each frame to derive idle/walk/run/jump/fall, and
 * write the player's position into the store for the proximity detector.
 *
 * On touch there are no keys, so a tap destination (see TapToMove) is followed
 * here: NavGrid gives a route, and each frame we hand ecctrl the *same*
 * joystick input its thumbstick used to produce. That reuses all of ecctrl's
 * movement, turning and animation logic rather than re-implementing it.
 */
export function Player() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const win = useRef({ t: 0, y: 0, air: 0 as 0 | 1 | -1 });
  const setMoveState = useGameStore((s) => s.setMoveState);
  const playerPos = useGameStore((s) => s.playerPos);
  const moveTarget = useGameStore((s) => s.moveTarget);

  const path = useRef<[number, number][]>([]);
  const stuck = useRef({ t: 0, x: 0, z: 0, grace: 0 });
  const camForward = useMemo(() => new THREE.Vector3(), []);

  // A new destination replaces the current route.
  useEffect(() => {
    const { resetJoystick } = useJoystickControls.getState();
    if (!moveTarget) {
      path.current = [];
      resetJoystick();
      return;
    }
    const p = useGameStore.getState().playerPos;
    path.current = findPath(p.x, p.z, moveTarget.x, moveTarget.z) ?? [];
    stuck.current = { t: 0, x: p.x, z: p.z, grace: STUCK_GRACE };
    if (!path.current.length) {
      resetJoystick();
      useGameStore.getState().clearMoveTarget();
    }
  }, [moveTarget]);

  // Stop walking if the route is abandoned while unmounting.
  useEffect(() => () => useJoystickControls.getState().resetJoystick(), []);

  useFrame((state, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    const v = body.linvel();
    const horizontalSpeed = Math.hypot(v.x, v.z);
    const t = body.translation();

    // Airborne detection by NET vertical displacement over a short window —
    // velocity alone flickers when the floating capsule bumps colliders.
    const w = win.current;
    w.t += delta;
    if (w.t >= AIR_WINDOW) {
      const dy = t.y - w.y;
      w.air = dy > AIR_DISP ? 1 : dy < -AIR_DISP ? -1 : 0;
      w.t = 0;
      w.y = t.y;
    }

    // Safety net: if the player somehow slips under the world, respawn.
    if (t.y < -8) {
      body.setTranslation({ x: SPAWN[0], y: SPAWN[1], z: SPAWN[2] }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    if (w.air !== 0) setMoveState(w.air > 0 ? 'jump' : 'fall');
    else if (horizontalSpeed < 0.15) setMoveState('idle');
    else if (horizontalSpeed < RUN_THRESHOLD) setMoveState('walk');
    else setMoveState('run');

    playerPos.set(t.x, t.y, t.z);

    // ── Follow the tapped route ──────────────────────────────────────────
    const route = path.current;
    if (!route.length) return;
    const { setJoystick, resetJoystick } = useJoystickControls.getState();

    const abandon = () => {
      path.current = [];
      resetJoystick();
      useGameStore.getState().clearMoveTarget();
    };

    // Give up if we've stopped making headway — furniture and other props are
    // not in the nav grid, so bumping one has to end the walk rather than
    // leave the character shoving a sofa forever.
    const s = stuck.current;
    if (s.grace > 0) {
      s.grace -= delta;
      s.x = t.x;
      s.z = t.z;
    } else {
      s.t += delta;
      if (s.t >= STUCK_WINDOW) {
        if (Math.hypot(t.x - s.x, t.z - s.z) < STUCK_DISTANCE) return abandon();
        s.t = 0;
        s.x = t.x;
        s.z = t.z;
      }
    }

    const [wx, wz] = route[0];
    const isFinal = route.length === 1;
    const dx = wx - t.x;
    const dz = wz - t.z;
    const gap = Math.hypot(dx, dz);

    if (gap < (isFinal ? DESTINATION_REACHED : WAYPOINT_REACHED)) {
      route.shift();
      if (!route.length) return abandon();
      return;
    }

    // ecctrl turns the character to `pivot.rotation.y + joystickAng - PI/2`,
    // where pivot.rotation.y is the camera's yaw. Invert that to steer toward
    // a world-space heading.
    state.camera.getWorldDirection(camForward);
    const cameraYaw = Math.atan2(camForward.x, camForward.z);
    const heading = Math.atan2(dx, dz);
    const angle = heading - cameraYaw + Math.PI / 2;

    let remaining = gap;
    for (let i = 1; i < route.length; i++) {
      remaining += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
    }
    setJoystick(1, angle, remaining > RUN_IF_FURTHER_THAN);
  });

  return (
    <Ecctrl
      ref={bodyRef}
      maxVelLimit={3.6}
      sprintMult={1.7}
      jumpVel={4.2}
      // Rooms are only a few units across, so the follow camera sits closer
      // than it did in the old warehouse-sized station — but on touch it backs
      // off a little, because you have to be able to SEE the ground you are
      // about to double-tap.
      camInitDis={TOUCH ? -4.4 : -3.4}
      camMaxDis={TOUCH ? -6.5 : -5.5}
      camMinDis={-1.3}
      camInitDir={{ x: 0, y: Math.PI }} // face north, up the path to the front door
      // ecctrl applies the movement impulse ABOVE the body's centre by default,
      // which pitches the capsule forward; walking into a wall at speed then
      // tips the character right over. Applying it at the centre keeps them up.
      moveImpulsePointY={0}
      position={SPAWN}
    >
      {/* ecctrl's capsule rests with its centre 0.65 above the floor, so the
          model hangs from there to put the character's feet on the ground. */}
      <group position={[0, -0.65, 0]} scale={CHAR_SCALE}>
        <Character />
      </group>
    </Ecctrl>
  );
}
