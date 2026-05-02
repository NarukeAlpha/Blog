import { beforeEach, expect, test, vi } from "vitest";

const internalMutation = vi.fn((definition: unknown) => definition);
const internalQuery = vi.fn((definition: unknown) => definition);

vi.mock("../convex/_generated/server", () => ({
  internalMutation,
  internalQuery
}));

beforeEach(() => {
  vi.resetModules();
  internalMutation.mockClear();
  internalQuery.mockClear();
});

test("bookmark internals serialize the Studio bookmark shape with raw thumbnail fields", async () => {
  const bookmarkInternals = await import("../convex/bookmarkInternals");
  const listForStudio = bookmarkInternals.listForStudio as unknown as { handler: (ctx: Record<string, unknown>) => Promise<unknown> };
  const collect = vi.fn(async () => [{
    _id: "bookmark-1",
    url: "https://example.com/article",
    title: "Example Article",
    description: "An example bookmark",
    source: "Example",
    note: "Worth saving",
    addedAt: 123,
    thumbnailStorageId: "storage-id"
  }]);
  const ctx = {
    db: {
      query: vi.fn(() => ({
        withIndex: vi.fn(() => ({
          order: vi.fn(() => ({
            collect
          }))
        }))
      }))
    },
    storage: {
      getUrl: vi.fn(async () => "https://cdn.example.com/storage.png")
    }
  };

  await expect(listForStudio.handler(ctx)).resolves.toEqual([{
    id: "bookmark-1",
    url: "https://example.com/article",
    title: "Example Article",
    description: "An example bookmark",
    source: "Example",
    note: "Worth saving",
    addedAt: 123,
    thumbnailSourceUrl: "",
    thumbnailStorageId: "storage-id",
    thumbnailUrl: "https://cdn.example.com/storage.png"
  }]);
});

test("bookmark internals allow updating the same bookmark after URL normalization", async () => {
  const bookmarkInternals = await import("../convex/bookmarkInternals");
  const updateById = bookmarkInternals.updateById as unknown as {
    handler: (ctx: Record<string, unknown>, args: Record<string, unknown>) => Promise<unknown>;
  };
  const patch = vi.fn(async () => {});
  const ctx = {
    db: {
      get: vi.fn(async () => ({
        _id: "bookmark-1"
      })),
      query: vi.fn(() => ({
        withIndex: vi.fn((_indexName: string, indexRange: (queryBuilder: { eq: (field: string, value: string) => unknown }) => unknown) => {
          indexRange({ eq: vi.fn(() => null) });
          return {
            unique: vi.fn(async () => ({
              _id: "bookmark-1",
              url: "https://example.com/path"
            }))
          };
        })
      })),
      patch
    }
  };

  await expect(updateById.handler(ctx, {
    id: "bookmark-1",
    url: "https://EXAMPLE.com/path",
    title: "Example",
    description: "Description",
    source: "Example",
    note: "Note",
    addedAt: 123,
    thumbnailSourceUrl: "https://example.com/image.png",
    thumbnailStorageId: "storage-id"
  })).resolves.toBe("bookmark-1");

  expect(patch).toHaveBeenCalledWith("bookmark-1", expect.objectContaining({
    url: "https://example.com/path"
  }));
});

test("bookmark internals reject duplicate normalized URLs owned by another bookmark", async () => {
  const bookmarkInternals = await import("../convex/bookmarkInternals");
  const updateById = bookmarkInternals.updateById as unknown as {
    handler: (ctx: Record<string, unknown>, args: Record<string, unknown>) => Promise<unknown>;
  };
  const patch = vi.fn(async () => {});
  const ctx = {
    db: {
      get: vi.fn(async () => ({
        _id: "bookmark-1"
      })),
      query: vi.fn(() => ({
        withIndex: vi.fn(() => ({
          unique: vi.fn(async () => ({
            _id: "bookmark-2",
            url: "https://example.com/path"
          }))
        }))
      })),
      patch
    }
  };

  await expect(updateById.handler(ctx, {
    id: "bookmark-1",
    url: "https://example.com/path",
    title: "Example",
    description: "Description",
    source: "Example",
    note: "Note",
    addedAt: 123
  })).rejects.toThrow("A bookmark with this URL already exists.");

  expect(patch).not.toHaveBeenCalled();
});
