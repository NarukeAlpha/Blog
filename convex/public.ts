import { query } from "./_generated/server";

function serializePublicPost(post: {
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  publishedAt: number;
  readingTimeMinutes: number;
}) {
  return {
    slug: post.slug,
    title: post.title,
    body: post.body,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    readingTimeMinutes: post.readingTimeMinutes
  };
}

function serializePublicBookmark(bookmark: {
  url: string;
  title: string;
  description: string;
  source: string;
  addedAt: number;
}, thumbnailUrl: string) {
  return {
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    source: bookmark.source,
    thumbnailUrl,
    addedAt: bookmark.addedAt
  };
}

async function resolveThumbnailUrl(
  ctx: { storage: { getUrl: (storageId: string) => Promise<string | null> } },
  bookmark: { thumbnailStorageId?: string; thumbnailSourceUrl?: string }
) {
  if (bookmark.thumbnailStorageId) {
    return (await ctx.storage.getUrl(bookmark.thumbnailStorageId)) || bookmark.thumbnailSourceUrl || "";
  }

  return bookmark.thumbnailSourceUrl || "";
}

export const health = query({
  args: {},
  handler: async () => ({ ok: true })
});

export const listPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").withIndex("by_publishedAt").order("desc").collect();
    return posts.map(serializePublicPost);
  }
});

export const listBookmarks = query({
  args: {},
  handler: async (ctx) => {
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").collect();

    return Promise.all(
      bookmarks.map(async (bookmark) => serializePublicBookmark(bookmark, await resolveThumbnailUrl(ctx, bookmark)))
    );
  }
});
