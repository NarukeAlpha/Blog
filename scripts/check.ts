import { access } from "node:fs/promises";
import path from "node:path";

import { DEPLOYMENT_PLAN_FILE, ROOT_DIR, THUMBNAILS_DIR } from "../apps/studio/lib/paths";

for (const requiredFile of [DEPLOYMENT_PLAN_FILE]) {
  await access(requiredFile);
}

for (const buildOutput of [
  path.join(ROOT_DIR, "dist", "site", "index.html"),
  path.join(ROOT_DIR, "dist", "studio", "renderer", "index.html"),
  path.join(ROOT_DIR, "dist", "studio", "electron", "main.js"),
  path.join(ROOT_DIR, "dist", "studio", "electron", "preload.cjs")
]) {
  await access(buildOutput);
}

await access(THUMBNAILS_DIR);

console.log("Site bundle, studio bundle, deployment notes, and thumbnail cache are present.");
