import { useProgress } from '@react-three/drei';
import { useGameStore } from '../state/useGameStore';

export function LoadingScreen() {
  const { progress, active } = useProgress();
  if (!active && progress === 100) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05060a] text-cyan-300">
      <div className="text-2xl font-mono tracking-widest">LOADING</div>
      <div className="mt-4 h-1 w-64 overflow-hidden rounded bg-cyan-900">
        <div
          className="h-full bg-cyan-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 font-mono text-sm">{Math.floor(progress)}%</div>
    </div>
  );
}

export function HUD({ isTouch = false }: { isTouch?: boolean }) {
  const nearby = useGameStore((s) => s.nearbyInteractable);
  const interactables = useGameStore((s) => s.interactables);
  const activePanel = useGameStore((s) => s.activePanel);

  const rec = nearby ? interactables.get(nearby) : null;
  const label = rec?.label ?? 'interact';

  return (
    <>
      {/* Controls hint — keyboard on desktop, joystick note on touch. */}
      <div className="pointer-events-none fixed bottom-4 left-4 z-40 font-mono text-xs text-white/70">
        {isTouch ? (
          <div>Drag the stick to move · tap ● to interact</div>
        ) : (
          <>
            <div>WASD — move</div>
            <div>SHIFT — run</div>
            <div>SPACE — jump</div>
            <div>E — interact</div>
            <div>F — carry</div>
          </>
        )}
      </div>

      {/* Interaction prompt — hidden while a panel is open. */}
      {rec && !activePanel && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-40 -translate-x-1/2 rounded-md border border-cyan-400/50 bg-black/60 px-4 py-2 font-mono text-sm text-cyan-300">
          {isTouch ? (
            <>Tap <span className="font-bold text-white">●</span> to {label}</>
          ) : (
            <>Press <span className="font-bold text-white">E</span> to {label}</>
          )}
        </div>
      )}
    </>
  );
}
