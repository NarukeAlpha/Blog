import { expect, test, vi } from "vitest";

const route = vi.fn();
const requireStudioWriteKey = vi.fn((writeKey: string) => {
  if (writeKey !== "secret") {
    throw new Error("Invalid studio write key.");
  }
});

vi.mock("convex/server", () => ({
  httpRouter: () => ({ route })
}));

vi.mock("../convex/_generated/api", () => ({
  internal: {
    site: { overview: "site.overview" },
    posts: { publish: "posts.publish" },
    aiResearch: { publish: "aiResearch.publish" },
    bookmarkInternals: { listForStudio: "bookmarkInternals.listForStudio" },
    bookmarks: {
      publish: "bookmarks.publish",
      updateForStudio: "bookmarks.updateForStudio"
    }
  }
}));

vi.mock("../convex/_generated/server", () => ({
  httpAction: (handler: unknown) => handler
}));

vi.mock("../convex/studioAuth", () => ({
  requireStudioWriteKey
}));

test("studio HTTP routes register and enforce the write key", async () => {
  vi.resetModules();
  route.mockClear();
  requireStudioWriteKey.mockClear();

  await import("../convex/http");

  expect(route).toHaveBeenCalledTimes(7);
  const routes = route.mock.calls.map(([entry]) => entry as {
    path: string;
    method: string;
    handler: (ctx: Record<string, unknown>, request: Request) => Promise<Response>;
  });
  const overviewRoute = routes.find((entry) => entry.path === "/studio/overview");
  const postRoute = routes.find((entry) => entry.path === "/studio/posts");
  const aiResearchRoute = routes.find((entry) => entry.path === "/studio/ai-research");
  const bookmarkListRoute = routes.find((entry) => entry.path === "/studio/bookmarks/list");
  const bookmarkUpdateRoute = routes.find((entry) => entry.path === "/studio/bookmarks/update");
  const xSyncRoute = routes.find((entry) => entry.path === "/studio/bookmarks/x-sync");

  expect(overviewRoute?.method).toBe("POST");
  expect(postRoute?.method).toBe("POST");
  expect(aiResearchRoute?.method).toBe("POST");
  expect(bookmarkListRoute?.method).toBe("POST");
  expect(bookmarkUpdateRoute?.method).toBe("POST");
  expect(xSyncRoute?.method).toBe("POST");

  const overviewResponse = await overviewRoute?.handler(
    {
      runQuery: vi.fn(async () => ({ postCount: 2, bookmarkCount: 1 }))
    },
    new Request("https://example.com/studio/overview", {
      method: "POST",
      headers: {
        "x-studio-write-key": "secret"
      },
      body: JSON.stringify({})
    })
  );

  expect(overviewResponse?.status).toBe(200);
  await expect(overviewResponse?.json()).resolves.toEqual({ postCount: 2, bookmarkCount: 1 });

  const bookmarkListResponse = await bookmarkListRoute?.handler(
    {
      runQuery: vi.fn(async () => [{ id: "bookmark-1" }])
    },
    new Request("https://example.com/studio/bookmarks/list", {
      method: "POST",
      headers: {
        "x-studio-write-key": "secret"
      },
      body: JSON.stringify({})
    })
  );

  expect(bookmarkListResponse?.status).toBe(200);
  await expect(bookmarkListResponse?.json()).resolves.toEqual([{ id: "bookmark-1" }]);

  const deniedResponse = await postRoute?.handler(
    {
      runMutation: vi.fn()
    },
    new Request("https://example.com/studio/posts", {
      method: "POST",
      headers: {
        "x-studio-write-key": "wrong"
      },
      body: JSON.stringify({ title: "Hello", body: "Body" })
    })
  );

  expect(deniedResponse?.status).toBe(401);
  await expect(deniedResponse?.json()).resolves.toEqual({ error: "Invalid studio write key." });
});

