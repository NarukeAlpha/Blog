# Naruke Alpha

This repo now keeps the public website and the Electron studio in separate app directories:

- `apps/site` contains the standalone Vite website.
- `apps/studio` contains the Electron shell, studio renderer, and local publishing helpers.
- `packages/shared` contains shared content models and text helpers.
- `convex` remains the shared backend for both surfaces.

Useful scripts:

- `npm run dev:site`
- `npm run dev:studio`
- `npm run build:site`
- `npm run build:studio`
- `npm run check`
