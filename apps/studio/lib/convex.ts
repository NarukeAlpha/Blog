import { ConvexHttpClient } from "convex/browser";

import { api } from "@convex/_generated/api";
import type {
  BookmarkRecord,
  PostPublishPayload,
  PostRecord,
  PostSummaryRecord,
  PublicBookmarkRecord,
  SiteCounts,
  SiteOverview,
  StudioBookmarkPublishRequest,
  StudioErrorResponse
} from "@shared/types";
import { getActiveStudioRuntimeSettings } from "./settings";

let client: ConvexHttpClient | null = null;
let clientUrl = "";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRequiredString(value: Record<string, unknown>, key: string, context: string) {
  const entry = value[key];

  if (typeof entry !== "string") {
    throw new Error(`Studio ${context} returned an invalid response.`);
  }

  return entry;
}

function readRequiredNumber(value: Record<string, unknown>, key: string, context: string) {
  const entry = value[key];

  if (typeof entry !== "number") {
    throw new Error(`Studio ${context} returned an invalid response.`);
  }

  return entry;
}

function parseStudioErrorResponse(value: unknown): StudioErrorResponse | null {
  if (!isRecord(value) || typeof value.error !== "string") {
    return null;
  }

  return { error: value.error };
}

function parsePostSummaryRecord(value: unknown): PostSummaryRecord {
  if (!isRecord(value)) {
    throw new Error("Studio site overview returned an invalid response.");
  }

  return {
    slug: readRequiredString(value, "slug", "site overview"),
    title: readRequiredString(value, "title", "site overview"),
    excerpt: readRequiredString(value, "excerpt", "site overview"),
    publishedAt: readRequiredNumber(value, "publishedAt", "site overview"),
    readingTimeMinutes: readRequiredNumber(value, "readingTimeMinutes", "site overview")
  };
}

function parsePublicBookmarkRecord(value: unknown, context: string): PublicBookmarkRecord {
  if (!isRecord(value)) {
    throw new Error(`Studio ${context} returned an invalid response.`);
  }

  return {
    url: readRequiredString(value, "url", context),
    title: readRequiredString(value, "title", context),
    description: readRequiredString(value, "description", context),
    source: readRequiredString(value, "source", context),
    thumbnailUrl: readRequiredString(value, "thumbnailUrl", context),
    addedAt: readRequiredNumber(value, "addedAt", context)
  };
}

function parseSiteOverview(value: unknown): SiteOverview {
  if (!isRecord(value) || !Array.isArray(value.latestPosts) || !Array.isArray(value.latestBookmarks)) {
    throw new Error("Studio site overview returned an invalid response.");
  }

  return {
    postCount: readRequiredNumber(value, "postCount", "site overview"),
    bookmarkCount: readRequiredNumber(value, "bookmarkCount", "site overview"),
    latestPosts: value.latestPosts.map((entry) => parsePostSummaryRecord(entry)),
    latestBookmarks: value.latestBookmarks.map((entry) => parsePublicBookmarkRecord(entry, "site overview"))
  };
}

function parsePostRecord(value: unknown): PostRecord {
  if (!isRecord(value)) {
    throw new Error("Studio post publish returned an invalid response.");
  }

  return {
    slug: readRequiredString(value, "slug", "post publish"),
    title: readRequiredString(value, "title", "post publish"),
    body: readRequiredString(value, "body", "post publish"),
    excerpt: readRequiredString(value, "excerpt", "post publish"),
    publishedAt: readRequiredNumber(value, "publishedAt", "post publish"),
    readingTimeMinutes: readRequiredNumber(value, "readingTimeMinutes", "post publish")
  };
}

function parseBookmarkRecord(value: unknown): BookmarkRecord {
  if (!isRecord(value)) {
    throw new Error("Studio bookmark publish returned an invalid response.");
  }

  return {
    ...parsePublicBookmarkRecord(value, "bookmark publish"),
    note: readRequiredString(value, "note", "bookmark publish")
  };
}

async function getConfiguredConvexUrl() {
  return (await getActiveStudioRuntimeSettings()).convexUrl;
}

function deriveConvexSiteUrl(configuredSiteUrl: string, convexUrl: string) {
  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  try {
    const parsed = new URL(convexUrl);

    if (parsed.hostname.endsWith(".convex.cloud")) {
      parsed.hostname = `${parsed.hostname.slice(0, -".convex.cloud".length)}.convex.site`;
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // Let the caller throw a clearer configuration error.
  }

  return "";
}

async function requireConvexUrl() {
  const convexUrl = await getConfiguredConvexUrl();

  if (!convexUrl) {
    throw new Error("Save the Convex deployment URL in Settings before publishing.");
  }

  return convexUrl;
}

async function requireConvexSiteUrl() {
  const activeSettings = await getActiveStudioRuntimeSettings();
  const convexSiteUrl = deriveConvexSiteUrl(activeSettings.convexSiteUrl, activeSettings.convexUrl || (await requireConvexUrl()));

  if (!convexSiteUrl) {
    throw new Error("Save the Convex action URL in Settings so the studio can reach the protected HTTP endpoints for the selected environment.");
  }

  return convexSiteUrl;
}

export async function isConvexConfigured() {
  return Boolean(await getConfiguredConvexUrl());
}

export async function hasDeployKey() {
  return Boolean((await getActiveStudioRuntimeSettings()).deployKey);
}

export async function getDeployKey() {
  const deployKey = (await getActiveStudioRuntimeSettings()).deployKey;

  if (!deployKey) {
    throw new Error("Save the studio write key in Settings before publishing.");
  }

  return deployKey;
}

export async function getActiveStudioConnection() {
  const activeSettings = await getActiveStudioRuntimeSettings();
  const convexUrl = activeSettings.convexUrl || "";

  // Status/bootstrap reads should stay non-throwing so the settings screen can
  // render incomplete environment targets and tell the user what is missing.
  return {
    environment: activeSettings.environment,
    convexUrl,
    convexSiteUrl: deriveConvexSiteUrl(activeSettings.convexSiteUrl, convexUrl),
    publicSiteUrl: activeSettings.publicSiteUrl,
    deployKey: activeSettings.deployKey
  };
}

export async function getConvexClient() {
  const convexUrl = await requireConvexUrl();

  if (!client || clientUrl !== convexUrl) {
    client = new ConvexHttpClient(convexUrl);
    clientUrl = convexUrl;
  }

  return client;
}

async function postStudioEndpoint(path: string, body: unknown) {
  const response = await fetch(`${await requireConvexSiteUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-studio-write-key": await getDeployKey()
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = parseStudioErrorResponse(payload)?.error || `Studio request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

export async function isConvexReachable() {
  await (await getConvexClient()).query(api.public.health, {});
  return true;
}

export async function getPublicSiteCounts(): Promise<SiteCounts> {
  const client = await getConvexClient();
  const [posts, bookmarks] = await Promise.all([
    client.query(api.public.listPosts, {}),
    client.query(api.public.listBookmarks, {})
  ]);

  return {
    postCount: posts.length,
    bookmarkCount: bookmarks.length
  };
}

export async function getSiteOverview(): Promise<SiteOverview> {
  return parseSiteOverview(await postStudioEndpoint("/studio/overview", {}));
}

export async function publishStudioPost(args: PostPublishPayload): Promise<PostRecord> {
  return parsePostRecord(await postStudioEndpoint("/studio/posts", args));
}

export async function publishStudioBookmark(args: StudioBookmarkPublishRequest): Promise<BookmarkRecord> {
  return parseBookmarkRecord(await postStudioEndpoint("/studio/bookmarks", args));
}
