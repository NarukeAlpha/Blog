import { access } from "node:fs/promises";
import path from "node:path";

import { DEPLOYMENT_PLAN_FILE, ROOT_DIR, THUMBNAILS_DIR } from "../lib/paths";

for (const requiredFile of [DEPLOYMENT_PLAN_FILE]) {
  await access(requiredFile);
}

for (const buildOutput of [
  path.join(ROOT_DIR, "dist", "renderer", "index.html"),
  path.join(ROOT_DIR, "dist", "electron", "main.js"),
  path.join(ROOT_DIR, "dist", "electron", "preload.cjs")
]) {
  await access(buildOutput);
}

await access(THUMBNAILS_DIR);

console.log("Renderer bundle, Electron bundle, deployment notes, and thumbnail cache are present.");
