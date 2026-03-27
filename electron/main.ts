import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain, shell } from "electron";

import { getPublicSiteUrl, getSiteOverview, hasWriteKey, isConvexConfigured } from "../lib/convex";
import { loadWorkspaceEnv } from "../lib/env";
import { isOpencodeHealthy, shutdownOpencodeServer } from "../lib/opencode";
import { ROOT_DIR, THUMBNAILS_DIR } from "../lib/paths";
import { publishBookmarkLink, publishPostDraft } from "../lib/publish";
import { ensureWorkspaceDirectories } from "../lib/workspace";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rendererUrl = process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;

async function getStatusPayload() {
  const opencodeReady = await isOpencodeHealthy();
  const convexConfigured = isConvexConfigured();

  let convexReachable = false;
  let postCount = 0;
  let bookmarkCount = 0;

  if (convexConfigured) {
    try {
      const overview = await getSiteOverview();
      convexReachable = true;
      postCount = overview.postCount;
      bookmarkCount = overview.bookmarkCount;
    } catch {
      convexReachable = false;
    }
  }

  return {
    rootDir: ROOT_DIR,
    thumbnailsDir: THUMBNAILS_DIR,
    publicSiteUrl: getPublicSiteUrl() || null,
    convexConfigured,
    convexReachable,
    writeKeyConfigured: hasWriteKey(),
    opencodeReady,
    postCount,
    bookmarkCount
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
    minWidth: 480,
    minHeight: 300,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 18 },
    vibrancy: "under-window",
    visualEffectState: "active",
    transparent: true,
    backgroundColor: "#00000000",
    title: "Writer Studio",
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
  app.setName("NarukeAlpha Post Studio");
  loadWorkspaceEnv();
  await ensureWorkspaceDirectories();
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
