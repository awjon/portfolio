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
  children,
}: InteractableProps) {
  const register = useGameStore((s) => s.registerInteractable);
  const unregister = useGameStore((s) => s.unregisterInteractable);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    register({
      id,
      kind,
      position: new THREE.Vector3(...position),
      radius,
      panelId,
      label,
    });
    return () => unregister(id);
  }, [id, kind, position, radius, panelId, label, register, unregister]);

  return (
    <group ref={groupRef} position={position}>
      {children}
    </group>
  );
}
