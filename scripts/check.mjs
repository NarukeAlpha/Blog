import path from "node:path";
import { access } from "node:fs/promises";

import { runCommand } from "../lib/exec.js";
import {
  BOOKMARKS_TOPIC_FILE,
  HOME_TOPIC_FILE,
  INSTANCE_TREE_FILE,
  JOURNAL_TOPIC_FILE,
  ROOT_DIR,
  WORKFLOW_TOPIC_FILE
} from "../lib/paths.js";

const filesToParse = [
  path.join(ROOT_DIR, "electron", "main.js"),
  path.join(ROOT_DIR, "electron", "preload.js"),
  path.join(ROOT_DIR, "electron", "renderer.js"),
  path.join(ROOT_DIR, "lib", "publish.js"),
  path.join(ROOT_DIR, "lib", "writerside.js"),
  path.join(ROOT_DIR, "lib", "opencode.js")
];

for (const file of filesToParse) {
  await runCommand(process.execPath, ["--check", file]);
}

for (const requiredFile of [HOME_TOPIC_FILE, JOURNAL_TOPIC_FILE, BOOKMARKS_TOPIC_FILE, WORKFLOW_TOPIC_FILE, INSTANCE_TREE_FILE]) {
  await access(requiredFile);
}

console.log("Syntax and generated Writerside file checks passed.");
