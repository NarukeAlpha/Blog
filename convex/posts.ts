import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";

import { assertStudioWriteKey } from "./guards";
import { createExcerpt, estimateReadingTimeMinutes } from "../packages/shared/src/site";
import { createUniqueSlug } from "../packages/shared/src/slug";
import { normalizeBody } from "../packages/shared/src/text";

function serializePost(post: {
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

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").withIndex("by_publishedAt").order("desc").collect();
    return posts.map(serializePost);
  }
});

export const publish = mutation({
  args: {
    apiKey: v.string(),
    title: v.string(),
    body: v.string()
  },
  handler: async (ctx, args) => {
    assertStudioWriteKey(args.apiKey);

    const title = args.title.trim();
    const body = normalizeBody(args.body);

    if (!title) {
      throw new Error("Posts need a title.");
    }

    if (!body) {
      throw new Error("Posts need body content.");
    }

    const existingPosts = await ctx.db.query("posts").collect();
    const slug = createUniqueSlug(title, existingPosts.map((post) => post.slug));
    const publishedAt = Date.now();

    const postId = await ctx.db.insert("posts", {
      slug,
      title,
      body,
      excerpt: createExcerpt(body),
      publishedAt,
      readingTimeMinutes: estimateReadingTimeMinutes(body)
    });

    const created = await ctx.db.get(postId);

    if (!created) {
      throw new Error("The post could not be created.");
    }

    return serializePost(created);
  }
});
