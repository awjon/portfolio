/**
 * Build-mode data model
 * ---------------------
 * One flat list of `SceneObject`s replaces the hand-authored arrays that used
 * to live in HouseProps.tsx and Interactables.tsx. Everything the world places
 * — furniture, arcade kiosks, people, animals — is one of these, so a single
 * editor can move all of it.
 *
 * The important invariant: **`panelId` travels with the object.** Moving,
 * duplicating or re-skinning a cabinet never detaches the project panel or the
 * dialogue lines it opens; those are keyed off `panelId`, not off position or
 * on the object's identity. A visitor can rearrange the entire house and every
 * text box still belongs to the thing it belonged to before.
 */

import { ANIMAL_SCALE, CHAR_SCALE, FURNITURE_SCALE, PROP_SCALE } from '../world/HouseMap';

/** How an object behaves once it is in the world. */
export type ObjectKind = 'prop' | 'machine' | 'npc' | 'animal';

export interface SceneObject {
  /** Unique per instance. Duplicating an object mints a new one. */
  id: string;
  kind: ObjectKind;
  /** Model path under /models. */
  url: string;
  /** World-space position. `y` is the lift off the floor (table-top items). */
  x: number;
  y: number;
  z: number;
  rotationY: number;
  /**
   * Multiplier on the kind's base scale (see `baseScale`), so an object keeps
   * sensible proportions when the kit scales in HouseMap change.
   */
  scale: number;
  /** Props only: derive a box collider from the model's bounds. */
  collider?: boolean;
  /** Loop the GLB's authored animation clips. */
  animate?: boolean;

  // ── Interaction payload (never inferred from position) ───────────────────
  /** Which overlay opens on E. Absent = scenery, not interactive. */
  panelId?: string;
  /** Floating label: project title for kiosks, name for people/animals. */
  title?: string;
  /** Label + ring colour for kiosks. */
  color?: string;
  /** Prompt verb shown in the HUD ("Play" / "Talk" / "Say hi"). */
  label?: string;
  /** npc: which looping clip to hold (idle / sit / holding-both …). */
  pose?: string;
  /** animal: species key, drives the model and its ambient clip. */
  species?: string;
  /** animal: ambient looping clip (idle / eat / dance). */
  ambient?: string;
}

/**
 * Readable name for a model path — `kitchenCabinetUpper.glb` becomes
 * "Kitchen Cabinet Upper", `air-hockey.glb` becomes "Air Hockey". Same rule
 * the catalog generator uses, so the inspector and the palette agree without
 * the inspector having to search 364 entries for a match.
 */
export function modelLabel(url: string): string {
  return (url.split('/').pop() ?? url)
    .replace(/\.glb$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** One row in the build palette. */
export interface CatalogEntry {
  url: string;
  name: string;
  category: string;
  kind: ObjectKind;
  species?: string;
}

/**
 * The scale each kind is authored at. `SceneObject.scale` multiplies this, so
 * `scale: 1` always means "the size this thing is meant to be".
 */
export function baseScale(kind: ObjectKind): number {
  switch (kind) {
    case 'machine':
      return PROP_SCALE;
    case 'npc':
      return CHAR_SCALE;
    case 'animal':
      return ANIMAL_SCALE;
    default:
      return FURNITURE_SCALE;
  }
}

/** Persisted layout file — also the shape the Export button writes out. */
export interface LayoutFile {
  version: 1;
  objects: SceneObject[];
}

export const LAYOUT_VERSION = 1 as const;
