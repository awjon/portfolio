import { HouseShell } from './HouseShell';
import { HouseProps } from './HouseProps';
import { Exterior } from './Exterior';
import { ROOM_CENTER, tileToWorld, WALL_HEIGHT, type Room } from './HouseMap';

/**
 * The world: a small daytime house in its garden. HouseShell draws the
 * building (edge walls, doors, windows, roof + colliders) from the ownership
 * grid, HouseProps dresses the rooms, Exterior lays out the plot.
 *
 * The sun does most of the lighting (the house has no ceiling), so the lamps
 * below are only gentle warm fills that keep each room from going flat where
 * the walls shade it.
 */

const lamp = (room: Room, color: string, intensity: number, distance: number) => {
  const [c, r] = ROOM_CENTER[room];
  const [x, , z] = tileToWorld(c, r);
  return { position: [x, WALL_HEIGHT * 0.8, z] as [number, number, number], color, intensity, distance };
};

const LAMPS = [
  lamp('K', '#fff1d8', 6, 9),
  lamp('S', '#ffeccd', 6, 9),
  lamp('H', '#ffe9c8', 5, 8),
  lamp('L', '#ffe6c0', 7, 10),
  lamp('G', '#cfe2ff', 8, 10),
];

export function World() {
  return (
    <>
      <HouseShell />
      <HouseProps />
      <Exterior />
      {LAMPS.map((l, i) => (
        <pointLight key={i} {...l} decay={2} />
      ))}
    </>
  );
}
