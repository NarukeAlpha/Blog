import { publishStudioBookmark, publishStudioPost } from "./convex";
import { researchBookmark } from "./opencode";
import { mirrorThumbnailToPublic } from "./thumbnails";
import { normalizeBookmarkUrl } from "@shared/site";
import { normalizeBody } from "@shared/text";
import type { BookmarkPublishPayload, BookmarkPublishResult, PostPublishPayload, PostPublishResult } from "@shared/types";

export async function publishPostDraft(payload: PostPublishPayload): Promise<PostPublishResult> {
  const title = payload.title.trim();
  const body = normalizeBody(payload.body);

  if (!title) {
    throw new Error("Posts need a title.");
  }

  if (!body) {
    throw new Error("Posts need body content.");
  }

  const post = await publishStudioPost({
    title,
    body
  });

  return {
    ok: true,
    post
  };
}

export async function publishBookmarkLink(payload: BookmarkPublishPayload): Promise<BookmarkPublishResult> {
  const rawUrl = payload.url.trim();
  const note = payload.note.trim();
  const normalizedUrl = normalizeBookmarkUrl(rawUrl);

  const metadata = await researchBookmark(normalizedUrl, note);

  const bookmark = await publishStudioBookmark({
    url: normalizedUrl,
    note,
    title: metadata.title,
    description: metadata.description,
    source: metadata.source,
    thumbnailSourceUrl: metadata.thumbnailUrl
  });

  let thumbnailCachePath: string | null = null;

  if (metadata.thumbnailUrl) {
    try {
      thumbnailCachePath = await mirrorThumbnailToPublic(metadata.thumbnailUrl);
    } catch {
      thumbnailCachePath = null;
    }
  }

  return {
    ok: true,
    bookmark,
    thumbnailCachePath
  };
}
