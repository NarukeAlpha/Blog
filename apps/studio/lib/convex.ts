import { ConvexHttpClient, type HttpMutationOptions } from "convex/browser";
import type { ArgsAndOptions, FunctionReference, FunctionReturnType, OptionalRestArgs } from "convex/server";

import { api, internal } from "../../../convex/_generated/api";

let client: ConvexHttpClient | null = null;
let clientUrl = "";
let privilegedClient: ConvexHttpClient | null = null;
let privilegedClientUrl = "";
let privilegedClientDeployKey = "";

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

export function hasDeployKey() {
  return Boolean(process.env.CONVEX_DEPLOY_KEY);
}

function setConvexAdminAuth(client: ConvexHttpClient, token: string) {
  // Convex exposes this at runtime, but keeps it off the public type surface.
  (client as ConvexHttpClient & { setAdminAuth: (value: string) => void }).setAdminAuth(token);
}

export function getDeployKey() {
  const deployKey = process.env.CONVEX_DEPLOY_KEY || "";

  if (!deployKey) {
    throw new Error("Set CONVEX_DEPLOY_KEY in Electron before loading studio-only Convex functions.");
  }

  return deployKey;
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

export function getPrivilegedConvexClient() {
  const convexUrl = requireConvexUrl();
  const deployKey = getDeployKey();

  if (!privilegedClient || privilegedClientUrl !== convexUrl || privilegedClientDeployKey !== deployKey) {
    privilegedClient = new ConvexHttpClient(convexUrl);
    privilegedClientUrl = convexUrl;
    privilegedClientDeployKey = deployKey;
  }

  setConvexAdminAuth(privilegedClient, deployKey);
  return privilegedClient;
}

// Convex's public client types only accept public refs, even though admin auth
// can execute internal functions. Keep that escape hatch isolated here.
export function runPrivilegedQuery<Query extends FunctionReference<"query", "internal">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
) {
  const client = getPrivilegedConvexClient();

  return (client.query as unknown as (
    query: Query,
    ...args: OptionalRestArgs<Query>
  ) => Promise<FunctionReturnType<Query>>)(query, ...args);
}

export function runPrivilegedMutation<Mutation extends FunctionReference<"mutation", "internal">>(
  mutation: Mutation,
  ...args: ArgsAndOptions<Mutation, HttpMutationOptions>
) {
  const client = getPrivilegedConvexClient();

  return (client.mutation as unknown as (
    mutation: Mutation,
    ...args: ArgsAndOptions<Mutation, HttpMutationOptions>
  ) => Promise<FunctionReturnType<Mutation>>)(mutation, ...args);
}

export function runPrivilegedAction<Action extends FunctionReference<"action", "internal">>(
  action: Action,
  ...args: OptionalRestArgs<Action>
) {
  const client = getPrivilegedConvexClient();

  return (client.action as unknown as (
    action: Action,
    ...args: OptionalRestArgs<Action>
  ) => Promise<FunctionReturnType<Action>>)(action, ...args);
}

export async function isConvexReachable() {
  await getConvexClient().query(api.public.health, {});
  return true;
}

export async function getSiteOverview() {
  return runPrivilegedQuery(internal.site.overview, {});
}
