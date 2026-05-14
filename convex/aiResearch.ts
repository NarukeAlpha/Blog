import { Data, Effect, Either } from "effect";
import { v } from "convex/values";

import { slugify } from "../packages/shared/src/slug";
import { normalizeBody } from "../packages/shared/src/text";
import { internalMutation } from "./_generated/server";
import { ConvexDatabase } from "./effects";
import { serializeAiResearchFull } from "./mappers";

class AiResearchPublishError extends Data.TaggedError("AiResearchPublishError")<{
  message: string;
}> {}

type PublishArgs = {
  title: string;
  body: string;
  model: string;
  prompt: string;
};

function validatePublishArgs(args: PublishArgs) {
  return Effect.gen(function* () {
    const title = args.title.trim();
    const body = normalizeBody(args.body);
    const model = args.model.trim();
    const prompt = normalizeBody(args.prompt);

    if (!title) {
      return yield* Effect.fail(new AiResearchPublishError({ message: "AI research needs a title." }));
    }

    if (!body) {
      return yield* Effect.fail(new AiResearchPublishError({ message: "AI research needs body content." }));
    }

    if (!model) {
      return yield* Effect.fail(new AiResearchPublishError({ message: "AI research needs a model." }));
    }

    if (!prompt) {
      return yield* Effect.fail(new AiResearchPublishError({ message: "AI research needs a prompt." }));
    }

    return { title, body, model, prompt };
  });
}

function findAiResearchBySlug(slug: string) {
  return Effect.gen(function* () {
    const db = yield* ConvexDatabase;
    return yield* Effect.promise(() =>
      db.query("aiResearch").withIndex("by_slug", (queryBuilder) => queryBuilder.eq("slug", slug)).unique()
    );
  });
}

function createUniqueAiResearchSlug(title: string) {
  return Effect.gen(function* () {
    const seed = slugify(title);

    if (!(yield* findAiResearchBySlug(seed))) {
      return seed;
    }

    let counter = 2;
    while (yield* findAiResearchBySlug(`${seed}-${counter}`)) {
      counter += 1;
    }

    return `${seed}-${counter}`;
  });
}

export const publish = internalMutation({
  args: {
    title: v.string(),
    body: v.string(),
    model: v.string(),
    prompt: v.string()
  },
  handler: async (ctx, args) => {
    const program = Effect.gen(function* () {
      const input = yield* validatePublishArgs(args);
      const db = yield* ConvexDatabase;
      const slug = yield* createUniqueAiResearchSlug(input.title);
      const publishedAt = Date.now();

      const entryId = yield* Effect.promise(() =>
        db.insert("aiResearch", {
          slug,
          title: input.title,
          body: input.body,
          model: input.model,
          prompt: input.prompt,
          publishedAt
        })
      );

      const created = yield* Effect.promise(() => db.get(entryId));

      if (!created) {
        return yield* Effect.fail(new AiResearchPublishError({ message: "The AI research entry could not be created." }));
      }

      return serializeAiResearchFull(created);
    });

    const result = await Effect.runPromise(Effect.either(Effect.provideService(program, ConvexDatabase, ctx.db)));

    if (Either.isLeft(result)) {
      throw new Error(result.left.message);
    }

    return result.right;
  }
});
