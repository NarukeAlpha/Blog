import { internal } from "../../../convex/_generated/api";

import { runPrivilegedAction, runPrivilegedMutation } from "./convex";
import { researchBookmark } from "./opencode";
import { mirrorThumbnailToPublic } from "./thumbnails";
import { normalizeBookmarkUrl } from "../../../packages/shared/src/site";
import { normalizeBody } from "../../../packages/shared/src/text";
import type { BookmarkPublishPayload, BookmarkPublishResult, PostPublishPayload, PostPublishResult } from "../../../packages/shared/src/types";

export async function publishPostDraft(payload: PostPublishPayload): Promise<PostPublishResult> {
  const title = String(payload.title || "").trim();
  const body = normalizeBody(String(payload.body || ""));

  if (!title) {
    throw new Error("Posts need a title.");
  }

  if (!body) {
    throw new Error("Posts need body content.");
  }

  const post = await runPrivilegedMutation(internal.posts.publish, {
    title,
    body
  });

  return {
    ok: true,
    post
  };
}

export async function publishBookmarkLink(payload: BookmarkPublishPayload): Promise<BookmarkPublishResult> {
  const rawUrl = String(payload.url || "").trim();
  const note = String(payload.note || "").trim();
  const normalizedUrl = normalizeBookmarkUrl(rawUrl);

  const metadata = await researchBookmark(normalizedUrl, note);

  const bookmark = await runPrivilegedAction(internal.bookmarks.publish, {
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
