# Jon Wong — 3D Explorable Portfolio (M1–M5)

A Samsy-style walkable 3D portfolio. You control a Kenney character through a
cyberpunk city, walk up to glowing billboards to view projects, and talk to an
NPC guide. Works with keyboard on desktop and an on-screen joystick on mobile.

- **M1** — walkable scene: ecctrl physics controller, idle/walk/run animation
  blending, reflective ground, bloom.
- **M2** — interactions: proximity detector, "Press E" prompt, project panels
  fed from `content/projects.ts`, and an NPC dialog box.
- **M3** — tile-based Kenney city loaded from an editable map, cyberpunk
  lighting (moonlight key + magenta/cyan rim lights), tuned fog and bloom.
  Runs with placeholder blocks until you add the city GLBs.
- **M4** — performance pass: lazy-loaded 3D chunk (app shell paints from a
  ~49KB gzipped chunk), isolated physics-WASM chunk, render loop pauses when
  the tab is hidden or a panel is open, DPR clamped + adaptive scaling, baked
  static shadows, Draco decompression, and an asset-compress script.
- **M5** — mobile joystick (touch-gated, its own lazy chunk desktop never
  loads) with an interact button wired to the same panel logic as the E key,
  plus Cloudflare Pages deploy config. See **DEPLOY.md**.

Verified: `npm run build` compiles and bundles cleanly, no circular chunks.

## Setup

```bash
npm install
npm run dev
```

> **Note on `npm install`:** this project depends on `ecctrl`, which is pinned to
> exactly `1.0.90` — the last version that supports the React 18 / R3F v8 stack.
> Newer ecctrl (1.0.94+) requires R3F v9. If you upgrade to R3F v9 later, bump
> ecctrl too. If npm complains about peer deps, `npm install --legacy-peer-deps`.

### Add your character model — Kenney (CC0)

The app loads `/public/models/character.glb`. `Character.tsx` **auto-detects**
the animation clip names inside the file (matching idle / walk / run / sprint),
so any Kenney animated character works without renaming.

1. From **kenney.nl**, download a CC0 animated character pack
   (**Animated Characters: Protagonists** or **Survivors**).
2. Export/convert to `.glb` (import the .fbx into Blender → export glTF Binary
   if the pack ships .fbx).
3. Save it as `public/models/character.glb`.
4. (Optional) A distinct NPC skin: save a second one as `public/models/npc-guide.glb`
   and pass `model="/models/npc-guide.glb"` to the `<Npc>` in `world/Interactables.tsx`.
5. Run and check the browser console — `Character.tsx` logs which clips it found
   and how it mapped them. No dedicated walk clip? It reuses run at 0.6x speed.

Project media (optional): drop `.mp4` or images in `public/media/` matching the
`media` paths in `content/projects.ts`. Missing media falls back to a title card.

### Add the city — Kenney City Kit (CC0)

M3 builds the city from a **tile map**, not hand-placed models. Until you add the
GLBs it runs with placeholder blocks derived from the same map, so you can see
the layout immediately and drop in art when ready.

1. From **kenney.nl**, download **City Kit (Roads)** and **City Kit (Commercial)**
   — both CC0, and the buildings are designed to fit the roads.
2. Export/convert the pieces to `.glb` (Blender: import → export glTF Binary).
3. Put them in `public/models/city/` with these names (or edit the paths in
   `src/world/cityLayout.ts` → `TILE_DEFS` to match your filenames):
   - `road-straight.glb`
   - `road-crossroad.glb`
   - `building-large.glb`
   - `building-small.glb`
   - `detail-lightpost.glb`
4. Reload. If a file is missing, the console warns and that tile falls back to a
   block — the app never crashes on missing art.

**Designing the city:** edit `CITY_MAP` in `src/world/cityLayout.ts`. It's a grid
of characters — `R` road, `X` crossroad, `B`/`S` buildings, `T` prop, `P` plaza
(kept clear for billboards/NPCs), `.` empty. The center `P` block sits on the
origin where the player spawns. Repeated tiles are cheap; change the map freely.

Tile scale: Kenney city pieces are sized in real-world-ish units. If buildings
look too big/small relative to `TILE_SIZE` (4 units), adjust the `scale` in
`src/world/City.tsx` or `TILE_SIZE` in `cityLayout.ts`.

## Controls
- **Desktop:** WASD move · Shift run · Space jump · **E** interact · **ESC** close
- **Mobile:** left thumbstick to move (push further = run) · **●** button to
  interact / close panels. Controls appear only on touch devices.

## Deploying
See **DEPLOY.md** for the full Cloudflare Pages (Git-connected) walkthrough.
Quick version: push to GitHub, connect the repo in Cloudflare Pages with build
command `npm run build` and output dir `dist`, then add a `*.radd.uk` custom
domain.

## Next steps (optional, beyond M5)
- Multiplayer presence (see others walking around) via PartyKit/WebSockets
- Avatar customization (swap Kenney skins)
- WebGPU + TSL renderer migration for higher-fidelity effects

## How the interaction system works (M2)
- `Interactable` wraps any object and registers its position + radius in the
  Zustand store on mount.
- `ProximityDetector` runs in the render loop at 10Hz, finds the closest
  in-range interactable, and sets it as `nearbyInteractable`.
- `HUD` shows the "Press E to …" prompt using that object's label.
- `InteractionControls` (a DOM listener) opens the object's panel on **E** and
  closes on **ESC**. Opening a panel sets `isPaused`, which freezes proximity
  checks while you read.
- `ProjectPanel` renders every project whose `billboard` matches the panel id
  (multiple = a carousel). `DialogBox` steps through an NPC's lines.

Add a project: append to `content/projects.ts` with a `billboard` id that
matches one of the billboards in `world/Interactables.tsx`. That's the only edit.

## Scripts
- `npm run dev` — dev server
- `npm run build` — production build (Vite)
- `npm run typecheck` — type-check your app code
- `npm run compress` — Draco/WebP-compress every GLB in `public/models/`

## Performance (M4)
- **Fast first paint.** The 3D world (`world/Experience`) is `lazy`-loaded, so
  the HTML, CSS, and loading screen render from a ~49KB-gzipped shell chunk
  while three.js + physics stream in behind the loader.
- **Isolated physics chunk.** The Rapier WASM (~1MB gzipped, and rarely changes)
  is split into its own long-cached chunk in `vite.config.ts`.
- **Idle culling.** `RenderLoopController` stops the render loop when the tab is
  hidden or a full-screen panel is open, so the GPU idles instead of burning
  battery on a covered/backgrounded scene.
- **Adaptive quality.** DPR is clamped to `[1, 2]`; `AdaptiveDpr` + `AdaptiveEvents`
  drop resolution/event rate under load so weak devices stay responsive.
- **Baked shadows.** Only the player moves, so `<BakeShadows />` computes the
  shadow map once instead of every frame.
- **Compressed assets.** All `useGLTF` loaders have Draco decompression enabled.
  Run `npm run compress` after adding models to shrink them 40–70%.
