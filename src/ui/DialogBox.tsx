import { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { npcDialog } from '../content/projects';

/**
 * Bottom dialog box for NPC conversations. Steps through the lines registered
 * for the active NPC panel (ids like "npc-guide"), then closes.
 */
export function DialogBox() {
  const activePanel = useGameStore((s) => s.activePanel);
  const closePanel = useGameStore((s) => s.closePanel);
  const [line, setLine] = useState(0);

  if (!activePanel || !activePanel.startsWith('npc-')) return null;

  // Fall back to an obvious placeholder so a missing entry is easy to spot.
  const lines = npcDialog[activePanel] ?? [
    `(No dialog yet — add "${activePanel}" to npcDialog in src/content/projects.ts)`,
  ];

  const isLast = line >= lines.length - 1;

  const advance = () => {
    if (isLast) {
      setLine(0);
      closePanel();
    } else {
      setLine((l) => l + 1);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
      <div className="w-[min(640px,94vw)] rounded-xl border border-green-400/30 bg-[#0b0d16]/95 p-5 shadow-[0_0_30px_rgba(57,255,20,0.15)]">
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-green-400/80">
          {activePanel.replace('npc-', '').replace(/-/g, ' ')}
        </div>
        <p className="min-h-[3rem] text-sm leading-relaxed text-white/90">{lines[line]}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-xs text-white/30">
            {line + 1} / {lines.length}
          </span>
          <button
            onClick={advance}
            className="rounded-md bg-green-400 px-4 py-1.5 font-mono text-sm font-bold text-black hover:bg-green-300"
          >
            {isLast ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
