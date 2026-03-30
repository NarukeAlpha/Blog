import { v } from "convex/values";
import { action } from "./_generated/server";

import { api } from "./api";
import { assertStudioWriteKey } from "./guards";
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
