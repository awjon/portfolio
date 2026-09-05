import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const placementFile = fileURLToPath(new URL('./src/content/placement.json', import.meta.url));

/**
 * Dev-only save endpoint for Build Mode (src/editor). `configureServer` is
 * only invoked by `vite dev`, never by `vite build` or `vite preview` of the
 * built output, so this never exists on the deployed site — Build Mode is a
 * local authoring tool, not a runtime feature.
 */
function buildModeSavePlugin(): Plugin {
  return {
    name: 'build-mode-save-placement',
    configureServer(server) {
      server.middlewares.use('/__editor/save-placement', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!data || !Array.isArray(data.furniture) || !Array.isArray(data.npcs) || !Array.isArray(data.machines)) {
              throw new Error('expected { furniture: [], npcs: [], machines: [] }');
            }
            writeFileSync(placementFile, JSON.stringify(data, null, 2) + '\n');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildModeSavePlugin()],
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
