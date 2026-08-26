import { lazy, Suspense } from 'react';
import { HUD, LoadingScreen } from './ui/HUD';
import { ProjectPanel } from './ui/ProjectPanel';
import { DialogBox } from './ui/DialogBox';
import { TouchHints } from './ui/TouchHints';
import { InteractionControls } from './interactions/InteractionControls';
import { AutoInteract } from './interactions/AutoInteract';
import { useIsTouch } from './ui/useIsTouch';

/**
 * The 3D Experience (three.js + rapier + postprocessing) is the heavy part of
 * the bundle. We lazy-load it so the HTML, CSS, and loading screen paint almost
 * instantly, then the ~1.2MB-gzipped 3D chunk streams in behind the loader.
 */
const Experience = lazy(() =>
  import('./world/Experience').then((m) => ({ default: m.Experience }))
);

export default function App() {
  const isTouch = useIsTouch();

  return (
    <div className="fixed inset-0 h-full w-full">
      <LoadingScreen />

      <Suspense fallback={null}>
        <Experience />
      </Suspense>

      <HUD isTouch={isTouch} />

      {/* 2D overlays (outside the canvas) */}
      <ProjectPanel />
      <DialogBox />

      {/* Keyboard (E/ESC) always on. Touch has no buttons at all: you walk by
          double-tapping (see world/TapToMove) and interactions fire themselves
          once you stop next to something. */}
      <InteractionControls />
      <AutoInteract enabled={isTouch} />
      {isTouch && <TouchHints />}
    </div>
  );
}
