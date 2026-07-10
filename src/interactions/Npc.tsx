import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Interactable } from './Interactable';
import { Label } from './Label';
import { CHAR_SCALE } from '../world/StationMap';

export interface NpcProps {
  id: string;
  /** Kenney mini-character GLB (npc/ or arcade/ character). */
  model: string;
  position: [number, number, number];
  rotationY?: number;
  name: string;
  /** Looping clip: 'idle' | 'sit' | 'holding-both' | 'crouch' | … */
  pose?: string;
}

/**
 * A stationary NPC. All Kenney mini characters share the same clip set, so a
 * `pose` can pick any looping clip (sit on a sofa, carry a crate, crouch over
 * roadworks…). Pressing E nearby opens the DialogBox for `npc-<id>` — dialog
 * lines live in src/content/projects.ts.
 */
export function Npc({ id, model, position, rotationY = 0, name, pose = 'idle' }: NpcProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(model, true);

  // SkeletonUtils.clone so NPCs sharing a GLB get independent skeletons.
  const cloned = useMemo(() => skeletonClone(scene), [scene]);
  useEffect(() => {
    cloned.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [cloned]);

  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    const clipName = names.find((n) => n === pose) ?? names.find((n) => n === 'idle') ?? names[0];
    const clip = clipName ? actions[clipName] : undefined;
    clip?.reset().fadeIn(0.3).play();
    return () => {
      clip?.fadeOut(0.3);
    };
  }, [actions, names, pose]);

  return (
    <Interactable id={id} kind="npc" position={position} radius={2.2} panelId={`npc-${id}`} label="Talk">
      <group ref={group} rotation={[0, rotationY, 0]} scale={CHAR_SCALE}>
        <primitive object={cloned} />
      </group>
      {/* Floating name tag */}
      <Label text={name} position={[0, 1.75, 0]} color="#39ff14" fontSize={0.22} />
    </Interactable>
  );
}
