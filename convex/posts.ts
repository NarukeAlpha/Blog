import { Data, Effect, Either } from "effect";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

import { createExcerpt, estimateReadingTimeMinutes } from "../packages/shared/src/site";
import { slugify } from "../packages/shared/src/slug";
import { normalizeBody } from "../packages/shared/src/text";
import { ConvexDatabase } from "./effects";
import { serializePostFull } from "./mappers";

class PostValidationError extends Data.TaggedError("PostValidationError")<{ message: string }> {}
class PostCreationError extends Data.TaggedError("PostCreationError")<{ message: string }> {}
type PostPublishError = PostValidationError | PostCreationError;

type PublishInput = {
  title: string;
  body: string;
};

function validatePublishInput(args: PublishInput) {
  const title = args.title.trim();
  const body = normalizeBody(args.body);

  if (!title) {
    return Effect.fail(new PostValidationError({ message: "Posts need a title." }));
  }

  if (!body) {
    return Effect.fail(new PostValidationError({ message: "Posts need body content." }));
  }

  return Effect.succeed({ title, body });
}

function postSlugExists(slug: string) {
  return Effect.gen(function* () {
    const db = yield* ConvexDatabase;
    const existingPost = yield* Effect.promise(() =>
      db.query("posts").withIndex("by_slug", (queryBuilder) => queryBuilder.eq("slug", slug)).unique()
    );

    return existingPost !== null;
  });
}

function createUniquePostSlug(title: string) {
  return Effect.gen(function* () {
    const seed = slugify(title);

    if (!(yield* postSlugExists(seed))) {
      return seed;
    }

    let counter = 2;
    while (yield* postSlugExists(`${seed}-${counter}`)) {
      counter += 1;
    }

    return `${seed}-${counter}`;
  });
}

export const list = internalQuery({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").withIndex("by_publishedAt").order("desc").collect();
    return posts.map(serializePostFull);
  }
});

export const publish = internalMutation({
  args: {
    title: v.string(),
    body: v.string()
  },
  handler: async (ctx, args) => {
    const program = Effect.gen(function* () {
      const input = yield* validatePublishInput(args);
      const db = yield* ConvexDatabase;
      const slug = yield* createUniquePostSlug(input.title);
      const publishedAt = Date.now();

      const postId = yield* Effect.promise(() =>
        db.insert("posts", {
          slug,
          title: input.title,
          body: input.body,
          excerpt: createExcerpt(input.body),
          publishedAt,
          readingTimeMinutes: estimateReadingTimeMinutes(input.body)
        })
      );

      const created = yield* Effect.promise(() => db.get(postId));

      if (!created) {
        return yield* Effect.fail(new PostCreationError({ message: "The post could not be created." }));
      }

      return serializePostFull(created);
    });

    const result = await Effect.runPromise(Effect.either(Effect.provideService(program, ConvexDatabase, ctx.db)));

    if (Either.isLeft(result)) {
      const error: PostPublishError = result.left;
      throw new Error(error.message);
    }

    return result.right;
  }
});
