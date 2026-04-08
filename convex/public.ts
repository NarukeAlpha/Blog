import { v } from "convex/values";

import { createExcerpt, estimateReadingTimeMinutes } from "../packages/shared/src/site";
import { query } from "./_generated/server";
import { serializePublicBookmark } from "./publicBookmarks";

function serializePublicPost(post: {
  slug: string;
  title: string;
  body: string;
  excerpt: string;
  publishedAt: number;
  readingTimeMinutes: number;
}) {
  return {
    slug: post.slug,
    title: post.title,
    body: post.body,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    readingTimeMinutes: post.readingTimeMinutes
  };
}

function serializePublicAiResearchSummary(entry: {
  slug: string;
  title: string;
  body: string;
  model: string;
  prompt: string;
  publishedAt: number;
}) {
  return {
    slug: entry.slug,
    title: entry.title,
    model: entry.model,
    excerpt: createExcerpt(entry.body),
    publishedAt: entry.publishedAt,
    readingTimeMinutes: estimateReadingTimeMinutes(entry.body)
  };
}

function serializePublicAiResearch(entry: {
  slug: string;
  title: string;
  body: string;
  model: string;
  prompt: string;
  publishedAt: number;
}) {
  return {
    ...serializePublicAiResearchSummary(entry),
    body: entry.body,
    prompt: entry.prompt
  };
}

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

    return serializePublicAiResearch(entry);
  }
});
