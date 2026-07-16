import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Ecctrl from 'ecctrl';
import { Character } from './Character';
import { useGameStore } from '../state/useGameStore';
import { SPAWN, CHAR_SCALE } from '../world/StationMap';
import type { RapierRigidBody } from '@react-three/rapier';

const RUN_THRESHOLD = 3.8; // horizontal speed above which we play Sprint
const AIR_WINDOW = 0.12; // sample window (s) for vertical displacement
const AIR_DISP = 0.22; // net rise/drop within a window that counts as airborne

/**
 * ecctrl gives us a floating-capsule physics controller with WASD movement,
 * Shift-to-run, Space-to-jump, and a collision-aware follow camera.
 * We read its velocity each frame to derive idle/walk/run/jump/fall, and
 * write the player's position into the store for the proximity detector.
 */
export function Player() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const win = useRef({ t: 0, y: 0, air: 0 as 0 | 1 | -1 });
  const setMoveState = useGameStore((s) => s.setMoveState);
  const playerPos = useGameStore((s) => s.playerPos);

  useFrame((_, delta) => {
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
  });

  return (
    <Ecctrl
      ref={bodyRef}
      maxVelLimit={3.2}
      sprintMult={1.7}
      jumpVel={4.2}
      camInitDis={-5}
      camMaxDis={-9}
      camMinDis={-1.6}
      camInitDir={{ x: 0, y: Math.PI }} // face north into the station on load
      position={SPAWN}
    >
      <group position={[0, -0.9, 0]} scale={CHAR_SCALE}>
        <Character />
      </group>
    </Ecctrl>
  );
}
