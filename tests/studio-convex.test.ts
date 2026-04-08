import { beforeEach, expect, test, vi } from "vitest";

const runtimeSettings = {
  convexUrl: "https://demo.convex.cloud",
  publicSiteUrl: "https://blog.example.com",
  opencodeCommand: "opencode",
  opencodeBaseUrl: "http://127.0.0.1:4096",
  opencodeProviderId: "openai",
  opencodeModelId: "gpt-4",
  deployKey: "studio-secret"
};

const clientInstances: Array<{ url: string; query: ReturnType<typeof vi.fn> }> = [];
const ConvexHttpClient = vi.fn((url: string) => {
  const instance = {
    url,
    query: vi.fn()
  };

  clientInstances.push(instance);
  return instance;
});

vi.mock("convex/browser", () => ({
  ConvexHttpClient
}));

vi.mock("../apps/studio/lib/settings", () => ({
  getStudioRuntimeSettings: vi.fn(async () => runtimeSettings)
}));

beforeEach(() => {
  vi.resetModules();
  clientInstances.length = 0;
  ConvexHttpClient.mockClear();
  runtimeSettings.convexUrl = "https://demo.convex.cloud";
  runtimeSettings.publicSiteUrl = "https://blog.example.com";
  runtimeSettings.deployKey = "studio-secret";
  vi.stubEnv("CONVEX_SITE_URL", "");
  vi.stubEnv("VITE_CONVEX_SITE_URL", "");
});

test("studio Convex helpers validate configuration and deploy keys", async () => {
  runtimeSettings.convexUrl = "";
  runtimeSettings.deployKey = "";

  const convex = await import("../apps/studio/lib/convex");

  await expect(convex.getDeployKey()).rejects.toThrow("Save the studio write key in Settings before publishing.");
  await expect(convex.getConvexClient()).rejects.toThrow("Save the Convex deployment URL in Settings before publishing.");
  await expect(convex.isConvexConfigured()).resolves.toBe(false);
});

test("studio Convex helpers reuse the client and query public counts", async () => {
  const convex = await import("../apps/studio/lib/convex");
  const firstClient = await convex.getConvexClient();
  const secondClient = await convex.getConvexClient();
  const client = clientInstances[0];

  client.query
    .mockResolvedValueOnce([{ slug: "latest-post" }])
    .mockResolvedValueOnce([{ url: "https://example.com/bookmark" }, { url: "https://example.com/another" }]);

  await expect(convex.getPublicSiteCounts()).resolves.toEqual({
    postCount: 1,
    bookmarkCount: 2
  });

  expect(firstClient).toBe(secondClient);
  expect(ConvexHttpClient).toHaveBeenCalledTimes(1);
});

test("studio Convex helpers derive the hosted site URL and send the write key", async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ postCount: 2, bookmarkCount: 1, latestPosts: [], latestBookmarks: [] })
  }));
  vi.stubGlobal("fetch", fetchMock);

  const convex = await import("../apps/studio/lib/convex");

  await expect(convex.getSiteOverview()).resolves.toEqual({
    postCount: 2,
    bookmarkCount: 1,
    latestPosts: [],
    latestBookmarks: []
  });

  expect(fetchMock).toHaveBeenCalledWith("https://demo.convex.site/studio/overview", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-studio-write-key": "studio-secret"
    },
    body: JSON.stringify({})
  });
});

test("studio Convex helpers surface API error payloads", async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: "Invalid studio write key." })
  }));
  vi.stubGlobal("fetch", fetchMock);

  const convex = await import("../apps/studio/lib/convex");

  await expect(convex.publishStudioPost({ title: "Hello", body: "Body" })).rejects.toThrow("Invalid studio write key.");
});
