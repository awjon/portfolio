import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import {
  KeyboardControls,
  Environment,
  Preload,
  AdaptiveDpr,
  AdaptiveEvents,
  BakeShadows,
} from '@react-three/drei';
import { Component, type ReactNode, Suspense } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { World } from './World';
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
        <color attach="background" args={['#15171e']} />
        <fog attach="fog" args={['#15171e', 45, 170]} />

        {/* Interior base fill so rooms read; per-room point lights add character. */}
        <ambientLight intensity={0.4} />

        {/* Soft overhead key (skylight through the roof), casting shadows. */}
        <directionalLight
          castShadow
          position={[15, 40, 10]}
          intensity={0.65}
          color="#fff4e6"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />

        {/* Gentle cool fill from the opposite side to lift shadowed walls. */}
        <directionalLight position={[-20, 12, -15]} intensity={0.2} color="#bcd0ff" />

        {/* Each subtree gets its OWN Suspense so no loader can blank the others.
            In particular the house (World) renders even if the interactables'
            drei <Text> font or the Environment HDR (both CDN fetches) are slow or
            blocked — the world never depends on the network to appear. */}
        <Suspense fallback={null}>
          <Physics timeStep="vary">
            <Suspense fallback={null}>
              <World />
            </Suspense>
            <Suspense fallback={null}>
              <Player />
            </Suspense>
            <Suspense fallback={null}>
              <Interactables />
            </Suspense>
          </Physics>
        </Suspense>

        <ProximityDetector />

        {/* Environment fetches an HDR from a CDN. Wrap it so a failed/blocked
            fetch degrades to the analytic lights instead of crashing or blocking
            the scene. */}
        <SafeBoundary>
          <Suspense fallback={null}>
            <Environment preset="apartment" />
          </Suspense>
        </SafeBoundary>

        {/* Preload warms every asset, but can hang on blocked CDN assets — keep
            it isolated so it can never stall the visible scene. */}
        <SafeBoundary>
          <Suspense fallback={null}>
            <Preload all />
          </Suspense>
        </SafeBoundary>

        {/* Shadows are static (only the player moves) — bake them once. */}
        <BakeShadows />

        {/* Perf: pause loop when hidden/paused; scale DPR + event rate under load. */}
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
