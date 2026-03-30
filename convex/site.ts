import { v } from "convex/values";

import { query } from "./_generated/server";
import { assertStudioWriteKey } from "./guards";

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

function serializeOverviewBookmark(bookmark: {
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
    addedAt: bookmark.addedAt,
    thumbnailUrl
  };
}

export const overview = query({
  args: {
    apiKey: v.string()
  },
  handler: async (ctx, args) => {
    assertStudioWriteKey(args.apiKey);

    const posts = await ctx.db.query("posts").withIndex("by_publishedAt").order("desc").take(3);
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").take(4);

    return {
      postCount: (await ctx.db.query("posts").collect()).length,
      bookmarkCount: (await ctx.db.query("bookmarks").collect()).length,
      latestPosts: posts.map(serializeOverviewPost),
      latestBookmarks: await Promise.all(
        bookmarks.map(async (bookmark) =>
          serializeOverviewBookmark(
            bookmark,
            bookmark.thumbnailStorageId
              ? (await ctx.storage.getUrl(bookmark.thumbnailStorageId)) || bookmark.thumbnailSourceUrl || ""
              : bookmark.thumbnailSourceUrl || ""
          )
        )
      )
    };
  }
});
