/**
 * BuildCamera
 * -----------
 * A bird's-eye camera for Build Mode, replacing the player/ecctrl camera so
 * dragging furniture doesn't fight with the normal mouse-drag-to-look
 * controls. Left mouse button is reserved entirely for selecting/dragging
 * handles (see BuildModeScene) — orbit is right-drag, pan is middle-drag,
 * zoom is the wheel (three.js always wires the wheel to dolly regardless of
 * the mouseButtons map).
 */

import * as THREE from 'three';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { HOUSE } from '../world/HouseMap';

export function BuildCamera() {
  const cx = (HOUSE.minX + HOUSE.maxX) / 2;
  const cz = (HOUSE.minZ + HOUSE.maxZ) / 2;
  const span = Math.max(HOUSE.maxX - HOUSE.minX, HOUSE.maxZ - HOUSE.minZ);

  return (
    <>
      <PerspectiveCamera makeDefault position={[cx, span * 1.15, cz + 0.01]} fov={50} />
      <OrbitControls
        makeDefault
        target={[cx, 0, cz]}
        mouseButtons={{ LEFT: undefined as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }}
        minDistance={4}
        maxDistance={span * 2.5}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />
    </>
  );
}
