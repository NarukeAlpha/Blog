import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { serializePublicBookmark } from "./publicBookmarks";

async function serializeBookmark<TStorageId extends string>(
  bookmark: {
    url: string;
    title: string;
    description: string;
    source: string;
    note: string;
    addedAt: number;
    thumbnailSourceUrl?: string;
    thumbnailStorageId?: TStorageId;
  },
  getUrl: (storageId: TStorageId) => Promise<string | null>
) {
  const publicBookmark = await serializePublicBookmark(bookmark, getUrl);

  return {
    ...publicBookmark,
    note: bookmark.note
  };
}

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").collect();

    return Promise.all(bookmarks.map((bookmark) => serializePublicBookmark(bookmark, (storageId) => ctx.storage.getUrl(storageId))));
  }
});

export const persist = internalMutation({
  args: {
    url: v.string(),
    title: v.string(),
    description: v.string(),
    source: v.string(),
    note: v.string(),
    addedAt: v.number(),
    thumbnailSourceUrl: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage"))
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("bookmarks").withIndex("by_url", (queryBuilder) => queryBuilder.eq("url", args.url)).unique();

    const payload = {
      title: args.title,
      description: args.description,
      source: args.source,
      note: args.note,
      addedAt: args.addedAt,
      thumbnailSourceUrl: args.thumbnailSourceUrl,
      thumbnailStorageId: args.thumbnailStorageId
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return ctx.db.insert("bookmarks", {
      url: args.url,
      ...payload
    });
  }
});

export const byUrl = internalQuery({
  args: {
    url: v.string()
  },
  handler: async (ctx, args) => {
    const bookmark = await ctx.db.query("bookmarks").withIndex("by_url", (queryBuilder) => queryBuilder.eq("url", args.url)).unique();

    if (!bookmark) {
      return null;
    }

    return serializeBookmark(bookmark, (storageId) => ctx.storage.getUrl(storageId));
  }
});
