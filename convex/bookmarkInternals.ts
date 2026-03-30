import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

function serializeBookmark(bookmark: {
  url: string;
  title: string;
  description: string;
  source: string;
  note: string;
  addedAt: number;
}, thumbnailUrl: string) {
  return {
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    source: bookmark.source,
    note: bookmark.note,
    addedAt: bookmark.addedAt,
    thumbnailUrl
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

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").collect();

    return Promise.all(
      bookmarks.map(async (bookmark) => serializePublicBookmark(bookmark, await resolveThumbnailUrl(ctx, bookmark)))
    );
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
      ...(args.thumbnailSourceUrl ? { thumbnailSourceUrl: args.thumbnailSourceUrl } : {}),
      ...(args.thumbnailStorageId ? { thumbnailStorageId: args.thumbnailStorageId } : {})
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

    return serializeBookmark(bookmark, await resolveThumbnailUrl(ctx, bookmark));
  }
});
