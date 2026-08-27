/**
 * defaultLayout
 * -------------
 * The house as shipped — the layout every visitor sees before they touch
 * anything, and the one the Reset button restores.
 *
 * There are two ways to author it, and you can use whichever suits the change:
 *
 *  1. **Build it in the browser.** Open build mode, move things until you like
 *     it, press Export, and save the downloaded file over
 *     `src/build/layout.json`. Any non-empty `objects` array in that file wins
 *     over everything below. This is the fast path — no coordinates by hand.
 *
 *  2. **Edit the seed below.** Still the readable form: grid tiles, `on()` for
 *     table-top lifts, radians for facing. `layout.json` ships with an empty
 *     `objects` array, so this is what runs until you export over it. Best for
 *     small, reviewable diffs — "move the sofa one tile north" is one number
 *     here and a 100-object blob there.
 *
 * `toSceneObjects()` converts the seed once at module load into the flat
 * world-space list build mode actually edits.
 *
 * Positions are grid tiles (see HouseMap); fractional coords are fine and a
 * cell spans ±0.5, so `row: -0.27` means "backed against the north wall".
 * Facing: rotationY 0 faces south (+Z, down the plan), PI north, +PI/2 east.
 * Rooms: K kitchen/diner · S study · H hall · L living room · G games den.
 */

import {
  BACK_GROWTH,
  EAST_GROWTH,
  FRONT_GROWTH,
  FURNITURE_SCALE,
  WEST_GROWTH,
  tileToWorld,
} from '../world/HouseMap';
import type { SceneObject } from './types';
import exported from './layout.json';

const F = '/models/furniture/';
const AR = '/models/arcade/';
const NP = '/models/npc/';

/** Lifts a table-top item onto its surface (world units). */
const on = (h: number): [number, number, number] => [0, h * FURNITURE_SCALE, 0];

interface SeedProp {
  url: string;
  /** Grid placement (fractional / out-of-grid allowed) … */
  tile?: [number, number];
  /** … or raw world x/z. */
  at?: [number, number];
  /** World-space offset added after tile/at. */
  offset?: [number, number, number];
  rotationY?: number;
  /** Multiplier on the kind's base scale — 1 means "as authored". */
  scale?: number;
  collider?: boolean;
  animate?: boolean;
}

