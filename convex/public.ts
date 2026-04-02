import { query } from "./_generated/server";
import { serializePublicBookmark } from "./publicBookmarks";

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

    return Promise.all(bookmarks.map((bookmark) => serializePublicBookmark(bookmark, (storageId) => ctx.storage.getUrl(storageId))));
  }
});
