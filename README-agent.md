# Naruke Alpha Workspace

The website and the Electron studio now live in separate directories while sharing the same Convex backend.

## Layout

- `apps/site/` - standalone Vite website.
- `apps/studio/` - Electron app, studio renderer, and local publishing helpers.
- `packages/shared/` - shared types, text helpers, content utilities, and base styling.
- `convex/` - shared backend functions and schema.
- `docs/deploy-site-on-cloudflare.md` - Cloudflare hosting notes for the public site.

## Local setup

1. Install dependencies with `npm install`.
2. Install the OpenCode CLI and configure a model/provider for bookmark enrichment.
3. Copy `.env.example` to `.env.local` and fill in the Convex URL, public site URL, and studio write key.
4. Set `STUDIO_WRITE_KEY` inside the Convex deployment too.

## Scripts

- `npm run dev:site` - website dev server on `127.0.0.1:5173`.
- `npm run dev:studio` - studio renderer on `127.0.0.1:5174` plus Electron.
- `npm run dev:all` - run both app surfaces together.
- `npm run build:site` - website bundle in `dist/site/`.
- `npm run build:studio` - studio renderer plus Electron bundles in `dist/studio/`.
- `npm run check` - typecheck, build both apps, and verify required docs/cache paths.
- `npm test` - unit tests for shared content and thumbnail helpers.

## Publishing flow

### Posts

1. Write in the Electron studio.
2. Publish to Convex.
3. The website updates from the same deployment.

### Bookmarks

1. Submit a URL in the Electron studio.
2. The app ensures `opencode serve` is reachable on `127.0.0.1:4096`.
3. OpenCode returns structured bookmark metadata.
4. Convex stores the bookmark and the studio mirrors the thumbnail into `apps/studio/cache/thumbnails/` when possible.

If Convex is misconfigured, the app fails loudly instead of pretending the content was published.
