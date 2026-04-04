import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { requireStudioWriteKey } from "./studioAuth";

const http = httpRouter();

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {})
    }
  });
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "Invalid studio write key." || message === "STUDIO_WRITE_KEY is not configured for this Convex deployment." ? 401 : 400;

  return json({ error: message }, { status });
}

async function parseStudioRequest(request: Request) {
  const writeKey = request.headers.get("x-studio-write-key") || "";

  requireStudioWriteKey(writeKey);

  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

http.route({
  path: "/studio/overview",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      await parseStudioRequest(request);
      return json(await ctx.runQuery(internal.site.overview, {}));
    } catch (error) {
      return errorResponse(error, "Studio overview failed.");
    }
  })
});

http.route({
  path: "/studio/posts",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await parseStudioRequest(request);

      return json(
        await ctx.runMutation(internal.posts.publish, {
          title: String(body.title || ""),
          body: String(body.body || "")
        })
      );
    } catch (error) {
      return errorResponse(error, "Studio post publish failed.");
    }
  })
});

http.route({
  path: "/studio/bookmarks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await parseStudioRequest(request);

      return json(
        await ctx.runAction(internal.bookmarks.publish, {
          url: String(body.url || ""),
          note: String(body.note || ""),
          title: String(body.title || ""),
          description: String(body.description || ""),
          source: String(body.source || ""),
          thumbnailSourceUrl:
            typeof body.thumbnailSourceUrl === "string" ? body.thumbnailSourceUrl : undefined
        })
      );
    } catch (error) {
      return errorResponse(error, "Studio bookmark publish failed.");
    }
  })
});

export default http;
