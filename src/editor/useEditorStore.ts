/**
 * useEditorStore
 * --------------
 * State for Build Mode: an in-scene, dev-only editor for repositioning every
 * indoor furniture piece, NPC and arcade cabinet without touching code.
 *
 * `data` starts as a deep copy of src/content/placement.json and is mutated
 * in place as the user drags/rotates/snaps items. HouseProps and
 * Interactables read from this store (not the JSON import directly), so the
 * live scene always reflects the draft. "Save" POSTs the whole draft to a
 * dev-only Vite middleware (see vite.config.ts) that overwrites placement.json
 * on disk — from then on it's just the new default, no code was touched.
 */

import { create } from 'zustand';
import placementSeed from '../content/placement.json';
import { roomAt, roomBounds } from '../world/HouseMap';
import type { EditableKind, PlacementData, Selection } from './types';

const seed = placementSeed as PlacementData;

function cloneData(d: PlacementData): PlacementData {
  return {
    furniture: d.furniture.map((f) => ({ ...f, tile: [...f.tile] as [number, number] })),
    npcs: d.npcs.map((n) => ({ ...n, tile: [...n.tile] as [number, number] })),
    machines: d.machines.map((m) => ({ ...m, tile: [...m.tile] as [number, number] })),
  };
}

const LIST_KEY: Record<EditableKind, keyof PlacementData> = {
  furniture: 'furniture',
  npc: 'npcs',
  machine: 'machines',
};

/** How far off a wall a snapped item's centre sits — matches the hand-authored
 *  hugging distance already used throughout placement.json (e.g. -0.26/-0.3). */
const WALL_INSET = 0.28;

const round2 = (n: number) => Math.round(n * 100) / 100;

interface EditorState {
  active: boolean;
  toggle: () => void;
  setActive: (v: boolean) => void;

  data: PlacementData;
  dirty: boolean;

  selected: Selection | null;
  select: (sel: Selection | null) => void;

  draggingId: string | null;
  setDragging: (id: string | null) => void;

  moveTile: (kind: EditableKind, id: string, tile: [number, number]) => void;
  rotateBy: (kind: EditableKind, id: string, deltaRad: number) => void;
  snapToWall: (kind: EditableKind, id: string) => void;

  saving: boolean;
  lastSaveError: string | null;
  save: () => Promise<boolean>;
  discardChanges: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  active: false,
  toggle: () => set((s) => ({ active: !s.active, selected: s.active ? null : s.selected })),
  setActive: (active) => set({ active }),

  data: cloneData(seed),
  dirty: false,

  selected: null,
  select: (selected) => set({ selected }),

  draggingId: null,
  setDragging: (draggingId) => set({ draggingId }),

  moveTile: (kind, id, tile) =>
    set((s) => {
      const key = LIST_KEY[kind];
      const list = s.data[key] as { id: string; tile: [number, number] }[];
      const idx = list.findIndex((it) => it.id === id);
      if (idx < 0) return s;
      const next = list.slice();
      next[idx] = { ...next[idx], tile: [round2(tile[0]), round2(tile[1])] };
      return { data: { ...s.data, [key]: next }, dirty: true };
    }),

  rotateBy: (kind, id, deltaRad) =>
    set((s) => {
      const key = LIST_KEY[kind];
      const list = s.data[key] as { id: string; rotationY?: number }[];
      const idx = list.findIndex((it) => it.id === id);
      if (idx < 0) return s;
      const next = list.slice();
      const current = next[idx].rotationY ?? 0;
      next[idx] = { ...next[idx], rotationY: round2(current + deltaRad) };
      return { data: { ...s.data, [key]: next }, dirty: true };
    }),

  snapToWall: (kind, id) =>
    set((s) => {
      const key = LIST_KEY[kind];
      const list = s.data[key] as { id: string; tile: [number, number]; rotationY?: number }[];
      const idx = list.findIndex((it) => it.id === id);
      if (idx < 0) return s;
      const item = list[idx];
      const room = roomAt(Math.round(item.tile[0]), Math.round(item.tile[1]));
      if (!room) return s; // outside any room — nothing to snap to
      const { minC, maxC, minR, maxR } = roomBounds(room);
      const [tc, tr] = item.tile;
      const distN = tr - minR;
      const distS = maxR - tr;
      const distW = tc - minC;
      const distE = maxC - tc;
      const nearest = Math.min(distN, distS, distW, distE);

      let tile: [number, number] = item.tile;
      let rotationY = item.rotationY ?? 0;
      if (nearest === distN) {
        tile = [tc, minR - 0.5 + WALL_INSET];
        rotationY = 0; // faces south, into the room
      } else if (nearest === distS) {
        tile = [tc, maxR + 0.5 - WALL_INSET];
        rotationY = Math.PI; // faces north, into the room
      } else if (nearest === distW) {
        tile = [minC - 0.5 + WALL_INSET, tr];
        rotationY = Math.PI / 2; // faces east, into the room
      } else {
        tile = [maxC + 0.5 - WALL_INSET, tr];
        rotationY = -Math.PI / 2; // faces west, into the room
      }

      const next = list.slice();
      next[idx] = { ...item, tile: [round2(tile[0]), round2(tile[1])], rotationY: round2(rotationY) };
      return { data: { ...s.data, [key]: next }, dirty: true };
    }),

  saving: false,
  lastSaveError: null,
  save: async () => {
    set({ saving: true, lastSaveError: null });
    try {
      const res = await fetch('/__editor/save-placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(get().data, null, 2),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        set({ saving: false, lastSaveError: `Save failed (${res.status}) ${text}`.trim() });
        return false;
      }
      set({ saving: false, dirty: false });
      return true;
    } catch (e) {
      set({ saving: false, lastSaveError: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  discardChanges: () => set({ data: cloneData(seed), dirty: false, selected: null, draggingId: null }),
}));

// Debug hook, matching the existing `window.__game`/`window.__nav`: lets
// DevTools or a test script drive Build Mode without clicking through the UI.
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__editor = useEditorStore;
}
