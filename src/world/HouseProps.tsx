/**
 * HouseProps
 * ----------
 * Non-interactive interior dressing. The actual furniture list lives in
 * src/content/placement.json (positions are grid tiles — see HouseMap; a cell
 * spans ±0.5, so `row: -0.27` means "backed against the wall on the north
 * edge of row 0") and is edited visually in Build Mode (see src/editor) —
 * press B in a local dev server to drag pieces around instead of hand-editing
 * coordinates here.
 *
 * Facing: rotationY 0 faces south (+Z, down the plan), PI north, +PI/2 east,
 * -PI/2 west — so a piece against the north wall gets rotationY 0.
 */

import { Props } from './Props';
import { useEditorStore } from '../editor/useEditorStore';

export function HouseProps() {
  const items = useEditorStore((s) => s.data.furniture);
  return <Props items={items} />;
}
