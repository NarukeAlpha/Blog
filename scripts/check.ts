import { access } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const DEPLOYMENT_PLAN_FILE = path.join(ROOT_DIR, "docs", "deploy-site-on-cloudflare.md");

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

console.log("Site bundle, studio bundle, and deployment notes are present.");
