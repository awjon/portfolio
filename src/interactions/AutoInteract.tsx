import { useEffect } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../state/useGameStore';

const POLL_MS = 120;
/** Fraction of an interactable's prompt radius that counts as "arrived". */
const TRIGGER_FRACTION = 0.8;
/** How long the player must be still before it fires. */
const SETTLE_MS = 260;
/** Movement between two polls that still counts as standing still. */
const STILL_EPSILON = 0.06;

/**
 * Touch-only: walk up to something and it opens itself, so there is no
 * interact button on mobile.
 *
 * Two rules keep it from being annoying:
 *
 *  - it only fires once the player has come to a STOP inside the radius, so
 *    walking down the hall past three NPCs doesn't fire three dialogs;
 *  - once fired for an object it stays armed-off until the player leaves that
 *    object's radius, so closing a panel while still standing there doesn't
 *    immediately reopen it.
 *
 * Runs on its own timer rather than the R3F render loop — it needs to keep
 * ticking (checking `activePanel`) even before this component's first render
 * cycle after a panel closes, and doesn't need per-frame precision anyway.
 */
export function AutoInteract({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let firedFor: string | null = null;
    let stillSince = 0;
    // Stillness is measured from the player's own position rather than
    // `moveState`: the animation state is derived from a short vertical-
    // displacement window that can flap to 'fall' on a device dropping frames,
    // which would stop this from ever firing.
    const lastPos = new THREE.Vector3();

    const tick = () => {
      const {
        activePanel,
        nearbyInteractable,
        interactables,
        playerPos,
        openPanel,
        triggerPlayerAction,
      } = useGameStore.getState();

      // Re-arm as soon as the player is away from whatever last fired.
      if (firedFor) {
        const previous = interactables.get(firedFor);
        const gone =
          !previous || playerPos.distanceTo(previous.position) > previous.radius * 1.15;
        if (gone) firedFor = null;
      }

      if (activePanel || !nearbyInteractable || nearbyInteractable === firedFor) {
        stillSince = 0;
        lastPos.copy(playerPos);
        return;
      }

      const moved = lastPos.distanceTo(playerPos);
      lastPos.copy(playerPos);
      if (moved > STILL_EPSILON) {
        stillSince = 0;
        return;
      }

      const rec = interactables.get(nearbyInteractable);
      if (!rec || playerPos.distanceTo(rec.position) > rec.radius * TRIGGER_FRACTION) {
        stillSince = 0;
        return;
      }

      const now = performance.now();
      if (!stillSince) {
        stillSince = now;
        return;
      }
      if (now - stillSince < SETTLE_MS) return;

      firedFor = rec.id;
      stillSince = 0;
      triggerPlayerAction('pick-up');
      openPanel(rec.panelId);
    };

    const timer = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return null;
}
