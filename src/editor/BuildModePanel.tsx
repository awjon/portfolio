/**
 * BuildModePanel
 * --------------
 * DOM overlay for Build Mode: press B (dev server only) to toggle. Lists
 * every furniture piece / NPC / arcade machine grouped by room, lets you pick
 * one to fine-tune (or just drag its dot in the 3D view), and saves the
 * result straight back to src/content/placement.json via a dev-only Vite
 * middleware — no code, no guessing.
 *
 * Dev-only by construction: this component is only ever mounted from App.tsx
 * inside an `import.meta.env.DEV` check, so it — and the /__editor/* endpoint
 * it talks to — never ship in the production build.
 */

import { useEffect, useMemo, useState } from 'react';
import { useEditorStore } from './useEditorStore';
import { roomAt, type Room } from '../world/HouseMap';
import type { EditableKind, FurnitureItem, MachineItem, NpcItem } from './types';

const ROOM_NAME: Record<Room, string> = {
  K: 'Kitchen',
  S: 'Study',
  H: 'Hall',
  L: 'Living room',
  G: 'Games den',
};

function labelFor(kind: EditableKind, item: FurnitureItem | NpcItem | MachineItem): string {
  if (kind === 'npc') return (item as NpcItem).name;
  if (kind === 'machine') return (item as MachineItem).title;
  return (item as FurnitureItem).url.split('/').pop()?.replace('.glb', '') ?? item.id;
}

function groupLabel(kind: EditableKind, item: FurnitureItem | NpcItem | MachineItem): string {
  const room = roomAt(Math.round(item.tile[0]), Math.round(item.tile[1]));
  const roomName = room ? ROOM_NAME[room] : 'Outside a room';
  if (kind === 'npc') return `${roomName} — NPCs`;
  if (kind === 'machine') return `${roomName} — Arcade`;
  return roomName;
}

/** Toggle-and-hotkeys, split out so it runs even before Build Mode is active. */
function useBuildModeHotkeys() {
  const toggle = useEditorStore((s) => s.toggle);
  const active = useEditorStore((s) => s.active);
  const select = useEditorStore((s) => s.select);
  const selected = useEditorStore((s) => s.selected);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
      if (typing) return;
      if (e.key === 'b' || e.key === 'B') {
        toggle();
      } else if (e.key === 'Escape' && active) {
        if (selected) select(null);
        else toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, active, selected, select]);
}

function SelectedEditor() {
  const selected = useEditorStore((s) => s.selected);
  const data = useEditorStore((s) => s.data);
  const moveTile = useEditorStore((s) => s.moveTile);
  const rotateBy = useEditorStore((s) => s.rotateBy);
  const snapToWall = useEditorStore((s) => s.snapToWall);
  const select = useEditorStore((s) => s.select);

  if (!selected) return null;
  const list =
    selected.kind === 'furniture' ? data.furniture : selected.kind === 'npc' ? data.npcs : data.machines;
  const item = list.find((it) => it.id === selected.id);
  if (!item) return null;

  const deg = Math.round(((item.rotationY ?? 0) * 180) / Math.PI);

  return (
    <div className="mt-3 rounded-lg border border-amber-400/30 bg-black/40 p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm font-bold text-amber-300">{labelFor(selected.kind, item)}</div>
        <button onClick={() => select(null)} className="font-mono text-xs text-white/50 hover:text-white">
          deselect
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-white/70">
        <label className="flex items-center gap-1.5">
          tile X
          <input
            type="number"
            step={0.05}
            value={item.tile[0]}
            onChange={(e) => moveTile(selected.kind, selected.id, [Number(e.target.value), item.tile[1]])}
            className="w-full rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white"
          />
        </label>
        <label className="flex items-center gap-1.5">
          tile Z
          <input
            type="number"
            step={0.05}
            value={item.tile[1]}
            onChange={(e) => moveTile(selected.kind, selected.id, [item.tile[0], Number(e.target.value)])}
            className="w-full rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white"
          />
        </label>
      </div>

      <div className="mt-2 flex items-center gap-2 font-mono text-xs text-white/70">
        <span>facing</span>
        <button
          onClick={() => rotateBy(selected.kind, selected.id, -Math.PI / 12)}
          className="rounded border border-white/20 px-2 py-0.5 hover:bg-white/10"
        >
          ↺ 15°
        </button>
        <span className="w-10 text-center text-white">{deg}°</span>
        <button
          onClick={() => rotateBy(selected.kind, selected.id, Math.PI / 12)}
          className="rounded border border-white/20 px-2 py-0.5 hover:bg-white/10"
        >
          15° ↻
        </button>
      </div>

      <button
        onClick={() => snapToWall(selected.kind, selected.id)}
        className="mt-3 w-full rounded-md bg-amber-400 px-3 py-1.5 font-mono text-xs font-bold text-black hover:bg-amber-300"
      >
        Snap to nearest wall
      </button>
    </div>
  );
}

