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
  // Six arcade cabinets already line three of its walls (see Interactables),
  // so the dressing stays out of their footprints and off the two doorways.
  { url: F + 'rugSquare.glb', tile: [9.3, 5.0] },
  { url: F + 'benchCushion.glb', tile: [10.2, 6.15], rotationY: Math.PI, collider: true },
  { url: F + 'stoolBar.glb', tile: [8.5, 5.0] },
  { url: F + 'stoolBar.glb', tile: [9.9, 5.45] },
  { url: F + 'speaker.glb', tile: [7.3, 4.4] },
  { url: F + 'trashcan.glb', tile: [6.3, 6.2] },
  // A prize shelf from the arcade kit, as a nod to the old arcade
  { url: AR + 'prizes.glb', tile: [5.85, 5.9], rotationY: Math.PI / 2, scale: 1.4, collider: true },
];

export function HouseProps() {
  return <Props items={ITEMS} />;
}
