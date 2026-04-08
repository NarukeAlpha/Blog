import { httpRouter } from "convex/server";
import type { PostPublishPayload, StudioBookmarkPublishRequest, StudioErrorResponse } from "../packages/shared/src/types";

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

  const body: StudioErrorResponse = { error: message };
  return json(body, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function requireStudioRequestAuth(request: Request) {
  const writeKey = request.headers.get("x-studio-write-key") || "";

  requireStudioWriteKey(writeKey);
}

async function parseStudioJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Studio request body must be valid JSON.");
  }
}

function readRequiredStringField(body: Record<string, unknown>, field: string, context: string) {
  const value = body[field];

  if (typeof value !== "string") {
    throw new Error(`${context} must include a string ${field}.`);
  }

  return value;
}

function readOptionalStringField(body: Record<string, unknown>, field: string, context: string) {
  const value = body[field];

  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${context} ${field} must be a string when provided.`);
  }

  return value;
}

async function parsePostPublishRequest(request: Request): Promise<PostPublishPayload> {
  requireStudioRequestAuth(request);
  const body = await parseStudioJsonBody(request);

  if (!isRecord(body)) {
    throw new Error("Studio post publish body must be a JSON object.");
  }

  return {
    title: readRequiredStringField(body, "title", "Studio post publish"),
    body: readRequiredStringField(body, "body", "Studio post publish")
  };
}

async function parseBookmarkPublishRequest(request: Request): Promise<StudioBookmarkPublishRequest> {
  requireStudioRequestAuth(request);
  const body = await parseStudioJsonBody(request);

  if (!isRecord(body)) {
    throw new Error("Studio bookmark publish body must be a JSON object.");
  }

  return {
    url: readRequiredStringField(body, "url", "Studio bookmark publish"),
    note: readRequiredStringField(body, "note", "Studio bookmark publish"),
    title: readRequiredStringField(body, "title", "Studio bookmark publish"),
    description: readRequiredStringField(body, "description", "Studio bookmark publish"),
    source: readRequiredStringField(body, "source", "Studio bookmark publish"),
    thumbnailSourceUrl: readOptionalStringField(body, "thumbnailSourceUrl", "Studio bookmark publish")
  };
}

function authorizeStudioRequest(request: Request) {
  requireStudioRequestAuth(request);

}

http.route({
  path: "/studio/overview",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      authorizeStudioRequest(request);
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
      const body = await parsePostPublishRequest(request);

      return json(
        await ctx.runMutation(internal.posts.publish, {
          title: body.title,
          body: body.body
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
      const body = await parseBookmarkPublishRequest(request);

      return json(
        await ctx.runAction(internal.bookmarks.publish, {
          url: body.url,
          note: body.note,
          title: body.title,
          description: body.description,
          source: body.source,
          thumbnailSourceUrl: body.thumbnailSourceUrl
        })
      );
    } catch (error) {
      return errorResponse(error, "Studio bookmark publish failed.");
    }
  })
});

export default http;
