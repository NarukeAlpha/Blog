import { beforeEach, expect, test, vi } from "vitest";

const runtimeSettings = {
  environment: "prod",
  convexUrl: "https://demo.convex.cloud",
  convexSiteUrl: "",
  publicSiteUrl: "https://blog.example.com",
  deployKey: "studio-secret"
};

const clientInstances: Array<{ url: string; query: ReturnType<typeof vi.fn> }> = [];
const ConvexHttpClient = vi.fn(function ConvexHttpClientMock(this: { url: string; query: ReturnType<typeof vi.fn> }, url: string) {
  this.url = url;
  this.query = vi.fn();
  clientInstances.push(this);
});

vi.mock("convex/browser", () => ({
  ConvexHttpClient
}));

vi.mock("../apps/studio/lib/settings", () => ({
  getActiveStudioRuntimeSettings: vi.fn(async () => runtimeSettings)
}));

beforeEach(() => {
  vi.resetModules();
  clientInstances.length = 0;
  ConvexHttpClient.mockClear();
  runtimeSettings.environment = "prod";
  runtimeSettings.convexUrl = "https://demo.convex.cloud";
  runtimeSettings.convexSiteUrl = "";
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

test("studio Convex helpers list and update bookmarks through protected studio endpoints", async () => {
  const bookmark = {
    id: "bookmark-1",
    url: "https://example.com/bookmark",
    title: "Bookmark",
    description: "Description",
    source: "Example",
    note: "Note",
    addedAt: 123,
    thumbnailSourceUrl: "https://example.com/image.png",
    thumbnailStorageId: "storage-id",
    thumbnailUrl: "https://cdn.example.com/image.png"
  };
  const updatedBookmark = {
    ...bookmark,
    title: "Updated Bookmark",
    addedAt: 456,
    thumbnailSourceUrl: "",
    thumbnailStorageId: null,
    thumbnailUrl: ""
  };
  const fetchMock = vi.fn(async (url: string) => ({
    ok: true,
    json: async () => url.endsWith("/studio/bookmarks/list") ? [bookmark] : updatedBookmark
  }));
  vi.stubGlobal("fetch", fetchMock);

  const convex = await import("../apps/studio/lib/convex");

  await expect(convex.listStudioBookmarks()).resolves.toEqual([bookmark]);
  await expect(convex.updateStudioBookmark({
    id: "bookmark-1",
    url: "https://example.com/bookmark",
    title: "Updated Bookmark",
    description: "Description",
    source: "Example",
    note: "Note",
    addedAt: 456,
    thumbnailSourceUrl: ""
  })).resolves.toEqual(updatedBookmark);

  expect(fetchMock).toHaveBeenNthCalledWith(1, "https://demo.convex.site/studio/bookmarks/list", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-studio-write-key": "studio-secret"
    },
    body: JSON.stringify({})
  });
  expect(fetchMock).toHaveBeenNthCalledWith(2, "https://demo.convex.site/studio/bookmarks/update", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-studio-write-key": "studio-secret"
    },
    body: JSON.stringify({
      id: "bookmark-1",
      url: "https://example.com/bookmark",
      title: "Updated Bookmark",
      description: "Description",
      source: "Example",
      note: "Note",
      addedAt: 456,
      thumbnailSourceUrl: ""
    })
  });
});

test("studio Convex helpers validate studio bookmark responses", async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => [{
      url: "https://example.com/bookmark",
      title: "Bookmark"
    }]
  }));
  vi.stubGlobal("fetch", fetchMock);

  const convex = await import("../apps/studio/lib/convex");

  await expect(convex.listStudioBookmarks()).rejects.toThrow("Studio bookmark list returned an invalid response.");
});

test("studio Convex helpers explain missing Studio HTTP routes on 404", async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    status: 404,
    json: async () => null
  }));
  vi.stubGlobal("fetch", fetchMock);

  const convex = await import("../apps/studio/lib/convex");

  await expect(convex.listStudioBookmarks()).rejects.toThrow(
    "The selected Convex deployment is missing the latest Studio HTTP routes. Push the Convex functions for this environment with `npx convex dev --once` or `convex deploy`."
  );
});
