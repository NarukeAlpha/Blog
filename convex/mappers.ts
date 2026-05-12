import { createExcerpt, estimateReadingTimeMinutes } from "../packages/shared/src/site";

type PostOverviewInput = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: number;
  readingTimeMinutes: number;
};

type PostFullInput = PostOverviewInput & {
  body: string;
};

type AiResearchInput = {
  slug: string;
  title: string;
  body: string;
  model: string;
  prompt: string;
  publishedAt: number;
};

export function serializePostFull(post: PostFullInput) {
  return {
    slug: post.slug,
    title: post.title,
    body: post.body,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    readingTimeMinutes: post.readingTimeMinutes
  };
}

export function serializePublicPost(post: PostFullInput) {
  return serializePostFull(post);
}

export function serializePostOverview(post: PostOverviewInput) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    readingTimeMinutes: post.readingTimeMinutes
  };
}

export function serializeAiResearchFull(entry: AiResearchInput) {
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

export function serializePublicAiResearchSummary(entry: AiResearchInput) {
  return {
    slug: entry.slug,
    title: entry.title,
    model: entry.model,
    excerpt: createExcerpt(entry.body),
    publishedAt: entry.publishedAt,
    readingTimeMinutes: estimateReadingTimeMinutes(entry.body)
  };
}

export function serializePublicAiResearchFull(entry: AiResearchInput) {
  return {
    ...serializePublicAiResearchSummary(entry),
    body: entry.body,
    prompt: entry.prompt
  };
}
