import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain, shell } from "electron";

import { getPublicSiteUrl, getSiteOverview, hasDeployKey, isConvexConfigured, isConvexReachable } from "../lib/convex";
import { loadWorkspaceEnv } from "../lib/env";
import { isOpencodeConfigured, isOpencodeHealthy, shutdownOpencodeServer } from "../lib/opencode";
import { getStudioPaths } from "../lib/paths";
import { publishBookmarkLink, publishPostDraft } from "../lib/publish";
import { getStudioSettings, saveStudioSettings } from "../lib/settings";
import { ensureStudioDirectories } from "../lib/workspace";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rendererUrl = process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;

async function getStatusPayload() {
  const { appPath, thumbnailsDir, userDataDir } = getStudioPaths();
  const opencodeReady = await isOpencodeHealthy();
  const opencodeConfigured = await isOpencodeConfigured();
  const convexConfigured = await isConvexConfigured();
  const deployKeyConfigured = await hasDeployKey();

  let convexReachable = false;
  let postCount = 0;
  let bookmarkCount = 0;
  let overview = null;
  let overviewError = null;

  if (convexConfigured) {
    try {
      await isConvexReachable();
      convexReachable = true;
    } catch {
      convexReachable = false;
    }
  }

  if (convexReachable && deployKeyConfigured) {
    try {
      overview = await getSiteOverview();
      postCount = overview.postCount;
      bookmarkCount = overview.bookmarkCount;
    } catch (error) {
      overview = null;
      overviewError = error instanceof Error ? error.message : "Failed to load site overview.";
    }
  }

  return {
    appPath,
    userDataDir,
    thumbnailsDir,
    publicSiteUrl: (await getPublicSiteUrl()) || null,
    convexConfigured,
    convexReachable,
    deployKeyConfigured,
    opencodeConfigured,
    opencodeReady,
    postCount,
    bookmarkCount,
    overview,
    overviewError
  };
}

async function getBootstrapPayload() {
  return {
    settings: await getStudioSettings(),
    status: await getStatusPayload()
  };
}

function registerIpc() {
  ipcMain.handle("studio:get-bootstrap", async () => getBootstrapPayload());
  ipcMain.handle("studio:get-status", async () => getStatusPayload());
  ipcMain.handle("studio:save-settings", async (_event, payload) => {
    await saveStudioSettings(payload);
    return getBootstrapPayload();
  });
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

  await window.loadFile(getStudioPaths().rendererEntryPath);
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
  await ensureStudioDirectories();
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
