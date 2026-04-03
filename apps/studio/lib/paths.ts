import path from "node:path";

import { app } from "electron";

export const DEFAULT_OPENCODE_COMMAND = "opencode";
export const DEFAULT_OPENCODE_BASE_URL = "http://127.0.0.1:4096";

export function getStudioPaths() {
  const appPath = app.getAppPath();
  const userDataDir = app.getPath("userData");
  const cacheDir = path.join(userDataDir, "cache");
  const thumbnailsDir = path.join(cacheDir, "thumbnails");
  const bookmarkThumbnailsDir = path.join(thumbnailsDir, "bookmarks");

  return {
    appPath,
    userDataDir,
    cacheDir,
    thumbnailsDir,
    bookmarkThumbnailsDir,
    settingsFile: path.join(userDataDir, "settings.json"),
    rendererEntryPath: path.join(appPath, "dist", "studio", "renderer", "index.html")
  };
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

  return path.resolve(__dirname, "../../..");
}

export const ROOT_DIR = resolveWorkspaceRoot();
export const STUDIO_DIR = path.join(ROOT_DIR, "apps", "studio");
export const STUDIO_CACHE_DIR = path.join(STUDIO_DIR, "cache");
export const THUMBNAILS_DIR = path.join(STUDIO_CACHE_DIR, "thumbnails");
export const BOOKMARK_THUMBNAILS_DIR = path.join(THUMBNAILS_DIR, "bookmarks");
export const DEPLOYMENT_PLAN_FILE = path.join(ROOT_DIR, "docs", "deploy-site-on-cloudflare.md");

export const OPENCODE_PORT = 4096;
export const OPENCODE_BASE_URL = `http://127.0.0.1:${OPENCODE_PORT}`;
