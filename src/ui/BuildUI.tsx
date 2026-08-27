/**
 * BuildUI
 * -------
 * The 2D overlay for build mode: the button that enters it, the toolbar, the
 * asset palette, and the inspector for whatever is selected.
 *
 * Everything here sits outside the Canvas, so none of it costs a frame. The
 * one rule the layout has to respect is that the middle of the screen stays
 * clear — that is where you are dragging furniture — so the palette docks left
 * and the inspector right.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBuildStore } from '../state/useBuildStore';
import { useGameStore } from '../state/useGameStore';
import { CATALOG, CATEGORY_ORDER } from '../build/catalog.generated';
import { modelLabel, type CatalogEntry } from '../build/types';
import { useIsNarrow } from './useIsNarrow';

const ROTATE_STEP = Math.PI / 12; // 15°
const LIFT_STEP = 0.08;

// ── Entry point ─────────────────────────────────────────────────────────────

export function BuildUI() {
  const mode = useBuildStore((s) => s.mode);
  return mode === 'build' ? <BuildOverlay /> : <EnterBuildButton />;
}

function EnterBuildButton() {
  const setMode = useBuildStore((s) => s.setMode);
  const activePanel = useGameStore((s) => s.activePanel);
  // A project panel or dialogue box already owns the screen; don't compete.
  if (activePanel) return null;
  return (
    <button
      type="button"
      onClick={() => setMode('build')}
      className="fixed right-4 top-4 z-40 rounded-md border border-cyan-400/50 bg-black/60 px-3 py-2 font-mono text-xs uppercase tracking-widest text-cyan-300 backdrop-blur transition hover:border-cyan-300 hover:bg-cyan-950/70 hover:text-white"
    >
      Build mode
    </button>
  );
}

// ── Overlay ─────────────────────────────────────────────────────────────────

function BuildOverlay() {
  const narrow = useIsNarrow();
  // On a phone the palette is a bottom sheet covering half the view, so it
  // starts closed — you want to see the house first. On a desktop there is
  // room for it beside the scene, so it starts open.
  const [paletteOpen, setPaletteOpen] = useState(!narrow);
  const selected = useBuildStore((s) => s.selectedId !== null);
  useBuildShortcuts();

  // The proximity detector is unmounted in build mode, so whatever the player
  // happened to be standing next to would stay "nearby" forever — and greet
  // them with a stale "Press E to Talk" the moment they pressed Play.
  useEffect(() => {
    useGameStore.getState().setNearbyInteractable(null);
  }, []);

  // Both docks share the bottom of a phone screen, so only one can be up at a
  // time; selecting something wins, since you selected it to change it.
  const showPalette = paletteOpen && !(narrow && selected);

  return (
    <>
      <Toolbar onTogglePalette={() => setPaletteOpen((v) => !v)} paletteOpen={paletteOpen} />
      {showPalette && <Palette onClose={() => setPaletteOpen(false)} narrow={narrow} />}
      <Inspector />
      {/* The hint lives along the bottom, so on a phone it only appears when
          neither dock is there — the palette carries its own copy instead. */}
      {(!narrow || (!showPalette && !selected)) && <HintBar narrow={narrow} />}
    </>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({ onTogglePalette, paletteOpen }: { onTogglePalette: () => void; paletteOpen: boolean }) {
  const setMode = useBuildStore((s) => s.setMode);
  const undo = useBuildStore((s) => s.undo);
  const redo = useBuildStore((s) => s.redo);
  const reset = useBuildStore((s) => s.reset);
  const snap = useBuildStore((s) => s.snap);
  const setSnap = useBuildStore((s) => s.setSnap);
  const canUndo = useBuildStore((s) => s.past.length > 0);
  const canRedo = useBuildStore((s) => s.future.length > 0);
  const dirty = useBuildStore((s) => s.dirty);
  const exportLayout = useBuildStore((s) => s.exportLayout);
  const importLayout = useBuildStore((s) => s.importLayout);
  const [confirmReset, setConfirmReset] = useState(false);

  const onExport = useCallback(() => {
    const blob = new Blob([exportLayout()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportLayout]);

  const onImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!importLayout(await file.text())) {
        window.alert('That file is not a layout this version understands.');
      }
    };
    input.click();
  }, [importLayout]);

  return (
    <div className="pointer-events-auto fixed left-1/2 top-3 z-40 flex max-w-[96vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-lg border border-cyan-400/30 bg-black/75 px-2 py-1.5 font-mono text-xs text-cyan-200 backdrop-blur">
      <span
        className="px-2 text-[10px] uppercase tracking-[0.2em] text-cyan-500"
        title={
          dirty
            ? 'Your changes are saved in this browser only — nobody else sees them.'
            : 'This is the house as its owner built it.'
        }
      >
        {dirty ? 'Yours' : 'Build'}
      </span>

      <ToolButton onClick={onTogglePalette} active={paletteOpen}>
        Catalog
      </ToolButton>
      <Divider />
      <ToolButton onClick={undo} disabled={!canUndo} title="Ctrl+Z">
        Undo
      </ToolButton>
      <ToolButton onClick={redo} disabled={!canRedo} title="Ctrl+Shift+Z">
        Redo
      </ToolButton>
      <Divider />
      <ToolButton onClick={() => setSnap(!snap)} active={snap} title="G">
        Snap
      </ToolButton>
      <Divider />
      <ToolButton onClick={onExport} title="Download this layout as JSON">
        Export
      </ToolButton>
      <ToolButton onClick={onImport} title="Load a layout JSON file">
        Import
      </ToolButton>
      <ToolButton onClick={() => setConfirmReset(true)} danger active={confirmReset}>
        Reset
      </ToolButton>
      <Divider />
      <button
        type="button"
        onClick={() => setMode('play')}
        className="rounded bg-cyan-400 px-3 py-1 font-bold uppercase tracking-wider text-black transition hover:bg-white"
      >
        Play
      </button>

      {/* Confirmation is its own row rather than the Reset button relabelling
          itself: a control that changes meaning under the cursor — and used to
          change back on a timer — is very easy to click by accident, and this
          one throws away everything the visitor built. */}
      {confirmReset && (
        <div className="mt-1 flex w-full items-center justify-center gap-2 border-t border-cyan-400/20 pt-1.5">
          <span className="text-rose-200">Discard your layout and restore the original house?</span>
          <button
            type="button"
            onClick={() => {
              reset();
              setConfirmReset(false);
            }}
            className="rounded bg-rose-500/30 px-2 py-1 uppercase tracking-wider text-rose-100 hover:bg-rose-500/60 hover:text-white"
          >
            Reset everything
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(false)}
            className="rounded px-2 py-1 uppercase tracking-wider hover:bg-cyan-400/20 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

const Divider = () => <span className="mx-0.5 h-4 w-px bg-cyan-400/25" />;

function ToolButton({
  children,
  onClick,
  active,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'rounded px-2 py-1 uppercase tracking-wider transition',
        disabled ? 'cursor-not-allowed opacity-30' : 'hover:bg-cyan-400/20 hover:text-white',
        active ? 'bg-cyan-400/25 text-white' : '',
        danger ? 'text-rose-300 hover:bg-rose-500/20' : '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ── Palette ─────────────────────────────────────────────────────────────────

function Palette({ onClose, narrow }: { onClose: () => void; narrow: boolean }) {
  const [category, setCategory] = useState<string>(CATEGORY_ORDER[0]);
  const [query, setQuery] = useState('');
  const pending = useBuildStore((s) => s.pending);
  const setPending = useBuildStore((s) => s.setPending);

  // A search spans every category — you rarely know which drawer a "toaster"
  // is filed under, and 364 assets is too many to browse for one.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return CATALOG.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 200);
    return CATALOG.filter((e) => e.category === category);
  }, [category, query]);

  const arm = useCallback(
    (entry: CatalogEntry) => {
      const same = pending?.url === entry.url;
      setPending(same ? null : { url: entry.url, kind: entry.kind, name: entry.name, species: entry.species });
    },
    [pending, setPending],
  );

  return (
    // Phone: a bottom sheet that leaves the top half of the scene visible.
    // Desktop: a full-height column beside it.
    <div className="pointer-events-auto fixed inset-x-2 bottom-2 z-40 flex max-h-[46vh] flex-col overflow-hidden rounded-lg border border-cyan-400/30 bg-black/85 font-mono text-xs text-cyan-100 backdrop-blur sm:inset-x-auto sm:bottom-4 sm:left-4 sm:top-16 sm:max-h-none sm:w-[19rem]">
      <div className="flex items-center gap-2 border-b border-cyan-400/20 px-3 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 364 assets…"
          className="min-w-0 flex-1 rounded border border-cyan-400/25 bg-black/50 px-2 py-1 text-cyan-100 outline-none placeholder:text-cyan-600 focus:border-cyan-300"
        />
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 px-1 text-cyan-400 hover:text-white"
          aria-label="Close catalog"
        >
          ✕
        </button>
      </div>

      {!query && (
        // On a phone the chips scroll sideways in one row; wrapping all sixteen
        // would eat most of the sheet before a single asset was visible.
        <div className="flex gap-1 overflow-x-auto border-b border-cyan-400/20 px-2 py-2 sm:flex-wrap sm:overflow-x-visible">
          {CATEGORY_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide transition ${
                c === category ? 'bg-cyan-400/25 text-white' : 'text-cyan-400 hover:bg-cyan-400/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {results.map((e) => (
          <button
            key={e.url + e.name}
            type="button"
            onClick={() => arm(e)}
            className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left transition ${
              pending?.url === e.url ? 'bg-cyan-400/25 text-white' : 'hover:bg-cyan-400/10'
            }`}
          >
            <span className="truncate">{e.name}</span>
            {query && <span className="shrink-0 text-[10px] text-cyan-600">{e.category}</span>}
          </button>
        ))}
        {results.length === 0 && <p className="px-2 py-4 text-cyan-600">Nothing matches that.</p>}
      </div>

      {pending && (
        <div className="border-t border-cyan-400/20 bg-cyan-950/40 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-cyan-400">Placing</div>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-white">{pending.name}</span>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="shrink-0 rounded bg-cyan-400/20 px-2 py-0.5 text-[10px] uppercase text-cyan-100 hover:bg-cyan-400/40"
            >
              Done
            </button>
          </div>
          <p className="mt-1 text-[10px] leading-tight text-cyan-500">
            {narrow
              ? 'Tap the floor to drop one. Keeps placing until you tap Done.'
              : 'Click the floor to drop one. Keeps placing until you press Done or Esc.'}
          </p>
        </div>
      )}

      {narrow && !pending && (
        <p className="border-t border-cyan-400/20 px-3 py-2 text-[10px] leading-tight text-cyan-500">
          Drag a piece of furniture to move it · drag the ground to spin the view · pinch to zoom
        </p>
      )}
    </div>
  );
}

// ── Inspector ───────────────────────────────────────────────────────────────

function Inspector() {
  const id = useBuildStore((s) => s.selectedId);
  const o = useBuildStore((s) => (s.selectedId ? s.objects[s.selectedId] : null));
  const rotate = useBuildStore((s) => s.rotate);
  const nudgeY = useBuildStore((s) => s.nudgeY);
  const scaleBy = useBuildStore((s) => s.scaleBy);
  const remove = useBuildStore((s) => s.remove);
  const duplicate = useBuildStore((s) => s.duplicate);
  const patch = useBuildStore((s) => s.patch);
  const select = useBuildStore((s) => s.select);

  if (!id || !o) return null;

  const name = o.title || modelLabel(o.url);

  return (
    // Phone: docked to the bottom, where the palette would otherwise be (they
    // are mutually exclusive there). Desktop: a column on the right, opposite
    // the palette, leaving the middle of the screen clear to drag things in.
    <div className="pointer-events-auto fixed inset-x-2 bottom-2 z-40 rounded-lg border border-cyan-400/30 bg-black/85 p-3 font-mono text-xs text-cyan-100 backdrop-blur sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-16 sm:w-60">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-bold text-white">{name}</div>
          <div className="text-[10px] uppercase tracking-wider text-cyan-500">{o.kind}</div>
        </div>
        <button
          type="button"
          onClick={() => select(null)}
          className="shrink-0 text-cyan-400 hover:text-white"
          aria-label="Deselect"
        >
          ✕
        </button>
      </div>

      <Row label="Rotate">
        <Mini onClick={() => rotate(o.id, -ROTATE_STEP)}>↺</Mini>
        <Mini onClick={() => rotate(o.id, ROTATE_STEP)}>↻</Mini>
        <Mini onClick={() => rotate(o.id, Math.PI / 2)}>90°</Mini>
      </Row>

      <Row label="Height">
        <Mini onClick={() => nudgeY(o.id, -LIFT_STEP)}>▼</Mini>
        <Mini onClick={() => nudgeY(o.id, LIFT_STEP)}>▲</Mini>
        <span className="ml-1 text-cyan-500">{o.y.toFixed(2)}</span>
      </Row>

      <Row label="Size">
        <Mini onClick={() => scaleBy(o.id, 1 / 1.1)}>−</Mini>
        <Mini onClick={() => scaleBy(o.id, 1.1)}>+</Mini>
        <span className="ml-1 text-cyan-500">{o.scale.toFixed(2)}×</span>
      </Row>

      {o.kind === 'prop' && (
        <label className="mt-2 flex items-center gap-2 text-cyan-300">
          <input
            type="checkbox"
            checked={!!o.collider}
            onChange={(e) => patch(o.id, { collider: e.target.checked })}
            className="accent-cyan-400"
          />
          Solid (blocks walking)
        </label>
      )}

      {o.panelId && (
        <p className="mt-2 rounded border border-cyan-400/20 bg-cyan-950/40 px-2 py-1.5 text-[10px] leading-snug text-cyan-400">
          Opens <span className="text-cyan-200">{o.panelId}</span> — its text follows it wherever
          you put it.
        </p>
      )}

      <div className="mt-3 flex gap-1">
        <button
          type="button"
          onClick={() => duplicate(o.id)}
          className="flex-1 rounded bg-cyan-400/20 px-2 py-1 uppercase tracking-wider hover:bg-cyan-400/40 hover:text-white"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={() => remove(o.id)}
          className="flex-1 rounded bg-rose-500/20 px-2 py-1 uppercase tracking-wider text-rose-200 hover:bg-rose-500/40 hover:text-white"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-1.5 flex items-center gap-1">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-cyan-500">{label}</span>
      {children}
    </div>
  );
}

function Mini({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-[1.9rem] rounded bg-cyan-400/15 px-1.5 py-1 text-center hover:bg-cyan-400/35 hover:text-white"
    >
      {children}
    </button>
  );
}

// ── Hints ───────────────────────────────────────────────────────────────────

function HintBar({ narrow }: { narrow: boolean }) {
  const selected = useBuildStore((s) => s.selectedId !== null);
  return (
    <div className="pointer-events-none fixed bottom-3 left-1/2 z-40 max-w-[92vw] -translate-x-1/2 rounded-md border border-cyan-400/20 bg-black/70 px-3 py-1.5 text-center font-mono text-[10px] leading-relaxed text-cyan-400 backdrop-blur">
      {narrow ? (
        <div>Drag furniture to move it · drag the ground to spin · pinch to zoom</div>
      ) : (
        <div>
          Drag an object to move it · drag empty ground to orbit · wheel to zoom
          {selected && (
            <>
              {' '}· <b className="text-cyan-200">Q/E</b> rotate ·{' '}
              <b className="text-cyan-200">Del</b> remove
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Keyboard ────────────────────────────────────────────────────────────────

/**
 * Build-mode shortcuts. Bound while the overlay is mounted and torn down on
 * exit, so play mode's own keys (WASD/E/F) are never shadowed. Typing in the
 * palette's search box is exempt — otherwise "d" would delete the sofa.
 */
function useBuildShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

      const s = useBuildStore.getState();
      const id = s.selectedId;

      if (e.key === 'Escape') {
        if (s.pending) s.setPending(null);
        else if (id) s.select(null);
        else s.setMode('play');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (!id) return;
        e.preventDefault();
        s.duplicate(id);
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        s.setSnap(!s.snap);
        return;
      }
      if (!id) return;

      switch (e.key) {
        case 'q':
        case 'Q':
          s.rotate(id, -ROTATE_STEP);
          break;
        case 'e':
        case 'E':
          s.rotate(id, ROTATE_STEP);
          break;
        case 'r':
        case 'R':
          s.rotate(id, Math.PI / 2);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          s.remove(id);
          break;
        case 'PageUp':
          e.preventDefault();
          s.nudgeY(id, LIFT_STEP);
          break;
        case 'PageDown':
          e.preventDefault();
          s.nudgeY(id, -LIFT_STEP);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
