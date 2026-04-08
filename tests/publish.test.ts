import { beforeEach, expect, test, vi } from "vitest";

const { publishStudioBookmark, publishStudioPost, researchBookmark, mirrorThumbnailToPublic } = vi.hoisted(() => ({
  publishStudioPost: vi.fn(),
  publishStudioBookmark: vi.fn(),
  researchBookmark: vi.fn(),
  mirrorThumbnailToPublic: vi.fn()
}));

vi.mock("../apps/studio/lib/convex", () => ({
  publishStudioBookmark,
  publishStudioPost
}));

vi.mock("../apps/studio/lib/opencode", () => ({
  researchBookmark
}));

vi.mock("../apps/studio/lib/thumbnails", () => ({
  mirrorThumbnailToPublic
}));

import { publishBookmarkLink, publishPostDraft } from "../apps/studio/lib/publish";

beforeEach(() => {
  publishStudioPost.mockReset();
  publishStudioBookmark.mockReset();
  researchBookmark.mockReset();
  mirrorThumbnailToPublic.mockReset();
});

test("publishPostDraft trims input, normalizes body, and publishes", async () => {
  publishStudioPost.mockResolvedValue({ slug: "hello-world", title: "Hello World" });

  const result = await publishPostDraft({
    title: "  Hello World  ",
    body: "line one\r\nline two\n"
  });

  expect(publishStudioPost).toHaveBeenCalledWith({
    title: "Hello World",
    body: "line one\nline two"
  });
  expect(result).toEqual({
    ok: true,
    post: { slug: "hello-world", title: "Hello World" }
  });
});

test("publishPostDraft rejects missing title and body", async () => {
  await expect(publishPostDraft({ title: "   ", body: "body" })).rejects.toThrow("Posts need a title.");
  await expect(publishPostDraft({ title: "Title", body: "   " })).rejects.toThrow("Posts need body content.");
});

test("publishBookmarkLink normalizes the URL, publishes metadata, and mirrors thumbnails", async () => {
  researchBookmark.mockResolvedValue({
    endpoint: "http://127.0.0.1:4096",
    startedByApp: false,
    title: "Example bookmark",
    description: "Short description",
    source: "Example Site",
    thumbnailUrl: "https://example.com/image.png"
  });
  publishStudioBookmark.mockResolvedValue({ url: "https://example.com/path", title: "Example bookmark" });
  mirrorThumbnailToPublic.mockResolvedValue("/tmp/thumb.png");

  const result = await publishBookmarkLink({
    url: " https://example.com/path ",
    note: "  Keep this around  "
  });

  expect(researchBookmark).toHaveBeenCalledWith("https://example.com/path", "Keep this around");
  expect(publishStudioBookmark).toHaveBeenCalledWith({
    url: "https://example.com/path",
    note: "Keep this around",
    title: "Example bookmark",
    description: "Short description",
    source: "Example Site",
    thumbnailSourceUrl: "https://example.com/image.png"
  });
  expect(mirrorThumbnailToPublic).toHaveBeenCalledWith("https://example.com/image.png");
  expect(result).toEqual({
    ok: true,
    bookmark: { url: "https://example.com/path", title: "Example bookmark" },
    thumbnailCachePath: "/tmp/thumb.png"
  });
});

test("publishBookmarkLink ignores thumbnail mirroring errors", async () => {
  researchBookmark.mockResolvedValue({
    endpoint: "http://127.0.0.1:4096",
    startedByApp: false,
    title: "Example bookmark",
    description: "Short description",
    source: "Example Site",
    thumbnailUrl: "https://example.com/image.png"
  });
  publishStudioBookmark.mockResolvedValue({ url: "https://example.com/path", title: "Example bookmark" });
  mirrorThumbnailToPublic.mockRejectedValue(new Error("disk full"));

  const result = await publishBookmarkLink({
    url: "https://example.com/path",
    note: ""
  });

  expect(result.thumbnailCachePath).toBeNull();
});

test("publishBookmarkLink skips thumbnail mirroring when no thumbnail URL exists", async () => {
  researchBookmark.mockResolvedValue({
    endpoint: "http://127.0.0.1:4096",
    startedByApp: false,
    title: "Example bookmark",
    description: "Short description",
    source: "Example Site",
    thumbnailUrl: ""
  });
  publishStudioBookmark.mockResolvedValue({ url: "https://example.com/path", title: "Example bookmark" });

  const result = await publishBookmarkLink({
    url: "https://example.com/path",
    note: ""
  });

  expect(mirrorThumbnailToPublic).not.toHaveBeenCalled();
  expect(result.thumbnailCachePath).toBeNull();
});
