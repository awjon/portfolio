// Portfolio content. Arcade machines and panels read from this array,
// so adding a project is a one-line change here.

export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  media?: string; // path to image or mp4 in /public/media
  tags: string[];
  url?: string;
  billboard: string; // which arcade-machine panel shows this (e.g. 'works-wiseframe')
}

export const projects: Project[] = [
  {
    id: 'wiseframe',
    title: 'WiseFrame',
    tagline: 'Auto-generated ownership flowcharts for small business owners',
    description:
      'A mobile-first PWA that generates Visio-style ownership flowcharts via Mermaid.js for non-technical small business owners. One-time digital-download model.',
    media: '/media/wiseframe.mp4',
    tags: ['React 18', 'Vite', 'Cloudflare Workers', 'Tailwind', 'PWA'],
    url: '',
    billboard: 'works-wiseframe',
  },
  {
    id: 'rondevus',
    title: 'Rondevus',
    tagline: 'Turn event flyer photos into calendar files',
    description:
      'A PWA that converts event flyer photos into .ics calendar files, designed for elderly, non-technical users. Vision model parses the flyer; output drops straight into any calendar app.',
    media: '/media/rondevus.mp4',
    tags: ['Next.js 14', 'Convex', 'Clerk', 'Stripe', 'Gemini / Claude'],
    url: 'https://rondev.us',
    billboard: 'works-rondevus',
  },
  {
    id: 'cleavercut',
    title: 'CleaverCut',
    tagline: 'Meat & poultry price tracker',
    description:
      'A price-tracking PWA combining the Kroger API with USDA ERS wholesale signals and a deterministic recommendation engine (no AI dependency). GasBuddy-style monetization.',
    media: '/media/cleavercut.mp4',
    tags: ['Next.js 15', 'Supabase', 'Drizzle', 'shadcn/ui', 'n8n'],
    url: '',
    billboard: 'works-cleavercut',
  },
  {
    id: 'survival-sim',
    title: 'Survival Sim',
    tagline: 'Escape a dying star system via space elevator',
    description:
      'A 2D builder in Godot 4 blending Sim Tower and Frostpunk mechanics: a human colony escapes across three planets in eccentric orbit. Six-chapter progression, high-drama choice events, deep-space aesthetic.',
    media: '/media/survival-sim.mp4',
    tags: ['Godot 4', 'GDScript', 'Game Design'],
    url: '',
    billboard: 'works-survival-sim',
  },
  {
    id: 'playground-finder',
    title: 'Playground Finder',
    tagline: 'Find playgrounds with crowdsourced accessibility data',
    description:
      'A Seattle-first PWA for finding playgrounds with crowdsourced equipment and accessibility data, seeded from OpenStreetMap and Google. Haversine proximity search.',
    media: '/media/playground-finder.mp4',
    tags: ['PWA', 'PostGIS', 'Haversine', 'OSM'],
    url: '',
    billboard: 'works-playground-finder',
  },
  {
    id: 'firebat',
    title: 'Firebat Homelab',
    tagline: 'Self-hosted everything on an N150 mini PC',
    description:
      'A home server running Ubuntu, Docker, Traefik, and Cloudflare Zero Trust tunnels under radd.uk. Hosts a pixel-art portfolio, self-hosted finance, photo library, and a fleet of n8n automations.',
    media: '/media/firebat.mp4',
    tags: ['Ubuntu', 'Docker', 'Traefik', 'Cloudflare', 'n8n'],
    url: 'https://jonis.radd.uk',
    billboard: 'works-firebat',
  },
];

// ── NPC & animal dialog, keyed by panel id ('npc-<id>' / 'npc-animal-<species>').
// Everything below the guide is a PLACEHOLDER — edit the lines freely; the
// world doesn't care how many lines each entry has.
export const npcDialog: Record<string, string[]> = {
  'npc-guide': [
    'Welcome to the station. Use WASD to walk, Shift to run, Space to jump.',
    'The arcade hall is through the west door — press E at any glowing cabinet to check out a project.',
    'The lab, the lounge, and the city outside are all open. Explore at your own pace.',
  ],
  'npc-visitor': ['[Placeholder] Just moving some boxes in. Edit me in src/content/projects.ts.'],
  'npc-gamer': ['[Placeholder] This pinball machine is rigged, I swear.'],
  'npc-highscore': ['[Placeholder] I hold the high score on every cabinet here.'],
  'npc-employee': ['[Placeholder] Welcome to the arcade! Tickets for prizes at the counter.'],
  'npc-scientist': ['[Placeholder] Careful with the equipment, please.'],
  'npc-analyst': ['[Placeholder] The numbers on this screen never sleep.'],
  'npc-lounger': ['[Placeholder] Best sofa in the station. Find your own.'],
  'npc-reader': ['[Placeholder] Have you read anything good lately?'],
  'npc-walker': ['[Placeholder] Nice night for a walk around the block.'],
  'npc-parkgoer': ['[Placeholder] The animals in this park are very friendly.'],

  // Animals
  'npc-animal-cat': ['[Placeholder] Mrrp. The lab cat ignores you affectionately.'],
  'npc-animal-dog': ['[Placeholder] Woof! The lounge dog wants belly rubs.'],
  'npc-animal-penguin': ['[Placeholder] The penguin waddles in a small circle.'],
  'npc-animal-deer': ['[Placeholder] The deer glances up, then keeps grazing.'],
  'npc-animal-fox': ['[Placeholder] The fox eyes you with suspicion.'],
  'npc-animal-bunny': ["[Placeholder] The bunny's nose twitches."],
  'npc-animal-monkey': ['[Placeholder] The monkey has been dancing all evening.'],
  'npc-animal-giraffe': ['[Placeholder] The giraffe is browsing the tall planters.'],
  'npc-animal-tiger': ['[Placeholder] The tiger is surprisingly chill about all this.'],
  'npc-animal-bee': ['[Placeholder] Bzzz. The bee is doing important bee business.'],
  'npc-animal-caterpillar': ['[Placeholder] The caterpillar inches along, unbothered.'],
  'npc-animal-panda': ['[Placeholder] The panda is having a snack. Again.'],
  'npc-animal-parrot': ['[Placeholder] "PLACEHOLDER! PLACEHOLDER!" squawks the parrot.'],
  'npc-animal-crab': ['[Placeholder] The crab scuttles sideways, claws up.'],
  'npc-animal-chick': ['[Placeholder] Peep peep. The chick pecks at the path.'],
};
