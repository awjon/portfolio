#!/usr/bin/env bash
#
# Compress every .glb under public/models/ in place, using gltf-transform.
# Applies Draco geometry compression + WebP texture compression + dedup/prune.
#
# Usage:  ./scripts/compress-assets.sh
# Needs:  npx (bundled with npm). First run downloads @gltf-transform/cli.
#
# Rule of thumb: Kenney low-poly GLBs shrink 40-70% with Draco alone; textured
# models benefit most from the texture step. Always keep an uncompressed backup
# (this script writes alongside, then replaces — see below).

set -euo pipefail

MODELS_DIR="public/models"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found — install Node.js/npm first." >&2
  exit 1
fi

shopt -s globstar nullglob
found=0
for f in "$MODELS_DIR"/**/*.glb; do
  found=1
  echo "→ compressing $f"
  tmp="${f%.glb}.min.glb"
  npx --yes @gltf-transform/cli optimize "$f" "$tmp" \
    --compress draco \
    --texture-compress webp \
    --simplify false
  mv "$tmp" "$f"
  echo "  done: $(du -h "$f" | cut -f1)"
done

if [ "$found" -eq 0 ]; then
  echo "No .glb files found under $MODELS_DIR — add your models first."
fi
