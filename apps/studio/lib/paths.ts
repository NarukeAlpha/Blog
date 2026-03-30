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
