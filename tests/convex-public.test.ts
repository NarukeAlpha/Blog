import { expect, test, vi } from "vitest";

const query = vi.fn((definition: unknown) => definition);
const serializePublicBookmark = vi.fn();

vi.mock("../convex/_generated/server", () => ({
  query
}));

vi.mock("../convex/publicBookmarks", () => ({
  serializePublicBookmark
}));

test("public Convex queries expose health, posts, and bookmarks", async () => {
  vi.resetModules();
  query.mockClear();
  serializePublicBookmark.mockReset();
  serializePublicBookmark.mockImplementation(async (bookmark) => ({
    ...bookmark,
    thumbnailUrl: "https://cdn.example.com/bookmark.png"
  }));

  const publicModule = await import("../convex/public");
  const health = publicModule.health as unknown as { handler: (ctx: unknown) => Promise<unknown> };
  const listPosts = publicModule.listPosts as unknown as { handler: (ctx: unknown) => Promise<unknown> };
  const listBookmarks = publicModule.listBookmarks as unknown as { handler: (ctx: unknown) => Promise<unknown> };
  const postCollect = vi.fn(async () => [
    {
      slug: "latest-post",
      title: "Latest Post",
      body: "Body",
      excerpt: "Excerpt",
      publishedAt: 123,
      readingTimeMinutes: 4
    }
  ]);
  const bookmarkCollect = vi.fn(async () => [
    {
      url: "https://example.com/bookmark",
      title: "Bookmark",
      description: "Description",
      source: "Example",
      addedAt: 456,
      thumbnailStorageId: "storage-id"
    }
  ]);
  const ctx = {
    db: {
      query: vi.fn((table: string) => ({
        withIndex: vi.fn(() => ({
          order: vi.fn(() => ({
            collect: table === "posts" ? postCollect : bookmarkCollect
          }))
        }))
      }))
    },
    storage: {
      getUrl: vi.fn(async () => "https://cdn.example.com/bookmark.png")
    }
  };

  await expect(health.handler({})).resolves.toEqual({ ok: true });
  await expect(listPosts.handler(ctx)).resolves.toEqual([
    {
      slug: "latest-post",
      title: "Latest Post",
      body: "Body",
      excerpt: "Excerpt",
      publishedAt: 123,
      readingTimeMinutes: 4
    }
  ]);
  await expect(listBookmarks.handler(ctx)).resolves.toEqual([
    {
      url: "https://example.com/bookmark",
      title: "Bookmark",
      description: "Description",
      source: "Example",
      addedAt: 456,
      thumbnailStorageId: "storage-id",
      thumbnailUrl: "https://cdn.example.com/bookmark.png"
    }
  ]);

  expect(serializePublicBookmark).toHaveBeenCalledWith(
    {
      url: "https://example.com/bookmark",
      title: "Bookmark",
      description: "Description",
      source: "Example",
      addedAt: 456,
      thumbnailStorageId: "storage-id"
    },
    expect.any(Function)
  );
});
