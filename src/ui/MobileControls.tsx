import { useEffect } from 'react';
import { EcctrlJoystick, useJoystickControls } from 'ecctrl';
import { useGameStore } from '../state/useGameStore';

/**
 * Mobile-only controls, rendered OUTSIDE the <Canvas> as a DOM overlay.
 *
 * - <EcctrlJoystick> draws a left thumbstick that feeds movement into the same
 *   ecctrl controller the keyboard uses — no extra wiring needed for walking.
 * - We add one action button (buttonNumber={1}) and bridge its press to the
 *   existing interaction logic: if the player is near a billboard/NPC, it opens
 *   that panel; if a panel is open, it closes it. This mirrors the E / ESC keys.
 */
export function MobileControls() {
  // Bridge the joystick action button -> interaction system.
  useEffect(() => {
    // Subscribe to the joystick store; when button1 goes from up->down, act.
    let wasPressed = false;
    const unsub = useJoystickControls.subscribe((state) => {
      const pressed = state.curButton1Pressed;
      if (pressed && !wasPressed) {
        const { activePanel, nearbyInteractable, interactables, openPanel, closePanel } =
          useGameStore.getState();
        if (activePanel) {
          closePanel();
        } else if (nearbyInteractable) {
          const rec = interactables.get(nearbyInteractable);
          if (rec) openPanel(rec.panelId);
        }
      }
      wasPressed = pressed;
    });
    return () => unsub();
  }, []);

  return (
    <EcctrlJoystick
      buttonNumber={1}
      joystickPositionLeft={90}
      joystickPositionBottom={90}
      buttonPositionRight={40}
      buttonPositionBottom={90}
    />
  );
}
