import { useEffect, useState } from 'react';

/**
 * True on phone-width screens. Distinct from `useIsTouch`: a tablet or a
 * touchscreen laptop has room for build mode's side panels even though it has
 * no mouse, and a narrow desktop window doesn't, so layout keys off width and
 * input handling keys off touch.
 */
const QUERY = '(max-width: 640px)';

export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    onChange();
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return narrow;
}
