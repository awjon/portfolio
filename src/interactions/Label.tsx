import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Self-contained floating text label: renders the string onto a canvas and
 * shows it as a camera-facing sprite. Unlike drei's <Text>, it needs no font
 * fetch, so labels can never suspend or blank out the scene when a CDN is
 * unreachable.
 */
export function Label({
  text,
  position,
  color = '#ffffff',
  fontSize = 0.28,
}: {
  text: string;
  position: [number, number, number];
  color?: string;
  fontSize?: number; // world height of the text
}) {
  const { texture, aspect } = useMemo(() => {
    const pad = 16;
    const fontPx = 64;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `bold ${fontPx}px monospace`;
    canvas.width = Math.ceil(ctx.measureText(text).width) + pad * 2;
    canvas.height = fontPx + pad * 2;
    // (Re)set after resize resets state.
    ctx.font = `bold ${fontPx}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { texture, aspect: canvas.width / canvas.height };
  }, [text, color]);

  const h = fontSize * 1.6; // canvas padding makes the glyphs ~60% of height
  return (
    <sprite position={position} scale={[h * aspect, h, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}
