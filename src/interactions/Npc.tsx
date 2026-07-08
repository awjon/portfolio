import { useRef, useEffect } from 'react';
import { useGLTF, useAnimations, Text } from '@react-three/drei';
import { Interactable } from './Interactable';
import * as THREE from 'three';

interface NpcProps {
  id: string;
  position: [number, number, number];
  panelId: string;
  name: string;
  /** Optional distinct model; defaults to the same Kenney character GLB. */
  model?: string;
}

/**
 * A stationary NPC. Reuses a Kenney character GLB and plays its idle clip on a
 * loop. Standing near it lets the player press E to open a DialogBox.
 *
 * Give it a different Kenney skin/model via `model` to distinguish NPCs from
 * the player (e.g. /models/npc/character-female-a.glb).
 */
export function Npc({ id, position, panelId, name, model = '/models/character/character-male-d.glb' }: NpcProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(model, true);

  // Clone so multiple NPCs sharing one GLB don't fight over the same skeleton.
  const cloned = useRef<THREE.Group>();
  if (!cloned.current) {
    cloned.current = scene.clone(true);
  }
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const idleName =
      names.find((n) => n.toLowerCase().includes('idle')) ?? names[0];
    const idle = idleName ? actions[idleName] : undefined;
    idle?.reset().fadeIn(0.3).play();
    return () => {
      idle?.fadeOut(0.3);
    };
  }, [actions, names]);

  return (
    <Interactable id={id} kind="npc" position={position} radius={2.8} panelId={panelId} label="Talk">
      <group ref={group}>
        <primitive object={cloned.current} />
      </group>
      {/* Floating name tag */}
      <Text
        position={[0, 2.4, 0]}
        fontSize={0.3}
        color="#39ff14"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </Interactable>
  );
}
