Kenney (CC0) GLBs, organized by set. The app references these paths:

  character/character-male-d.glb   -> player (src/player/Character.tsx)
  npc/character-female-a.glb       -> guide NPC (src/world/Interactables.tsx)
  road/road-straight.glb           -> R tiles \
  road/road-crossroad.glb          -> X tiles  |
  road/light-square.glb            -> T tiles   > city grid (src/world/cityLayout.ts)
  city/building-skyscraper-a.glb   -> B tiles  |
  city/building-a.glb              -> S tiles /

Each set keeps its own Textures/ folder because the GLBs reference
Textures/colormap.png relatively — keep GLBs beside their Textures/ folder.
To swap in other pieces, edit the paths in src/world/cityLayout.ts (TILE_DEFS)
and src/player/Character.tsx; no need to rename files.
