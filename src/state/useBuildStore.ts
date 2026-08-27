/**
 * useBuildStore
 * -------------
 * Everything build mode owns: the live layout, what's selected, and the
 * undo history.
 *
 * Two rules shape the design.
 *
 * 1. **Objects are addressed by id, never by index.** Components subscribe to
 *    `objects[id]` alone, so dragging one sofa re-renders one sofa — not the
 *    two hundred other things in the house. `order` exists only to give the
 *    scene a stable render order.
 *
 * 2. **Undo snapshots are taken at the START of a gesture, not per frame.** A
 *    drag pushes one snapshot on pointer-down and then moves freely; otherwise
 *    a single drag across the room would bury the history under 300 entries.
 *
 * Layouts persist to localStorage per visitor, so anyone can rearrange the
 * house and find it that way when they come back — and nobody else sees it.
 * Export writes the same JSON out as a file, which is how a layout built in the
 * browser gets promoted to the shipped default (see src/build/defaultLayout.ts).
 */

import { create } from 'zustand';
import { DEFAULT_OBJECTS } from '../build/defaultLayout';
import { LAYOUT_VERSION, type LayoutFile, type SceneObject } from '../build/types';

const STORAGE_KEY = 'portfolio.house.layout.v1';
const MAX_HISTORY = 60;

export type BuildMode = 'play' | 'build';

/** What a click in the world is currently for. */
export type BuildTool = 'select' | 'place';

interface Snapshot {
  objects: Record<string, SceneObject>;
  order: string[];
}

interface BuildState extends Snapshot {
  mode: BuildMode;
  tool: BuildTool;
  /** Catalog entry armed for placement (tool === 'place'). */
  pending: { url: string; kind: SceneObject['kind']; name: string; species?: string } | null;

  selectedId: string | null;
  /** Non-null while a pointer is dragging an object across the floor. */
  draggingId: string | null;

  /** Snap positions to a quarter-tile lattice and rotation to 15°. */
  snap: boolean;

  /** True once the visitor has changed anything (drives the Reset button). */
  dirty: boolean;

  past: Snapshot[];
  future: Snapshot[];

  // ── Mode ────────────────────────────────────────────────────────────────
  setMode: (m: BuildMode) => void;
  setTool: (t: BuildTool) => void;
  setPending: (p: BuildState['pending']) => void;
  setSnap: (s: boolean) => void;

  // ── Selection ───────────────────────────────────────────────────────────
  select: (id: string | null) => void;

  // ── Editing ─────────────────────────────────────────────────────────────
  /** Push an undo snapshot. Call once at the start of a gesture. */
  beginGesture: () => void;
  /** Persist + end the gesture. Call once when the gesture completes. */
  endGesture: () => void;
  /** Move without touching history — the per-frame half of a drag. */
  moveTo: (id: string, x: number, z: number) => void;
  setDragging: (id: string | null) => void;
  /** One-shot edits: each takes its own snapshot and persists. */
  patch: (id: string, patch: Partial<SceneObject>) => void;
  rotate: (id: string, radians: number) => void;
  nudgeY: (id: string, dy: number) => void;
  scaleBy: (id: string, factor: number) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  add: (o: Omit<SceneObject, 'id'>) => string;

