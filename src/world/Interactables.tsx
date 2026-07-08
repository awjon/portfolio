import { Billboard } from '../interactions/Billboard';
import { Npc } from '../interactions/Npc';
import { getDefaultHouseScene } from './HouseGenerator';

/**
 * Interactive objects, placed relative to the generated house's spawn point (the
 * living room). Billboard panelIds match the `billboard` field on projects in
 * content/projects.ts; the NPC panelId matches a key in npcDialog. Deriving the
 * positions from the scene spawn keeps them inside the room even if the layout
 * or seed changes.
 */
export function Interactables() {
  const [sx, , sz] = getDefaultHouseScene().spawn;

  return (
    <>
      {/* Guide NPC a couple of tiles from the player's spawn. */}
      <Npc
        id="npc-guide"
        position={[sx + 3, 0, sz + 1]}
        panelId="npc-guide"
        name="GUIDE"
        model="/models/npc/character-female-a.glb"
      />

      {/* Project "billboards" arranged around the living room. */}
      <Billboard
        id="bb-1"
        position={[sx, 0, sz - 5]}
        panelId="works-billboard-1"
        title="WEB APPS"
        color="#00e5ff"
      />
      <Billboard
        id="bb-2"
        position={[sx - 5, 0, sz]}
        panelId="works-billboard-2"
        title="TOOLS & GAMES"
        color="#ff2d78"
      />
      <Billboard
        id="bb-3"
        position={[sx + 5, 0, sz + 4]}
        panelId="works-billboard-3"
        title="INFRA & MAPS"
        color="#b026ff"
      />
    </>
  );
}
