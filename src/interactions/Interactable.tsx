import { useEffect, useRef, ReactNode } from 'react';
import { useGameStore, InteractableKind } from '../state/useGameStore';
import * as THREE from 'three';

interface InteractableProps {
  id: string;
  kind: InteractableKind;
  position: [number, number, number];
  radius?: number;
  panelId: string; // which panel opens on E
  label?: string;
  /**
   * False while build mode is running: the object still draws in place, but it
   * doesn't join the proximity registry. There is no player capsule to be near
   * it, and a stale entry would leave a dead "Press E" prompt on screen.
   */
  enabled?: boolean;
  children: ReactNode;
}

/**
 * Wraps any 3D content and registers it as an interactable at mount.
 * The ProximityDetector uses the registered position + radius; this component
 * doesn't run any per-frame logic itself.
 */
export function Interactable({
  id,
  kind,
  position,
  radius = 3,
  panelId,
  label,
  enabled = true,
  children,
}: InteractableProps) {
  const register = useGameStore((s) => s.registerInteractable);
  const unregister = useGameStore((s) => s.unregisterInteractable);
  const groupRef = useRef<THREE.Group>(null);
  // Destructured so the effect keys off the three numbers, not the array's
  // identity — a fresh `[x, y, z]` literal every render would otherwise
  // re-register the object on every frame of a build-mode drag.
  const [x, y, z] = position;

  useEffect(() => {
    if (!enabled) return;
    register({
      id,
      kind,
      position: new THREE.Vector3(x, y, z),
      radius,
      panelId,
      label,
    });
    return () => unregister(id);
  }, [id, kind, x, y, z, radius, panelId, label, enabled, register, unregister]);

  return (
    <group ref={groupRef} position={position}>
      {children}
    </group>
  );
}
