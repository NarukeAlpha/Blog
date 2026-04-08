# Deploying The Site On Cloudflare

## Environment model

- Local site and studio runs use the hosted `dev` Convex deployment by default.
- The Electron studio keeps two hosted targets in Settings: `dev` and `prod`.
- `npx convex dev --local` remains optional for isolated backend testing only.
- Cloudflare production must point at the production Convex deployment.

## Production endpoints

- Public hostname: `blog.alphadevahjin.com`
- Cloudflare site host: static Git-connected deployment
- Prod Convex client URL: `https://ardent-firefly-400.convex.cloud`
- Prod Convex action URL: `https://ardent-firefly-400.convex.site`

## Required environment variables

### Cloudflare production site build

- `VITE_CONVEX_URL=https://ardent-firefly-400.convex.cloud`
- `VITE_PUBLIC_SITE_URL=https://blog.alphadevahjin.com`

### Local app defaults

- `VITE_CONVEX_URL=https://<your-dev-deployment>.convex.cloud`
- `VITE_PUBLIC_SITE_URL=http://127.0.0.1:5173`

- `STUDIO_DEV_CONVEX_URL=https://<your-dev-deployment>.convex.cloud`
- `STUDIO_DEV_CONVEX_SITE_URL=https://<your-dev-deployment>.convex.site`
- `STUDIO_DEV_PUBLIC_SITE_URL=http://127.0.0.1:5173`
- `STUDIO_DEV_WRITE_KEY=<dev studio write key>`
- `STUDIO_PROD_CONVEX_URL=https://ardent-firefly-400.convex.cloud`
- `STUDIO_PROD_CONVEX_SITE_URL=https://ardent-firefly-400.convex.site`
- `STUDIO_PROD_PUBLIC_SITE_URL=https://blog.alphadevahjin.com`
- `STUDIO_PROD_WRITE_KEY=<prod studio write key>`

### Optional local Convex backend testing

- `CONVEX_DEPLOYMENT=dev:<your-dev-deployment>`
- `CONVEX_DEPLOY_KEY_DEV=<your-dev-deploy-key>`

If you run `npx convex dev --local`, Convex may rewrite `VITE_CONVEX_URL` in `.env.local` to a local backend URL. Treat that as an explicit opt-in testing mode, not the normal website workflow.

### Hosted Convex deployments

- `STUDIO_WRITE_KEY=<matching studio write key>`

Set the Convex secret in each hosted deployment through the Convex dashboard or the CLI for that specific deployment.

## Cloudflare project settings

Create the project from the repository in Cloudflare and use these settings:

- Production branch: choose the branch you want Cloudflare to deploy
- Root directory: repository root
- Build command: `npm run build:site`
- Build output directory: `dist/site`

No custom Worker is required for the current site.

Reason:

- the site is already a static Vite app,
- it reads Convex directly from the browser,
- post navigation uses hash URLs, so no edge rewrite is required.

## Domain steps

1. Add or confirm `alphadevahjin.com` in Cloudflare DNS.
2. In the Cloudflare site project, attach the custom domain `blog.alphadevahjin.com`.
3. Keep `VITE_PUBLIC_SITE_URL` aligned with the final production URL.

## Migration plan

Goal:

- replicate the current hosted dev schema and data into prod,
- keep dev intact as the testing environment,
- preserve the old prod state as a rollback snapshot.

Recommended sequence:

1. Deploy the current backend code and schema to prod with `npx convex deploy --prod`.
2. Export the current prod deployment as a rollback backup.
3. Export the hosted dev deployment with file storage included.
4. Import the dev snapshot into prod with `--replace`.
5. Validate counts and spot-check posts, bookmarks, and bookmark thumbnails.

Suggested commands:

```bash
npx convex deploy --prod
npx convex export --prod --path ./backups/prod-pre-migration.zip --include-file-storage
npx convex export --url "https://<your-dev-deployment>.convex.cloud" --path ./backups/dev-snapshot.zip --include-file-storage
npx convex import ./backups/dev-snapshot.zip --prod --replace
```

Notes:

- ZIP import/export preserves document IDs and creation times.
- `--include-file-storage` is required if bookmark thumbnails or other stored files need to move with the data.
- The source dev deployment is not modified by export/import, so it remains available for testing.
- The old prod data is preserved in `prod-pre-migration.zip` for rollback.

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
