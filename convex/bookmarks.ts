import { v } from "convex/values";
import { actionGeneric as action, mutationGeneric as mutation, queryGeneric as query } from "convex/server";

import { api } from "./api";
import { assertStudioWriteKey } from "./guards";
import { normalizeBookmarkUrl } from "../lib/site";

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

async function resolveThumbnailUrl(
  ctx: { storage: { getUrl: (storageId: string) => Promise<string | null> } },
  bookmark: { thumbnailStorageId?: string; thumbnailSourceUrl?: string }
) {
  if (bookmark.thumbnailStorageId) {
    return (await ctx.storage.getUrl(bookmark.thumbnailStorageId)) || bookmark.thumbnailSourceUrl || "";
  }

  return bookmark.thumbnailSourceUrl || "";
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_addedAt").order("desc").collect();

    return Promise.all(
      bookmarks.map(async (bookmark) => serializeBookmark(bookmark, await resolveThumbnailUrl(ctx, bookmark)))
    );
  }
});

async function storeRemoteThumbnail(
  ctx: { storage: { store: (blob: Blob) => Promise<string> } },
  sourceUrl: string
) {
  try {
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      return undefined;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      return undefined;
    }

    return ctx.storage.store(await response.blob());
  } catch {
    return undefined;
  }
}

export const publish = action({
  args: {
    apiKey: v.string(),
    url: v.string(),
    note: v.string(),
    title: v.string(),
    description: v.string(),
    source: v.string(),
    thumbnailSourceUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    assertStudioWriteKey(args.apiKey);

    const url = normalizeBookmarkUrl(args.url);
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const thumbnailSourceUrl = String(args.thumbnailSourceUrl || "").trim();
    const thumbnailStorageId = thumbnailSourceUrl ? await storeRemoteThumbnail(ctx, thumbnailSourceUrl) : undefined;

    await ctx.runMutation(api.bookmarks.persist, {
      url,
      title: args.title.trim() || hostname,
      description: args.description.trim() || `Saved from ${hostname}.`,
      source: args.source.trim() || hostname,
      note: args.note.trim(),
      addedAt: Date.now(),
      ...(thumbnailSourceUrl ? { thumbnailSourceUrl } : {}),
      ...(thumbnailStorageId ? { thumbnailStorageId } : {})
    });

    const bookmark = await ctx.runQuery(api.bookmarks.byUrl, { url });

    if (!bookmark) {
      throw new Error("The bookmark could not be stored.");
    }

    return bookmark;
  }
});

export const persist = mutation({
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

export const byUrl = query({
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
