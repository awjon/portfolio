import { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { projects } from '../content/projects';

/**
 * Full-screen overlay showing the projects tied to a given billboard.
 * A billboard's panelId maps to one or more projects (via project.billboard).
 * Multiple projects on one billboard become a small carousel.
 */
export function ProjectPanel() {
  const activePanel = useGameStore((s) => s.activePanel);
  const closePanel = useGameStore((s) => s.closePanel);
  const [index, setIndex] = useState(0);

  // Only handle billboard panels here (ids like "works-billboard-1").
  if (!activePanel || !activePanel.startsWith('works-billboard')) return null;

  const items = projects.filter((p) => p.billboard === activePanel);
  if (items.length === 0) return null;

  const safeIndex = Math.min(index, items.length - 1);
  const project = items[safeIndex];

  const next = () => setIndex((i) => (i + 1) % items.length);
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);

  const close = () => {
    setIndex(0);
    closePanel();
  };

  const isVideo = project.media?.endsWith('.mp4');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[min(720px,92vw)] overflow-hidden rounded-xl border border-cyan-400/30 bg-[#0b0d16] shadow-[0_0_40px_rgba(0,229,255,0.15)]">
        {/* Close */}
        <button
          onClick={close}
          className="absolute right-3 top-3 z-10 rounded-md border border-white/20 bg-black/40 px-3 py-1 font-mono text-sm text-white/80 hover:bg-white/10"
        >
          ESC ✕
        </button>

        {/* Media */}
        <div className="aspect-video w-full bg-black">
          {project.media ? (
            isVideo ? (
              <video
                src={project.media}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <img src={project.media} alt={project.title} className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-cyan-500/40">
              {project.title}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          <h2 className="font-mono text-2xl font-bold text-cyan-300">{project.title}</h2>
          <p className="mt-1 text-sm text-white/60">{project.tagline}</p>
          <p className="mt-4 text-sm leading-relaxed text-white/80">{project.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {project.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-cyan-400/30 px-2.5 py-0.5 font-mono text-xs text-cyan-300/80"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            {project.url ? (
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-cyan-400 px-4 py-2 font-mono text-sm font-bold text-black hover:bg-cyan-300"
              >
                Visit →
              </a>
            ) : (
              <span className="font-mono text-xs text-white/30">Case study coming soon</span>
            )}

            {items.length > 1 && (
              <div className="flex items-center gap-3 font-mono text-sm text-white/70">
                <button onClick={prev} className="px-2 hover:text-cyan-300">
                  ‹
                </button>
                <span>
                  {safeIndex + 1} / {items.length}
                </span>
                <button onClick={next} className="px-2 hover:text-cyan-300">
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
