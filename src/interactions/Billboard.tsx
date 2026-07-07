import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useGameStore } from '../state/useGameStore';
import { Interactable } from './Interactable';
import * as THREE from 'three';

interface BillboardProps {
  id: string;
  position: [number, number, number];
  panelId: string;
  title: string;
  color?: string;
}

/**
 * A glowing project billboard. Standing near it lets the player press E to open
 * the associated ProjectPanel. The frame brightens when the player is nearby.
 */
export function Billboard({ id, position, panelId, title, color = '#00e5ff' }: BillboardProps) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const nearby = useGameStore((s) => s.nearbyInteractable);
  const isNear = nearby === id;

  useFrame((state) => {
    if (!matRef.current) return;
    const base = isNear ? 2.2 : 1.0;
    // Gentle pulse when near, steady otherwise.
    const pulse = isNear ? Math.sin(state.clock.elapsedTime * 4) * 0.4 : 0;
    matRef.current.emissiveIntensity = base + pulse;
  });

  return (
    <Interactable id={id} kind="billboard" position={position} radius={3.5} panelId={panelId} label="View work">
      {/* Post */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 3, 12]} />
        <meshStandardMaterial color="#1a1a24" />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 3.6, 0]} castShadow>
        <boxGeometry args={[4, 2.4, 0.2]} />
        <meshStandardMaterial
          ref={matRef}
          color="#0a0a12"
          emissive={color}
          emissiveIntensity={1}
        />
      </mesh>
      {/* Title text on the screen */}
      <Text
        position={[0, 3.6, 0.12]}
        fontSize={0.42}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={3.5}
        textAlign="center"
      >
        {title}
      </Text>
    </Interactable>
  );
}
