/**
 * HouseProps
 * ----------
 * Non-interactive interior dressing, room by room, from the Kenney Furniture
 * Kit. Positions are grid tiles (see HouseMap); fractional coords are fine and
 * a cell spans ±0.5, so `row: -0.27` means "backed against the wall on the
 * north edge of row 0".
 *
 * Facing: rotationY 0 faces south (+Z, down the plan), PI north, +PI/2 east,
 * -PI/2 west — so a piece against the north wall gets rotationY 0.
 *
 * Rooms: K kitchen/diner · S study · H hall · L living room · G games den.
 */

import { Props, type PropSpec } from './Props';
import { FURNITURE_SCALE } from './HouseMap';

const F = '/models/furniture/';
const AR = '/models/arcade/';

/** Lifts a table-top item onto its surface (world units). */
const on = (h: number): [number, number, number] => [0, h * FURNITURE_SCALE, 0];

const ITEMS: PropSpec[] = [
  // ── Kitchen / diner ───────────────────────────────────────────────────────
  // A wide room spanning the whole back of the house. The centre column
  // (DOOR_COL) is the spine down to the hall and up to the back door, so it
  // stays clear; a cook counter sits to its west, a dining table to its east.
  { url: F + 'kitchenCabinetDrawer.glb', tile: [1.3, -0.26], collider: true },
  { url: F + 'kitchenSink.glb', tile: [2.3, -0.26], collider: true },
  { url: F + 'kitchenStove.glb', tile: [3.3, -0.26], collider: true },
  { url: F + 'kitchenFridge.glb', tile: [4.3, -0.3], collider: true },
  { url: F + 'hoodModern.glb', tile: [3.3, -0.26], offset: on(0.95) },
  { url: F + 'kitchenCabinetUpper.glb', tile: [1.3, -0.3], offset: on(0.95) },
  { url: F + 'kitchenMicrowave.glb', tile: [1.3, -0.26], offset: on(0.46) },
  { url: F + 'kitchenCoffeeMachine.glb', tile: [1.8, -0.26], offset: on(0.46) },
  { url: F + 'toaster.glb', tile: [2.3, -0.26], offset: on(0.46) },
  // Dining table on the east side
  { url: F + 'tableCloth.glb', tile: [8.5, 1.6], collider: true },
  { url: F + 'chairCushion.glb', tile: [8.15, 1.15], rotationY: 0 },
  { url: F + 'chairCushion.glb', tile: [8.85, 1.15], rotationY: 0 },
  { url: F + 'chairCushion.glb', tile: [8.15, 2.05], rotationY: Math.PI },
  { url: F + 'chairCushion.glb', tile: [8.85, 2.05], rotationY: Math.PI },
  { url: F + 'plantSmall2.glb', tile: [8.5, 1.6], offset: on(0.34) },
  { url: F + 'rugRounded.glb', tile: [8.5, 1.85] },
  { url: F + 'trashcan.glb', tile: [4.6, 2.2] },
  { url: F + 'rugRectangle.glb', tile: [2.7, 1.4] },
  { url: F + 'pottedPlant.glb', tile: [0.35, 2.3] },
  { url: F + 'pottedPlant.glb', tile: [12.3, 2.3] },

  // ── Study ─────────────────────────────────────────────────────────────────
  { url: F + 'desk.glb', tile: [9, 2.8], collider: true },
  { url: F + 'computerScreen.glb', tile: [9, 2.8], offset: on(0.39) },
  { url: F + 'computerKeyboard.glb', tile: [9, 3.05], offset: on(0.39) },
  { url: F + 'chairDesk.glb', tile: [9, 3.6], rotationY: Math.PI },
  { url: F + 'table.glb', tile: [11, 2.8], collider: true },
  { url: F + 'laptop.glb', tile: [11, 2.8], offset: on(0.34) },
  { url: F + 'bookcaseClosedWide.glb', tile: [11.7, 4.3], rotationY: -Math.PI / 2, collider: true },
  { url: F + 'bookcaseOpen.glb', tile: [11.7, 5.6], rotationY: -Math.PI / 2, collider: true },
  { url: F + 'books.glb', tile: [11.7, 5.6], offset: [-0.1, 0.62 * FURNITURE_SCALE, 0], rotationY: -Math.PI / 2 },
  { url: F + 'sideTable.glb', tile: [8.3, 5.7], rotationY: Math.PI / 2 },
  { url: F + 'lampSquareTable.glb', tile: [8.3, 5.7], offset: on(0.39) },
  { url: F + 'rugSquare.glb', tile: [9.8, 4.7] },
  { url: F + 'pottedPlant.glb', tile: [9.5, 6.2] },
  { url: F + 'cardboardBoxClosed.glb', tile: [8.3, 3.3], rotationY: 0.4 },

  // ── Hall (kept deliberately clear — it is the route to everywhere) ────────
  // A straight run down the centre column; dressing sits to either side of it
  // and clear of every doorway (kitchen at the top, front door at the bottom,
  // living room W and study/games den E along the sides).
  { url: F + 'rugDoormat.glb', tile: [6, 10.4] },
  { url: F + 'rugRectangle.glb', tile: [6, 7.5] },
  { url: F + 'coatRackStanding.glb', tile: [5.3, 9.7] },
  { url: F + 'sideTableDrawers.glb', tile: [6.7, 9.6], rotationY: -Math.PI / 2 },
  { url: F + 'lampSquareTable.glb', tile: [6.7, 9.6], offset: on(0.39) },
  { url: F + 'pottedPlant.glb', tile: [6.7, 8.6] },
  { url: F + 'lampRoundFloor.glb', tile: [5.3, 7.5] },
  { url: F + 'bookcaseClosed.glb', tile: [6.7, 5.5], rotationY: -Math.PI / 2, collider: true },
  { url: F + 'plantSmall3.glb', tile: [6.7, 5.5], offset: on(0.9), rotationY: -Math.PI / 2 },
  { url: F + 'pottedPlant.glb', tile: [5.3, 4.7] },

  // ── Living room ───────────────────────────────────────────────────────────
  // The whole west wing: a TV nook up top, a sofa suite in the middle, a
  // reading nook in the southern bay.
  { url: F + 'cabinetTelevision.glb', tile: [1.5, 3.3], collider: true },
  { url: F + 'televisionModern.glb', tile: [1.5, 3.3], offset: on(0.32) },
  { url: F + 'speaker.glb', tile: [0.5, 3.3] },
  { url: F + 'speakerSmall.glb', tile: [2.3, 3.3] },
  { url: F + 'loungeDesignSofa.glb', tile: [1.5, 5.5], rotationY: Math.PI, collider: true },
  { url: F + 'pillowBlue.glb', tile: [1.0, 5.45], offset: on(0.19), rotationY: Math.PI },
  { url: F + 'loungeChair.glb', tile: [3.5, 4.8], rotationY: -Math.PI / 2, collider: true },
  { url: F + 'tableCoffee.glb', tile: [1.5, 4.7], collider: true },
  { url: F + 'books.glb', tile: [1.65, 4.7], offset: on(0.24), rotationY: 0.5 },
  { url: F + 'rugRectangle.glb', tile: [1.5, 5.0] },
  { url: F + 'lampRoundFloor.glb', tile: [0.3, 4.0] },
  { url: F + 'bookcaseOpenLow.glb', tile: [-0.22, 5.8], rotationY: Math.PI / 2, collider: true },
  { url: F + 'radio.glb', tile: [-0.22, 5.8], offset: on(0.41), rotationY: Math.PI / 2 },
  // Reading nook in the southern bay
  { url: F + 'loungeChairRelax.glb', tile: [2.7, 8.7], rotationY: Math.PI / 2 },
  { url: F + 'sideTable.glb', tile: [1.5, 8.7] },
  { url: F + 'lampSquareTable.glb', tile: [1.5, 8.7], offset: on(0.39) },
  { url: F + 'rugRound.glb', tile: [2.3, 8.7] },
  { url: F + 'pottedPlant.glb', tile: [0.4, 9.2] },
  { url: F + 'bear.glb', tile: [3.2, 7.8], rotationY: 0.6 },

  // ── Games den ─────────────────────────────────────────────────────────────
  // Six arcade cabinets line the north-free south/east/west walls (see
  // Interactables), so the dressing stays out of their footprints and off
  // the three doorways (hall W, study N, side door E).
  { url: F + 'rugSquare.glb', tile: [10, 8.5] },
  { url: F + 'benchCushion.glb', tile: [10.5, 7.3], rotationY: Math.PI / 2, collider: true },
  { url: F + 'stoolBar.glb', tile: [9.2, 8.5] },
  { url: F + 'stoolBar.glb', tile: [10.8, 8.9] },
  { url: F + 'speaker.glb', tile: [8.3, 7.3] },
  { url: F + 'trashcan.glb', tile: [11.7, 7.3] },
  // A prize shelf from the arcade kit, as a nod to the old arcade
  { url: AR + 'prizes.glb', tile: [9, 9], rotationY: Math.PI / 2, scale: 1.4, collider: true },
];

export function HouseProps() {
  return <Props items={ITEMS} />;
}
