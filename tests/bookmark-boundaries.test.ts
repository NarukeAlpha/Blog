import { buildPublicBookmark, resolveBookmarkThumbnailUrl, serializePublicBookmark } from "@convex/publicBookmarks";
import { requireStudioWriteKey } from "@convex/studioAuth";
import { expect, test, vi } from "vitest";

test("public bookmark helpers preserve public fields and prefer stored thumbnail URLs", async () => {
  const bookmark = {
    url: "https://example.com/article",
    title: "Example Article",
    description: "An example bookmark",
    source: "Example",
    addedAt: 123,
    thumbnailSourceUrl: "https://example.com/source.png",
    thumbnailStorageId: "storage-id"
  };
  const getUrl = vi.fn(async () => "https://cdn.example.com/storage.png");

  expect(buildPublicBookmark(bookmark, "https://cdn.example.com/storage.png")).toEqual({
    url: "https://example.com/article",
    title: "Example Article",
    description: "An example bookmark",
    source: "Example",
    thumbnailUrl: "https://cdn.example.com/storage.png",
    addedAt: 123
  });
  expect(await resolveBookmarkThumbnailUrl(getUrl, bookmark)).toBe("https://cdn.example.com/storage.png");
  expect(await serializePublicBookmark(bookmark, getUrl)).toEqual({
    url: "https://example.com/article",
    title: "Example Article",
    description: "An example bookmark",
    source: "Example",
    thumbnailUrl: "https://cdn.example.com/storage.png",
    addedAt: 123
  });
});

test("public bookmark helpers fall back to source thumbnails and empty strings", async () => {
  const bookmark = {
    url: "https://example.com/article",
    title: "Example Article",
    description: "An example bookmark",
    source: "Example",
    addedAt: 123,
    thumbnailSourceUrl: "https://example.com/source.png"
  };

  expect(await resolveBookmarkThumbnailUrl(async () => null, bookmark)).toBe("https://example.com/source.png");
  expect(await resolveBookmarkThumbnailUrl(async () => null, { ...bookmark, thumbnailSourceUrl: undefined })).toBe("");
});

test("studio write-key validation rejects missing and invalid keys", () => {
  vi.stubEnv("STUDIO_WRITE_KEY", "");
  expect(() => requireStudioWriteKey("secret")).toThrow("STUDIO_WRITE_KEY is not configured for this Convex deployment.");

  vi.stubEnv("STUDIO_WRITE_KEY", "secret");
  expect(() => requireStudioWriteKey("wrong")).toThrow("Invalid studio write key.");
  expect(() => requireStudioWriteKey("secret")).not.toThrow();
});
