import { ConvexHttpClient, type HttpMutationOptions } from "convex/browser";
import type { ArgsAndOptions, FunctionReference, FunctionReturnType, OptionalRestArgs } from "convex/server";

import { api, internal } from "../../../convex/_generated/api";
import { getStudioRuntimeSettings } from "./settings";

let client: ConvexHttpClient | null = null;
let clientUrl = "";
let privilegedClient: ConvexHttpClient | null = null;
let privilegedClientUrl = "";
let privilegedClientDeployKey = "";

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

export async function hasDeployKey() {
  return Boolean((await getStudioRuntimeSettings()).deployKey);
}

function setConvexAdminAuth(client: ConvexHttpClient, token: string) {
  // Convex exposes this at runtime, but keeps it off the public type surface.
  (client as ConvexHttpClient & { setAdminAuth: (value: string) => void }).setAdminAuth(token);
}

export async function getDeployKey() {
  const deployKey = (await getStudioRuntimeSettings()).deployKey;

  if (!deployKey) {
    throw new Error("Save the Convex deploy key in Settings before publishing.");
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

export async function getPrivilegedConvexClient() {
  const convexUrl = await requireConvexUrl();
  const deployKey = await getDeployKey();

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
export async function runPrivilegedQuery<Query extends FunctionReference<"query", "internal">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
) {
  const client = await getPrivilegedConvexClient();

  return (client.query as unknown as (
    query: Query,
    ...args: OptionalRestArgs<Query>
  ) => Promise<FunctionReturnType<Query>>)(query, ...args);
}

export async function runPrivilegedMutation<Mutation extends FunctionReference<"mutation", "internal">>(
  mutation: Mutation,
  ...args: ArgsAndOptions<Mutation, HttpMutationOptions>
) {
  const client = await getPrivilegedConvexClient();

  return (client.mutation as unknown as (
    mutation: Mutation,
    ...args: ArgsAndOptions<Mutation, HttpMutationOptions>
  ) => Promise<FunctionReturnType<Mutation>>)(mutation, ...args);
}

export async function runPrivilegedAction<Action extends FunctionReference<"action", "internal">>(
  action: Action,
  ...args: OptionalRestArgs<Action>
) {
  const client = await getPrivilegedConvexClient();

  return (client.action as unknown as (
    action: Action,
    ...args: OptionalRestArgs<Action>
  ) => Promise<FunctionReturnType<Action>>)(action, ...args);
}

export async function isConvexReachable() {
  await (await getConvexClient()).query(api.public.health, {});
  return true;
}

export async function getSiteOverview() {
  return runPrivilegedQuery(internal.site.overview, {});
}
