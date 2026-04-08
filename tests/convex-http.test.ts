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
    bookmarks: { publish: "bookmarks.publish" }
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

  expect(route).toHaveBeenCalledTimes(3);
  const routes = route.mock.calls.map(([entry]) => entry as {
    path: string;
    method: string;
    handler: (ctx: Record<string, unknown>, request: Request) => Promise<Response>;
  });
  const overviewRoute = routes.find((entry) => entry.path === "/studio/overview");
  const postRoute = routes.find((entry) => entry.path === "/studio/posts");

  expect(overviewRoute?.method).toBe("POST");
  expect(postRoute?.method).toBe("POST");

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

test("studio HTTP routes coerce missing request fields into empty strings", async () => {
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

  expect(runMutation).toHaveBeenCalledWith("posts.publish", {
    title: "",
    body: ""
  });
  expect(response?.status).toBe(200);
});
