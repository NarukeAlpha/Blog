import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

export const DEFAULT_OPENCODE_COMMAND = "opencode";
export const DEFAULT_OPENCODE_BASE_URL = "http://127.0.0.1:4096";
export const DEFAULT_OPENCODE_PROVIDER_ID = "openai";
export const DEFAULT_OPENCODE_MODEL_ID = "gpt-4";

function getElectronApp() {
  try {
    const electronModule = require("electron") as {
      app?: {
        getAppPath: () => string;
        getPath: (name: "userData") => string;
      };
    };

    return electronModule.app ?? null;
  } catch {
    return null;
  }
}

export function getStudioPaths() {
  const electronApp = getElectronApp();
  const appPath = electronApp?.getAppPath() || ROOT_DIR;
  const userDataDir = electronApp?.getPath("userData") || path.join(ROOT_DIR, ".studio");
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

function looksLikeWorkspace(directory: string) {
  return (
    existsSync(path.join(directory, "package.json")) &&
    existsSync(path.join(directory, "apps", "site")) &&
    existsSync(path.join(directory, "apps", "studio")) &&
    existsSync(path.join(directory, "convex"))
  );
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
