import { v } from "convex/values";

import { query } from "./_generated/server";
import { serializePublicAiResearchFull, serializePublicAiResearchSummary, serializePublicPost } from "./mappers";
import { serializePublicBookmark } from "./publicBookmarks";

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

export const listAiResearch = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("aiResearch").withIndex("by_publishedAt").order("desc").collect();
    return entries.map(serializePublicAiResearchSummary);
  }
});

export const getAiResearchBySlug = query({
  args: {
    slug: v.string()
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.query("aiResearch").withIndex("by_slug", (queryBuilder) => queryBuilder.eq("slug", args.slug)).unique();

    if (!entry) {
      return null;
    }

    return serializePublicAiResearchFull(entry);
  }
});
