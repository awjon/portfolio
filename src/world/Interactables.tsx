/**
 * Interactables
 * -------------
 * Everything the player can press E on: the six arcade cabinets that showcase
 * projects (panel ids match `project.billboard` in content/projects.ts), a
 * cast of NPC variations, and the animals scattered in and around the
 * station. Positions are map tiles (see StationMap) or raw world coords for
 * the outdoors. Facing: rotationY 0 = south, PI = north, ±PI/2 = east/west.
 */

import { ArcadeMachine } from '../interactions/ArcadeMachine';
import { Npc, type NpcProps } from '../interactions/Npc';
import { Animal, type AnimalProps } from '../interactions/Animal';
import { tileToWorld } from './StationMap';

const AR = '/models/arcade/';
const NP = '/models/npc/';

// ── Project kiosks (one arcade cabinet per project) ─────────────────────────
const MACHINES = [
  { id: 'm-wiseframe', url: AR + 'arcade-machine.glb', tile: [2, 1.2], rot: 0, panelId: 'works-wiseframe', title: 'WISEFRAME', color: '#00e5ff' },
  { id: 'm-rondevus', url: AR + 'pinball.glb', tile: [4, 1.2], rot: 0, panelId: 'works-rondevus', title: 'RONDEVUS', color: '#ff2d78' },
  { id: 'm-survival', url: AR + 'dance-machine.glb', tile: [7.4, 1.4], rot: 0, panelId: 'works-survival-sim', title: 'SURVIVAL SIM', color: '#b026ff' },
  { id: 'm-cleavercut', url: AR + 'claw-machine.glb', tile: [9, 1.2], rot: 0, panelId: 'works-cleavercut', title: 'CLEAVERCUT', color: '#ffb020', animate: true },
  { id: 'm-playground', url: AR + 'basketball-game.glb', tile: [1.4, 4], rot: Math.PI / 2, panelId: 'works-playground-finder', title: 'PLAYGROUND FINDER', color: '#39ff14' },
  { id: 'm-firebat', url: AR + 'air-hockey.glb', tile: [1.6, 7], rot: Math.PI / 2, panelId: 'works-firebat', title: 'FIREBAT HOMELAB', color: '#ff5533' },
] as const;

// ── NPC cast (every Kenney NPC model + the two arcade characters) ───────────
const NPCS: (Omit<NpcProps, 'position'> & { tile: [number, number]; y?: number })[] = [
  { id: 'guide', model: NP + 'character-male-a.glb', tile: [8, 12], rotationY: -2.2, name: 'GUIDE' },
  { id: 'visitor', model: NP + 'character-male-b.glb', tile: [7, 15], rotationY: 0.3, name: 'VISITOR', pose: 'holding-both' },
  { id: 'gamer', model: AR + 'character-gamer.glb', tile: [4, 2.2], rotationY: Math.PI, name: 'GAMER' },
  { id: 'highscore', model: NP + 'character-male-c.glb', tile: [10, 5], rotationY: Math.PI / 2, name: 'REGULAR' },
  { id: 'employee', model: AR + 'character-employee.glb', tile: [9, 7.2], rotationY: 0, name: 'EMPLOYEE' },
  { id: 'scientist', model: NP + 'character-female-c.glb', tile: [16, 3], rotationY: Math.PI, name: 'SCIENTIST' },
  { id: 'analyst', model: NP + 'character-female-d.glb', tile: [20.8, 3.2], rotationY: Math.PI, name: 'ANALYST' },
  { id: 'lounger', model: NP + 'character-female-e.glb', tile: [17.35, 14], y: 0.28, rotationY: Math.PI, name: 'LOUNGER', pose: 'sit' },
  { id: 'reader', model: NP + 'character-male-e.glb', tile: [21.8, 9.5], rotationY: Math.PI / 2, name: 'READER' },
  { id: 'walker', model: NP + 'character-female-b.glb', tile: [8, 18.5], rotationY: Math.PI, name: 'WALKER' },
  { id: 'parkgoer', model: NP + 'character-female-f.glb', tile: [28.5, 8.5], rotationY: -Math.PI / 2, name: 'PARKGOER' },
];

// ── Animals (all 15 species, in + around the station) ───────────────────────
// Indoor pets use map tiles; outdoor critters use raw world coords via `at`.
const ANIMALS: (Omit<AnimalProps, 'position'> & { tile?: [number, number]; at?: [number, number] })[] = [
  { species: 'cat', tile: [21, 2.2], rotationY: 0.8, ambient: 'idle' },
  { species: 'dog', tile: [20, 11.5], rotationY: -0.6, ambient: 'idle' },
  { species: 'penguin', tile: [4, 15], rotationY: 0.4, ambient: 'idle', size: 0.9 },
  // East park
  { species: 'deer', at: [30, -4], rotationY: 0.9, ambient: 'eat', size: 1.25 },
  { species: 'fox', at: [34, 2.5], rotationY: -1.8, ambient: 'idle', size: 1.1 },
  { species: 'bunny', at: [36.5, -2], rotationY: 2.3, ambient: 'eat', size: 0.85 },
  { species: 'monkey', at: [29, 6.5], rotationY: -0.4, ambient: 'dance', size: 0.95 },
  // West yard
  { species: 'giraffe', at: [-34, 4], rotationY: 1.2, ambient: 'eat', size: 1.5 },
  { species: 'tiger', at: [-30, -6], rotationY: 0.5, ambient: 'idle', size: 1.15 },
  { species: 'bee', at: [-27.5, 7.5], rotationY: -1.1, ambient: 'idle', size: 0.6 },
  { species: 'caterpillar', at: [-25, 10.5], rotationY: 2.6, ambient: 'eat', size: 0.7 },
  // North yard (under the skyline)
  { species: 'panda', at: [-6, -22], rotationY: 0.2, ambient: 'eat', size: 1.1 },
  { species: 'parrot', at: [16, -20.5], rotationY: -2.4, ambient: 'idle', size: 0.8 },
  // Near the entrance path / road
  { species: 'crab', at: [-4.5, 22], rotationY: 1.5, ambient: 'idle', size: 0.8 },
  { species: 'chick', at: [-17, 20], rotationY: -0.8, ambient: 'eat', size: 0.7 },
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

      {ANIMALS.map(({ tile, at, ...a }) => (
        <Animal
          key={a.species}
          {...a}
          position={tile ? tileToWorld(tile[0], tile[1]) : [at![0], 0, at![1]]}
        />
      ))}
    </>
  );
}
