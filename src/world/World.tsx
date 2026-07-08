import { HouseRenderer } from './HouseRenderer';

/**
 * The world is now a procedurally-generated indoor house, built by the modular
 * engine in `world/` (HouseLayout → HouseGenerator → HouseRenderer). Everything
 * — floor, auto-tiled walls, doors, windows, furniture, colliders and room
 * lighting — is derived from a seeded logical layout, so swapping the layout or
 * the asset registry re-themes the whole level without touching this file.
 *
 * HouseRenderer wraps each model in its own Suspense + error boundary, so the
 * scene renders as a readable placeholder house until the Kenney Furniture Kit
 * GLBs are added under /public/models/furniture/.
 */
export function World() {
  return <HouseRenderer />;
}
