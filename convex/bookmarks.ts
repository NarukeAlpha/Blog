import { v } from "convex/values";
import { internalAction } from "./_generated/server";

import { api } from "./api";
import { normalizeBookmarkUrl } from "../packages/shared/src/site";

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

async function deleteStoredThumbnail(
  ctx: { storage: { delete: (storageId: string) => Promise<void> } },
  storageId?: string | null
) {
  if (!storageId) {
    return;
  }

  try {
    await ctx.storage.delete(storageId);
  } catch {
    // Thumbnail cleanup should not block bookmark saves.
  }
}

export const publish = internalAction({
  args: {
    url: v.string(),
    note: v.string(),
    title: v.string(),
    description: v.string(),
    source: v.string(),
    thumbnailSourceUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const url = normalizeBookmarkUrl(args.url);
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const thumbnailSourceUrl = String(args.thumbnailSourceUrl || "").trim();
    const thumbnailStorageId = thumbnailSourceUrl ? await storeRemoteThumbnail(ctx, thumbnailSourceUrl) : undefined;

    await ctx.runMutation(api.bookmarkInternals.persist, {
      url,
      title: args.title.trim() || hostname,
      description: args.description.trim() || `Saved from ${hostname}.`,
      source: args.source.trim() || hostname,
      note: args.note.trim(),
      addedAt: Date.now(),
      ...(thumbnailSourceUrl ? { thumbnailSourceUrl } : {}),
      ...(thumbnailStorageId ? { thumbnailStorageId } : {})
    });

    const bookmark = await ctx.runQuery(api.bookmarkInternals.byUrl, { url });

    if (!bookmark) {
      throw new Error("The bookmark could not be stored.");
    }

    return bookmark;
  }
});

export const updateForStudio = internalAction({
  args: {
    id: v.id("bookmarks"),
    url: v.string(),
    title: v.string(),
    description: v.string(),
    source: v.string(),
    note: v.string(),
    addedAt: v.number(),
    thumbnailSourceUrl: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(api.bookmarkInternals.byId, { id: args.id });

    if (!existing) {
      throw new Error("The bookmark could not be found.");
    }

    const url = normalizeBookmarkUrl(args.url);
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const currentThumbnailSourceUrl = String(existing.thumbnailSourceUrl || "").trim();
    const nextThumbnailSourceUrl = String(args.thumbnailSourceUrl || "").trim();

    let thumbnailSourceUrl: string | undefined = currentThumbnailSourceUrl || undefined;
    let thumbnailStorageId: string | undefined = existing.thumbnailStorageId || undefined;

    if (nextThumbnailSourceUrl !== currentThumbnailSourceUrl) {
      if (!nextThumbnailSourceUrl) {
        await deleteStoredThumbnail(ctx, existing.thumbnailStorageId);
        thumbnailSourceUrl = undefined;
        thumbnailStorageId = undefined;
      } else {
        const storedThumbnailId = await storeRemoteThumbnail(ctx, nextThumbnailSourceUrl);

        await deleteStoredThumbnail(ctx, existing.thumbnailStorageId);
        thumbnailSourceUrl = nextThumbnailSourceUrl;
        thumbnailStorageId = storedThumbnailId;
      }
    }

    await ctx.runMutation(api.bookmarkInternals.updateById, {
      id: args.id,
      url,
      title: args.title.trim() || hostname,
      description: args.description.trim() || `Saved from ${hostname}.`,
      source: args.source.trim() || hostname,
      note: args.note.trim(),
      addedAt: args.addedAt,
      thumbnailSourceUrl,
      thumbnailStorageId
    });

    const bookmark = await ctx.runQuery(api.bookmarkInternals.byId, { id: args.id });

    if (!bookmark) {
      throw new Error("The bookmark could not be stored.");
    }

    return bookmark;
  }
});
