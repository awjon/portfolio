import { useEffect, useState } from 'react';

/**
 * Synchronous version, for the handful of places that need the answer before
 * effects run (ecctrl reads its camera props once, at construction).
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}

/**
 * Returns true on touch-primary devices (phones/tablets). Gates the gesture
 * scheme — double-tap to walk, automatic interactions, gesture hints — that
 * replaces the keyboard where there isn't one.
 *
 * We check pointer capability rather than user-agent sniffing: `pointer: coarse`
 * is the reliable signal for a touch-first device. We also re-check on resize
 * so plugging in a mouse / rotating doesn't strand the wrong controls.
 */
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(isTouchDevice());
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  return isTouch;
}
