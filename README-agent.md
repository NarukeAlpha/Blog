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
2. Copy `.env.example` to `.env.local` so the local site and studio default to the hosted `dev` Convex deployment.
3. Install the OpenCode CLI and configure a model/provider if you want bookmark enrichment on that machine.
4. Set `STUDIO_WRITE_KEY` inside each hosted Convex deployment that the studio should publish to.
5. In the Electron studio Settings screen, choose `dev` or `prod`, then save the matching Convex cloud URL, Convex action URL, public site URL, and write key for that target.
6. Only run `npm run dev:convex` when you explicitly want to test against a local Convex backend instead of the hosted `dev` deployment.

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

### Environments

- Local site and studio runs use the hosted `dev` Convex deployment by default.
- The Electron studio keeps separate saved targets for hosted `dev` and `prod` Convex deployments.
- Cloudflare production points at `https://ardent-firefly-400.convex.cloud`.

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
