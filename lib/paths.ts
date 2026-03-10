import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function looksLikeWorkspace(directory: string) {
  return existsSync(path.join(directory, "package.json")) && existsSync(path.join(directory, "src")) && existsSync(path.join(directory, "electron"));
}

function resolveWorkspaceRoot() {
  const envRoot = process.env.STUDIO_WORKSPACE_DIR;

  if (envRoot && looksLikeWorkspace(path.resolve(envRoot))) {
    return path.resolve(envRoot);
  }

  let current = process.cwd();

  while (true) {
    if (looksLikeWorkspace(current)) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  current = __dirname;

  while (true) {
    if (looksLikeWorkspace(current)) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  return path.resolve(__dirname, "..");
}

export const ROOT_DIR = resolveWorkspaceRoot();
export const PUBLIC_DIR = path.join(ROOT_DIR, "public");
export const THUMBNAILS_DIR = path.join(PUBLIC_DIR, "thumbnails");
export const BOOKMARK_THUMBNAILS_DIR = path.join(THUMBNAILS_DIR, "bookmarks");
export const DEPLOYMENT_PLAN_FILE = path.join(ROOT_DIR, "docs", "serve-on-windows.md");

export const OPENCODE_PORT = 4096;
export const OPENCODE_BASE_URL = `http://127.0.0.1:${OPENCODE_PORT}`;
