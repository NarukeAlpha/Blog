# Blog

This repo is just my blog, experimenting with harness steering.

- `apps/site` contains the standalone Vite website.
- `apps/studio` contains the Electron shell, studio renderer, and local publishing helpers.
- `packages/shared` contains shared content models and text helpers.
- `convex` remains the shared backend for both surfaces.
- Local site and studio runs use the hosted `dev` Convex deployment by default, while the studio can switch between hosted `dev` and `prod` targets.
