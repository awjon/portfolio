import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Every useFrame subscriber this frame — ecctrl's floating-capsule spring,
 * Rapier's own Physics stepper, ours — is handed the SAME raw delta from
 * R3F's clock. Rapier substeps its own gravity/contacts at a fixed 1/60
 * regardless of delta, so a hitch just costs it more substeps, safely. But
 * ecctrl samples the ground once per JS frame (one raycast, one floating-
 * spring force) and hands Rapier a velocity to hold for the WHOLE frame — on
 * a real hitch that "frame" can cover up to half a simulated second, so one
 * slightly-off raycast (a GC pause, a texture upload, a tab coming back from
 * the background) gets carried across dozens of substeps instead of one,
 * turning a normally invisible error into a visible fling or tumble. Capping
 * the delta at its source, before ANY subscriber sees it, bounds how much
 * simulated time a single bad sample can be stretched over — a hitch then
 * costs a brief slowdown instead of a catch-up jump.
 */
const MAX_DELTA = 1 / 20; // never let one frame represent more than ~50ms

/**
 * Battery/perf saver: R3F's default loop renders every frame forever, but
 * there's nothing to show while the browser tab is hidden, so we stop it then
 * and resume on return.
 *
 * A full-screen panel being open does NOT stop this any more — NPCs, arcade
 * cabinets and the player's own idle animation should keep animating behind
 * the dialogue/project panel, rather than freezing on whatever frame happened
 * to be showing when it opened. Movement input is blocked separately (see
 * Experience.tsx's keyboard map swap), not by stopping the render loop.
 */
export function RenderLoopController() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const clock = useThree((s) => s.clock);

  useEffect(() => {
    const anyClock = clock as unknown as { __deltaClamped?: boolean };
    if (anyClock.__deltaClamped) return;
    anyClock.__deltaClamped = true;
    const rawGetDelta = clock.getDelta.bind(clock);
    clock.getDelta = () => Math.min(rawGetDelta(), MAX_DELTA);
  }, [clock]);

  useEffect(() => {
    const onVisibility = () => setFrameloop(document.hidden ? 'never' : 'always');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [setFrameloop]);

  return null;
}
