import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain } from "electron";

import { ensureContentFiles, readBookmarks, readPosts } from "../lib/content.js";
import { isGitRepository } from "../lib/git.js";
import { isOpencodeHealthy, shutdownOpencodeServer } from "../lib/opencode.js";
import { ROOT_DIR, WRITERSIDE_DIR } from "../lib/paths.js";
import { publishBookmarkLink, publishPostDraft } from "../lib/publish.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

async function getStatusPayload() {
  const [posts, bookmarks, gitReady, opencodeReady] = await Promise.all([
    readPosts(),
    readBookmarks(),
    isGitRepository(),
    isOpencodeHealthy()
  ]);

  return {
    rootDir: ROOT_DIR,
    writersideDir: WRITERSIDE_DIR,
    gitReady,
    opencodeReady,
    postCount: posts.length,
    bookmarkCount: bookmarks.length
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 940,
    minWidth: 1100,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: "#0f1717",
    title: "Signal & Static Studio",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

function registerIpc() {
  ipcMain.handle("studio:get-status", async () => getStatusPayload());
  ipcMain.handle("studio:publish-post", async (_event, payload) => publishPostDraft(payload));
  ipcMain.handle("studio:publish-bookmark", async (_event, payload) => publishBookmarkLink(payload));
}

app.whenReady().then(async () => {
  await ensureContentFiles();
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  shutdownOpencodeServer();
});
