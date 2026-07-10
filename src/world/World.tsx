import { StationShell } from './StationShell';
import { StationProps } from './StationProps';
import { Exterior } from './Exterior';
import { tileToWorld } from './StationMap';

/**
 * The world: a Kenney space-station arcade sitting in a small night-time city
 * block. StationShell draws the building (cell-centered walls/doors/windows
 * + colliders) from the ASCII map, StationProps dresses the rooms, Exterior
 * adds the street/skyline/park, and the point lights below give each room its
 * own mood (arcade = neon, lab = cool white, lounge/hub = warm).
 */

const light = (tile: [number, number], color: string, intensity: number, distance: number, y = 3.4) => {
  const [x, , z] = tileToWorld(tile[0], tile[1]);
  return { position: [x, y, z] as [number, number, number], color, intensity, distance };
};

const LIGHTS = [
  light([3.5, 3.5], '#ff2d90', 20, 17), // arcade neon (magenta)
  light([8.5, 6.5], '#00e5ff', 20, 17), // arcade neon (cyan)
  light([18, 3], '#dfe8ff', 22, 18), // lab
  light([18, 12], '#ffd9a8', 22, 18), // lounge
  light([6, 13], '#ffd9a8', 18, 16), // hub
  light([3, 13], '#7cf0ff', 7, 6, 1.7), // hologram-planet glow
  light([6, 19], '#fff0d0', 12, 14, 3), // entrance / walkway
];

export function World() {
  return (
    <>
      <StationShell />
      <StationProps />
      <Exterior />
      {LIGHTS.map((l, i) => (
        <pointLight key={i} {...l} decay={2} />
      ))}
    </>
  );
}
