import { Suspense } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { MeshReflectorMaterial } from '@react-three/drei';
import { City } from './City';
import { CITY_MAP, TILE_DEFS, cellToWorld } from './cityLayout';

/**
 * M3 world: reflective ground + a tile-based Kenney city loaded from CITY_MAP.
 *
 * The <City> loads GLBs from /public/models/city/. Until you've added those
 * files, City will suspend forever / error, so we wrap it in a Suspense +
 * error boundary fallback that renders the old placeholder blocks. This means
 * the project always runs — with boxes before you add art, with the real city
 * after.
 */
export function World() {
  return (
    <>
      {/* Ground: fixed collider + reflective cyberpunk street */}
      <RigidBody type="fixed" colliders={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[300, 300]} />
          <MeshReflectorMaterial
            mirror={0.5}
            resolution={1024}
            mixBlur={1}
            mixStrength={3}
            roughness={0.75}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            color="#0a0a12"
            metalness={0.6}
          />
        </mesh>
        <CuboidCollider args={[150, 0.1, 150]} position={[0, -0.1, 0]} />
      </RigidBody>

      {/* Real Kenney city; falls back to placeholder blocks if GLBs missing. */}
      <CityErrorBoundary fallback={<PlaceholderCity />}>
        <Suspense fallback={<PlaceholderCity />}>
          <City />
        </Suspense>
      </CityErrorBoundary>
    </>
  );
}

/**
 * Placeholder rendering derived from the SAME CITY_MAP, so even before you add
 * Kenney models you can see the city's shape: buildings become emissive boxes,
 * roads become dark flat tiles.
 */
function PlaceholderCity() {
  const blocks: JSX.Element[] = [];
  const neon = ['#ff2d78', '#00e5ff', '#b026ff', '#39ff14'];

  CITY_MAP.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const s = line[col];
      const def = TILE_DEFS[s];
      if (!def) continue;
      const [x, , z] = cellToWorld(col, row);
      if (def.collider) {
        const h = s === 'B' ? 8 : 4;
        blocks.push(
          <RigidBody key={`${row}-${col}`} type="fixed" colliders="cuboid" position={[x, h / 2, z]}>
            <mesh castShadow>
              <boxGeometry args={[3, h, 3]} />
              <meshStandardMaterial
                color="#111827"
                emissive={neon[(row + col) % neon.length]}
                emissiveIntensity={1.2}
              />
            </mesh>
          </RigidBody>
        );
      } else if (s === 'R' || s === 'X') {
        blocks.push(
          <mesh key={`${row}-${col}`} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.6, 3.6]} />
            <meshStandardMaterial color="#15151f" />
          </mesh>
        );
      }
    }
  });

  return <>{blocks}</>;
}

/* Minimal error boundary (class component — hooks can't catch render errors). */
import { Component, ReactNode } from 'react';
class CityErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    console.warn(
      '[City] Could not load Kenney city GLBs from /public/models/city/. ' +
        'Showing placeholder blocks. See README for the model setup.'
    );
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