function ItemList() {
  const data = useEditorStore((s) => s.data);
  const selected = useEditorStore((s) => s.selected);
  const select = useEditorStore((s) => s.select);

  const groups = useMemo(() => {
    const rows: { kind: EditableKind; item: FurnitureItem | NpcItem | MachineItem; group: string }[] = [];
    for (const item of data.furniture) rows.push({ kind: 'furniture', item, group: groupLabel('furniture', item) });
    for (const item of data.npcs) rows.push({ kind: 'npc', item, group: groupLabel('npc', item) });
    for (const item of data.machines) rows.push({ kind: 'machine', item, group: groupLabel('machine', item) });
    const byGroup = new Map<string, typeof rows>();
    for (const row of rows) {
      const arr = byGroup.get(row.group) ?? [];
      arr.push(row);
      byGroup.set(row.group, arr);
    }
    return [...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  return (
    <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-black/30 font-mono text-xs">
      {groups.map(([group, rows]) => (
        <div key={group}>
          <div className="sticky top-0 bg-black/70 px-2 py-1 text-white/50">{group}</div>
          {rows.map(({ kind, item }) => {
            const isSelected = selected?.kind === kind && selected?.id === item.id;
            return (
              <button
                key={`${kind}-${item.id}`}
                onClick={() => select({ kind, id: item.id })}
                className={`flex w-full items-center justify-between px-2 py-1 text-left hover:bg-white/10 ${
                  isSelected ? 'bg-amber-400/20 text-amber-300' : 'text-white/80'
                }`}
              >
                <span>{labelFor(kind, item)}</span>
                <span className="text-white/30">{kind}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function BuildModePanel() {
  useBuildModeHotkeys();
  const active = useEditorStore((s) => s.active);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const lastSaveError = useEditorStore((s) => s.lastSaveError);
  const save = useEditorStore((s) => s.save);
  const discardChanges = useEditorStore((s) => s.discardChanges);
  const toggle = useEditorStore((s) => s.toggle);
  const [savedFlash, setSavedFlash] = useState(false);

  if (!active) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-40 font-mono text-xs text-white/40">
        Press <span className="text-white/70">B</span> for Build Mode (dev only)
      </div>
    );
  }

  const onSave = async () => {
    const ok = await save();
    if (ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
    }
  };

  return (
    <div className="fixed right-4 top-4 z-40 w-[300px] rounded-xl border border-amber-400/30 bg-[#0b0d16]/95 p-4 shadow-[0_0_40px_rgba(255,183,3,0.12)]">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm font-bold text-amber-300">BUILD MODE</h2>
        <button onClick={toggle} className="font-mono text-xs text-white/50 hover:text-white">
          Esc ✕
        </button>
      </div>
      <p className="mt-1 font-mono text-[11px] leading-snug text-white/50">
        Drag a dot in the 3D view to move it. Right-drag to orbit, wheel to zoom, middle-drag to pan.
      </p>

      <ItemList />
      <SelectedEditor />

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={!dirty || saving}
          className="flex-1 rounded-md bg-amber-400 px-3 py-1.5 font-mono text-xs font-bold text-black hover:bg-amber-300 disabled:opacity-30"
        >
          {saving ? 'Saving…' : savedFlash ? 'Saved ✓' : dirty ? 'Save layout' : 'Saved'}
        </button>
        <button
          onClick={discardChanges}
          disabled={!dirty}
          className="rounded-md border border-white/20 px-3 py-1.5 font-mono text-xs text-white/70 hover:bg-white/10 disabled:opacity-30"
        >
          Discard
        </button>
      </div>
      {lastSaveError && (
        <p className="mt-2 font-mono text-[11px] text-red-400">
          {lastSaveError} — Save only works while running `npm run dev` locally.
        </p>
      )}
    </div>
  );
}
