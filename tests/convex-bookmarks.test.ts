import { beforeEach, expect, test, vi } from "vitest";

const internalAction = vi.fn((definition: unknown) => definition);

vi.mock("../convex/_generated/server", () => ({
  internalAction
}));

vi.mock("../convex/api", () => ({
  api: {
    bookmarkInternals: {
      byId: "bookmarkInternals.byId",
      byUrl: "bookmarkInternals.byUrl",
      persist: "bookmarkInternals.persist",
      updateById: "bookmarkInternals.updateById"
    }
  }
}));

beforeEach(() => {
  vi.resetModules();
  internalAction.mockClear();
});

function createExistingBookmark() {
  return {
    id: "bookmark-1",
    url: "https://example.com/bookmark",
    title: "Existing Bookmark",
    description: "Existing description",
    source: "Example",
    note: "Existing note",
    addedAt: 123,
    thumbnailSourceUrl: "https://example.com/image.png",
    thumbnailStorageId: "storage-id",
    thumbnailUrl: "https://cdn.example.com/image.png"
  };
}

test("studio bookmark updates preserve stored thumbnails when the source URL is unchanged", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  const bookmarksModule = await import("../convex/bookmarks");
  const updateForStudio = bookmarksModule.updateForStudio as unknown as {
    handler: (ctx: Record<string, unknown>, args: Record<string, unknown>) => Promise<unknown>;
  };
  const existingBookmark = createExistingBookmark();
  const runQuery = vi.fn(async () => existingBookmark);
  const runMutation = vi.fn(async () => "bookmark-1");
  const storage = {
    store: vi.fn(async () => "new-storage"),
    delete: vi.fn(async () => {})
  };

  await expect(updateForStudio.handler({
    runQuery,
    runMutation,
    storage
  }, {
    id: "bookmark-1",
    url: "https://example.com/bookmark",
    title: "Existing Bookmark",
    description: "Existing description",
    source: "Example",
    note: "Existing note",
    addedAt: 123,
    thumbnailSourceUrl: "https://example.com/image.png"
  })).resolves.toEqual(existingBookmark);

  expect(fetchMock).not.toHaveBeenCalled();
  expect(storage.store).not.toHaveBeenCalled();
  expect(storage.delete).not.toHaveBeenCalled();
  expect(runMutation).toHaveBeenCalledWith("bookmarkInternals.updateById", {
    id: "bookmark-1",
    url: "https://example.com/bookmark",
    title: "Existing Bookmark",
    description: "Existing description",
    source: "Example",
    note: "Existing note",
    addedAt: 123,
    thumbnailSourceUrl: "https://example.com/image.png",
    thumbnailStorageId: "storage-id"
  });
});

test("studio bookmark updates replace stored thumbnails when the source URL changes", async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    headers: {
      get: vi.fn(() => "image/png")
    },
    blob: vi.fn(async () => new Blob(["image"], { type: "image/png" }))
  }));
  vi.stubGlobal("fetch", fetchMock);

  const bookmarksModule = await import("../convex/bookmarks");
  const updateForStudio = bookmarksModule.updateForStudio as unknown as {
    handler: (ctx: Record<string, unknown>, args: Record<string, unknown>) => Promise<unknown>;
  };
  const existingBookmark = createExistingBookmark();
  const updatedBookmark = {
    ...existingBookmark,
    thumbnailSourceUrl: "https://example.com/new-image.png",
    thumbnailStorageId: "new-storage",
    thumbnailUrl: "https://cdn.example.com/new-image.png"
  };
  let queryCount = 0;
  const runQuery = vi.fn(async () => {
    queryCount += 1;
    return queryCount === 1 ? existingBookmark : updatedBookmark;
  });
  const runMutation = vi.fn(async () => "bookmark-1");
  const storage = {
    store: vi.fn(async () => "new-storage"),
    delete: vi.fn(async () => {})
  };

  await expect(updateForStudio.handler({
    runQuery,
    runMutation,
    storage
  }, {
    id: "bookmark-1",
    url: "https://example.com/bookmark",
    title: "Existing Bookmark",
    description: "Existing description",
    source: "Example",
    note: "Existing note",
    addedAt: 123,
    thumbnailSourceUrl: "https://example.com/new-image.png"
  })).resolves.toEqual(updatedBookmark);

  expect(fetchMock).toHaveBeenCalledWith("https://example.com/new-image.png");
  expect(storage.store).toHaveBeenCalledTimes(1);
  expect(storage.delete).toHaveBeenCalledWith("storage-id");
  expect(runMutation).toHaveBeenCalledWith("bookmarkInternals.updateById", expect.objectContaining({
    thumbnailSourceUrl: "https://example.com/new-image.png",
    thumbnailStorageId: "new-storage"
  }));
});

