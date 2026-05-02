import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { normalizeBookmarkUrl } from "../packages/shared/src/site";
import { resolveBookmarkThumbnailUrl, serializePublicBookmark } from "./publicBookmarks";

async function serializeStudioBookmark<TBookmarkId extends string, TStorageId extends string>(
  bookmark: {
    _id: TBookmarkId;
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
  return {
    id: bookmark._id,
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    source: bookmark.source,
    note: bookmark.note,
    addedAt: bookmark.addedAt,
    thumbnailSourceUrl: bookmark.thumbnailSourceUrl || "",
    thumbnailStorageId: bookmark.thumbnailStorageId ?? null,
    thumbnailUrl: await resolveBookmarkThumbnailUrl(getUrl, bookmark)
  };
}

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").collect();

    return Promise.all(bookmarks.map((bookmark) => serializePublicBookmark(bookmark, (storageId) => ctx.storage.getUrl(storageId))));
  }
});

export const listForStudio = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").collect();

    return Promise.all(bookmarks.map((bookmark) => serializeStudioBookmark(bookmark, (storageId) => ctx.storage.getUrl(storageId))));
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

export const updateById = internalMutation({
  args: {
    id: v.id("bookmarks"),
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
    const existing = await ctx.db.get(args.id);

    if (!existing) {
      throw new Error("The bookmark could not be found.");
    }

    const normalizedUrl = normalizeBookmarkUrl(args.url);
    const duplicate = await ctx.db.query("bookmarks").withIndex("by_url", (queryBuilder) => queryBuilder.eq("url", normalizedUrl)).unique();

    if (duplicate && duplicate._id !== args.id) {
      throw new Error("A bookmark with this URL already exists.");
    }

    await ctx.db.patch(args.id, {
      url: normalizedUrl,
      title: args.title,
      description: args.description,
      source: args.source,
      note: args.note,
      addedAt: args.addedAt,
      thumbnailSourceUrl: args.thumbnailSourceUrl,
      thumbnailStorageId: args.thumbnailStorageId
    });

    return args.id;
  }
});

export const byUrl = internalQuery({
  args: {
    url: v.string()
  },
  handler: async (ctx, args) => {
    const bookmark = await ctx.db.query("bookmarks").withIndex("by_url", (queryBuilder) => queryBuilder.eq("url", normalizeBookmarkUrl(args.url))).unique();

    if (!bookmark) {
      return null;
    }

    return serializeStudioBookmark(bookmark, (storageId) => ctx.storage.getUrl(storageId));
  }
});

export const byId = internalQuery({
  args: {
    id: v.id("bookmarks")
  },
  handler: async (ctx, args) => {
    const bookmark = await ctx.db.get(args.id);

    if (!bookmark) {
      return null;
    }

    return serializeStudioBookmark(bookmark, (storageId) => ctx.storage.getUrl(storageId));
  }
});
