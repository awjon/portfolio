import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Isolate only the Rapier physics WASM (the single largest, most stable
        // chunk) so it caches independently. Everything else uses Vite's default
        // splitting, which avoids the circular-chunk pitfalls of hand-splitting
        // three/react/r3f (they cross-reference each other heavily).
        manualChunks(id) {
          if (id.includes('@dimforge') || id.includes('rapier')) {
            return 'physics-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 2200, // rapier WASM legitimately exceeds this
  },
});