// ── Interior dressing, room by room ─────────────────────────────────────────
const PROPS: SeedProp[] = [
  // ── Kitchen / diner ───────────────────────────────────────────────────────
  // Counter run along the north wall (the back door takes the c2 bay).
  { url: F + 'kitchenCabinetDrawer.glb', tile: [3, -0.26], collider: true },
  { url: F + 'kitchenSink.glb', tile: [4, -0.26], collider: true },
  { url: F + 'kitchenStove.glb', tile: [5, -0.26], collider: true },
  { url: F + 'kitchenFridge.glb', tile: [6, -0.3], collider: true },
  { url: F + 'hoodModern.glb', tile: [5, -0.26], offset: on(0.95) },
  { url: F + 'kitchenCabinetUpper.glb', tile: [3, -0.3], offset: on(0.95) },
  { url: F + 'kitchenMicrowave.glb', tile: [3, -0.26], offset: on(0.46) },
  { url: F + 'kitchenCoffeeMachine.glb', tile: [3.4, -0.26], offset: on(0.46) },
  { url: F + 'toaster.glb', tile: [4.45, -0.26], offset: on(0.46) },
  // Dining table under the window
  { url: F + 'tableCloth.glb', tile: [2.6, 1.6], collider: true },
  { url: F + 'chairCushion.glb', tile: [2.25, 1.15], rotationY: 0 },
  { url: F + 'chairCushion.glb', tile: [2.95, 1.15], rotationY: 0 },
  { url: F + 'chairCushion.glb', tile: [2.25, 2.05], rotationY: Math.PI },
  { url: F + 'chairCushion.glb', tile: [2.95, 2.05], rotationY: Math.PI },
  { url: F + 'plantSmall2.glb', tile: [2.6, 1.6], offset: on(0.34) },
  { url: F + 'trashcan.glb', tile: [6.2, 1.4] },
  { url: F + 'pottedPlant.glb', tile: [0.35, 2.3] },
  { url: F + 'rugRounded.glb', tile: [1.2, 1.4] },

  // ── Study ─────────────────────────────────────────────────────────────────
  { url: F + 'desk.glb', tile: [8, -0.22], collider: true },
  { url: F + 'computerScreen.glb', tile: [8, -0.22], offset: on(0.39) },
  { url: F + 'computerKeyboard.glb', tile: [8, 0.02], offset: on(0.39) },
  { url: F + 'chairDesk.glb', tile: [8, 0.6], rotationY: Math.PI },
  { url: F + 'table.glb', tile: [9.1, -0.22], collider: true },
  { url: F + 'laptop.glb', tile: [9.1, -0.22], offset: on(0.34) },
  { url: F + 'bookcaseClosedWide.glb', tile: [10.2, 1.3], rotationY: -Math.PI / 2, collider: true },
  { url: F + 'bookcaseOpen.glb', tile: [10.2, 2.5], rotationY: -Math.PI / 2, collider: true },
  { url: F + 'books.glb', tile: [10.2, 2.5], offset: [-0.1, 0.62 * FURNITURE_SCALE, 0], rotationY: -Math.PI / 2 },
  { url: F + 'sideTable.glb', tile: [7.3, 2.6], rotationY: Math.PI / 2 },
  { url: F + 'lampSquareTable.glb', tile: [7.3, 2.6], offset: on(0.39) },
  { url: F + 'rugSquare.glb', tile: [8.8, 1.9] },
  { url: F + 'pottedPlant.glb', tile: [9.7, 0.4] },
  { url: F + 'cardboardBoxClosed.glb', tile: [7.4, 0.4], rotationY: 0.4 },

  // ── Hall (kept deliberately clear — it is the route to everywhere) ────────
  { url: F + 'rugDoormat.glb', tile: [5, 7.15] },
  { url: F + 'rugRectangle.glb', tile: [5, 5.6] },
  { url: F + 'coatRackStanding.glb', tile: [3.8, 7.05] },
  { url: F + 'sideTableDrawers.glb', tile: [5.25, 6.95], rotationY: -Math.PI / 2 },
  { url: F + 'lampSquareTable.glb', tile: [5.25, 6.95], offset: on(0.39) },
  { url: F + 'pottedPlant.glb', tile: [6.3, 2.3] },
  { url: F + 'lampRoundFloor.glb', tile: [4.35, 5.6] },
  { url: F + 'bookcaseClosed.glb', tile: [6.25, 3.3], rotationY: -Math.PI / 2, collider: true },
  { url: F + 'plantSmall3.glb', tile: [6.25, 3.3], offset: on(0.9), rotationY: -Math.PI / 2 },
  { url: F + 'pottedPlant.glb', tile: [4.35, 4.4] },

  // ── Living room ───────────────────────────────────────────────────────────
  { url: F + 'cabinetTelevision.glb', tile: [1, 2.72], collider: true },
  { url: F + 'televisionModern.glb', tile: [1, 2.72], offset: on(0.32) },
  { url: F + 'speaker.glb', tile: [0.2, 2.75] },
  { url: F + 'speakerSmall.glb', tile: [1.85, 2.75] },
  { url: F + 'loungeDesignSofa.glb', tile: [1.2, 4.45], rotationY: Math.PI, collider: true },
  { url: F + 'pillowBlue.glb', tile: [0.75, 4.42], offset: on(0.19), rotationY: Math.PI },
  { url: F + 'loungeChair.glb', tile: [3.35, 3.6], rotationY: -Math.PI / 2, collider: true },
  { url: F + 'tableCoffee.glb', tile: [1.2, 3.65], collider: true },
  { url: F + 'books.glb', tile: [1.35, 3.65], offset: on(0.24), rotationY: 0.5 },
  { url: F + 'rugRectangle.glb', tile: [1.2, 3.9] },
  { url: F + 'lampRoundFloor.glb', tile: [0.3, 3.0] },
  { url: F + 'bookcaseOpenLow.glb', tile: [-0.22, 4.7], rotationY: Math.PI / 2, collider: true },
  { url: F + 'radio.glb', tile: [-0.22, 4.7], offset: on(0.41), rotationY: Math.PI / 2 },
  // Reading nook in the southern bay
  { url: F + 'loungeChairRelax.glb', tile: [2.5, 5.9], rotationY: Math.PI / 2 },
  { url: F + 'sideTable.glb', tile: [1.5, 5.95] },
  { url: F + 'lampSquareTable.glb', tile: [1.5, 5.95], offset: on(0.39) },
  { url: F + 'rugRound.glb', tile: [2.1, 5.9] },
  { url: F + 'pottedPlant.glb', tile: [0.4, 6.2] },
  { url: F + 'bear.glb', tile: [2.9, 4.9], rotationY: 0.6 },

  // ── Games den ─────────────────────────────────────────────────────────────
  // Six arcade cabinets already line three of its walls (see MACHINES below),
  // so the dressing stays out of their footprints and off the two doorways.
  { url: F + 'rugSquare.glb', tile: [9.3, 5.0] },
  { url: F + 'benchCushion.glb', tile: [10.2, 6.15], rotationY: Math.PI, collider: true },
  { url: F + 'stoolBar.glb', tile: [8.5, 5.0] },
  { url: F + 'stoolBar.glb', tile: [9.9, 5.45] },
  { url: F + 'speaker.glb', tile: [7.3, 4.4] },
  { url: F + 'trashcan.glb', tile: [6.3, 6.2] },
  // A prize shelf from the arcade kit, as a nod to the old arcade. 0.93 keeps
  // it at the 1.4 absolute scale it was authored at before scales became
  // multipliers of FURNITURE_SCALE.
  { url: AR + 'prizes.glb', tile: [5.85, 5.9], rotationY: Math.PI / 2, scale: 0.93, collider: true },
];