  // ── History / persistence ───────────────────────────────────────────────
  undo: () => void;
  redo: () => void;
  reset: () => void;
  exportLayout: () => string;
  importLayout: (json: string) => boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const GRID = 0.375; // a quarter of a 1.5-unit tile
const ANGLE_STEP = Math.PI / 12; // 15°

const snapValue = (v: number, step: number) => Math.round(v / step) * step;

function toSnapshot(list: SceneObject[]): Snapshot {
  const objects: Record<string, SceneObject> = {};
  const order: string[] = [];
  for (const o of list) {
    objects[o.id] = o;
    order.push(o.id);
  }
  return { objects, order };
}

const listOf = (s: Snapshot): SceneObject[] => s.order.map((id) => s.objects[id]).filter(Boolean);

/** Deep-enough clone: objects are flat, so a shallow copy per entry is exact. */
function cloneSnapshot(s: Snapshot): Snapshot {
  const objects: Record<string, SceneObject> = {};
  for (const id of s.order) if (s.objects[id]) objects[id] = { ...s.objects[id] };
  return { objects, order: [...s.order] };
}

function load(): { snapshot: Snapshot; dirty: boolean } {
  if (typeof localStorage === 'undefined') return { snapshot: toSnapshot(DEFAULT_OBJECTS), dirty: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { snapshot: toSnapshot(DEFAULT_OBJECTS), dirty: false };
    const parsed = JSON.parse(raw) as LayoutFile;
    if (parsed?.version !== LAYOUT_VERSION || !Array.isArray(parsed.objects)) throw new Error('stale');
    return { snapshot: toSnapshot(parsed.objects), dirty: true };
  } catch {
    // A corrupt or outdated save must never blank the house.
    return { snapshot: toSnapshot(DEFAULT_OBJECTS), dirty: false };
  }
}

function persist(s: Snapshot) {
  if (typeof localStorage === 'undefined') return;
  try {
    const file: LayoutFile = { version: LAYOUT_VERSION, objects: listOf(s) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
  } catch {
    // Private browsing / quota. Editing still works for this session.
  }
}

let idCounter = 0;
const mintId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

// ── Store ───────────────────────────────────────────────────────────────────

const initial = load();

export const useBuildStore = create<BuildState>((set, get) => {
  /** Snapshot the present onto the undo stack and drop any redo branch. */
  const pushHistory = () => {
    const { objects, order, past } = get();
    const next = [...past, cloneSnapshot({ objects, order })];
    set({ past: next.slice(-MAX_HISTORY), future: [] });
  };

  /** One-shot edit: history + mutation + persist, in that order. */
  const edit = (fn: (s: Snapshot) => Snapshot) => {
    pushHistory();
    const { objects, order } = get();
    const next = fn({ objects: { ...objects }, order: [...order] });
    set({ ...next, dirty: true });
    persist(next);
  };

  return {
    ...initial.snapshot,
    mode: 'play',
    tool: 'select',
    pending: null,
    selectedId: null,
    draggingId: null,
    snap: true,
    dirty: initial.dirty,
    past: [],
    future: [],

    setMode: (mode) =>
      set({ mode, selectedId: null, draggingId: null, tool: 'select', pending: null }),
    setTool: (tool) => set({ tool, pending: tool === 'select' ? null : get().pending }),
    // Arming an item clears the selection (the inspector would be describing
    // something you are no longer working on). Disarming must NOT — you often
    // press Escape to stop placing and then keep adjusting what you just put
    // down, and clearing it there would silently break the Delete key.
    setPending: (pending) =>
      set(pending ? { pending, tool: 'place', selectedId: null } : { pending: null, tool: 'select' }),
    setSnap: (snap) => set({ snap }),

    select: (selectedId) => set({ selectedId, tool: 'select', pending: null }),

    beginGesture: pushHistory,
    endGesture: () => {
      const { objects, order } = get();
      set({ dirty: true });
      persist({ objects, order });
    },

    moveTo: (id, x, z) => {
      const current = get().objects[id];
      if (!current) return;
      const snap = get().snap;
      const nx = snap ? snapValue(x, GRID) : x;
      const nz = snap ? snapValue(z, GRID) : z;
      if (current.x === nx && current.z === nz) return;
      set((s) => ({ objects: { ...s.objects, [id]: { ...current, x: nx, z: nz } } }));
    },

    setDragging: (draggingId) => set({ draggingId }),

    patch: (id, patch) =>
      edit((s) => {
        const o = s.objects[id];
        if (o) s.objects[id] = { ...o, ...patch };
        return s;
      }),

    rotate: (id, radians) =>
      edit((s) => {
        const o = s.objects[id];
        if (!o) return s;
        const raw = o.rotationY + radians;
        s.objects[id] = { ...o, rotationY: get().snap ? snapValue(raw, ANGLE_STEP) : raw };
        return s;
      }),

    nudgeY: (id, dy) =>
      edit((s) => {
        const o = s.objects[id];
        // Below the floor is never useful; the ceiling is generous.
        if (o) s.objects[id] = { ...o, y: Math.max(0, Math.min(6, o.y + dy)) };
        return s;
      }),

    scaleBy: (id, factor) =>
      edit((s) => {
        const o = s.objects[id];
        if (o) s.objects[id] = { ...o, scale: Math.max(0.15, Math.min(6, o.scale * factor)) };
        return s;
      }),

    remove: (id) =>
      edit((s) => {
        delete s.objects[id];
        s.order = s.order.filter((x) => x !== id);
        if (get().selectedId === id) set({ selectedId: null });
        return s;
      }),

    duplicate: (id) => {
      const source = get().objects[id];
      if (!source) return;
      // The copy keeps `panelId` — two cabinets for the same project both open
      // that project — but takes a fresh instance id so they move separately.
      const copy: SceneObject = { ...source, id: mintId(source.kind), x: source.x + 0.6, z: source.z + 0.6 };
      edit((s) => {
        s.objects[copy.id] = copy;
        s.order = [...s.order, copy.id];
        return s;
      });
      set({ selectedId: copy.id });
    },

    add: (o) => {
      const id = mintId(o.kind);
      edit((s) => {
        s.objects[id] = { ...o, id } as SceneObject;
        s.order = [...s.order, id];
        return s;
      });
      set({ selectedId: id });
      return id;
    },

    undo: () => {
      const { past, future, objects, order } = get();
      const previous = past[past.length - 1];
      if (!previous) return;
      const present = cloneSnapshot({ objects, order });
      set({ ...previous, past: past.slice(0, -1), future: [present, ...future].slice(0, MAX_HISTORY), selectedId: null });
      persist(previous);
    },

    redo: () => {
      const { past, future, objects, order } = get();
      const next = future[0];
      if (!next) return;
      const present = cloneSnapshot({ objects, order });
      set({ ...next, past: [...past, present].slice(-MAX_HISTORY), future: future.slice(1), selectedId: null });
      persist(next);
    },

    reset: () => {
      pushHistory();
      const fresh = toSnapshot(DEFAULT_OBJECTS.map((o) => ({ ...o })));
      set({ ...fresh, selectedId: null, dirty: false });
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    },

    exportLayout: () => {
      const { objects, order } = get();
      const file: LayoutFile = { version: LAYOUT_VERSION, objects: listOf({ objects, order }) };
      return JSON.stringify(file, null, 2);
    },

    importLayout: (json) => {
      try {
        const parsed = JSON.parse(json) as LayoutFile;
        if (parsed?.version !== LAYOUT_VERSION || !Array.isArray(parsed.objects)) return false;
        pushHistory();
        const next = toSnapshot(parsed.objects);
        set({ ...next, selectedId: null, dirty: true });
        persist(next);
        return true;
      } catch {
        return false;
      }
    },
  };
});

/** Debug hook, mirroring `__game` — lets DevTools inspect/patch the layout. */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__build = useBuildStore;
}