test("studio AI research route parses request bodies and calls the publish mutation", async () => {
  vi.resetModules();
  route.mockClear();
  requireStudioWriteKey.mockClear();

  await import("../convex/http");

  const routes = route.mock.calls.map(([entry]) => entry as {
    path: string;
    handler: (ctx: Record<string, unknown>, request: Request) => Promise<Response>;
  });
  const aiResearchRoute = routes.find((entry) => entry.path === "/studio/ai-research");
  const runMutation = vi.fn(async () => ({ slug: "ship-log", title: "Ship Log" }));

  const response = await aiResearchRoute?.handler(
    {
      runMutation
    },
    new Request("https://example.com/studio/ai-research", {
      method: "POST",
      headers: {
        "x-studio-write-key": "secret"
      },
      body: JSON.stringify({
        title: "Ship Log",
        body: "Body",
        model: "gpt-5.4",
        prompt: "Write the memo"
      })
    })
  );

  expect(runMutation).toHaveBeenCalledWith("aiResearch.publish", {
    title: "Ship Log",
    body: "Body",
    model: "gpt-5.4",
    prompt: "Write the memo"
  });
  expect(response?.status).toBe(200);
  await expect(response?.json()).resolves.toEqual({ slug: "ship-log", title: "Ship Log" });
});

test("studio bookmark update route parses request bodies and calls the update action", async () => {
  vi.resetModules();
  route.mockClear();
  requireStudioWriteKey.mockClear();

  await import("../convex/http");

  const routes = route.mock.calls.map(([entry]) => entry as {
    path: string;
    handler: (ctx: Record<string, unknown>, request: Request) => Promise<Response>;
  });
  const bookmarkUpdateRoute = routes.find((entry) => entry.path === "/studio/bookmarks/update");
  const runAction = vi.fn(async () => ({ id: "bookmark-1", title: "Updated Bookmark" }));

  const response = await bookmarkUpdateRoute?.handler(
    {
      runAction
    },
    new Request("https://example.com/studio/bookmarks/update", {
      method: "POST",
      headers: {
        "x-studio-write-key": "secret"
      },
      body: JSON.stringify({
        id: "bookmark-1",
        url: "https://example.com/bookmark",
        title: "Updated Bookmark",
        description: "Description",
        source: "Example",
        note: "Note",
        addedAt: 123,
        thumbnailSourceUrl: ""
      })
    })
  );

  expect(runAction).toHaveBeenCalledWith("bookmarks.updateForStudio", {
    id: "bookmark-1",
    url: "https://example.com/bookmark",
    title: "Updated Bookmark",
    description: "Description",
    source: "Example",
    note: "Note",
    addedAt: 123,
    thumbnailSourceUrl: ""
  });
  expect(response?.status).toBe(200);
  await expect(response?.json()).resolves.toEqual({ id: "bookmark-1", title: "Updated Bookmark" });
});

test("studio HTTP routes reject invalid JSON request bodies", async () => {
  vi.resetModules();
  route.mockClear();
  requireStudioWriteKey.mockClear();

  await import("../convex/http");

  const routes = route.mock.calls.map(([entry]) => entry as {
    path: string;
    handler: (ctx: Record<string, unknown>, request: Request) => Promise<Response>;
  });
  const postRoute = routes.find((entry) => entry.path === "/studio/posts");
  const runMutation = vi.fn(async () => ({ ok: true }));

  const response = await postRoute?.handler(
    {
      runMutation
    },
    new Request("https://example.com/studio/posts", {
      method: "POST",
      headers: {
        "x-studio-write-key": "secret"
      },
      body: "not-json"
    })
  );

  expect(runMutation).not.toHaveBeenCalled();
  expect(response?.status).toBe(400);
  await expect(response?.json()).resolves.toEqual({ error: "Studio request body must be valid JSON." });
});

