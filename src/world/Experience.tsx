import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import {
  KeyboardControls,
  Environment,
  Preload,
  AdaptiveDpr,
  AdaptiveEvents,
  Sky,
  PerspectiveCamera,
} from '@react-three/drei';
import { Component, type ReactNode, Suspense } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { World } from './World';
import { HouseColliders } from './HouseShell';
import { Player } from '../player/Player';
import { Interactables } from './Interactables';
import { ProximityDetector } from '../interactions/ProximityDetector';
import { RenderLoopController } from './RenderLoopController';

// ecctrl reads these key names via drei's KeyboardControls.
const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['Shift'] },
  { name: 'action1', keys: ['KeyE'] }, // interact (M2)
];

/** Renders nothing if a child throws (e.g. a blocked Environment HDR fetch). */
class SafeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Open the site with #debug for a fixed bird's-eye view (no player) — handy
// for checking world layout in screenshots.
const DEBUG_TOPDOWN = typeof window !== 'undefined' && window.location.hash.includes('debug');

/**
 * `#debug` gives a bird's-eye view of the whole plot; `#debug=x,y,z` or
 * `#debug=x,y,z,tx,ty,tz` moves that camera, which is handy for eyeballing a
 * single room while laying furniture out.
 */
const DEBUG_CAM = (() => {
  if (!DEBUG_TOPDOWN) return { position: [0, 34, 22] as const, target: [0, 0, 0] as const };
  const n = (window.location.hash.match(/debug=([-\d.,]+)/)?.[1] ?? '')
    .split(',')
    .map(Number)
    .filter((v) => !Number.isNaN(v));
  return {
    position: (n.length >= 3 ? [n[0], n[1], n[2]] : [0, 34, 22]) as readonly [number, number, number],
    target: (n.length >= 6 ? [n[3], n[4], n[5]] : [0, 0, 0]) as readonly [number, number, number],
  };
})();

/** Mid-morning sun — shared by <Sky> and the shadow-casting key light. */
const SUN: [number, number, number] = [22, 21, 27];

export function Experience() {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        shadows
        camera={{ fov: 55, position: [0, 5, 10] }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{ powerPreference: 'high-performance', antialias: false }}
      >
        <color attach="background" args={['#bcdcf2']} />
        <fog attach="fog" args={['#cfe4f5', 45, 130]} />
        <Sky sunPosition={SUN} turbidity={3} rayleigh={0.9} mieCoefficient={0.006} />

        {/* Daylight base fill: warm sky above, bounced grass below. */}
        <hemisphereLight args={['#e6f0fb', '#8fa96a', 0.85]} />

        {/* The sun. Shadow frustum wraps the plot, not the whole ground plane. */}
        <directionalLight
          castShadow
          position={SUN}
          intensity={2.6}
          color="#fff3d8"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-34}
          shadow-camera-right={34}
          shadow-camera-top={34}
          shadow-camera-bottom={-34}
          shadow-normalBias={0.04}
        />

        {/* Cool sky fill from the opposite side so shaded walls keep their form. */}
        <directionalLight position={[-24, 16, 22]} intensity={0.35} color="#dbe8ff" />

        {/* Each subtree gets its OWN Suspense so no loader can blank the others.
            In particular the house (World) renders even if the interactables'
            drei <Text> font or the Environment HDR (both CDN fetches) are slow or
            blocked — the world never depends on the network to appear. */}
        <Suspense fallback={null}>
          <Physics timeStep={1 / 60}>
            {/* Colliders are pure data — mounted outside Suspense so the
                ground exists before the player capsule starts simulating. */}
            <HouseColliders />
            <Suspense fallback={null}>
              <World />
            </Suspense>
            {!DEBUG_TOPDOWN && (
              <Suspense fallback={null}>
                <Player />
              </Suspense>
            )}
            <Suspense fallback={null}>
              <Interactables />
            </Suspense>
          </Physics>
        </Suspense>

        <ProximityDetector />

        {DEBUG_TOPDOWN && (
          <PerspectiveCamera
            makeDefault
            position={[...DEBUG_CAM.position]}
            fov={50}
            onUpdate={(c) => c.lookAt(...(DEBUG_CAM.target as unknown as [number, number, number]))}
          />
        )}

        {/* Environment fetches an HDR from a CDN. Wrap it so a failed/blocked
            fetch degrades to the analytic lights instead of crashing or blocking
            the scene. */}
        <SafeBoundary>
          <Suspense fallback={null}>
            <Environment preset="park" />
          </Suspense>
        </SafeBoundary>

        {/* Preload warms every asset, but can hang on blocked CDN assets — keep
            it isolated so it can never stall the visible scene. */}
        <SafeBoundary>
          <Suspense fallback={null}>
            <Preload all />
          </Suspense>
        </SafeBoundary>

        {/* Perf: pause loop when hidden/paused; scale DPR + event rate under load.
            (No BakeShadows any more — NPCs/animals animate in place.) */}
        <RenderLoopController />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />

        <EffectComposer>
          <Bloom
            luminanceThreshold={1.0}
            luminanceSmoothing={0.9}
            intensity={0.25}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.25} darkness={0.3} />
        </EffectComposer>
      </Canvas>
    </KeyboardControls>
  );
}
