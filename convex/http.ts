import { httpRouter } from "convex/server";
import type { AiResearchPublishPayload, PostPublishPayload, StudioBookmarkPublishRequest, StudioErrorResponse } from "../packages/shared/src/types";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { normalizeBookmarkUrl } from "../packages/shared/src/site";
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
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function readOptionalTrimmedStringField(body: Record<string, unknown>, field: string, context: string) {
  const value = readOptionalStringField(body, field, context);
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatAuthorLabel(authorName?: string, authorHandle?: string) {
  const name = compactText(authorName || "");
  const handle = compactText(authorHandle || "").replace(/^@+/, "");

  if (name && handle) {
    return `${name} (@${handle})`;
  }

  if (handle) {
    return `@${handle}`;
  }

  if (name) {
    return name;
  }

  return "";
}

async function resolveXSyncUrl(rawUrl: string) {
  const normalizedUrl = normalizeBookmarkUrl(rawUrl);
  const hostname = new URL(normalizedUrl).hostname.replace(/^www\./, "").toLowerCase();

  if (hostname !== "t.co") {
    return normalizedUrl;
  }

  try {
    const response = await fetch(normalizedUrl, { redirect: "follow" });
    return normalizeBookmarkUrl(response.url || normalizedUrl);
  } catch {
    return normalizedUrl;
  }
}

async function buildXSyncBookmarkRequest(body: {
  postUrl: string;
  postText?: string;
  authorName?: string;
  authorHandle?: string;
  externalUrl?: string;
}) {
  const postUrl = normalizeBookmarkUrl(body.postUrl);
  const postText = compactText(body.postText || "");
  const authorLabel = formatAuthorLabel(body.authorName, body.authorHandle);
  const bookmarkUrl = await resolveXSyncUrl(body.externalUrl || postUrl);
  const bookmarkHostname = new URL(bookmarkUrl).hostname.replace(/^www\./, "").toLowerCase();
  const source = body.externalUrl && bookmarkHostname !== "t.co" ? bookmarkHostname : "x.com";
  const title = postText
    ? truncateText(postText, 96)
    : authorLabel
      ? `Post by ${authorLabel}`
      : "Saved from X";
  const description = postText
    ? truncateText(postText, 220)
    : body.externalUrl
      ? authorLabel
        ? `Shared on X by ${authorLabel}.`
        : "Shared on X."
      : authorLabel
        ? `Saved X post by ${authorLabel}.`
        : "Saved X post.";
  const noteLines = ["Saved from X", `Post: ${postUrl}`];

  if (authorLabel) {
    noteLines.push(`Author: ${authorLabel}`);
  }

  if (postText) {
    noteLines.push("", postText);
  }

  return {
    url: bookmarkUrl,
    note: noteLines.join("\n"),
    title,
    description,
    source
  };
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

async function parseAiResearchPublishRequest(request: Request): Promise<AiResearchPublishPayload> {
  requireStudioRequestAuth(request);
  const body = await parseStudioJsonBody(request);

  if (!isRecord(body)) {
    throw new Error("Studio AI research publish body must be a JSON object.");
  }

  return {
    title: readRequiredStringField(body, "title", "Studio AI research publish"),
    body: readRequiredStringField(body, "body", "Studio AI research publish"),
    model: readRequiredStringField(body, "model", "Studio AI research publish"),
    prompt: readRequiredStringField(body, "prompt", "Studio AI research publish")
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

async function parseXSyncBookmarkPublishRequest(request: Request) {
  requireStudioRequestAuth(request);
  const body = await parseStudioJsonBody(request);

  if (!isRecord(body)) {
    throw new Error("X sync bookmark publish body must be a JSON object.");
  }

  return {
    postUrl: readRequiredStringField(body, "postUrl", "X sync bookmark publish"),
    postText: readOptionalTrimmedStringField(body, "postText", "X sync bookmark publish"),
    authorName: readOptionalTrimmedStringField(body, "authorName", "X sync bookmark publish"),
    authorHandle: readOptionalTrimmedStringField(body, "authorHandle", "X sync bookmark publish"),
    externalUrl: readOptionalTrimmedStringField(body, "externalUrl", "X sync bookmark publish")
  };
}

http.route({
  path: "/studio/overview",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      requireStudioRequestAuth(request);
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
  path: "/studio/ai-research",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await parseAiResearchPublishRequest(request);

      return json(
        await ctx.runMutation(internal.aiResearch.publish, {
          title: body.title,
          body: body.body,
          model: body.model,
          prompt: body.prompt
        })
      );
    } catch (error) {
      return errorResponse(error, "Studio AI research publish failed.");
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

http.route({
  path: "/studio/bookmarks/x-sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await parseXSyncBookmarkPublishRequest(request);
      const bookmark = await buildXSyncBookmarkRequest(body);

      return json(await ctx.runAction(internal.bookmarks.publish, bookmark));
    } catch (error) {
      return errorResponse(error, "X sync bookmark publish failed.");
    }
  })
});

export default http;
