import { useEffect } from 'react';
import { useGameStore } from '../state/useGameStore';

/**
 * DOM-level key handling: E interacts (with a pick-up animation), F toggles
 * the carry pose, ESC closes panels. Kept out of the R3F loop so it works
 * even when the render loop is paused.
 */
export function InteractionControls() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const {
        activePanel,
        nearbyInteractable,
        interactables,
        openPanel,
        closePanel,
        triggerPlayerAction,
        toggleHolding,
      } = useGameStore.getState();

      if (e.code === 'Escape') {
        if (activePanel) closePanel();
        return;
      }

      if (e.code === 'KeyF') {
        if (!activePanel) toggleHolding();
        return;
      }

      if (e.code === 'KeyE') {
        // If a panel is open, E does nothing (ESC closes).
        if (activePanel) return;
        if (!nearbyInteractable) return;
        const rec = interactables.get(nearbyInteractable);
        if (rec) {
          triggerPlayerAction('pick-up');
          openPanel(rec.panelId);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return null;
}
