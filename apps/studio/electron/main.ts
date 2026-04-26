import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain, shell } from "electron";
import type { BookmarkPublishPayload, PostPublishPayload, SaveStudioSettingsPayload, StudioBootstrap, StudioStatus } from "@shared/types";
import { IPC_CHANNELS } from "@shared/types";

import { getActiveStudioConnection, getPublicSiteCounts, getSiteOverview, hasDeployKey, isConvexConfigured, isConvexReachable } from "../lib/convex";
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

async function getStatusPayload(): Promise<StudioStatus> {
  const { appPath, thumbnailsDir, userDataDir } = getStudioPaths();

  const [activeConnection, opencodeReady, opencodeConfigured, convexConfigured, deployKeyConfigured] = await Promise.all([
    getActiveStudioConnection(),
    isOpencodeHealthy(),
    isOpencodeConfigured(),
    isConvexConfigured(),
    hasDeployKey()
  ]);

  let convexReachable = false;
  let postCount: number | null = null;
  let bookmarkCount: number | null = null;
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

  if (convexReachable) {
    if (deployKeyConfigured) {
      try {
        overview = await getSiteOverview();
        postCount = overview.postCount;
        bookmarkCount = overview.bookmarkCount;
      } catch (error) {
        overview = null;
        overviewError = error instanceof Error ? error.message : "Failed to load site overview.";
      }
    }

    if (overview === null) {
      try {
        const counts = await getPublicSiteCounts();
        if (postCount === null) postCount = counts.postCount;
        if (bookmarkCount === null) bookmarkCount = counts.bookmarkCount;
      } catch {
        postCount = null;
        bookmarkCount = null;
      }
    }
  }

  return {
    activeEnvironment: activeConnection.environment,
    appPath,
    userDataDir,
    thumbnailsDir,
    convexUrl: activeConnection.convexUrl || null,
    convexSiteUrl: activeConnection.convexSiteUrl || null,
    publicSiteUrl: activeConnection.publicSiteUrl || null,
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

async function getBootstrapPayload(): Promise<StudioBootstrap> {
  return {
    settings: await getStudioSettings(),
    status: await getStatusPayload()
  };
}

function registerIpc() {
  ipcMain.handle(IPC_CHANNELS.GET_BOOTSTRAP, async () => getBootstrapPayload());
  ipcMain.handle(IPC_CHANNELS.GET_STATUS, async () => getStatusPayload());
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, payload: SaveStudioSettingsPayload) => {
    await saveStudioSettings(payload);
    return getBootstrapPayload();
  });
  ipcMain.handle(IPC_CHANNELS.PUBLISH_POST, async (_event, payload: PostPublishPayload) => publishPostDraft(payload));
  ipcMain.handle(IPC_CHANNELS.PUBLISH_BOOKMARK, async (_event, payload: BookmarkPublishPayload) => publishBookmarkLink(payload));
  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: string) => {
    await shell.openExternal(url);
  });
  ipcMain.handle(IPC_CHANNELS.WINDOW_VISIBILITY, async () => {
    return mainWindow?.isFocused() ?? false;
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
