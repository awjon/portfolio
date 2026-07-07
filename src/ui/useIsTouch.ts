import { useEffect, useState } from 'react';

/**
 * Returns true on touch-primary devices (phones/tablets). Used to show the
 * on-screen joystick + action button only where there's no keyboard.
 *
 * We check pointer capability rather than user-agent sniffing: `pointer: coarse`
 * is the reliable signal for a touch-first device. We also re-check on resize
 * so plugging in a mouse / rotating doesn't strand the wrong controls.
 */
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(mq.matches || 'ontouchstart' in window);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return isTouch;
}
