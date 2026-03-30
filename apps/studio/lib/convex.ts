import { ConvexHttpClient } from "convex/browser";

import { api } from "../../../convex/api";
import { getStudioRuntimeSettings } from "./settings";

let client: ConvexHttpClient | null = null;
let clientUrl = "";

async function getConfiguredConvexUrl() {
  return (await getStudioRuntimeSettings()).convexUrl;
}

async function requireConvexUrl() {
  const convexUrl = await getConfiguredConvexUrl();

  if (!convexUrl) {
    throw new Error("Save the Convex deployment URL in Settings before publishing.");
  }

  return convexUrl;
}

export async function isConvexConfigured() {
  return Boolean(await getConfiguredConvexUrl());
}

export async function hasWriteKey() {
  return Boolean((await getStudioRuntimeSettings()).writeKey);
}

export async function getStudioWriteKey() {
  const writeKey = (await getStudioRuntimeSettings()).writeKey;

  if (!writeKey) {
    throw new Error("Save the studio write key in Settings and in Convex before publishing.");
  }

  return writeKey;
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

export async function getSiteOverview() {
  return (await getConvexClient()).query(api.site.overview, {});
}
