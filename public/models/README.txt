Kenney (CC0) GLBs, organized by set.

Active in the current (house) world:
  character/character-male-d.glb   -> player   (src/player/Character.tsx)
  npc/character-female-a.glb       -> guide NPC (src/world/Interactables.tsx)
  furniture/*.glb                  -> the house engine's asset registry
                                      (src/world/HouseAssets.ts — see
                                       furniture/README.txt for the file list)

Kept for future stages (not referenced by the current world):
  city/ , road/ , animals/         -> earlier city-kit assets, left in place so a
                                      future "city stage" can reuse them.

Each set keeps its own Textures/ folder because the GLBs reference
Textures/colormap.png relatively — keep GLBs beside their Textures/ folder.
Model paths live only in the code registries (HouseAssets.ts, Character.tsx);
edit those to remap, no need to rename files.
