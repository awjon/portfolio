/**
 * StationProps
 * ------------
 * Non-interactive interior dressing, per room. Positions are grid tiles from
 * StationMap (fractional coords allowed). Facing convention: models front
 * +Z, so rotationY 0 faces south (down-screen), PI faces north, ±PI/2 east/west.
 *
 * Rooms: ARCADE cols 1–11 rows 1–9 · LAB 13–23 × 1–6 · LOUNGE 13–23 × 8–15 ·
 * HUB 1–11 × 11–15.
 */

import { Props, type PropSpec } from './Props';
import { FURNITURE_SCALE, KIT_SCALE } from './StationMap';

const ST = '/models/station/';
const AR = '/models/arcade/';
const FU = '/models/furniture/';
const F = FURNITURE_SCALE;

const ITEMS: PropSpec[] = [
  // ── Arcade (non-playable machines along the east wall + counter) ──────────
  { url: AR + 'vending-machine.glb', tile: [11, 1], rotationY: -Math.PI / 2, collider: true },
  { url: AR + 'ticket-machine.glb', tile: [11, 2.2], rotationY: -Math.PI / 2, collider: true, animate: true },
  { url: AR + 'gambling-machine.glb', tile: [11, 4], rotationY: -Math.PI / 2, collider: true },
  { url: AR + 'prize-wheel.glb', tile: [11, 6], rotationY: -Math.PI / 2, collider: true, animate: true },
  { url: AR + 'prizes.glb', tile: [11, 8], rotationY: -Math.PI / 2, collider: true },
  { url: AR + 'column.glb', tile: [3.5, 6], collider: true },
  // Prize counter: register on a station table, employee NPC stands behind.
  { url: ST + 'table.glb', tile: [9, 8], collider: true },
  { url: AR + 'cash-register.glb', tile: [9, 8], offset: [0, 0.4 * KIT_SCALE, 0], scale: KIT_SCALE * 0.8 },

  // ── Lab (station computers along the north wall) ──────────────────────────
  { url: ST + 'computer-wide.glb', tile: [14, 1], collider: true },
  { url: ST + 'computer-screen.glb', tile: [16, 1], collider: true },
  { url: ST + 'computer-system.glb', tile: [18, 1], collider: true },
  { url: ST + 'computer.glb', tile: [20, 1], collider: true },
  { url: ST + 'computer-screen.glb', tile: [22, 1], collider: true },
  { url: ST + 'chair-armrest.glb', tile: [16, 2], rotationY: Math.PI },
  { url: ST + 'chair-armrest-headrest.glb', tile: [20, 2], rotationY: Math.PI },
  { url: ST + 'table-display.glb', tile: [17, 4], collider: true },
  { url: ST + 'table-display-planet.glb', tile: [21, 4], collider: true },
  { url: FU + 'laptop.glb', tile: [17, 4], offset: [0, 0.6, 0], scale: F },
  // Wall-mounted screens on the lab's west wall.
  { url: ST + 'display-wall-wide.glb', tile: [13, 3], offset: [-0.65, 0.9, 0], rotationY: Math.PI / 2 },
  { url: ST + 'display-wall.glb', tile: [13, 5], offset: [-0.65, 0.9, 0], rotationY: Math.PI / 2 },

  // ── Lounge (furniture kit, slightly smaller scale) ────────────────────────
  { url: FU + 'loungeDesignSofa.glb', tile: [17, 14], rotationY: Math.PI, scale: F, collider: true },
  { url: FU + 'loungeChair.glb', tile: [14, 13], rotationY: Math.PI / 2, scale: F, collider: true },
  { url: FU + 'tableCoffee.glb', tile: [17, 13], scale: F, collider: true },
  { url: FU + 'books.glb', tile: [17, 13], offset: [0.2, 0.36, 0], rotationY: 0.5, scale: F },
  { url: FU + 'rugRectangle.glb', tile: [17, 12], scale: F },
  { url: FU + 'cabinetTelevision.glb', tile: [17, 9], scale: F, collider: true },
  { url: FU + 'televisionModern.glb', tile: [17, 9], offset: [0, 0.42, 0], scale: F },
  { url: FU + 'speaker.glb', tile: [15.8, 9], scale: F },
  { url: FU + 'speakerSmall.glb', tile: [18.2, 9], scale: F },
  { url: FU + 'bookcaseClosedWide.glb', tile: [23, 8.5], rotationY: -Math.PI / 2, scale: F, collider: true },
  { url: FU + 'bookcaseOpen.glb', tile: [23, 10], rotationY: -Math.PI / 2, scale: F, collider: true },
  { url: FU + 'radio.glb', tile: [23, 10], offset: [-0.05, 1.28, 0], rotationY: -Math.PI / 2, scale: F },
  { url: FU + 'sideTable.glb', tile: [13, 10], rotationY: Math.PI / 2, scale: F, collider: true },
  { url: FU + 'kitchenCoffeeMachine.glb', tile: [13, 10], offset: [0, 0.53, 0], rotationY: Math.PI / 2, scale: F },
  { url: FU + 'bear.glb', tile: [16, 12], rotationY: 0.6, scale: F },
  { url: FU + 'pottedPlant.glb', tile: [13, 8], scale: F },
  { url: FU + 'pottedPlant.glb', tile: [23, 15], scale: F },
  { url: FU + 'lampRoundFloor.glb', tile: [13, 15], scale: F },
  { url: FU + 'plantSmall1.glb', tile: [17, 9], offset: [0.55, 0.42, 0], scale: F },

  // ── Hub (spawn room: hologram planet centerpiece + waiting chairs) ────────
  { url: ST + 'table-display-planet.glb', tile: [3, 13], scale: KIT_SCALE * 1.3, collider: true },
  { url: ST + 'structure-panel.glb', tile: [3, 13], offset: [0, 0.008, 0], scale: KIT_SCALE * 1.6 },
  { url: ST + 'chair-armrest.glb', tile: [1, 12], rotationY: Math.PI / 2 },
  { url: ST + 'chair-armrest.glb', tile: [1, 14], rotationY: Math.PI / 2 },
  { url: ST + 'table-inset-small.glb', tile: [1, 13], rotationY: Math.PI / 2, collider: true },
  { url: FU + 'pottedPlant.glb', tile: [11, 11], scale: F },
  { url: FU + 'pottedPlant.glb', tile: [1, 11], scale: F },
  { url: FU + 'rugDoormat.glb', tile: [6, 15.4], scale: F },
];

export function StationProps() {
  return <Props items={ITEMS} />;
}
