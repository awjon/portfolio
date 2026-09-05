/**
 * Shared shape of src/content/placement.json — the single source of truth for
 * every indoor furniture piece, NPC and arcade cabinet. Build Mode (see
 * useEditorStore) edits this data in memory and saves it back to that same
 * file via the dev-only /__editor/save-placement endpoint (vite.config.ts).
 */

export interface FurnitureItem {
  id: string;
  url: string;
  tile: [number, number];
  offset?: [number, number, number];
  rotationY?: number;
  scale?: number;
  collider?: boolean;
  animate?: boolean;
}

export interface NpcItem {
  id: string;
  model: string;
  tile: [number, number];
  y?: number;
  rotationY?: number;
  name: string;
  pose?: string;
}

export interface MachineItem {
  id: string;
  url: string;
  tile: [number, number];
  rotationY?: number;
  panelId: string;
  title: string;
  color?: string;
  animate?: boolean;
}

export interface PlacementData {
  furniture: FurnitureItem[];
  npcs: NpcItem[];
  machines: MachineItem[];
}

export type EditableKind = 'furniture' | 'npc' | 'machine';

export interface Selection {
  kind: EditableKind;
  id: string;
}
