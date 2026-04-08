import { beforeEach, expect, test, vi } from "vitest";

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld
  },
  ipcRenderer: {
    invoke
  }
}));

beforeEach(() => {
  exposeInMainWorld.mockReset();
  invoke.mockReset();
});

test("preload exposes the studio bridge and routes IPC calls", async () => {
  vi.resetModules();

  await import("../apps/studio/electron/preload");

  expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
  const [name, studioBridge] = exposeInMainWorld.mock.calls[0] as [string, Record<string, (...args: unknown[]) => unknown>];

  expect(name).toBe("studio");
  expect(studioBridge.platform).toBe(process.platform);

  studioBridge.getBootstrap();
  studioBridge.getStatus();
  studioBridge.saveSettings({
    selectedEnvironment: "prod",
    environments: {
      prod: {
        convexUrl: "https://demo.convex.cloud"
      }
    }
  });
  studioBridge.publishPost({ title: "Hello", body: "Body" });
  studioBridge.publishBookmark({ url: "https://example.com", note: "Note" });
  studioBridge.openExternal("https://example.com");

  expect(invoke).toHaveBeenNthCalledWith(1, "studio:get-bootstrap");
  expect(invoke).toHaveBeenNthCalledWith(2, "studio:get-status");
  expect(invoke).toHaveBeenNthCalledWith(3, "studio:save-settings", {
    selectedEnvironment: "prod",
    environments: {
      prod: {
        convexUrl: "https://demo.convex.cloud"
      }
    }
  });
  expect(invoke).toHaveBeenNthCalledWith(4, "studio:publish-post", { title: "Hello", body: "Body" });
  expect(invoke).toHaveBeenNthCalledWith(5, "studio:publish-bookmark", { url: "https://example.com", note: "Note" });
  expect(invoke).toHaveBeenNthCalledWith(6, "studio:open-external", "https://example.com");
});
