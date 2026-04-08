import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  posts: defineTable({
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    excerpt: v.string(),
    publishedAt: v.number(),
    readingTimeMinutes: v.number()
  })
    .index("by_slug", ["slug"])
    .index("by_publishedAt", ["publishedAt"]),

  bookmarks: defineTable({
    url: v.string(),
    title: v.string(),
    description: v.string(),
    source: v.string(),
    note: v.string(),
    addedAt: v.number(),
    thumbnailSourceUrl: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage"))
  })
    .index("by_url", ["url"])
    .index("by_addedAt", ["addedAt"]),

  aiResearch: defineTable({
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    model: v.string(),
    prompt: v.string(),
    publishedAt: v.number()
  })
    .index("by_slug", ["slug"])
    .index("by_publishedAt", ["publishedAt"])
});
