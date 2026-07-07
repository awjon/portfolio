// Portfolio content. Billboards and panels read from this array,
// so adding a project is a one-line change here.

export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  media?: string; // path to image or mp4 in /public/media
  tags: string[];
  url?: string;
  billboard: string; // which billboard/interactable id shows this
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
    billboard: 'works-billboard-1',
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
    billboard: 'works-billboard-1',
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
    billboard: 'works-billboard-2',
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
    billboard: 'works-billboard-2',
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
    billboard: 'works-billboard-3',
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
    billboard: 'works-billboard-3',
  },
];

// NPC dialog content, keyed by interactable id.
export const npcDialog: Record<string, string[]> = {
  'npc-guide': [
    'Welcome to the city. Use WASD to walk, Shift to run, Space to jump.',
    'Walk up to a glowing billboard and press E to check out a project.',
    'The districts ahead hold more of my work — explore at your own pace.',
  ],
};
