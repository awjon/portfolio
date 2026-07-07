import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../state/useGameStore';

/**
 * Runs inside the R3F render loop but THROTTLED to ~10Hz (not every frame).
 * Each tick it finds the closest interactable within its radius and sets it as
 * `nearbyInteractable` in the store. The HUD reads that to show "Press E".
 *
 * Rendered once, inside <Canvas>. Cheap: it's a distance compare over a handful
 * of registered objects, not a raycast.
 */
export function ProximityDetector() {
  const acc = useRef(0);

  useFrame((_, delta) => {
    acc.current += delta;
    if (acc.current < 0.1) return; // 10Hz
    acc.current = 0;

    const { playerPos, interactables, nearbyInteractable, setNearbyInteractable, isPaused } =
      useGameStore.getState();

    // Don't recompute proximity while a panel is open.
    if (isPaused) return;

    let closestId: string | null = null;
    let closestDist = Infinity;

    interactables.forEach((rec) => {
      const d = playerPos.distanceTo(rec.position);
      if (d <= rec.radius && d < closestDist) {
        closestDist = d;
        closestId = rec.id;
      }
    });

    if (closestId !== nearbyInteractable) {
      setNearbyInteractable(closestId);
    }
  });

  return null;
}
