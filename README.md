# Blog

This repository contains my blog and related tooling, with some experimentation around harness steering.

- `apps/site` contains the standalone Vite website.
- `apps/studio` contains the Electron shell, studio renderer, and local publishing helpers.
- `packages/shared` contains shared content models and text helpers.
- `convex` provides the shared backend for both surfaces.
- Local site and studio runs use the hosted `dev` Convex deployment by default. The studio can also switch between the hosted `dev` and `prod` targets.
