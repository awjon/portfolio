import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import {
  KeyboardControls,
  Environment,
  Preload,
  AdaptiveDpr,
  AdaptiveEvents,
  Stars,
  PerspectiveCamera,
} from '@react-three/drei';
import { Component, type ReactNode, Suspense } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { World } from './World';
import { StationColliders } from './StationShell';
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
        <color attach="background" args={['#0b0e18']} />
        <fog attach="fog" args={['#0b0e18', 45, 150]} />
        <Stars radius={140} depth={40} count={1600} factor={3.5} saturation={0} fade />

        {/* Night-time base fill; per-room point lights add character. */}
        <ambientLight intensity={0.38} color="#8794c4" />

        {/* Moonlight key, casting shadows over the whole block. */}
        <directionalLight
          castShadow
          position={[25, 40, -15]}
          intensity={0.55}
          color="#bcc9ff"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-70}
          shadow-camera-right={70}
          shadow-camera-top={70}
          shadow-camera-bottom={-70}
        />

        {/* Gentle warm fill from the street side to lift shadowed walls. */}
        <directionalLight position={[-20, 12, 25]} intensity={0.18} color="#ffd9a8" />

        {/* Each subtree gets its OWN Suspense so no loader can blank the others.
            In particular the house (World) renders even if the interactables'
            drei <Text> font or the Environment HDR (both CDN fetches) are slow or
            blocked — the world never depends on the network to appear. */}
        <Suspense fallback={null}>
          <Physics timeStep={1 / 60}>
            {/* Colliders are pure data — mounted outside Suspense so the
                ground exists before the player capsule starts simulating. */}
            <StationColliders />
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
            position={[0, 75, 45]}
            fov={50}
            onUpdate={(c) => c.lookAt(0, 0, 0)}
          />
        )}

        {/* Environment fetches an HDR from a CDN. Wrap it so a failed/blocked
            fetch degrades to the analytic lights instead of crashing or blocking
            the scene. */}
        <SafeBoundary>
          <Suspense fallback={null}>
            <Environment preset="night" />
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
            luminanceThreshold={0.85}
            luminanceSmoothing={0.9}
            intensity={0.5}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </KeyboardControls>
  );
}
