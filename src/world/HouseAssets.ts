/**
 * HouseAssets
 * -----------
 * The ONE place that maps a logical object to concrete GLB file(s) (goal 4). The
 * renderer only ever refers to `AssetKey`s and looks them up here, so no asset
 * path is hardcoded anywhere else. Swapping this registry for another (office,
 * hospital, spaceship…) re-skins the whole engine without touching any other
 * module — that is the extensibility the task asks for.
 *
 * An asset can be COMPOSITE: e.g. a T-junction wall = one corner + one straight
 * piece, a cross = two corners (per the task). Each part carries an optional
 * local offset/rotation/scale so composites assemble correctly.
 *
 * Every asset also declares how it should COLLIDE, so CollisionBuilder can decide
 * automatically (walls/cabinets/tables block; rugs/lamps/plants don't — goal 6).
 */

import { WALL_HEIGHT } from './HouseLayout';

export type AssetKey =
  // shell
  | 'floor'
  | 'wallStraight'
  | 'wallCorner'
  | 'wallTJunction'
  | 'wallCross'
  | 'wallEnd'
  | 'wallPost'
  | 'door'
  | 'window'
  // furniture / props
  | 'sofa'
  | 'chair'
  | 'table'
  | 'bed'
  | 'bookshelf'
  | 'desk'
  | 'coffeeTable'
  | 'rug'
  | 'lamp'
  | 'tv'
  | 'plant'
  | 'refrigerator'
  | 'microwave'
  | 'fruitBowl'
  | 'toaster'
  | 'kitchenCabinet'
  | 'nightstand'
  | 'dresser'
  | 'toilet'
  | 'bathtub'
  | 'sink';

/** How the physics layer treats an asset. 'doorframe' = passable gap + side posts. */
export type ColliderKind = 'none' | 'cuboid' | 'doorframe';

export interface AssetPart {
  file: string; // relative to registry.basePath
  offset?: [number, number, number];
  rotationY?: number; // radians
  scale?: number | [number, number, number];
}

export interface AssetDef {
  parts: AssetPart[];
  collider: ColliderKind;
  /** Tiles the asset occupies (w, h). Drives placeholder size + occupancy. */
  footprint?: [number, number];
  /** Fallback box shown until the real GLB is added (renders when a part 404s). */
  placeholder: { color: string; height: number };
}

export interface AssetRegistry {
  basePath: string;
  /** Global multiplier applied to every model (tune when real GLBs are added). */
  scale: number;
  assets: Record<AssetKey, AssetDef>;
}

const H = WALL_HEIGHT;

/**
 * Kenney Furniture Kit mapping (goal 4). Filenames follow the kit's names; the
 * pieces the task specifies are used verbatim. Missing files fall back to a
 * coloured placeholder box, so the house is fully playable before art lands.
 */
