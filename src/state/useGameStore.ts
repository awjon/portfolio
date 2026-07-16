import { create } from 'zustand';
import * as THREE from 'three';

export type MoveState = 'idle' | 'walk' | 'run' | 'jump' | 'fall';
export type InteractableKind = 'machine' | 'npc' | 'animal';

/** One-shot player animation clips (Kenney mini-character clip names). */
export type PlayerAction = 'pick-up' | 'emote-yes' | 'interact-right';

export interface InteractableRecord {
  id: string;
  kind: InteractableKind;
  position: THREE.Vector3;
  radius: number;
  // What opens when the player presses E near this object.
  panelId: string;
  label?: string; // optional custom prompt, e.g. "Talk" / "Play"
}

interface GameState {
  // Movement / animation
  moveState: MoveState;
  setMoveState: (s: MoveState) => void;

  // One-shot animation (pick-up on interact, etc.). nonce lets the same action
  // retrigger; Character clears it when the clip finishes.
  playerAction: { name: PlayerAction; nonce: number } | null;
  triggerPlayerAction: (name: PlayerAction) => void;
  clearPlayerAction: () => void;

  // Carry toggle (F): idle pose becomes 'holding-both' with a box in hand.
  holding: boolean;
  toggleHolding: () => void;

  // Live player position (written by Player each frame, read by detector).
  playerPos: THREE.Vector3;

  // Interactable registry — objects register/unregister themselves on mount.
  interactables: Map<string, InteractableRecord>;
  registerInteractable: (r: InteractableRecord) => void;
  unregisterInteractable: (id: string) => void;

  // Which interactable the player is currently close enough to use.
  nearbyInteractable: string | null;
  setNearbyInteractable: (id: string | null) => void;

  // Which overlay panel is open (null = none / in-world).
  activePanel: string | null;
  openPanel: (id: string) => void;
  closePanel: () => void;

  // Perf: pause render-heavy work + input while a full-screen panel is open.
  isPaused: boolean;
}

export const useGameStore = create<GameState>((set, get) => ({
  moveState: 'idle',
  setMoveState: (moveState) => {
    if (get().moveState !== moveState) set({ moveState });
  },

  playerAction: null,
  triggerPlayerAction: (name) =>
    set((s) => ({ playerAction: { name, nonce: (s.playerAction?.nonce ?? 0) + 1 } })),
  clearPlayerAction: () => set({ playerAction: null }),

  holding: false,
  toggleHolding: () => set((s) => ({ holding: !s.holding })),

  playerPos: new THREE.Vector3(),

  interactables: new Map(),
  registerInteractable: (r) => {
    const map = get().interactables;
    map.set(r.id, r);
    // Mutating the Map in place is fine since consumers read it in useFrame,
    // not via React render. No setState needed here.
  },
  unregisterInteractable: (id) => {
    get().interactables.delete(id);
  },

  nearbyInteractable: null,
  setNearbyInteractable: (id) => {
    if (get().nearbyInteractable !== id) set({ nearbyInteractable: id });
  },

  activePanel: null,
  openPanel: (activePanel) => set({ activePanel, isPaused: true }),
  closePanel: () => set({ activePanel: null, isPaused: false }),

  isPaused: false,
}));

// Debug hook: lets DevTools / test scripts read live game state
// (e.g. __game.getState().playerPos) without affecting the app.
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__game = useGameStore;
}
