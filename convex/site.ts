import { internalQuery } from "./_generated/server";
import { serializePostOverview } from "./mappers";
import { serializePublicBookmark } from "./publicBookmarks";

export const overview = internalQuery({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").withIndex("by_publishedAt").order("desc").take(3);
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").take(4);

    return {
      postCount: (await ctx.db.query("posts").collect()).length,
      bookmarkCount: (await ctx.db.query("bookmarks").collect()).length,
      latestPosts: posts.map(serializePostOverview),
      latestBookmarks: await Promise.all(
        bookmarks.map((bookmark) => serializePublicBookmark(bookmark, (storageId) => ctx.storage.getUrl(storageId)))
      )
    };
  }
});
