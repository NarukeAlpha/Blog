import { ConvexHttpClient } from "convex/browser";

import { api } from "../../../convex/_generated/api";
import type { BookmarkRecord, PostRecord, SiteCounts, SiteOverview } from "../../../packages/shared/src/types";
import { getStudioRuntimeSettings } from "./settings";

let client: ConvexHttpClient | null = null;
let clientUrl = "";

async function getConfiguredConvexUrl() {
  return (await getStudioRuntimeSettings()).convexUrl;
}

function deriveConvexSiteUrl(convexUrl: string) {
  const configuredSiteUrl = String(process.env.CONVEX_SITE_URL || process.env.VITE_CONVEX_SITE_URL || "").trim();

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
  const convexSiteUrl = deriveConvexSiteUrl(await requireConvexUrl());

  if (!convexSiteUrl) {
    throw new Error("Save a hosted Convex URL in Settings or set CONVEX_SITE_URL so the studio can reach the protected HTTP endpoints.");
  }

  return convexSiteUrl;
}

export async function isConvexConfigured() {
  return Boolean(await getConfiguredConvexUrl());
}

export async function hasDeployKey() {
  return Boolean((await getStudioRuntimeSettings()).deployKey);
}

export async function getDeployKey() {
  const deployKey = (await getStudioRuntimeSettings()).deployKey;

  if (!deployKey) {
    throw new Error("Save the studio write key in Settings before publishing.");
  }

  return deployKey;
}

export async function getPublicSiteUrl() {
  return (await getStudioRuntimeSettings()).publicSiteUrl;
}

export async function getConvexClient() {
  const convexUrl = await requireConvexUrl();

  if (!client || clientUrl !== convexUrl) {
    client = new ConvexHttpClient(convexUrl);
    clientUrl = convexUrl;
  }

  return client;
}

async function callStudioEndpoint<T>(path: string, body: Record<string, unknown>) {
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
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : `Studio request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
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

export async function getSiteOverview() {
  return callStudioEndpoint<SiteOverview>("/studio/overview", {});
}

export async function publishStudioPost(args: { title: string; body: string }) {
  return callStudioEndpoint<PostRecord>("/studio/posts", args);
}

export async function publishStudioBookmark(args: {
  url: string;
  note: string;
  title: string;
  description: string;
  source: string;
  thumbnailSourceUrl?: string;
}) {
  return callStudioEndpoint<BookmarkRecord>("/studio/bookmarks", args);
}
