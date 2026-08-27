# Jon Wong — 3D Explorable Portfolio (M1–M5)

A Samsy-style walkable 3D portfolio. You control a Kenney mini character through
a small daytime house and its garden: real Kenney arcade cabinets in the games
den showcase projects (press E to open a panel), the household NPCs live indoors
and fifteen animals live outdoors, and the player has jump / fall / pick-up /
carry animations. Keyboard on desktop; on mobile you double-tap where you want
to go and interactions happen on their own — no joystick, no buttons.

- **M1** — walkable scene: ecctrl physics controller, idle/walk/run animation
  blending, reflective ground, bloom.
- **M2** — interactions: proximity detector, "Press E" prompt, project panels
  fed from `content/projects.ts`, and an NPC dialog box.
- **M3** — the **house world** (`src/world/`): a hand-authored floor plan
  (`HouseMap.ts`) as an ownership grid, with **edge-based** walls built from the
  Kenney Furniture Kit (wall / doorway / window panels derived from the boundary
  between two owners), instanced rendering (one draw call per unique piece),
  automatic colliders, five rooms — kitchen/diner, study, hall, living room and
  a games den where all six project cabinets live — plus a garden, hedge, trees
  and a quiet street outside. NPC dialog placeholders live in
  `content/projects.ts`; `#debug` in the URL gives a bird's-eye layout view
  (`#debug=x,y,z` or `#debug=x,y,z,tx,ty,tz` aims that camera at one room).
- **M4** — performance pass: lazy-loaded 3D chunk (app shell paints from a
  ~49KB gzipped chunk), isolated physics-WASM chunk, render loop pauses when
  the tab is hidden or a panel is open, DPR clamped + adaptive scaling, baked
  static shadows, Draco decompression, and an asset-compress script.
- **M5** — mobile controls with **no buttons and no joystick**: double-tap the
  ground to walk (A* over `NavGrid.ts` routes through doorways), one finger to
  look, pinch to zoom, and interactions that fire themselves when you stop
  beside someone. Plus Cloudflare Pages deploy config — see **DEPLOY.md**.

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

### The house — `src/world/`

The world is a small house drawn from a hand-authored floor plan and dressed
with the real **Kenney Furniture Kit** (CC0) GLBs in `public/models/furniture/`
(a missing file degrades to nothing rather than blanking the scene).

Walls are **edge-based**, the way Kenney models them: `HouseMap.PLAN` is an
ownership grid — one letter per cell naming the room that owns it — and a wall
panel is placed on every boundary edge, between two rooms or between a room and
the outside. Nothing about the shell is authored by hand: doors are the handful
of edges listed in `HouseMap.DOORS`, windows fall on a fixed rhythm along the
exterior edges, and the colliders, roof eaves and per-room floor tints all come
off the same edge sweep. Because rooms are cell *sets* rather than rectangles,
the plan can be L-shaped and stepped — which is what stops the place looking
like a grid of boxes.

| Module             | Responsibility                                                       |
| ------------------ | -------------------------------------------------------------------- |
| `HouseMap.ts`      | The plan, the door list, world-space constants, tile↔world helpers    |
| `HouseShell.tsx`   | Edge sweep → floors, walls, doorways, windows, roof, colliders       |
| `HouseProps.tsx`   | Per-room furniture, placed in (fractional) tile coordinates          |
| `Interactables.tsx`| Project cabinets, indoor NPCs, outdoor animals                       |
| `Exterior.tsx`     | Lawn, paths, hedge, trees, street and neighbouring houses            |
| `InstancedKit.tsx` | One draw call per unique mesh, for kit GLBs and plain shapes alike    |
| `Props.tsx`        | One-off GLB placement + auto colliders from each model's bounds      |

**Redesign the house:** edit `PLAN` and `DOORS` in `HouseMap.ts`. Give a cell a
different letter and the walls around it move; add an edge to `DOORS` and it
becomes an opening. Everything else follows.

**Sizing:** `TILE` in `HouseMap.ts` is the world size of one cell and doubles as
the Furniture Kit's scale (the kit is authored at 1 unit per tile), so changing
it rescales the whole building consistently. `PROP_SCALE` covers the arcade /
mini kits, which are authored smaller.

## Controls
- **Desktop:** WASD move · Shift run · Space jump · **E** interact · **ESC** close
- **Mobile:** **double-tap** the ground to walk there · one finger to look ·
  pinch to zoom. There is no joystick and no interact button: stop next to a
  cabinet, NPC or animal and it opens itself. Panels close with their own
  on-screen button.

### How mobile movement works

| Module                        | Responsibility                                        |
| ----------------------------- | ----------------------------------------------------- |
| `world/TapToMove.tsx`         | Touch-pointer double-tap → ground raycast → destination |
| `world/NavGrid.ts`            | Walkability grid + A*, so routes go through doorways   |
| `player/Player.tsx`           | Follows the route by feeding ecctrl the same joystick input its thumbstick used to |
| `interactions/AutoInteract.tsx` | Opens a panel once the player stops inside an interactable's radius |

Three details are worth knowing before changing any of it:

- **Only `pointerType === 'touch'` is handled**, so the desktop mouse keeps
  drag-to-orbit and a double-click does nothing.
- **Taps are timed by `event.timeStamp`, not `performance.now()`.** This scene
  can block the main thread for a few hundred ms on a phone; timing the gap
  inside the handler measures that lag instead of the user's fingers and
  rejects perfectly good double-taps.
- **Furniture is deliberately absent from the nav grid** (its colliders come
  from GLB bounds at load time, long after the grid is built). The follower
  gives up if it stops making progress, which covers walking into a sofa.

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
