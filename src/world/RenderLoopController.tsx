import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useGameStore } from '../state/useGameStore';

/**
 * Battery/perf saver. R3F's default loop renders every frame forever. We stop
 * it in two cases:
 *   1. The browser tab is hidden (user switched away).
 *   2. A full-screen panel is open (isPaused) — the 3D view is covered anyway.
 *
 * We toggle the internal frameloop via the R3F `invalidate`/`setFrameloop`
 * mechanism. When active we run 'always' (physics needs continuous ticks);
 * when paused we switch to 'never' so the GPU idles.
 */
export function RenderLoopController() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const isPaused = useGameStore((s) => s.isPaused);

  // Pause when a panel is open.
  useEffect(() => {
    setFrameloop(isPaused ? 'never' : 'always');
  }, [isPaused, setFrameloop]);

  // Pause when the tab loses visibility; resume on return (unless a panel is
  // still open).
  useEffect(() => {
    const onVisibility = () => {
      const paused = useGameStore.getState().isPaused;
      if (document.hidden) setFrameloop('never');
      else setFrameloop(paused ? 'never' : 'always');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [setFrameloop]);

  return null;
}
