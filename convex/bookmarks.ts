import { v } from "convex/values";
import { Effect } from "effect";
import { internalAction, type ActionCtx } from "./_generated/server";

import { api } from "./api";
import { normalizeBookmarkUrl } from "../packages/shared/src/site";
import { ConvexStorage } from "./effects";

function runStorageEffect<A>(storage: ActionCtx["storage"], program: Effect.Effect<A, never, ConvexStorage>) {
  return Effect.runPromise(Effect.provideService(program, ConvexStorage, storage));
}

function storeRemoteThumbnail(sourceUrl: string) {
  return Effect.gen(function* () {
    const storage = yield* ConvexStorage;
    const response = yield* Effect.tryPromise({
      try: () => fetch(sourceUrl),
      catch: (error) => error
    });

    if (!response.ok) {
      return undefined;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      return undefined;
    }

    const blob = yield* Effect.tryPromise({
      try: () => response.blob(),
      catch: (error) => error
    });

    return yield* Effect.tryPromise({
      try: () => storage.store(blob),
      catch: (error) => error
    });
  }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));
}

function deleteStoredThumbnail(storageId?: string | null) {
  if (!storageId) {
    return Effect.void;
  }

  return Effect.gen(function* () {
    const storage = yield* ConvexStorage;
    yield* Effect.tryPromise({
      try: () => storage.delete(storageId),
      catch: (error) => error
    });
  }).pipe(Effect.catchAll(() => Effect.void));
}

async function storeThumbnail(ctx: { storage: ActionCtx["storage"] }, sourceUrl: string) {
  return runStorageEffect(ctx.storage, storeRemoteThumbnail(sourceUrl));
}

async function deleteThumbnail(ctx: { storage: ActionCtx["storage"] }, storageId?: string | null) {
  await runStorageEffect(ctx.storage, deleteStoredThumbnail(storageId));
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
    const thumbnailStorageId = thumbnailSourceUrl ? await storeThumbnail(ctx, thumbnailSourceUrl) : undefined;

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
        await deleteThumbnail(ctx, existing.thumbnailStorageId);
        thumbnailSourceUrl = undefined;
        thumbnailStorageId = undefined;
      } else {
        const storedThumbnailId = await storeThumbnail(ctx, nextThumbnailSourceUrl);

        await deleteThumbnail(ctx, existing.thumbnailStorageId);
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
