# Deploying The Site On Cloudflare

## What ships

- `npm run build:site` produces the public site bundle in `dist/site/`.
- The site is static and client-rendered.
- Posts and bookmarks are fetched live from Convex at runtime.
- Code changes require a new Cloudflare deploy, but content changes appear immediately after publishing to Convex.

## Deployment target

- Public hostname: `blog.alphadevahjin.com`
- Site hosting: Cloudflare Git-connected static deployment
- Backend: hosted Convex deployment
- Studio: local Electron app only

## Required environment variables

### Cloudflare site build

- `VITE_CONVEX_URL=https://<your-convex-deployment>.convex.cloud`
- `VITE_PUBLIC_SITE_URL=https://blog.alphadevahjin.com`

### Local studio

- `CONVEX_URL=https://<your-convex-deployment>.convex.cloud`
- `PUBLIC_SITE_URL=https://blog.alphadevahjin.com`
- `STUDIO_WRITE_KEY=<long-random-secret>`

### Convex deployment

- `STUDIO_WRITE_KEY=<same long-random-secret>`

Set the Convex secret with:

```bash
npx convex env set STUDIO_WRITE_KEY "your-random-key"
```

## Cloudflare project settings

Create the project from the repository in Cloudflare and use these settings:

- Production branch: choose the branch you want Cloudflare to deploy
- Root directory: repository root
- Build command: `npm run build:site`
- Build output directory: `dist/site`

No custom Worker is required for the initial deployment.

Reason:

- the site is already a static Vite app,
- it reads Convex directly from the browser,
- post navigation uses hash URLs, so no edge rewrite is required.

## Domain steps

1. Add or confirm `alphadevahjin.com` in Cloudflare DNS.
2. In the Cloudflare site project, attach the custom domain `blog.alphadevahjin.com`.
3. Keep `VITE_PUBLIC_SITE_URL` aligned with the final production URL.

## GitHub flow

1. Push the deployment branch to GitHub.
2. Connect the repository to Cloudflare.
3. Let Cloudflare build preview deployments from pull requests if desired.
4. Merge to the chosen production branch when you want the public site updated.

## Convex hardening assumptions

- The public site only uses the dedicated public Convex queries.
- Bookmark notes remain private to the studio.
- Studio-only overview reads require `STUDIO_WRITE_KEY`.
- Bookmark persistence helpers are internal and cannot be called directly from the public client.
