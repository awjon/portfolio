/**
 * SceneObjects
 * ------------
 * Draws the live layout. This is what used to be the two hand-written arrays in
 * HouseProps.tsx and Interactables.tsx; those are now just seed data
 * (defaultLayout.ts) and the world reads the store instead.
 *
 * Two things matter for performance, because in build mode a drag moves an
 * object every pointer-move:
 *
 *  - the container subscribes to `order` only, so adding/removing an object
 *    re-renders the list but moving one does not;
 *  - each view subscribes to `objects[id]`, so a drag re-renders exactly the
 *    one object being dragged.
 *
 * The visuals are the same components play mode always used (ArcadeMachine,
 * Npc, Animal, Prop) — build mode only changes their wrapper, so there is no
 * second rendering path to keep in sync.
 */

import { memo, useCallback } from 'react';
import { shallow } from 'zustand/shallow';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useBuildStore } from '../state/useBuildStore';
import { baseScale, type SceneObject } from './types';
import { Prop } from '../world/Props';
import { ArcadeMachine } from '../interactions/ArcadeMachine';
import { Npc } from '../interactions/Npc';
import { Animal } from '../interactions/Animal';
import { beginDragAt } from './dragState';

export function SceneObjects() {
  const order = useBuildStore((s) => s.order, shallow);
  return (
    <>
      {order.map((id) => (
        <SceneObjectView key={id} id={id} />
      ))}
    </>
  );
}

function SceneObjectView({ id }: { id: string }) {
  const o = useBuildStore((s) => s.objects[id]);
  const building = useBuildStore((s) => s.mode === 'build');
  const selected = useBuildStore((s) => s.selectedId === id);
  const dragging = useBuildStore((s) => s.draggingId === id);
  const select = useBuildStore((s) => s.select);
  const beginGesture = useBuildStore((s) => s.beginGesture);
  const setDragging = useBuildStore((s) => s.setDragging);

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!building) return;
      // Only the nearest object under the cursor gets the click — without this
      // the ground plane behind it would also fire and deselect immediately.
      e.stopPropagation();
      if (e.button !== 0) return;
      const current = useBuildStore.getState().objects[id];
      if (!current) return;
      select(id);
      // Grab offset: keep the point you grabbed under the cursor, rather than
      // snapping the object's origin to it.
      beginDragAt(current.x - e.point.x, current.z - e.point.z, current.y);
      beginGesture();
      setDragging(id);
    },
    [building, id, select, beginGesture, setDragging],
  );

  if (!o) return null;

  return (
    <group
      onPointerDown={building ? onPointerDown : undefined}
      // Only build mode wants a hover cursor; in play mode the canvas keeps
      // whatever cursor the camera controls set.
      onPointerOver={building ? setGrabCursor : undefined}
      onPointerOut={building ? clearCursor : undefined}
    >
      <ObjectVisual o={o} interactive={!building} />
      {building && (selected || dragging) && <SelectionMarker o={o} dragging={dragging} />}
    </group>
  );
}

const setGrabCursor = () => {
  if (typeof document !== 'undefined') document.body.style.cursor = 'grab';
};
const clearCursor = () => {
  if (typeof document !== 'undefined') document.body.style.cursor = '';
};

/**
 * The object itself. Memoised on the object record so hovering or selecting
 * something never re-instantiates a GLB.
 */
const ObjectVisual = memo(function ObjectVisual({
  o,
  interactive,
}: {
  o: SceneObject;
  interactive: boolean;
}) {
  const scale = baseScale(o.kind) * o.scale;
  const position: [number, number, number] = [o.x, o.y, o.z];

  switch (o.kind) {
    case 'machine':
      return (
        <ArcadeMachine
          id={o.id}
          url={o.url}
          position={position}
          rotationY={o.rotationY}
          panelId={o.panelId ?? o.id}
          title={o.title ?? ''}
          color={o.color}
          animate={o.animate}
          scale={scale}
          enabled={interactive}
        />
      );

    case 'npc':
      return (
        <Npc
          id={o.id}
          model={o.url}
          position={position}
          rotationY={o.rotationY}
          name={o.title ?? ''}
          pose={o.pose}
          panelId={o.panelId}
          scale={scale}
          enabled={interactive}
        />
      );

    case 'animal':
      return (
        <Animal
          id={o.id}
          species={o.species ?? 'cat'}
          position={position}
          rotationY={o.rotationY}
          size={o.scale}
          ambient={o.ambient}
          name={o.title}
          enabled={interactive}
        />
      );

    default:
      return (
        <Prop
          // A fixed RigidBody only reads `position` when it is created, so a
          // committed move has to remount it. Keying on the transform does
          // exactly that, and only for props that actually carry a collider.
          key={o.collider && interactive ? `${o.x}:${o.y}:${o.z}:${o.rotationY}:${scale}` : undefined}
          url={o.url}
          at={[o.x, o.z]}
          offset={[0, o.y, 0]}
          rotationY={o.rotationY}
          scale={scale}
          collider={o.collider}
          animate={o.animate}
          physics={interactive}
        />
      );
  }
});

const SELECT_COLOR = '#37e0ff';
const DRAG_COLOR = '#ffd23f';

/**
 * Floor ring under the selection, plus a stalk when the object is lifted off
 * the ground — from an overhead build camera a table-top item and the table it
 * sits on otherwise look like the same spot.
 */
function SelectionMarker({ o, dragging }: { o: SceneObject; dragging: boolean }) {
  const color = dragging ? DRAG_COLOR : SELECT_COLOR;
  const r = 0.42 * Math.max(0.7, Math.min(2.5, o.scale));
  return (
    <group position={[o.x, 0.03, o.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r, r + 0.13, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* A short facing tick, so rotation is readable while you spin it. */}
      <mesh rotation={[-Math.PI / 2, 0, -o.rotationY]} position={[0, 0.001, 0]}>
        <planeGeometry args={[0.09, r * 1.7]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} depthTest={false} />
      </mesh>
      {o.y > 0.05 && (
        <mesh position={[0, o.y / 2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, o.y, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
