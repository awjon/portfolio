import { Billboard } from '../interactions/Billboard';
import { Npc } from '../interactions/Npc';

/**
 * Interactive objects in the central plaza (the 'P' block of CITY_MAP, centered
 * on the origin). Billboard panelIds match the `billboard` field on projects in
 * content/projects.ts. NPC panelIds match keys in npcDialog.
 *
 * The plaza is roughly a 12x12 open area around (0,0), framed by roads. These
 * positions place three billboards along the plaza edges and the guide near
 * the player's spawn.
 */
export function Interactables() {
  return (
    <>
      {/* Guide NPC just ahead of spawn — distinct skin from the player */}
      <Npc
        id="npc-guide"
        position={[2, 0, 2]}
        panelId="npc-guide"
        name="GUIDE"
        model="/models/npc/character-female-a.glb"
      />

      {/* North billboard */}
      <Billboard
        id="bb-1"
        position={[0, 0, -6]}
        panelId="works-billboard-1"
        title="WEB APPS"
        color="#00e5ff"
      />
      {/* West billboard */}
      <Billboard
        id="bb-2"
        position={[-6, 0, 1]}
        panelId="works-billboard-2"
        title="TOOLS & GAMES"
        color="#ff2d78"
      />
      {/* East billboard */}
      <Billboard
        id="bb-3"
        position={[6, 0, 1]}
        panelId="works-billboard-3"
        title="INFRA & MAPS"
        color="#b026ff"
      />
    </>
  );
}
