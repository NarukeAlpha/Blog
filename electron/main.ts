import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain, shell } from "electron";

import { ensureContentFiles, readBookmarks, readPosts } from "../lib/content";
import { isGitRepository } from "../lib/git";
import { isOpencodeHealthy, shutdownOpencodeServer } from "../lib/opencode";
import { ROOT_DIR, WRITERSIDE_DIR } from "../lib/paths";
import { publishBookmarkLink, publishPostDraft } from "../lib/publish";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rendererUrl = process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;

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

function registerIpc() {
  ipcMain.handle("studio:get-status", async () => getStatusPayload());
  ipcMain.handle("studio:publish-post", async (_event, payload) => publishPostDraft(payload));
  ipcMain.handle("studio:publish-bookmark", async (_event, payload) => publishBookmarkLink(payload));
  ipcMain.handle("studio:open-external", async (_event, url: string) => {
    await shell.openExternal(url);
  });
}

async function loadRenderer(window: BrowserWindow) {
  if (rendererUrl) {
    await window.loadURL(rendererUrl);
    return;
  }

  await window.loadFile(path.join(ROOT_DIR, "dist", "renderer", "index.html"));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f6f1e8",
    title: "NarukeAlpha Studio",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  void loadRenderer(mainWindow);
}

app.whenReady().then(async () => {
  app.setName("NarukeAlpha Studio");
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
