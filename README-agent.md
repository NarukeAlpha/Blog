# NarukeAlpha Convex Studio

This repo serves a public React website and an Electron studio from the same frontend codebase, with Convex as the live backend.

## What it does

- Writes posts directly into Convex.
- Writes researched bookmarks directly into Convex and mirrors thumbnails into `public/thumbnails/`.
- Serves the website as a static Vite bundle that reads live data from Convex.
- Starts `opencode serve` automatically when a bookmark needs research and no local server is running.

## Project layout

- `electron/` - Electron main process and preload bridge.
- `src/renderer/` - React renderer, UI components, and styles.
- `convex/` - schema and backend functions.
- `lib/` - publishing, Convex, thumbnail cache, and OpenCode services.
- `public/thumbnails/` - mirrored bookmark thumbnails.
- `docs/serve-on-windows.md` - Cloudflare + Windows hosting notes.

## Local setup

1. Install dependencies with `npm install`.
2. Install the OpenCode CLI and configure a model/provider so bookmark research can run.
3. Copy `.env.example` to `.env.local` and fill in the Convex URL, public site URL, and studio write key.
4. Set `STUDIO_WRITE_KEY` inside the Convex deployment too.
5. Launch the studio in dev mode with `npm run dev`, or run the production build locally with `npm start`.

## Helpful scripts

- `npm run dev:convex` starts a local Convex development deployment when needed.
- `npm run build` creates the Vite renderer bundle and the Electron main/preload bundles in `dist/`.
- `npm run build:web` creates the standalone website bundle in `dist/renderer/`.
- `npm run check` type-checks the app, builds it, and verifies the deployment notes and thumbnail cache.
- `npm test` runs a small unit test suite for slugs, excerpts, bookmark URL normalization, and thumbnail helpers.

## Studio layout

- Left rail: dashboard, post, and bookmark navigation.
- Main area: live deployment health, recent content, or the active editor.
- Public mode: editorial landing page plus live post and bookmark data from Convex.

## Publishing flow

### Posts

Use the desktop studio's post form. When you click publish, the app:

1. validates the draft locally,
2. writes it to Convex,
3. updates the public site immediately.

### Bookmarks

Use the bookmark form with a URL. The app:

1. makes sure `opencode serve` is reachable on `127.0.0.1:4096`,
2. asks OpenCode for structured bookmark metadata,
3. stores the bookmark in Convex,
4. mirrors the thumbnail into `public/thumbnails/` when possible.

If Convex is misconfigured, the app fails loudly instead of pretending the content was published.

# NarukeAlpha Convex Studio

This repo now has two surfaces wired to the same backend:

- a standalone Vite webpage that can be served from any box,
- an Electron studio for writing posts and saving researched bookmarks.

Convex is the source of truth. The web app reads live content from the hosted deployment, and the Electron app writes to that same deployment with a local write key instead of an auth flow.

## What changed

- Removed Writerside and the GitHub Pages action flow.
- Replaced local JSON content files with Convex-backed posts and bookmarks.
- Kept OpenCode bookmark enrichment, then mirrored bookmark thumbnails into `public/thumbnails/` as a local cache.
- Added deployment notes for serving the standalone site from a Windows PC behind Cloudflare.

## Scripts

- `npm run dev` - Vite renderer + Electron shell.
- `npm run dev:convex` - optional local Convex development deployment.
- `npm run build:web` - standalone site bundle in `dist/renderer/`.
- `npm run build` - site bundle + Electron main/preload bundles.
- `npm run check` - codegen, typecheck, build, and verify required assets/docs.
- `npm test` - unit tests for the publishing helpers.

## Environment

Start from `.env.example`.

- `VITE_CONVEX_URL` powers the web renderer.
- `CONVEX_URL` powers Electron's main-process writes.
- `STUDIO_WRITE_KEY` must exist locally and in the Convex deployment.
- `VITE_PUBLIC_SITE_URL` / `PUBLIC_SITE_URL` lets the studio open the served site directly.

## Serving plan

The recommended Windows + Cloudflare flow lives in `docs/serve-on-windows.md`.
