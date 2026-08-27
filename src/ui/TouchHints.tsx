import { useEffect, useState } from 'react';

const GESTURES = [
  ['Double-tap', 'walk there'],
  ['Drag', 'look around'],
  ['Pinch', 'zoom'],
  ['Walk up to someone', 'they talk to you'],
];

/**
 * Touch-only: a one-off card explaining the gestures, which fades itself out.
 *
 * Mobile has no joystick and no buttons any more — movement is double-tap and
 * interaction happens on its own — so the scheme has to be stated once or it
 * is undiscoverable. It reappears on reload; that is deliberate, since a
 * portfolio visitor is almost always a first-time visitor.
 */
export function TouchHints() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 7000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 transition-opacity duration-1000 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="rounded-xl border border-white/15 bg-black/55 px-4 py-3 backdrop-blur-sm">
        <ul className="space-y-1 font-mono text-xs text-white/75">
          {GESTURES.map(([gesture, meaning]) => (
            <li key={gesture}>
              <span className="text-white">{gesture}</span> — {meaning}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