export const HOUSE_ASSETS: AssetRegistry = {
  basePath: '/models/furniture/',
  scale: 4,
  assets: {
    floor: { parts: [{ file: 'floorFull.glb' }], collider: 'none', placeholder: { color: '#3b3f4a', height: 0.1 } },

    // Walls — auto-tiled variants. Composites per the task:
    //   T-junction = 1 corner + 1 straight ; cross = 2 corners.
    wallStraight: { parts: [{ file: 'wall.glb' }], collider: 'cuboid', placeholder: { color: '#7b8494', height: H } },
    wallCorner: { parts: [{ file: 'wallCorner.glb' }], collider: 'cuboid', placeholder: { color: '#7b8494', height: H } },
    wallTJunction: {
      parts: [{ file: 'wallCorner.glb' }, { file: 'wall.glb', rotationY: Math.PI / 2 }],
      collider: 'cuboid',
      placeholder: { color: '#7b8494', height: H },
    },
    wallCross: {
      parts: [{ file: 'wallCorner.glb' }, { file: 'wallCorner.glb', rotationY: Math.PI }],
      collider: 'cuboid',
      placeholder: { color: '#7b8494', height: H },
    },
    wallEnd: { parts: [{ file: 'wall.glb' }], collider: 'cuboid', placeholder: { color: '#7b8494', height: H } },
    wallPost: { parts: [{ file: 'wall.glb' }], collider: 'cuboid', placeholder: { color: '#8b93a1', height: H } },
    door: { parts: [{ file: 'wallDoorwayWide.glb' }], collider: 'doorframe', placeholder: { color: '#9c7a4d', height: H } },
    window: { parts: [{ file: 'wallWindowSlide.glb' }], collider: 'cuboid', placeholder: { color: '#a9dbe8', height: H } },

    // Living room
    sofa: { parts: [{ file: 'loungeDesignSofa.glb' }], collider: 'cuboid', footprint: [2, 1], placeholder: { color: '#4b6a88', height: 1 } },
    coffeeTable: { parts: [{ file: 'tableCoffee.glb' }], collider: 'cuboid', placeholder: { color: '#9b7653', height: 0.5 } },
    rug: { parts: [{ file: 'rugRectangle.glb' }], collider: 'none', footprint: [3, 2], placeholder: { color: '#b5563f', height: 0.04 } },
    lamp: { parts: [{ file: 'lampRoundFloor.glb' }], collider: 'none', placeholder: { color: '#f4d35e', height: 1.6 } },
    tv: { parts: [{ file: 'televisionModern.glb' }], collider: 'none', footprint: [2, 1], placeholder: { color: '#1f2430', height: 1.2 } },
    plant: { parts: [{ file: 'pottedPlant.glb' }], collider: 'none', placeholder: { color: '#3f7d3f', height: 1.2 } },

    // Generic furniture
    table: { parts: [{ file: 'tableCloth.glb' }], collider: 'cuboid', footprint: [2, 1], placeholder: { color: '#a9814f', height: 1 } },
    chair: { parts: [{ file: 'chairCushion.glb' }], collider: 'cuboid', placeholder: { color: '#8a6d3b', height: 1 } },
    bookshelf: { parts: [{ file: 'bookcaseClosed.glb' }], collider: 'cuboid', placeholder: { color: '#6b4f3a', height: 2 } },
    desk: { parts: [{ file: 'desk.glb' }], collider: 'cuboid', footprint: [2, 1], placeholder: { color: '#8a6d3b', height: 1 } },

    // Bedroom
    bed: { parts: [{ file: 'bedDouble.glb' }], collider: 'cuboid', footprint: [2, 2], placeholder: { color: '#7d5ba6', height: 0.8 } },
    nightstand: { parts: [{ file: 'cabinetBedDrawer.glb' }], collider: 'cuboid', placeholder: { color: '#8d6e63', height: 0.6 } },
    dresser: { parts: [{ file: 'sideTableDrawers.glb' }], collider: 'cuboid', placeholder: { color: '#795548', height: 1.1 } },

    // Kitchen
    refrigerator: { parts: [{ file: 'kitchenFridge.glb' }], collider: 'cuboid', placeholder: { color: '#cfd8dc', height: 2 } },
    microwave: { parts: [{ file: 'kitchenMicrowave.glb' }], collider: 'none', placeholder: { color: '#90a4ae', height: 0.4 } },
    // The kit has no bowl; a blender is the nearest small counter item.
    fruitBowl: { parts: [{ file: 'kitchenBlender.glb' }], collider: 'none', placeholder: { color: '#e57373', height: 0.2 } },
    toaster: { parts: [{ file: 'toaster.glb' }], collider: 'none', placeholder: { color: '#b0bec5', height: 0.3 } },
    kitchenCabinet: { parts: [{ file: 'kitchenCabinetUpper.glb' }], collider: 'cuboid', placeholder: { color: '#a1887f', height: 1 } },

    // Bathroom
    toilet: { parts: [{ file: 'toilet.glb' }], collider: 'cuboid', placeholder: { color: '#eceff1', height: 0.8 } },
    bathtub: { parts: [{ file: 'bathtub.glb' }], collider: 'cuboid', footprint: [2, 1], placeholder: { color: '#eceff1', height: 0.6 } },
    sink: { parts: [{ file: 'bathroomSink.glb' }], collider: 'cuboid', placeholder: { color: '#eceff1', height: 1 } },
  },
};

export function getAsset(registry: AssetRegistry, key: AssetKey): AssetDef {
  return registry.assets[key];
}
