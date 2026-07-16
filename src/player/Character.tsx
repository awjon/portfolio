import { useEffect, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, type MoveState } from '../state/useGameStore';
import { KitModel, SafeModel } from '../world/Props';

const MODEL = '/models/character/character-male-d.glb';

/**
 * The playable Kenney mini character. Its GLB ships a full clip set —
 * locomotion here maps to idle / walk / sprint / jump / fall, one-shot
 * actions (pick-up on E) interrupt locomotion and hand back when finished,
 * and the F "carry" toggle swaps the idle pose for holding-both with a
 * cardboard box in hand.
 */

const LOCOMOTION: Record<MoveState, string> = {
  idle: 'idle',
  walk: 'walk',
  run: 'sprint',
  jump: 'jump',
  fall: 'fall',
};

export function Character() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL, true);
  const { actions, mixer } = useAnimations(animations, group);

  const moveState = useGameStore((s) => s.moveState);
  const holding = useGameStore((s) => s.holding);
  const playerAction = useGameStore((s) => s.playerAction);

  useEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [scene]);

  // One-shot actions (pick-up etc.): play once, then return to locomotion.
  useEffect(() => {
    if (!playerAction) return;
    const clip = actions[playerAction.name];
    if (!clip) {
      useGameStore.getState().clearPlayerAction();
      return;
    }
    clip.setLoop(THREE.LoopOnce, 1);
    clip.clampWhenFinished = true;
    clip.reset().fadeIn(0.1).play();
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === clip) useGameStore.getState().clearPlayerAction();
    };
    mixer.addEventListener('finished', onFinished as never);
    return () => {
      mixer.removeEventListener('finished', onFinished as never);
      clip.fadeOut(0.15);
    };
  }, [playerAction, actions, mixer]);

  // Locomotion loop (suspended while a one-shot is playing).
  useEffect(() => {
    if (playerAction) return;
    const name = holding && moveState === 'idle' ? 'holding-both' : LOCOMOTION[moveState];
    const next = actions[name] ?? actions['idle'];
    if (!next) return;
    next.setLoop(THREE.LoopRepeat, Infinity);
    next.reset().fadeIn(0.18).play();
    return () => {
      next.fadeOut(0.18);
    };
  }, [moveState, holding, playerAction, actions]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
      {/* Carried box (F toggles). Positions are in the character's native
          0.72-unit-tall space; the parent group applies CHAR_SCALE. */}
      {holding && (
        <group position={[0, 0.42, -0.25]}>
          <SafeModel>
            <KitModel url="/models/furniture/cardboardBoxOpen.glb" scale={0.5} />
          </SafeModel>
        </group>
      )}
    </group>
  );
}

useGLTF.preload(MODEL, true);
