import { expect, test, vi } from "vitest";

const handle = vi.fn();
const openExternal = vi.fn(async () => {});
const appOn = vi.fn();
const setName = vi.fn();
const quit = vi.fn();
const whenReady = vi.fn(() => Promise.resolve());

const browserWindowInstance = {
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  show: vi.fn(),
  once: vi.fn(),
  webContents: {
    setWindowOpenHandler: vi.fn()
  }
};

const BrowserWindow = Object.assign(vi.fn(function BrowserWindowMock() {
  return browserWindowInstance;
}), {
  getAllWindows: vi.fn(() => [])
});

const loadWorkspaceEnv = vi.fn();
const ensureStudioDirectories = vi.fn(async () => {});
const shutdownOpencodeServer = vi.fn();

vi.mock("electron", () => ({
  app: {
    whenReady,
    on: appOn,
    setName,
    quit
  },
  BrowserWindow,
  ipcMain: {
    handle
  },
  shell: {
    openExternal
  }
}));

vi.mock("../apps/studio/lib/convex", () => ({
  getPublicSiteCounts: vi.fn(async () => ({ postCount: 1, bookmarkCount: 1 })),
  getPublicSiteUrl: vi.fn(async () => "https://blog.example.com"),
  getSiteOverview: vi.fn(async () => ({
    postCount: 1,
    bookmarkCount: 1,
    latestPosts: [],
    latestBookmarks: []
  })),
  hasDeployKey: vi.fn(async () => true),
  isConvexConfigured: vi.fn(async () => true),
  isConvexReachable: vi.fn(async () => true)
}));

vi.mock("../apps/studio/lib/env", () => ({
  loadWorkspaceEnv
}));

vi.mock("../apps/studio/lib/opencode", () => ({
  isOpencodeConfigured: vi.fn(async () => true),
  isOpencodeHealthy: vi.fn(async () => true),
  shutdownOpencodeServer
}));

vi.mock("../apps/studio/lib/paths", () => ({
  getStudioPaths: vi.fn(() => ({
    appPath: "/Applications/NarukeAlpha",
    userDataDir: "/Users/test/Library/Application Support/NarukeAlpha",
    thumbnailsDir: "/Users/test/Library/Application Support/NarukeAlpha/cache/thumbnails",
    rendererEntryPath: "/workspace/dist/studio/renderer/index.html"
  }))
}));

vi.mock("../apps/studio/lib/publish", () => ({
  publishBookmarkLink: vi.fn(async () => ({ ok: true })),
  publishPostDraft: vi.fn(async () => ({ ok: true }))
}));

vi.mock("../apps/studio/lib/settings", () => ({
  getStudioSettings: vi.fn(async () => ({
    convexUrl: "https://demo.convex.cloud",
    publicSiteUrl: "https://blog.example.com",
    opencodeCommand: "opencode",
    opencodeBaseUrl: "http://127.0.0.1:4096",
    opencodeProviderId: "openai",
    opencodeModelId: "gpt-4"
  })),
  saveStudioSettings: vi.fn(async () => {})
}));

vi.mock("../apps/studio/lib/workspace", () => ({
  ensureStudioDirectories
}));

test("electron main registers IPC handlers and guards external windows", async () => {
  vi.resetModules();
  handle.mockClear();
  openExternal.mockClear();
  appOn.mockClear();
  setName.mockClear();
  quit.mockClear();
  whenReady.mockClear();
  browserWindowInstance.loadFile.mockClear();
  browserWindowInstance.webContents.setWindowOpenHandler.mockClear();
  BrowserWindow.mockClear();
  loadWorkspaceEnv.mockClear();
  ensureStudioDirectories.mockClear();
  shutdownOpencodeServer.mockClear();

  await import("../apps/studio/electron/main");
  await Promise.resolve();

  expect(whenReady).toHaveBeenCalledTimes(1);
  expect(setName).toHaveBeenCalledWith("NarukeAlpha Post Studio");
  expect(loadWorkspaceEnv).toHaveBeenCalledTimes(1);
  expect(ensureStudioDirectories).toHaveBeenCalledTimes(1);
  expect(BrowserWindow).toHaveBeenCalledTimes(1);
  expect(browserWindowInstance.loadFile).toHaveBeenCalledWith("/workspace/dist/studio/renderer/index.html");

  const registeredChannels = handle.mock.calls.map(([channel]) => channel);
  expect(registeredChannels).toEqual([
    "studio:get-bootstrap",
    "studio:get-status",
    "studio:save-settings",
    "studio:publish-post",
    "studio:publish-bookmark",
    "studio:open-external"
  ]);

  const windowOpenHandler = browserWindowInstance.webContents.setWindowOpenHandler.mock.calls[0]?.[0] as
    | ((details: { url: string }) => { action: string })
    | undefined;

  expect(windowOpenHandler).toBeTypeOf("function");
  expect(windowOpenHandler?.({ url: "https://example.com" })).toEqual({ action: "deny" });
  expect(openExternal).toHaveBeenCalledWith("https://example.com");

  const appHandlers = new Map(appOn.mock.calls.map(([event, callback]) => [event, callback]));
  (appHandlers.get("window-all-closed") as (() => void) | undefined)?.();
  expect(quit).not.toHaveBeenCalled();

  (appHandlers.get("will-quit") as (() => void) | undefined)?.();
  expect(shutdownOpencodeServer).toHaveBeenCalledTimes(1);
});
