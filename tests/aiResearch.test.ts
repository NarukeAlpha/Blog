import { beforeEach, expect, test, vi } from "vitest";

const internalMutation = vi.fn((definition: unknown) => definition);

vi.mock("../convex/_generated/server", () => ({
  internalMutation
}));

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  internalMutation.mockClear();
});

function buildCtx(existingSlugs: string[], options: { getCreated?: boolean } = {}) {
  const slugs = new Set(existingSlugs);
  const lookedUpSlugs: string[] = [];
  let createdEntry: unknown = null;
  const unique = vi.fn(async () => null);
  const withIndex = vi.fn((_indexName: string, indexRange: (queryBuilder: { eq: (field: string, value: string) => unknown }) => unknown) => {
    let requestedSlug = "";
    indexRange({
      eq: (_field: string, value: string) => {
        requestedSlug = value;
        lookedUpSlugs.push(value);
        return null;
      }
    });

    return {
      unique: vi.fn(async () => {
        unique();
        return slugs.has(requestedSlug)
          ? {
              slug: requestedSlug,
              title: "Existing",
              body: "Existing body",
              model: "model",
              prompt: "prompt",
              publishedAt: 1
            }
          : null;
      })
    };
  });
  const query = vi.fn(() => ({ withIndex }));
  const insert = vi.fn(async (_table: string, value: unknown) => {
    createdEntry = value;
    return "ai-research-id";
  });
  const get = vi.fn(async () => options.getCreated === false ? null : createdEntry);

  return {
    ctx: {
      db: {
        query,
        insert,
        get
      }
    },
    get,
    insert,
    lookedUpSlugs,
    query,
    unique,
    withIndex
  };
}

async function loadPublish() {
  const aiResearch = await import("../convex/aiResearch");
  return aiResearch.publish as unknown as {
    handler: (ctx: ReturnType<typeof buildCtx>["ctx"], args: { title: string; body: string; model: string; prompt: string }) => Promise<unknown>;
  };
}

test("AI research publish validates normalized input with existing messages", async () => {
  const publish = await loadPublish();
  const { ctx } = buildCtx([]);

  await expect(publish.handler(ctx, { title: "   ", body: "Body", model: "model", prompt: "prompt" })).rejects.toThrow(
    "AI research needs a title."
  );
  await expect(publish.handler(ctx, { title: "Title", body: "   ", model: "model", prompt: "prompt" })).rejects.toThrow(
    "AI research needs body content."
  );
  await expect(publish.handler(ctx, { title: "Title", body: "Body", model: "   ", prompt: "prompt" })).rejects.toThrow(
    "AI research needs a model."
  );
  await expect(publish.handler(ctx, { title: "Title", body: "Body", model: "model", prompt: "   " })).rejects.toThrow(
    "AI research needs a prompt."
  );
});

test("AI research publish generates unique slugs through the by_slug index", async () => {
  vi.spyOn(Date, "now").mockReturnValue(123);
  const publish = await loadPublish();
  const { ctx, insert, lookedUpSlugs, query, withIndex } = buildCtx(["hello-world", "hello-world-2"]);

  await expect(
    publish.handler(ctx, {
      title: "  Hello World  ",
      body: "Line one\r\nline two\n",
      model: "  gpt-test  ",
      prompt: "Prompt\r\ntext\n"
    })
  ).resolves.toEqual({
    slug: "hello-world-3",
    title: "Hello World",
    body: "Line one\nline two",
    model: "gpt-test",
    prompt: "Prompt\ntext",
    excerpt: "Line one line two",
    publishedAt: 123,
    readingTimeMinutes: 1
  });

  expect(lookedUpSlugs).toEqual(["hello-world", "hello-world-2", "hello-world-3"]);
  expect(query).toHaveBeenCalledWith("aiResearch");
  expect(withIndex).toHaveBeenCalledWith("by_slug", expect.any(Function));
  expect(insert).toHaveBeenCalledWith("aiResearch", {
    slug: "hello-world-3",
    title: "Hello World",
    body: "Line one\nline two",
    model: "gpt-test",
    prompt: "Prompt\ntext",
    publishedAt: 123
  });
});

test("AI research publish preserves the missing-created-entry error", async () => {
  const publish = await loadPublish();
  const { ctx } = buildCtx([], { getCreated: false });

  await expect(
    publish.handler(ctx, {
      title: "Title",
      body: "Body",
      model: "model",
      prompt: "prompt"
    })
  ).rejects.toThrow("The AI research entry could not be created.");
});
