# Naruke Alpha Workspace

The website and the Electron studio now live in separate directories while sharing the same Convex backend.

## Layout

- `apps/site/` - standalone Vite website.
- `apps/studio/` - Electron app, studio renderer, and local publishing helpers.
- `packages/shared/` - shared types, text helpers, content utilities, and base styling.
- `convex/` - shared backend functions and schema.
- `docs/serve-on-windows.md` - Windows + Cloudflare hosting notes for the site.

## Local setup

1. Install dependencies with `npm install`.
2. Install the OpenCode CLI and configure a model/provider if you want bookmark enrichment on that machine.
3. Copy `.env.example` to `.env.local` if you want the site build and local Electron dev run to start with seeded defaults.
4. Set `STUDIO_WRITE_KEY` inside the Convex deployment.
5. In the packaged studio, save the Convex URL, public site URL, and local write key through the Settings screen.

## Scripts

- `npm run dev:site` - website dev server on `127.0.0.1:5173`.
- `npm run dev:studio` - studio renderer on `127.0.0.1:5174` plus Electron.
- `npm run dev:all` - run both app surfaces together.
- `npm run build:site` - website bundle in `dist/site/`.
- `npm run build:studio` - studio renderer plus Electron bundles in `dist/studio/`.
- `npm run package:studio` - build macOS and Windows installers into `release/studio/`.
- `npm run check` - typecheck, build both apps, and verify required docs/build outputs.
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
4. Convex stores the bookmark and the studio mirrors the thumbnail into the local app-data thumbnail cache when possible.

If Convex is misconfigured, the app fails loudly instead of pretending the content was published. Bookmark enrichment is optional and can stay disabled on machines without OpenCode.
