import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Ecctrl from 'ecctrl';
import { Character } from './Character';
import { useGameStore } from '../state/useGameStore';
import type { RapierRigidBody } from '@react-three/rapier';

const RUN_THRESHOLD = 3.5; // horizontal speed above which we play Run

/**
 * ecctrl gives us a floating-capsule physics controller with WASD movement,
 * Shift-to-run, Space-to-jump, and a collision-aware follow camera.
 * We read its velocity each frame to derive idle/walk/run, and write the
 * player's position into the store for the proximity detector to consume.
 */
export function Player() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const setMoveState = useGameStore((s) => s.setMoveState);
  const playerPos = useGameStore((s) => s.playerPos);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;

    const v = body.linvel();
    const horizontalSpeed = Math.hypot(v.x, v.z);

    if (horizontalSpeed < 0.1) setMoveState('idle');
    else if (horizontalSpeed < RUN_THRESHOLD) setMoveState('walk');
    else setMoveState('run');

    const t = body.translation();
    playerPos.set(t.x, t.y, t.z);
  });

  return (
    <Ecctrl
      ref={bodyRef}
      maxVelLimit={5}
      sprintMult={2}
      jumpVel={5}
      camInitDis={-6}
      camMaxDis={-10}
      camMinDis={-3}
      position={[0, 2, 0]}
    >
      <group position={[0, -0.9, 0]}>
        <Character />
      </group>
    </Ecctrl>
  );
}
