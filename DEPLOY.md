# Deploying to Cloudflare Pages (Git-connected)

This deploys the portfolio to Cloudflare Pages, auto-building on every push.
Your radd.uk zone is already in Cloudflare, so the custom domain is a couple of
clicks. **You run these steps — deploys publish to your live domain.**

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "3D portfolio M1-M5"
git branch -M main
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin main
```

`node_modules` and `dist` are gitignored — Cloudflare builds them.

## 2. Create the Pages project

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
**Connect to Git** → authorize GitHub → pick the repo.

Build settings:

| Setting                | Value           |
| ---------------------- | --------------- |
| Framework preset       | Vite (or None)  |
| Build command          | `npm run build` |
| Build output directory | `dist`          |
| Node version           | 20 (see below)  |

Node version is pinned by the committed `.nvmrc` (20). If the build picks a
different version, set an env var in the Pages project:
`NODE_VERSION = 20`.

Click **Save and Deploy**. First build takes a few minutes (it installs deps).

## 3. Custom domain

After the first successful deploy, in the Pages project:
**Custom domains** → **Set up a custom domain** → enter e.g. `world.radd.uk`.

Because radd.uk is already in your Cloudflare account, it auto-creates the CNAME
and provisions the cert. No manual DNS record needed. It's live in a minute or
two.

## 4. Subsequent deploys

Just `git push`. Cloudflare rebuilds and deploys automatically. Pull requests
get preview URLs.

## Notes

- **SPA routing:** `public/_redirects` sends all paths to `index.html` (200), so
  deep links and refreshes work. It's copied into `dist` automatically.
- **Large physics chunk:** the ~1MB-gzipped `physics-vendor` chunk (Rapier WASM)
  is expected. Cloudflare's CDN caches it; returning visitors don't re-download.
- **Models:** commit your Kenney `.glb` files under `public/` so they deploy with
  the build. Run `npm run compress` first to shrink them.
- **No Workers/KV/Firebat** involved — this is a static build served by Pages.
