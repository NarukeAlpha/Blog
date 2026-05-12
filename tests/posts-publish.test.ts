import { beforeEach, expect, test, vi } from "vitest";

const internalMutation = vi.fn((definition: unknown) => definition);
const internalQuery = vi.fn((definition: unknown) => definition);

vi.mock("../convex/_generated/server", () => ({
  internalMutation,
  internalQuery
}));

beforeEach(() => {
  vi.resetModules();
  internalMutation.mockClear();
  internalQuery.mockClear();
  vi.useRealTimers();
});

function createPublishCtx(existingSlugs: string[]) {
  const existing = new Set(existingSlugs);
  const collect = vi.fn();
  const slugLookups: string[] = [];
  const eq = vi.fn((_field: string, slug: string) => {
    slugLookups.push(slug);
    return {};
  });
  const unique = vi.fn(async () => {
    const slug = slugLookups.at(-1);
    return slug && existing.has(slug) ? { slug } : null;
  });
  const withIndex = vi.fn((_index: string, builder: (queryBuilder: { eq: typeof eq }) => unknown) => {
    builder({ eq });
    return { unique };
  });
  const query = vi.fn(() => ({
    collect,
    withIndex
  }));
  let insertedPost: Record<string, unknown> | null = null;
  const insert = vi.fn(async (_table: string, post: Record<string, unknown>) => {
    insertedPost = post;
    return "post-id";
  });
  const get = vi.fn(async () => insertedPost);

  return {
    ctx: {
      db: {
        get,
        insert,
        query
      }
    },
    collect,
    eq,
    get,
    insert,
    query,
    slugLookups,
    unique,
    withIndex
  };
}

test("posts publish validates with existing error messages", async () => {
  const postsModule = await import("../convex/posts");
  const publish = postsModule.publish as unknown as {
    handler: (ctx: unknown, args: { title: string; body: string }) => Promise<unknown>;
  };
  const { ctx } = createPublishCtx([]);

  await expect(publish.handler(ctx, { title: "   ", body: "body" })).rejects.toThrow("Posts need a title.");
  await expect(publish.handler(ctx, { title: "Title", body: "   " })).rejects.toThrow("Posts need body content.");
});

test("posts publish creates unique slugs with the by_slug index", async () => {
  vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
  const postsModule = await import("../convex/posts");
  const publish = postsModule.publish as unknown as {
    handler: (ctx: unknown, args: { title: string; body: string }) => Promise<unknown>;
  };
  const { collect, ctx, insert, query, slugLookups, unique, withIndex } = createPublishCtx(["hello-world", "hello-world-2"]);

  await expect(
    publish.handler(ctx, {
      title: "  Hello World  ",
      body: "First line\r\nsecond line"
    })
  ).resolves.toEqual({
    slug: "hello-world-3",
    title: "Hello World",
    body: "First line\nsecond line",
    excerpt: "First line second line",
    publishedAt: Date.now(),
    readingTimeMinutes: 1
  });

  expect(query).toHaveBeenCalledWith("posts");
  expect(withIndex).toHaveBeenCalledWith("by_slug", expect.any(Function));
  expect(unique).toHaveBeenCalledTimes(3);
  expect(slugLookups).toEqual(["hello-world", "hello-world-2", "hello-world-3"]);
  expect(collect).not.toHaveBeenCalled();
  expect(insert).toHaveBeenCalledWith("posts", {
    slug: "hello-world-3",
    title: "Hello World",
    body: "First line\nsecond line",
    excerpt: "First line second line",
    publishedAt: Date.now(),
    readingTimeMinutes: 1
  });
});
