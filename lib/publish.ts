import { ensureContentFiles, readBookmarks, readPosts, writeBookmarks, writePosts } from "./content";
import { publishFiles } from "./git";
import { BOOKMARKS_DATA_FILE, POSTS_DATA_FILE } from "./paths";
import { researchBookmark } from "./opencode";
import { createUniqueSlug } from "./slug";
import type { BookmarkPublishPayload, BookmarkPublishResult, BookmarkRecord, PostPublishPayload, PostPublishResult } from "./types";
import { createPostRecord, syncGeneratedContent } from "./writerside";

function dedupeFiles(filePaths: string[]) {
  return [...new Set(filePaths)];
}

export async function publishPostDraft(payload: PostPublishPayload): Promise<PostPublishResult> {
  const title = String(payload.title || "").trim();
  const body = String(payload.body || "").trim();

  if (!title) {
    throw new Error("Posts need a title.");
  }

  if (!body) {
    throw new Error("Posts need body content.");
  }

  await ensureContentFiles();

  const posts = await readPosts();
  const bookmarks = await readBookmarks();
  const slug = createUniqueSlug(title, posts.map((post) => post.slug));
  const publishedAt = new Date().toISOString();

  const post = createPostRecord({
    title,
    body,
    slug,
    publishedAt
  });

  const nextPosts = [post, ...posts];
  await writePosts(nextPosts);

  const changedFiles = await syncGeneratedContent({
    posts: nextPosts,
    bookmarks
  });

  const files = dedupeFiles([POSTS_DATA_FILE, ...changedFiles]);

  try {
    const git = await publishFiles(files, `publish: add ${post.title}`);

    return {
      ok: true,
      savedLocal: true,
      pushed: true,
      files,
      post,
      git
    };
  } catch (error) {
    return {
      ok: true,
      savedLocal: true,
      pushed: false,
      files,
      post,
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function publishBookmarkLink(payload: BookmarkPublishPayload): Promise<BookmarkPublishResult> {
  const rawUrl = String(payload.url || "").trim();
  const note = String(payload.note || "").trim();

  if (!rawUrl) {
    throw new Error("Bookmarks need a URL.");
  }

  let normalizedUrl: string;

  try {
    const parsed = new URL(rawUrl);

    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are supported.");
    }

    normalizedUrl = parsed.toString();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "That bookmark URL is not valid.");
  }

  await ensureContentFiles();

  const metadata = await researchBookmark(normalizedUrl, note);
  const posts = await readPosts();
  const bookmarks = await readBookmarks();
  const nextBookmark: BookmarkRecord = {
    url: normalizedUrl,
    title: metadata.title,
    description: metadata.description,
    thumbnailUrl: metadata.thumbnailUrl,
    source: metadata.source,
    note,
    addedAt: new Date().toISOString()
  };

  const dedupedBookmarks = bookmarks.filter((bookmark) => bookmark.url !== normalizedUrl);
  const nextBookmarks = [nextBookmark, ...dedupedBookmarks];

  await writeBookmarks(nextBookmarks);

  const changedFiles = await syncGeneratedContent({
    posts,
    bookmarks: nextBookmarks
  });

  const files = dedupeFiles([BOOKMARKS_DATA_FILE, ...changedFiles]);

  try {
    const git = await publishFiles(files, `bookmark: add ${nextBookmark.title}`);

    return {
      ok: true,
      savedLocal: true,
      pushed: true,
      files,
      bookmark: nextBookmark,
      git
    };
  } catch (error) {
    return {
      ok: true,
      savedLocal: true,
      pushed: false,
      files,
      bookmark: nextBookmark,
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}
