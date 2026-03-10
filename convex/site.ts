import { queryGeneric as query } from "convex/server";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").withIndex("by_publishedAt").order("desc").take(3);
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").take(4);

    return {
      postCount: (await ctx.db.query("posts").collect()).length,
      bookmarkCount: (await ctx.db.query("bookmarks").collect()).length,
      latestPosts: posts.map((post) => ({
        slug: post.slug,
        title: post.title,
        body: post.body,
        excerpt: post.excerpt,
        publishedAt: post.publishedAt,
        readingTimeMinutes: post.readingTimeMinutes
      })),
      latestBookmarks: await Promise.all(
        bookmarks.map(async (bookmark) => ({
          url: bookmark.url,
          title: bookmark.title,
          description: bookmark.description,
          source: bookmark.source,
          note: bookmark.note,
          addedAt: bookmark.addedAt,
          thumbnailUrl: bookmark.thumbnailStorageId
            ? (await ctx.storage.getUrl(bookmark.thumbnailStorageId)) || bookmark.thumbnailSourceUrl || ""
            : bookmark.thumbnailSourceUrl || ""
        }))
      )
    };
  }
});
