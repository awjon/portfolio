/**
 * Interactables
 * -------------
 * Everything the player can press E on:
 *
 *  - six arcade cabinets in the games den, one per project (panel ids match
 *    `project.billboard` in content/projects.ts). They are deliberately packed
 *    into one small room so the whole portfolio is a few steps apart.
 *  - the household: every human NPC lives INDOORS, one or two per room.
 *  - the animals: all fifteen live OUTDOORS, in the gardens and on the verge.
 *
 * Indoor positions are map tiles (see HouseMap), outdoor ones are raw world
 * x/z via `at`. Facing: rotationY 0 = south, PI = north, ±PI/2 = east/west.
 */

import { ArcadeMachine } from '../interactions/ArcadeMachine';
import { Npc, type NpcProps } from '../interactions/Npc';
import { Animal, type AnimalProps } from '../interactions/Animal';
import { BACK_GROWTH, EAST_GROWTH, FRONT_GROWTH, WEST_GROWTH, tileToWorld } from './HouseMap';

const AR = '/models/arcade/';
const NP = '/models/npc/';

// ── Project kiosks — all six line the walls of the games den ────────────────
const MACHINES = [
  { id: 'm-wiseframe', url: AR + 'arcade-machine.glb', tile: [6.85, 3.82], rot: 0, panelId: 'works-wiseframe', title: 'WISEFRAME', color: '#00b7d4' },
  { id: 'm-rondevus', url: AR + 'pinball.glb', tile: [7.7, 3.95], rot: 0, panelId: 'works-rondevus', title: 'RONDEVUS', color: '#e01e63' },
  { id: 'm-survival', url: AR + 'dance-machine.glb', tile: [10, 4.12], rot: 0, panelId: 'works-survival-sim', title: 'SURVIVAL SIM', color: '#8e24aa' },
  { id: 'm-cleavercut', url: AR + 'claw-machine.glb', tile: [11.05, 4.0], rot: -Math.PI / 2, panelId: 'works-cleavercut', title: 'CLEAVERCUT', color: '#ef6c00', animate: true },
  { id: 'm-playground', url: AR + 'basketball-game.glb', tile: [7.1, 5.85], rot: Math.PI, panelId: 'works-playground-finder', title: 'PLAYGROUND FINDER', color: '#2e7d32' },
  { id: 'm-firebat', url: AR + 'air-hockey.glb', tile: [8.8, 6.05], rot: Math.PI, panelId: 'works-firebat', title: 'FIREBAT HOMELAB', color: '#d84315' },
] as const;

// ── The household — humans, indoors only ───────────────────────────────────
const NPCS: (Omit<NpcProps, 'position'> & { tile: [number, number]; y?: number })[] = [
  // Hall
  { id: 'host', model: NP + 'character-male-a.glb', tile: [4.35, 6.15], rotationY: 0.5, name: 'HOST' },
  { id: 'visitor', model: NP + 'character-female-b.glb', tile: [5.3, 5.5], rotationY: -2.3, name: 'VISITOR', pose: 'holding-both' },
  // Kitchen / diner
  { id: 'cook', model: NP + 'character-female-c.glb', tile: [5, 0.5], rotationY: Math.PI, name: 'COOK' },
  { id: 'guest', model: NP + 'character-male-b.glb', tile: [2.95, 2.05], y: 0.26, rotationY: Math.PI, name: 'GUEST', pose: 'sit' },
  // Study
  { id: 'analyst', model: NP + 'character-female-d.glb', tile: [8, 0.6], y: 0.28, rotationY: Math.PI, name: 'ANALYST', pose: 'sit' },
  { id: 'reader', model: NP + 'character-male-e.glb', tile: [9.65, 2.5], rotationY: Math.PI / 2, name: 'READER' },
  // Living room
  { id: 'lounger', model: NP + 'character-female-e.glb', tile: [1.55, 4.4], y: 0.24, rotationY: Math.PI, name: 'LOUNGER', pose: 'sit' },
  { id: 'bookworm', model: NP + 'character-male-c.glb', tile: [2.42, 5.9], y: 0.3, rotationY: Math.PI / 2, name: 'BOOKWORM', pose: 'sit' },
  { id: 'dj', model: NP + 'character-female-f.glb', tile: [2.3, 3.1], rotationY: 2.6, name: 'DJ' },
  // Games den
  { id: 'gamer', model: AR + 'character-gamer.glb', tile: [7.75, 4.75], rotationY: Math.PI, name: 'GAMER' },
  { id: 'challenger', model: AR + 'character-employee.glb', tile: [9.5, 4.95], rotationY: 0, name: 'CHALLENGER' },
];

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
  return (
    <>
      {MACHINES.map((m) => (
        <ArcadeMachine
          key={m.id}
          id={m.id}
          url={m.url}
          position={tileToWorld(m.tile[0], m.tile[1])}
          rotationY={m.rot}
          panelId={m.panelId}
          title={m.title}
          color={m.color}
          animate={'animate' in m ? m.animate : false}
        />
      ))}

      {NPCS.map(({ tile, y, ...npc }) => {
        const [x, , z] = tileToWorld(tile[0], tile[1]);
        return <Npc key={npc.id} {...npc} position={[x, y ?? 0, z]} />;
      })}

      {ANIMALS.map(({ at, ...a }) => (
        <Animal key={a.species} {...a} position={[at[0], 0, at[1]]} />
      ))}
    </>
  );
}
