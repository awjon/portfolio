import { useEffect, useMemo, useRef } from 'react';
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

/**
 * 'walk' and 'sprint' each bake a vertical bounce into the root bone (0 → 0.05
 * local units for walk, 0 → 0.2 for sprint — a third of the character's own
 * height). ecctrl already drives vertical position from physics, entirely
 * independently of the mesh's animation, so this bounce doesn't move the
 * capsule at all — it just lifts the model off the ground every stride,
 * worst at a sprint, reading as the character hovering/floating while it runs.
 * ('sit'/'drive' use the same root-Y channel deliberately, to sink onto a
 * seat, so only these two locomotion clips get stripped.)
 */
const DEBOUNCE_CLIPS = new Set(['walk', 'sprint']);

function stripLocomotionBounce(clips: THREE.AnimationClip[]) {
  for (const clip of clips) {
    if (!DEBOUNCE_CLIPS.has(clip.name)) continue;
    for (const track of clip.tracks) {
      if (!track.name.endsWith('.position')) continue;
      const values = track.values; // VectorKeyframeTrack: flat [x,y,z, x,y,z, ...]
      for (let i = 1; i < values.length; i += 3) values[i] = 0;
    }
  }
}

export function Character() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL, true);
  // Mutates the cached clips once per load, before useAnimations binds them to
  // the mixer — cheap and idempotent, so re-renders are harmless to repeat.
  useMemo(() => stripLocomotionBounce(animations), [animations]);
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
