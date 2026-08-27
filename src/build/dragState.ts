/**
 * dragState
 * ---------
 * The two numbers a drag needs between the pointer-down that starts it and the
 * pointer-moves that continue it: how far the object's origin sat from the
 * point you actually grabbed, and which horizontal plane to track it on.
 *
 * Deliberately a module-level mutable, not store state. It changes on every
 * pointer-move and nothing renders from it, so putting it in zustand would buy
 * a re-render of every subscriber per frame for no benefit.
 */

export const dragGrab = {
  /** object.x − hit.x at grab time. */
  dx: 0,
  /** object.z − hit.z at grab time. */
  dz: 0,
  /** Height of the plane the drag is tracked on (the object's own y). */
  planeY: 0,
};

export function beginDragAt(dx: number, dz: number, planeY: number) {
  dragGrab.dx = dx;
  dragGrab.dz = dz;
  dragGrab.planeY = planeY;
}
