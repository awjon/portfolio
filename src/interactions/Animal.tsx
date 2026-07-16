import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Interactable } from './Interactable';
import { Label } from './Label';
import { useGameStore } from '../state/useGameStore';
import { ANIMAL_SCALE } from '../world/StationMap';

export interface AnimalProps {
  /** e.g. 'cat' → /models/animals/animal-cat.glb and dialog key npc-animal-cat */
  species: string;
  position: [number, number, number];
  rotationY?: number;
  /** Extra multiplier on the shared animal scale (giraffes bigger, bees smaller). */
  size?: number;
  /** Ambient looping clip: 'idle' | 'eat' | 'dance'. */
  ambient?: string;
  name?: string;
}

/**
 * A Kenney animal with a little life: loops an ambient clip (idle/eat), and
 * DANCES while you're talking to it (its dialog panel is open). Press E
 * nearby to say hi — placeholder lines live in src/content/projects.ts.
 */
export function Animal({
  species,
  position,
  rotationY = 0,
  size = 1,
  ambient = 'idle',
  name,
}: AnimalProps) {
  const id = `animal-${species}`;
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(`/models/animals/animal-${species}.glb`, true);
  const cloned = useMemo(() => skeletonClone(scene), [scene]);
  useEffect(() => {
    cloned.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [cloned]);

  const { actions, names } = useAnimations(animations, group);
  const activePanel = useGameStore((s) => s.activePanel);
  const talking = activePanel === `npc-${id}`;

  useEffect(() => {
    const want = talking ? 'dance' : ambient;
    const clipName = names.find((n) => n === want) ?? names.find((n) => n === 'idle') ?? names[0];
    const clip = clipName ? actions[clipName] : undefined;
    clip?.reset().fadeIn(0.25).play();
    return () => {
      clip?.fadeOut(0.25);
    };
  }, [actions, names, ambient, talking]);

  const scale = ANIMAL_SCALE * size;

  return (
    <Interactable id={id} kind="animal" position={position} radius={2} panelId={`npc-${id}`} label="Say hi">
      <group ref={group} rotation={[0, rotationY, 0]} scale={scale}>
        <primitive object={cloned} />
      </group>
      <Label text={name ?? species} position={[0, 2.2 * scale + 0.35, 0]} color="#ffd166" fontSize={0.18} />
    </Interactable>
  );
}