test("x sync bookmark route saves the shared external link with derived metadata", async () => {
  vi.resetModules();
  route.mockClear();
  requireStudioWriteKey.mockClear();

  await import("../convex/http");

  const routes = route.mock.calls.map(([entry]) => entry as {
    path: string;
    handler: (ctx: Record<string, unknown>, request: Request) => Promise<Response>;
  });
  const xSyncRoute = routes.find((entry) => entry.path === "/studio/bookmarks/x-sync");
  const runAction = vi.fn(async () => ({ ok: true }));

  const response = await xSyncRoute?.handler(
    {
      runAction
    },
    new Request("https://example.com/studio/bookmarks/x-sync", {
      method: "POST",
      headers: {
        "x-studio-write-key": "secret"
      },
      body: JSON.stringify({
        postUrl: "https://x.com/naruke/status/123",
        postText: "This is the article worth saving.",
        authorName: "Naruke",
        authorHandle: "naruke",
        externalUrl: "https://example.com/article"
      })
    })
  );

  expect(runAction).toHaveBeenCalledWith("bookmarks.publish", {
    url: "https://example.com/article",
    note: "Saved from X\nPost: https://x.com/naruke/status/123\nAuthor: Naruke (@naruke)\n\nThis is the article worth saving.",
    title: "This is the article worth saving.",
    description: "This is the article worth saving.",
    source: "example.com"
  });
  expect(response?.status).toBe(200);
  await expect(response?.json()).resolves.toEqual({ ok: true });
});

test("x sync bookmark route falls back to the post URL when no external link exists", async () => {
  vi.resetModules();
  route.mockClear();
  requireStudioWriteKey.mockClear();

  await import("../convex/http");

  const routes = route.mock.calls.map(([entry]) => entry as {
    path: string;
    handler: (ctx: Record<string, unknown>, request: Request) => Promise<Response>;
  });
  const xSyncRoute = routes.find((entry) => entry.path === "/studio/bookmarks/x-sync");
  const runAction = vi.fn(async () => ({ ok: true }));

  const response = await xSyncRoute?.handler(
    {
      runAction
    },
    new Request("https://example.com/studio/bookmarks/x-sync", {
      method: "POST",
      headers: {
        "x-studio-write-key": "secret"
      },
      body: JSON.stringify({
        postUrl: "https://x.com/naruke/status/123",
        postText: "",
        authorHandle: "naruke"
      })
    })
  );

  expect(runAction).toHaveBeenCalledWith("bookmarks.publish", {
    url: "https://x.com/naruke/status/123",
    note: "Saved from X\nPost: https://x.com/naruke/status/123\nAuthor: @naruke",
    title: "Post by @naruke",
    description: "Saved X post by @naruke.",
    source: "x.com"
  });
  expect(response?.status).toBe(200);
  await expect(response?.json()).resolves.toEqual({ ok: true });
});

test("x sync bookmark route resolves t.co links before saving", async () => {
  vi.resetModules();
  route.mockClear();
  requireStudioWriteKey.mockClear();

  const fetchMock = vi.fn(async () => ({
    url: "https://example.com/resolved-article"
  }));
  vi.stubGlobal("fetch", fetchMock);

  await import("../convex/http");

  const routes = route.mock.calls.map(([entry]) => entry as {
    path: string;
    handler: (ctx: Record<string, unknown>, request: Request) => Promise<Response>;
  });
  const xSyncRoute = routes.find((entry) => entry.path === "/studio/bookmarks/x-sync");
  const runAction = vi.fn(async () => ({ ok: true }));

  await xSyncRoute?.handler(
    {
      runAction
    },
    new Request("https://example.com/studio/bookmarks/x-sync", {
      method: "POST",
      headers: {
        "x-studio-write-key": "secret"
      },
      body: JSON.stringify({
        postUrl: "https://x.com/naruke/status/123",
        externalUrl: "https://t.co/abc123"
      })
    })
  );

  expect(fetchMock).toHaveBeenCalledWith("https://t.co/abc123", { redirect: "follow" });
  expect(runAction).toHaveBeenCalledWith("bookmarks.publish", expect.objectContaining({
    url: "https://example.com/resolved-article",
    source: "example.com"
  }));
});
