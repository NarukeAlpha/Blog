# Convex Environment Separation

This branch now implements the environment split workstream.

Delivered focus:
- local site and studio runs default to the hosted `dev` Convex deployment
- the Electron studio now stores separate hosted `dev` and `prod` targets
- the studio settings screen includes a dropdown that switches the active environment
- production Cloudflare deploys point at `https://ardent-firefly-400.convex.cloud`
- production studio HTTP actions point at `https://ardent-firefly-400.convex.site`
- local Convex remains available as an explicit opt-in workflow for isolated backend testing
- docs now include a dev-to-prod migration sequence that preserves the old prod state as a rollback backup
