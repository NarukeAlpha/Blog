# Cloudflare Site Deployment Plan

## Scope

- Host only the public website on Cloudflare.
- Keep the Electron studio local and manual-only.
- Publish the public site at `blog.alphadevahjin.com`.
- Use a hosted Convex deployment as the shared backend.

## Implementation Decisions

- The public site stays a static Vite build served by Cloudflare.
- The public site reads Convex through explicit public queries only.
- Bookmark notes stay private to the studio and are not exposed in public site responses.
- Studio-only dashboard reads require the shared write key.
- The studio renderer no longer talks to Convex directly.

## Hardening Summary

1. Added dedicated public Convex queries for the website.
2. Moved bookmark persistence helpers behind Convex internal functions.
3. Protected the studio overview query with `STUDIO_WRITE_KEY`.
4. Reduced the public bookmark payload so `note` is not exposed.
5. Moved studio-only Convex reads behind the Electron main process bridge.

## Cloudflare Summary

- Build command: `npm run build:site`
- Build output: `dist/site`
- Public build env vars:
  - `VITE_CONVEX_URL`
  - `VITE_PUBLIC_SITE_URL=https://blog.alphadevahjin.com`
- No custom Cloudflare Worker is required for the initial deployment.

## Remaining Manual Steps

- Create or choose the hosted Convex deployment.
- Set `STUDIO_WRITE_KEY` in the Convex deployment.
- Connect the repository to Cloudflare and configure the site build.
- Attach `blog.alphadevahjin.com` in Cloudflare.