// ── Project kiosks — all six line the walls of the games den ────────────────
// `panelId` matches `project.billboard` in content/projects.ts and stays glued
// to the cabinet wherever a visitor drags it.
interface SeedMachine {
  id: string;
  url: string;
  tile: [number, number];
  rot: number;
  panelId: string;
  title: string;
  color: string;
  animate?: boolean;
}

const MACHINES: SeedMachine[] = [
  { id: 'm-wiseframe', url: AR + 'arcade-machine.glb', tile: [6.85, 3.82], rot: 0, panelId: 'works-wiseframe', title: 'WISEFRAME', color: '#00b7d4' },
  { id: 'm-rondevus', url: AR + 'pinball.glb', tile: [7.7, 3.95], rot: 0, panelId: 'works-rondevus', title: 'RONDEVUS', color: '#e01e63' },
  { id: 'm-survival', url: AR + 'dance-machine.glb', tile: [10, 4.12], rot: 0, panelId: 'works-survival-sim', title: 'SURVIVAL SIM', color: '#8e24aa' },
  { id: 'm-cleavercut', url: AR + 'claw-machine.glb', tile: [11.05, 4.0], rot: -Math.PI / 2, panelId: 'works-cleavercut', title: 'CLEAVERCUT', color: '#ef6c00', animate: true },
  { id: 'm-playground', url: AR + 'basketball-game.glb', tile: [7.1, 5.85], rot: Math.PI, panelId: 'works-playground-finder', title: 'PLAYGROUND FINDER', color: '#2e7d32' },
  { id: 'm-firebat', url: AR + 'air-hockey.glb', tile: [8.8, 6.05], rot: Math.PI, panelId: 'works-firebat', title: 'FIREBAT HOMELAB', color: '#d84315' },
];

// ── The household — humans, indoors ────────────────────────────────────────
// Dialogue lives under `npc-<id>` in content/projects.ts, so the id is the tie
// between a character and its lines; moving them never breaks it.
interface SeedNpc {
  id: string;
  model: string;
  tile: [number, number];
  y?: number;
  rotationY: number;
  name: string;
  pose?: string;
}

const NPCS: SeedNpc[] = [
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
interface SeedAnimal {
  species: string;
  at: [number, number];
  rotationY: number;
  ambient: string;
  size?: number;
}

const ANIMALS: SeedAnimal[] = [
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

/** Tile-or-world seed coords + optional offset → absolute world x/y/z. */
function place(seed: { tile?: [number, number]; at?: [number, number]; offset?: [number, number, number] }) {
  const base: [number, number, number] = seed.tile
    ? tileToWorld(seed.tile[0], seed.tile[1])
    : [seed.at?.[0] ?? 0, 0, seed.at?.[1] ?? 0];
  const o = seed.offset ?? [0, 0, 0];
  return { x: base[0] + o[0], y: base[1] + o[1], z: base[2] + o[2] };
}

/** Flattens the authored seed above into the world-space list build mode edits. */
export function toSceneObjects(): SceneObject[] {
  const out: SceneObject[] = [];

  PROPS.forEach((p, i) => {
    out.push({
      id: `prop-${i}`,
      kind: 'prop',
      url: p.url,
      ...place(p),
      rotationY: p.rotationY ?? 0,
      scale: p.scale ?? 1,
      collider: p.collider,
      animate: p.animate,
    });
  });

  for (const m of MACHINES) {
    const { x, z } = place({ tile: m.tile });
    out.push({
      id: m.id,
      kind: 'machine',
      url: m.url,
      x,
      y: 0,
      z,
      rotationY: m.rot,
      scale: 1,
      animate: m.animate,
      panelId: m.panelId,
      title: m.title,
      color: m.color,
      label: 'Play',
    });
  }

  for (const n of NPCS) {
    const { x, z } = place({ tile: n.tile });
    out.push({
      id: n.id,
      kind: 'npc',
      url: n.model,
      x,
      y: n.y ?? 0,
      z,
      rotationY: n.rotationY,
      scale: 1,
      panelId: `npc-${n.id}`,
      title: n.name,
      pose: n.pose ?? 'idle',
      label: 'Talk',
    });
  }

  for (const a of ANIMALS) {
    out.push({
      id: `animal-${a.species}`,
      kind: 'animal',
      url: `/models/animals/animal-${a.species}.glb`,
      x: a.at[0],
      y: 0,
      z: a.at[1],
      rotationY: a.rotationY,
      scale: a.size ?? 1,
      species: a.species,
      ambient: a.ambient,
      panelId: `npc-animal-${a.species}`,
      title: a.species,
      label: 'Say hi',
    });
  }

  return out;
}

/**
 * The shipped layout: an exported `layout.json` if one has been dropped in,
 * otherwise the seed above. Callers clone before mutating.
 */
export const DEFAULT_OBJECTS: SceneObject[] =
  exported.version === 1 && Array.isArray(exported.objects) && exported.objects.length > 0
    ? (exported.objects as SceneObject[])
    : toSceneObjects();
