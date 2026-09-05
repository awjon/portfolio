/**
 * Interactables
 * -------------
 * Everything the player can press E on:
 *
 *  - six arcade cabinets in the games den, one per project (panel ids match
 *    `project.billboard` in content/projects.ts). Their positions live in
 *    src/content/placement.json, same as the household below.
 *  - the household: every human NPC lives INDOORS, one or two per room —
 *    also in placement.json.
 *  - the animals: all fifteen live OUTDOORS, in the gardens and on the verge
 *    (hardcoded here — Build Mode only covers what's inside the house).
 *
 * Furniture/NPC/machine positions are edited visually in Build Mode (press B
 * in a local dev server) instead of by hand — see src/editor. Indoor
 * positions are map tiles (see HouseMap), outdoor animals use raw world x/z
 * via `at`. Facing: rotationY 0 = south, PI = north, ±PI/2 = east/west.
 */

import { ArcadeMachine } from '../interactions/ArcadeMachine';
import { Npc } from '../interactions/Npc';
import { Animal, type AnimalProps } from '../interactions/Animal';
import { BACK_GROWTH, EAST_GROWTH, FRONT_GROWTH, WEST_GROWTH, tileToWorld } from './HouseMap';
import { useEditorStore } from '../editor/useEditorStore';

// ── Animals — all fifteen live outdoors, in raw world coords ───────────────
// Positions near the house add the matching *_GROWTH delta (see HouseMap) so
// they stay outside the walls now that the architecture is 1.5x bigger.
const ANIMALS: (Omit<AnimalProps, 'position'> & { at: [number, number] })[] = [
  // Front garden, either side of the path
  { species: 'dog', at: [3.5, 9 + FRONT_GROWTH], rotationY: -2.4, ambient: 'idle' },
  { species: 'cat', at: [-4.5, 8.4 + FRONT_GROWTH], rotationY: 0.9, ambient: 'idle' },
  { species: 'bunny', at: [-7.2, 11.5 + FRONT_GROWTH], rotationY: 2.2, ambient: 'eat', size: 0.85 },
  { species: 'chick', at: [2, 12 + FRONT_GROWTH], rotationY: -0.7, ambient: 'eat', size: 0.7 },
  // Back garden
  { species: 'deer', at: [-6, -12 + BACK_GROWTH], rotationY: 0.9, ambient: 'eat', size: 1.25 },
  { species: 'fox', at: [4, -9.5 + BACK_GROWTH], rotationY: -1.8, ambient: 'idle', size: 1.1 },
  { species: 'panda', at: [-12.5, -9 + BACK_GROWTH], rotationY: 0.3, ambient: 'eat', size: 1.1 },
  { species: 'caterpillar', at: [1.2, -7.6 + BACK_GROWTH], rotationY: 2.6, ambient: 'eat', size: 0.7 },
  { species: 'parrot', at: [8.5, -14 + BACK_GROWTH], rotationY: -2.4, ambient: 'idle', size: 0.8 },
  { species: 'monkey', at: [-15, -16 + BACK_GROWTH], rotationY: -0.4, ambient: 'dance', size: 0.95 },
  // West side garden
  { species: 'giraffe', at: [-14 + WEST_GROWTH, 2], rotationY: 1.2, ambient: 'eat', size: 1.5 },
  { species: 'tiger', at: [-13.5 + WEST_GROWTH, 8], rotationY: 0.5, ambient: 'idle', size: 1.15 },
  // East side garden
  { species: 'bee', at: [12.5 + EAST_GROWTH, -4], rotationY: -1.1, ambient: 'idle', size: 0.6 },
  { species: 'penguin', at: [13 + EAST_GROWTH, 6.5], rotationY: 0.4, ambient: 'idle', size: 0.9 },
  { species: 'crab', at: [16 + EAST_GROWTH, 10.5], rotationY: 1.5, ambient: 'idle', size: 0.8 },
];

export function Interactables() {
  const machines = useEditorStore((s) => s.data.machines);
  const npcs = useEditorStore((s) => s.data.npcs);

  return (
    <>
      {machines.map((m) => (
        <ArcadeMachine
          key={m.id}
          id={m.id}
          url={m.url}
          position={tileToWorld(m.tile[0], m.tile[1])}
          rotationY={m.rotationY ?? 0}
          panelId={m.panelId}
          title={m.title}
          color={m.color}
          animate={m.animate ?? false}
        />
      ))}

      {npcs.map(({ tile, y, ...npc }) => {
        const [x, , z] = tileToWorld(tile[0], tile[1]);
        return <Npc key={npc.id} {...npc} position={[x, y ?? 0, z]} />;
      })}

      {ANIMALS.map(({ at, ...a }) => (
        <Animal key={a.species} {...a} position={[at[0], 0, at[1]]} />
      ))}
    </>
  );
}
