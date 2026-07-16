import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Interactable } from './Interactable';
import { Label } from './Label';
import { useGameStore } from '../state/useGameStore';
import { KitModel, SafeModel } from '../world/Props';
import { KIT_SCALE } from '../world/StationMap';

interface ArcadeMachineProps {
  id: string;
  url: string; // arcade cabinet GLB
  position: [number, number, number];
  rotationY?: number;
  panelId: string; // which ProjectPanel opens on E
  title: string; // floating label (project name)
  color?: string;
  animate?: boolean; // loop the cabinet's authored clip (claw machine, etc.)
}

/**
 * A real Kenney arcade cabinet acting as a project kiosk: walk up, press E,
 * and the project panel opens. A glowing floor ring + floating title replace
 * the old flat billboards; the ring pulses when the player is in range.
 */
export function ArcadeMachine({
  id,
  url,
  position,
  rotationY = 0,
  panelId,
  title,
  color = '#00e5ff',
  animate = false,
}: ArcadeMachineProps) {
  const ringMat = useRef<THREE.MeshStandardMaterial>(null);
  const nearby = useGameStore((s) => s.nearbyInteractable);
  const isNear = nearby === id;

  useFrame((state) => {
    if (!ringMat.current) return;
    const pulse = isNear ? 1.6 + Math.sin(state.clock.elapsedTime * 5) * 0.6 : 0.55;
    ringMat.current.emissiveIntensity = pulse;
    ringMat.current.opacity = isNear ? 0.95 : 0.55;
  });

  return (
    <Interactable id={id} kind="machine" position={position} radius={2.6} panelId={panelId} label="Play">
      <group rotation={[0, rotationY, 0]}>
        <SafeModel>
          <KitModel url={url} scale={KIT_SCALE} animate={animate} />
        </SafeModel>
      </group>

      {/* Glowing floor ring. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.85, 1.05, 40]} />
        <meshStandardMaterial
          ref={ringMat}
          color="#0a0a12"
          emissive={color}
          emissiveIntensity={0.55}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating project title. */}
      <Label text={title} position={[0, 2.1, 0]} color={color} fontSize={0.26} />
    </Interactable>
  );
}
