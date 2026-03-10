import { access } from "node:fs/promises";
import path from "node:path";

import {
  BOOKMARKS_TOPIC_FILE,
  HOME_TOPIC_FILE,
  INSTANCE_TREE_FILE,
  JOURNAL_TOPIC_FILE,
  ROOT_DIR
} from "../lib/paths";

for (const requiredFile of [HOME_TOPIC_FILE, JOURNAL_TOPIC_FILE, BOOKMARKS_TOPIC_FILE, INSTANCE_TREE_FILE]) {
  await access(requiredFile);
}

for (const buildOutput of [
  path.join(ROOT_DIR, "dist", "renderer", "index.html"),
  path.join(ROOT_DIR, "dist", "electron", "main.js"),
  path.join(ROOT_DIR, "dist", "electron", "preload.cjs")
]) {
  await access(buildOutput);
}

console.log("Generated Writerside files and build outputs are present.");
