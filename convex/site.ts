import { internalQuery } from "./_generated/server";
import { serializePublicBookmark } from "./publicBookmarks";

function serializeOverviewPost(post: {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: number;
  readingTimeMinutes: number;
}) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    readingTimeMinutes: post.readingTimeMinutes
  };
}

export const overview = internalQuery({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").withIndex("by_publishedAt").order("desc").take(3);
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").take(4);

    return {
      postCount: (await ctx.db.query("posts").collect()).length,
      bookmarkCount: (await ctx.db.query("bookmarks").collect()).length,
      latestPosts: posts.map(serializeOverviewPost),
      latestBookmarks: await Promise.all(
        bookmarks.map((bookmark) => serializePublicBookmark(bookmark, (storageId) => ctx.storage.getUrl(storageId)))
      )
    };
  }
});
