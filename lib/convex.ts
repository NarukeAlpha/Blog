import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/api";

let client: ConvexHttpClient | null = null;
let clientUrl = "";

function getConfiguredConvexUrl() {
  return process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || "";
}

function requireConvexUrl() {
  const convexUrl = getConfiguredConvexUrl();

  if (!convexUrl) {
    throw new Error("Set CONVEX_URL (or VITE_CONVEX_URL) before starting the studio.");
  }

  return convexUrl;
}

export function isConvexConfigured() {
  return Boolean(getConfiguredConvexUrl());
}

export function hasWriteKey() {
  return Boolean(process.env.STUDIO_WRITE_KEY);
}

export function getStudioWriteKey() {
  const writeKey = process.env.STUDIO_WRITE_KEY || "";

  if (!writeKey) {
    throw new Error("Set STUDIO_WRITE_KEY in Electron and in the Convex deployment before publishing.");
  }

  return writeKey;
}

export function getPublicSiteUrl() {
  return process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || "";
}

export function getConvexClient() {
  const convexUrl = requireConvexUrl();

  if (!client || clientUrl !== convexUrl) {
    client = new ConvexHttpClient(convexUrl);
    clientUrl = convexUrl;
  }

  return client;
}

export async function getSiteOverview() {
  return getConvexClient().query(api.site.overview, {});
}