test("studio bookmark updates clear stored thumbnails when the source URL is removed", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  const bookmarksModule = await import("../convex/bookmarks");
  const updateForStudio = bookmarksModule.updateForStudio as unknown as {
    handler: (ctx: Record<string, unknown>, args: Record<string, unknown>) => Promise<unknown>;
  };
  const existingBookmark = createExistingBookmark();
  const updatedBookmark = {
    ...existingBookmark,
    thumbnailSourceUrl: "",
    thumbnailStorageId: null,
    thumbnailUrl: ""
  };
  let queryCount = 0;
  const runQuery = vi.fn(async () => {
    queryCount += 1;
    return queryCount === 1 ? existingBookmark : updatedBookmark;
  });
  const runMutation = vi.fn(async () => "bookmark-1");
  const storage = {
    store: vi.fn(async () => "new-storage"),
    delete: vi.fn(async () => {})
  };

  await expect(updateForStudio.handler({
    runQuery,
    runMutation,
    storage
  }, {
    id: "bookmark-1",
    url: "https://example.com/bookmark",
    title: "Existing Bookmark",
    description: "Existing description",
    source: "Example",
    note: "Existing note",
    addedAt: 123,
    thumbnailSourceUrl: ""
  })).resolves.toEqual(updatedBookmark);

  expect(fetchMock).not.toHaveBeenCalled();
  expect(storage.delete).toHaveBeenCalledWith("storage-id");
  expect(runMutation).toHaveBeenCalledWith("bookmarkInternals.updateById", expect.objectContaining({
    thumbnailSourceUrl: undefined,
    thumbnailStorageId: undefined
  }));
});

test("studio bookmark updates fall back to source previews when thumbnail refresh fails", async () => {
  const fetchMock = vi.fn(async () => ({
    ok: false,
    headers: {
      get: vi.fn(() => "image/png")
    }
  }));
  vi.stubGlobal("fetch", fetchMock);

  const bookmarksModule = await import("../convex/bookmarks");
  const updateForStudio = bookmarksModule.updateForStudio as unknown as {
    handler: (ctx: Record<string, unknown>, args: Record<string, unknown>) => Promise<unknown>;
  };
  const existingBookmark = createExistingBookmark();
  const updatedBookmark = {
    ...existingBookmark,
    thumbnailSourceUrl: "https://example.com/new-image.png",
    thumbnailStorageId: null,
    thumbnailUrl: "https://example.com/new-image.png"
  };
  let queryCount = 0;
  const runQuery = vi.fn(async () => {
    queryCount += 1;
    return queryCount === 1 ? existingBookmark : updatedBookmark;
  });
  const runMutation = vi.fn(async () => "bookmark-1");
  const storage = {
    store: vi.fn(async () => "new-storage"),
    delete: vi.fn(async () => {})
  };

  await expect(updateForStudio.handler({
    runQuery,
    runMutation,
    storage
  }, {
    id: "bookmark-1",
    url: "https://example.com/bookmark",
    title: "Existing Bookmark",
    description: "Existing description",
    source: "Example",
    note: "Existing note",
    addedAt: 123,
    thumbnailSourceUrl: "https://example.com/new-image.png"
  })).resolves.toEqual(updatedBookmark);

  expect(fetchMock).toHaveBeenCalledWith("https://example.com/new-image.png");
  expect(storage.store).not.toHaveBeenCalled();
  expect(storage.delete).toHaveBeenCalledWith("storage-id");
  expect(runMutation).toHaveBeenCalledWith("bookmarkInternals.updateById", expect.objectContaining({
    thumbnailSourceUrl: "https://example.com/new-image.png",
    thumbnailStorageId: undefined
  }));
});
