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
import { Suspense } from 'react';
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
        <color attach="background" args={['#04050a']} />
        <fog attach="fog" args={['#080a16', 18, 75]} />

        {/* Base ambient — kept low so neon reads. */}
        <ambientLight intensity={0.12} />

        {/* Cool moonlight key from above, casting shadows. */}
        <directionalLight
          castShadow
          position={[15, 30, 10]}
          intensity={0.5}
          color="#8ea3ff"
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />

        {/* Magenta + cyan rim lights from opposite sides — the cyberpunk staple. */}
        <directionalLight position={[-20, 8, -15]} intensity={0.5} color="#ff2d78" />
        <directionalLight position={[20, 8, 15]} intensity={0.5} color="#00e5ff" />

        <Suspense fallback={null}>
          <Physics timeStep="vary">
            <World />
            <Player />
            <Interactables />
          </Physics>
          <ProximityDetector />
          <Environment preset="night" />
          <Preload all />
          {/* Shadows are static (only the player moves) — bake them once so the
              shadow map isn't recomputed every frame. */}
          <BakeShadows />
        </Suspense>

        {/* Perf: pause loop when hidden/paused; scale DPR + event rate under load. */}
        <RenderLoopController />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.6}
            luminanceSmoothing={0.9}
            intensity={1.2}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.95} />
        </EffectComposer>
      </Canvas>
    </KeyboardControls>
  );
}
