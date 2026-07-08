import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useGameStore } from '../state/useGameStore';
import * as THREE from 'three';

/**
 * Kenney-adapted character.
 *
 * Kenney's "Animated Characters: Protagonists" / "Survivors" packs (CC0) ship a
 * rigged GLB with multiple named clips. The EXACT clip names vary by pack and
 * version (e.g. "idle" vs "Idle", "sprint" vs "run"), so instead of hardcoding
 * them we detect the available clips and match by keyword. Drop in any Kenney
 * animated character at /public/models/character/character-male-d.glb and it adapts.
 *
 * If nothing matches a tier, we gracefully fall back (walk -> run -> idle).
 */

// Keyword priority lists, matched case-insensitively against clip names.
const CLIP_KEYWORDS: Record<'idle' | 'walk' | 'run', string[]> = {
  idle: ['idle', 'static', 'rest'],
  walk: ['walk', 'walking'],
  run: ['run', 'sprint', 'jog'],
};

function findClip(names: string[], keys: string[]): string | undefined {
  const lower = names.map((n) => n.toLowerCase());
  for (const key of keys) {
    const i = lower.findIndex((n) => n.includes(key));
    if (i !== -1) return names[i];
  }
  return undefined;
}

export function Character() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/models/character/character-male-d.glb', true);
  const { actions, names } = useAnimations(animations, group);
  const moveState = useGameStore((s) => s.moveState);

  // Resolve the real clip name for each tier once, with fallbacks.
  const resolved = useMemo(() => {
    const idle = findClip(names, CLIP_KEYWORDS.idle) ?? names[0];
    const walk = findClip(names, CLIP_KEYWORDS.walk);
    const run = findClip(names, CLIP_KEYWORDS.run);
    return {
      idle,
      walk: walk ?? run ?? idle, // no dedicated walk? use run, then idle
      run: run ?? walk ?? idle,
    };
  }, [names]);

  useEffect(() => {
    // Log once so you can see what the pack actually contains.
    if (names.length) console.info('[Character] clips found:', names, '->', resolved);
  }, [names, resolved]);

  useEffect(() => {
    const target = resolved[moveState];
    const next = target ? actions[target] : undefined;
    if (!next) return;

    // For the "walk" tier when we're reusing the run clip, slow it down a touch
    // so walking doesn't look like a full sprint.
    if (moveState === 'walk' && resolved.walk === resolved.run) {
      next.timeScale = 0.6;
    } else {
      next.timeScale = 1;
    }

    Object.values(actions).forEach((a) => {
      if (a && a !== next && a.isRunning()) a.fadeOut(0.2);
    });
    next.reset().fadeIn(0.2).play();

    return () => {
      next.fadeOut(0.2);
    };
  }, [moveState, actions, resolved]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/character/character-male-d.glb', true);
