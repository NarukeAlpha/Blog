import { v } from "convex/values";

import { createUniqueSlug } from "../packages/shared/src/slug";
import { createExcerpt, estimateReadingTimeMinutes } from "../packages/shared/src/site";
import { normalizeBody } from "../packages/shared/src/text";
import { internalMutation } from "./_generated/server";

function serializeAiResearch(entry: {
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
    body: entry.body,
    model: entry.model,
    prompt: entry.prompt,
    excerpt: createExcerpt(entry.body),
    publishedAt: entry.publishedAt,
    readingTimeMinutes: estimateReadingTimeMinutes(entry.body)
  };
}

export const publish = internalMutation({
  args: {
    title: v.string(),
    body: v.string(),
    model: v.string(),
    prompt: v.string()
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const body = normalizeBody(args.body);
    const model = args.model.trim();
    const prompt = normalizeBody(args.prompt);

    if (!title) {
      throw new Error("AI research needs a title.");
    }

    if (!body) {
      throw new Error("AI research needs body content.");
    }

    if (!model) {
      throw new Error("AI research needs a model.");
    }

    if (!prompt) {
      throw new Error("AI research needs a prompt.");
    }

    const existingEntries = await ctx.db.query("aiResearch").collect();
    const slug = createUniqueSlug(title, existingEntries.map((entry) => entry.slug));
    const publishedAt = Date.now();

    const entryId = await ctx.db.insert("aiResearch", {
      slug,
      title,
      body,
      model,
      prompt,
      publishedAt
    });

    const created = await ctx.db.get(entryId);

    if (!created) {
      throw new Error("The AI research entry could not be created.");
    }

    return serializeAiResearch(created);
  }
});
