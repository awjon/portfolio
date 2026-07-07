import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import {
  CITY_MAP,
  TILE_DEFS,
  TileDef,
  cellToWorld,
  HALF_PI,
} from './cityLayout';

/**
 * Renders the city from CITY_MAP.
 *
 * Strategy:
 *  - Group every cell by its tile symbol.
 *  - For each symbol, load its GLB once and reuse it across all its cells.
 *  - Collider tiles (buildings) get a Rapier cuboid so the player can't walk
 *    through them; non-collider tiles (roads, props) are visual only.
 *
 * Each unique GLB is loaded once via useGLTF (cached), and we clone lightweight
 * instances. For a Kenney-scale city this stays well within 60fps budget.
 */

interface PlacedTile {
  symbol: string;
  def: TileDef;
  position: [number, number, number];
  rotationY: number;
}

function usePlacedTiles(): PlacedTile[] {
  return useMemo(() => {
    const tiles: PlacedTile[] = [];
    for (let row = 0; row < CITY_MAP.length; row++) {
      const line = CITY_MAP[row];
      for (let col = 0; col < line.length; col++) {
        const symbol = line[col];
        const def = TILE_DEFS[symbol];
        if (!def) continue; // '.', 'P' etc. -> empty
        const position = cellToWorld(col, row);
        const rots = def.rotations ?? [0];
        // Deterministic pseudo-random rotation so the layout is stable between
        // reloads but tiles don't all face the same way.
        const seed = (row * 31 + col * 17) % rots.length;
        const rotationY = rots[seed] * HALF_PI;
        tiles.push({ symbol, def, position, rotationY });
      }
    }
    return tiles;
  }, []);
}

/** One GLB placed at a position, optionally with a collider. */
function Tile({ tile }: { tile: PlacedTile }) {
  const { scene } = useGLTF(tile.def.model, true);
  // Clone so each placement has its own transform.
  const object = useMemo(() => scene.clone(true), [scene]);

  const content = (
    <group
      position={tile.position}
      rotation={[0, tile.rotationY, 0]}
      // Kenney city tiles are ~1 unit; scale to TILE_SIZE. Adjust if your
      // extracted models use a different base size.
      scale={1}
    >
      <primitive object={object} />
    </group>
  );

  if (tile.def.collider) {
    return (
      <RigidBody type="fixed" colliders="cuboid">
        {content}
      </RigidBody>
    );
  }
  return content;
}

export function City() {
  const tiles = usePlacedTiles();
  return (
    <>
      {tiles.map((t, i) => (
        <Tile key={`${t.symbol}-${i}`} tile={t} />
      ))}
    </>
  );
}

// Preload every unique tile GLB so the loading screen covers them.
Object.values(TILE_DEFS).forEach((d) => useGLTF.preload(d.model, true));
