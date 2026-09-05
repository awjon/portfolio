/**
 * BuildModeScene
 * --------------
 * The in-Canvas half of Build Mode: a big invisible floor plane to drag
 * against, and one clickable/draggable "handle" per furniture piece, NPC and
 * arcade machine. Handles are deliberately separate from the real GLB meshes
 * underneath (which are too varied in shape/size to click or drag reliably) —
 * dragging a handle just writes into useEditorStore, and the real piece
 * re-renders at the new spot because HouseProps/Interactables read from the
 * same store.
 */

import { useEffect } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { HOUSE, tileToWorld, worldToTile } from '../world/HouseMap';
import { useEditorStore } from './useEditorStore';
import type { EditableKind } from './types';
import { Label } from '../interactions/Label';

const COLOR: Record<EditableKind, string> = {
  furniture: '#ffb703',
  npc: '#39d353',
  machine: '#22d3ee',
};

const NAME: Record<EditableKind, (item: { id: string }) => string> = {
  furniture: (item) => (item as { url?: string }).url?.split('/').pop()?.replace('.glb', '') ?? item.id,
  npc: (item) => (item as { name?: string }).name ?? item.id,
  machine: (item) => (item as { title?: string }).title ?? item.id,
};

function Handle({
  kind,
  item,
}: {
  kind: EditableKind;
  item: { id: string; tile: [number, number] };
}) {
  const selected = useEditorStore((s) => s.selected);
  const select = useEditorStore((s) => s.select);
  const setDragging = useEditorStore((s) => s.setDragging);
  const isSelected = selected?.kind === kind && selected?.id === item.id;
  const [x, , z] = tileToWorld(item.tile[0], item.tile[1]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    select({ kind, id: item.id });
    setDragging(item.id);
  };

  // Floating well above the tallest furniture (bookcases etc. top out under 2
  // world units) so the handle is always the nearest hit for the top-down
  // build camera — otherwise the furniture's own (much taller) GLB geometry
  // wins the raycast and the click never reaches the handle at all.
  const HANDLE_Y = 3.2;

  return (
    <group position={[x, 0, z]}>
      {/* Thin stem down to the floor spot, so the floating dot still reads as
          "belonging" to a specific point on the ground. */}
      <mesh position={[0, HANDLE_Y / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, HANDLE_Y, 6]} />
        <meshBasicMaterial color={COLOR[kind]} transparent opacity={0.5} depthTest={false} />
      </mesh>
      <mesh position={[0, HANDLE_Y, 0]} onPointerDown={onPointerDown}>
        <sphereGeometry args={[isSelected ? 0.26 : 0.18, 16, 16]} />
        <meshBasicMaterial color={isSelected ? '#ffffff' : COLOR[kind]} depthTest={false} />
      </mesh>
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.32, 0.4, 28]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthTest={false} />
        </mesh>
      )}
      {isSelected && (
        <Label text={NAME[kind](item)} position={[0, HANDLE_Y + 0.45, 0]} color="#ffffff" fontSize={0.22} />
      )}
    </group>
  );
}

/** Big invisible plane the drag raycasts against; also clears selection on an
 *  empty click so you can deselect without hunting for a dedicated button. */
function DragFloor() {
  const draggingId = useEditorStore((s) => s.draggingId);
  const selected = useEditorStore((s) => s.selected);
  const moveTile = useEditorStore((s) => s.moveTile);
  const select = useEditorStore((s) => s.select);
  const setDragging = useEditorStore((s) => s.setDragging);

  useEffect(() => {
    const up = () => setDragging(null);
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [setDragging]);

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingId || !selected) return;
    e.stopPropagation();
    const [tc, tr] = worldToTile(e.point.x, e.point.z);
    moveTile(selected.kind, selected.id, [tc, tr]);
  };

  const w = HOUSE.maxX - HOUSE.minX + 60;
  const d = HOUSE.maxZ - HOUSE.minZ + 60;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      onPointerMove={onPointerMove}
      onPointerDown={(e) => {
        e.stopPropagation();
        select(null);
      }}
    >
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function BuildModeScene() {
  const data = useEditorStore((s) => s.data);

  return (
    <>
      <DragFloor />
      {data.furniture.map((item) => (
        <Handle key={item.id} kind="furniture" item={item} />
      ))}
      {data.npcs.map((item) => (
        <Handle key={item.id} kind="npc" item={item} />
      ))}
      {data.machines.map((item) => (
        <Handle key={item.id} kind="machine" item={item} />
      ))}
    </>
  );
}
